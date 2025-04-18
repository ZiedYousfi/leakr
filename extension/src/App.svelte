<script lang="ts">
  import SearchPage from "./pages/SearchPage.svelte";
  import ContentsPage from "./pages/ContentsPage.svelte";
  import CreatorsPage from "./pages/CreatorsPage.svelte";

  // Use $state for reactive variables
  let currentPage = $state("search");
  let pageParams = $state({});

  // Navigation function
  function navigate(page: string, params = {}) {
    currentPage = page;
    pageParams = params;
  }
</script>

<!-- Router implementation -->
{#if currentPage === "search"}
  <SearchPage onNavigate={navigate} params={pageParams} />
{:else if currentPage === "contents"}
  <ContentsPage onNavigate={navigate} params={pageParams} />
{:else if currentPage === "creators"}
  <CreatorsPage onNavigate={navigate} params={pageParams} />
{/if}
