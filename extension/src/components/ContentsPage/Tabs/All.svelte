<script lang="ts">
  import ContentList from "@/components/ContentList.svelte";

  import { getAllContenus, type Contenu } from "@/lib/dbUtils";

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

<div class="popup-body-custom flex flex-col items-center gap-2 p-4">
  <h1 class="all-content-title text-lg font-semibold mb-1">All Content</h1>

  <!-- Error Message -->
  {#if errorMessage}
    <p class="error-message text-red-500 text-sm my-2 text-center">
      {errorMessage}
    </p>
  {/if}

  <!-- Loading Indicator -->
  {#if isLoading && contents.length === 0}
    <p class="loading-text text-center">Loading all content...</p>
  {/if}

  <!-- Pass content IDs to ContentList -->
  <ContentList contentIds={contents.map((c) => c.id)} />
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .popup-body-custom {
    background-color: var(--tw-color-deep-black, #000000);
    color: var(--tw-color-silver-grey, #b0b0b0); /* Default text color */
    min-width: 350px;
    max-width: 550px;
    /* min-height: 300px; removed */
    max-height: 600px;
  }

  .all-content-title {
    /* H1 styles from guidelines */
    color: var(--tw-color-night-violet, #7e5bef);
    font-family: var(--tw-font-mono, "Fira Mono", monospace);
    /* text-lg is roughly 1.125rem, H1 guideline is 2.5rem. Adjust if needed */
    /* font-size: 2.5rem; */ /* Uncomment and remove text-lg if exact size is needed */
  }

  .loading-text {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }

  /* .error-message styling is handled by utility classes (text-red-500, etc.) */

  /* Add other custom styles for elements within this component if needed */
</style>
