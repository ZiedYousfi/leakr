<script lang="ts">
  import { identifiedCreator } from "@/lib/store";
  import {
    updateFavoriCreateur,
    updateCreateurDetails,
    type Createur,
  } from "@/lib/dbUtils";

  // Assuming Createur type might include optional bannerUrl and profilePictureUrl
  interface CreatorWithOptionalMedia extends Createur {
    bannerUrl?: string;
    profilePictureUrl?: string;
  }

  let { creator }: { creator: CreatorWithOptionalMedia } = $props();
  let isTogglingFavorite = $state(false);
  let toggleError = $state<string | null>(null);

  let isEditing = $state(false);
  let editableNom = $state(creator.nom);
  let editableAliasesString = $state(creator.aliases.join(", "));
  let editError = $state<string | null>(null);

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
    identifiedCreator.update((c) =>
      c ? { ...c, favori: !originalFavStatus } : null
    );

    try {
      await updateFavoriCreateur(creator.id, !originalFavStatus);
      // Success
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toggleError = "Failed to update favorite status.";
      // Revert optimistic update on error
      identifiedCreator.update((c) =>
        c ? { ...c, favori: originalFavStatus } : null
      );
    } finally {
      isTogglingFavorite = false;
    }
  }

  function startEditing() {
    editableNom = creator.nom;
    editableAliasesString = creator.aliases.join(", ");
    isEditing = true;
    editError = null;
  }

  function cancelEdit() {
    isEditing = false;
    editError = null;
  }

  async function saveChanges() {
    if (!creator) return;
    editError = null;
    const newAliases = editableAliasesString
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    // Optimistic update
    const originalNom = creator.nom;
    const originalAliases = [...creator.aliases];

    identifiedCreator.update((c) =>
      c ? { ...c, nom: editableNom, aliases: newAliases } : null
    );
    // Also update the local creator prop for immediate UI reflection if not solely relying on store
    creator.nom = editableNom;
    creator.aliases = newAliases;

    try {
      await updateCreateurDetails(creator.id, editableNom, newAliases);
      isEditing = false;
      // identifiedCreator store is already updated optimistically
    } catch (error) {
      console.error("Error updating creator details:", error);
      editError =
        "Failed to update details. " +
        (error instanceof Error ? error.message : "Please try again.");
      // Revert optimistic update
      identifiedCreator.update((c) =>
        c ? { ...c, nom: originalNom, aliases: originalAliases } : null
      );
      creator.nom = originalNom;
      creator.aliases = originalAliases;
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
        src={creator.profilePictureUrl || "/icons/default-avatar.png"}
        alt="{creator.nom}'s profile picture"
        class="profile-picture w-20 h-20 rounded-full border-4 object-cover"
      />
    </div>

    <!-- Content Area -->
    <div class="mt-8">
      <!-- Adjust spacing based on avatar size -->
      <div class="flex justify-between items-start mb-2">
        {#if isEditing}
          <div class="flex-grow mr-2">
            <input
              type="text"
              bind:value={editableNom}
              class="input-field text-xl font-semibold w-full mb-1"
              placeholder="Creator Name"
            />
            <input
              type="text"
              bind:value={editableAliasesString}
              class="input-field text-sm w-full"
              placeholder="Aliases (comma-separated)"
            />
            {#if editError}
              <p class="error-message text-xs mt-1">{editError}</p>
            {/if}
          </div>
          <div class="flex flex-col space-y-1">
            <button onclick={saveChanges} class="edit-button text-sm"
              >Save</button
            >
            <button onclick={cancelEdit} class="edit-button-cancel text-sm"
              >Cancel</button
            >
          </div>
        {:else}
          <div>
            <h2 class="creator-name text-xl font-semibold">{creator.nom}</h2>
            {#if creator.aliases && creator.aliases.length > 0}
              <p class="creator-aliases text-sm mt-1">
                Aliases: {creator.aliases.join(", ")}
              </p>
            {/if}
          </div>
          <div class="flex items-center">
            <button
              onclick={startEditing}
              title="Edit creator details"
              class="edit-button mr-2 text-lg"
            >
              ✏️
            </button>
            <button
              onclick={toggleFavorite}
              title={creator.favori
                ? "Remove from favorites"
                : "Add to favorites"}
              class:is-favorite={creator.favori}
              class="favorite-button text-2xl transition"
              disabled={isTogglingFavorite}
            >
              {creator.favori ? "★" : "☆"}
            </button>
          </div>
        {/if}
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
    background-color: var(
      --tw-color-deep-black,
      #111827
    ); /* Fallback to a dark gray */
  }

  .profile-banner {
    background-color: var(
      --tw-color-dark-grey,
      #4b4b4b
    ); /* Placeholder color */
    /* Add background image styles here if needed */
  }

  .profile-picture {
    border-color: var(--tw-color-night-violet, #7e5bef);
    background-color: var(
      --tw-color-dark-grey,
      #4b4b4b
    ); /* BG for transparent images */
  }

  .creator-name {
    color: var(--tw-color-off-white, #e0e0e0);
    font-family: var(--tw-font-mono, "Fira Mono", monospace);
  }

  .creator-aliases {
    color: var(--tw-color-silver-grey, #b0b0b0);
    font-family: var(--tw-font-sans, "Fira Sans", sans-serif);
  }

  .added-date {
    color: var(--tw-color-silver-grey, #b0b0b0);
    font-family: var(--tw-font-sans, "Fira Sans", sans-serif);
  }

  .favorite-button {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }

  .favorite-button.is-favorite {
    color: var(--tw-color-night-violet, #7e5bef);
  }

  .favorite-button:not(.is-favorite):hover {
    color: var(--tw-color-night-violet, #7e5bef);
  }

  .favorite-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    /* Using Pale Pink for subtle details/notifications as per guide */
    color: var(--tw-color-pale-pink, #ffb6c1);
    font-family: var(--tw-font-sans, "Fira Sans", sans-serif);
  }

  .input-field {
    background-color: var(--tw-color-dark-grey, #333);
    color: var(--tw-color-off-white, #e0e0e0);
    border: 1px solid var(--tw-color-night-violet, #7e5bef);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: var(--tw-font-mono, "Fira Mono", monospace);
  }

  .input-field::placeholder {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }

  .edit-button,
  .edit-button-cancel {
    color: var(--tw-color-silver-grey, #b0b0b0);
    background-color: transparent;
    border: 1px solid var(--tw-color-silver-grey, #b0b0b0);
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .edit-button:hover {
    color: var(--tw-color-night-violet, #7e5bef);
    border-color: var(--tw-color-night-violet, #7e5bef);
  }

  .edit-button-cancel:hover {
    color: var(--tw-color-pale-pink, #ffb6c1);
    border-color: var (--tw-color-pale-pink, #ffb6c1);
  }
</style>
