import { detectPlatform } from "../src/lib/detectPlatform";

import { describe, it, expect } from "bun:test";

describe("detectPlatform", () => {
  it("detecte twitch", () => {
    expect(detectPlatform("https://twitch.tv/foobar")).toEqual({
      platform: "twitch",
      username: "foobar",
    });
  });

  it("detecte youtube channel", () => {
    expect(detectPlatform("https://www.youtube.com/@username")).toEqual({
      platform: "youtube",
      username: "username",
    });
    expect(detectPlatform("https://youtube.com/c/channelname")).toEqual({
        platform: "youtube",
        username: "channelname",
    });
     expect(detectPlatform("https://youtube.com/channel/UCxyz")).toEqual({
        platform: "youtube",
        username: "UCxyz", // Or potentially null depending on desired behavior for channel IDs
    });
  });

  it("detecte twitter", () => {
    expect(detectPlatform("https://twitter.com/elonmusk")).toEqual({
      platform: "twitter",
      username: "elonmusk",
    });
     expect(detectPlatform("https://x.com/elonmusk")).toEqual({
      platform: "twitter", // Assuming x.com maps to twitter
      username: "elonmusk",
    });
  });

   it("detecte instagram", () => {
    expect(detectPlatform("https://www.instagram.com/zuck")).toEqual({
      platform: "instagram",
      username: "zuck",
    });
  });

  it("retourne 'null' pour une URL non reconnue", () => {
    expect(detectPlatform("https://example.com/profile")).toEqual({
      platform: null,
      username: null,
    });
  });

  it("retourne 'null' pour une chaine non URL", () => {
    expect(detectPlatform("just a username")).toEqual({
      platform: null,
      username: null, // Or potentially "just a username" if it should try to guess
    });
  });

   it("retourne 'null' pour une chaine vide", () => {
    expect(detectPlatform("")).toEqual({
      platform: null,
      username: null,
    });
  });

   it("gère les URLs avec paramètres query", () => {
    expect(detectPlatform("https://twitch.tv/foobar?source=test")).toEqual({
      platform: "twitch",
      username: "foobar",
    });
     expect(detectPlatform("https://www.youtube.com/@username?sub_confirmation=1")).toEqual({
      platform: "youtube",
      username: "username",
    });
  });

   it("gère les URLs sans www.", () => {
    expect(detectPlatform("https://twitch.tv/foobar")).toEqual({
      platform: "twitch",
      username: "foobar",
    });
  });

  // Ajoutez d'autres cas de test pour les plateformes supportées
  // Exemple : TikTok, Reddit, etc.
  /*
  it("detecte tiktok", () => {
    expect(detectPlatform("https://www.tiktok.com/@username")).toEqual({
      platform: "tiktok",
      username: "username",
    });
  });
  */
});
