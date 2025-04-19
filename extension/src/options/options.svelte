<script lang="ts">
    import { exportDatabase } from '../lib/dbUtils';

    async function handleExport() {
        try {
            await exportDatabase();
            // Optionally show a success message to the user
            console.log("Database export initiated.");
        } catch (error) {
            console.error("Failed to export database:", error);
            // Optionally show an error message to the user
        }
    }
</script>

<main>
    <h1>Leakr Options</h1>
    <button onclick={handleExport}>Export Database</button>
    <!-- Add other options UI elements here -->
</main>

<style>
    main {
        padding: 1em;
    }
    button {
        margin-top: 1em;
        padding: 0.5em 1em;
        cursor: pointer;
    }
</style>
