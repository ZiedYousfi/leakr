import {
  findCreatorByUsername,
  getContenuIdsByCreator,
  type Createur,
} from "@/lib/dbUtils";
import { processSearchInput } from "./searchProcessor"; // Import the processor
import type { Platform } from "./detectPlatform"; // Import Platform type

export interface FetchCreatorResult {
  creator: Createur | null;
  contentIds: number[] | null;
  error: string | null;
  identifierUsed: string; // The original input identifier
  usernameFound: string | null; // The username extracted/used for lookup
  platform: Platform | null; // The detected platform
}

/**
 * Detects whether a given string looks like a URL.
 */
function isLikelyUrl(str: string): boolean {
  const trimmed = str.trim();
  // Attrape tout ce qui commence par un schéma suivi de "://"
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
}


/**
 * Processes an identifier (URL or username), fetches the corresponding creator
 * and their associated content IDs.
 * @param identifier The raw username or URL input.
 * @returns A promise resolving to an object containing the creator, content IDs, platform, and any error.
 */
export async function fetchCreatorAndContentIds(
  identifier: string
): Promise<FetchCreatorResult> {
  let creator: Createur | null = null;
  let contentIds: number[] | null = null;
  let error: string | null = null;
  let usernameToSearch: string | null = null;

  // 1. Process the input identifier
  const {
    platform,
    username: extractedUsername,
  } = processSearchInput(identifier);

  // 2. Determine the username to search
  if (extractedUsername) {
    usernameToSearch = extractedUsername;
  } else if (!platform && identifier && !isLikelyUrl(identifier)) {
    // Only accept non-URL raw input as username if no platform detected
    usernameToSearch = identifier;
  } else if (platform && !extractedUsername) {
    // Platform detected but no username extracted from the URL
    error = "Could not extract a valid username from the provided URL.";
  }

  // 3. Validate usernameToSearch
  if (!usernameToSearch || usernameToSearch.trim().length === 0) {
    if (!error) {
      error = "Invalid or empty username provided or extracted.";
    }
    return {
      creator: null,
      contentIds: null,
      error: error,
      identifierUsed: identifier,
      usernameFound: null,
      platform,
    };
  }

  // 4. Try to look up the creator and their content
  try {
    const foundCreator = findCreatorByUsername(usernameToSearch);

    if (foundCreator) {
      creator = foundCreator;
      try {
        const fetchedIds = getContenuIdsByCreator(creator.id);
        contentIds = fetchedIds;
      } catch (contentError) {
        console.error(
          `creatorFinder: Error loading content IDs for creator ${creator.id}:`,
          contentError
        );
        error = "Creator found, but failed to load content list.";
      }
    } else {
      error = `Creator "${usernameToSearch}" not found.`;
    }
  } catch (lookupError) {
    console.error(
      `creatorFinder: Error finding creator "${usernameToSearch}":`,
      lookupError
    );
    error = `Failed to look up creator "${usernameToSearch}".`;
    creator = null;
    contentIds = null;
  }

  // 5. Return full result
  return {
    creator,
    contentIds,
    error,
    identifierUsed: identifier,
    usernameFound: usernameToSearch,
    platform,
  };
}

