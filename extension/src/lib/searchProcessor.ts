import { detectPlatform, type Platform } from "./detectPlatform";

export interface SearchResult {
  platform: Platform;
  username: string | null;
  displayValue: string;
}

/**
 * Processes the search input to detect platform and username.
 * @param input The raw search input string.
 * @returns An object containing the detected platform, username, and display value.
 */
export function processSearchInput(input: string): SearchResult {
  const trimmedInput = input.trim();
  const { platform, username } = detectPlatform(trimmedInput);
  const displayValue = username || trimmedInput;
  return { platform, username, displayValue };
}
