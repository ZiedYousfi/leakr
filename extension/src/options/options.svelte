<script lang="ts">
  import {
    downloadDatabaseExport,
    initDatabase,
    getSettings,
    updateShareCollection,
    updateUUID,
    uploadDatabaseToServer,
  } from "../lib/dbUtils";
  import type { Settings } from "../lib/dbUtils";
  import {
    authenticateWithClerk,
    checkAuthStatus,
    logout,
    getAccessToken,
    clearAllStorage, // <-- Add import
  } from "../lib/authUtils";
  import { onMount } from "svelte";

  let statusMessage = $state<string | null>(null);
  let isLoading = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();
  let settings = $state<Settings | null>(null);
  let shareCollection = $state(false);
  let userUUID = $state("Loading...");
  let isAuthenticated = $state(false);

  onMount(async () => {
    try {
      isAuthenticated = await checkAuthStatus();
      if (isAuthenticated) {
        statusMessage = "Authenticated.";
        setTimeout(() => (statusMessage = null), 3000);
      }
      await initDatabase();
      const loadedSettings = getSettings();
      if (loadedSettings) {
        settings = loadedSettings;
        shareCollection = loadedSettings.share_collection;
        userUUID = loadedSettings.uuid;
      } else {
        statusMessage = "Could not load settings.";
        console.warn("Settings not found in DB.");
      }
    } catch (error) {
      console.error("Failed to initialize or load settings:", error);
      statusMessage = `Error loading settings: ${error instanceof Error ? error.message : String(error)}`;
    }
  });

  async function handleLogin() {
    isLoading = true;
    statusMessage = "Attempting login with Clerk...";
    try {
      await authenticateWithClerk();
      const token = await getAccessToken();
      if (token) {
        isAuthenticated = true;
        statusMessage = "Login successful!";
        // Optionally, reload settings or user-specific data here
      } else {
        isAuthenticated = false;
        statusMessage =
          "Login completed, but token not found. Please try again.";
      }
    } catch (error) {
      console.error("Login failed:", error);
      isAuthenticated = false;
      statusMessage = `Login failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      isLoading = false;
      setTimeout(() => (statusMessage = null), 5000);
    }
  }

  async function handleLogout() {
    isLoading = true;
    statusMessage = "Logging out...";
    try {
      await logout();
      isAuthenticated = false;
      statusMessage = "Logged out successfully.";
      // Clear user-specific settings if necessary
      // settings = null; // Example
      // userUUID = "N/A"; // Example
    } catch (error) {
      console.error("Logout failed:", error);
      statusMessage = `Logout failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      isLoading = false;
      setTimeout(() => (statusMessage = null), 5000);
    }
  }

  async function handleExport() {
    isLoading = true;
    statusMessage = "Exporting database...";
    try {
      await downloadDatabaseExport();
      statusMessage = "Database export initiated successfully.";
      console.log("Database export initiated.");
    } catch (error) {
      console.error("Failed to export database:", error);
      statusMessage = `Error exporting database: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      isLoading = false;
      setTimeout(() => (statusMessage = null), 5000);
    }
  }

  async function handleUpload() {
    isLoading = true;
    statusMessage = "Uploading database...";
    try {
      await uploadDatabaseToServer();
      statusMessage = "Database upload initiated successfully.";
      console.log("Database upload initiated.");
    } catch (error) {
      console.error("Failed to upload database:", error); // Update error message to reflect upload
      statusMessage = `Error uploading database: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      isLoading = false;
      setTimeout(() => (statusMessage = null), 5000);
    }
  }

  function triggerImport() {
    // Optional: Check if fileInput is defined before clicking
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
      input.value = ""; // Clear the input
      return;
    }

    isLoading = true;
    statusMessage = `Importing ${file.name}...`;

    try {
      // const arrayBuffer = await file.arrayBuffer();
      // const data = new Uint8Array(arrayBuffer);
      // // Assuming importDatabase replaces the current DB, saves, and potentially re-initializes state.
      // // You might need to implement this function in dbUtils.ts
      // // await importDatabase(data); // Uncomment when importDatabase is ready
      // statusMessage = `Database "${file.name}" imported successfully. Please reload the extension.`;
      // console.log("Database import successful. Reload required.");
      // // TODO: Implement importDatabase in dbUtils.ts
      // // TODO: Potentially force a reload or notify the user more explicitly.
      //  alert("Database imported. Please reload the extension for changes to take effect."); // Simple notification
      console.warn("Import functionality is commented out.");
      statusMessage = "Import function not yet implemented."; // Placeholder message
    } catch (error) {
      console.error("Failed to import database:", error);
      statusMessage = `Error importing database: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      isLoading = false;
      input.value = ""; // Clear the input
      setTimeout(() => (statusMessage = null), 7000);
    }
  }

  // Use $effect.pre for reacting to changes in shareCollection if needed,
  // but for a simple toggle triggered by user interaction, an async function is fine.
  async function handleShareToggle() {
    // The onchange event directly triggers this function.
    // The 'shareCollection' $state variable is already updated by the binding.
    if (settings) {
      const previousValue = !shareCollection; // Value before the change
      isLoading = true;
      statusMessage = "Updating sharing preference...";
      try {
        await updateShareCollection(shareCollection);
        // Update the settings object itself if necessary (though getSettings might fetch fresh data)
        settings.share_collection = shareCollection;
        statusMessage = `Sharing preference updated to: ${shareCollection ? "Enabled" : "Disabled"}.`;
      } catch (error) {
        console.error("Failed to update sharing preference:", error);
        statusMessage = `Error updating preference: ${error instanceof Error ? error.message : String(error)}`;
        // Revert checkbox state on error
        shareCollection = previousValue;
      } finally {
        isLoading = false;
        setTimeout(() => (statusMessage = null), 5000);
      }
    }
  }

  async function regenerateUUID() {
    if (
      !isAuthenticated &&
      !confirm(
        "You are not logged in. Generating a new ID without being logged in might lead to loss of association if you log in later with a different account. Continue?"
      )
    ) {
      return;
    }
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
        userUUID = newUuid; // Update $state variable
        if (settings) settings.uuid = newUuid; // Update local state object
        statusMessage = "New UUID generated successfully.";
      } catch (error) {
        console.error("Failed to generate new UUID:", error);
        statusMessage = `Error generating UUID: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        isLoading = false;
        setTimeout(() => (statusMessage = null), 5000);
      }
    }
  }

  async function handleClearAll() {
    if (
      confirm(
        "This will erase ALL extension data EXCEPT your local database (leakr_db). Authentication, settings, and user info will be removed. This cannot be undone. Continue?"
      )
    ) {
      isLoading = true;
      statusMessage = "Clearing all extension data (except database)...";
      try {
        await clearAllStorage();
        // Optionally, reset local state
        isAuthenticated = false;
        settings = null;
        userUUID = "N/A";
        shareCollection = false;
        statusMessage =
          "All extension data cleared (database not erased). Please reload the extension.";
      } catch (error) {
        console.error("Failed to clear all data:", error);
        statusMessage = `Error clearing data: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        isLoading = false;
        setTimeout(() => (statusMessage = null), 7000);
      }
    }
  }
</script>

<main>
  <h1>Leakr Options</h1>

  <section>
    <h2>Authentication</h2>
    {#if isAuthenticated}
      <p>You are currently logged in.</p>
      <div class="button-group">
        <button onclick={handleLogout} disabled={isLoading}>
          {isLoading && statusMessage?.includes("Logging out")
            ? "Logging out..."
            : "Logout"}
        </button>
      </div>
    {:else}
      <p>Log in to sync your settings and data (feature coming soon).</p>
      <div class="button-group">
        <button onclick={handleLogin} disabled={isLoading}>
          {isLoading && statusMessage?.includes("login")
            ? "Logging in..."
            : "Login with Clerk"}
        </button>
      </div>
    {/if}
  </section>

  <section>
    <h2>User Settings</h2>
    <div class="setting-item">
      <label for="share-toggle">Share Collection Anonymously:</label>
      <input
        type="checkbox"
        id="share-toggle"
        bind:checked={shareCollection}
        onchange={handleShareToggle}
        disabled={isLoading || !settings || !isAuthenticated}
      />
      <span class="tooltip"
        >?
        <span class="tooltiptext"
          >Allow sharing anonymized collection data for analysis (feature not
          yet implemented). Requires login.</span
        >
      </span>
    </div>
    <div class="setting-item">
      <label for="uuid-display">Your Unique ID:</label>
      <!-- Access $state variables directly -->
      <span
        class="uuid-display"
        id="uuid-display"
        aria-labelledby="uuid-display">{userUUID}</span
      >
      <button
        onclick={regenerateUUID}
        disabled={isLoading || !settings}
        title="Generate a new unique identifier">Regenerate</button
      >
      <span class="tooltip"
        >?
        <span class="tooltiptext"
          >A unique identifier for your installation. Used for potential future
          features like data synchronization or sharing. Regenerating assigns a
          new ID.</span
        >
      </span>
    </div>
  </section>

  <section>
    <h2>Database Management</h2>
    <p>
      Manage your local Leakr database. Exports create a backup file, Imports
      replace the current database. Some features may require login.
    </p>
    <div class="button-group">
      <!-- Access $state variables directly -->
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
      <button onclick={handleUpload} disabled={isLoading || !isAuthenticated}>
        {isLoading && statusMessage?.startsWith("Uploading")
          ? "Uploading..."
          : "Upload Database (Login Required)"}
      </button>
      <button
        onclick={handleClearAll}
        disabled={isLoading}
        style="background-color: #a94442; color: #fff; border-color: #a94442;"
        title="Erase ALL extension data except the database (irreversible!)"
      >
        {isLoading && statusMessage?.startsWith("Clearing")
          ? "Clearing..."
          : "Clear All Data (except database)"}
      </button>
    </div>
    <!-- Hidden file input: bind:this still works -->
    <input
      type="file"
      bind:this={fileInput}
      onchange={handleFileSelect}
      accept=".sqlite,.db,application/x-sqlite3"
      style="display: none;"
    />
  </section>

  {#if statusMessage}
    <div class="status-container">
      <!-- Access $state variable directly -->
      <p class="status">{statusMessage}</p>
    </div>
  {/if}

  <!-- Add other options sections here -->
</main>

<style>
  /* Styles based on visualstyle.md */
  :root {
    --primary-color: #7e5bef; /* Violet nuit */
    --secondary-color: #b0b0b0; /* Gris argenté */
    --background-color: #000000; /* Noir profond */
    --text-color: #e0e0e0; /* Light grey for contrast */
    --border-color: #444444; /* Darker grey */
    --input-bg: #1a1a1a; /* Slightly lighter black/dark grey */
    --button-bg: #2c2c2c; /* Dark grey */
    --button-hover-bg: #3a3a3a; /* Lighter grey */
    --disabled-opacity: 0.5; /* Adjusted for dark theme */
    --status-bg: #1a1a1a; /* Dark grey */
    --status-border: #444444; /* Darker grey */
    --tooltip-bg: #2c2c2c; /* Dark grey */
    --tooltip-text: #e0e0e0; /* Light grey */
  }

  main {
    padding: 1.5em;
    /* Consider adding a monospace font */
    font-family:
      "JetBrains Mono",
      monospace,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      Helvetica,
      Arial,
      sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    max-width: 600px;
    margin: 2em auto;
    border-radius: 8px;
    border: 1px solid var(--border-color); /* Add subtle border */
    box-shadow: 0 2px 10px rgba(126, 91, 239, 0.1); /* Subtle glow with primary color */
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
    background-color: var(--input-bg); /* Use input background for sections */
  }

  h2 {
    margin-top: 0;
    margin-bottom: 1em;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5em;
    color: var(--secondary-color); /* Use secondary color for headings */
  }

  p {
    margin-bottom: 1em;
    line-height: 1.6;
    color: var(--secondary-color); /* Use secondary color for paragraphs */
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
    color: var(--text-color); /* Ensure label text is readable */
  }

  .setting-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--primary-color); /* Style checkbox */
  }

  .uuid-display {
    font-family: monospace;
    background-color: var(--background-color); /* Match main background */
    padding: 0.3em 0.6em;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    font-size: 0.9em;
    word-break: break-all;
    color: var(--text-color); /* Ensure text is readable */
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
    color: var(--text-color); /* Ensure button text is readable */
    border-radius: 4px;
    font-size: 0.95em;
    transition: background-color 0.2s ease;
  }

  button:hover:not(:disabled) {
    background-color: var(--button-hover-bg);
    border-color: var(--secondary-color); /* Highlight border on hover */
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
