// background.ts
import { authenticateWithClerk, getAccessToken } from "./lib/authUtils";
import { uploadDatabaseToServer } from "./lib/dbUtils"; // Added import

// Écoute les connexions de port (popup)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup-voile") {
    console.log("✨ Une popup s’est incarnée.");

    // Quand la popup se ferme, le port se déconnecte
    port.onDisconnect.addListener(async () => {
      console.log("🌙 La popup s’est éteinte.");
      try {
        console.log(
          "🚀 Tentative d’upload de la base de données suite à la fermeture de la popup..."
        );
        await uploadDatabaseToServer();
        console.log(
          "✅ Base de données uploadée avec succès après fermeture de la popup."
        );
      } catch (error) {
        console.error(
          "❌ Erreur lors de l’upload de la base de données après fermeture de la popup:",
          error
        );
      }
    });

    // Optionnel : écouter les messages de la popup
    port.onMessage.addListener((msg) => {
      if (msg.type === "popup-ouvert") {
        console.log(
          "📣 Popup ouverte à",
          new Date(msg.timestamp).toLocaleTimeString()
        );
      }
    });
  }
});

// Écoute les messages classiques depuis popup ou contenu
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case "AUTH_CLERK":
      authenticateWithClerk()
        .then(() => sendResponse({ status: "success" }))
        .catch((err) => sendResponse({ status: "error", error: err.message }));
      return true; // on répond async

    case "GET_TOKEN":
      getAccessToken()
        .then((token) => sendResponse({ status: "success", token }))
        .catch((err) => sendResponse({ status: "error", error: err.message }));
      return true;

    default:
      return false;
  }
});

// Exemple d'appel depuis popup:
// chrome.runtime.sendMessage({ type: 'AUTH_CLERK' }, resp => console.log(resp));
// chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, resp => console.log('Token:', resp.token));
