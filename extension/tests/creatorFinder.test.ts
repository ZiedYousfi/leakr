// import { describe, it, expect, mock, beforeEach } from "bun:test";
// import { fetchCreatorAndContentIds } from "../src/lib/creatorFinder";
// import type { Createur } from "../src/lib/dbUtils";
// import type { Platform } from "../src/lib/detectPlatform";

// // --- Mocking Dependencies ---

// // Mock the search processor
// mock.module("../src/lib/searchProcessor", () => ({
//   processSearchInput: mock((identifier: string): { platform: Platform | null; username: string | null } => {
//     if (identifier.includes("twitch.tv/testuser")) {
//       return { platform: "twitch", username: "testuser" };
//     }
//     if (identifier === "plainuser") {
//       return { platform: null, username: "plainuser" }; // Assume it processes plain usernames
//     }
//      if (identifier.includes("youtube.com/@ytuser")) {
//       return { platform: "youtube", username: "ytuser" };
//     }
//      if (identifier.includes("twitter.com/nousername")) {
//       return { platform: "twitter", username: null }; // Simulate URL with no username extracted
//     }
//     if (identifier === "unknownuser") {
//        return { platform: null, username: "unknownuser" };
//     }
//      if (identifier === "erroruser") {
//        return { platform: null, username: "erroruser" };
//     }
//      if (identifier === "contenterroruser") {
//        return { platform: null, username: "contenterroruser" };
//     }
//     if (identifier === "") {
//         return { platform: null, username: null };
//     }
//     return { platform: null, username: null }; // Default mock behavior
//   }),
// }));

// // Mock the dbUtils
// const mockCreators: Record<string, Createur> = {
//   testuser: { id: 1, nom: "Test User", plateforme: "twitch", nomUtilisateur: "testuser", urlProfil: "https://twitch.tv/testuser" },
//   plainuser: { id: 2, nom: "Plain User", plateforme: null, nomUtilisateur: "plainuser", urlProfil: null },
//   ytuser: { id: 3, nom: "YouTube User", plateforme: "youtube", nomUtilisateur: "ytuser", urlProfil: "https://youtube.com/@ytuser" },
//   contenterroruser: { id: 4, nom: "Content Error User", plateforme: null, nomUtilisateur: "contenterroruser", urlProfil: null },
// };

// const mockContentIds: Record<number, number[]> = {
//   1: [101, 102],
//   2: [201],
//   3: [301, 302, 303],
//   // No content for creator 4 (contenterroruser) to simulate content fetch error
// };

// mock.module("@/lib/dbUtils", () => ({
//   findCreatorByUsername: mock((username: string): Createur | null => {
//     if (username === "erroruser") {
//         throw new Error("Simulated DB lookup error");
//     }
//     return mockCreators[username] || null;
//   }),
//   getContenuIdsByCreator: mock((creatorId: number): number[] => {
//      if (creatorId === 4) { // contenterroruser's ID
//         throw new Error("Simulated content fetch error");
//      }
//     return mockContentIds[creatorId] || [];
//   }),
//   // Mock other exports if needed, though not directly used by fetchCreatorAndContentIds
//   getContenuById: mock(() => null),
//   getAllCreators: mock(() => []),
//   getAllContenus: mock(() => []),
//   // The Createur type is imported and used, no need to mock it here
// }));

// // --- Test Suite ---

// describe("fetchCreatorAndContentIds", () => {
//   // Reset mocks before each test if necessary, though Bun's mocking might handle this.
//   // beforeEach(() => {
//   //   mock.restore(); // Or reset specific mocks if needed
//   // });

//   it("should find creator and content from a valid URL", async () => {
//     const identifier = "https://twitch.tv/testuser";
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toEqual(mockCreators.testuser);
//     expect(result.contentIds).toEqual(mockContentIds[1]);
//     expect(result.error).toBeNull();
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBe("testuser");
//     expect(result.platform).toBe("twitch");
//   });

//   it("should find creator and content from a plain username", async () => {
//     const identifier = "plainuser";
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toEqual(mockCreators.plainuser);
//     expect(result.contentIds).toEqual(mockContentIds[2]);
//     expect(result.error).toBeNull();
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBe("plainuser");
//     expect(result.platform).toBeNull(); // processSearchInput mock returns null for this
//   });

//    it("should find creator and content from another valid URL (YouTube)", async () => {
//     const identifier = "https://www.youtube.com/@ytuser";
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toEqual(mockCreators.ytuser);
//     expect(result.contentIds).toEqual(mockContentIds[3]);
//     expect(result.error).toBeNull();
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBe("ytuser");
//     expect(result.platform).toBe("youtube");
//   });

//   it("should return error if creator is not found (from URL)", async () => {
//     const identifier = "https://twitch.tv/unknownuser"; // processSearchInput will return null
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toBeNull();
//     expect(result.contentIds).toBeNull();
//     // The error depends on whether processSearchInput returns a username or not
//     // Based on current mock, it returns null, leading to "Invalid or empty username"
//     expect(result.error).toContain("Invalid or empty username");
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBeNull();
//     expect(result.platform).toBeNull();
//   });

//    it("should return error if creator is not found (from plain username)", async () => {
//     const identifier = "unknownuser";
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toBeNull();
//     expect(result.contentIds).toBeNull();
//     expect(result.error).toBe(`Creator "unknownuser" not found.`);
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBe("unknownuser");
//     expect(result.platform).toBeNull();
//   });


//   it("should return error if username cannot be extracted from URL", async () => {
//     const identifier = "https://twitter.com/nousername"; // processSearchInput mock returns null username
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toBeNull();
//     expect(result.contentIds).toBeNull();
//     expect(result.error).toBe("Could not extract a valid username from the provided URL.");
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBeNull();
//     expect(result.platform).toBe("twitter");
//   });

//   it("should return error for empty identifier", async () => {
//     const identifier = "";
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toBeNull();
//     expect(result.contentIds).toBeNull();
//     expect(result.error).toBe("Invalid or empty username provided or extracted.");
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBeNull();
//     expect(result.platform).toBeNull();
//   });

//   it("should handle errors during creator lookup", async () => {
//     const identifier = "erroruser"; // Mocked to throw during findCreatorByUsername
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toBeNull();
//     expect(result.contentIds).toBeNull();
//     expect(result.error).toBe(`Failed to look up creator "erroruser".`);
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBe("erroruser");
//     expect(result.platform).toBeNull();
//   });

//   it("should handle errors during content ID fetching", async () => {
//     const identifier = "contenterroruser"; // Mocked to throw during getContenuIdsByCreator
//     const result = await fetchCreatorAndContentIds(identifier);

//     expect(result.creator).toEqual(mockCreators.contenterroruser); // Creator is found
//     expect(result.contentIds).toBeNull(); // Content fetch failed
//     expect(result.error).toBe("Creator found, but failed to load content list.");
//     expect(result.identifierUsed).toBe(identifier);
//     expect(result.usernameFound).toBe("contenterroruser");
//     expect(result.platform).toBeNull();
//   });
// });
