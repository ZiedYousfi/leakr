<script lang="ts">
  import { onMount } from "svelte";
  import {
    getCreateurs,
    deleteCreateur as deleteCreateurDb,
    type Createur,
  } from "@/lib/dbUtils";
  import { identifiedCreator } from "@/lib/store";

  // Define the prop for the callback function
  let { onCreatorSelected = () => {} }: { onCreatorSelected?: () => void } =
    $props();

  let creators: Createur[] = $state<Createur[]>([]);
  let isLoading = $state<boolean>(true);
  let error: string | null = $state<string | null>(null);
  let searchTerm = $state<string>("");

  let filteredCreators = $state<Createur[]>([]);

  $effect(() => {
    if (!searchTerm.trim()) {
      filteredCreators = creators;
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filteredCreators = creators.filter(
        (creator) =>
          creator.nom.toLowerCase().includes(lowerSearchTerm) ||
          (creator.aliases &&
            creator.aliases.some((alias) =>
              alias.toLowerCase().includes(lowerSearchTerm)
            ))
      );
    }
  });

  onMount(async () => {
    try {
      creators = getCreateurs();
    } catch (err) {
      console.error("Error fetching creators:", err);
      error = "Failed to load creators.";
    } finally {
      isLoading = false;
    }
  });

  function selectCreator(creator: Createur) {
    identifiedCreator.set(creator);
    console.log("Selected creator:", creator.nom);
    onCreatorSelected();
  }

  function handleDeleteCreator(creatorId: number, creatorName: string) {
    if (
      confirm(
        `Are you sure you want to delete "${creatorName}" and all associated content and links? This action cannot be undone.`
      )
    ) {
      try {
        deleteCreateurDb(creatorId);
        creators = getCreateurs(); // Refresh the list

        const currentIdentified = $identifiedCreator;
        if (currentIdentified && currentIdentified.id === creatorId) {
          identifiedCreator.set(null);
        }
        console.log(
          `Creator ${creatorName} (ID: ${creatorId}) deleted successfully.`
        );
        error = null; // Clear any previous error
      } catch (err) {
        console.error(
          `Error deleting creator ${creatorName} (ID: ${creatorId}):`,
          err
        );
        const errorMessage = err instanceof Error ? err.message : String(err);
        error = `Failed to delete ${creatorName}. Error: ${errorMessage}`;
      }
    }
  }

  // Helper function to get profile picture URL, assuming Createur might have it
  function getProfilePictureUrl(creator: Createur): string {
    // Assuming 'profilePictureUrl' is a potential field in Createur type
    // This is a common pattern, adjust if your Createur type uses a different field name
    return (creator as any).profilePictureUrl || "/icons/default-avatar.png";
  }
</script>

<div class="p-4 creator-list-container max-w-[550px] mx-auto">
  <h1 class="text-xl mb-4 creator-list-title text-center">Creators List</h1>

  <div class="mb-4">
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Search creators..."
      class="w-full p-2 rounded search-input"
    />
  </div>

  {#if isLoading}
    <p class="loading-message">Loading creators...</p>
  {:else if error}
    <p class="error-message">{error}</p>
  {:else if creators.length === 0}
    <p class="no-creators-message">
      No creators found. Add one to get started!
    </p>
  {:else if filteredCreators.length === 0 && searchTerm.trim() !== ""}
    <p class="no-creators-message">
      No creators match your search for "{searchTerm}".
    </p>
  {:else if filteredCreators.length === 0}
    <p class="no-creators-message">No creators found.</p>
  {:else}
    <ul class="space-y-2 creator-list w-full">
      {#each filteredCreators as creator (creator.id)}
        <li class="creator-list-item p-2 rounded flex items-center w-full">
          <div
            role="button"
            tabindex="0"
            onkeypress={(e) => e.key === "Enter" && selectCreator(creator)}
            onclick={() => selectCreator(creator)}
            class="flex-grow flex items-center gap-3 cursor-pointer focus:outline-none item-selectable-area rounded"
          >
            <img
              src={getProfilePictureUrl(creator)}
              alt="{creator.nom}'s profile picture"
              class="creator-profile-pic w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div class="flex-grow min-w-0">
              <span class="creator-name-text truncate block">{creator.nom}</span
              >
              {#if creator.favori}
                <span class="ml-1">⭐</span>
              {/if}
              {#if creator.aliases && creator.aliases.length > 0}
                <span class="text-xs ml-0 mt-1 creator-aliases truncate block">
                  ({creator.aliases.join(", ")})
                </span>
              {/if}
            </div>
          </div>
          <button
            onclick={() => handleDeleteCreator(creator.id, creator.nom)}
            class="ml-3 p-1 rounded delete-creator-btn flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-creator-item-bg focus:ring-night-violet"
            title={`Delete ${creator.nom}`}
            aria-label={`Delete ${creator.nom}`}
          >
            <svg
              class="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .creator-list-container {
    /* Assuming parent provides dark background as per style guide */
    /* background-color: var(--tw-color-deep-black, #000000); */
  }

  .search-input {
    background-color: var(--creator-item-bg, #2a2a2a);
    color: var(--tw-color-off-white, #e0e0e0);
    border: 1px solid var(--tw-color-dark-grey, #4b4b4b);
    font-family: var(--tw-font-sans, "Fira Sans", Inter, sans-serif);
  }
  .search-input::placeholder {
    color: var(--tw-color-silver-grey, #b0b0b0);
  }
  .search-input:focus {
    outline: none;
    border-color: var(--tw-color-night-violet, #7e5bef);
    box-shadow: 0 0 0 2px var(--tw-color-night-violet, #7e5bef);
  }

  .creator-list-title {
    font-family: var(--tw-font-mono, "Fira Mono", monospace);
    color: var(--tw-color-night-violet, #7e5bef);
    font-weight: 600; /* Replicating font-semibold */
  }

  .loading-message,
  .no-creators-message {
    font-family: var(--tw-font-sans, "Fira Sans", Inter, sans-serif);
    color: var(--tw-color-off-white, #e0e0e0);
  }

  .error-message {
    font-family: var(--tw-font-sans, "Fira Sans", Inter, sans-serif);
    /* Using Pale Pink from style guide for errors */
    color: var(--tw-color-pale-pink, #ffb6c1);
  }

  .creator-list {
    /* Styles for the list itself if needed */
  }

  .creator-list-item {
    font-family: var(--tw-font-sans, "Fira Sans", Inter, sans-serif);
    background-color: var(--creator-item-bg, #2a2a2a);
    border: 1px solid var(--tw-color-dark-grey, #4b4b4b);
    /* p-2, rounded, flex, items-center, justify-between are Tailwind classes on the element */
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .creator-list-item:hover {
    background-color: var(--tw-color-dark-grey, #4b4b4b);
    border-color: var(--tw-color-night-violet, #7e5bef);
    /* Adding pulse-glow animation on hover as per style guide */
    /* Note: Ensure pulse-glow is defined correctly in tailwind.config.mjs */
    animation: var(--tw-animation-pulse-glow, pulse-glow 2s infinite alternate);
  }

  .item-selectable-area {
    /* Inherits text color from .creator-list-item by default */
  }

  .item-selectable-area:focus {
    /* Using Night Violet for focus ring */
    box-shadow: 0 0 0 2px var(--tw-color-night-violet, #7e5bef);
    /* outline: none; is already handled by focus:outline-none class */
  }

  .creator-name-text {
    color: var(--tw-color-off-white, #e0e0e0);
  }

  .delete-creator-btn {
    color: var(--tw-color-pale-pink, #ffb6c1);
    transition: color 0.2s ease-in-out;
    /* Tailwind classes handle focus ring (focus:ring-2 focus:ring-night-violet) */
    /* Ensure focus:ring-offset-creator-item-bg uses a CSS variable for the offset color if needed */
    --creator-item-bg-for-offset: var(
      --creator-item-bg,
      #2a2a2a
    ); /* Define for focus offset */
  }

  .delete-creator-btn:hover {
    color: var(--tw-color-night-violet, #7e5bef);
    /* Removed background-color change to match ContentList delete button behavior */
  }

  .creator-profile-pic {
    border: 2px solid var(--tw-color-dark-grey, #4b4b4b);
    /* Tailwind classes w-10 h-10 rounded-full object-cover handle sizing and shape */
  }

  .creator-list-item:hover .creator-profile-pic {
    /* Adjusted selector for hover effect */
    border-color: var(--tw-color-night-violet, #7e5bef);
  }

  .creator-aliases {
    font-family: var(--tw-font-sans, "Fira Sans", Inter, sans-serif);
    /* Using Silver Grey for secondary text */
    color: var(--tw-color-silver-grey, #b0b0b0);
  }
</style>
