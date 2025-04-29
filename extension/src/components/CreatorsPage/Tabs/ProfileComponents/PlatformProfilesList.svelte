<script lang="ts">
  import { identifiedCreator } from "@/lib/store";
  import { getProfilsByCreator, getPlateformes, type ProfilPlateforme, type Plateforme } from "@/lib/dbUtils";

  let profiles = $state<ProfilPlateforme[]>([]);
  let platforms = $state<Plateforme[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  // Fetch profiles and platforms when the identified creator changes
  $effect(() => {
    const creator = $identifiedCreator;
    if (creator) {
      loadPlatformDetails(creator.id);
    } else {
      profiles = [];
      platforms = [];
      errorMessage = null;
    }
  });

  async function loadPlatformDetails(creatorId: number) {
    isLoading = true;
    errorMessage = null;
    try {
      // Fetch platforms only once or if they might change
      // For simplicity here, fetching them along with profiles
      const [fetchedProfiles, fetchedPlatforms] = await Promise.all([
        getProfilsByCreator(creatorId),
        getPlateformes(), // Consider caching this if platforms rarely change
      ]);
      profiles = fetchedProfiles;
      platforms = fetchedPlatforms;
    } catch (error) {
      console.error("Error loading platform details:", error);
      errorMessage = "Failed to load platform profiles.";
      profiles = [];
      platforms = [];
    } finally {
      isLoading = false;
    }
  }

  function getPlatformName(platformId: number): string {
    const platform = platforms.find((p) => p.id === platformId);
    return platform ? platform.nom : "Unknown Platform";
  }
</script>

{#if isLoading}
  <p class="loading-text text-center p-4">Loading profiles...</p>
{:else if errorMessage}
  <p class="error-text text-red-500 text-center p-4">{errorMessage}</p>
{:else if profiles.length > 0}
  <div class="profile-list-container p-4 rounded-lg shadow">
    <h3 class="profile-list-title text-lg font-medium mb-2">Platform Profiles</h3>
    <ul class="space-y-1">
      {#each profiles as profile (profile.id)}
        <li class="profile-list-item">
          <span class="profile-platform-name font-semibold">{getPlatformName(profile.id_plateforme)}:</span>
          <a
            href={profile.lien}
            target="_blank"
            rel="noopener noreferrer"
            class="profile-link hover:underline ml-2 break-all"
            title={profile.lien}
          >
            {profile.lien}
          </a>
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <p class="no-profiles-text text-center italic p-4">No platform profiles found.</p>
{/if}

<style lang="postcss">
  @reference "tailwindcss";

  .profile-list-container {
    background-color: var(--tw-color-dark-grey, #4B4B4B);
  }

  .profile-list-title {
    color: var(--tw-color-off-white, #E0E0E0);
    font-family: var(--tw-font-mono, monospace);
  }

  .profile-list-item {
    color: var(--tw-color-silver-grey, #B0B0B0);
    font-family: var(--tw-font-sans, sans-serif);
  }

  .profile-platform-name {
    /* Use a more prominent color for the platform name if desired, e.g., off-white */
     color: var(--tw-color-off-white, #E0E0E0);
  }

  .profile-link {
    color: var(--tw-color-night-violet, #7E5BEF);
    font-family: var(--tw-font-mono, monospace);
  }

  .loading-text {
    color: var(--tw-color-silver-grey, #B0B0B0);
  }

  /* .error-text styling is handled by the text-red-500 utility class */

  .no-profiles-text {
    color: var(--tw-color-dark-grey, #4B4B4B);
  }

  .break-all {
    word-break: break-all;
  }
</style>
