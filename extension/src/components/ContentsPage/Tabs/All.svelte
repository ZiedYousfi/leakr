<script lang="ts">
  import ContentList from '@/components/ContentList.svelte';

  import {
    getAllContenus,
    type Contenu,
  } from "@/lib/dbUtils";

  // --- State ---
  let contents = $state<Contenu[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  // --- Effect to load all contents ---
  $effect(() => {
    loadAllContents();
  });

  // --- Functions ---
  async function loadAllContents() {
    isLoading = true;
    errorMessage = null;
    try {
      // Introduce a small delay for visual feedback if needed, e.g., await new Promise(res => setTimeout(res, 50));
      const fetchedContents = getAllContenus();
      contents = fetchedContents;
    } catch (error) {
      console.error("Error loading all contents:", error);
      errorMessage = "Failed to load content list.";
      contents = [];
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="popup-body">
  <h1 class="text-lg font-semibold mb-3 text-white">All Content</h1>

  <!-- Error Message -->
  {#if errorMessage}
    <p class="text-red-500 text-sm my-2 text-center">{errorMessage}</p>
  {/if}

  <!-- Loading Indicator -->
  {#if isLoading && contents.length === 0}
    <p class="text-[#B0B0B0] text-center">Loading all content...</p>
  {/if}

  <ContentList></ContentList>
</div>

<style>
  @import "tailwindcss";

  .popup-body {
    background-color: #000000; /* Noir profond */
    min-width: 350px;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    color: #b0b0b0; /* Gris argenté */
    min-height: 300px;
    max-height: 500px;
  }
</style>
