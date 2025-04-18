<script lang="ts">
  const showNavState = $state(false);
  const { title, showNav = () => showNavState, onclickToggle } = $props<{
    title: string;
    showNav?: boolean;
    onclickToggle: () => void;
  }>();
</script>

<header class="popup-header">
  <h1 class="popup-title">{title}</h1>
  <button
    id="burger-menu"
    class="burger-menu"
    aria-label="Menu"
    onclick={onclickToggle}
  >
    <span></span><span></span><span></span>
  </button>

  {#if showNav}
    <nav id="popup-nav" class="popup-nav">
      <button type="button" class="nav-link" style="background:none;border:none;padding:0;cursor:pointer;">Search</button>
      <button type="button" class="nav-link" style="background:none;border:none;padding:0;cursor:pointer;">Content</button>
      <button type="button" class="nav-link" style="background:none;border:none;padding:0;cursor:pointer;">Creators</button>
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
  }
  .burger-menu {
    width: 2rem;
    height: 2rem;
    background: none;
    border: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.3rem;
    cursor: pointer;
    z-index: 10;
    padding: 0;
  }
  .burger-menu span {
    display: block;
    height: 3px;
    width: 100%;
    background: #b0b0b0;
    border-radius: 2px;
    transition: all 0.3s;
  }
  .popup-nav {
    position: absolute;
    top: 2.5rem;
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
  }
  .nav-link:hover {
    background: #7e5bef;
    color: #fff;
  }
</style>
