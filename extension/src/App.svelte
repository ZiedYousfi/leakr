<script lang="ts">
  import Header from "./components/Header.svelte";
  import SearchInput from "./components/SearchInput.svelte";
  import ActionButtons from "./components/ActionButtons.svelte";
  import { detectPlatform, type Platform } from "./detectPlatform";

  // États
  let inputValue = $state("");
  let showNav = $state(false);
  let currentTabUrl = $state("");

  // Réactivité dérivée
  let detectedResult = $derived(() => detectPlatform(inputValue.trim()));
  let detectedPlatform = $derived(() => detectedResult.platform);
  let detectedUsername = $derived(() => detectedResult.username);
  let displayValue = $derived(() => detectedUsername || inputValue.trim());

  // Effet de cycle de vie : pré-remplissage + clic hors menu
  $effect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      currentTabUrl = tab?.url || "";
      if (tab?.url) {
        const { platform, username } = detectPlatform(tab.url);
        if (platform && username) {
          const prefixMap: Record<Platform, string> = {
            twitch:    `https://twitch.tv/${username}`,
            instagram: `https://instagram.com/${username}`,
            tiktok:    `https://tiktok.com/@${username}`,
            twitter:   `https://twitter.com/${username}`,
            youtube:   `https://youtube.com/${username}`,
            facebook:  `https://facebook.com/${username}`,
            onlyfans:  `https://onlyfans.com/${username}`,
          };
          inputValue = prefixMap[platform] || "";
        }
      }
    });

    const handleClickOutside = (e: MouseEvent) => {
      const nav = document.getElementById("popup-nav");
      const burger = document.getElementById("burger-menu");
      if (nav && burger && !nav.contains(e.target as Node) && !burger.contains(e.target as Node)) {
        showNav = false;
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  });

  // Listes de liens
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

  // Filtrage des profils
  let filteredProfileLinks = $derived(() => {
    if (detectedPlatform && detectedUsername) {
      return platformProfileLinks
        .filter(([p]) => p === detectedPlatform)
        .map(([p, fn]) => [p[0].toUpperCase() + p.slice(1), fn(detectedUsername!)])
        .filter(([, url]) => url !== currentTabUrl);
    }
    return [];
  });

  // SocialBlade
  let socialBladeUrl = $derived(() => {
    if (!detectedPlatform || !detectedUsername) return null;
    const map: Record<Platform, string> = {
      twitch:    `https://socialblade.com/twitch/user/${detectedUsername}`,
      instagram: `https://socialblade.com/instagram/user/${detectedUsername}`,
      tiktok:    `https://socialblade.com/tiktok/user/${detectedUsername}`,
      youtube:   `https://socialblade.com/youtube/${detectedUsername}`,
      twitter:   `https://socialblade.com/twitter/user/${detectedUsername}`,
      facebook:  "",
      onlyfans:  "",
    };
    return map[detectedPlatform] || null;
  });

  function onclickToggle() {
    showNav = !showNav;
  }
</script>

<div class="popup-body">
  <Header
    title="Leakr"
    {showNav}
    onclickToggle={onclickToggle}
  />
  <SearchInput
    bind:value={inputValue}
    on:input={(e) => (inputValue = e.detail)}
  />

  {#if displayValue}
    <ActionButtons
      {displayValue}
      socialLinks={socialLinks}
      adultLinks={adultLinks}
      filteredProfileLinks={$filteredProfileLinks}
      socialBladeUrl={$socialBladeUrl}
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
