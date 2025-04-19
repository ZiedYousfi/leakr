<script lang="ts">
  import SearchPage from "./pages/SearchPage.svelte";
  import ContentsPage from "./pages/ContentsPage.svelte";
  import CreatorsPage from "./pages/CreatorsPage.svelte";
  import OpenSettings from "./components/OpenSettings.svelte";

  let currentPage = $state("search");
  let pageParams = $state({});

  function navigate(page: string, params = {}) {
    currentPage = page;
    pageParams = params;
  }
</script>

{#if currentPage === "search"}
  <SearchPage onNavigate={navigate} params={pageParams} />
{:else if currentPage === "contents"}
  <ContentsPage onNavigate={navigate} params={pageParams} />
{:else if currentPage === "creators"}
  <CreatorsPage onNavigate={navigate} params={pageParams} />
{:else if currentPage === "settings"}
  <OpenSettings />
{:else}
  <div>Page not found</div>
{/if}
