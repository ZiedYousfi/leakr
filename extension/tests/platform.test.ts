import { detectPlatform } from "../src/detectPlatform";

import { describe, it, expect } from "bun:test";

describe("detectPlatform", () => {
  it("detecte twitch", () => {
    expect(detectPlatform("https://twitch.tv/foobar")).toEqual({
      platform: "twitch",
      username: "foobar",
    });
  });
  // ...autres tests...
});
