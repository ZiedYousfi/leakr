/**
 * Keywords that often appear after a username in generic URL paths,
 * typically following a separator like '-' or '_'.
 */
const USERNAME_SUFFIX_KEYWORDS: ReadonlySet<string> = new Set([
  "onlyfans",
  "fansly",
  "patreon",
  "leaks",
  "leak",
  "gallery",
  "photo",
  "photos",
  "video",
  "videos",
  "model",
  "creator",
  "profile",
  "content",
  "pics",
  "vids",
  "free",
  "vip",
  "premium",
  "exclusive",
  "new", // Less specific, use with caution or add more context
  "all", // Less specific
  // Add more common keywords if needed, keep lowercase
]);

/**
 * Separators that often precede the keywords in URL paths.
 */
const SEPARATORS: ReadonlyArray<string> = ["-", "_"];

/**
 * Attempts to refine a potential username extracted from a URL path segment
 * by removing common suffixes like "-onlyfans-leaks". It works by splitting
 * the string by separators and checking parts from right-to-left against keywords.
 *
 * Example: "h1h-strawberrytabby-Onlyfans-Leaks-All-New-2" -> "strawberrytabby" (best effort)
 * Example: "irissiri129-onlyfans-photo-gallery" -> "irissiri129"
 * Example: "username_leaks" -> "username"
 * Example: "plainusername" -> "plainusername"
 * Example: "user-name-with-hyphens" -> "user-name-with-hyphens" (if no keywords follow)
 *
 * @param potentialUsername The string extracted, potentially containing separators and keywords.
 * @returns A refined username string, or the original string if no refinement pattern matches or refinement results in empty string.
 */
export function refinePotentialUsername(potentialUsername: string): string {
  if (!potentialUsername) {
    return potentialUsername;
  }

  let refined = potentialUsername;
  let refinementDone = false;

  // Iterate through separators to find the first keyword match from the end
  for (const sep of SEPARATORS) {
    // Check if the separator exists to avoid splitting unnecessarily
    if (refined.includes(sep)) {
      const parts = refined.split(sep);
      if (parts.length > 1) {
        // Check parts from right-to-left
        for (let i = parts.length - 1; i > 0; i--) {
          const currentPartLower = parts[i].toLowerCase();

          // Check if the current part *is* or *starts with* any known keyword
          const isKeywordPart = USERNAME_SUFFIX_KEYWORDS.has(currentPartLower) ||
                                [...USERNAME_SUFFIX_KEYWORDS].some(keyword => currentPartLower.startsWith(keyword));


          if (isKeywordPart) {
            // Found a keyword part. Assume the username is everything before this part.
            // Join the parts from the beginning up to (but not including) index i
            const candidate = parts.slice(0, i).join(sep);
             // Only accept refinement if it's not empty
            if (candidate) {
                 refined = candidate;
                 refinementDone = true;
            }
            break; // Stop checking parts for this separator
          }
        }
      }
    }
    if (refinementDone) {
      break; // Stop checking other separators if refinement was done
    }
  }

  // Basic cleanup: remove trailing/leading separators if refinement happened
  // and ensure the result isn't empty.
  if (refinementDone) {
      let needsTrimming = true;
      while(needsTrimming && refined) {
          needsTrimming = false;
          for (const sep of SEPARATORS) {
              if (refined.endsWith(sep)) {
                  refined = refined.substring(0, refined.length - 1);
                  needsTrimming = true;
              }
              if (refined.startsWith(sep)) {
                  refined = refined.substring(1);
                  needsTrimming = true;
              }
          }
      }
  }

  // Return the refined username only if it's not empty, otherwise return the original.
  return refined && refined.trim().length > 0 ? refined.trim() : potentialUsername;
}
