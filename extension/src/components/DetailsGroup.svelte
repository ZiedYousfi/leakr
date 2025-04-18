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

<details class="mb-2">
  <summary>{title}</summary>

  {#if links.length}
    {#each links as [label, fn]}
      <button
        class="action-button detail-button"
        onclick={() => openUrl(fn(displayValue))}
      >
        🔗 {label}
      </button>
    {/each}
  {/if}

  {#if customLinks.length}
    {#each customLinks as [label, url]}
      <button
        class="action-button detail-button"
        onclick={() => openUrl(url)}
      >
        🌐 Open {label}
      </button>
    {/each}
  {/if}
</details>

<style>
  details summary {
    background: #232136;
    color: #fff;
    padding: 0.5em 1em;
    border-radius: 0.5em;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5em;
    border: 1px solid #7e5bef;
    transition: background 0.2s, color 0.2s;
  }
  details[open] summary {
    background: #7e5bef;
    color: #fff;
  }
  details summary::before {
    content: "▶";
    margin-right: 0.5em;
    transition: transform 0.2s;
  }
  details[open] summary::before {
    transform: rotate(90deg);
  }
  details summary:hover {
    background: #5a4e8c;
  }
  details summary:focus {
    outline: 2px solid #7e5bef;
  }
  .detail-button {
    background: #232136;
    color: #a18aff;
    border: 1px solid #7e5bef;
    font-style: italic;
    display: block;
    margin: 0.5em auto 0;
    width: calc(100% - 2em);
  }
  .detail-button:hover {
    background: #7e5bef;
    color: #fff;
  }
</style>
