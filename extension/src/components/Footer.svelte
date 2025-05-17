<script lang="ts">
  import {
    isAuthenticated,
    isLoadingAuth,
    authActionInProgress,
    login,
  } from "../lib/authStore";

  // No local state needed for isAuthenticated, isLoadingAuth, actionInProgress as they come from the store

  async function handleConnect() {
    await login();
  }

  // async function handleLogout() {
  //   await performLogout();
  // }
</script>

{#if $isLoadingAuth || !$isAuthenticated}
  <footer>
    {#if $isLoadingAuth}
      <p>Checking authentication status...</p>
    {:else if !$isAuthenticated}
      <span>Connect for more features.</span>
      <button
        class="auth-button"
        onclick={handleConnect}
        disabled={$authActionInProgress}
      >
        {$authActionInProgress ? "Connecting..." : "Connect"}
      </button>
    {/if}
    <!-- Note: The case where user is authenticated ($isAuthenticated is true)
         is handled by not rendering the footer at all,
         so no "Connected." message or "Logout" button is needed here
         if the footer's sole purpose is to prompt for login.
         If a logout button is desired even when this footer might be hidden
         by other logic, it would need to be placed elsewhere or this component's
         visibility logic would change. Based on the prompt, this footer is for
         unauthenticated state. -->
  </footer>
{/if}

<style>
  footer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: #000000; /* Deep Black */
    color: #e0e0e0; /* Off-White */
    padding: 12px 20px;
    display: flex;
    justify-content: center; /* Changed from space-between to center */
    align-items: center;
    border-top: 1px solid #4b4b4b; /* Dark Grey */
    font-family: "Fira Sans", sans-serif;
    font-size: 0.9rem;
    z-index: 1000;
    box-sizing: border-box;
    gap: 10px; /* Added gap for spacing between items when centered */
  }

  span {
    margin-right: 10px;
  }

  .auth-button {
    background-color: transparent;
    color: #7e5bef; /* Night Violet */
    border: 1px solid #7e5bef; /* Night Violet */
    padding: 6px 12px;
    font-family: "Fira Mono", monospace;
    font-size: 0.9rem;
    cursor: pointer;
    border-radius: 4px;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;
  }

  .auth-button:hover:not(:disabled) {
    background-color: #7e5bef; /* Night Violet */
    color: #ffffff; /* White text */
  }

  .auth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
