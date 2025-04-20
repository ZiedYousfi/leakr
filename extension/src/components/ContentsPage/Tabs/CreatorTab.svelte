<script lang="ts">
  import {
    addContenu,
    getContenusByCreator,
    findCreatorByUsername,
    addCreateur,
    getContenuIdsByCreator, // Needed for refresh after add
  } from "@/lib/dbUtils";
  import { fetchCreatorAndContentIds } from "@/lib/creatorFinder";
  import {
    creatorIdentifier,
    identifiedCreator,
    identifiedCreatorContentIds,
    potentialUsernameToCreate,
    creatorOperationError,
    isCreatorLoading,
    identifiedCreatorId,
    resetCreatorStores,
  } from "@/lib/store"; // Import all relevant stores and reset function
  import ContentList from "@/components/ContentList.svelte";

  // --- Props ---
  const { params } = $props<{
    params: { username?: string };
  }>();

  // --- Local Component State (Not in Store) ---
  let manualInput = $state<string>(""); // Input field for manual username entry
  let currentTabUrl = $state("");
  let currentTabTitle = $state<string | null>(null);
  let showAddConfirmation = $state(false);
  let initialCheckDone = $state(false); // Track if initial URL/param check is complete
  let showResetButton = $state(false); // Controls visibility of the reset button

  // --- Effect to find creator based on params or current tab ---
  $effect(() => {
    async function initialFetch() {
      isCreatorLoading.set(true);
      creatorOperationError.set(null);
      resetCreatorStores(); // Reset stores at the beginning
      manualInput = "";
      showResetButton = false;
      showAddConfirmation = false;

      let identifierToFetch: string | null = params.username || null;

      if (!identifierToFetch) {
        await getCurrentTabUrl(); // Fetch URL if needed
        if (currentTabUrl) {
          identifierToFetch = currentTabUrl;
        }
      }

      if (identifierToFetch) {
        await fetchAndSetCreator(identifierToFetch);
      } else {
        console.warn(
          "CreatorTab: identifier missing from params and could not be extracted from URL."
        );
        // No identifier, reset stores and stop loading
        resetCreatorStores();
        isCreatorLoading.set(false);
      }
      initialCheckDone = true;
    }
    initialFetch();
  });

  // --- Functions ---

  // Function to fetch creator and content IDs using the library function and update stores
  async function fetchAndSetCreator(identifier: string) {
    isCreatorLoading.set(true);
    creatorOperationError.set(null);
    // Reset parts of the store that should clear on a new fetch attempt
    identifiedCreator.set(null);
    identifiedCreatorContentIds.set(null);
    potentialUsernameToCreate.set(null);
    manualInput = ""; // Clear local input state
    showResetButton = false;
    creatorIdentifier.set(identifier); // Set the identifier being used

    try {
      const result = await fetchCreatorAndContentIds(identifier);

      identifiedCreator.set(result.creator);
      identifiedCreatorContentIds.set(result.contentIds);
      creatorOperationError.set(result.error); // Use error from result if any

      if (!result.creator && result.usernameFound) {
        potentialUsernameToCreate.set(result.usernameFound);
      } else {
        potentialUsernameToCreate.set(null); // Clear if creator was found or no username identified
      }

    } catch (error) {
      console.error(`Error calling fetchCreatorAndContentIds for "${identifier}":`, error);
      creatorOperationError.set(`Failed to process identifier "${identifier}".`);
      // Ensure stores reflect the failure state
      identifiedCreator.set(null);
      identifiedCreatorContentIds.set(null);
      potentialUsernameToCreate.set(null);
    } finally {
      isCreatorLoading.set(false);
    }
  }

  // Handler for the manual find/prepare button
  async function handleManualFind() {
    const trimmedInput = manualInput.trim();
    if (!trimmedInput) {
      creatorOperationError.set("Please enter a username or URL.");
      setTimeout(() => {
        // Clear error only if it's the specific message we set
        if ($creatorOperationError === "Please enter a username or URL.") {
           creatorOperationError.set(null);
        }
      }, 3000);
      return;
    }
    await fetchAndSetCreator(trimmedInput);
  }

  async function getCurrentTabUrl() {
    // Keep this function mostly as is, but clear store error if setting a new one
    if (currentTabUrl) return;
    currentTabUrl = "";
    currentTabTitle = null;
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];
      if (tab?.url) {
        currentTabUrl = tab.url;
        currentTabTitle = tab.title || null;
      } else {
         if (!$creatorOperationError) creatorOperationError.set("Could not get current tab URL.");
      }
    } catch (error) {
      console.error("Error getting current tab URL:", error);
       if (!$creatorOperationError) creatorOperationError.set("Error accessing browser tabs.");
    }
  }

  // Add content: either to existing creator or create new one first
  async function addCurrentTabContent() {
    if (!currentTabUrl) {
      await getCurrentTabUrl();
    }

    if (!currentTabUrl) {
      creatorOperationError.set("No valid tab URL found to add.");
      return;
    }

    // Use store values for checks
    if (!$identifiedCreatorId && !$potentialUsernameToCreate) {
      creatorOperationError.set(
        "Please identify a creator first (via URL, manual input, or params)."
      );
      return;
    }

    isCreatorLoading.set(true);
    creatorOperationError.set(null);
    showResetButton = false; // Hide reset during operation

    try {
      let targetCreatorId: number | bigint | null = $identifiedCreatorId ?? null;

      // Create creator if needed, update stores
      if (!targetCreatorId && $potentialUsernameToCreate) {
        const username = $potentialUsernameToCreate; // Cache before potentially clearing
        const newCreatorId = addCreateur(username, []); // SYNC CALL
        if (newCreatorId) {
          targetCreatorId = newCreatorId;
          const newCreator = findCreatorByUsername(username); // SYNC CALL
          if (!newCreator) {
             throw new Error(`Failed to find creator "${username}" immediately after creation.`);
          }
          // Update stores to reflect the newly created creator
          identifiedCreator.set(newCreator);
          potentialUsernameToCreate.set(null); // Clear potential name
          creatorIdentifier.set(newCreator.nom); // Update identifier to actual name
          identifiedCreatorContentIds.set([]); // Start with empty content list
          manualInput = ""; // Clear manual input if used
        } else {
          throw new Error("Failed to create the new creator in the database.");
        }
      }

      if (!targetCreatorId) {
        throw new Error("Cannot add content: Creator could not be identified or created.");
      }

      // Check for duplicate using synchronous DB call
      // Use getContenusByCreator which returns full objects
      const currentContentsForCheck = getContenusByCreator(Number(targetCreatorId)); // SYNC CALL
      if (currentContentsForCheck.some((c) => c.url === currentTabUrl)) {
        creatorOperationError.set("This URL has already been added for this creator.");
        setTimeout(() => { if ($creatorOperationError === "This URL has already been added for this creator.") creatorOperationError.set(null); }, 3000);
        return; // Exit before finally block sets isLoading=false
      }

      // Add content using synchronous DB call
      addContenu(currentTabUrl, currentTabTitle || "", Number(targetCreatorId)); // SYNC CALL

      // Refresh content IDs and update store
      const newIds = getContenuIdsByCreator(Number(targetCreatorId)); // SYNC CALL
      identifiedCreatorContentIds.set(newIds);

      // Success path
      showAddConfirmation = true;
      showResetButton = true; // Show reset button after successful add
      setTimeout(() => (showAddConfirmation = false), 2000);

    } catch (error: any) {
      console.error("Error adding content or creator:", error);
      creatorOperationError.set(`Failed to add content: ${error.message || "Unknown error"}`);
      showResetButton = false; // Don't show reset on error
      // If creation failed, reset relevant stores
      if (error.message.includes("create the new creator")) {
          identifiedCreator.set(null);
          potentialUsernameToCreate.set($creatorIdentifier); // Restore potential name if creation failed
      }
    } finally {
      isCreatorLoading.set(false);
    }
  }

  // Function to reset the component state and stores for a new search
  function resetComponentState() {
    resetCreatorStores(); // Reset all relevant stores
    // Reset local component state
    manualInput = "";
    showResetButton = false;
    showAddConfirmation = false;
    // Keep initialCheckDone = true
    // Optionally refetch tab URL or clear it
    // currentTabUrl = "";
    // currentTabTitle = null;
    // The UI should now show the manual input section again if no URL/params
  }
</script>

<div class="popup-body">
  <!-- Section for Adding Content / Identifying Creator -->
  <div class="w-full flex flex-col items-center gap-2 my-2">
    <!-- Display Current Tab URL -->
    {#if currentTabUrl}
      <p
        class="text-xs text-[#B0B0B0] text-center opacity-40 select-none"
        title={currentTabUrl}
      >
        Current Tab: {currentTabUrl}
      </p>
    {:else if initialCheckDone && !$isCreatorLoading}
      <p class="text-xs text-yellow-500">Could not detect current tab URL.</p>
      <button
        onclick={getCurrentTabUrl}
        disabled={$isCreatorLoading}
        class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[#B0B0B0] text-xs disabled:opacity-50 w-auto"
      >
        {$isCreatorLoading ? "Checking..." : `Retry Tab Check`}
      </button>
    {/if}

    <!-- Manual Creator Input (Show if initial check done, not loading, no creator found, no username identified for creation, and reset button isn't shown) -->
    {#if initialCheckDone && !$isCreatorLoading && !$identifiedCreatorId && !$potentialUsernameToCreate && !showResetButton}
      <div class="w-full flex flex-col items-center gap-2 mt-2">
        <p class="text-xs text-yellow-400 text-center px-2">
          Could not identify creator. Please enter username or profile URL:
        </p>
        <div class="flex gap-2 w-full max-w-xs">
          <input
            type="text"
            bind:value={manualInput}
            placeholder="Enter username or URL"
            class="flex-grow px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#7E5BEF]"
            disabled={$isCreatorLoading}
            onkeydown={(e) => {
              if (e.key === "Enter") handleManualFind();
            }}
          />
          <button
            onclick={handleManualFind}
            disabled={$isCreatorLoading || !manualInput.trim()}
            class="px-3 py-1 bg-[#7E5BEF] hover:bg-[#6A4ADF] rounded text-white text-sm disabled:opacity-50 flex-shrink-0"
          >
            Find
          </button>
        </div>
      </div>
    {/if}

    <!-- Add Content / Reset Button Area -->
    {#if currentTabUrl}
      <div class="w-full max-w-xs mt-2">
        {#if showResetButton}
          <!-- Show Reset Button after successful add -->
          <button
            onclick={resetComponentState}
            class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm w-full"
          >
            Start New Search / Reset
          </button>
        {:else}
          <!-- Show Add/Create Button -->
          <button
            onclick={addCurrentTabContent}
            disabled={$isCreatorLoading ||
              !currentTabUrl ||
              (!$identifiedCreatorId && !$potentialUsernameToCreate)}
            class="px-4 py-2 bg-[#7E5BEF] hover:bg-[#6A4ADF] rounded text-white text-sm disabled:opacity-50 w-full"
            style={!$identifiedCreatorId && !$potentialUsernameToCreate ? "display: none;" : ""}
          >
            {#if $isCreatorLoading} <!-- Simplified loading check -->
              Processing...
            {:else if $identifiedCreatorId && $identifiedCreator} <!-- Use store values -->
              Add Current Tab URL for {$identifiedCreator.nom}
            {:else if $potentialUsernameToCreate} <!-- Use store value -->
              Create {$potentialUsernameToCreate} & Add URL
            {:else}
              <!-- This case should ideally not be reachable -->
              Identify Creator First
            {/if}
          </button>
        {/if}

        {#if showAddConfirmation && !showResetButton}
          <p class="text-green-400 text-xs mt-1 text-center">
            Content added successfully!
          </p>
        {/if}
        <!-- Informational message if creator needs to be created -->
        {#if !$isCreatorLoading && !$identifiedCreatorId && $potentialUsernameToCreate && !showResetButton} <!-- Use store values -->
          <p class="text-yellow-400 text-xs mt-1 text-center px-2">
            Creator "{$potentialUsernameToCreate}" not found. Adding content will create them.
          </p>
        {/if}
      </div>
    {/if}
  </div>


  <!-- Error Message -->
  {#if $creatorOperationError} <!-- Use store value -->
    <p class="text-red-500 text-sm my-2 text-center">{$creatorOperationError}</p>
  {/if}

  <!-- Loading Indicator -->
  {#if $isCreatorLoading && !initialCheckDone} <!-- Show initial loading differently? -->
     <p class="text-[#B0B0B0] text-center">Initializing...</p>
  {:else if $isCreatorLoading}
    <p class="text-[#B0B0B0] text-center">Loading...</p> <!-- General loading -->
  {/if}


  <!-- Content List (Only show if creator exists and not loading) -->
  {#if !$isCreatorLoading && $identifiedCreatorId && $identifiedCreator} <!-- Use store values -->
    <h3 class="text-lg font-semibold text-white mt-3 mb-1">
      Content for {$identifiedCreator.nom}
    </h3>
    <div class="w-full flex flex-col gap-2 overflow-y-auto max-h-60 px-1">
      <!-- Bind ContentList directly to the store -->
      <ContentList bind:contentIds={$identifiedCreatorContentIds} />
    </div>
  {:else if initialCheckDone && !$isCreatorLoading && !$identifiedCreatorId && !$potentialUsernameToCreate && !$creatorOperationError && !showResetButton}
    <!-- Show prompt if initial check done, no creator, no potential, no error, and not in reset state -->
    <p class="text-[#B0B0B0] text-center mt-4">
      Identify a creator using the current tab or by entering a username/URL
      above.
    </p>
  {/if}
</div>

<style>
  @import "tailwindcss";

  .popup-body {
    background-color: #000000; /* Noir profond */
    min-width: 350px;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    color: #b0b0b0; /* Gris argenté */
  }

  /* Style for scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 3px;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #7e5bef;
  }
</style>
