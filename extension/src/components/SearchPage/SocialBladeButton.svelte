<script lang="ts">
  let { url } = $props<{ url: string }>();

  function onclick() {
    chrome.tabs.create({ url });
  }
</script>

<button class="action-button" {onclick}>
  📊 Social Blade
</button>

<style>
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
