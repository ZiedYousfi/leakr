<script lang="ts">
  import type { ComponentType } from "svelte";
  import Tabs from "@/components/ContentsPage/Tabs.svelte";
  import CreatorTab from "@/components/ContentsPage/Tabs/CreatorTab.svelte";
  import All from "@/components/ContentsPage/Tabs/All.svelte";
  import Header from "@/components/Header.svelte";

  type Tab = {
    title: string;
    component: ComponentType;
    props: object;
  };

  // Assuming onNavigate and params are props passed to this component
  let { onNavigate, params } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();
  const tabs: Tab[] = $derived([
    {
      title: "All",
      component: All as unknown as ComponentType, // Cast to unknown first
      props: { params },
    },
    {
      title: "For Creator",
      component: CreatorTab as unknown as ComponentType, // Cast to unknown first
      props: { params },
    },
    // ➜ Ajoute ici autant d’onglets que tu veux
  ]);
</script>

<div class="page-container">
  <Header title="Leakr" {onNavigate} />
  <Tabs {tabs} />
</div>

<style>
  @import "tailwindcss";

  .page-container {
    background-color: #000; /* Match SearchPage background */
    min-width: 320px; /* Match SearchPage min-width */
    display: flex; /* Match SearchPage layout */
    flex-direction: column; /* Match SearchPage layout */
    align-items: center; /* Match SearchPage layout */
    gap: 1rem; /* Match SearchPage gap */
    padding: 1rem; /* Match SearchPage padding */
    color: #e5e7eb; /* Match SearchPage text color */
    min-height: 100vh; /* Keep full height */
  }
</style>
