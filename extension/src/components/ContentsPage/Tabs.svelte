<script lang="ts">
  import type { ComponentType } from "svelte";

  type Tab = {
    title: string;
    component: ComponentType; // Use ComponentType from 'svelte'
    props: object;
  };

  let { tabs, active = $bindable(0) }: { tabs: Tab[]; active?: number } = $props(); // Make active bindable

  // Derived state for the active component and props
  let activeComponent = $derived(tabs[active]?.component);
  let activeProps = $derived(tabs[active]?.props ?? {});

  // Log whenever active tab changes
  $effect(() => {
    // Access 'active' to make it a dependency
    const currentTab = tabs[active];
    console.log("Tab changed:", { activeIndex: active, tab: currentTab });
  });
</script>

<nav class="tab-nav">
  {#each tabs as tab, i}
    <button
      class="tab-button {i === active ? 'active' : ''}"
      onclick={() => (active = i)}
    >
      {tab.title}
    </button>
  {/each}
</nav>

<!-- On affiche dynamiquement le composant sélectionné -->
{#if activeComponent}
  <!-- TODO: won't fucking work without svelte:component but it's deprecated so find a fix later (when it will stop compiling :') )-->
  <svelte:component this={activeComponent} {...activeProps} />
{/if}

<style>
  .tab-nav {
    display: flex;
    border-bottom: 1px solid #333; /* Darker border for separation */
    margin-bottom: 1rem; /* Space below the tabs */
    padding-left: 0.5rem; /* Align with potential page padding */
  }

  .tab-button {
    font-family: monospace; /* Keep the techy font */
    background-color: transparent; /* Default transparent background */
    color: #b0b0b0; /* Silver gray text */
    border: none;
    border-bottom: 2px solid transparent; /* Placeholder for active indicator */
    padding: 0.5rem 1rem; /* Comfortable padding */
    cursor: pointer;
    font-size: 0.9rem;
    margin-bottom: -1px; /* Overlap the nav border */
    transition:
      color 0.2s ease-in-out,
      border-color 0.2s ease-in-out;
    outline: none; /* Remove default focus outline */
  }

  .tab-button:hover {
    color: #ffffff; /* Brighter on hover */
  }

  .tab-button.active {
    color: #7e5bef; /* Night violet for active tab text */
    border-bottom: 2px solid #7e5bef; /* Night violet underline for active tab */
    font-weight: bold;
  }

  /* Optional: Add a subtle focus style */
  .tab-button:focus-visible {
    box-shadow: 0 0 0 1px #7e5bef; /* Violet outline on focus */
    border-radius: 2px;
  }
</style>
