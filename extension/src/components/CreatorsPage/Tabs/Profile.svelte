<script lang="ts">
  // Keep only necessary imports
  import { identifiedCreator } from "@/lib/store";
  import CreatorHeader from "./ProfileComponents/CreatorHeader.svelte";
  import PlatformProfilesList from "./ProfileComponents/PlatformProfilesList.svelte";
  import CreatorContentSection from "./ProfileComponents/CreatorContentSection.svelte";

</script>

<div class="p-4 space-y-4 text-sm max-w-600 max-h-700 overflow-y-auto">
  {#if $identifiedCreator}
    {@const creator = $identifiedCreator}
    <!-- Pass only the creator object to CreatorHeader -->
    <CreatorHeader {creator} />

    <!-- PlatformProfilesList fetches its own data -->
    <PlatformProfilesList />

    <!-- CreatorContentSection fetches its own data -->
    <CreatorContentSection />

  {:else}
    <p class="text-gray-400 text-center p-4">No creator identified.</p>
  {/if}
</div>

<style>
  @import "tailwindcss";
</style>
