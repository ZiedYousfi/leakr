<script lang="ts">
  import {
    identifiedCreator,
    identifiedCreatorContentIds, // Import the store
  } from "@/lib/store";
  import {
    getProfilsByCreator,
    getPlateformes,
    updateFavoriCreateur,
    getContenuIdsByCreator, // Import function to get content IDs
    type ProfilPlateforme,
    type Plateforme,
    type Createur,
  } from "@/lib/dbUtils";
  import ContentList from "@/components/ContentList.svelte";

  let profiles = $state<ProfilPlateforme[]>([]);
  let platforms = $state<Plateforme[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  // Fetch profiles, platforms, and content IDs when the identified creator changes
  $effect(() => {
    const creator = $identifiedCreator; // Get the current value
    if (creator) {
      loadCreatorDetails(creator.id);
    } else {
      // Reset when no creator is identified
      profiles = [];
      platforms = [];
      identifiedCreatorContentIds.set(null); // Reset content IDs
      errorMessage = null;
    }
  });

  async function loadCreatorDetails(creatorId: number) {
    isLoading = true;
    errorMessage = null;
    identifiedCreatorContentIds.set(null); // Reset content IDs before fetching
    try {
      // Fetch in parallel: profiles, platforms, and content IDs
      const [fetchedProfiles, fetchedPlatforms, fetchedContentIds] = await Promise.all([
        getProfilsByCreator(creatorId),
        getPlateformes(), // Fetch all platforms to map IDs to names
        getContenuIdsByCreator(creatorId), // Fetch content IDs
      ]);
      profiles = fetchedProfiles;
      platforms = fetchedPlatforms;
      identifiedCreatorContentIds.set(fetchedContentIds); // Update the store
    } catch (error) {
      console.error("Error loading creator details:", error);
      errorMessage = "Failed to load creator details.";
      profiles = [];
      platforms = [];
      identifiedCreatorContentIds.set(null); // Ensure reset on error
    } finally {
      isLoading = false;
    }
  }

  function getPlatformName(platformId: number): string {
    const platform = platforms.find((p) => p.id === platformId);
    return platform ? platform.nom : "Unknown Platform";
  }

  async function toggleFavorite(creator: Createur) {
     if (!creator) return;
     isLoading = true; // Indicate loading state
     try {
       const newFavStatus = !creator.favori;
       // Use await here if updateFavoriCreateur is async and you need to wait
       await updateFavoriCreateur(creator.id, newFavStatus); // Assuming it might be async
       // Optimistically update the store
       identifiedCreator.update(c => c ? { ...c, favori: newFavStatus } : null);
     } catch (error) {
        console.error("Error updating favorite status:", error);
        errorMessage = "Failed to update favorite status.";
        // Optionally revert optimistic update here if updateFavoriCreateur failed
        // identifiedCreator.update(c => c ? { ...c, favori: !newFavStatus } : null);
     } finally {
        isLoading = false;
     }
  }

  function formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  }
</script>

<div class="p-4 space-y-4 text-sm max-w-600 max-h-700 overflow-y-auto">
  {#if $identifiedCreator}
    {@const creator = $identifiedCreator}
    <div class="bg-gray-800 p-4 rounded-lg shadow">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-semibold text-white">{creator.nom}</h2>
         <button
            onclick={() => toggleFavorite(creator)}
            title={creator.favori ? "Remove from favorites" : "Add to favorites"}
            class={`text-2xl ${creator.favori ? "text-yellow-400" : "text-gray-500 hover:text-yellow-400"}`}
            disabled={isLoading}
          >
            {creator.favori ? "★" : "☆"}
          </button>
      </div>

      {#if creator.aliases && creator.aliases.length > 0}
        <p class="text-gray-400">
          Aliases: {creator.aliases.join(", ")}
        </p>
      {/if}
      <p class="text-gray-500 text-xs mt-1">
        Added: {formatDate(creator.date_ajout)}
      </p>
    </div>

    {#if isLoading && !$identifiedCreatorContentIds} <!-- Show loading only if content IDs aren't loaded yet -->
      <p class="text-gray-400 text-center">Loading details...</p>
    {:else if errorMessage}
       <p class="text-red-500 text-center">{errorMessage}</p>
    {:else}
      <!-- Platform Profiles Section -->
      {#if profiles.length > 0}
        <div class="bg-gray-800 p-4 rounded-lg shadow">
          <h3 class="text-lg font-medium text-white mb-2">Platform Profiles</h3>
          <ul class="space-y-1">
            {#each profiles as profile (profile.id)}
              <li class="text-gray-300">
                <span class="font-semibold">{getPlatformName(profile.id_plateforme)}:</span>
                <a
                  href={profile.lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-400 hover:underline ml-2 break-all"
                  title={profile.lien}
                >
                  {profile.lien}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {:else if !isLoading} <!-- Avoid showing "No profiles" while still loading -->
         <p class="text-gray-500 text-center italic">No platform profiles found.</p>
      {/if}

      <!-- Content List Section -->
      <div class="mt-4">
         <h3 class="text-lg font-medium text-white mb-2">Associated Content</h3>
         {#if $identifiedCreatorContentIds !== null && $identifiedCreatorContentIds.length > 0}
              <ContentList contentIds={$identifiedCreatorContentIds} />
         {:else if !isLoading} <!-- Avoid showing "No content" while still loading -->
              <p class="text-gray-500 text-center italic">No content associated yet.</p>
         {/if}
      </div>
    {/if}

  {:else}
    <p class="text-gray-400 text-center p-4">No creator identified.</p>
  {/if}
</div>

<style>
  /* Add any specific styles if needed, Tailwind classes are used above */
  @import "tailwindcss";

  /* Optional: Style for better readability if links get too long */
  .break-all {
     word-break: break-all;
  }
</style>
