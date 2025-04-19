<script lang="ts">
  import {
    addContenu,
    getContenusByCreator, // Keep for duplicate check
    getContenuIdsByCreator, // Import the new function
    type Createur,
    findCreatorByUsername,
    addCreateur,
  } from "@/lib/dbUtils";
  import { processSearchInput } from "@/lib/searchProcessor";
  import ContentList from "@/components/ContentList.svelte"; // Import ContentList

  // --- Props ---
  const { params } = $props<{
    params: { username?: string };
  }>();

  // --- State ---
  let creator = $state<Createur | null>(null);
  let creatorId = $derived.by(() => creator?.id);
  let potentialCreatorUsername = $state<string | null>(null); // Username identified (URL/Param) or manually entered for potential creation
  let manualInput = $state<string>(""); // Input field for manual username entry
  let currentTabUrl = $state("");
  let currentTabTitle = $state<string | null>(null);
  let creatorContentIds = $state<number[] | null>(null); // State for content IDs
  let isLoading = $state(true); // General loading (add/delete ops, ID fetching)
  let isLoadingCreator = $state(true); // Specific loading for creator lookup
  let errorMessage = $state<string | null>(null);
  let showAddConfirmation = $state(false);
  let initialCheckDone = $state(false); // Track if initial URL/param check is complete
  let showResetButton = $state(false); // NEW: Controls visibility of the reset button

  // --- Effect to find creator by username (or extract from URL) ---
  $effect(() => {
    async function initialFetch() {
      isLoadingCreator = true;
      isLoading = true; // Start loading
      errorMessage = null;
      creator = null;
      creatorContentIds = null; // Reset IDs
      potentialCreatorUsername = null;
      manualInput = ""; // Reset manual input
      showResetButton = false; // Ensure reset button is hidden on initial load/param change

      let usernameToFetch: string | null = params.username || null;

      if (!usernameToFetch) {
        await getCurrentTabUrl(); // Fetch URL if needed
        if (currentTabUrl) {
          const { username: extractedUsername } =
            processSearchInput(currentTabUrl);
          if (extractedUsername) {
            usernameToFetch = extractedUsername;
          }
        }
      }

      if (usernameToFetch) {
        // If we got a username from params or URL, try to find the creator
        await findCreator(usernameToFetch);
      } else {
        // No username from params or URL, stop loading, wait for manual input
        console.warn(
          "CreatorTab: username missing from params and could not be extracted from URL."
        );
        // Don't set error message here, just allow manual input
        isLoading = false;
        isLoadingCreator = false;
        creator = null;
        // contents = []; // Remove
        creatorContentIds = null; // Reset IDs
        potentialCreatorUsername = null;
      }
      initialCheckDone = true; // Mark initial check as done
    }
    initialFetch();
  });

  // --- Functions ---

  // Function to find a creator by username and update state
  async function findCreator(username: string) {
    potentialCreatorUsername = username; // Store the name we are looking for/might create
    isLoadingCreator = true;
    isLoading = true; // Also set general loading during creator lookup
    errorMessage = null;
    creator = null;
    // contents = []; // Remove
    creatorContentIds = null; // Reset IDs
    manualInput = ""; // Clear input after attempting to find
    showResetButton = false; // Reset button visibility on new find attempt

    try {
      const foundCreator = findCreatorByUsername(username);
      if (foundCreator) {
        creator = foundCreator;
        potentialCreatorUsername = null; // Clear potential name as creator is found
        await loadCreatorContentIds(creator.id); // Load content IDs for the found creator
      } else {
        // Creator not found, keep potentialCreatorUsername set
        creator = null;
        // contents = []; // Remove
        creatorContentIds = null; // No IDs if no creator
        // Stop loading here, waiting for user action (add content will create)
        isLoading = false;
      }
    } catch (error) {
      console.error(`Error finding creator "${username}":`, error);
      errorMessage = `Failed to look up creator "${username}".`;
      creator = null;
      potentialCreatorUsername = null; // Clear on error
      creatorContentIds = null; // Reset IDs on error
      isLoading = false; // Stop loading on error
    } finally {
      isLoadingCreator = false;
      // isLoading might be set to false above or within loadCreatorContentIds
    }
  }

  // Function to load content IDs for a given creator
  async function loadCreatorContentIds(id: number) {
    // isLoading = true; // Optionally set loading, but ContentList has its own
    errorMessage = null; // Clear previous errors related to content loading
    try {
      const fetchedIds = getContenuIdsByCreator(id);
      creatorContentIds = fetchedIds;
    } catch (error) {
      console.error(`Error loading content IDs for creator ${id}:`, error);
      errorMessage = "Failed to load content list.";
      creatorContentIds = null; // Set to null on error
    } finally {
      // isLoading = false; // Stop loading if set above
    }
  }

  // Handler for the manual find/prepare button
  async function handleManualFind() {
    const trimmedInput = manualInput.trim();
    if (!trimmedInput) {
      errorMessage = "Please enter a username or URL.";
      setTimeout(() => {
        if (errorMessage === "Please enter a username or URL.")
          errorMessage = null;
      }, 3000);
      return;
    }

    // Process the input using the search processor
    const { username: extractedUsername } = processSearchInput(trimmedInput);

    if (extractedUsername) {
      // If a username was extracted (likely from a URL or direct username)
      await findCreator(extractedUsername);
    } else {
      // If no username could be extracted (e.g., invalid URL or just random text)
      // Treat the input as a potential username directly
      // Alternatively, show an error if you only want valid URLs or known patterns
      console.warn(
        `Could not extract username from "${trimmedInput}", attempting to use it directly.`
      );
      await findCreator(trimmedInput); // Or show an error: errorMessage = "Could not identify a username from the input.";
    }
  }

  async function getCurrentTabUrl() {
    if (currentTabUrl) return; // Only fetch if not already fetched
    currentTabUrl = ""; // Reset before fetching
    currentTabTitle = null; // Reset title
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];
      if (tab?.url) {
        currentTabUrl = tab.url;
        currentTabTitle = tab.title || null; // Store the title, fallback to null
      } else {
        if (!errorMessage) errorMessage = "Could not get current tab URL.";
      }
    } catch (error) {
      console.error("Error getting current tab URL:", error);
      if (!errorMessage) errorMessage = "Error accessing browser tabs.";
    }
  }

  // Add content: either to existing creator or create new one first
  async function addCurrentTabContent() {
    console.log("addCurrentTabContent: Started"); // <-- Add log
    // Ensure URL and potentially title are fetched if not already available
    if (!currentTabUrl) {
      console.log("addCurrentTabContent: Calling getCurrentTabUrl"); // <-- Add log
      await getCurrentTabUrl();
      console.log("addCurrentTabContent: Finished getCurrentTabUrl"); // <-- Add log
    }

    if (!currentTabUrl) {
      errorMessage = "No valid tab URL found to add.";
      console.log("addCurrentTabContent: Exiting - No valid tab URL"); // <-- Add log
      return;
    }

    // Ensure we have a creator or a potential one to create
    if (!creatorId && !potentialCreatorUsername) {
      errorMessage =
        "Please identify a creator first (via URL or manual input).";
      console.log("addCurrentTabContent: Exiting - Creator not identified"); // <-- Add log
      return;
    }

    isLoading = true;
    errorMessage = null;
    showResetButton = false;
    console.log("addCurrentTabContent: isLoading set to true");

    try {
      console.log("addCurrentTabContent: Entering try block");
      let targetCreatorId: number | bigint | null = creatorId ?? null;

      // Create creator if needed
      if (!targetCreatorId && potentialCreatorUsername) {
        console.log(`addCurrentTabContent: Creating new creator: ${potentialCreatorUsername}`);
        const newCreatorId = addCreateur(potentialCreatorUsername, []); // SYNC CALL
        console.log(`addCurrentTabContent: addCreateur returned: ${newCreatorId}`);
        if (newCreatorId) {
          targetCreatorId = newCreatorId;
          console.log("addCurrentTabContent: Calling findCreatorByUsername");
          creator = findCreatorByUsername(potentialCreatorUsername); // SYNC CALL
          console.log("addCurrentTabContent: Finished findCreatorByUsername");
          potentialCreatorUsername = null;
          manualInput = "";
          console.log(`Creator ${creator?.nom} (ID: ${targetCreatorId}) created.`);
        } else {
          throw new Error("Failed to create the new creator in the database.");
        }
      }

      if (!targetCreatorId) {
        errorMessage = "Cannot add content: Creator could not be identified or created.";
        console.log("addCurrentTabContent: Exiting - targetCreatorId still null");
        // Note: finally block will still execute even if we return here
        return;
      }

      // Check for duplicate
      console.log("addCurrentTabContent: Calling getContenusByCreator for duplicate check");
      const currentContentsForCheck = getContenusByCreator(Number(targetCreatorId)); // SYNC CALL
      console.log("addCurrentTabContent: Finished getContenusByCreator");
      if (currentContentsForCheck.some((c) => c.url === currentTabUrl)) {
        errorMessage = "This URL has already been added for this creator.";
        setTimeout(() => { /* ... */ }, 3000);
        console.log("addCurrentTabContent: Exiting - Duplicate URL found");
         // Note: finally block will still execute even if we return here
        return;
      }

      // Add content
      console.log("addCurrentTabContent: Calling addContenu");
      addContenu(currentTabUrl, currentTabTitle || "", Number(targetCreatorId)); // SYNC CALL
      console.log("addCurrentTabContent: Finished addContenu");

      // Load content IDs
      console.log("addCurrentTabContent: PRE - await loadCreatorContentIds"); // <-- Log before await
      await loadCreatorContentIds(Number(targetCreatorId)); // ASYNC CALL
      console.log("addCurrentTabContent: POST - await loadCreatorContentIds"); // <-- Log after await

      // Success path
      console.log("addCurrentTabContent: Success path");
      showAddConfirmation = true;
      showResetButton = true;
      setTimeout(() => (showAddConfirmation = false), 2000);

    } catch (error: any) {
      console.error("Error adding content or creator:", error);
      errorMessage = `Failed to add content: ${error.message || "Unknown error"}`;
      showResetButton = false;
      console.log("addCurrentTabContent: Caught error", error);
    } finally {
      // This block MUST execute to reset isLoading
      isLoading = false;
      console.log("addCurrentTabContent: Finally block - isLoading set to false. Current value:", isLoading); // <-- Log in finally
    }
  }

  // NEW: Function to reset the component state for a new search
  function resetComponentState() {
    creator = null;
    // creatorId will update via derived
    potentialCreatorUsername = null;
    manualInput = "";
    creatorContentIds = null;
    errorMessage = null;
    showResetButton = false; // Hide the reset button itself
    showAddConfirmation = false; // Ensure confirmation is hidden
    isLoading = false; // Ensure loading indicators are off
    isLoadingCreator = false;
    // Keep initialCheckDone = true
    // Keep currentTabUrl and currentTabTitle
    // The UI should now show the manual input section again
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
    {:else if initialCheckDone && !isLoading}
      <!-- Show only after initial check and if not loading -->
      <p class="text-xs text-yellow-500">Could not detect current tab URL.</p>
      <button
        onclick={getCurrentTabUrl}
        disabled={isLoading}
        class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[#B0B0B0] text-xs disabled:opacity-50 w-auto"
      >
        {isLoading ? "Checking..." : `Retry Tab Check`}
      </button>
    {/if}

    <!-- Manual Creator Input (Show if no creator found/identified yet AND reset button isn't shown) -->
    {#if initialCheckDone && !isLoadingCreator && !creatorId && !potentialCreatorUsername && !showResetButton}
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
            disabled={isLoading}
            onkeydown={(e) => {
              if (e.key === "Enter") handleManualFind();
            }}
          />
          <button
            onclick={handleManualFind}
            disabled={isLoading || !manualInput.trim()}
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
        <!-- Wrapper div -->
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
            disabled={isLoading ||
              !currentTabUrl ||
              (!creatorId && !potentialCreatorUsername)}
            class="px-4 py-2 bg-[#7E5BEF] hover:bg-[#6A4ADF] rounded text-white text-sm disabled:opacity-50 w-full"
            style={!creatorId && !potentialCreatorUsername
              ? "display: none;"
              : ""}
          >
            {#if isLoading && !isLoadingCreator}
              Processing...
            {:else if creatorId && creator}
              <!-- Check for creator existence as well -->
              Add Current Tab URL for {creator.nom}
            {:else if potentialCreatorUsername}
              Create {potentialCreatorUsername} & Add URL
            {:else}
              Identify Creator First
            {/if}
          </button>
        {/if}

        {#if showAddConfirmation && !showResetButton}
          <!-- Hide confirmation if reset button is shown -->
          <p class="text-green-400 text-xs mt-1 text-center">
            Content added successfully!
          </p>
        {/if}
        <!-- Informational message if creator needs to be created (and reset button isn't shown) -->
        {#if !isLoading && !creatorId && potentialCreatorUsername && !showResetButton}
          <p class="text-yellow-400 text-xs mt-1 text-center px-2">
            Creator "{potentialCreatorUsername}" not found. Adding content will
            create them.
          </p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Error Message -->
  {#if errorMessage}
    <p class="text-red-500 text-sm my-2 text-center">{errorMessage}</p>
  {/if}

  <!-- Loading Indicator for Creator Lookup -->
  {#if isLoadingCreator}
    <p class="text-[#B0B0B0] text-center">Looking up creator...</p>
  {/if}

  <!-- Content List (Only show if creator exists and not loading creator) -->
  {#if !isLoadingCreator && creatorId}
    <h3 class="text-lg font-semibold text-white mt-3 mb-1">
      Content for {creator?.nom}
    </h3>
    <!-- Use ContentList component -->
    <div class="w-full flex flex-col gap-2 overflow-y-auto max-h-60 px-1">
      <ContentList bind:contentIds={creatorContentIds} />
    </div>
  {:else if initialCheckDone && !isLoadingCreator && !creatorId && !potentialCreatorUsername && !errorMessage && !showResetButton}
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
    /*min-height: 300px;
    max-height: 500px;*/
  }

  /* Style for scrollbar (keep if needed for overall popup, ContentList has its own internal scroll styling) */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1a1a1a; /* Darker track */
    border-radius: 3px;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #555; /* Dark gray thumb */
    border-radius: 3px;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #7e5bef; /* Violet nuit on hover */
  }
</style>
