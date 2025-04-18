import initSqlJs from "sql.js";
import Fuse from "fuse.js";
import type { SqlJsStatic, Database } from "sql.js";

let SQL: SqlJsStatic;
let db: Database;

const DB_VERSION = "1.0.1"; // 💡 version actuelle de la structure

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
    BEGIN TRANSACTION;

    -- Création de la table version
    CREATE TABLE version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version_texte TEXT NOT NULL,
      iterations INTEGER DEFAULT 0,
      date_maj TEXT DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO version (id, version_texte, iterations, date_maj) VALUES (1, '${DB_VERSION}', 0, CURRENT_TIMESTAMP);

    CREATE TABLE settings (
      id INTEGER PRIMARY KEY,
      uuid TEXT NOT NULL,
      share_collection BOOLEAN DEFAULT FALSE
    );

    -- Insérer une valeur par défaut pour le UUID
    INSERT INTO settings (id, uuid, share_collection) VALUES (1, '00000000-0000-0000-0000-000000000000', 1);

    -- Création des tables créateurs, contenus, plateformes et profils_plateforme
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

    COMMIT;
  `);

  console.log("🧱 Schéma initial installé");
}

// 🧠 Vérifie la version de la base et lance les migrations si nécessaire
async function checkVersion() {
  try {
    const stmt = db.prepare("SELECT version_texte FROM version WHERE id = 1;");
    let needsMigration = false;
    let currentDbVersion = "";

    if (stmt.step()) {
      const result = stmt.getAsObject() as { version_texte: string };
      currentDbVersion = result.version_texte;
      console.log(`📜 Version actuelle de la base : ${currentDbVersion}`);
      if (currentDbVersion !== DB_VERSION) {
        console.warn(`⚠️ Attention : version locale (${currentDbVersion}) différente de celle attendue (${DB_VERSION}). Migration nécessaire.`);
        // Compare versions properly if using semantic versioning (e.g., using a library)
        // For simple sequential versions like "1.0.0", "1.1.0", string comparison might suffice if ordered correctly.
        // A more robust comparison might be needed for complex versioning.
        if (currentDbVersion < DB_VERSION) { // Basic check, improve if needed
             needsMigration = true;
        } else {
             console.error(`❌ La version de la base (${currentDbVersion}) est plus récente que la version attendue (${DB_VERSION}). Impossible de continuer.`);
             // Handle downgrade or error appropriately
             stmt.free();
             return; // Stop further processing
        }
      }
    } else {
        console.error("❌ Impossible de lire la version de la base. Tentative de création du schéma initial.");
        // This case might happen if the version table itself is missing after a failed init/migration
        // Consider recreating schema or attempting specific recovery steps.
        // For now, let's assume a fresh start might be needed or a specific migration from "unknown".
        // createSchema(); // Be careful with this, might wipe data.
        // await saveDatabase();
    }
    stmt.free();

    if (needsMigration) {
        await runMigrations(currentDbVersion);
        // Re-verify version after migration
        const checkStmt = db.prepare("SELECT version_texte FROM version WHERE id = 1;");
        if (checkStmt.step()) {
            const updatedVersion = (checkStmt.getAsObject() as { version_texte: string }).version_texte;
            console.log(`✅ Migration terminée. Nouvelle version de la base : ${updatedVersion}`);
            if (updatedVersion !== DB_VERSION) {
                console.error(`❌ Erreur post-migration: La version de la base (${updatedVersion}) ne correspond toujours pas à la version attendue (${DB_VERSION}).`);
            }
        } else {
             console.error("❌ Impossible de vérifier la version après la migration.");
        }
        checkStmt.free();
    }

  } catch (err) {
    console.error("❌ Erreur lors de la vérification de la version ou de la migration:", err);
  }
}

// 🚀 Fonction pour appliquer les migrations séquentiellement
async function runMigrations(currentDbVersion: string) {
    console.log(`🚀 Démarrage des migrations depuis la version ${currentDbVersion}...`);
    db.exec("BEGIN TRANSACTION;"); // Start transaction for migrations

    try {
        // --- Migration vers 1.1.0 ---
        if (currentDbVersion === "1.0.0") {
            console.log("⏳ Application de la migration vers 1.1.0...");
            // Exemple: Ajouter une colonne 'description' à la table 'createurs'
            // db.run("ALTER TABLE createurs ADD COLUMN description TEXT;");
            // console.log("   - Colonne 'description' ajoutée à 'createurs'.");

            // Exemple: Ajouter une nouvelle table
            // db.run("CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT UNIQUE);");
            // console.log("   - Table 'tags' créée.");

            // Mettre à jour la version DANS la transaction
            db.run("UPDATE version SET version_texte = '1.1.0', date_maj = CURRENT_TIMESTAMP WHERE id = 1;");
            console.log("   - Version mise à jour vers 1.1.0.");
            currentDbVersion = "1.1.0"; // Update local tracker
        }

        // --- Migration vers 1.2.0 ---
        // if (currentDbVersion === "1.1.0") {
        //     console.log("⏳ Application de la migration vers 1.2.0...");
        //     // db.run("ALTER TABLE ...");
        //     // db.run("UPDATE ...");
        //     db.run("UPDATE version SET version_texte = '1.2.0', date_maj = CURRENT_TIMESTAMP WHERE id = 1;");
        //     console.log("   - Version mise à jour vers 1.2.0.");
        //     currentDbVersion = "1.2.0"; // Update local tracker
        // }

        // --- Ajoutez d'autres étapes de migration ici ---

        // Vérification finale si la version actuelle correspond à la cible
        if (currentDbVersion !== DB_VERSION) {
             // This should ideally not happen if the chain is correct
             throw new Error(`Migration incomplète. Version atteinte: ${currentDbVersion}, attendue: ${DB_VERSION}`);
        }

        db.exec("COMMIT;"); // Commit transaction if all migrations succeed
        console.log("✅ Toutes les migrations ont été appliquées avec succès.");
        await saveDatabase(); // Sauvegarde la base après les migrations réussies

    } catch (err) {
        db.exec("ROLLBACK;"); // Rollback transaction on error
        console.error("❌ Erreur durant la migration. Annulation des changements.", err);
        // Rethrow or handle the error appropriately - maybe notify the user
        throw err; // Re-throw to signal failure
    }
}

// 💾 Sauvegarde de la base dans chrome.storage.local
export async function saveDatabase(): Promise<void> {
  try {
    db.run("UPDATE version SET iterations = iterations + 1 WHERE id = 1;");
    db.run("UPDATE version SET date_maj = CURRENT_TIMESTAMP WHERE id = 1;");
  } catch (err) {
    console.error("❌ Erreur lors de l'incrémentation des itérations ou de la mise à jour de la date :", err);
    return;
  }

  const data = db.export();
  const array = Array.from(data);
  await chrome.storage.local.set({ leakr_db: array });
  console.log("💫 Base sauvegardée localement");
}

export async function exportDatabase(): Promise<Uint8Array> {
  const data = db.export();
  const array = new Uint8Array(data);
  const blob = new Blob([array], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Récupère la date et l'iteration depuis la table version
  let dateMaj = new Date().toISOString();
  let iteration = 0;
  try {
    const stmt = db.prepare("SELECT date_maj, iterations FROM version WHERE id = 1;");
    if (stmt.step()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = stmt.getAsObject() as any;
      dateMaj = row.date_maj as string || dateMaj;
      iteration = row.iterations as number || 0;
    }
    stmt.free();
  } catch (err) {
    console.warn("Impossible de récupérer la date/iteration depuis la table version :", err);
  }
  let uuid = "unknown";
  try {
    const stmtUuid = db.prepare("SELECT uuid FROM settings LIMIT 1;");
    if (stmtUuid.step()) {
      uuid = stmtUuid.getAsObject().uuid as string || "unknown";
    }
    stmtUuid.free();
  } catch (err) {
    console.warn("Impossible de récupérer le uuid depuis la table settings :", err);
  }
  a.download = `leakr_db_${uuid}_${dateMaj.replace(/[:.]/g, "-")}_it${iteration}.sqlite`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log("📦 Base exportée");
  return array;
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

/** Trouve un créateur avec correspondance floue sur le nom ou les alias (insensible à la casse) */
export function findCreatorByUsername(username: string): Createur | null {
  // Essai direct par nom exact (rapide)
  const stmt = db.prepare(`
    SELECT id, nom, aliases, date_ajout, favori
    FROM createurs
    WHERE LOWER(nom) = LOWER(?)
    LIMIT 1
  `);
  stmt.bind([username]);

  let creator: Createur | null = null;

  try {
    if (stmt.step()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = stmt.getAsObject() as any;
      let parsedAliases: string[] = [];
      try {
        parsedAliases = JSON.parse(row.aliases as string || '[]');
      } catch (e) {
        console.error(`Erreur de parsing des aliases pour ${row.id}:`, row.aliases, e);
      }
      creator = {
        id: row.id as number,
        nom: row.nom as string,
        aliases: parsedAliases,
        date_ajout: row.date_ajout as string,
        favori: Boolean(row.favori),
      };
    }
  } catch (err) {
    console.error("Erreur lors de la recherche exacte :", err);
  } finally {
    stmt.free();
  }

  // 🌸 Si pas trouvé exactement, on fait une recherche floue avec Fuse.js
  if (!creator) {
    const allCreators = getCreateurs(); // Peut être optimisé si la liste est très grande

    const fuse = new Fuse(allCreators, {
      keys: ['nom', 'aliases'],
      threshold: 0.1, // Ajuste pour rendre plus ou moins strict
      ignoreLocation: true,
      includeScore: true,
    });

    const results = fuse.search(username);
    if (results.length > 0) {
      const matchedCreator = results[0].item;
      const searchTermLower = username.toLowerCase();
      const nameLower = matchedCreator.nom.toLowerCase();
      const aliasesLower = matchedCreator.aliases.map(a => a.toLowerCase());

      // Vérifie si le terme recherché n'est pas déjà le nom ou un alias existant (insensible à la casse)
      if (searchTermLower !== nameLower && !aliasesLower.includes(searchTermLower)) {
        // Ajoute le terme recherché comme nouvel alias
        const updatedAliases = [...matchedCreator.aliases, username];
        const updatedAliasesStr = JSON.stringify(updatedAliases);

        try {
          const updateStmt = db.prepare("UPDATE createurs SET aliases = ? WHERE id = ?");
          updateStmt.run([updatedAliasesStr, matchedCreator.id]);
          updateStmt.free();
          saveDatabase(); // Sauvegarde la modification
          console.log(`Alias "${username}" ajouté pour le créateur "${matchedCreator.nom}" (ID: ${matchedCreator.id}) suite à une correspondance floue.`);
          // Met à jour l'objet retourné pour refléter le nouvel alias
          matchedCreator.aliases = updatedAliases;
        } catch (updateErr) {
            console.error(`Erreur lors de l'ajout de l'alias "${username}" pour le créateur ${matchedCreator.id}:`, updateErr);
        }
      }
      creator = matchedCreator; // Assigne le créateur trouvé (potentiellement mis à jour)
    }
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



/** Récupère tous les contenus, ordonnés par date d'ajout (plus récent d'abord) */
export function getAllContenus(): Contenu[] {
  const stmt = db.prepare("SELECT id, url, tabname, date_ajout, id_createur, favori FROM contenus ORDER BY date_ajout DESC");
  const contenus: Contenu[] = [];
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



/** Récupère les IDs des contenus d'un créateur spécifique */
export function getContenuIdsByCreator(id_createur: number): number[] {
  const stmt = db.prepare("SELECT id FROM contenus WHERE id_createur = ? ORDER BY date_ajout DESC");
  const ids: number[] = [];
  stmt.bind([id_createur]);
  while (stmt.step()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.getAsObject() as any;
    ids.push(row.id as number);
  }
  stmt.free();
  return ids;
}

/** Récupère un contenu spécifique par son ID */
export function getContenuById(id: number): Contenu | null {
  const stmt = db.prepare("SELECT id, url, tabname, date_ajout, id_createur, favori FROM contenus WHERE id = ?");
  stmt.bind([id]);
  let contenu: Contenu | null = null;
  if (stmt.step()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.getAsObject() as any;
    contenu = {
        id: row.id as number,
        url: row.url as string,
        tabname: row.tabname as string | null,
        date_ajout: row.date_ajout as string,
        id_createur: row.id_createur as number,
        favori: Boolean(row.favori)
    };
  }
  stmt.free();
  return contenu;
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
