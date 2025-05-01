import initSqlJs from "sql.js";
import Fuse from "fuse.js";
import type { SqlJsStatic, Database } from "sql.js";
import semver from "semver";

let SQL: SqlJsStatic;
let db: Database;

// --- Types ---

export interface Createur {
  id: number;
  nom: string;
  aliases: string[];
  date_ajout: string; // ISO 8601 format
  favori: boolean;
  // Variable pour savoir si les infos d'un créateur ont été vérifié par un humain
  verifie: boolean;
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
      share_collection BOOLEAN DEFAULT TRUE
    );

    -- Insérer une valeur par défaut pour le UUID
    INSERT INTO settings (id, uuid, share_collection) VALUES (1, '00000000-0000-0000-0000-000000000000', 1);

    -- Création des tables créateurs, contenus, plateformes et profils_plateforme
    CREATE TABLE createurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT UNIQUE NOT NULL,
      aliases TEXT UNIQUE NOT NULL,
      date_ajout TEXT NOT NULL,
      favori BOOLEAN DEFAULT FALSE
      -- Variable pour savoir si les infos d'un créateur ont été vérifié par un humain
      verifie BOOLEAN DEFAULT FALSE
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
const DB_VERSION = "1.1.2"; // version cible

// --- Définition des migrations ---
interface Migration {
  to: string;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    to: "1.1.0",
    up(db) {
      // 1️⃣ Ajouter la colonne 'verifie'
      db.run("ALTER TABLE createurs ADD COLUMN verifie BOOLEAN DEFAULT FALSE;");

      // 2️⃣ Nettoyer les doublons AVANT de créer l'index UNIQUE
      // On va identifier les doublons potentiels sur 'aliases'
      const duplicates = db.exec(`
        SELECT aliases, COUNT(*) as count
        FROM createurs
        GROUP BY aliases
        HAVING count > 1
      `);

      if (duplicates.length > 0) {
        console.warn(
          "⚠️ Doublons détectés dans 'aliases'. Nettoyage en cours…"
        );

        duplicates[0].values.forEach(([alias]) => {
          // Pour chaque alias en double, on conserve 1 entrée et on modifie les autres
          const rows = db.exec(
            `SELECT id FROM createurs WHERE aliases = '${alias}' ORDER BY id ASC;`
          );
          const ids = rows[0].values.map(([id]) => id);

          // On garde le premier, on modifie les autres
          for (let i = 1; i < ids.length; i++) {
            const newAlias = alias + `_dup${i}`;
            db.run(
              `UPDATE createurs SET aliases = '${newAlias}' WHERE id = ${ids[i]};`
            );
            console.log(`🔧 Alias dupliqué ajusté : ${alias} → ${newAlias}`);
          }
        });
      }

      // 3️⃣ Créer les index uniques une fois les données propres
      db.run(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_createurs_nom_unique ON createurs(nom);"
      );
      db.run(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_createurs_aliases_unique ON createurs(aliases);"
      );

      console.log("✅ Migration 1.1.0 appliquée avec nettoyage des doublons.");
    },
  },

  {
    to: "1.1.1",
    up(db) {
      console.log(
        "🔄 Migration 1.1.1 : Nettoyage des aliases et sécurisation des contraintes…"
      );

      // 2️⃣ Détecter et corriger les doublons d'aliases
      const duplicates = db.exec(`
        SELECT aliases, COUNT(*) as count
        FROM createurs
        GROUP BY aliases
        HAVING count > 1
      `);

      if (duplicates.length > 0) {
        console.warn(
          `⚠️ ${duplicates[0].values.length} doublons d'aliases détectés.`
        );

        duplicates[0].values.forEach(([alias]) => {
          const rows = db.exec(
            `SELECT id FROM createurs WHERE aliases = '${alias}' ORDER BY id ASC;`
          );
          const ids = rows[0].values.map(([id]) => id);

          for (let i = 1; i < ids.length; i++) {
            if (typeof alias === "string") {
              // Check if alias is a string
              // Adjust replacement logic to add as a new element, handle empty array
              const newAlias =
                alias === "[]"
                  ? `["_dup${i}"]`
                  : alias.replace(/\]$/, `, "_dup${i}"]`);
              // Use parameterized query to prevent potential SQL injection issues
              db.run(`UPDATE createurs SET aliases = ? WHERE id = ?;`, [
                newAlias,
                ids[i],
              ]);
              console.log(
                `🔧 Alias dupliqué ajusté pour ID ${ids[i]} : ${newAlias}`
              );
            } else {
              // Handle cases where alias is not a string (e.g., null, number)
              const defaultAlias = `["_dup${i}"]`;
              db.run(`UPDATE createurs SET aliases = ? WHERE id = ?;`, [
                defaultAlias,
                ids[i],
              ]);
              console.warn(
                `⚠️ Alias non-string détecté pour ID ${ids[i]}: ${alias}. Réinitialisé à ${defaultAlias}.`
              );
            }
          }
        });
      }

      // 1️⃣ Corriger les aliases vides ou invalides
      const invalids = db.exec(`
        SELECT id, aliases FROM createurs
        WHERE aliases IS NULL OR TRIM(aliases) = '' OR aliases NOT LIKE '[%'
      `);

      if (invalids.length > 0) {
        invalids[0].values.forEach(([id, aliases]) => {
          db.run(`UPDATE createurs SET aliases = '[]' WHERE id = ${id};`);
          console.log(
            `✨ Alias réinitialisé pour le créateur ID ${id} (ancien: "${aliases}")`
          );
        });
      }

      // 3️⃣ Appliquer les contraintes UNIQUE après nettoyage
      db.run(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_createurs_nom_unique ON createurs(nom);"
      );
      db.run(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_createurs_aliases_unique ON createurs(aliases);"
      );

      console.log("✅ Migration 1.1.1 terminée avec succès.");
    },
  },
  {
    to: "1.1.2",
    up(db) {
      console.log(
        "🔄 Migration 1.1.2 : Purge des '_dupX' et rétablissement de l'unicité"
      );

      // 0️⃣ On supprime temporairement l'index pour éviter les erreurs de contrainte
      db.run("DROP INDEX IF EXISTS idx_createurs_aliases_unique;");
      console.log("   – Index idx_createurs_aliases_unique supprimé");

      // 1️⃣ On parcourt tous les createurs pour nettoyer les aliases
      const rows = db.exec(`SELECT id, aliases FROM createurs;`);
      let countFixed = 0;
      if (rows.length > 0) {
        rows[0].values.forEach(([id, aliasText]) => {
          if (typeof aliasText !== "string" || !aliasText.includes("_dup"))
            return;

          // Tenter de parser la partie JSON valide
          let base: string[] = [];
          try {
            base = JSON.parse(aliasText);
            if (!Array.isArray(base)) base = [];
          } catch {
            const m = aliasText.match(/^(\[.*?\])/);
            if (m) {
              try {
                base = JSON.parse(m[1]);
              } catch {
                base = [];
              }
            }
          }

          // On retire tout ce qui contient "_dup"
          const cleaned = base.filter((a) => !a.includes("_dup"));
          const cleanedStr = JSON.stringify(cleaned);
          db.run(`UPDATE createurs SET aliases = ? WHERE id = ?;`, [
            cleanedStr,
            id,
          ]);
          countFixed++;
          console.log(`   🔧 ID ${id} → ${cleanedStr}`);
        });
      }
      console.log(`   ✅ ${countFixed} aliases nettoyés`);

      // 2️⃣ On vérifie qu’il n’y a plus de doublons avant de recréer l’index
      const postDup = db.exec(`
        SELECT aliases, COUNT(*) AS cnt
        FROM createurs
        GROUP BY aliases
        HAVING cnt > 1
      `);
      if (postDup.length === 0) {
        db.run(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_createurs_aliases_unique ON createurs(aliases);"
        );
        console.log("   ✅ Index UNIQUE rétabli sur createurs(aliases)");
      } else {
        console.warn(
          "   ⚠️ Des doublons subsistent, index UNIQUE non recréé. À corriger manuellement."
        );
      }

      console.log("🌸 Migration 1.1.2 terminée.");
    },
  },

  // Ajoutez d'autres migrations ici

  // { to: "1.2.0", up(db) { /* … */ } },
];

function validateMigrations() {
  const versions = migrations.map((m) => m.to);
  for (let i = 1; i < versions.length; i++) {
    if (!semver.gt(versions[i], versions[i - 1])) {
      throw new Error(
        `🚨 Migration mal ordonnée : ${versions[i - 1]} → ${versions[i]}`
      );
    }
  }
  if (versions[versions.length - 1] !== DB_VERSION) {
    console.warn(
      `⚠️ Dernière migration (${versions[versions.length - 1]}) différente de DB_VERSION (${DB_VERSION})`
    );
  }
}

// 📦 Initialise sql.js et la base
export async function initDatabase(): Promise<void> {
  SQL = await initSqlJs({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    locateFile: (_: string) => chrome.runtime.getURL("sql-wasm.wasm"),
  });

  const stored = await chrome.storage.local.get("leakr_db");
  if (stored.leakr_db) {
    db = new SQL.Database(new Uint8Array(stored.leakr_db));
    console.log("🦊 Base chargée depuis le stockage");
  } else {
    db = new SQL.Database();
    console.log("✨ Nouvelle base créée");
    createSchema(); // votre schéma initial
    await saveDatabase();
  }

  await checkVersion(); // passe en revue et applique les migrations
}

// 🧠 Vérifie la version et déclenche les migrations si besoin
async function checkVersion() {
  const stmt = db.prepare("SELECT version_texte FROM version WHERE id = 1;");
  if (!stmt.step()) {
    throw new Error("❌ La table version est manquante ou corrompue.");
  }
  const { version_texte: current } = stmt.getAsObject() as {
    version_texte: string;
  };
  stmt.free();
  console.log(`📜 Version DB locale : ${current}`);

  if (semver.lt(current, DB_VERSION)) {
    console.warn(`⚠️ Migration nécessaire : ${current} → ${DB_VERSION}`);
    await runMigrations(current);
  } else if (semver.gt(current, DB_VERSION)) {
    throw new Error(
      `❌ DB (${current}) > extension (${DB_VERSION}). Downgrade non pris en charge.`
    );
  } else {
    console.log("✅ Versions synchronisées, aucune migration à appliquer.");
  }
}

// 🚀 Applique les migrations dans l’ordre
async function runMigrations(current: string) {
  validateMigrations();
  console.log("🔄 Démarrage des migrations…");
  db.exec("BEGIN TRANSACTION;");
  try {
    const toApply = migrations
      .filter((m) => semver.gt(m.to, current) && semver.lte(m.to, DB_VERSION))
      .sort((a, b) => semver.compare(a.to, b.to));

    for (const { to, up } of toApply) {
      console.log(`⏳ Migration vers ${to}…`);
      up(db);
      db.run(
        "UPDATE version SET version_texte = ?, date_maj = CURRENT_TIMESTAMP WHERE id = 1;",
        [to]
      );
      console.log(`   ✓ version mise à jour en ${to}`);
    }

    db.exec("COMMIT;");
    console.log("✅ Toutes les migrations appliquées.");
    await saveDatabase();
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("❌ Erreur de migration, rollback effectué.", err);
    throw err;
  }
}

// 💾 Sauvegarde de la base dans chrome.storage.local
export async function saveDatabase(): Promise<void> {
  try {
    db.run("UPDATE version SET iterations = iterations + 1 WHERE id = 1;");
    db.run("UPDATE version SET date_maj = CURRENT_TIMESTAMP WHERE id = 1;");
  } catch (err) {
    console.error(
      "❌ Erreur lors de l'incrémentation des itérations ou de la mise à jour de la date :",
      err
    );
    return;
  }

  const data = db.export();
  const array = Array.from(data);
  await chrome.storage.local.set({ leakr_db: array });
  console.log("💫 Base sauvegardée localement");
}

/**
 * Triggers a browser download for the given data.
 * @param data The data to download as a Uint8Array.
 * @param filename The desired filename for the download.
 * @param mimeType The MIME type of the file.
 */
function triggerDownload(
  data: Uint8Array,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`📥 Fichier "${filename}" téléchargé.`);
}

/**
 * Exports the database content and generates a filename.
 * Does not trigger the download.
 * @returns A promise resolving to an object containing the database data and filename.
 */
export async function exportDatabaseData(): Promise<{
  data: Uint8Array;
  filename: string;
}> {
  const data = db.export();
  const array = new Uint8Array(data);

  // Récupère la date et l'iteration depuis la table version
  let dateMaj = new Date().toISOString();
  let iteration = 0;
  try {
    const stmt = db.prepare(
      "SELECT date_maj, iterations FROM version WHERE id = 1;"
    );
    if (stmt.step()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = stmt.getAsObject() as any;
      dateMaj = (row.date_maj as string) || dateMaj;
      iteration = (row.iterations as number) || 0;
    }
    stmt.free();
  } catch (err) {
    console.warn(
      "Impossible de récupérer la date/iteration depuis la table version :",
      err
    );
  }

  let uuid = "unknown";
  try {
    const stmtUuid = db.prepare("SELECT uuid FROM settings LIMIT 1;");
    if (stmtUuid.step()) {
      uuid = (stmtUuid.getAsObject().uuid as string) || "unknown";
    }
    stmtUuid.free();
  } catch (err) {
    console.warn(
      "Impossible de récupérer le uuid depuis la table settings :",
      err
    );
  }

  const filename = `leakr_db_${uuid}_${dateMaj.replace(/[:.]/g, "-")}_it${iteration}.sqlite`;
  console.log("📦 Données de la base préparées pour l'export.");
  return { data: array, filename: filename };
}

/**
 * Exports the database and triggers a download.
 */
export async function downloadDatabaseExport(): Promise<void> {
  const { data, filename } = await exportDatabaseData();
  triggerDownload(data, filename, "application/octet-stream");

  console.log(`📥 Download of "${filename}" completed.`);
}

// --- Fonctions de paramètres ---

/** Interface pour les paramètres */
export interface Settings {
  id: number;
  uuid: string;
  share_collection: boolean;
}

/** Récupère les paramètres de l'utilisateur (il ne devrait y avoir qu'une seule ligne) */
export function getSettings(): Settings | null {
  const stmt = db.prepare(
    "SELECT id, uuid, share_collection FROM settings WHERE id = 1"
  );
  let settings: Settings | null = null;
  try {
    if (stmt.step()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = stmt.getAsObject() as any;
      settings = {
        id: row.id as number,
        uuid: row.uuid as string,
        share_collection: Boolean(row.share_collection),
      };
    } else {
      console.warn("Aucun paramètre trouvé dans la base de données.");
      // Optionnel: Insérer des paramètres par défaut si absents
      // const defaultUuid = crypto.randomUUID(); // Générer un vrai UUID
      // db.run("INSERT INTO settings (id, uuid, share_collection) VALUES (1, ?, ?)", [defaultUuid, false]);
      // saveDatabase();
      // return { id: 1, uuid: defaultUuid, share_collection: false };
    }
  } catch (err) {
    console.error("Erreur lors de la récupération des paramètres:", err);
  } finally {
    stmt.free();
  }
  return settings;
}

/** Met à jour le statut de partage de la collection */
export function updateShareCollection(share: boolean): void {
  const stmt = db.prepare(
    "UPDATE settings SET share_collection = ? WHERE id = 1"
  );
  try {
    stmt.run([share ? 1 : 0]);
    saveDatabase();
    console.log(`Paramètre share_collection mis à jour à : ${share}`);
  } catch (err) {
    console.error(
      "Erreur lors de la mise à jour du paramètre share_collection:",
      err
    );
  } finally {
    stmt.free();
  }
}

/** Met à jour l'UUID de l'utilisateur (à utiliser avec précaution) */
export function updateUUID(newUuid: string): void {
  // Ajouter une validation pour le format UUID si nécessaire
  const stmt = db.prepare("UPDATE settings SET uuid = ? WHERE id = 1");
  try {
    stmt.run([newUuid]);
    saveDatabase();
    console.log(`UUID mis à jour à : ${newUuid}`);
  } catch (err) {
    console.error("Erreur lors de la mise à jour de l'UUID:", err);
  } finally {
    stmt.free();
  }
}

// --- Fonctions CRUD ---

// CREATEURS

/** Ajoute un nouveau créateur */
export function addCreateur(nom: string, aliases: string[]): number | bigint {
  const aliasesStr = JSON.stringify(aliases);
  const stmt = db.prepare(
    "INSERT INTO createurs (nom, aliases, date_ajout) VALUES (?, ?, ?)"
  );
  stmt.run([nom, aliasesStr, new Date().toISOString()]);
  stmt.free();
  const lastIdRaw = db.exec("SELECT last_insert_rowid();")[0].values[0][0];
  const lastId =
    typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint"
      ? lastIdRaw
      : 0;
  saveDatabase();
  return lastId;
}

/** Récupère tous les créateurs */
export function getCreateurs(): Createur[] {
  const stmt = db.prepare(
    "SELECT id, nom, aliases, date_ajout, favori FROM createurs ORDER BY nom ASC"
  );
  const createurs: Createur[] = [];
  while (stmt.step()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.getAsObject() as any;
    createurs.push({
      id: row.id as number,
      nom: row.nom as string,
      aliases: JSON.parse((row.aliases as string) || "[]"),
      date_ajout: row.date_ajout as string,
      favori: Boolean(row.favori),
      verifie: Boolean(row.verifie), // Assurez-vous que la colonne 'verifie' existe dans la table
    });
  }
  stmt.free();
  return createurs;
}

export function findCreatorByUsername(username: string): Createur | null {
  // — 0️⃣ Préparations générales —
  const allCreators  = getCreateurs();
  const termLower    = username.toLowerCase();
  const normalize    = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/[l1]/g, "i")
      .replace(/[o0]/g, "o");

  // — 1️⃣ Nom exact SQL (toujours prioritaire) —
  const exactStmt = db.prepare(`
    SELECT id, nom, aliases, date_ajout, favori, verifie
    FROM createurs
    WHERE LOWER(nom) = LOWER(?)
    LIMIT 1
  `);
  exactStmt.bind([username]);
  try {
    if (exactStmt.step()) {
      const row = exactStmt.getAsObject() as any;
      return {
        id:         row.id,
        nom:        row.nom,
        aliases:    JSON.parse(row.aliases || "[]"),
        date_ajout: row.date_ajout,
        favori:     Boolean(row.favori),
        verifie:    Boolean(row.verifie),
      };
    }
  } catch (e) {
    console.error("🌀 Erreur recherche SQL exacte :", e);
  } finally {
    exactStmt.free();
  }

  // — 2️⃣ Fuse.js en tête —
  // Seuil adaptatif pour Fuse score
  let MAX_SCORE = 0.5;
  if (username.length <= 3)      MAX_SCORE = 0.3;
  else if (username.length >= 8) MAX_SCORE = 0.7;

  const fuse = new Fuse(allCreators, {
    keys:           ["nom", "aliases"],
    threshold:      MAX_SCORE,       // ← on utilise ici notre MAX_SCORE
    ignoreLocation: true,
    includeScore:   true,
  });

  const results = fuse.search(username);
  if (results.length > 0) {
    const { item, score = 1 } = results[0];
    const ratio = username.length / item.nom.length;

    console.log(`🔮 Fuse top "${username}"→"${item.nom}": score=${score.toFixed(3)}, ratio=${ratio.toFixed(2)}, seuil=${MAX_SCORE}`);

    if (score <= MAX_SCORE && username.length >= 2 && ratio >= 0.3) {
      // on ajoute l’alias si nécessaire
      if (!item.aliases.includes(username)) {
        const upd = db.prepare("UPDATE createurs SET aliases = ? WHERE id = ?");
        const newAliases = JSON.stringify([ ...item.aliases, username ]);
        upd.run([newAliases, item.id]);
        upd.free();
        saveDatabase();
        console.log(`🌺 Alias "${username}" ajouté à "${item.nom}" (ID:${item.id}).`);
        item.aliases.push(username);
      }
      return item;
    }
  }

  // — 3️⃣ Fallback : alias exact en mémoire —
  const aliasExact = allCreators.find(c =>
    c.aliases.some(a => a.toLowerCase() === termLower)
  );
  if (aliasExact) {
    console.log(`🌟 Alias exact "${username}" → "${aliasExact.nom}"`);
    return aliasExact;
  }

  // — 4️⃣ Alias-substring bi-directionnel (seuil ≥ 3) —
  const MIN_SUBSTR = 3;
  const aliasSub = allCreators.find(c =>
    c.aliases
      .map(normalize)
      .some(a =>
        a.length >= MIN_SUBSTR &&
        (normalize(username).includes(a) || a.includes(normalize(username)))
      )
  );
  if (aliasSub) {
    console.log(`✨ Alias-substr "${username}" → "${aliasSub.nom}"`);
    return aliasSub;
  }

  // — 5️⃣ Multi-part & prefix (en ultime recours) —
  const prefixOK = username.length >= 4;
  const pref = allCreators.find(c => {
    const n  = normalize(c.nom);
    const as = c.aliases.map(normalize);
    return prefixOK && (
      n.startsWith(normalize(username)) ||
      as.some(a => a.startsWith(normalize(username)))
    );
  });
  if (pref) {
    console.log(`🚀 Prefix "${username}" → "${pref.nom}"`);
    return pref;
  }

  console.warn(`❌ Aucun créateur trouvé pour "${username}".`);
  return null;
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
    let stmt = db.prepare(
      "DELETE FROM profils_plateforme WHERE id_createur = ?"
    );
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
export function addContenu(
  url: string,
  tabname: string,
  id_createur: number
): number | bigint {
  const stmt = db.prepare(
    "INSERT INTO contenus (url, tabname, date_ajout, id_createur) VALUES (?, ?, ?, ?)"
  );
  stmt.run([url, tabname, new Date().toISOString(), id_createur]);
  stmt.free();
  const lastIdRaw = db.exec("SELECT last_insert_rowid();")[0].values[0][0];
  const lastId =
    typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint"
      ? lastIdRaw
      : 0;
  saveDatabase();
  return lastId;
}

/** Récupère tous les contenus, ordonnés par date d'ajout (plus récent d'abord) */
export function getAllContenus(): Contenu[] {
  const stmt = db.prepare(
    "SELECT id, url, tabname, date_ajout, id_createur, favori FROM contenus ORDER BY date_ajout DESC"
  );
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
      favori: Boolean(row.favori),
    });
  }
  stmt.free();
  return contenus;
}

/** Récupère les contenus d'un créateur spécifique */
export function getContenusByCreator(id_createur: number): Contenu[] {
  const stmt = db.prepare(
    "SELECT id, url, tabname, date_ajout, id_createur, favori FROM contenus WHERE id_createur = ? ORDER BY date_ajout DESC"
  );
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
      favori: Boolean(row.favori),
    });
  }
  stmt.free();
  return contenus;
}

/** Récupère les IDs des contenus d'un créateur spécifique */
export function getContenuIdsByCreator(id_createur: number): number[] {
  const stmt = db.prepare(
    "SELECT id FROM contenus WHERE id_createur = ? ORDER BY date_ajout DESC"
  );
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
  const stmt = db.prepare(
    "SELECT id, url, tabname, date_ajout, id_createur, favori FROM contenus WHERE id = ?"
  );
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
      favori: Boolean(row.favori),
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
    const lastId =
      typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint"
        ? lastIdRaw
        : 0;
    saveDatabase();
    return lastId;
  } catch (err: unknown) {
    // Gérer l'erreur d'unicité
    if (
      err instanceof Error &&
      err.message.includes("UNIQUE constraint failed")
    ) {
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
      nom: row.nom as string,
    });
  }
  stmt.free();
  return plateformes;
}

// PROFILS PLATEFORME (Exemples simples)

/** Ajoute un profil plateforme pour un créateur */
export function addProfilPlateforme(
  lien: string,
  id_createur: number,
  id_plateforme: number
): number | bigint {
  const stmt = db.prepare(
    "INSERT INTO profils_plateforme (lien, id_createur, id_plateforme) VALUES (?, ?, ?)"
  );
  stmt.run([lien, id_createur, id_plateforme]);
  stmt.free();
  const lastIdRaw = db.exec("SELECT last_insert_rowid();")[0].values[0][0];
  const lastId =
    typeof lastIdRaw === "number" || typeof lastIdRaw === "bigint"
      ? lastIdRaw
      : 0;
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
      id_plateforme: row.id_plateforme as number,
    });
  }
  stmt.free();
  return profils;
}

/** Trouve un profil spécifique par créateur, plateforme et lien */
export function findProfilByDetails(
  id_createur: number,
  id_plateforme: number,
  lien: string
): ProfilPlateforme | null {
  const stmt = db.prepare(`
      SELECT id, lien, id_createur, id_plateforme
      FROM profils_plateforme
      WHERE id_createur = ? AND id_plateforme = ? AND lien = ?
      LIMIT 1
  `);
  stmt.bind([id_createur, id_plateforme, lien]);
  let profil: ProfilPlateforme | null = null;
  if (stmt.step()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.getAsObject() as any;
    profil = {
      id: row.id as number,
      lien: row.lien as string,
      id_createur: row.id_createur as number,
      id_plateforme: row.id_plateforme as number,
    };
  }
  stmt.free();
  return profil;
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
