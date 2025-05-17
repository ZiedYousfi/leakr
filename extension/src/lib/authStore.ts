import { writable } from 'svelte/store';
import {
    checkAuthStatus as checkAuthStatusInternal,
    authenticateWithClerk as authenticateWithClerkInternal,
    logout as logoutInternal
} from './authUtils';

export const isAuthenticated = writable<boolean>(false);
export const isLoadingAuth = writable<boolean>(true);
export const authActionInProgress = writable<boolean>(false);

export async function checkCurrentAuthStatus() {
  isLoadingAuth.set(true);
  authActionInProgress.set(true);
  try {
    const status = await checkAuthStatusInternal();
    isAuthenticated.set(status);
  } catch (error) {
    console.error("AuthStore: Error checking auth status:", error);
    isAuthenticated.set(false); // Assume not authenticated on error
  } finally {
    isLoadingAuth.set(false);
    authActionInProgress.set(false);
  }
}

export async function login() {
  if (get(authActionInProgress)) return;
  authActionInProgress.set(true);
  isLoadingAuth.set(true); // Show loading state during auth process
  try {
    await authenticateWithClerkInternal();
    await checkCurrentAuthStatus(); // Re-check status after auth attempt
  } catch (error) {
    console.error("AuthStore: Error during login:", error);
    // checkCurrentAuthStatus will set isAuthenticated to false if Clerk auth failed before token exchange
    // If error is post-exchange, status might still be false.
    await checkCurrentAuthStatus(); // Ensure state is accurate after error
  } finally {
    // isLoadingAuth and authActionInProgress are reset by checkCurrentAuthStatus
  }
}

export async function logout() {
  if (get(authActionInProgress)) return;
  authActionInProgress.set(true);
  try {
    await logoutInternal();
    isAuthenticated.set(false); // Directly set to false after successful logout
  } catch (error) {
    console.error("AuthStore: Error during logout:", error);
    // Optionally, re-check status, though after logout, it should be false
    await checkCurrentAuthStatus();
  } finally {
    isLoadingAuth.set(false); // Ensure loading is false
    authActionInProgress.set(false);
  }
}

// Helper to get store value non-reactively if needed, e.g. in non-Svelte modules
// For Svelte components, use $isAuthenticated, $isLoadingAuth, $authActionInProgress
function get<T>(store: { subscribe: (cb: (value: T) => void) => () => void }): T {
  let value: T | undefined = undefined;
  const unsubscribe = store.subscribe(v => value = v);
  unsubscribe();
  if (value === undefined) {
    throw new Error("Store did not emit a value synchronously.");
  }
  return value;
}

// Initialize auth status check when the store is first imported/used in a client environment
if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && chrome.runtime) {
  checkCurrentAuthStatus();
}
