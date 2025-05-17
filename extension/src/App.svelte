<script lang="ts">
  import SearchPage from "./pages/SearchPage.svelte";
  import ContentsPage from "./pages/ContentsPage.svelte";
  import CreatorsPage from "./pages/CreatorsPage.svelte";
  import OpenSettings from "./components/OpenSettings.svelte";
  import Footer from "./components/Footer.svelte";
  import { isAuthenticated, isLoadingAuth } from "./lib/authStore"; // Import from authStore

  // Define dimensions for each page
  const pageDimensions = $state({
    search: { width: "320px", height: "400px" },
    contents: { width: "600px", height: "700px" },
    creators: { width: "600px", height: "900px" },
    settings: { width: "350px", height: "450px" },
    default: { width: "400px", height: "500px" },
  });

  // Define a type for the valid page names based on the keys of pageDimensions
  type PageName = keyof typeof pageDimensions;
  // Helper to check if a string is a valid PageName
  function isValidPageName(page: string): page is PageName {
    return page in pageDimensions;
  }

  let currentPage: PageName = $state("search");
  let pageParams = $state({});

  // Accept string, but validate it's a PageName before assignment
  function navigate(page: string, params = {}) {
    if (isValidPageName(page)) {
      currentPage = page; // Now type-safe after check
      pageParams = params;
    } else {
      console.warn(`Attempted navigation to invalid page: ${page}`);
      // Optionally handle invalid navigation, e.g., navigate to default
      // currentPage = 'search';
    }
  }

  // Derive current dimensions based on currentPage
  let currentMinWidth = $derived(
    pageDimensions[currentPage]?.width ?? pageDimensions.default.width
  );
  let currentMinHeight = $derived(
    pageDimensions[currentPage]?.height ?? pageDimensions.default.height
  );

  const FOOTER_HEIGHT = "50px"; // Define footer height, adjust as needed

  // Determine if footer is visible to adjust padding
  let isFooterVisible = $derived($isLoadingAuth || !$isAuthenticated);
</script>

<!-- Apply dynamic sizing and transition to this container -->
<div
  class="app-container"
  style:min-width={currentMinWidth}
  style:min-height={currentMinHeight}
  style:padding-bottom={isFooterVisible ? FOOTER_HEIGHT : "0px"}
>
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
<Footer />

<!-- Render the Footer component -->

<style>
  .app-container {
    display: flex; /* Use flexbox to manage layout */
    flex-direction: column; /* Stack children vertically */
    background-color: #000; /* Example background */
    color: #e5e7eb; /* Example text color */
    overflow: hidden;
    /* Apply the transition effect */
    transition:
      min-width 0.3s ease,
      min-height 0.3s ease,
      padding-bottom 0.3s ease; /* Added transition for padding-bottom */
    /* Ensure the container itself doesn't add extra padding if pages handle their own */
    padding: 0; /* Padding-top, left, right remain 0 */
    margin: 0;
    box-sizing: border-box; /* Include padding and border in the element's total width and height */
    /* The actual height of the content area will be min-height minus FOOTER_HEIGHT */
    /* Ensure app-container can grow if content is larger than min-height */
    height: 100vh; /* Make app-container take full viewport height initially */
    /* This might need adjustment based on how extension popups are sized.
       If the popup size is fixed by manifest or currentMinHeight is the total,
       then height: 100% (of its parent, the body) might be more appropriate.
       For now, assuming the min-height is the primary driver.
    */
  }

  /* Ensure direct children fill the container if needed */
  .app-container > :global(*) {
    width: 100%;
    height: 100%;
    /*flex-grow: 1; /* Allow children to grow */
    display: flex; /* Ensure children can also use flex if needed */
    flex-direction: column; /* Default direction for children */
  }
</style>
