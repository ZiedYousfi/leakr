// src/popup.ts
import { mount } from "svelte";
import "./app.css"; // Import global CSS styles
import App from "./App.svelte";

import * as dbLib from "./lib/dbUtils";
import { triggerSync } from "./lib/syncUtils"; // Added import
import { syncState } from "./lib/syncStore"; // Import syncState
import SyncConflictResolver from "./components/SyncConflictResolver.svelte"; // Import the conflict resolver component
// Removed 'get' from svelte/store as syncState.subscribe provides the state

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
    console.log("[popup] Database initialized");

    let currentComponentInstance: Record<string, any> | null = null;
    let currentComponentType: 'App' | 'SyncConflictResolver' | null = null;

    const mountLogic = (ComponentToMount: any, type: 'App' | 'SyncConflictResolver', props = {}) => {
      // Avoid re-mounting if the correct component type is already displayed
      if (currentComponentType === type) {
        // console.log(`[popup] Component ${type} is already mounted.`);
        return;
      }

      if (currentComponentInstance && typeof currentComponentInstance.$destroy === 'function') {
        console.log(`[popup] Destroying current component: ${currentComponentType}`);
        currentComponentInstance.$destroy();
      }
      target.innerHTML = ''; // Clear previous component before mounting new one
      currentComponentInstance = mount(ComponentToMount, { target, props });
      currentComponentType = type;
      console.log(`[popup] Mounted ${type}`);
    };

    // Subscribe to sync state changes to manage UI
    // The subscription fires immediately with the current state, then on any change.
    const unsubscribeFromSyncState = syncState.subscribe((state) => {
      console.log(`[popup] Sync state changed to: ${state.status}. Current UI: ${currentComponentType || 'none'}`);
      if (state.status === "conflict" && state.conflictData) {
        mountLogic(SyncConflictResolver, 'SyncConflictResolver');
      } else {
        // For "idle", "checking", "resolved", "error", "authenticating", "importing", etc., show the main App.
        // The App component can internally decide to show loading/error messages based on syncState if needed.
        mountLogic(App, 'App');
      }
    });

    // Add listener for popup close to unsubscribe
    port.onDisconnect.addListener(() => {
      console.log("[popup] Popup closed, unsubscribing from syncState.");
      unsubscribeFromSyncState();
    });

    // Trigger synchronization. This runs in the background.
    // State changes from triggerSync will be caught by the syncState subscription.
    console.log("[popup] Triggering sync");
    triggerSync();

  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de la base :", error);
    target.innerHTML = `<p style="color: red;">Erreur : impossible d'initialiser l'application.</p>`;
    // If an error occurs here, the subscription might not be active or cleaned up by port.onDisconnect
    // However, errors during dbLib.initDatabase are the main concern before subscription setup.
  }
};

// Call the async function to start the initialization
initializeApp();
