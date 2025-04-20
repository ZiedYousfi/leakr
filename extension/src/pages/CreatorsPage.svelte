<script lang="ts">
  import type { Component } from "svelte";
  import Tabs from "@/components/Tabs.svelte";
  import Selector from "@/components/CreatorsPage/Tabs/Selector.svelte";
  import Profile from "@/components/CreatorsPage/Tabs/Profile.svelte";
  import Header from "@/components/Header.svelte";
  // Import other potential tabs here, e.g., AddCreatorTab, EditCreatorTab

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

  // Function to switch to the Profile tab (index 1)
  function switchToProfileTab() {
    activeTabIndex = 1;
  }

  const tabs: Tab[] = $derived([
    {
      title: "Select Creator",
      component: Selector as unknown as Component, // Cast to unknown first
      // Pass the callback function as a prop
      props: { params, onCreatorSelected: switchToProfileTab },
    },
    {
      title: "Profile",
      component: Profile as unknown as Component, // Add Profile tab
      props: { params }, // Pass any necessary props to Profile
    },
  ]);

  // Define widths based on tab index (adjust as needed)
  const widths = ['500px', '500px']; // Example widths for Selector and Profile tabs
  let currentMinWidth = $derived(widths[activeTabIndex] ?? '500px');

  // Define heights based on tab index (adjust as needed)
  const heights = ['600px', '600px']; // Example heights for Selector and Profile tabs
  let currentMinHeight = $derived(heights[activeTabIndex] ?? '600px');

</script>

<!-- Apply the dynamic min-width and min-height -->
<div class="page-container" style:min-width={currentMinWidth} style:min-height={currentMinHeight}>
  <Header title="Leakr: Creators" {onNavigate} />
  <!-- Bind the activeTabIndex -->
  <Tabs {tabs} bind:active={activeTabIndex} />
</div>

<style>
  @import "tailwindcss";

  .page-container {
    background-color: #000; /* Match other pages */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    color: #e5e7eb; /* Match other pages */
    overflow: hidden;
    transition: min-width 0.3s ease, min-height 0.3s ease;
  }
</style>
