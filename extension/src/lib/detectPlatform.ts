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
  | null;

export function detectPlatform(url: string): {
  platform: Platform;
  username: string | null;
} {
  const patterns: [Platform, RegExp][] = [
    ["twitch", /twitch\.tv\/([\w\d_]+)/i],
    ["instagram", /instagram\.com\/([\w\d_.]+)/i],
    ["tiktok", /tiktok\.com\/@([\w\d_.-]+)/i],
    ["twitter", /(?:twitter\.com|x\.com)\/([\w\d_]+)/i],
    ["youtube", /youtube\.com\/(channel|c|user)\/([\w\d_\-]+)/i],
    ["youtube", /youtube\.com\/@([\w\d_.-]+)/i],
    ["facebook", /facebook\.com\/([\w\d.]+)/i],
    ["onlyfans", /onlyfans\.com\/([\w\d_.-]+)/i],
    ["linktree", /linktr\.ee\/([\w\d_.-]+)/i],
    ["linktree", /linktree\.com\/([\w\d_.-]+)/i],
    ["linkinbio", /linkin\.bio\/([\w\d_.-]+)/i],
    ["fapello", /fapello\.com\/([\w\d_.-]+)/i],
  ];
  for (const [platform, regex] of patterns) {
    const match = url.match(regex);
    if (match) {
      return {
        platform,
        username: match[2] || match[1],
      };
    }
  }
  return { platform: null, username: null };
}
