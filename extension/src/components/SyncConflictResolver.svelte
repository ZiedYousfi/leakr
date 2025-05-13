<script lang="ts">
  import {
    syncState,
    type ConflictData,
    type ParsedDbInfo,
  } from "../lib/syncStore";
  import {
    resolveConflictWithLocal,
    resolveConflictWithRemote,
    triggerSync,
  } from "../lib/syncUtils";

  let conflictData: ConflictData | undefined;
  let localDb: ParsedDbInfo | undefined;
  let remoteDbs: ParsedDbInfo[] = [];

  syncState.subscribe((value) => {
    conflictData = value.conflictData;
    if (conflictData) {
      localDb = conflictData.local;
      remoteDbs = conflictData.remotes;
    }
  });

  function formatDate(dateObj: Date | string | undefined): string {
    if (!dateObj) return "N/A";
    const date = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString();
  }

  async function handleSelectRemote(db: ParsedDbInfo) {
    if (
      confirm(
        `Are you sure you want to replace your local database with the remote version from ${formatDate(db.dateObject)} (Iteration ${db.iteration})?`
      )
    ) {
      await resolveConflictWithRemote(db);
    }
  }

  function handleSelectLocal() {
    if (
      confirm(
        "Are you sure you want to keep your current local database and ignore remote versions?"
      )
    ) {
      resolveConflictWithLocal();
    }
  }

  function handleRetrySync() {
    triggerSync();
  }
</script>

<div class="conflict-resolver-container">
  <div class="header">
    <svg
      class="logo-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      ><path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
      /></svg
    >
    <h1>Database Sync Conflict</h1>
  </div>
  <p class="description">
    We found a discrepancy between your local database and the version(s) stored
    on the server. Please choose which version you'd like to keep.
  </p>

  {#if localDb}
    <div class="version-card local-card">
      <h2>Your Local Database</h2>
      <p><strong>Last Updated:</strong> {formatDate(localDb.dateObject)}</p>
      <p><strong>Iteration:</strong> {localDb.iteration}</p>
      <p><strong>File:</strong> {localDb.fullName}</p>
      <button class="btn btn-secondary pulse-glow" on:click={handleSelectLocal}>
        Keep This Local Version
      </button>
    </div>
  {:else}
    <div class="version-card no-local-card">
      <h2>No Local Database Found</h2>
      <p>
        You don't have a local database. You can choose one of the remote
        versions to start with.
      </p>
    </div>
  {/if}

  {#if remoteDbs && remoteDbs.length > 0}
    <h2 class="remote-title">Available Remote Versions:</h2>
    {#each remoteDbs as remoteDb, i}
      <div class="version-card remote-card">
        <h3>Remote Version {i + 1}</h3>
        <p><strong>Last Updated:</strong> {formatDate(remoteDb.dateObject)}</p>
        <p><strong>Iteration:</strong> {remoteDb.iteration}</p>
        <p><strong>File:</strong> {remoteDb.fullName}</p>
        {#if remoteDb.size}
          <p><strong>Size:</strong> {(remoteDb.size / 1024).toFixed(2)} KB</p>
        {/if}
        <button
          class="btn btn-primary pulse-glow"
          on:click={() => handleSelectRemote(remoteDb)}
        >
          Use This Remote Version
        </button>
      </div>
    {/each}
  {:else}
    <p>No remote versions available to choose from.</p>
  {/if}

  <div class="actions">
    <button class="btn btn-link pulse-glow" on:click={handleRetrySync}
      >Re-check for Updates</button
    >
  </div>
</div>

<style>
  .conflict-resolver-container {
    background-color: #000000; /* Deep Black */
    color: #e0e0e0; /* Off-White */
    padding: 20px;
    font-family: "Fira Sans", sans-serif;
    min-width: 350px;
    max-width: 500px;
    margin: auto;
  }

  .header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  }

  .logo-icon {
    width: 2rem;
    height: 2rem;
    margin-right: 10px;
    color: #7e5bef; /* Night Violet */
  }

  .header h1 {
    font-family: "Fira Mono", monospace;
    color: #7e5bef; /* Night Violet */
    font-size: 1.8rem; /* Adjusted from H1 2.5rem for popup */
    margin: 0;
  }

  .description {
    font-size: 0.9rem;
    color: #b0b0b0; /* Silver Grey */
    margin-bottom: 20px;
    line-height: 1.4;
  }

  .version-card {
    background-color: #1a1a1a; /* Darker than Dark Grey, but not pure black */
    border: 1px solid #4b4b4b; /* Dark Grey */
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .version-card.no-local-card {
    text-align: center;
    padding: 20px;
  }

  .version-card h2,
  .version-card h3 {
    font-family: "Fira Mono", monospace;
    color: #b0b0b0; /* Silver Grey */
    font-size: 1.2rem;
    margin-top: 0;
    margin-bottom: 10px;
  }
  .local-card h2 {
    color: #7e5bef; /* Night Violet for emphasis */
  }
  .remote-title {
    font-family: "Fira Mono", monospace;
    color: #b0b0b0; /* Silver Grey */
    font-size: 1.3rem;
    margin-top: 20px;
    margin-bottom: 10px;
    border-bottom: 1px solid #4b4b4b;
    padding-bottom: 5px;
  }

  .version-card p {
    font-size: 0.85rem;
    margin: 5px 0;
    word-break: break-all; /* For long filenames */
  }

  .btn {
    font-family: "Fira Mono", monospace;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease-in-out;
    margin-top: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-primary {
    background-color: transparent;
    border: 1px solid #7e5bef; /* Night Violet */
    color: #7e5bef;
  }
  .btn-primary:hover {
    background-color: #7e5bef;
    color: #ffffff;
    box-shadow: 0 0 15px #7e5bef;
  }

  .btn-secondary {
    background-color: transparent;
    border: 1px solid #b0b0b0; /* Silver Grey */
    color: #b0b0b0;
  }
  .btn-secondary:hover {
    background-color: #b0b0b0;
    color: #000000;
    box-shadow: 0 0 15px #b0b0b0;
  }

  .btn-link {
    background-color: transparent;
    border: none;
    color: #00ffff; /* Neon Blue */
    text-decoration: underline;
    padding: 5px;
  }
  .btn-link:hover {
    color: #ffffff;
    text-shadow: 0 0 10px #00ffff;
  }

  .actions {
    margin-top: 20px;
    text-align: center;
  }

  /* Pulse Glow Animation - subtle */
  @keyframes pulse-glow-anim {
    0% {
      box-shadow: 0 0 5px rgba(126, 91, 239, 0);
    }
    50% {
      box-shadow: 0 0 10px rgba(126, 91, 239, 0.5);
    }
    100% {
      box-shadow: 0 0 5px rgba(126, 91, 239, 0);
    }
  }
  .pulse-glow:hover {
    /* General hover glow, specific button colors will override base color */
    animation: pulse-glow-anim 1.5s infinite ease-in-out;
  }
  .btn-primary.pulse-glow:hover {
    box-shadow:
      0 0 8px #7e5bef,
      0 0 12px #7e5bef,
      0 0 18px #7e5bef;
  }
  .btn-secondary.pulse-glow:hover {
    box-shadow:
      0 0 8px #b0b0b0,
      0 0 12px #b0b0b0;
  }
  .btn-link.pulse-glow:hover {
    text-shadow:
      0 0 5px #00ffff,
      0 0 10px #00ffff;
  }
</style>
