<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import SettingsIcon from "../../public/settings-cog-svgrepo-com.svg";

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
    document.addEventListener("click", handleClickOutside, true);
  });

  onDestroy(() => {
    // Remove listener when component unmounts
    document.removeEventListener("click", handleClickOutside, true);
  });
</script>

<header
  class="popup-header flex items-center justify-between relative"
  bind:this={headerElement}
>
  <h1 class="popup-title mr-auto">{title}</h1>
  <div class="header-actions flex items-center gap-2">
    <button
      type="button"
      class="icon-button settings-button flex items-center justify-center cursor-pointer p-0"
      aria-label="Settings"
      onclick={() => navigate("settings")}
    >
      <img
        src={SettingsIcon}
        alt="Settings"
        width="16"
        height="16"
        class="settings-icon"
      />
    </button>
    <button
      id="burger-menu"
      class="icon-button burger-menu flex items-center justify-center cursor-pointer p-0"
      aria-label="Menu"
      onclick={toggleNav}
    >
      <span></span><span></span><span></span>
    </button>
  </div>

  {#if showNav}
    <nav
      id="popup-nav"
      class="popup-nav absolute top-14 right-0 rounded-lg shadow-lg flex flex-col min-w-32 z-10 transition-opacity transition-visibility opacity-100 visible"
    >
      <button
        type="button"
        class="nav-link text-left cursor-pointer w-full whitespace-nowrap bg-none border-none py-2 px-6 transition"
        onclick={() => navigate("search")}>Search</button
      >
      <button
        type="button"
        class="nav-link text-left cursor-pointer w-full whitespace-nowrap bg-none border-none py-2 px-6 transition"
        onclick={() => navigate("contents")}>Contents</button
      >
      <button
        type="button"
        class="nav-link text-left cursor-pointer w-full whitespace-nowrap bg-none border-none py-2 px-6 transition"
        onclick={() => navigate("creators")}>Creators</button
      >
    </nav>
  {/if}
</header>

<style lang="postcss">
  @reference "tailwindcss";

  .popup-header {
    width: 100%;
    /* Tailwind classes: flex items-center justify-between relative */
  }

  .popup-title {
    font-family: var(--tw-font-mono, "Fira Mono", monospace);
    color: var(--tw-color-night-violet, #7e5bef);
    font-size: 1.5rem; /* Kept custom size */
    letter-spacing: 0.05em;
    font-weight: 700;
    background: linear-gradient(
      90deg,
      var(--tw-color-night-violet, #7e5bef) 80%,
      var(--tw-color-silver-grey, #b0b0b0) 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6); /* Kept custom shadow */
    margin: 0;
    /* Tailwind classes: mr-auto */
  }

  .header-actions {
    /* Tailwind classes: flex items-center gap-2 */
  }

  .icon-button {
    width: 2rem;
    height: 2rem;
    background: none;
    border: none;
    color: var(--tw-color-silver-grey, #b0b0b0);
    transition: color 0.2s;
    /* Tailwind classes: flex items-center justify-center cursor-pointer p-0 */
  }

  .icon-button:hover {
    color: var(--tw-color-night-violet, #7e5bef);
  }

  .settings-icon {
    filter: brightness(0) invert(0.7); /* Makes the SVG light gray to match burger menu */
    width: 16px;
    height: 16px;
  }

  .settings-icon:hover {
    filter: brightness(0) saturate(100%) invert(36%) sepia(67%) saturate(749%) hue-rotate(222deg) brightness(98%) contrast(101%);
    transition: filter 0.2s;
  }

  .burger-menu {
    /* Inherits from .icon-button */
    flex-direction: column;
    justify-content: center; /* Centering handled by flex */
    gap: 0.3rem; /* Kept custom gap */
    z-index: 10; /* Kept custom z-index */
  }

  .burger-menu span {
    display: block;
    height: 3px;
    width: 100%;
    background: currentColor; /* Uses .icon-button color */
    border-radius: 2px;
    transition: all 0.3s;
  }

  .popup-nav {
    /* Tailwind classes: absolute top-14 right-0 rounded-lg shadow-lg flex flex-col min-w-32 z-10 transition-opacity transition-visibility opacity-100 visible */
    background: var(
      --tw-color-deep-black,
      #000000
    ); /* Using deep-black from theme */
    border: 1px solid var(--tw-color-night-violet, #7e5bef);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6); /* Kept custom shadow */
    /* Tailwind py-2 handles vertical padding */
  }

  .nav-link {
    /* Tailwind classes: text-left cursor-pointer w-full whitespace-nowrap bg-none border-none py-2 px-6 transition */
    color: var(--tw-color-silver-grey, #b0b0b0);
    text-decoration: none;
    font-family: var(--tw-font-mono, "Fira Mono", monospace);
    font-size: 1rem; /* Tailwind text-base equivalent */
    transition:
      background 0.2s,
      color 0.2s; /* Combined with Tailwind transition */
  }

  .nav-link:hover {
    background: var(--tw-color-night-violet, #7e5bef);
    color: var(--tw-color-off-white, #e0e0e0); /* Using off-white from theme */
  }
</style>
