<script lang="ts">
  // Intégration de Clerk (mode SPA) selon le guide Quickstart
  import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk/client";

  // Récupération de la clé publique depuis les variables d'environnement Vite
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  import {
    downloadDatabaseExport,
    /*importDatabase*/ initDatabase,
    getSettings,
    updateShareCollection,
    updateUUID,
  } from "../lib/dbUtils";
  import type { Settings } from "../lib/dbUtils";

  let statusMessage = $state<string | null>(null);
  let isLoading = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();
  let settings = $state<Settings | null>(null);
  let shareCollection = $state(false);
  let userUUID = $state("Loading...");

  async function boot() {
    try {
      await initDatabase();
      const loadedSettings = getSettings();
      if (loadedSettings) {
        settings = loadedSettings;
        shareCollection = loadedSettings.share_collection;
        userUUID = loadedSettings.uuid;
      } else {
        statusMessage = "Could not load settings.";
      }
    } catch (error) {
      console.error("DB init error:", error);
      statusMessage = `Error initializing DB: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  async function handleExport() {
    isLoading = true;
    statusMessage = "Exporting database...";
    try {
      await downloadDatabaseExport();
      statusMessage = "Database export initiated successfully.";
    } catch (error) {
      console.error(error);
      statusMessage =
        "Error exporting database: " +
        (error instanceof Error ? error.message : String(error));
    } finally {
      isLoading = false;
      setTimeout(() => (statusMessage = null), 5000);
    }
  }

  function triggerImport() {
    fileInput?.click();
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      statusMessage = "No file selected.";
      setTimeout(() => (statusMessage = null), 3000);
      return;
    }

    const file = input.files[0];
    if (!file.name.endsWith(".sqlite") && !file.name.endsWith(".db")) {
      statusMessage = "Please select a valid .sqlite or .db file.";
      setTimeout(() => (statusMessage = null), 5000);
      input.value = "";
      return;
    }

    isLoading = true;
    statusMessage = `Importing ${file.name}...`;

    try {
      // TODO: implement importDatabase in dbUtils
      console.warn("Import functionality not yet implemented.");
      statusMessage = "Import function not yet implemented.";
    } catch (error) {
      console.error(error);
      statusMessage =
        "Error importing database: " +
        (error instanceof Error ? error.message : String(error));
    } finally {
      isLoading = false;
      input.value = "";
      setTimeout(() => (statusMessage = null), 7000);
    }
  }

  async function handleShareToggle() {
    if (settings) {
      const prev = !shareCollection;
      isLoading = true;
      statusMessage = "Updating sharing preference...";
      try {
        await updateShareCollection(shareCollection);
        settings.share_collection = shareCollection;
        statusMessage = `Sharing preference updated to: ${
          shareCollection ? "Enabled" : "Disabled"
        }.`;
      } catch (error) {
        console.error(error);
        statusMessage =
          "Error updating preference: " +
          (error instanceof Error ? error.message : String(error));
        shareCollection = prev;
      } finally {
        isLoading = false;
        setTimeout(() => (statusMessage = null), 5000);
      }
    }
  }

  async function regenerateUUID() {
    if (
      confirm(
        "Are you sure you want to generate a new unique ID? This cannot be undone."
      )
    ) {
      isLoading = true;
      statusMessage = "Generating new UUID...";
      try {
        const newUuid = crypto.randomUUID();
        await updateUUID(newUuid);
        userUUID = newUuid;
        if (settings) settings.uuid = newUuid;
        statusMessage = "New UUID generated successfully.";
      } catch (error) {
        console.error(error);
        statusMessage =
          "Error generating UUID: " +
          (error instanceof Error ? error.message : String(error));
      } finally {
        isLoading = false;
        setTimeout(() => (statusMessage = null), 5000);
      }
    }
  }
</script>

<ClerkProvider
  publishableKey={PUBLISHABLE_KEY}>
  <SignedOut>
    <section class="auth flex flex-col items-center gap-4 p-8 text-center">
      <h2 class="text-xl font-semibold">Connecte‑toi pour configurer Leakr ✨</h2>
      <SignInButton mode="modal" />
    </section>
  </SignedOut>

  <SignedIn on:mount={boot}>
    <main>
      <header class="flex justify-between items-center mb-6">
        <h1>Leakr Options</h1>
        <UserButton />
      </header>

      <section>
        <h2>User Settings</h2>
        <div class="setting-item">
          <label for="share-toggle">Share Collection Anonymously:</label>
          <input
            type="checkbox"
            id="share-toggle"
            bind:checked={shareCollection}
            onchange={handleShareToggle}
            disabled={isLoading || !settings}
          />
          <span class="tooltip"
            >?
            <span class="tooltiptext"
              >Allow sharing anonymized collection data for analysis (feature not
              yet implemented).</span
            >
          </span>
        </div>
        <div class="setting-item">
          <label for="uuid-display">Your Unique ID:</label>
          <span
            class="uuid-display"
            id="uuid-display"
            aria-labelledby="uuid-display"
            >{userUUID}</span
          >
          <button
            onclick={regenerateUUID}
            disabled={isLoading || !settings}
            title="Generate a new unique identifier"
          >
            Regenerate
          </button>
          <span class="tooltip"
            >?
            <span class="tooltiptext"
              >A unique identifier for your installation. Used for potential
              future features like data synchronization or sharing. Regenerating
              assigns a new ID.</span
            >
          </span>
        </div>
      </section>

      <section>
        <h2>Database Management</h2>
        <p>
          Manage your local Leakr database. Exports create a backup file, Imports
          replace the current database.
        </p>
        <div class="button-group">
          <button onclick={handleExport} disabled={isLoading}>
            {isLoading && statusMessage?.startsWith("Exporting")
              ? "Exporting..."
              : "Export Database"}
          </button>
          <button onclick={triggerImport} disabled={isLoading}>
            {isLoading && statusMessage?.startsWith("Importing")
              ? "Importing..."
              : "Import Database"}
          </button>
        </div>
        <input
          type="file"
          bind:this={fileInput}
          onchange={handleFileSelect}
          accept=".sqlite,.db,application/x-sqlite3"
          style="display:none"
        />
      </section>

      {#if statusMessage}
        <div class="status-container">
          <p class="status">{statusMessage}</p>
        </div>
      {/if}
    </main>
  </SignedIn>
</ClerkProvider>

<style>
  :root {
    --primary-color: #7e5bef;
    --secondary-color: #b0b0b0;
    --background-color: #000000;
    --text-color: #e0e0e0;
    --border-color: #444444;
    --input-bg: #1a1a1a;
    --button-bg: #2c2c2c;
    --button-hover-bg: #3a3a3a;
    --disabled-opacity: 0.5;
    --status-bg: #1a1a1a;
    --status-border: #444444;
    --tooltip-bg: #2c2c2c;
    --tooltip-text: #e0e0e0;
  }
  main {
    padding: 1.5em;
    font-family: "JetBrains Mono", monospace, -apple-system, BlinkMacSystemFont,
      "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    max-width: 600px;
    margin: 2em auto;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 10px rgba(126, 91, 239, 0.1);
  }
  h1 {
    text-align: center;
    margin-bottom: 1.5em;
    color: var(--primary-color);
  }
  section {
    margin-bottom: 2em;
    padding: 1.5em;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background-color: var(--input-bg);
  }
  h2 {
    margin-top: 0;
    margin-bottom: 1em;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5em;
    color: var(--secondary-color);
  }
  p {
    margin-bottom: 1em;
    line-height: 1.6;
    color: var(--secondary-color);
  }
  .setting-item {
    display: flex;
    align-items: center;
    margin-bottom: 1em;
    gap: 0.8em;
  }
  .setting-item label {
    font-weight: 500;
    flex-shrink: 0;
    color: var(--text-color);
  }
  .setting-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--primary-color);
  }
  .uuid-display {
    font-family: monospace;
    background-color: var(--background-color);
    padding: 0.3em 0.6em;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    font-size: 0.9em;
    word-break: break-all;
    color: var(--text-color);
  }
  .button-group {
    display: flex;
    gap: 1em;
    margin-top: 1em;
  }
  button {
    padding: 0.6em 1.2em;
    cursor: pointer;
    border: 1px solid var(--border-color);
    background-color: var(--button-bg);
    color: var(--text-color);
    border-radius: 4px;
    font-size: 0.95em;
    transition: background-color 0.2s ease;
  }
  button:hover:not(:disabled) {
    background-color: var(--button-hover-bg);
    border-color: var(--secondary-color);
  }
  button:disabled {
    cursor: not-allowed;
    opacity: var(--disabled-opacity);
    background-color: var(
      --button-bg
    ); /* Keep background consistent when disabled */
    color: var(--secondary-color); /* Dim text when disabled */
  }

  .status-container {
    margin-top: 1.5em;
  }

  .status {
    padding: 0.8em 1em;
    border-radius: 4px;
    background-color: var(--status-bg);
    border: 1px solid var(--status-border);
    text-align: center;
    font-size: 0.9em;
    color: var(--text-color); /* Ensure status text is readable */
  }

  /* Tooltip Styles */
  .tooltip {
    position: relative;
    display: inline-block;
    border: 1px solid var(--secondary-color);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    font-size: 10px;
    color: var(--secondary-color);
    cursor: help;
    margin-left: 5px; /* Adjust spacing */
    background-color: var(--input-bg); /* Match background */
  }

  .tooltip .tooltiptext {
    visibility: hidden;
    width: 220px;
    background-color: var(--tooltip-bg);
    color: var(--tooltip-text);
    text-align: center;
    border-radius: 6px;
    padding: 8px;
    position: absolute;
    z-index: 1;
    bottom: 125%; /* Position above the tooltip */
    left: 50%;
    margin-left: -110px; /* Use half of the width to center */
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.85em; /* Smaller font size for tooltip */
    line-height: 1.4;
    border: 1px solid var(--border-color); /* Add border to tooltip */
  }

  .tooltip:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
  }

  /* Style adjustments for smaller screens */
  @media (max-width: 600px) {
    main {
      margin: 1em;
      padding: 1em;
    }
    h1 {
      font-size: 1.5em;
    }
    h2 {
      font-size: 1.2em;
    }
    .button-group {
      flex-direction: column;
    }
    .setting-item {
      flex-wrap: wrap; /* Allow wrapping on small screens */
    }
    .uuid-display {
      margin-top: 0.5em; /* Add space if it wraps */
      width: 100%; /* Take full width if wrapped */
    }
  }
</style>
