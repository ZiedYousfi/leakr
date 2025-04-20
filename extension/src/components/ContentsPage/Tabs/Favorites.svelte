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

<div class="flex flex-col gap-4 p-1">
  <h2 class="text-lg font-semibold text-center text-[#B0B0B0]">Favorites</h2>

  {#if isLoading}
    <p class="text-[#B0B0B0] text-center">Loading favorites...</p>
  {:else if errorMessage}
    <p class="text-red-500 text-sm my-2 text-center">{errorMessage}</p>
  {:else if favoriteContentIds.length === 0}
    <p class="text-[#B0B0B0] text-center">You haven't added any favorites yet.</p>
  {:else}
    <ContentList contentIds={favoriteContentIds} />
  {/if}
</div>
