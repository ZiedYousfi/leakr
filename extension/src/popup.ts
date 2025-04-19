// src/popup.ts
import { mount } from "svelte";
import App from "./App.svelte";

import * as dbLib from "./lib/dbUtils";

const target = document.getElementById("app");

if (!target) {
  throw new Error('🌸 Mount point "#app" introuvable dans popup.html');
}

// Wrap the initialization and mounting logic in an async function
const initializeApp = async () => {
  try {
    // Initialise la base de données
    await dbLib.initDatabase();
    await dbLib.saveDatabase();

    // Monte l'application Svelte
    mount(App, {
      target,
      props: {},
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de la base :", error);
    target.innerHTML = `<p style="color: red;">Erreur : impossible d'initialiser l'application.</p>`;
  }
};

// Call the async function to start the initialization
initializeApp();
