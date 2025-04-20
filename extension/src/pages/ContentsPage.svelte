<script lang="ts">
  import type { Component } from "svelte";
  import Tabs from "@/components/Tabs.svelte";
  import CreatorTab from "@/components/ContentsPage/Tabs/CreatorTab.svelte";
  import All from "@/components/ContentsPage/Tabs/All.svelte";
  import Favorites from "@/components/ContentsPage/Tabs/Favorites.svelte";
  import Header from "@/components/Header.svelte";

  type Tab = {
    title: string;
    component: Component;
    props: object;
  };

  // Assuming onNavigate and params are props passed to this component
  let { onNavigate, params } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();

  let activeTabIndex = $state(0); // State to hold the active tab index

  const tabs: Tab[] = $derived([
    {
      title: "All",
      component: All as unknown as Component, // Cast to unknown first
      props: { params },
    },
    {
      title: "Favorites",
      component: Favorites as unknown as Component, // Cast to unknown first
      props: { params },
    },
    {
      title: "For Creator",
      component: CreatorTab as unknown as Component, // Cast to unknown first
      props: { params },
    },
    // ➜ Ajoute ici autant d’onglets que tu veux
  ]);

  // Define widths based on tab index (example)
  const widths = ['500px', '600px']; // Width for 'All', Width for 'For Creator'
  let currentMinWidth = $derived(widths[activeTabIndex] ?? '500px');

  // Define heights based on tab index (example)
  const heights = ['600px', '700px']; // Height for 'All', Height for 'For Creator'
  let currentMinHeight = $derived(heights[activeTabIndex] ?? '600px');

</script>

<!-- Apply the dynamic min-width and min-height -->
<div class="page-container" style:min-width={currentMinWidth} style:min-height={currentMinHeight}>
  <Header title="Leakr: Contents" {onNavigate} />
  <!-- Bind the activeTabIndex -->
  <Tabs {tabs} bind:active={activeTabIndex} />
</div>

<style>
  @import "tailwindcss";

  .page-container {
    background-color: #000; /* Match SearchPage background */
    display: flex; /* Match SearchPage layout */
    flex-direction: column; /* Match SearchPage layout */
    align-items: center; /* Match SearchPage layout */
    gap: 1rem; /* Match SearchPage gap */
    padding: 1rem; /* Match SearchPage padding */
    color: #e5e7eb; /* Match SearchPage text color */
    overflow: hidden; /* Ensure no overflow */
    transition: min-width 0.3s ease, min-height 0.3s ease;
  }
</style>
