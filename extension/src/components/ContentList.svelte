<script lang="ts">
  import {
    getAllContenus,
    getContenuById,
    deleteContenu,
    updateFavoriContenu,
    getCreateurById, // Added import
    type Contenu,
  } from "@/lib/dbUtils";

  // --- Props ---
  let { contentIds = $bindable<number[] | null>(null) } = $props<{
    contentIds?: number[] | null;
  }>();

  // --- Types ---
  interface ContentWithCreatorName extends Contenu {
    creatorName?: string;
  }

  // --- State ---
  let contents = $state<ContentWithCreatorName[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  // --- Effect to load contents based on contentIds ---
  $effect(() => {
    loadContents(contentIds);
  });

  // --- Functions ---
  async function loadContents(ids: number[] | null) {
    isLoading = true;
    errorMessage = null;
    try {
      let fetchedContents: Contenu[] = [];
      if (ids !== null && ids.length > 0) {
        console.log(`Fetching content for IDs: ${ids.join(", ")}`);
        fetchedContents = ids
          .map((id) => getContenuById(id))
          .filter((content): content is Contenu => content !== null);
        if (fetchedContents.length !== ids.length) {
          console.warn("Some content IDs were not found.");
        }
      } else if (ids === null) {
        console.log("Fetching all content");
        fetchedContents = getAllContenus();
      } else {
        console.log(
          "Received empty array of IDs, fetching no specific content."
        );
        fetchedContents = [];
      }

      // Augment contents with creator names
      const augmentedContents: ContentWithCreatorName[] = fetchedContents.map(
        (content) => {
          const creator = getCreateurById(content.id_createur);
          return {
            ...content,
            creatorName: creator ? creator.nom : "Unknown Creator",
          };
        }
      );
      contents = augmentedContents;
    } catch (error) {
      console.error("Error loading contents:", error);
      errorMessage = "Failed to load content list.";
      contents = [];
    } finally {
      isLoading = false;
    }
  }

  async function handleDeleteContent(idToDelete: number) {
    if (!confirm("Are you sure you want to delete this content?")) return;
    isLoading = true;
    errorMessage = null;
    try {
      deleteContenu(idToDelete);
      await loadContents(contentIds);
    } catch (error) {
      console.error("Error deleting content:", error);
      errorMessage = "Failed to delete content.";
      isLoading = false; // Ensure loading state is reset on error
    }
    // No finally block needed here as loadContents handles its own finally
  }

  async function handleToggleFavorite(content: ContentWithCreatorName) {
    // Optimistic UI update
    const originalFavori = content.favori;
    const contentIndex = contents.findIndex((c) => c.id === content.id);
    if (contentIndex !== -1) {
      contents[contentIndex] = { ...content, favori: !originalFavori };
    }

    // No need to set isLoading for optimistic update, but maybe for background task
    // isLoading = true;
    errorMessage = null;
    try {
      updateFavoriContenu(content.id, !originalFavori);
      // Optionally reload data if optimistic update isn't sufficient or needs verification
      // await loadContents(contentIds);
    } catch (error) {
      console.error("Error updating favorite status:", error);
      errorMessage = "Failed to update favorite status.";
      // Revert optimistic update on error
      if (contentIndex !== -1) {
        contents[contentIndex] = { ...content, favori: originalFavori };
      }
      // isLoading = false; // Reset loading if it was set
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
  class="content-list-container w-full flex-1 flex-col gap-2 p-2 rounded-2xl overflow-y-auto"
>
  {#if isLoading && contents.length === 0}
    <p class="loading-text text-center">Loading content...</p>
  {:else if isLoading}
    <p class="loading-text text-center text-xs py-1">Refreshing...</p>
  {/if}
  {#if errorMessage}
    <p class="error-text text-sm my-2 text-center">{errorMessage}</p>
  {/if}
  {#if !isLoading && contents.length === 0 && !errorMessage}
    <p class="no-content-text text-center">
      No content found{contentIds && contentIds.length > 0
        ? ` for the specified IDs`
        : ""}.
    </p>
  {:else}
    {#each contents as content (content.id)}
      <div
        class="content-item p-4 rounded-2xl flex justify-between items-center gap-2 mb-2 border"
      >
        <div class="flex-grow overflow-hidden">
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            class="content-link hover:underline text-sm truncate block"
            title={content.url}
          >
            {content.tabname ? content.tabname : content.url}
          </a>
          <p class="date-text text-xs mt-1">
            Added: {formatDate(content.date_ajout)}
            {#if content.creatorName}
              <span class="creator-name-text text-xs">
                &bull; By: {content.creatorName}
              </span>
            {/if}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            onclick={() => handleToggleFavorite(content)}
            title={content.favori
              ? "Remove from favorites"
              : "Add to favorites"}
            class={`favorite-button text-xl ${content.favori ? "is-favorited" : ""}`}
            disabled={isLoading}
          >
            {content.favori ? "★" : "☆"}
          </button>
          <button
            onclick={() => handleDeleteContent(content.id)}
            title="Delete Content"
            class="delete-button text-lg font-bold"
            disabled={isLoading}
          >
            &times;
          </button>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .content-list-container {
    background-color: #1a1a1a; /* Specific color, no theme var */
    font-family: var(--tw-font-sans, "Fira Sans", Inter, sans-serif);
    /* max-height and overflow-y are handled by Tailwind classes */
  }

  .loading-text {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }

  .error-text {
    color: var(--tw-color-pale-pink, #ffb6c1);
  }

  .no-content-text {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }

  .content-item {
    background-color: #2a2a2a; /* Specific color, no theme var */
    border-color: var(--tw-color-dark-grey, #4b4b4b);
  }

  .content-link {
    color: var(--tw-color-night-violet, #7e5bef);
    font-family: var(--tw-font-mono, "Fira Mono", monospace);
  }
  /* hover:underline is handled by Tailwind utility class */

  .date-text {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }

  .creator-name-text {
    color: var(
      --tw-color-light-slate-grey,
      #a0a0b0
    ); /* Example color, adjust as needed */
    margin-left: 0.5em;
  }

  .favorite-button {
    color: var(--tw-color-silver-grey, #b0b0b0);
    transition: color 0.2s ease-in-out;
  }
  .favorite-button:hover {
    color: var(--tw-color-night-violet, #7e5bef);
  }
  .favorite-button.is-favorited {
    color: var(--tw-color-night-violet, #7e5bef);
  }
  .favorite-button:disabled,
  .delete-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .delete-button {
    color: var(--tw-color-pale-pink, #ffb6c1);
    transition: color 0.2s ease-in-out;
  }
  .delete-button:hover {
    color: var(--tw-color-night-violet, #7e5bef);
  }

  /* Style for scrollbar */
  .content-list-container::-webkit-scrollbar {
    width: 6px;
  }
  .content-list-container::-webkit-scrollbar-track {
    background: #1a1a1a; /* Specific color, no theme var */
    border-radius: 3px;
  }
  .content-list-container::-webkit-scrollbar-thumb {
    background: var(--tw-color-dark-grey, #4b4b4b);
    border-radius: 3px;
  }
  .content-list-container::-webkit-scrollbar-thumb:hover {
    background: var(--tw-color-night-violet, #7e5bef);
  }
</style>
