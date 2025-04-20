
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

<div class="p-4">
  <h1 class="text-xl font-semibold mb-4">Creators List</h1>

  {#if isLoading}
    <p>Loading creators...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else if creators.length === 0}
    <p>No creators found.</p>
  {:else}
    <ul class="space-y-2">
      {#each creators as creator (creator.id)}
        <li>
          <button
            on:click={() => selectCreator(creator)}
            class="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {creator.nom} {#if creator.favori}⭐{/if}
            {#if creator.aliases && creator.aliases.length > 0}
              <span class="text-xs text-gray-500 ml-2">
                ({creator.aliases.join(", ")})
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Add any specific styles if needed */
</style>
