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
  const widths = ["500px", "600px"]; // Width for 'All', Width for 'For Creator'
  let currentMinWidth = $derived(widths[activeTabIndex] ?? "500px");

  // Define heights based on tab index (example)
  // const heights = ["600px", "700px"]; // Height for 'All', Height for 'For Creator' // REMOVED
  // let currentMinHeight = $derived(heights[activeTabIndex] ?? "600px"); // REMOVED
</script>

<!-- Apply the dynamic min-width -->
<div class="page-container" style:min-width={currentMinWidth}>
  <div class="header-wrapper">
    <Header title="Leakr: Contents" {onNavigate} />
  </div>
  <!-- Bind the activeTabIndex -->
  <Tabs {tabs} bind:active={activeTabIndex} />
</div>

<style>
  @import "tailwindcss";

  .page-container {
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* gap: 1rem; Removed */
    /* padding: 0.5rem; Removed */
    color: #e5e7eb;
    overflow: clip;
    transition: min-width 0.3s;
    /* min-height 0.3s; Removed */
  }

  .header-wrapper {
    width: 100%;
    padding: 1rem;
    box-sizing: border-box;
    margin-bottom: 0.5rem; /* Added to control space below header */
  }
</style>
