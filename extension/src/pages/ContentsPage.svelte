<script lang="ts">
  import Header from "../components/Header.svelte";
  const { onNavigate } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();
  let message = "Welcome to ContentsPage.svelte!";
</script>

<main>
  <Header
    title="Leakr"
    onNavigate={onNavigate}
  />
  <h1>{message}</h1>
  <p>This is your new Svelte page. Start building something awesome!</p>
</main>

<style>
  main {
    padding: 2rem;
    font-family: system-ui, sans-serif;
    background: #f9f9f9;
    border-radius: 8px;
    max-width: 600px;
    margin: 2rem auto;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  h1 {
    color: #2d72d9;
  }
</style>
