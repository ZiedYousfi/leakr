<script lang="ts">
  import { identifiedCreator, identifiedCreatorContentIds } from "@/lib/store";
  import { getContenuIdsByCreator } from "@/lib/dbUtils";
  import ContentList from "@/components/ContentList.svelte"; // Keep this import

  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let localContentIds = $state<number[] | null>(null); // Use local state derived from store

  // Sync local state with store initially and on external changes
  $effect(() => {
    localContentIds = $identifiedCreatorContentIds;
  });

  // Fetch content IDs when the identified creator changes
  let lastLoadedCreatorId: number | null = null;

$effect(() => {
  const creator = $identifiedCreator;
  if (creator) {
    if (lastLoadedCreatorId !== creator.id) {
      loadContentIds(creator.id);
      lastLoadedCreatorId = creator.id;
    }
  } else {
    identifiedCreatorContentIds.set(null);
    localContentIds = null;
    errorMessage = null;
    lastLoadedCreatorId = null;
  }
});


  async function loadContentIds(creatorId: number) {
    // Only load if not already loaded or creator changed
    // This check might need refinement based on exact requirements
    if ($identifiedCreatorContentIds !== null && $identifiedCreator?.id === creatorId && !isLoading) {
       // Already loaded for this creator, potentially skip reload unless forced
       // localContentIds = $identifiedCreatorContentIds; // Ensure sync
       // return;
    }

    isLoading = true;
    errorMessage = null;
    identifiedCreatorContentIds.set(null); // Clear store while loading
    localContentIds = null; // Clear local state while loading

    try {
      const fetchedContentIds = await getContenuIdsByCreator(creatorId);
      identifiedCreatorContentIds.set(fetchedContentIds); // Update the store
      localContentIds = fetchedContentIds; // Update local state
    } catch (error) {
      console.error("Error loading content IDs:", error);
      errorMessage = "Failed to load associated content.";
      identifiedCreatorContentIds.set(null); // Ensure store is null on error
      localContentIds = null; // Ensure local state is null on error
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="mt-4">
  <h3 class="text-lg font-medium text-white mb-2">Associated Content</h3>
  {#if isLoading}
    <p class="text-gray-400 text-center">Loading content...</p>
  {:else if errorMessage}
    <p class="text-red-500 text-center">{errorMessage}</p>
  {:else if localContentIds !== null && localContentIds.length > 0}
    <ContentList contentIds={localContentIds} />
  {:else}
    <p class="text-gray-500 text-center italic">No content associated yet.</p>
  {/if}
</div>
