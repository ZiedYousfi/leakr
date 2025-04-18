<script lang="ts">
  import Header from "../components/Header.svelte";
  import SearchInput from "../components/SearchPage/SearchInput.svelte";
  import ActionButtons from "../components/SearchPage/ActionButtons.svelte";
  import { detectPlatform, type Platform } from "../lib/detectPlatform";

  const { onNavigate } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();

  // States
  let inputValue = $state("");
  let currentTabUrl = $state("");
  let detectedPlatformState: Platform = $state(null);
  let detectedUsernameState: string | null = $state(null);
  let displayValueState: string = $state("");
  let initialUrlChecked = $state(false); // Flag to prevent overwriting user input

  // Effect to update platform/username based on input
  $effect(() => {
    const input = inputValue.trim();
    const { platform, username } = detectPlatform(input);
    detectedPlatformState = platform;
    detectedUsernameState = username;
    displayValueState = username || input;
  });

  // Effect to get current tab URL and pre-fill input if applicable
  $effect(() => {
    if (initialUrlChecked) return; // Only run once initially

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      currentTabUrl = tab?.url || "";
      if (tab?.url) {
        const { platform, username } = detectPlatform(tab.url);
        // Check if the current URL corresponds to a known platform profile
        if (platform && username) {
          // Pre-fill the input field only if it's currently empty
          if (inputValue === "") {
            inputValue = tab.url;
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

  // Filtered profiles - Show all platform links based on detected username
  let filteredProfileLinks = $derived(() => {
    const username = detectedUsernameState; // Read state
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
      ); // Read state
    }
    // Return empty array if no username is detected
    return [] as [string, string][];
  });

  // SocialBlade - Still using $derived, but based on the new $state variables
  let socialBladeUrl = $derived(() => {
    const platform = detectedPlatformState; // Read state
    const username = detectedUsernameState; // Read state
    if (!platform || !username) return null;
    const map: Record<Exclude<Platform, null | undefined>, string> = {
      twitch: `https://socialblade.com/twitch/user/${username}`,
      instagram: `https://socialblade.com/instagram/user/${username}`,
      tiktok: `https://socialblade.com/tiktok/user/${username}`,
      youtube: `https://socialblade.com/youtube/${username}`, // Note: SocialBlade uses different structures for YouTube sometimes
      twitter: `https://socialblade.com/twitter/user/${username}`,
      facebook: "", // No direct SB link usually
      onlyfans: "", // No SB link
    };
    return map[platform] || null;
  });
</script>

<div class="popup-body">
  <Header title="Leakr" {onNavigate} />
  <SearchInput value={inputValue} onInput={(value) => (inputValue = value)} />

  {#if displayValueState}
    <ActionButtons
      displayValue={displayValueState}
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
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    color: #e5e7eb;
  }
</style>
