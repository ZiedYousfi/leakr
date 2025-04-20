import {
  findCreatorByUsername,
  getContenuIdsByCreator,
  addPlateforme,
  addProfilPlateforme,
  findProfilByDetails,
  type Createur,
} from "@/lib/dbUtils";
import { processSearchInput } from "./searchProcessor";
import type { Platform } from "./detectPlatform";
import { refinePotentialUsername } from "./usernameRefiner"; // Import the refiner

export interface FetchCreatorResult {
  creator: Createur | null;
  contentIds: number[] | null;
  error: string | null;
  identifierUsed: string;
  usernameFound: string | null; // The username extracted/refined/used for lookup
  platform: Platform | null;
}

/**
 * Detects whether a given string looks like a URL.
 */
function isLikelyUrl(str: string): boolean {
  const trimmed = str.trim();
  // Basic check for protocol - adjust if needed for more complex URL forms
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) || /^[a-zA-Z\d_.-]+\.[a-zA-Z]{2,}/.test(trimmed); // Also check for domain.tld format
}

// REMOVED: COMMON_PATH_WORDS constant is no longer needed

/**
 * Extracts potential username candidates from a URL's path.
 * Splits by '/', '-', '_' and filters out empty and numeric-only segments.
 * @param url The URL string.
 * @returns An array of potential username strings.
 */
function extractPotentialUsernamesFromPath(url: string): string[] {
  try {
    // Handle cases where the input might not have a protocol
    const urlWithProto = url.includes('://') ? url : `https://${url}`;
    const parsedUrl = new URL(urlWithProto);
    const pathname = parsedUrl.pathname;
    // Split by common separators
    const segments = pathname.split(/[\/\-_]/);
    // Filter out empty strings and purely numeric strings
    return segments.filter(segment =>
        segment.length > 0 &&
        !/^\d+$/.test(segment)
        // REMOVED: Check against COMMON_PATH_WORDS is gone
    );
  } catch (e) {
    console.warn(`Could not parse URL path for segment extraction: ${url}`, e);
    // Fallback: try splitting the original string directly if URL parsing fails
     const segments = url.split(/[\/\-_]/);
     return segments.filter(segment =>
        segment.length > 0 &&
        !/^\d+$/.test(segment)
        // REMOVED: Check against COMMON_PATH_WORDS is gone
    );
  }
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
  const originalIdentifier = identifier.trim(); // Use trimmed version consistently

  // 1. Process the input identifier using platform detection
  const { platform, username: initialExtractedUsername } =
    processSearchInput(originalIdentifier);

  let refinedUsername = initialExtractedUsername;

  // 1.5 Attempt keyword-based refinement if no specific platform was detected,
  //     an initial username (path segment) was extracted, and it was a URL.
  if (
    !platform &&
    initialExtractedUsername &&
    isLikelyUrl(originalIdentifier)
  ) {
    const keywordRefined = refinePotentialUsername(initialExtractedUsername);
    if (keywordRefined !== initialExtractedUsername) {
        console.log(`Keyword refinement: "${initialExtractedUsername}" -> "${keywordRefined}"`);
        refinedUsername = keywordRefined;
    }
  }

  // 2. Determine the initial username to search
  if (refinedUsername) {
    usernameToSearch = refinedUsername;
  } else if (!platform && originalIdentifier && !isLikelyUrl(originalIdentifier)) {
    // Only accept non-URL raw input as username if no platform detected
    usernameToSearch = originalIdentifier;
  }
  // Note: Error handling for cases where platform is detected but username isn't,
  // or URL processing fails initially, will be done after the next step.

  // 2.5. If still no username and it's a URL, try searching path segments against DB
  if (!usernameToSearch && isLikelyUrl(originalIdentifier)) {
    console.log("Attempting path segment DB search for:", originalIdentifier);
    const potentialUsernames = extractPotentialUsernamesFromPath(originalIdentifier);
    console.log("Potential usernames from path (unfiltered):", potentialUsernames); // Log unfiltered segments

    for (const segment of potentialUsernames) {
        // REMOVED: Minimum length check (can be added back if desired)
        // if (segment.length < 3) {
        //      console.log(`Skipping short segment: "${segment}"`);
        //      continue;
        // }

        console.log(`Testing segment as username: "${segment}"`);
        try {
            // Check if this segment corresponds to a known creator
            const potentialCreator = findCreatorByUsername(segment);
            if (potentialCreator) {
                console.log(`Found creator for segment: "${segment}"`);
                usernameToSearch = segment; // Found a valid username!
                // If we found it this way, the platform is likely unknown or generic
                // Keep the original 'platform' value (which should be null here)
                break; // Stop searching segments once a match is found
            }
        } catch (segmentLookupError) {
            // Log error but continue trying other segments
            console.error(`Error looking up segment "${segment}":`, segmentLookupError);
        }
    }
     // If we found a username via segments, clear any potential previous error state
     if (usernameToSearch) {
         error = null;
     }
  }

  // 3. Set error messages based on the outcome so far
  if (!usernameToSearch) {
      // Only set error if one wasn't already set by segment search failure
      if (!error) {
          if (platform && !initialExtractedUsername) {
              error = `Could not extract a username for ${platform} from the URL.`;
          } else if (isLikelyUrl(originalIdentifier)) {
              if (initialExtractedUsername) {
                   error = `Could not confirm username from URL path segment "${initialExtractedUsername}" or other path parts.`;
              } else {
                   error = `Could not identify a known username within the URL: ${originalIdentifier}`;
              }
          } else {
              // Input was likely intended as a direct username but wasn't found or was invalid
              error = `Invalid or empty username provided: "${originalIdentifier}"`;
          }
      }
  } else if (usernameToSearch.trim().length === 0) {
      // This case should be less likely now, but handle if refinement/extraction yields empty
      error = "Extracted username is empty.";
      usernameToSearch = null; // Prevent search with empty string
  }


  // 4. Validate final usernameToSearch and proceed if valid
  if (!usernameToSearch) {
    // Report the username we ended up with before validation failed
    const finalUsernameFound = usernameToSearch || refinedUsername || initialExtractedUsername;
    return {
      creator: null,
      contentIds: null,
      error: error || "Could not determine a valid username.", // Ensure error is not null
      identifierUsed: originalIdentifier,
      usernameFound: finalUsernameFound,
      platform,
    };
  }

  // --- Username is considered valid at this point ---
  const finalUsernameToSearch = usernameToSearch; // Use a const for clarity

  // 5. Try to look up the creator and their content using the final username
  try {
    // Use the final usernameToSearch for lookup
    const foundCreator = findCreatorByUsername(finalUsernameToSearch);

    if (foundCreator) {
      creator = foundCreator;
      try {
        const fetchedIds = getContenuIdsByCreator(creator.id);
        contentIds = fetchedIds;

        // --- BEGIN PROFILE SAVING LOGIC ---
        // Save profile link ONLY if a specific platform was detected initially AND it was a URL
        const shouldSaveProfile = platform && isLikelyUrl(originalIdentifier);

        if (shouldSaveProfile && platform && creator) { // Redundant checks for clarity
          try {
            const platformIdRaw = addPlateforme(platform);
            const platformId =
              typeof platformIdRaw === "bigint"
                ? Number(platformIdRaw)
                : (platformIdRaw ?? null);

            if (platformId !== null) {
              const existingProfile = findProfilByDetails(
                creator.id,
                platformId,
                originalIdentifier // Save the original identifier URL
              );

              if (!existingProfile) {
                addProfilPlateforme(originalIdentifier, creator.id, platformId);
                console.log(
                  `creatorFinder: Added profile link "${originalIdentifier}" for creator ${creator.id} (${finalUsernameToSearch}) on platform ${platform} (ID: ${platformId})`
                );
              }
            } else {
              console.warn(
                `creatorFinder: Could not get or create platform ID for "${platform}".`
              );
            }
          } catch (dbError) {
            console.error(
              `creatorFinder: Error adding platform profile for creator ${creator.id}:`,
              dbError
            );
          }
        }
        // --- END PROFILE SAVING LOGIC ---

      } catch (contentError) {
        console.error(
          `creatorFinder: Error loading content IDs for creator ${creator.id} (${finalUsernameToSearch}):`,
          contentError
        );
        error = "Creator found, but failed to load content list.";
      }
    } else {
      // This else block might be redundant if findCreatorByUsername was already called in step 2.5
      // However, it handles the case where the initial username (from step 1/1.5/2) was used and not found.
      error = `Creator "${finalUsernameToSearch}" not found.`;
       // Add context if refinement/extraction occurred
       if (initialExtractedUsername && finalUsernameToSearch !== initialExtractedUsername) {
           error += ` (Processed from "${initialExtractedUsername}")`;
       } else if (usernameToSearch !== originalIdentifier && !initialExtractedUsername) {
            error += ` (Extracted from path of "${originalIdentifier}")`;
       }
    }
  } catch (lookupError) {
    // This catches errors during the findCreatorByUsername call in *this* step (5)
    console.error(
      `creatorFinder: Error finding creator "${finalUsernameToSearch}":`,
      lookupError
    );
    error = `Failed to look up creator "${finalUsernameToSearch}".`;
    creator = null;
    contentIds = null;
  }

  // 6. Return full result
  return {
    creator,
    contentIds,
    error,
    identifierUsed: originalIdentifier,
    usernameFound: finalUsernameToSearch, // Return the actual username used for the search
    platform, // Return the originally detected platform (null if found via path segments)
  };
}
