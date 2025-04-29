<script lang="ts">
  import { onMount } from "svelte";
  import { getCreateurs, type Createur } from "@/lib/dbUtils";
  import { identifiedCreator } from "@/lib/store";

  // Define the prop for the callback function
  let { onCreatorSelected = () => {} }: { onCreatorSelected?: () => void } = $props();

  let creators: Createur[] = $state<Createur[]>([]);
  let isLoading = $state<boolean>(true);
  let error: string | null = $state<string | null>(null);

  onMount(async () => {
    try {
      // NOTE: Assuming getCreateurs is synchronous based on original code.
      // If it were async, it should be: creators = await getCreateurs();
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
    // Call the callback function passed from the parent
    onCreatorSelected();
  }
</script>

<div class="p-4 creator-list-container">
  <h1 class="text-xl mb-4 creator-list-title">Creators List</h1>

  {#if isLoading}
    <p class="loading-message">Loading creators...</p>
  {:else if error}
    <p class="error-message">{error}</p>
  {:else if creators.length === 0}
    <p class="no-creators-message">No creators found.</p>
  {:else}
    <ul class="space-y-2 creator-list">
      {#each creators as creator (creator.id)}
        <li class="creator-list-item">
          <button
            onclick={() => selectCreator(creator)}
            class="w-full text-left p-2 rounded focus:outline-none transition creator-button"
          >
            {creator.nom} {#if creator.favori}⭐{/if}
            {#if creator.aliases && creator.aliases.length > 0}
              <span class="text-xs ml-2 creator-aliases">
                ({creator.aliases.join(", ")})
              </span>
            {/if}
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

  .creator-list-title {
    font-family: var(--tw-font-mono, monospace);
    color: var(--tw-color-night-violet, #7E5BEF);
    font-weight: 600; /* Replicating font-semibold */
  }

  .loading-message,
  .no-creators-message {
    font-family: var(--tw-font-sans, sans-serif);
    color: var(--tw-color-off-white, #E0E0E0);
  }

  .error-message {
    font-family: var(--tw-font-sans, sans-serif);
    /* Using Pale Pink from style guide for errors */
    color: var(--tw-color-pale-pink, #FFB6C1);
  }

  .creator-list {
    /* Styles for the list itself if needed */
  }

  .creator-list-item {
    /* Styles for list items if needed */
  }

  .creator-button {
    font-family: var(--tw-font-sans, sans-serif);
    color: var(--tw-color-off-white, #E0E0E0);
  }

  .creator-button:hover {
    /* Using Dark Grey for hover background as per secondary button style */
    background-color: var(--tw-color-dark-grey, #4B4B4B);
    /* Adding pulse-glow animation on hover as per style guide */
    /* Note: Ensure pulse-glow is defined correctly in tailwind.config.mjs */
    /* animation: var(--tw-animation-pulse-glow, pulse-glow 2s infinite); */
    /* Using a simpler background color change for now */
  }

  .creator-button:focus {
    /* Using Night Violet for focus ring */
    box-shadow: 0 0 0 2px var(--tw-color-night-violet, #7E5BEF);
  }

  .creator-aliases {
    font-family: var(--tw-font-sans, sans-serif);
    /* Using Silver Grey for secondary text */
    color: var(--tw-color-silver-grey, #B0B0B0);
  }
</style>
