export type Platform =
  | "twitch"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "facebook"
  | "onlyfans"
  | "linktree"
  | "linkinbio"
  | "fapello"
  | "kbjfree"
  | null;

// ...existing code...

export function detectPlatform(url: string): {
  platform: Platform;
  username: string | null;
} {
  const patterns: [Platform, RegExp][] = [
    ["twitch", /twitch\.tv\/([\w\d_]+)/i],
    ["instagram", /instagram\.com\/([\w\d_.]+)/i],
    ["tiktok", /tiktok\.com\/@([\w\d_.-]+)/i],
    ["twitter", /(?:twitter\.com|x\.com)\/([\w\d_]+)/i],
    // Use non-capturing group for path segment, username is group 1
    ["youtube", /youtube\.com\/(?:channel|c|user)\/([\w\d_\-]+)/i],
    ["youtube", /youtube\.com\/@([\w\d_.-]+)/i], // Username is group 1
    ["facebook", /facebook\.com\/([\w\d.]+)/i], // Username is group 1 (basic)
    ["onlyfans", /onlyfans\.com\/([\w\d_.-]+)/i], // Username is group 1
    ["linktree", /linktr\.ee\/([\w\d_.-]+)/i], // Username is group 1
    ["linktree", /linktree\.com\/([\w\d_.-]+)/i], // Username is group 1
    ["linkinbio", /linkin\.bio\/([\w\d_.-]+)/i], // Username is group 1
    ["fapello", /fapello\.(?:com|ru)\/galleries\/([\w\d_.-]+?)(?:[-_].*)?\/?$/i],
    ["fapello", /fapello\.(?:com|ru)\/([\w\d_.-]+)\/?$/i],
    ["kbjfree", /kbjfree\.com\/search\?q=([\w\d_.-]+)/i], // Username in group 1 (query param)
    ["kbjfree", /kbjfree\.com\/model\/([\w\d_.-]+)/i], // Username in group 1
    // Generic catch-all should be last. It's less reliable for username extraction.
    // Group 1 is domain part, Group 2 is first path part. We return null platform/username here.
    [null, /(?:https?:\/\/)?(?:www\.)?([\w\d_.-]+)\.com\/([\w\d_.-]+)/i],
  ];

  for (const [platform, regex] of patterns) {
    const match = url.match(regex);
    if (match) {
      // If platform is null (generic match), we don't extract a username.
      if (platform === null) {
        return { platform: null, username: null };
      }
      // For all known platforms, the username should be in the first capture group (match[1]).
      if (match[1]) {
        return {
          platform,
          username: match[1],
        };
      }
      // Fallback if match occurred but group 1 is empty (shouldn't happen with current regexes)
      return { platform, username: null };
    }
  }

  // No patterns matched
  return { platform: null, username: null };
}
