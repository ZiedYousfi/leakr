// src/popup.ts
import { mount } from "svelte";
import "./app.css"; // Import global CSS styles
import App from "./App.svelte";

import * as dbLib from "./lib/dbUtils";
import { triggerSync } from "./lib/syncUtils"; // Added import

const target = document.getElementById("app");

if (!target) {
  throw new Error('🌸 Mount point "#app" introuvable dans popup.html');
}

// Ouvre un port pour signaler l'ouverture et la fermeture de la popup
const port = chrome.runtime.connect({ name: "popup-voile" });
// Envoie un message d'ouverture si besoin
port.postMessage({ type: "popup-ouvert", timestamp: Date.now() });

// Wrap the initialization and mounting logic in an async function
const initializeApp = async () => {
  try {
    // Initialise la base de données
    await dbLib.initDatabase();

    // Attempt to synchronize the database
    await triggerSync(); // Added sync trigger

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
