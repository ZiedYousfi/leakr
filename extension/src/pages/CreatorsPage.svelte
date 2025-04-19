<script lang="ts">
  import Header from "../components/Header.svelte";
  const { onNavigate } = $props<{
    onNavigate: (page: string, params?: object) => void;
    params: object;
  }>();
  let creators = [
    { name: "Alice", bio: "Frontend developer and designer." },
    { name: "Bob", bio: "Backend engineer and API specialist." },
    { name: "Charlie", bio: "Fullstack developer and mentor." }
  ];
</script>

<style>
  .creators-list {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 1rem;
    border-radius: 8px;
    background: #f9f9f9;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .creator {
    padding: 1rem;
    border-bottom: 1px solid #eee;
  }
  .creator:last-child {
    border-bottom: none;
  }
  .name {
    font-weight: bold;
    font-size: 1.2rem;
  }
  .bio {
    color: #555;
    margin-top: 0.3rem;
  }
</style>

<div class="creators-list">
  <Header
    title="Leakr"
    onNavigate={onNavigate}
  />
  <h2>Creators</h2>
  {#each creators as creator}
    <div class="creator">
      <div class="name">{creator.name}</div>
      <div class="bio">{creator.bio}</div>
    </div>
  {/each}
</div>
