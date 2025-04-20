import { processSearchInput } from "../src/lib/searchProcessor";
import { describe, it, expect } from "bun:test";

describe("processSearchInput", () => {
  it("should process a valid Twitch URL", () => {
    expect(processSearchInput("https://twitch.tv/foobar")).toEqual({
      platform: "twitch",
      username: "foobar",
      displayValue: "foobar",
    });
  });

  it("should process a valid YouTube channel URL", () => {
    expect(processSearchInput("https://www.youtube.com/@username")).toEqual({
      platform: "youtube",
      username: "username",
      displayValue: "username",
    });
  });

   it("should process a valid YouTube channel URL with /c/", () => {
    expect(processSearchInput("https://youtube.com/c/channelname")).toEqual({
        platform: "youtube",
        username: "channelname",
        displayValue: "channelname",
    });
  });

   it("should process a valid YouTube channel URL with /channel/", () => {
     expect(processSearchInput("https://youtube.com/channel/UCxyz")).toEqual({
        platform: "youtube",
        username: "UCxyz",
        displayValue: "UCxyz",
    });
  });

  it("should process a valid Twitter URL", () => {
    expect(processSearchInput("https://twitter.com/elonmusk")).toEqual({
      platform: "twitter",
      username: "elonmusk",
      displayValue: "elonmusk",
    });
  });

  it("should process a valid X.com URL as Twitter", () => {
     expect(processSearchInput("https://x.com/elonmusk")).toEqual({
      platform: "twitter",
      username: "elonmusk",
      displayValue: "elonmusk",
    });
  });

  it("should process a valid Instagram URL", () => {
    expect(processSearchInput("https://www.instagram.com/zuck")).toEqual({
      platform: "instagram",
      username: "zuck",
      displayValue: "zuck",
    });
  });

  it("should handle unrecognized URLs", () => {
    const input = "https://example.com/profile";
    expect(processSearchInput(input)).toEqual({
      platform: null,
      username: "profile",
      displayValue: "profile",
    });
  });

  it("should handle non-URL strings", () => {
    const input = "just a username";
    expect(processSearchInput(input)).toEqual({
      platform: null, // Changed from "unknown"
      username: null,
      displayValue: input,
    });
  });

  it("should handle empty strings", () => {
    expect(processSearchInput("")).toEqual({
      platform: null, // Changed from "unknown"
      username: null,
      displayValue: "",
    });
  });

  it("should handle strings with only whitespace", () => {
    expect(processSearchInput("   ")).toEqual({
      platform: null, // Changed from "unknown"
      username: null,
      displayValue: "",
    });
  });

  it("should trim input whitespace", () => {
    expect(processSearchInput("  https://twitch.tv/foobar  ")).toEqual({
      platform: "twitch",
      username: "foobar",
      displayValue: "foobar",
    });
     expect(processSearchInput("  random string ")).toEqual({
      platform: null, // Changed from "unknown"
      username: null,
      displayValue: "random string",
    });
  });

  it("should handle URLs with query parameters", () => {
    expect(processSearchInput("https://twitch.tv/foobar?source=test")).toEqual({
      platform: "twitch",
      username: "foobar",
      displayValue: "foobar",
    });
     expect(processSearchInput("https://www.youtube.com/@username?sub_confirmation=1")).toEqual({
      platform: "youtube",
      username: "username",
      displayValue: "username",
    });
  });

  it("should handle URLs without www.", () => {
    expect(processSearchInput("https://instagram.com/zuck")).toEqual({
      platform: "instagram",
      username: "zuck",
      displayValue: "zuck",
    });
  });
});
