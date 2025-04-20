<script lang="ts">
    import { downloadDatabaseExport/*, importDatabase */ } from '../lib/dbUtils'; // Assuming importDatabase will be added to dbUtils
    import { onMount } from 'svelte';

    let statusMessage: string | null = null;
    let isLoading = false;
    let fileInput: HTMLInputElement;

    async function handleExport() {
        isLoading = true;
        statusMessage = "Exporting database...";
        try {
            // Use the function that triggers the download
            await downloadDatabaseExport();
            statusMessage = "Database export initiated successfully.";
            console.log("Database export initiated.");
        } catch (error) {
            console.error("Failed to export database:", error);
            statusMessage = `Error exporting database: ${error instanceof Error ? error.message : String(error)}`;
        } finally {
            isLoading = false;
            // Optionally clear the message after a delay
            setTimeout(() => statusMessage = null, 5000);
        }
    }

    function triggerImport() {
        fileInput?.click(); // Trigger the hidden file input
    }

    async function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            statusMessage = "No file selected.";
            setTimeout(() => statusMessage = null, 3000);
            return;
        }

        const file = input.files[0];
        if (!file.name.endsWith('.sqlite') && !file.name.endsWith('.db')) {
             statusMessage = "Please select a valid .sqlite or .db file.";
             setTimeout(() => statusMessage = null, 5000);
             input.value = ''; // Reset file input
             return;
        }


        isLoading = true;
        statusMessage = `Importing ${file.name}...`;

        try {
            // const arrayBuffer = await file.arrayBuffer();
            // const data = new Uint8Array(arrayBuffer);
            // // TODO: Implement importDatabase in dbUtils.ts
            // // This function should handle replacing the current DB, saving, and potentially re-initializing state.
            // // await importDatabase(data);
            // statusMessage = `Database "${file.name}" imported successfully. Please reload the extension if necessary.`;
            // console.log("Database import successful.");
            // // You might need to signal other parts of the extension (like background script) to re-initialize the DB connection.
        } catch (error) {
            console.error("Failed to import database:", error);
            statusMessage = `Error importing database: ${error instanceof Error ? error.message : String(error)}`;
        } finally {
            isLoading = false;
            input.value = ''; // Reset file input so the same file can be selected again
             // Optionally clear the message after a delay
            setTimeout(() => statusMessage = null, 7000);
        }
    }

    // Ensure file input is bound after component mounts
    onMount(() => {
        // fileInput is already bound using bind:this
    });

</script>

<main>
    <h1>Leakr Options</h1>

    <section>
        <h2>Database Management</h2>
        <button on:click={handleExport} disabled={isLoading}>
            {isLoading && statusMessage?.startsWith('Exporting') ? 'Exporting...' : 'Export Database'}
        </button>
        <button on:click={triggerImport} disabled={isLoading}>
             {isLoading && statusMessage?.startsWith('Importing') ? 'Importing...' : 'Import Database'}
        </button>
        <!-- Hidden file input -->
        <input
            type="file"
            bind:this={fileInput}
            on:change={handleFileSelect}
            accept=".sqlite,.db"
            style="display: none;"
        />
        {#if statusMessage}
            <p class="status">{statusMessage}</p>
        {/if}
    </section>

    <!-- Add other options UI elements here -->
</main>

<style>
    main {
        padding: 1em;
        font-family: sans-serif;
    }
    section {
        margin-bottom: 2em;
        padding: 1em;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
    h1, h2 {
        margin-bottom: 0.5em;
    }
    button {
        margin-top: 1em;
        margin-right: 0.5em;
        padding: 0.5em 1em;
        cursor: pointer;
        border: 1px solid #ccc;
        background-color: #f0f0f0;
        border-radius: 4px;
    }
    button:hover:not(:disabled) {
        background-color: #e0e0e0;
    }
    button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
    .status {
        margin-top: 1em;
        padding: 0.5em;
        border-radius: 4px;
        background-color: #eee;
        border: 1px solid #ddd;
    }
</style>
