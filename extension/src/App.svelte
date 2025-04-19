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

  // Define dimensions for each page
  const pageDimensions = $state({
    search: { width: '320px', height: '400px' },
    contents: { width: '600px', height: '700px' },
    creators: { width: '450px', height: '550px' },
    settings: { width: '350px', height: '450px' },
    default: { width: '400px', height: '500px' }
  });

  // Derive current dimensions based on currentPage
  let currentMinWidth = $derived(pageDimensions[currentPage]?.width ?? pageDimensions.default.width);
  let currentMinHeight = $derived(pageDimensions[currentPage]?.height ?? pageDimensions.default.height);

</script>

<!-- Apply dynamic sizing and transition to this container -->
<div class="app-container" style:min-width={currentMinWidth} style:min-height={currentMinHeight}>
  {#if currentPage === "search"}
    <SearchPage onNavigate={navigate} params={pageParams} />
  {:else if currentPage === "contents"}
    <!-- Note: ContentsPage also has its own internal sizing based on tabs -->
    <ContentsPage onNavigate={navigate} params={pageParams} />
  {:else if currentPage === "creators"}
    <CreatorsPage onNavigate={navigate} params={pageParams} />
  {:else if currentPage === "settings"}
    <OpenSettings />
  {:else}
    <div>Page not found</div>
  {/if}
</div>

<style>
  .app-container {
    display: flex; /* Use flexbox to manage layout */
    flex-direction: column; /* Stack children vertically */
    background-color: #000; /* Example background */
    color: #e5e7eb; /* Example text color */
    overflow: hidden; /* Prevent content spill during transition */
    /* Apply the transition effect */
    transition: min-width 0.3s ease, min-height 0.3s ease;
    /* Ensure the container itself doesn't add extra padding if pages handle their own */
    padding: 0;
    margin: 0;
    box-sizing: border-box; /* Include padding and border in the element's total width and height */
  }

  /* Ensure direct children fill the container if needed */
  .app-container > :global(*) {
     width: 100%;
     height: 100%;
     flex-grow: 1; /* Allow children to grow */
     display: flex; /* Ensure children can also use flex if needed */
     flex-direction: column; /* Default direction for children */
  }
</style>
