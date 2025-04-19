
<script lang="ts">
  console.log('--- Simplified All ---');
  const { params } = $props<{ params: { username?: string } }>();
  console.log('Params received:', params);
</script>

<div style="padding: 20px; border: 1px solid red;">
  <h1>Hello from All!</h1>
  <p>Params: {JSON.stringify(params)}</p>
</div>

<style>
  div {
    background-color: #f0f0f0;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  h1 {
    color: #333;
  }
  p {
    color: #666;
  }
</style>
