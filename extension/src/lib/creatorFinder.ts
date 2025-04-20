import {
  findCreatorByUsername,
  getContenuIdsByCreator,
  addPlateforme, // Added
  addProfilPlateforme, // Added
  findProfilByDetails, // Added
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
 * and their associated content IDs, and potentially saves the platform profile link.
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
  const { platform, username: extractedUsername } =
    processSearchInput(identifier);

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

        // --- BEGIN ADDED PROFILE SAVING LOGIC ---
        // If a platform was detected and it was likely a URL input, try to add the profile link
        if (platform && creator && isLikelyUrl(identifier)) {
          try {
            // Get platform ID (adds platform if it doesn't exist)
            const platformIdRaw = addPlateforme(platform); // Use platform directly
            // Convert bigint to number if necessary, handle null
            const platformId =
              typeof platformIdRaw === "bigint"
                ? Number(platformIdRaw)
                : (platformIdRaw ?? null);

            if (platformId !== null) {
              // Check if this specific profile link already exists for this creator/platform
              const existingProfile = findProfilByDetails(
                creator.id,
                platformId,
                identifier
              );

              if (!existingProfile) {
                // Add the new profile link
                addProfilPlateforme(identifier, creator.id, platformId);
                console.log(
                  `creatorFinder: Added profile link "${identifier}" for creator ${creator.id} on platform ${platform} (ID: ${platformId})`
                ); // Use platform directly
              } else {
                console.log(
                  `creatorFinder: Profile link "${identifier}" already exists for creator ${creator.id} on platform ${platform}.`
                ); // Use platform directly
              }
            } else {
              console.warn(
                `creatorFinder: Could not get or create platform ID for "${platform}".`
              ); // Use platform directly
            }
          } catch (dbError) {
            console.error(
              `creatorFinder: Error adding platform profile for creator ${creator.id}:`,
              dbError
            );
            // Non-fatal error, continue returning the found creator info
          }
        }
        // --- END ADDED PROFILE SAVING LOGIC ---
      } catch (contentError) {
        console.error(
          `creatorFinder: Error loading content IDs for creator ${creator.id}:`,
          contentError
        );
        error = "Creator found, but failed to load content list.";
        // Still try to add profile link even if content loading fails, as creator was found
        // --- BEGIN ADDED PROFILE SAVING LOGIC (Duplicate for safety if content fetch fails) ---
        if (platform && creator && isLikelyUrl(identifier)) {
          try {
            const platformIdRaw = addPlateforme(platform); // Use platform directly
            const platformId =
              typeof platformIdRaw === "bigint"
                ? Number(platformIdRaw)
                : (platformIdRaw ?? null);

            if (platformId !== null) {
              const existingProfile = findProfilByDetails(
                creator.id,
                platformId,
                identifier
              );
              if (!existingProfile) {
                addProfilPlateforme(identifier, creator.id, platformId);
                console.log(
                  `creatorFinder: Added profile link "${identifier}" for creator ${creator.id} on platform ${platform} (ID: ${platformId}) (after content error)`
                ); // Use platform directly
              }
            }
          } catch (dbError) {
            console.error(
              `creatorFinder: Error adding platform profile for creator ${creator.id} (after content error):`,
              dbError
            );
          }
        }
        // --- END ADDED PROFILE SAVING LOGIC (Duplicate) ---
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
