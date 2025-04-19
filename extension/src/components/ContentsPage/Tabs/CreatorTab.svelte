<script lang="ts">
  import {
    addContenu,
    getContenusByCreator,
    deleteContenu,
    type Contenu,
    updateFavoriContenu,
    type Createur,
    findCreatorByUsername,
    addCreateur,
  } from "@/lib/dbUtils";
  import { processSearchInput } from "@/lib/searchProcessor";

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
  let contents = $state<Contenu[]>([]);
  let isLoading = $state(true); // General loading (content, add/delete ops)
  let isLoadingCreator = $state(true); // Specific loading for creator lookup
  let errorMessage = $state<string | null>(null);
  let showAddConfirmation = $state(false);
  let initialCheckDone = $state(false); // Track if initial URL/param check is complete

  // --- Effect to find creator by username (or extract from URL) ---
  $effect(() => {
    async function initialFetch() {
      isLoadingCreator = true;
      isLoading = true; // Start loading
      errorMessage = null;
      creator = null;
      contents = [];
      potentialCreatorUsername = null;
      manualInput = ""; // Reset manual input

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
        contents = [];
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
    contents = [];
    manualInput = ""; // Clear input after attempting to find

    try {
      const foundCreator = findCreatorByUsername(username);
      if (foundCreator) {
        creator = foundCreator;
        potentialCreatorUsername = null; // Clear potential name as creator is found
        await loadContents(); // Load contents for the found creator
      } else {
        // Creator not found, keep potentialCreatorUsername set
        creator = null;
        contents = [];
        // Stop loading here, waiting for user action (add content will create)
        isLoading = false;
      }
    } catch (error) {
      console.error(`Error finding creator "${username}":`, error);
      errorMessage = `Failed to look up creator "${username}".`;
      creator = null;
      potentialCreatorUsername = null; // Clear on error
      isLoading = false; // Stop loading on error
    } finally {
      isLoadingCreator = false;
      // isLoading is set to false either above or within loadContents
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

  async function loadContents() {
    // ...existing code...
    const currentCreatorId = creatorId;
    if (!currentCreatorId) {
      console.warn("loadContents called without a valid creatorId.");
      contents = [];
      isLoading = false;
      return;
    }
    isLoading = true; // Set loading true for content fetching
    // Don't clear potential creator lookup errors
    try {
      const fetchedContents = getContenusByCreator(currentCreatorId);
      contents = fetchedContents;
    } catch (error) {
      console.error("Error loading contents:", error);
      errorMessage = "Failed to load content list.";
      contents = [];
    } finally {
      isLoading = false;
    }
  }

  // Add content: either to existing creator or create new one first
  async function addCurrentTabContent() {
    // ...existing code...
    // Ensure URL and potentially title are fetched if not already available
    if (!currentTabUrl) {
      await getCurrentTabUrl();
    }

    if (!currentTabUrl) {
      errorMessage = "No valid tab URL found to add.";
      return;
    }

    // Ensure we have a creator or a potential one to create
    if (!creatorId && !potentialCreatorUsername) {
      errorMessage =
        "Please identify a creator first (via URL or manual input).";
      return;
    }

    isLoading = true;
    errorMessage = null;

    try {
      // Handle potential undefined from creatorId by defaulting to null
      let targetCreatorId: number | bigint | null = creatorId ?? null;

      // If creator doesn't exist yet, create them first using potentialCreatorUsername
      if (!targetCreatorId && potentialCreatorUsername) {
        console.log(`Creating new creator: ${potentialCreatorUsername}`);
        const newCreatorId = addCreateur(potentialCreatorUsername, []); // Add with empty aliases for now
        if (newCreatorId) {
          targetCreatorId = newCreatorId;
          // Refresh creator state now that they exist
          creator = findCreatorByUsername(potentialCreatorUsername);
          potentialCreatorUsername = null; // Clear potential name as creator now exists
          manualInput = ""; // Clear manual input as well
          console.log(
            `Creator ${creator?.nom} (ID: ${targetCreatorId}) created.`
          );
        } else {
          throw new Error("Failed to create the new creator in the database.");
        }
      }

      // If we still don't have a creator ID, something went wrong
      if (!targetCreatorId) {
        errorMessage =
          "Cannot add content: Creator could not be identified or created.";
        isLoading = false;
        return;
      }

      // Check for duplicate URL for the target creator
      // Need to fetch contents if creator was just created
      let currentContents = contents;
      if (!creatorId) {
        // Check if creator was *just* created in this function call
        // Fetch fresh contents using the newly created ID
        currentContents = getContenusByCreator(Number(targetCreatorId));
      } else {
        // If creator already existed, 'contents' state should be up-to-date
        currentContents = contents;
      }

      if (currentContents.some((c) => c.url === currentTabUrl)) {
        errorMessage = "This URL has already been added for this creator.";
        setTimeout(() => {
          if (
            errorMessage === "This URL has already been added for this creator."
          )
            errorMessage = null;
        }, 3000);
        isLoading = false;
        return;
      }

      // Add the content to the (potentially new) creator, including the tab title
      addContenu(currentTabUrl, currentTabTitle || "", Number(targetCreatorId)); // Pass title or empty string
      await loadContents(); // Refresh the list (will use the now-set creatorId)
      showAddConfirmation = true;
      setTimeout(() => (showAddConfirmation = false), 2000);
    } catch (error: any) {
      console.error("Error adding content or creator:", error);
      errorMessage = `Failed to add content: ${error.message || "Unknown error"}`;
      // Consider how to handle partial failures if needed
    } finally {
      isLoading = false;
    }
  }

  // Delete a specific content item
  async function handleDeleteContent(contentId: number) {
    // ...existing code...
    if (!confirm("Are you sure you want to delete this content?")) return;
    isLoading = true;
    errorMessage = null;
    try {
      deleteContenu(contentId);
      await loadContents(); // Refresh list
    } catch (error) {
      console.error("Error deleting content:", error);
      errorMessage = "Failed to delete content.";
    } finally {
      isLoading = false;
    }
  }

  // Toggle favorite status for a content item
  async function handleToggleFavorite(content: Contenu) {
    // ...existing code...
    isLoading = true;
    errorMessage = null;
    try {
      updateFavoriContenu(content.id, !content.favori);
      await loadContents(); // Refresh list to show updated status
    } catch (error) {
      console.error("Error updating favorite status:", error);
      errorMessage = "Failed to update favorite status.";
    } finally {
      isLoading = false;
    }
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

    <!-- Manual Creator Input (Show if no creator found/identified yet) -->
    {#if initialCheckDone && !isLoadingCreator && !creatorId && !potentialCreatorUsername}
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

    <!-- Add Content Button (Show if URL is available) -->
    {#if currentTabUrl}
      <button
        onclick={addCurrentTabContent}
        disabled={isLoading ||
          !currentTabUrl ||
          (!creatorId && !potentialCreatorUsername)}
        class="px-4 py-2 mt-2 bg-[#7E5BEF] hover:bg-[#6A4ADF] rounded text-white text-sm disabled:opacity-50 w-full max-w-xs"
        style="{!creatorId && !potentialCreatorUsername ? 'display: none;' : ''}"
      >
        {#if isLoading && !isLoadingCreator}
          <!-- Show loading only if adding/deleting, not during creator lookup -->
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
      {#if showAddConfirmation}
        <p class="text-green-400 text-xs mt-1">Content added successfully!</p>
      {/if}
      <!-- Informational message if creator needs to be created -->
      {#if !isLoading && !creatorId && potentialCreatorUsername}
        <p class="text-yellow-400 text-xs mt-1 text-center px-2">
          Creator "{potentialCreatorUsername}" not found. Adding content will
          create them.
        </p>
      {/if}
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
    <div class="w-full flex flex-col gap-2 overflow-y-auto max-h-60 px-1">
      {#if isLoading && contents.length === 0}
        <p class="text-[#B0B0B0] text-center">Loading content...</p>
      {:else if contents.length === 0 && !isLoading}
        <p class="text-[#B0B0B0] text-center">
          No content added for {creator?.nom || "this creator"} yet.
        </p>
      {:else}
        {#each contents as content (content.id)}
          <div
            class="bg-gray-900 p-2 rounded flex justify-between items-center gap-2"
          >
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#7E5BEF] hover:underline text-sm truncate flex-grow"
              title={content.tabname
                ? `${content.tabname} (${content.url})`
                : content.url}
            >
              {content.tabname ? content.tabname : content.url}
            </a>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                onclick={() => handleToggleFavorite(content)}
                title={content.favori
                  ? "Remove from favorites"
                  : "Add to favorites"}
                class={`text-xl ${content.favori ? "text-yellow-400" : "text-[#B0B0B0] hover:text-[#7E5BEF]"}`}
                disabled={isLoading}
              >
                {content.favori ? "★" : "☆"}
              </button>
              <button
                onclick={() => handleDeleteContent(content.id)}
                title="Delete Content"
                class="text-red-500 hover:text-red-400 text-lg font-bold"
                disabled={isLoading}
              >
                &times; <!-- Cross symbol -->
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {:else if initialCheckDone && !isLoadingCreator && !creatorId && !potentialCreatorUsername && !errorMessage}
    <!-- Show prompt if initial check done, no creator, no potential, no error -->
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

  /* Style for scrollbar */
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
