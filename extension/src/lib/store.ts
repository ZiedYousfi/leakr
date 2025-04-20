import { writable, derived } from 'svelte/store';
import type { Createur } from '@/lib/dbUtils'; // Ensure this path is correct

/**
 * Stores the identifier (username or URL) used as input for finding a creator.
 * Can be set from URL parameters, tab URL processing, or manual input.
 * This often triggers the lookup process in components observing it.
 */
export const creatorIdentifier = writable<string | null>(null);

/**
 * Stores the Createur object if one was successfully found in the database
 * corresponding to the creatorIdentifier.
 */
export const identifiedCreator = writable<Createur | null>(null);

/**
 * Stores the list of content IDs associated with the identified creator.
 * Updated after a successful lookup or after content is added/removed.
 */
export const identifiedCreatorContentIds = writable<number[] | null>(null);

/**
 * Stores the username that was extracted or provided but *not* found
 * in the database. This can be used to prompt for creation.
 */
export const potentialUsernameToCreate = writable<string | null>(null);

/**
 * Stores error messages related to creator lookup or content operations.
 */
export const creatorOperationError = writable<string | null>(null);

/**
 * Indicates if a creator lookup or a related operation (like adding content)
 * is currently in progress. You might split this if finer-grained loading
 * states are needed (e.g., isLookingUp vs isAddingContent).
 */
export const isCreatorLoading = writable<boolean>(false);

/**
 * Derived store to conveniently get the ID of the identified creator.
 */
export const identifiedCreatorId = derived(
    identifiedCreator,
    $identifiedCreator => $identifiedCreator?.id ?? null
);

/**
 * Helper function to reset all creator-related stores to their initial state.
 * Useful when starting a new search or clearing context.
 */
export function resetCreatorStores() {
    creatorIdentifier.set(null);
    identifiedCreator.set(null);
    identifiedCreatorContentIds.set(null);
    potentialUsernameToCreate.set(null);
    creatorOperationError.set(null);
    isCreatorLoading.set(false);
}

// You can add other application-wide stores below this line if needed.
