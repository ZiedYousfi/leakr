<script lang="ts">
  let { url } = $props<{ url: string }>();

  function onclick() {
    chrome.tabs.create({ url });
  }
</script>

<button class="action-button flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out border cursor-pointer w-full text-center focus:outline-none focus:ring-offset-2" {onclick}>
  📊 Social Blade
</button>

<style lang="postcss">
  .action-button {
    background-color: transparent;
    color: var(--tw-color-off-white, #E0E0E0);
    font-family: var(--tw-font-mono);
    border-color: var(--tw-color-night-violet, #7E5BEF);
  }

  .action-button:hover {
    background-color: var(--tw-color-night-violet, #7E5BEF);
    color: var(--tw-color-white, #FFFFFF);
    animation: var(--tw-animation-pulse-glow);
  }

  .action-button:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
    --tw-ring-color: var(--tw-color-night-violet, #7E5BEF);
    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
  }
</style>
