<script lang="ts">
  import DetailsGroup, { type LinkItem } from "./DetailsGroup.svelte";
  import SocialBladeButton from "./SocialBladeButton.svelte";

  let {
    displayValue,
    socialLinks,
    adultLinks,
    filteredProfileLinks,
    socialBladeUrl,
  }: {
    displayValue: string | null;
    socialLinks: LinkItem[];
    adultLinks: LinkItem[];
    filteredProfileLinks: [string, string][];
    socialBladeUrl: string | null;
  } = $props();

  function openUrl(url: string) {
    chrome.tabs.create({ url });
  }
</script>

<div id="actions" class="flex flex-col gap-2 w-full max-w-xs">
  <button
    class="action-button flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out border cursor-pointer w-full text-center focus:outline-none focus:ring-offset-2"
    onclick={() =>
      openUrl(
        `https://www.google.com/search?q=${encodeURIComponent(displayValue || "")}`
      )}
  >
    🔍 Google Search
  </button>
  <button
    class="action-button flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out border cursor-pointer w-full text-center focus:outline-none focus:ring-offset-2"
    onclick={() =>
      openUrl(
        `https://www.kbjfree.com/search?q=${encodeURIComponent(displayValue || "")}`
      )}
  >
    🔍 KBJFree
  </button>
  <button
    class="action-button flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out border cursor-pointer w-full text-center focus:outline-none focus:ring-offset-2"
    onclick={() =>
      openUrl(
        `https://www.google.com/search?q=${encodeURIComponent(displayValue || "")}+leaks`
      )}
  >
    🕵️‍♂️ Find Leaks
  </button>

  <DetailsGroup
    title="🔗 Social Networks & Platforms"
    links={socialLinks}
    displayValue={displayValue ?? ""}
  />
  <DetailsGroup
    title="🔞 Adult Platforms"
    links={adultLinks}
    displayValue={displayValue ?? ""}
  />

  {#if filteredProfileLinks.length}
    <DetailsGroup
      title="🌐 Profiles on platforms"
      customLinks={filteredProfileLinks}
      displayValue={displayValue ?? ""}
    />
  {/if}

  {#if socialBladeUrl}
    <SocialBladeButton url={socialBladeUrl} />
  {/if}
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .action-button {
    background-color: transparent;
    color: var(--tw-color-off-white, #E0E0E0); /* Added fallback */
    font-family: var(--tw-font-mono); /* Use Tailwind's font variable */
    border-color: var(--tw-color-night-violet, #7E5BEF); /* Added fallback */
    /* Standard classes handle the rest: flex, items-center, justify-center, gap-2, py-2, px-4, rounded-lg, font-semibold, transition, duration-200, ease-in-out, border, cursor-pointer, w-full, text-center */
  }

  .action-button:hover {
    background-color: var(--tw-color-night-violet, #7E5BEF); /* Added fallback */
    color: var(--tw-color-white, #FFFFFF); /* Added fallback */
    animation: var(--tw-animation-pulse-glow); /* Use Tailwind's animation variable */
  }

  .action-button:focus {
     /* Replicates focus:ring-2 focus:ring-night-violet focus:ring-offset-2 */
     /* focus:outline-none is handled by the class attribute */
     outline: 2px solid transparent;
     outline-offset: 2px;
     /* The ring-offset-2 class handles the offset width */
     --tw-ring-color: var(--tw-color-night-violet, #7E5BEF); /* Added fallback */
     --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
     --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
     box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
     /* Ensure ring offset color is set if needed, Tailwind defaults usually handle this via the ring-offset-2 class */
     /* --tw-ring-offset-color: #fff; */ /* Default offset color, usually set by ring-offset-* class */
  }

  /* Keyframes are defined in tailwind.config.mjs and automatically available */
  /* @keyframes pulse-glow { ... } */

</style>
