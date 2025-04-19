<script lang="ts">
  import Header from "../components/Header.svelte";
  import SearchInput from "../components/SearchPage/SearchInput.svelte";
  import ActionButtons from "../components/SearchPage/ActionButtons.svelte";
  import { detectPlatform, type Platform } from "../lib/detectPlatform"; // Keep for tab URL detection
  import {
    processSearchInput,
    type SearchResult,
  } from "../lib/searchProcessor"; // Import the new processor

  const { onNavigate } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();

  // States
  let inputValue = $state("");
  let currentTabUrl = $state("");
  let initialUrlChecked = $state(false); // Flag to prevent overwriting user input

  // Derived state for search results based on input value
  let searchResult = $derived<SearchResult>(processSearchInput(inputValue));

  // Effect to get current tab URL and pre-fill input if applicable
  $effect(() => {
    if (initialUrlChecked) return; // Only run once initially

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      currentTabUrl = tab?.url || "";
      if (tab?.url) {
        // Still use detectPlatform here for the initial URL check
        const { platform, username } = detectPlatform(tab.url);
        // Check if the current URL corresponds to a known platform profile
        if (platform && username) {
          // Pre-fill the input field only if it's currently empty
          if (inputValue === "") {
            inputValue = tab.url; // This will trigger the $derived searchResult update
          }
        }
      }
      initialUrlChecked = true; // Mark as checked
    });
  });

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
  ];

  // Filtered profiles - Use derived searchResult
  let filteredProfileLinks = $derived(() => {
    const username = searchResult.username; // Use derived result
    if (username) {
      // Map over all platform links, generating the URL with the detected username
      return (
        platformProfileLinks
          .map<[string, string]>(([p, fn]) => [
            p ? p[0].toUpperCase() + p.slice(1) : "",
            fn(username),
          ])
          // Still filter out the link if it matches the current tab URL
          .filter(([, url]) => url !== currentTabUrl)
      );
    }
    // Return empty array if no username is detected
    return [] as [string, string][];
  });
  // SocialBlade - Use derived searchResult
  let socialBladeUrl = $derived(() => {
    const platform = searchResult.platform; // Use derived result
    const username = searchResult.username; // Use derived result
    if (!platform || !username) return null;
    const map: Record<Exclude<Platform, null | undefined>, string> = {
      twitch: `https://socialblade.com/twitch/user/${username}`,
      instagram: `https://socialblade.com/instagram/user/${username}`,
      tiktok: `https://socialblade.com/tiktok/user/${username}`,
      youtube: `https://socialblade.com/youtube/${username}`, // Note: SocialBlade uses different structures for YouTube sometimes
      twitter: `https://socialblade.com/twitter/user/${username}`,
      facebook: "", // No direct SB link usually
      onlyfans: "", // No SB link
      linktree: "", // No SB link
      linkinbio: "", // No SB link
      fapello: "", // No SB link
      kbjfree: "", // No SB link
    };
    return map[platform] || null;
  });
</script>

<div class="popup-body">
  <Header title="Leakr" {onNavigate} />
  <SearchInput value={inputValue} onInput={(value) => (inputValue = value)} />

  {#if searchResult.displayValue}
    <ActionButtons
      displayValue={searchResult.displayValue}
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
    color: #e5e7eb;
  }
</style>
