<script lang="ts">
  import { identifiedCreator } from "@/lib/store";
  import { updateFavoriCreateur, type Createur } from "@/lib/dbUtils";

  let { creator }: { creator: Createur } = $props();
  let isTogglingFavorite = $state(false);
  let toggleError = $state<string | null>(null);

  // Function to format date (moved here or could be in a shared utils file)
  function formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  }

  // Function to toggle favorite status
  async function toggleFavorite() {
    if (!creator) return;
    isTogglingFavorite = true;
    toggleError = null;
    const originalFavStatus = creator.favori;

    // Optimistic update in the store
    identifiedCreator.update(c => c ? { ...c, favori: !originalFavStatus } : null);
    // Ensure the prop reflects the change if needed immediately, though store update should trigger reactivity
    // creator = { ...creator, favori: !originalFavStatus }; // This might not be needed if parent passes reactive store value

    try {
      await updateFavoriCreateur(creator.id, !originalFavStatus);
      // Success
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toggleError = "Failed to update favorite status.";
      // Revert optimistic update on error
      identifiedCreator.update(c => c ? { ...c, favori: originalFavStatus } : null);
      // Revert local state if needed
      // creator = { ...creator, favori: originalFavStatus };
    } finally {
      isTogglingFavorite = false;
    }
  }
</script>

<div class="bg-gray-800 p-4 rounded-lg shadow">
  <div class="flex justify-between items-center mb-2">
    <h2 class="text-xl font-semibold text-white">{creator.nom}</h2>
    <button
      onclick={toggleFavorite}
      title={creator.favori ? "Remove from favorites" : "Add to favorites"}
      class={`text-2xl ${creator.favori ? "text-yellow-400" : "text-gray-500 hover:text-yellow-400"} ${isTogglingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={isTogglingFavorite}
    >
      {creator.favori ? "★" : "☆"}
    </button>
  </div>

  {#if creator.aliases && creator.aliases.length > 0}
    <p class="text-gray-400">Aliases: {creator.aliases.join(", ")}</p>
  {/if}
  <p class="text-gray-500 text-xs mt-1">
    Added: {formatDate(creator.date_ajout)}
  </p>
  {#if toggleError}
    <p class="text-red-500 text-xs mt-1">{toggleError}</p>
  {/if}
</div>
