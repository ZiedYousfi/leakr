<script lang="ts">
  import {
    getAllContenus,
    getContenuById,
    deleteContenu,
    updateFavoriContenu,
    type Contenu,
  } from "@/lib/dbUtils";

  // --- Props ---
  let { contentId = $bindable<number | null>(null) } = $props<{ contentId?: number | null }>();

  // --- State ---
  let contents = $state<Contenu[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  // --- Effect to load contents based on contentId ---
  $effect(() => {
    // This effect will re-run whenever contentId changes
    loadContents(contentId);
  });

  // --- Functions ---
  async function loadContents(id: number | null) {
    isLoading = true;
    errorMessage = null;
    try {
      let fetchedContents: Contenu[] = [];
      if (id !== null) {
        console.log(`Fetching content for ID: ${id}`);
        const singleContent = getContenuById(id);
        if (singleContent) {
          fetchedContents = [singleContent]; // Wrap the single item in an array
        } else {
          // Content with the specified ID not found
          fetchedContents = [];
          // Optionally set an error message or specific state
          // errorMessage = `Content with ID ${id} not found.`;
        }
      } else {
        console.log("Fetching all content");
        fetchedContents = getAllContenus();
      }
      contents = fetchedContents;
    } catch (error) {
      console.error("Error loading contents:", error);
      errorMessage = "Failed to load content list.";
      contents = [];
    } finally {
      isLoading = false;
    }
  }

  // Delete a specific content item
  async function handleDeleteContent(idToDelete: number) {
    if (!confirm("Are you sure you want to delete this content?")) return;
    isLoading = true;
    errorMessage = null;
    try {
      deleteContenu(idToDelete);
      // Refresh based on the current mode (single ID or all)
      // If we were showing a single item and deleted it, loadContents(contentId) will result in an empty list.
      await loadContents(contentId);
    } catch (error) {
      console.error("Error deleting content:", error);
      errorMessage = "Failed to delete content.";
      isLoading = false;
    }
  }

  // Toggle favorite status for a content item
  async function handleToggleFavorite(content: Contenu) {
    isLoading = true;
    errorMessage = null;
    try {
      updateFavoriContenu(content.id, !content.favori);
      // Refresh based on the current mode (single ID or all)
      await loadContents(contentId);
    } catch (error) {
      console.error("Error updating favorite status:", error);
      errorMessage = "Failed to update favorite status.";
      isLoading = false;
    }
  }

  function formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return "Invalid Date";
    }
  }
</script>

<!-- Content List -->
  <div
    class="w-full flex flex-col gap-2 max-h-80 p-2 bg-gray-800 rounded-2xl overflow-y-auto"
  >
    {#if isLoading && contents.length === 0}
      <p class="text-[#B0B0B0] text-center">Loading content...</p>
    {:else if isLoading}
       <p class="text-[#B0B0B0] text-center text-xs py-1">Refreshing...</p>
    {/if}
    {#if errorMessage}
      <p class="text-red-500 text-sm my-2 text-center">{errorMessage}</p>
    {/if}
    {#if !isLoading && contents.length === 0 && !errorMessage}
      <p class="text-[#B0B0B0] text-center">No content found{contentId ? ` for ID ${contentId}` : ''}.</p>
    {:else}
      {#each contents as content (content.id)}
        <div
          class="bg-gray-900 p-4 rounded-2xl flex justify-between items-center gap-2"
        >
          <div class="flex-grow overflow-hidden">
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#7E5BEF] hover:underline text-sm truncate block"
              title={content.url}
            >
              {content.tabname ? content.tabname : content.url}
            </a>
            <p class="text-xs text-gray-500 mt-1">
              Added: {formatDate(content.date_ajout)}
            </p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              onclick={() => handleToggleFavorite(content)}
              title={content.favori
                ? "Remove from favorites"
                : "Add to favorites"}
              class={`text-xl ${content.favori ? "text-yellow-400" : "text-[#B0B0B0] hover:text-[#7E5BEF]"}`}
              disabled={isLoading}
            >
              {content.favori ? "★" : "☆"}
            </button>
            <button
              onclick={() => handleDeleteContent(content.id)}
              title="Delete Content"
              class="text-red-500 hover:text-red-400 text-lg font-bold"
              disabled={isLoading}
            >
              &times;
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

<style>
  /* ... existing styles ... */
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

  /* Style for scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1a1a1a; /* Darker track */
    border-radius: 3px;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #555; /* Dark gray thumb */
    border-radius: 3px;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #7e5bef; /* Violet nuit on hover */
  }
</style>
