<script lang="ts">
  import { identifiedCreator } from "@/lib/store";
  import { updateFavoriCreateur, type Createur } from "@/lib/dbUtils";

  // Assuming Createur type might include optional bannerUrl and profilePictureUrl
  interface CreatorWithOptionalMedia extends Createur {
    bannerUrl?: string;
    profilePictureUrl?: string;
  }

  let { creator }: { creator: CreatorWithOptionalMedia } = $props();
  let isTogglingFavorite = $state(false);
  let toggleError = $state<string | null>(null);

  // Function to format date
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

    try {
      await updateFavoriCreateur(creator.id, !originalFavStatus);
      // Success
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toggleError = "Failed to update favorite status.";
      // Revert optimistic update on error
      identifiedCreator.update(c => c ? { ...c, favori: originalFavStatus } : null);
    } finally {
      isTogglingFavorite = false;
    }
  }
</script>

<div class="creator-header rounded-lg shadow overflow-hidden">
  <!-- Banner -->
  <div class="profile-banner h-24">
    {#if creator.bannerUrl}
      <img
        src={creator.bannerUrl}
        alt="{creator.nom}'s banner"
        class="w-full h-full object-cover"
      />
    {:else}
      <!-- Placeholder background applied via CSS -->
    {/if}
  </div>

  <div class="relative p-4">
    <!-- Profile Picture -->
    <div class="absolute -top-12 left-4">
      <img
        src={creator.profilePictureUrl || '/icons/default-avatar.png'}
        alt="{creator.nom}'s profile picture"
        class="profile-picture w-20 h-20 rounded-full border-4 object-cover"
      />
    </div>

    <!-- Content Area -->
    <div class="mt-8"> <!-- Adjust spacing based on avatar size -->
      <div class="flex justify-between items-start mb-2">
        <div>
          <h2 class="creator-name text-xl font-semibold">{creator.nom}</h2>
          {#if creator.aliases && creator.aliases.length > 0}
            <p class="creator-aliases text-sm mt-1">
              Aliases: {creator.aliases.join(", ")}
            </p>
          {/if}
        </div>
        <button
          onclick={toggleFavorite}
          title={creator.favori ? "Remove from favorites" : "Add to favorites"}
          class:is-favorite={creator.favori}
          class="favorite-button text-2xl transition"
          disabled={isTogglingFavorite}
        >
          {creator.favori ? "★" : "☆"}
        </button>
      </div>

      <p class="added-date text-xs mt-1">
        Added: {formatDate(creator.date_ajout)}
      </p>
      {#if toggleError}
        <p class="error-message text-xs mt-1">{toggleError}</p>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .creator-header {
    background-color: var(--tw-color-deep-black, #111827); /* Fallback to a dark gray */
  }

  .profile-banner {
    background-color: var(--tw-color-dark-grey, #4B4B4B); /* Placeholder color */
    /* Add background image styles here if needed */
  }

  .profile-picture {
    border-color: var(--tw-color-night-violet, #7E5BEF);
    background-color: var(--tw-color-dark-grey, #4B4B4B); /* BG for transparent images */
  }

  .creator-name {
    color: var(--tw-color-off-white, #E0E0E0);
    font-family: var(--tw-font-mono, 'Fira Mono', monospace);
  }

  .creator-aliases {
    color: var(--tw-color-silver-grey, #B0B0B0);
    font-family: var(--tw-font-sans, 'Fira Sans', sans-serif);
  }

  .added-date {
    color: var(--tw-color-silver-grey, #B0B0B0);
    font-family: var(--tw-font-sans, 'Fira Sans', sans-serif);
  }

  .favorite-button {
    color: var(--tw-color-silver-grey, #B0B0B0);
  }

  .favorite-button.is-favorite {
    color: var(--tw-color-night-violet, #7E5BEF);
  }

  .favorite-button:not(.is-favorite):hover {
    color: var(--tw-color-night-violet, #7E5BEF);
  }

  .favorite-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    /* Using Pale Pink for subtle details/notifications as per guide */
    color: var(--tw-color-pale-pink, #FFB6C1);
    font-family: var(--tw-font-sans, 'Fira Sans', sans-serif);
  }
</style>
