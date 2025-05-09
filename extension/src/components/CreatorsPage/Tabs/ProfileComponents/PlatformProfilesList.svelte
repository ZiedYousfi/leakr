<script lang="ts">
  import { identifiedCreator } from "@/lib/store";
  import {
    getProfilsByCreator,
    getPlateformes,
    updateProfilPlateforme,
    deleteProfilPlateforme,
    addProfilPlateforme, // Added
    findProfilByDetails, // Added
    type ProfilPlateforme,
    type Plateforme,
  } from "@/lib/dbUtils";

  let profiles = $state<ProfilPlateforme[]>([]);
  let platforms = $state<Plateforme[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  let editingProfileId = $state<number | null>(null);
  let editingLink = $state("");
  let currentCreatorId = $state<number | null>(null);

  // State for adding a new profile
  let isAddingNewProfile = $state(false);
  let newProfilePlatformId = $state<number | null>(null);
  let newProfileLink = $state("");
  let addProfileError = $state<string | null>(null);

  // Fetch profiles and platforms when the identified creator changes
  $effect(() => {
    const creator = $identifiedCreator;
    if (creator) {
      currentCreatorId = creator.id;
      loadPlatformDetails(creator.id);
    } else {
      currentCreatorId = null;
      profiles = [];
      platforms = [];
      errorMessage = null;
      editingProfileId = null; // Reset edit state
      isAddingNewProfile = false; // Reset add state
      addProfileError = null;
    }
  });

  async function loadPlatformDetails(creatorId: number) {
    isLoading = true;
    errorMessage = null;
    addProfileError = null;
    editingProfileId = null; // Reset edit state on load
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

  function startEdit(profile: ProfilPlateforme) {
    editingProfileId = profile.id;
    editingLink = profile.lien;
  }

  function cancelEdit() {
    editingProfileId = null;
    editingLink = "";
  }

  async function saveEdit(profileId: number) {
    if (!editingLink.trim()) {
      errorMessage = "Link cannot be empty."; // Or some other validation
      return;
    }
    // Prevent saving if link hasn't changed
    const originalProfile = profiles.find((p) => p.id === profileId);
    if (originalProfile && originalProfile.lien === editingLink) {
      cancelEdit(); // Just exit edit mode, no actual save needed
      return;
    }

    isLoading = true; // Indicate activity
    errorMessage = null;
    try {
      await updateProfilPlateforme(profileId, editingLink);
      // Refresh the list to show updated data
      if (currentCreatorId) {
        await loadPlatformDetails(currentCreatorId);
      }
      editingProfileId = null; // Exit edit mode
      editingLink = "";
    } catch (error) {
      console.error("Error saving profile link:", error);
      errorMessage = "Failed to save profile link.";
    } finally {
      isLoading = false;
    }
  }

  async function handleDeleteProfile(profileId: number) {
    if (!confirm("Are you sure you want to delete this profile link?")) {
      return;
    }
    isLoading = true;
    errorMessage = null;
    addProfileError = null;
    try {
      await deleteProfilPlateforme(profileId);
      if (currentCreatorId) {
        await loadPlatformDetails(currentCreatorId); // Refresh list
      }
    } catch (error) {
      console.error("Error deleting profile link:", error);
      errorMessage = "Failed to delete profile link.";
    } finally {
      isLoading = false;
    }
  }

  function toggleAddForm() {
    isAddingNewProfile = !isAddingNewProfile;
    newProfileLink = "";
    addProfileError = null;
    if (isAddingNewProfile && platforms.length > 0) {
      newProfilePlatformId = platforms[0].id; // Default to first platform
    } else {
      newProfilePlatformId = null;
    }
    editingProfileId = null; // Ensure edit mode is off
  }

  function cancelAddNewProfile() {
    isAddingNewProfile = false;
    newProfilePlatformId = null;
    newProfileLink = "";
    addProfileError = null;
  }

  async function handleSaveNewProfile() {
    if (!currentCreatorId) {
      addProfileError = "Cannot add profile: Creator not identified.";
      return;
    }
    if (!newProfilePlatformId) {
      addProfileError = "Please select a platform.";
      return;
    }
    if (!newProfileLink.trim()) {
      addProfileError = "Link cannot be empty.";
      return;
    }

    // Check for duplicates
    try {
      const existing = findProfilByDetails(
        currentCreatorId,
        newProfilePlatformId,
        newProfileLink.trim()
      );
      if (existing) {
        addProfileError = "This profile link already exists for this platform.";
        return;
      }
    } catch (e) {
      console.error("Error checking for existing profile:", e);
      addProfileError = "Could not verify existing profiles. Please try again.";
      return;
    }

    isLoading = true;
    addProfileError = null;
    errorMessage = null;
    try {
      await addProfilPlateforme(
        newProfileLink.trim(),
        currentCreatorId,
        newProfilePlatformId
      );
      await loadPlatformDetails(currentCreatorId); // Refresh list
      cancelAddNewProfile(); // Close and reset form
    } catch (error) {
      console.error("Error adding new profile link:", error);
      addProfileError = "Failed to add new profile link.";
    } finally {
      isLoading = false;
    }
  }
</script>

{#if isLoading && !editingProfileId && !isAddingNewProfile}
  <p class="loading-text text-center p-4">Loading profiles...</p>
{:else if errorMessage}
  <p class="error-text text-red-500 text-center p-4">{errorMessage}</p>
{/if}

{#if isAddingNewProfile && identifiedCreator}
  <div class="add-profile-form-container p-4 rounded-lg shadow mb-4">
    <h4 class="profile-list-title text-md font-medium mb-3">Add New Profile</h4>
    {#if addProfileError}
      <p class="error-text text-red-500 text-center p-2 mb-2">
        {addProfileError}
      </p>
    {/if}
    <div class="space-y-3">
      <div>
        <label
          for="new-platform-select"
          class="block text-sm font-medium profile-platform-name mb-1"
          >Platform:</label
        >
        <select
          id="new-platform-select"
          bind:value={newProfilePlatformId}
          class="select-field w-full"
        >
          {#if platforms.length === 0}
            <option value={null} disabled>No platforms available</option>
          {:else}
            <option value={null} disabled selected>Select a platform</option>
            {#each platforms as platform (platform.id)}
              <option value={platform.id}>{platform.nom}</option>
            {/each}
          {/if}
        </select>
      </div>
      <div>
        <label
          for="new-profile-link"
          class="block text-sm font-medium profile-platform-name mb-1"
          >Link URL:</label
        >
        <input
          id="new-profile-link"
          type="text"
          bind:value={newProfileLink}
          class="input-field w-full rounded"
          placeholder="Enter profile link URL"
        />
      </div>
      <div class="flex justify-end space-x-2 mt-3">
        <button
          onclick={cancelAddNewProfile}
          class="btn btn-secondary"
          disabled={isLoading}>Cancel</button
        >
        <button
          onclick={handleSaveNewProfile}
          class="btn btn-primary"
          disabled={isLoading}
        >
          {#if isLoading}Saving...{:else}Save Profile{/if}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if !isAddingNewProfile && profiles.length > 0}
  <div class="profile-list-container p-4 rounded-lg shadow">
    <h3 class="profile-list-title text-lg font-medium mb-2">
      Platform Profiles
    </h3>
    <ul class="space-y-2">
      {#each profiles as profile (profile.id)}
        <li class="profile-list-item flex items-center justify-between">
          {#if editingProfileId === profile.id}
            <div class="flex-grow flex items-center">
              <span class="profile-platform-name font-semibold"
                >{getPlatformName(profile.id_plateforme)}:</span
              >
              <input
                type="text"
                bind:value={editingLink}
                class="input-field ml-2 rounded flex-grow"
                placeholder="Enter link"
              />
            </div>
            <div class="ml-2 flex-shrink-0">
              <button
                onclick={() => saveEdit(profile.id)}
                class="btn btn-primary"
                disabled={isLoading}
              >
                {#if isLoading}Saving...{:else}Save{/if}
              </button>
              <button
                onclick={cancelEdit}
                class="text-xs bg-gray-500 hover:bg-gray-600 text-white py-1 px-2 rounded"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          {:else}
            <div class="flex-grow">
              <span class="profile-platform-name font-semibold"
                >{getPlatformName(profile.id_plateforme)}:</span
              >
              <a
                href={profile.lien}
                target="_blank"
                rel="noopener noreferrer"
                class="profile-link hover:underline ml-2 break-all"
                title={profile.lien}
              >
                {profile.lien}
              </a>
            </div>
            <div class="ml-2 flex-shrink-0 space-x-1">
              <button
                onclick={() => startEdit(profile)}
                class="btn btn-primary"
                disabled={isLoading}
              >
                Edit
              </button>
              <button
                onclick={() => handleDeleteProfile(profile.id)}
                class="btn btn-secondary btn-delete"
                disabled={isLoading}
              >
                Delete
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{:else if !isAddingNewProfile}
  <p class="no-profiles-text text-center italic p-4">
    No platform profiles found.
  </p>
{/if}

{#if !isAddingNewProfile && !editingProfileId && identifiedCreator}
  <div class="my-4 flex justify-center">
    <button onclick={toggleAddForm} class="btn btn-secondary">
      Add New Profile Link
    </button>
  </div>
{/if}

<style lang="postcss">
  @reference "tailwindcss";

  .profile-list-container {
    background-color: var(--tw-color-dark-grey, #4b4b4b);
  }
  .add-profile-form-container {
    background-color: var(
      --tw-color-dark-grey,
      #4b4b4b
    ); /* Consistent with list container */
    border: 1px solid var(--tw-color-silver-grey, #5a5a5a); /* Subtle border */
  }

  .profile-list-title {
    color: var(--tw-color-off-white, #e0e0e0);
    font-family: var(--tw-font-mono, monospace);
  }

  .profile-list-item {
    color: var(--tw-color-silver-grey, #b0b0b0);
    font-family: var(--tw-font-sans, sans-serif);
    /* Added for flex layout */
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .profile-platform-name {
    /* Use a more prominent color for the platform name if desired, e.g., off-white */
    color: var(--tw-color-off-white, #e0e0e0);
  }

  .profile-link {
    color: var(--tw-color-night-violet, #7e5bef);
    font-family: var(--tw-font-mono, monospace);
  }

  .loading-text {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }

  /* .error-text styling is handled by the text-red-500 utility class */

  .no-profiles-text {
    color: var(--tw-color-dark-grey, #4b4b4b);
  }

  .break-all {
    word-break: break-all;
  }

  .input-field {
    background-color: var(
      --tw-color-deep-black,
      #1a1a1a
    ); /* Darker than container, not pure black */
    border: 1px solid var(--tw-color-silver-grey, #b0b0b0);
    color: var(--tw-color-off-white, #e0e0e0);
    font-family: var(--tw-font-sans, "Fira Sans", sans-serif);
    padding: 0.25rem 0.5rem; /* Equivalent to p-1 px-2 */
  }
  .input-field:focus {
    border-color: var(--tw-color-night-violet, #7e5bef);
    outline: none;
    box-shadow: 0 0 0 2px
      var(--tw-color-night-violet-alpha, rgba(126, 91, 239, 0.5));
  }

  .select-field {
    background-color: var(--tw-color-deep-black, #1a1a1a);
    border: 1px solid var(--tw-color-silver-grey, #b0b0b0);
    color: var(--tw-color-off-white, #e0e0e0);
    font-family: var(--tw-font-sans, "Fira Sans", sans-serif);
    padding: 0.375rem 0.5rem; /* Slightly more padding for select */
    border-radius: 0.25rem; /* rounded */
    line-height: 1.25; /* Ensure text is vertically centered */
  }
  .select-field:focus {
    border-color: var(--tw-color-night-violet, #7e5bef);
    outline: none;
    box-shadow: 0 0 0 2px
      var(--tw-color-night-violet-alpha, rgba(126, 91, 239, 0.5));
  }
  /* Basic styling for select arrow for dark themes, might need more specific targeting if not working */
  .select-field {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23B0B0B0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 1.2em;
    padding-right: 2.5rem; /* Make space for the arrow */
  }

  .btn {
    font-family: var(
      --tw-font-mono,
      "Fira Mono",
      monospace
    ); /* Links font for buttons */
    padding: 0.25rem 0.75rem; /* text-xs py-1 px-2 equivalent, slightly more padding for px */
    border-radius: 0.25rem; /* rounded */
    font-size: 0.75rem; /* text-xs */
    line-height: 1rem;
    transition:
      background-color 0.2s ease-in-out,
      color 0.2s ease-in-out,
      border-color 0.2s ease-in-out;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    border: 1px solid var(--tw-color-night-violet, #7e5bef);
    color: var(--tw-color-off-white, #e0e0e0);
    background-color: transparent;
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--tw-color-night-violet, #7e5bef);
    color: var(
      --tw-color-deep-black,
      #000000
    ); /* Text color on hover for contrast */
  }
  .btn-primary:focus:not(:disabled) {
    outline: none;
    box-shadow: 0 0 0 2px
      var(--tw-color-night-violet-alpha, rgba(126, 91, 239, 0.5));
  }

  .btn-secondary {
    border: 1px solid var(--tw-color-silver-grey, #b0b0b0);
    color: var(--tw-color-silver-grey, #b0b0b0);
    background-color: transparent;
  }
  .btn-secondary:hover:not(:disabled) {
    background-color: var(
      --tw-color-dark-grey,
      #333333
    ); /* Darker grey for hover */
    border-color: var(
      --tw-color-silver-grey,
      #999999
    ); /* Slightly lighter border on hover */
    color: var(--tw-color-off-white, #e0e0e0);
  }
  .btn-secondary:focus:not(:disabled) {
    outline: none;
    box-shadow: 0 0 0 2px
      var(--tw-color-silver-grey-alpha, rgba(176, 176, 176, 0.5));
  }

  /* Specific for delete if we want a slightly different feel, e.g. more subtle or warning */
  .btn-delete:hover:not(:disabled) {
    /* background-color: var(--tw-color-pale-pink, #FFB6C1); */ /* Example if using Pale Pink for warning */
    /* color: var(--tw-color-deep-black, #000000); */
    /* border-color: var(--tw-color-pale-pink, #FFB6C1); */
    /* For now, keep it same as secondary, can be adjusted */
    background-color: var(--tw-color-dark-grey, #333333);
    color: var(
      --tw-color-pale-pink,
      #ffb6c1
    ); /* Hint of pink on text for warning */
  }
</style>
