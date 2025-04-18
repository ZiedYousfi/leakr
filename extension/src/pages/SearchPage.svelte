<script lang="ts">
  import Header from "../components/Header.svelte";
  import SearchInput from "../components/SearchPage/SearchInput.svelte";
  import ActionButtons from "../components/SearchPage/ActionButtons.svelte";
  import { detectPlatform, type Platform } from "../detectPlatform";

  const { onNavigate } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();

  // States
  let inputValue = $state("");
  let currentTabUrl = $state("");

  // Derived reactivity
  let detectedResult = $derived(() => detectPlatform(inputValue.trim()));
  let detectedPlatform = $derived(() => detectedResult().platform);
  let detectedUsername = $derived(() => detectedResult().username);
  let displayValue = $derived(() => detectedUsername || inputValue.trim());

  // Lifecycle effect
  $effect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      currentTabUrl = tab?.url || "";
      if (tab?.url) {
        const { platform, username } = detectPlatform(tab.url);
        if (platform && username) {
          // const prefixMap: Record<Exclude<Platform, null | undefined>, string> = {
          //   twitch:    `https://twitch.tv/${username}`,
          //   instagram: `https://instagram.com/${username}`,
          //   tiktok:    `https://tiktok.com/@${username}`,
          //   twitter:   `https://twitter.com/${username}`,
          //   youtube:   `https://youtube.com/${username}`,
          //   facebook:  `https://facebook.com/${username}`,
          //   onlyfans:  `https://onlyfans.com/${username}`,
          // };
        }
      }
    });
  });

  // Links
  const socialLinks: [string, (v: string) => string][] = [
    ["Linktree", v => `https://linktr.ee/${encodeURIComponent(v)}`],
    ["OnlyFans", v => `https://onlyfans.com/${encodeURIComponent(v)}`],
    ["Fansly",   v => `https://fansly.com/${encodeURIComponent(v)}`],
    ["Patreon",  v => `https://www.patreon.com/${encodeURIComponent(v)}`],
  ];

  const adultLinks: [string, (v: string) => string][] = [
    ["Eporner",  v => `https://www.eporner.com/search/${encodeURIComponent(v)}/`],
    ["Pornhub",  v => `https://www.pornhub.com/video/search?search=${encodeURIComponent(v)}`],
    ["Xvideos",  v => `https://www.xvideos.com/?k=${encodeURIComponent(v)}`],
    ["XHamster", v => `https://xhamster.com/search/${encodeURIComponent(v)}`],
  ];

  const platformProfileLinks: [Platform, (u: string) => string][] = [
    ["twitch",    u => `https://twitch.tv/${u}`],
    ["instagram", u => `https://instagram.com/${u}`],
    ["tiktok",    u => `https://tiktok.com/@${u}`],
    ["twitter",   u => `https://twitter.com/${u}`],
    ["youtube",   u => `https://youtube.com/${u}`],
    ["facebook",  u => `https://facebook.com/${u}`],
    ["onlyfans",  u => `https://onlyfans.com/${u}`],
  ];

  // Filtered profiles
  let filteredProfileLinks = $derived(() => {
    if (detectedPlatform && detectedUsername) {
      return platformProfileLinks
        .filter(([p]) => p === detectedPlatform())
        .map<[string, string]>(([p, fn]) => [p ? p[0].toUpperCase() + p.slice(1) : "", fn(detectedUsername() ?? "")])
        .filter(([, url]) => url !== currentTabUrl);
    }
    return [] as [string, string][];
  });

  // SocialBlade
  let socialBladeUrl = $derived(() => {
    if (!detectedPlatform || !detectedUsername) return null;
    const map: Record<Exclude<Platform, null | undefined>, string> = {
      twitch:    `https://socialblade.com/twitch/user/${detectedUsername}`,
      instagram: `https://socialblade.com/instagram/user/${detectedUsername}`,
      tiktok:    `https://socialblade.com/tiktok/user/${detectedUsername}`,
      youtube:   `https://socialblade.com/youtube/${detectedUsername}`,
      twitter:   `https://socialblade.com/twitter/user/${detectedUsername}`,
      facebook:  "",
      onlyfans:  "",
    };
    const platform = detectedPlatform();
    if (!platform) return null;
    return map[platform] || null;
  });


</script>

<div class="popup-body">
  <Header
    title="Leakr"
    onNavigate={onNavigate}
  />
  <SearchInput
    value={inputValue}
    onInput={(value) => (inputValue = value)}
  />

  {#if displayValue()}
    <ActionButtons
      displayValue={displayValue().toString() || ""}
      socialLinks={socialLinks}
      adultLinks={adultLinks}
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
