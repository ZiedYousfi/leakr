<script lang="ts">
  import {
    downloadDatabaseExport,
    initDatabase,
    getSettings,
    updateShareCollection,
    // updateUUID, // No longer needed for manual regeneration from options
    uploadDatabaseToServer,
    resetDatabase, // <-- Add import
    importDatabase, // <-- Add import for the new function
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
    // Initialize loading state and clear previous messages
    isLoading = true;
    statusMessage = "Initializing options page...";

    // 1. Attempt to check authentication status
    try {
      isAuthenticated = await checkAuthStatus();
      if (isAuthenticated) {
        // Temporarily set a success message for auth, may be overwritten by DB status
        statusMessage = "Authenticated.";
        setTimeout(() => {
          // Clear only if it's still the auth message and not an error
          if (statusMessage === "Authenticated.") statusMessage = null;
        }, 3000);
      } else {
        // If not authenticated, but no error, don't set a specific status message here,
        // unless we want to explicitly say "Not authenticated".
        // For now, lack of auth is a normal state.
      }
    } catch (authError) {
      console.error("Failed to check authentication status:", authError);
      statusMessage = `Authentication check failed: ${authError instanceof Error ? authError.message : String(authError)}`;
      isAuthenticated = false; // Ensure this is false on error
    }

    // 2. Initialize database and load settings
    try {
      await initDatabase(); // This can throw if e.g., SQL.js WASM fetch fails
      const loadedSettings = getSettings();
      if (loadedSettings) {
        settings = loadedSettings;
        shareCollection = loadedSettings.share_collection;
        userUUID = loadedSettings.uuid;
        // If auth check didn't set a message, or if it was cleared,
        // and DB init was successful, we can clear the "Initializing..." message.
        if (
          statusMessage === "Initializing options page..." ||
          statusMessage === "Authenticated."
        ) {
          statusMessage = "Settings loaded successfully.";
          setTimeout(() => {
            if (statusMessage === "Settings loaded successfully.")
              statusMessage = null;
          }, 3000);
        }
      } else {
        const dbLoadErrorMessage = "Could not load settings from database.";
        // Append if there was an auth error, otherwise set.
        statusMessage =
          statusMessage &&
          !statusMessage.startsWith("Authenticated.") &&
          statusMessage !== "Initializing options page..."
            ? `${statusMessage}\n${dbLoadErrorMessage}`
            : dbLoadErrorMessage;
        console.warn("Settings not found in DB after init.");
        // Reset to defaults or error state if settings are critical
        settings = null;
        shareCollection = false;
        userUUID = "Error: Not found";
      }
    } catch (dbError) {
      console.error("Failed to initialize database or load settings:", dbError);
      const dbInitErrorMessage = `Error initializing database/settings: ${dbError instanceof Error ? dbError.message : String(dbError)}`;
      // Append if there was an auth error, otherwise set.
      statusMessage =
        statusMessage &&
        !statusMessage.startsWith("Authenticated.") &&
        statusMessage !== "Initializing options page..."
          ? `${statusMessage}\n${dbInitErrorMessage}`
          : dbInitErrorMessage;
      settings = null;
      shareCollection = false;
      userUUID = "Error: DB init failed";
    } finally {
      isLoading = false;
      // Let specific error messages persist, don't clear them with a generic timeout here
      // unless statusMessage is still "Initializing options page..."
      if (statusMessage === "Initializing options page...") {
        statusMessage = null; // Clear if no specific error or success message was set.
      }
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
      await importDatabase(file); // Call the actual import function
      statusMessage = `Database "${file.name}" imported successfully. Settings reloaded.`;
      console.log("Database import successful.");

      // Reload settings from the newly imported database
      const loadedSettings = getSettings();
      if (loadedSettings) {
        settings = loadedSettings;
        shareCollection = loadedSettings.share_collection;
        userUUID = loadedSettings.uuid;
      } else {
        statusMessage =
          "Import successful, but could not reload settings from the new database.";
        console.warn(
          "Settings not found in the imported DB or failed to load."
        );
        // Reset to defaults or clear if settings are critical
        settings = null;
        shareCollection = false;
        userUUID = "N/A";
      }
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

  async function handleResetDatabase() {
    if (
      confirm(
        "DANGER ZONE! This will completely WIPE your local Leakr database (leakr_db) and create a new, empty one. All your creators, content, and settings within the database will be PERMANENTLY LOST. This action cannot be undone. Are you absolutely sure you want to proceed?"
      )
    ) {
      isLoading = true;
      statusMessage = "Resetting database to factory defaults...";
      try {
        await resetDatabase();
        // After reset, settings will be default, so re-fetch or set to known defaults
        const loadedSettings = getSettings(); // Re-fetch new default settings
        if (loadedSettings) {
          settings = loadedSettings;
          shareCollection = loadedSettings.share_collection;
          userUUID = loadedSettings.uuid;
        } else {
          // Fallback if getSettings fails after reset (should not happen with new DB)
          settings = null;
          shareCollection = false;
          userUUID = "N/A";
        }
        // Authentication state is not directly tied to the DB content itself,
        // but a DB reset might imply a desire to start fresh.
        // For now, we don't touch isAuthenticated here, as clearAllStorage handles auth data.
        statusMessage =
          "Database has been reset to factory defaults. Please reload the extension if you encounter any issues.";
      } catch (error) {
        console.error("Failed to reset database:", error);
        statusMessage = `Error resetting database: ${error instanceof Error ? error.message : String(error)}`;
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
      <span class="tooltip"
        >?
        <span class="tooltiptext"
          >A unique identifier for your installation. Used for potential future
          features like data synchronization or sharing. This ID is set upon
          first login.</span
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
      <button
        onclick={handleResetDatabase}
        disabled={isLoading}
        style="background-color: #d9534f; color: #fff; border-color: #d43f3a;"
        title="DANGER: Resets the entire database to its initial empty state (irreversible!)"
      >
        {isLoading && statusMessage?.startsWith("Resetting database")
          ? "Resetting DB..."
          : "Reset Database (DANGER)"}
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
    --text-color: #e0e0e0; /* Light grey for contrast / Off-White */

    /* Updated based on visualstyle.md */
    --border-color: var(--secondary-color); /* Silver Grey for borders */
    --input-bg: #4b4b4b; /* Dark Grey for inactive blocks (sections) */

    /* Kept specific dark theme values, not directly from visualstyle.md but fit theme */
    --button-bg: #2c2c2c; /* Dark grey for button backgrounds */
    --button-hover-bg: #3a3a3a; /* Lighter grey for button hover */
    --status-bg: #1a1a1a; /* Dark grey for status messages */
    --tooltip-bg: #2c2c2c; /* Dark grey for tooltips */

    --disabled-opacity: 0.5;
    --status-border: var(--border-color); /* Use updated border color */
    --tooltip-text: var(--text-color);

    /* Fonts from visualstyle.md */
    --font-primary: "Fira Mono", monospace;
    --font-secondary:
      "Fira Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
  }

  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: var(--font-secondary);
    background-color: var(--background-color);
  }

  :global(body) {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2em; /* Space around the main content area */
    box-sizing: border-box;
  }

  main {
    padding: 1.5em;
    /* font-family removed, will inherit --font-secondary from body */
    background-color: var(--background-color); /* Main background is black */
    color: var(--text-color);
    /* margin: 2em auto; Removed for flexbox centering */
    border-radius: 8px;
    border: 1px solid var(--border-color); /* Updated border color */
    box-shadow: 0 2px 10px rgba(126, 91, 239, 0.1); /* Subtle glow with primary color */

    /* Fullscreen and centering adjustments */
    width: 100%;
    max-width: 960px; /* Max width for content readability */
    max-height: 100%; /* Fill available space within body padding */
    overflow-y: auto; /* Allow main content to scroll if it overflows */
    box-sizing: border-box;
  }

  h1 {
    text-align: center;
    margin-bottom: 1.5em;
    color: var(--primary-color);
    font-family: var(--font-primary); /* Font from visualstyle.md */
    font-size: 2.5rem; /* Size from visualstyle.md */
  }

  section {
    margin-bottom: 2em;
    padding: 1.5em;
    border: 1px solid var(--border-color); /* Updated border color */
    border-radius: 6px;
    background-color: var(--input-bg); /* Updated background color */
  }

  h2 {
    margin-top: 0;
    margin-bottom: 1em;
    border-bottom: 1px solid var(--border-color); /* Updated border color */
    padding-bottom: 0.5em;
    color: var(--secondary-color);
    font-family: var(--font-primary); /* Font from visualstyle.md */
    font-size: 2rem; /* Size from visualstyle.md */
  }

  p {
    margin-bottom: 1em;
    line-height: 1.6;
    color: var(
      --text-color
    ); /* Updated to Off-White as per visualstyle.md body text */
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
    /* font-family will be var(--font-secondary) inherited from body/main */
  }

  .setting-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--primary-color); /* Style checkbox */
  }

  .uuid-display {
    font-family: var(--font-primary); /* Monospace font for IDs */
    background-color: var(--background-color);
    padding: 0.3em 0.6em;
    border-radius: 4px;
    border: 1px solid var(--border-color); /* Updated border color */
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
    border: 1px solid var(--border-color); /* Updated border color */
    background-color: var(--button-bg);
    color: var(--text-color);
    border-radius: 4px;
    font-size: 0.95em;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
    font-family: var(
      --font-primary
    ); /* Font from visualstyle.md for interactive elements */
  }

  button:hover:not(:disabled) {
    background-color: var(--button-hover-bg);
    border-color: var(
      --primary-color
    ); /* Highlight with primary color on hover */
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
    border: 1px solid var(--status-border); /* Uses updated --border-color via --status-border */
    text-align: center;
    font-size: 0.9em;
    color: var(--text-color);
  }

  /* Tooltip Styles */
  .tooltip {
    position: relative;
    display: inline-block;
    border: 1px solid var(--secondary-color); /* Silver Grey border */
    border-radius: 50%;
    width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    font-size: 10px;
    color: var(--secondary-color);
    cursor: help;
    margin-left: 5px;
    background-color: var(--input-bg); /* Match section background */
    font-family: var(--font-secondary); /* Ensure consistent font */
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
    bottom: 125%;
    left: 50%;
    margin-left: -110px;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.85em;
    line-height: 1.4;
    border: 1px solid var(--border-color); /* Updated border color */
    font-family: var(--font-secondary); /* Ensure consistent font */
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
