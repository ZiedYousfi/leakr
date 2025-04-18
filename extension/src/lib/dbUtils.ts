import initSqlJs from "sql.js";
import type { SqlJsStatic, Database } from "sql.js";

let SQL: SqlJsStatic;
let db: Database;

const DB_VERSION = "1.0.0"; // 💡 version actuelle de la structure

// 📦 Initialise sql.js et la base (nouvelle ou chargée depuis storage)
export async function initDatabase(): Promise<void> {
  SQL = await initSqlJs({
    locateFile: file => file // suppose que sql-wasm.wasm est à la racine du dist
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

// 📐 Création complète du schéma initial
function createSchema() {
  db.run(`
    CREATE TABLE version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version_texte TEXT NOT NULL
    );

    INSERT INTO version (id, version_texte) VALUES (1, '${DB_VERSION}');

    CREATE TABLE createurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      favori BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE contenus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
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
  const data = db.export();
  const array = Array.from(data);
  await chrome.storage.local.set({ ahri_db: array });
  console.log("💫 Base sauvegardée localement");
}

// 📦 Exporter en Blob (téléchargement ou envoi)
export function exportDatabase(): Blob {
  const binaryArray = db.export();
  return new Blob([binaryArray], { type: "application/octet-stream" });
}

// (Tu pourras ajouter ici d'autres fonctions : addCreateur, getContenus, etc.)
