<script lang="ts">
  import type { Component } from "svelte";

  type Tab = {
    title: string;
    component: Component; // Use Component from 'svelte'
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

<nav class="tab-nav flex border-b">
  {#each tabs as tab, i}
    <button
      class="tab-button py-2 px-4 text-sm -mb-px border-b-2 border-transparent transition duration-200 ease-in-out outline-none focus-visible:ring-1 focus-visible:ring-night-violet rounded-sm {i === active ? 'active font-bold' : ''}"
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

<style lang="postcss">
  @reference "tailwindcss";

  .tab-nav {
    /* Use custom theme color for border */
    border-color: var(--tw-color-dark-grey, #4B4B4B);
  }

  .tab-button {
    /* Use custom theme font and color */
    font-family: var(--tw-font-mono, monospace);
    color: var(--tw-color-silver-grey, #B0B0B0);
    cursor: pointer; /* Keep cursor style */
  }

  .tab-button:hover {
    /* Use custom theme color */
    color: var(--tw-color-off-white, #E0E0E0);
  }

  .tab-button.active {
    /* Use custom theme color for text and border */
    color: var(--tw-color-night-violet, #7E5BEF);
    border-bottom-color: var(--tw-color-night-violet, #7E5BEF);
    /* font-weight: bold; is handled by utility class */
  }

  /*
     Note:
     - Standard layout (flex, py-2, px-4, text-sm, -mb-px),
     - Borders (border-b, border-b-2, border-transparent),
     - Transitions (transition, duration-200, ease-in-out),
     - Outlines (outline-none),
     - Focus styles (focus-visible:ring-1, focus-visible:ring-night-violet, rounded-sm),
     - Font weight (font-bold)
     are kept as utility classes in the HTML for better maintainability
     and adherence to Tailwind's principles.
     - Only custom theme values (colors, fonts) are applied here using CSS variables.
  */
</style>
