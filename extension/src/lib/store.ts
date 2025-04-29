import { writable, derived } from "svelte/store";
import type { Createur } from "@/lib/dbUtils"; // Ensure this path is correct

// --- Creator Stores ---
/**
 * Stores the identifier (username or URL) used as input for finding a creator.
 */
export const creatorIdentifier = writable<string | null>(null);

/**
 * Stores the Createur object if one was successfully found.
 */
export const identifiedCreator = writable<Createur | null>(null);

/**
 * Stores the list of content IDs associated with the identified creator.
 */
export const identifiedCreatorContentIds = writable<number[] | null>(null);

/**
 * Stores the username that was extracted or provided but *not* found.
 */
export const potentialUsernameToCreate = writable<string | null>(null);

/**
 * Stores error messages related to creator operations.
 */
export const creatorOperationError = writable<string | null>(null);

/**
 * Indicates if a creator lookup or related operation is in progress.
 */
export const isCreatorLoading = writable<boolean>(false);

/**
 * Derived store for the ID of the identified creator.
 */
export const identifiedCreatorId = derived(
  identifiedCreator,
  ($identifiedCreator) => $identifiedCreator?.id ?? null
);

/**
 * Helper function to reset all creator-related stores.
 */
export function resetCreatorStores() {
  creatorIdentifier.set(null);
  identifiedCreator.set(null);
  identifiedCreatorContentIds.set(null);
  potentialUsernameToCreate.set(null);
  creatorOperationError.set(null);
  isCreatorLoading.set(false);
}

// --- Window Dimension Stores ---

/**
 * Stores the desired minimum width for the extension window.
 * Updated by the active page component.
 * Includes a default value.
 */
export const currentWidth = writable<string>("400px");

/**
 * Stores the desired minimum height for the extension window.
 * Updated by the active page component.
 * Includes a default value.
 */
export const currentHeight = writable<string>("500px");

// --- Navigation Stores (Optional - Can remain local in App.svelte if preferred) ---
// If you want navigation state also in the store, uncomment these:
// export type PageName = "search" | "contents" | "creators" | "settings";
// export const currentPage = writable<PageName>("search");
// export const pageParams = writable<Record<string, any>>({});
// export function navigate(page: PageName, params = {}) {
//     currentPage.set(page);
//     pageParams.set(params);
// }

// You can add other application-wide stores below this line if needed.
