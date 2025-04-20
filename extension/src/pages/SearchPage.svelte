<script lang="ts">
  import Header from "../components/Header.svelte";
  import SearchInput from "../components/SearchPage/SearchInput.svelte";
  import ActionButtons from "../components/SearchPage/ActionButtons.svelte";
  import { detectPlatform, type Platform } from "../lib/detectPlatform"; // Keep for tab URL detection
  import { fetchCreatorAndContentIds } from "../lib/creatorFinder"; // Import the creator fetching logic and its result type
  import {
    creatorIdentifier,
    identifiedCreator,
    identifiedCreatorContentIds,
    potentialUsernameToCreate,
    creatorOperationError,
    isCreatorLoading,
    resetCreatorStores,
  } from "../lib/store"; // Import stores

  const { onNavigate } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();

  // Local component state
  let currentTabUrl = $state(""); // Still needed to filter out current profile link
  // State to hold the username and platform determined by creatorFinder
  let lookupDetails = $state<{ username: string | null; platform: Platform | null } | null>(null);


  // --- Effects ---

  // Effect 1: Get current tab URL and potentially pre-fill identifier on load
  $effect(() => {
    // Ensure stores are reset when the component mounts/becomes active
    resetCreatorStores();
    lookupDetails = null; // Reset lookup details as well

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      currentTabUrl = tab?.url || "";
      if (tab?.url) {
        // Still use detectPlatform here just to pre-fill the input,
        // but the actual lookup logic relies solely on creatorFinder
        const { platform, username } = detectPlatform(tab.url);
        if (platform && username && !$creatorIdentifier) {
          creatorIdentifier.set(tab.url); // Set the store value, triggering the lookup effect
        }
      }
    });
  });

  // Effect 2: Trigger creator lookup when the identifier changes
  $effect(() => {
    const currentIdentifier = $creatorIdentifier; // Get reactive value

    if (!currentIdentifier || currentIdentifier.trim() === "") {
      identifiedCreator.set(null);
      identifiedCreatorContentIds.set(null);
      potentialUsernameToCreate.set(null);
      creatorOperationError.set(null);
      isCreatorLoading.set(false);
      lookupDetails = null; // Clear lookup details
      return;
    }

    const performLookup = async () => {
      isCreatorLoading.set(true);
      creatorOperationError.set(null);
      identifiedCreator.set(null);
      identifiedCreatorContentIds.set(null);
      potentialUsernameToCreate.set(null);
      lookupDetails = null; // Reset details before new lookup

      try {
        const result = await fetchCreatorAndContentIds(currentIdentifier);

        // Store the username and platform found by creatorFinder
        // This happens regardless of finding the creator, as long as a username was determined
        lookupDetails = { username: result.usernameFound, platform: result.platform };

        if (result.error) {
          creatorOperationError.set(result.error);
          if (result.error.includes("not found") && result.usernameFound) {
            potentialUsernameToCreate.set(result.usernameFound);
          }
        } else {
          identifiedCreator.set(result.creator);
          identifiedCreatorContentIds.set(result.contentIds);
        }
      } catch (err) {
        console.error("SearchPage: Unexpected error during lookup:", err);
        creatorOperationError.set(
          "An unexpected error occurred during the search."
        );
        identifiedCreator.set(null);
        identifiedCreatorContentIds.set(null);
        potentialUsernameToCreate.set(null);
        lookupDetails = null; // Clear details on unexpected error
      } finally {
        isCreatorLoading.set(false);
      }
    };

    performLookup();
  });

  // --- Derived State for UI ---

  // REMOVED: processedInput derived state

  // Links (remain the same)
  const socialLinks: [string, (v: string) => string][] = [
    ["Linktree", (v) => `https://linktr.ee/${encodeURIComponent(v)}`],
    ["OnlyFans", (v) => `https://onlyfans.com/${encodeURIComponent(v)}`],
    ["Fansly", (v) => `https://fansly.com/${encodeURIComponent(v)}`],
    ["Patreon", (v) => `https://www.patreon.com/${encodeURIComponent(v)}`],
  ];

  const adultLinks: [string, (v: string) => string][] = [
    [
      "Eporner",
      (v) => `https://www.eporner.com/search/${encodeURIComponent(v)}/`,
    ],
    [
      "Pornhub",
      (v) =>
        `https://www.pornhub.com/video/search?search=${encodeURIComponent(v)}`,
    ],
    ["Xvideos", (v) => `https://www.xvideos.com/?k=${encodeURIComponent(v)}`],
    ["XHamster", (v) => `https://xhamster.com/search/${encodeURIComponent(v)}`],
  ];

  const platformProfileLinks: [Platform, (u: string) => string][] = [
    ["twitch", (u) => `https://twitch.tv/${u}`],
    ["instagram", (u) => `https://instagram.com/${u}`],
    ["tiktok", (u) => `https://tiktok.com/@${u}`],
    ["twitter", (u) => `https://twitter.com/${u}`],
    ["youtube", (u) => `https://youtube.com/${u}`],
    ["facebook", (u) => `https://facebook.com/${u}`],
    ["onlyfans", (u) => `https://onlyfans.com/${u}`],
    // Add other platforms if needed
  ];

  // Filtered profiles - Use username from lookupDetails
  let filteredProfileLinks = $derived(() => {
    const username = lookupDetails?.username; // Use username from creatorFinder result
    if (username) {
      return (
        platformProfileLinks
          .map<[string, string]>(([p, fn]) => [
            p ? p[0].toUpperCase() + p.slice(1) : "",
            fn(username),
          ])
          .filter(([, url]) => url !== currentTabUrl) // Filter out current tab
      );
    }
    return [] as [string, string][];
  });

  // SocialBlade - Use platform and username from lookupDetails
  let socialBladeUrl = $derived(() => {
    const platform = lookupDetails?.platform; // Use platform from creatorFinder result
    const username = lookupDetails?.username; // Use username from creatorFinder result
    if (!platform || !username) return null;

    const map: Record<Exclude<Platform, null | undefined>, string> = {
      twitch: `https://socialblade.com/twitch/user/${username}`,
      instagram: `https://socialblade.com/instagram/user/${username}`,
      tiktok: `https://socialblade.com/tiktok/user/${username}`,
      youtube: `https://socialblade.com/youtube/${username}`,
      twitter: `https://socialblade.com/twitter/user/${username}`,
      facebook: "",
      onlyfans: "",
      linktree: "",
      linkinbio: "",
      fapello: "",
      kbjfree: "",
    };
    return map[platform] || null;
  });

  // --- Event Handlers ---
  function handleInput(value: string) {
    creatorIdentifier.set(value); // Update the store when input changes
  }
</script>

<div class="popup-body">
  <Header title="Leakr: Search" {onNavigate} />
  <SearchInput value={$creatorIdentifier ?? ""} onInput={handleInput} />

  <!-- Loading Indicator -->
  {#if $isCreatorLoading}
    <p>Loading...</p>
  {/if}

  <!-- Error Message -->
  {#if $creatorOperationError && !$isCreatorLoading}
    <p class="error-message">Error: {$creatorOperationError}</p>
  {/if}

  <!-- Creator Found Message -->
  {#if $identifiedCreator && !$isCreatorLoading}
    <p class="success-message">
      Found creator: {$identifiedCreator.nom} (ID: {$identifiedCreator.id})
      {#if $identifiedCreatorContentIds}
        ({$identifiedCreatorContentIds.length} content items)
      {/if}
    </p>
    <!-- Optionally navigate or show more details -->
  {/if}

  <!-- Prompt to Create Creator -->
  {#if $potentialUsernameToCreate && !$identifiedCreator && !$isCreatorLoading}
    <p>
      Creator "{$potentialUsernameToCreate}" not found.
      <button
        onclick={() =>
          onNavigate("AddCreatorPage", {
            username: $potentialUsernameToCreate, // Use the username creatorFinder suggested
          })}
        class="link-button"
      >
        Add them?
      </button>
    </p>
  {/if}

  <!-- Action Buttons - Show if creatorFinder determined a username -->
  {#if lookupDetails?.username && !$isCreatorLoading}
    <ActionButtons
      displayValue={lookupDetails.username}
      {socialLinks}
      {adultLinks}
      filteredProfileLinks={filteredProfileLinks()}
      socialBladeUrl={socialBladeUrl()}
    />
  {/if}
</div>

<style>
  @import "tailwindcss";

  .popup-body {
    background-color: #000;
    min-width: 320px;
    min-height: 400px; /* Added minimum height */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    color: #e5e7eb; /* text-gray-200 */
  }

  .error-message {
    color: #ef4444; /* text-red-500 */
    font-weight: bold;
  }

  .success-message {
    color: #22c55e; /* text-green-500 */
  }

  .link-button {
    background: none;
    border: none;
    color: #3b82f6; /* text-blue-500 */
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    margin-left: 0.5rem;
  }

  .link-button:hover {
    color: #60a5fa; /* text-blue-400 */
  }

  /* Add styles for loading indicator if needed */
</style>
