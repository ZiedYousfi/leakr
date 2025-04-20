<script lang="ts">
  import { identifiedCreator } from "@/lib/store";
</script>

<div>
  {#if $identifiedCreator}
    Profile for: {$identifiedCreator.nom}
  {:else}
    No creator identified.
  {/if}
</div>

<style>
</style>
