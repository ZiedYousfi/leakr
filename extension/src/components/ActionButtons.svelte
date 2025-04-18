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
    displayValue: string;
    socialLinks: LinkItem[];
    adultLinks: LinkItem[];
    filteredProfileLinks: [string, string][];
    socialBladeUrl: string | null;
  } = $props();

  function openUrl(url: string) {
    chrome.tabs.create({ url });
  }
</script>

<div id="actions">
  <button
    class="action-button"
    onclick={() =>
      openUrl(`https://www.google.com/search?q=${encodeURIComponent(displayValue)}`)
    }
  >
    🔍 Google Search
  </button>
  <button
    class="action-button"
    onclick={() =>
      openUrl(`https://www.kbjfree.com/search?q=${encodeURIComponent(displayValue)}`)
    }
  >
    🔍 KBJFree
  </button>
  <button
    class="action-button"
    onclick={() =>
      openUrl(
        `https://www.google.com/search?q=${encodeURIComponent(displayValue)}+leaks`
      )
    }
  >
    🕵️‍♂️ Find Leaks
  </button>

  <DetailsGroup
    title="🔗 Réseaux sociaux & Plateformes"
    links={socialLinks}
    {displayValue}
  />
  <DetailsGroup
    title="🔞 Plateformes adultes"
    links={adultLinks}
    {displayValue}
  />

  {#if filteredProfileLinks.length}
    <DetailsGroup
      title="🌐 Profils sur plateformes"
      customLinks={filteredProfileLinks}
      displayValue={displayValue}
    />
  {/if}

  {#if socialBladeUrl}
    <SocialBladeButton url={socialBladeUrl} />
  {/if}
</div>

<style>
  #actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 20rem;
  }
  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background-color: #7E5BEF;
    color: white;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: background-color 0.2s ease;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: center;
  }
  .action-button:hover {
    background-color: #a18aff;
  }
  .action-button:focus {
    outline: 2px solid #a18aff;
    outline-offset: 2px;
  }
</style>
