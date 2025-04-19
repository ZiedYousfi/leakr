<script lang="ts">
  import Header from "../components/Header.svelte";
  import {
    addContenu,
    getContenusByCreator,
    deleteContenu,
    type Contenu,
    updateFavoriContenu,
    type Createur,
    findCreatorByUsername,
    addCreateur, // Import addCreateur
  } from "../lib/dbUtils";
  import { processSearchInput } from "../lib/searchProcessor";

  // --- Props ---
  const { onNavigate, params } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: { username?: string };
  }>();

  // --- State ---
  let creator = $state<Createur | null>(null);
  let creatorId = $derived.by(() => creator?.id);
  let potentialCreatorUsername = $state<string | null>(null);
  let currentTabUrl = $state("");
  let currentTabTitle = $state<string | null>(null);
  let contents = $state<Contenu[]>([]);
  let isLoading = $state(true);
  let isLoadingCreator = $state(true);
  let errorMessage = $state<string | null>(null);
  let showAddConfirmation = $state(false);

  // --- Effect to find creator by username (or extract from URL) ---
  $effect(() => {
    async function fetchCreator() {
      let usernameToFetch: string | null = params.username || null;

      if (!usernameToFetch) {
        await getCurrentTabUrl();
        if (currentTabUrl) {
          const { username: extractedUsername } =
            processSearchInput(currentTabUrl);
          if (extractedUsername) {
            usernameToFetch = extractedUsername;
            console.log(`Extracted username from URL: ${extractedUsername}`);
          }
        }
      }

      if (!usernameToFetch) {
        console.warn(
          "ContentsPage: username missing from params and could not be extracted from URL."
        );
        errorMessage =
          "Creator username not provided and could not be extracted from the current tab URL.";
        isLoading = false;
        isLoadingCreator = false;
        creator = null;
        contents = [];
        potentialCreatorUsername = null; // Clear potential name
        return;
      }

      // Store the username we are attempting to find/create
      potentialCreatorUsername = usernameToFetch;

      isLoadingCreator = true;
      isLoading = true;
      errorMessage = null;
      creator = null;
      contents = [];

      try {
        const foundCreator = findCreatorByUsername(usernameToFetch);
        if (foundCreator) {
          creator = foundCreator;
          potentialCreatorUsername = null; // Clear potential name as creator is found
          await loadContents(); // Load contents for the found creator
        } else {
          // Creator not found, keep potentialCreatorUsername set
          // Don't set error message here, allow user to add content to create creator
          console.log(
            `Creator "${usernameToFetch}" not found. Ready to create.`
          );
          creator = null;
          contents = [];
          // We stop loading here, waiting for user action (add content)
          isLoading = false;
        }
      } catch (error) {
        console.error("Error finding creator:", error);
        errorMessage = `Failed to look up creator "${usernameToFetch}".`;
        creator = null;
        potentialCreatorUsername = null; // Clear on error
      } finally {
        isLoadingCreator = false;
        // isLoading is set to false either above (if creator not found)
        // or within loadContents (if creator was found)
      }
    }
    fetchCreator();
  });

  // --- Functions ---

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
        console.log("Current Tab:", currentTabUrl, currentTabTitle);
      } else {
        if (!errorMessage) errorMessage = "Could not get current tab URL.";
      }
    } catch (error) {
      console.error("Error getting current tab URL:", error);
      if (!errorMessage) errorMessage = "Error accessing browser tabs.";
    }
  }

  async function loadContents() {
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
    // Ensure URL and potentially title are fetched if not already available
    if (!currentTabUrl) {
      await getCurrentTabUrl();
    }

    if (!currentTabUrl) {
      errorMessage = "No valid tab URL found to add.";
      return;
    }

    isLoading = true;
    errorMessage = null;

    try {
      // Handle potential undefined from creatorId by defaulting to null
      let targetCreatorId: number | bigint | null = creatorId ?? null;

      // If creator doesn't exist yet, create them first
      if (!targetCreatorId && potentialCreatorUsername) {
        console.log(`Creating new creator: ${potentialCreatorUsername}`);
        const newCreatorId = addCreateur(potentialCreatorUsername, []); // Add with empty aliases for now
        if (newCreatorId) {
          targetCreatorId = newCreatorId;
          // Refresh creator state now that they exist
          creator = findCreatorByUsername(potentialCreatorUsername);
          potentialCreatorUsername = null; // Clear potential name
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
        // If we just created the creator, contents array is empty
        // Fetch fresh contents using the newly created ID
        currentContents = getContenusByCreator(Number(targetCreatorId));
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

  // --- Lifecycle ---
  // onMount is no longer needed for initial URL fetch, handled by effect
</script>

<div class="popup-body">
  <!-- Use creator name, potential name, or fallback -->
  <Header
    title={creator?.nom || potentialCreatorUsername || "Content"}
    {onNavigate}
  />

  <!-- Add Content Section -->
  <div class="w-full flex flex-col items-center gap-2 my-2">
    {#if currentTabUrl}
      <p
        class="text-xs text-[#B0B0B0] truncate w-full text-center px-2"
        title={currentTabUrl}
      >
        Current Tab: {currentTabUrl}
      </p>
      <!-- Enable button if URL exists AND (creator exists OR potential creator name exists) -->
      <button
        onclick={addCurrentTabContent}
        disabled={isLoading ||
          !currentTabUrl ||
          (!creatorId && !potentialCreatorUsername)}
        class="px-4 py-2 bg-[#7E5BEF] hover:bg-[#6A4ADF] rounded text-white text-sm disabled:opacity-50 w-full max-w-xs"
      >
        {#if isLoading}
          Loading...
        {:else if creatorId}
          Add Current Tab URL
        {:else if potentialCreatorUsername}
          Create {potentialCreatorUsername} & Add URL
        {:else}
          Cannot Add (No Creator/URL)
        {/if}
      </button>
      {#if showAddConfirmation}
        <p class="text-green-400 text-xs mt-1">Content added successfully!</p>
        <!-- Adjusted green shade slightly -->
      {/if}
      <!-- Informational message if creator needs to be created -->
      {#if !isLoading && !creatorId && potentialCreatorUsername}
        <p class="text-yellow-400 text-xs mt-1 text-center px-2">
          <!-- Kept yellow for warning -->
          Creator "{potentialCreatorUsername}" not found. Adding content will
          create them.
        </p>
      {/if}
    {:else}
      <p class="text-xs text-yellow-500">Could not detect current tab URL.</p>
      <!-- Kept yellow for warning -->
      <button
        onclick={getCurrentTabUrl}
        disabled={isLoading}
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-[#B0B0B0] text-sm disabled:opacity-50 w-full max-w-xs"
      >
        {isLoading ? "Checking..." : `Retry Tab Check`}
      </button>
    {/if}
  </div>

  <!-- Error Message -->
  {#if errorMessage}
    <p class="text-red-500 text-sm my-2 text-center">{errorMessage}</p>
    <!-- Kept red for error -->
  {/if}

  <!-- Loading Indicator for Creator Lookup -->
  {#if isLoadingCreator}
    <p class="text-[#B0B0B0] text-center">Looking up creator...</p>
    <!-- Changed text color -->
  {/if}

  <!-- Content List (Only show if creator exists and not loading creator) -->
  {#if !isLoadingCreator && creatorId}
    <div class="w-full flex flex-col gap-2 mt-4 overflow-y-auto max-h-60 px-1">
      {#if isLoading && contents.length === 0}
        <p class="text-[#B0B0B0] text-center">Loading content...</p>
        <!-- Changed text color -->
      {:else if contents.length === 0 && !isLoading}
        <p class="text-[#B0B0B0] text-center">
          <!-- Changed text color -->
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
              title={content.tabname ? content.url : "Go to URL"}
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
  {:else if !isLoadingCreator && !creatorId && !potentialCreatorUsername && !errorMessage}
    <!-- Only show if no creator, no potential name, and no specific error -->
    <p class="text-[#B0B0B0] text-center">Cannot display content.</p>
    <!-- Changed text color -->
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
    min-height: 300px;
    max-height: 500px;
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
