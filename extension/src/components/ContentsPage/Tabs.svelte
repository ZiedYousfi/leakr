<!-- Tabs.svelte -->
<script lang="ts">
  import type { ComponentType } from "svelte";

  type Tab = {
    title: string;
    component: ComponentType; // Use ComponentType from 'svelte'
    props: object;
  };

  let { tabs }: { tabs: Tab[] } = $props();
  let active = $state(0);

  // Log tabs and initial active index
  console.log("Tabs:", tabs);
  console.log("Initial active index:", () => active);

  // Derived state for the active component and props
  let activeComponent = $derived(tabs[active]?.component);
  let activeProps = $derived(tabs[active]?.props ?? {});

  // Log whenever active tab changes
  $effect(() => {
    // Access 'active' to make it a dependency
    const currentTab = tabs[active];
    console.log("Tab changed:", { activeIndex: active, tab: currentTab });
  });

  // Log active component and props
  $effect(() => {
    console.log("Active component:", activeComponent);
  });
  $effect(() => {
    console.log("Active props:", activeProps);
  });
</script>

<nav class="flex gap-2 border-b border-neutral-700 mb-4">
  {#each tabs as tab, i}
    <button
      class="px-3 py-1 text-sm rounded-t-lg
             {i === active
        ? 'bg-[#7E5BEF] text-white'
        : 'bg-neutral-800 text-[#B0B0B0]'}"
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
  button {
    transition: background-color 0.15s;
  }
</style>
