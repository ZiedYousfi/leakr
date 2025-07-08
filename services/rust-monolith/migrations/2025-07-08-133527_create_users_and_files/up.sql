-- Your SQL goes here

-- Création de la table users
CREATE TABLE users (
    uuid TEXT PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    files INTEGER NOT NULL DEFAULT 0
);

-- Création de la table files
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    uuid_of_users TEXT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    iteration INTEGER NOT NULL
);

-- Optionnel : pour la jointure (index sur uuid_of_users)
CREATE INDEX idx_files_uuid_of_users ON files(uuid_of_users);

