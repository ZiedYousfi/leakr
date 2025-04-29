<script lang="ts">
  export type LinkItem = [string, (val: string) => string];

  let { title, links = [], customLinks = [], displayValue } = $props<{
    title: string;
    links?: LinkItem[];
    customLinks?: [string, string][];
    displayValue: string;
  }>();

  function openUrl(url: string) {
    chrome.tabs.create({ url });
  }
</script>

<details class="mb-2 group">
  <summary
    class="list-none flex items-center gap-2 cursor-pointer py-2 px-4 rounded-lg bg-transparent text-off-white font-mono font-bold border border-night-violet transition duration-200 ease-in-out hover:bg-night-violet hover:text-white focus:outline-none focus:ring-2 focus:ring-night-violet focus:ring-offset-2 open:bg-night-violet open:text-white"
  >
    <span class="arrow mr-2 transition-transform duration-200 text-night-violet group-hover:text-white open:rotate-90 open:text-white">▶</span>
    {title}
  </summary>

  {#if links.length}
    {#each links as [label, fn]}
      <button
        class="detail-button block mt-2 mx-auto w-[calc(100%-2em)] py-2 px-4 rounded-lg text-center cursor-pointer transition duration-200 ease-in-out font-mono focus:outline-none focus:ring-offset-2"
        onclick={() => openUrl(fn(displayValue))}
      >
        🔗 {label}
      </button>
    {/each}
  {/if}

  {#if customLinks.length}
    {#each customLinks as [label, url]}
      <button
        class="detail-button block mt-2 mx-auto w-[calc(100%-2em)] py-2 px-4 rounded-lg text-center cursor-pointer transition duration-200 ease-in-out font-mono focus:outline-none focus:ring-offset-2"
        onclick={() => openUrl(url)}
      >
        🌐 Open {label}
      </button>
    {/each}
  {/if}
</details>

<style lang="postcss">
  @reference ("tailwindcss/base");
  .detail-button {
    background-color: transparent;
    color: var(--tw-color-silver-grey, #B0B0B0); /* Fallback added */
    border: 1px solid var(--tw-color-dark-grey, #4B4B4B); /* Fallback added */
    /* Standard classes handle layout, padding, font, etc. */
  }

  .detail-button:hover {
    background-color: var(--tw-color-dark-grey, #4B4B4B); /* Fallback added */
    color: var(--tw-color-off-white, #E0E0E0); /* Fallback added */
  }

  .detail-button:focus {
    /* Replicates focus:ring-2 focus:ring-silver-grey focus:ring-offset-2 */
    outline: 2px solid transparent;
    outline-offset: 2px;
    --tw-ring-color: var(--tw-color-silver-grey, #B0B0B0); /* Fallback added */
    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
    /* Ensure ring offset color is set if needed, Tailwind defaults usually handle this */
    /* --tw-ring-offset-color: #fff; */ /* Default offset color */
  }
</style>
