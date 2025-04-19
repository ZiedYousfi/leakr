<script lang="ts">
  import { onMount } from "svelte";

  onMount(() => {
    chrome.runtime.openOptionsPage();
  });
</script>

<!-- Optionally display a loading message -->
<p>Redirection vers les paramètres…</p>
