<script>
  let name = '';
</script>

<main>
  <h1>Welcome to Leakr Options</h1>
  <label>
    Your Name:
    <input bind:value={name} placeholder="Enter your name" />
  </label>
  {#if name}
    <p>Hello, {name}!</p>
  {/if}
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    padding: 2rem;
    max-width: 400px;
    margin: auto;
  }
  input {
    margin-top: 0.5rem;
    padding: 0.5rem;
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
  }
  label {
    display: block;
    margin-bottom: 1rem;
  }
</style>
