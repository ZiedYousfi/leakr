
<script lang="ts">

  let valueState: string = $state("");
  let placeholderState: string = $state("Colle un lien ou pseudo ici 🦊");

  // Add onInput callback prop
  const {
    value = () => valueState,
    placeholder = () => placeholderState,
    onInput // Define the callback prop
  } = $props<{
    value?: string;
    placeholder?: string;
    onInput: (value: string) => void; // Type the callback prop
  }>();

  // Initialize valueState with the prop value if provided
  $effect(() => {
    valueState = value ?? "";
  });
</script>

<input
  class="twitch-input"
  bind:value={valueState}
  placeholder={placeholder}
  oninput={(e) => onInput((e.target as HTMLInputElement).value)}
  /> <!-- Call prop directly -->

<style>
  .twitch-input {
    width: 100%;
    max-width: 20rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: #1a1a1a;
    color: #e5e7eb;
    border: 1px solid #7e5bef;
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .twitch-input::placeholder {
    color: #6b7280;
  }
  .twitch-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px #7e5bef;
    border-color: #7e5bef;
  }
</style>
