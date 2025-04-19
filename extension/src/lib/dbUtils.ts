import initSqlJs from "sql.js";
import type { SqlJsStatic, Database } from "sql.js";

let SQL: SqlJsStatic;
let db: Database;

const DB_VERSION = "1.0.0"; // 💡 version actuelle de la structure

// 📦 Initialise sql.js et la base (nouvelle ou chargée depuis storage)
export async function initDatabase(): Promise<void> {
  SQL = await initSqlJs({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    locateFile: (_file: string) => chrome.runtime.getURL("sql-wasm.wasm") // suppose que sql-wasm.wasm est à la racine du dist
  });

  const stored = await chrome.storage.local.get("leakr_db");

  if (stored.leakr_db) {
    const u8 = new Uint8Array(stored.leakr_db);
    db = new SQL.Database(u8);
    console.log("🦊 Base chargée depuis le stockage");
  } else {
    db = new SQL.Database();
    console.log("✨ Nouvelle base créée");
    createSchema();
    await saveDatabase();
  }

  checkVersion();
}

// --- Types ---

export interface Createur {
  id: number;
  nom: string;
  aliases: string[];
  date_ajout: string; // ISO 8601 format
  favori: boolean;
}

export interface Contenu {
  id: number;
  url: string;
  tabname: string | null;
  date_ajout: string; // ISO 8601 format
  id_createur: number;
  favori: boolean;
}

export interface Plateforme {
    id: number;
    nom: string;
}

export interface ProfilPlateforme {
    id: number;
    lien: string;
    id_createur: number;
    id_plateforme: number;
}

// 📐 Création complète du schéma initial
function createSchema() {
  db.run(`
    CREATE TABLE version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version_texte TEXT NOT NULL,
      iterations INTEGER DEFAULT 0
    );

    INSERT INTO version (id, version_texte, iterations) VALUES (1, '${DB_VERSION}', 0);

    CREATE TABLE createurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      aliases TEXT NOT NULL,
      date_ajout TEXT NOT NULL,
      favori BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE contenus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      tabname TEXT,
      date_ajout TEXT NOT NULL,
      id_createur INTEGER NOT NULL,
      favori BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (id_createur) REFERENCES createurs(id)
    );

    CREATE TABLE plateformes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL UNIQUE
    );

    CREATE TABLE profils_plateforme (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lien TEXT NOT NULL,
      id_createur INTEGER NOT NULL,
      id_plateforme INTEGER NOT NULL,
      FOREIGN KEY (id_createur) REFERENCES createurs(id),
      FOREIGN KEY (id_plateforme) REFERENCES plateformes(id)
    );
  `);

  console.log("🧱 Schéma initial installé");
}

// 🧠 Vérifie la version de la base
function checkVersion() {
  try {
    const stmt = db.prepare("SELECT version_texte FROM version WHERE id = 1;");
    if (stmt.step()) {
      const version = stmt.getAsObject().version_texte;
      console.log(`📜 Version actuelle de la base : ${version}`);
      if (version !== DB_VERSION) {
        console.warn(`⚠️ Attention : version locale (${version}) différente de celle attendue (${DB_VERSION})`);
        // Ici tu pourrais déclencher une migration si besoin
      }
    }
    stmt.free();
  } catch (err) {
    console.error("❌ Impossible de lire la version de la base. Est-elle corrompue ?", err);
  }
}

// 💾 Sauvegarde de la base dans chrome.storage.local
export async function saveDatabase(): Promise<void> {
  try {
    // Incrémenter le compteur d'itérations avant de sauvegarder
    db.run("UPDATE version SET iterations = iterations + 1 WHERE id = 1;");
  } catch (err) {
    console.error("❌ Erreur lors de l'incrémentation des itérations:", err);
    return;
  }

  const data = db.export();
  const array = Array.from(data);
  await chrome.storage.local.set({ leakr_db: array });
  console.log("💫 Base sauvegardée localement");
}

// --- Fonctions CRUD ---

// CREATEURS

/** Ajoute un nouveau créateur */
export function addCreateur(nom: string, aliases: string[]): number | bigint {
  const aliasesStr = JSON.stringify(aliases);
  const stmt = db.prepare("INSERT INTO createurs (nom, aliases, date_ajout) VALUES (?, ?, ?)");
  stmt.run([nom, aliasesStr, new Date().toISOString()]);
  stmt.free();
  const lastIdRaw = db.exec("SELECT last_insert_rowid();")[0].values[0][0];
  const lastId = (typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint") ? lastIdRaw : 0;
  saveDatabase();
  return lastId;
}

/** Récupère tous les créateurs */
export function getCreateurs(): Createur[] {
  const stmt = db.prepare("SELECT id, nom, aliases, date_ajout, favori FROM createurs ORDER BY nom ASC");
  const createurs: Createur[] = [];
  while (stmt.step()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.getAsObject() as any;
    createurs.push({
      id: row.id as number,
      nom: row.nom as string,
      aliases: JSON.parse(row.aliases as string || '[]'),
      date_ajout: row.date_ajout as string,
      favori: Boolean(row.favori)
    });
  }
  stmt.free();
  return createurs;
}

/** Finds a creator by their primary name (case-insensitive) */
export function findCreatorByUsername(username: string): Createur | null {
    // Using LOWER() for case-insensitive comparison is generally good practice
    // for usernames, assuming SQLite's default case sensitivity or using LOWER().
    const stmt = db.prepare("SELECT id, nom, aliases, date_ajout, favori FROM createurs WHERE LOWER(nom) = LOWER(?) LIMIT 1");
    stmt.bind([username]);
    let creator: Createur | null = null;
    try {
        if (stmt.step()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const row = stmt.getAsObject() as any;
            let parsedAliases: string[] = [];
            try {
                // Ensure aliases are parsed correctly, defaulting to empty array if null/invalid
                parsedAliases = JSON.parse(row.aliases as string || '[]');
            } catch (e) {
                console.error(`Error parsing aliases for creator ${row.id}:`, row.aliases, e);
            }
            creator = {
                id: row.id as number,
                nom: row.nom as string,
                aliases: parsedAliases,
                date_ajout: row.date_ajout as string,
                favori: Boolean(row.favori)
            };
        }
    } catch (error) {
        console.error("Error finding creator by username:", error);
        // Ensure statement is freed even if an error occurs during processing
    } finally {
        stmt.free();
    }

    // Optional: If not found by name, you could add logic here to search
    // within the JSON 'aliases' field, though this can be less efficient.
    // Example (conceptual - requires fetching all or more complex SQL):
    if (!creator) {
      const allCreators = getCreateurs();
      creator = allCreators.find(c =>
         c.aliases.some(alias => alias.toLowerCase() === username.toLowerCase())
      ) || null;
    }

    return creator;
}

/** Met à jour le statut favori d'un créateur */
export function updateFavoriCreateur(id: number, favori: boolean): void {
    const stmt = db.prepare("UPDATE createurs SET favori = ? WHERE id = ?");
    stmt.run([favori ? 1 : 0, id]);
    stmt.free();
    saveDatabase();
}

/** Supprime un créateur et ses contenus/profils associés */
export function deleteCreateur(id: number): void {
    db.exec("BEGIN TRANSACTION;");
    try {
        // Supprimer les profils plateforme associés
        let stmt = db.prepare("DELETE FROM profils_plateforme WHERE id_createur = ?");
        stmt.run([id]);
        stmt.free();

        // Supprimer les contenus associés
        stmt = db.prepare("DELETE FROM contenus WHERE id_createur = ?");
        stmt.run([id]);
        stmt.free();

        // Supprimer le créateur
        stmt = db.prepare("DELETE FROM createurs WHERE id = ?");
        stmt.run([id]);
        stmt.free();

        db.exec("COMMIT;");
        saveDatabase();
    } catch (err) {
        console.error("Erreur lors de la suppression du créateur:", err);
        db.exec("ROLLBACK;");
    }
}


// CONTENUS

/** Ajoute un nouveau contenu pour un créateur */
export function addContenu(url: string, tabname: string, id_createur: number): number | bigint {
  const stmt = db.prepare("INSERT INTO contenus (url, tabname, date_ajout, id_createur) VALUES (?, ?, ?, ?)");
  stmt.run([url, tabname, new Date().toISOString(), id_createur]);
  stmt.free();
  const lastIdRaw = db.exec("SELECT last_insert_rowid();")[0].values[0][0];
  const lastId = (typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint") ? lastIdRaw : 0;
  saveDatabase();
  return lastId;
}

/** Récupère les contenus d'un créateur spécifique */
export function getContenusByCreator(id_createur: number): Contenu[] {
  const stmt = db.prepare("SELECT id, url, tabname, date_ajout, id_createur, favori FROM contenus WHERE id_createur = ? ORDER BY date_ajout DESC");
  const contenus: Contenu[] = [];
  stmt.bind([id_createur]);
  while (stmt.step()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.getAsObject() as any;
    contenus.push({
        id: row.id as number,
        url: row.url as string,
        tabname: row.tabname as string | null,
        date_ajout: row.date_ajout as string,
        id_createur: row.id_createur as number,
        favori: Boolean(row.favori)
    });
  }
  stmt.free();
  return contenus;
}

/** Met à jour le statut favori d'un contenu */
export function updateFavoriContenu(id: number, favori: boolean): void {
    const stmt = db.prepare("UPDATE contenus SET favori = ? WHERE id = ?");
    stmt.run([favori ? 1 : 0, id]);
    stmt.free();
    saveDatabase();
}

/** Supprime un contenu spécifique */
export function deleteContenu(id: number): void {
    const stmt = db.prepare("DELETE FROM contenus WHERE id = ?");
    stmt.run([id]);
    stmt.free();
    saveDatabase();
}

// PLATEFORMES (Exemples simples)

/** Ajoute une nouvelle plateforme */
export function addPlateforme(nom: string): number | bigint | null {
  try {
      const stmt = db.prepare("INSERT INTO plateformes (nom) VALUES (?)");
      stmt.run([nom]);
      stmt.free();
      const lastIdRaw = db.exec("SELECT last_insert_rowid();")[0].values[0][0];
      const lastId = (typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint") ? lastIdRaw : 0;
      saveDatabase();
      return lastId;
  } catch (err: unknown) {
      // Gérer l'erreur d'unicité
      if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
          console.warn(`La plateforme "${nom}" existe déjà.`);
          // Optionnel: retourner l'ID existant
          const stmt = db.prepare("SELECT id FROM plateformes WHERE nom = ?");
          stmt.bind([nom]);
          let existingId: number | bigint | null = null;
          if (stmt.step()) {
              existingId = stmt.getAsObject().id as number | bigint;
          }
          stmt.free();
          return existingId;
      } else {
          console.error("Erreur lors de l'ajout de la plateforme:", err);
          return null;
      }
  }
}

/** Récupère toutes les plateformes */
export function getPlateformes(): Plateforme[] {
    const stmt = db.prepare("SELECT id, nom FROM plateformes ORDER BY nom ASC");
    const plateformes: Plateforme[] = [];
    while (stmt.step()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = stmt.getAsObject() as any;
        plateformes.push({
            id: row.id as number,
            nom: row.nom as string
        });
    }
    stmt.free();
    return plateformes;
}

// PROFILS PLATEFORME (Exemples simples)

/** Ajoute un profil plateforme pour un créateur */
export function addProfilPlateforme(lien: string, id_createur: number, id_plateforme: number): number | bigint {
    const stmt = db.prepare("INSERT INTO profils_plateforme (lien, id_createur, id_plateforme) VALUES (?, ?, ?)");
    stmt.run([lien, id_createur, id_plateforme]);
    stmt.free();
    const lastIdRaw = db.exec("SELECT last_insert_rowid();")[0].values[0][0];
    const lastId = (typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint") ? lastIdRaw : 0;
    saveDatabase();
    return lastId;
}

/** Récupère les profils d'un créateur */
export function getProfilsByCreator(id_createur: number): ProfilPlateforme[] {
    const stmt = db.prepare(`
        SELECT pp.id, pp.lien, pp.id_createur, pp.id_plateforme
        FROM profils_plateforme pp
        WHERE pp.id_createur = ?
    `);
    const profils: ProfilPlateforme[] = [];
    stmt.bind([id_createur]);
    while (stmt.step()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = stmt.getAsObject() as any;
        profils.push({
            id: row.id as number,
            lien: row.lien as string,
            id_createur: row.id_createur as number,
            id_plateforme: row.id_plateforme as number
        });
    }
    stmt.free();
    return profils;
}

// --- Utilitaires ---

/** Exécute une requête SQL générique (pour lecture) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function executeQuery(sql: string, params?: any[]): any[] {
    const stmt = db.prepare(sql);
    if (params) {
        stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/** Exécute une commande SQL générique (pour écriture) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function executeCommand(sql: string, params?: any[]): void {
    db.run(sql, params);
    saveDatabase(); // Sauvegarde après chaque commande potentiellement modificatrice
}

// --- Fermeture ---

/** Ferme la connexion à la base de données (utile si l'extension est déchargée) */
export function closeDatabase(): void {
    if (db) {
        db.close();
        console.log("🚪 Base de données fermée.");
    }
}
