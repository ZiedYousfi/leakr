<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  //import SettingsIcon from './SettingsIcon.svelte'; // Assuming you create a SettingsIcon.svelte component

  let showNav = $state(false);
  let headerElement: HTMLElement | undefined; // Reference to the header element

  const { title, onNavigate } = $props<{
    title: string;
    onNavigate?: (page: string) => void;
  }>();

  function toggleNav() {
    showNav = !showNav;
  }

  function closeNav() {
    showNav = false;
  }

  function navigate(page: string) {
    if (onNavigate) {
      onNavigate(page);
    }
    closeNav(); // Close nav after navigation
  }

  function handleClickOutside(event: MouseEvent) {
    if (headerElement && !headerElement.contains(event.target as Node)) {
      closeNav();
    }
  }

  onMount(() => {
    // Add listener when component mounts
    document.addEventListener('click', handleClickOutside, true);
  });

  onDestroy(() => {
    // Remove listener when component unmounts
    document.removeEventListener('click', handleClickOutside, true);
  });
</script>

<header class="popup-header" bind:this={headerElement}>
  <h1 class="popup-title">{title}</h1>
  <div class="header-actions">
    <button
      type="button"
      class="icon-button settings-button"
      aria-label="Settings"
      onclick={() => navigate('settings')}
    >
      <!-- You can use an SVG directly or import a component -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M19.479 10.092C19.272 9.16 18.788 8.346 18.1 7.715L17.7 7.358C17.094 6.81 16.357 6.408 15.554 6.182L15.1 6.045C14.139 5.78 13.097 5.658 12 5.658C10.903 5.658 9.861 5.78 8.9 6.045L8.446 6.182C7.643 6.408 6.906 6.81 6.3 7.358L5.9 7.715C5.212 8.346 4.728 9.16 4.521 10.092L4.4 10.577C4.24 11.419 4.24 12.581 4.4 13.423L4.521 13.908C4.728 14.84 5.212 15.654 5.9 16.285L6.3 16.642C6.906 17.19 7.643 17.592 8.446 17.818L8.9 17.955C9.861 18.22 10.903 18.342 12 18.342C13.097 18.342 14.139 18.22 15.1 17.955L15.554 17.818C16.357 17.592 17.094 17.19 17.7 16.642L18.1 16.285C18.788 15.654 19.272 14.84 19.479 13.908L19.6 13.423C19.76 12.581 19.76 11.419 19.6 10.577L19.479 10.092ZM12 15.75C10.481 15.75 9.25 14.519 9.25 13C9.25 11.481 10.481 10.25 12 10.25C13.519 10.25 14.75 11.481 14.75 13C14.75 14.519 13.519 15.75 12 15.75Z"/>
      </svg>
    </button>
    <button
      id="burger-menu"
      class="icon-button burger-menu"
      aria-label="Menu"
      onclick={toggleNav}
    >
      <span></span><span></span><span></span>
    </button>
  </div>

  {#if showNav}
    <nav id="popup-nav" class="popup-nav">
      <button type="button" class="nav-link" onclick={() => navigate('search')}>Search</button>
      <button type="button" class="nav-link" onclick={() => navigate('contents')}>Contents</button>
      <button type="button" class="nav-link" onclick={() => navigate('creators')}>Creators</button>
      <!-- Settings button removed from here -->
    </nav>
  {/if}
</header>

<style>
  .popup-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    margin-bottom: 1rem;
  }
  .popup-title {
    font-family: "JetBrains Mono", "Inter", monospace;
    color: #7e5bef;
    font-size: 1.5rem;
    letter-spacing: 0.05em;
    font-weight: 700;
    background: linear-gradient(90deg, #7e5bef 80%, #b0b0b0 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 8px #000a;
    margin: 0;
    /* Make space for icons */
    margin-right: auto;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* Add space between icons */
  }
  .icon-button {
    width: 2rem;
    height: 2rem;
    background: none;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    color: #b0b0b0; /* Icon color */
    transition: color 0.2s;
  }
  .icon-button:hover {
    color: #7e5bef; /* Icon hover color */
  }
  .settings-button svg {
     width: 20px; /* Adjust size as needed */
     height: 20px;
  }
  .burger-menu {
    /* Inherits from .icon-button, specific styles below */
    flex-direction: column;
    justify-content: center;
    gap: 0.3rem;
    z-index: 10;
  }
  .burger-menu span {
    display: block;
    height: 3px;
    width: 100%;
    background: currentColor; /* Use button color */
    border-radius: 2px;
    transition: all 0.3s;
  }
  .popup-nav {
    position: absolute;
    top: 3.5rem; /* Adjusted top position */
    right: 0;
    background: #1a1a1a;
    border: 1px solid #7e5bef;
    border-radius: 0.5rem;
    box-shadow: 0 4px 16px #000a;
    display: flex;
    flex-direction: column;
    min-width: 8rem;
    padding: 0.5rem 0;
    z-index: 9;
    transition: opacity 0.2s, visibility 0.2s;
    opacity: 1;
    visibility: visible;
  }
  .nav-link {
    color: #b0b0b0;
    text-decoration: none;
    padding: 0.5rem 1.5rem;
    font-family: "JetBrains Mono", "Inter", monospace;
    font-size: 1rem;
    transition: background 0.2s, color 0.2s;
    white-space: nowrap;
    background: none; /* Ensure button background is transparent */
    border: none; /* Ensure button border is none */
    text-align: left; /* Align text left */
    cursor: pointer; /* Add cursor pointer */
    width: 100%; /* Make button full width */
  }
  .nav-link:hover {
    background: #7e5bef;
    color: #fff;
  }
</style>
