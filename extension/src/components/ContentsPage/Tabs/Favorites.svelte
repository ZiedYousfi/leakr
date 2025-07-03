<script lang="ts">
  import ContentList from "@/components/ContentList.svelte";
  import { getAllContenus, type Contenu } from "@/lib/dbUtils";

  let favoriteContentIds = $state<number[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    loadFavoriteContentIds();
  });

  function loadFavoriteContentIds() {
    isLoading = true;
    errorMessage = null;
    try {
      // Simulate loading delay if needed: await new Promise(res => setTimeout(res, 50));
      const allContents = getAllContenus();
      favoriteContentIds = allContents
        .filter((content: Contenu) => content.favori)
        .map((content: Contenu) => content.id);
    } catch (error) {
      console.error("Error loading favorite content IDs:", error);
      errorMessage = "Failed to load favorites.";
      favoriteContentIds = [];
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="popup-body-custom flex flex-col items-center gap-2 p-4">
  <h2 class="favorites-title text-lg font-semibold">Favorites</h2>

  <!-- Error Message -->
  {#if errorMessage}
    <p class="error-message text-red-500 text-sm my-2 text-center">{errorMessage}</p>
  {/if}

  <!-- Loading Indicator -->
  {#if isLoading}
    <p class="loading-text text-center">Loading favorites...</p>
  {/if}

  <!-- No Favorites Message (only show if not loading and no error) -->
  {#if !isLoading && !errorMessage && favoriteContentIds.length === 0}
    <p class="no-favorites-text text-center">You haven't added any favorites yet.</p>
  {/if}

  <!-- Content List (only show if not loading, no error, and has favorites) -->
  {#if !isLoading && !errorMessage && favoriteContentIds.length > 0}
    <ContentList contentIds={favoriteContentIds} />
  {/if}
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

  .favorites-title {
    /* H2 styles from guidelines */
    color: var(--tw-color-night-violet, #7E5BEF); /* Changed color to match "All Content" */
    font-family: var(--tw-font-mono, 'Fira Mono', monospace);
    /* text-lg is roughly 1.125rem, H2 guideline is 2rem. Adjust if needed */
    /* font-size: 2rem; */ /* Uncomment and remove text-lg if exact size is needed */
  }

  /* Removed explicit color for loading/no-favorites text, they now inherit off-white */
  /* .loading-text { ... } */
  /* .no-favorites-text { ... } */

  /* .error-message styling is handled by utility classes (text-red-500, etc.) */
</style>
