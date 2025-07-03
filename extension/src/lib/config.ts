export const STORAGE_SERVICE_BASE_URL = "https://storage.leakr.net";

// Authentication constants moved from authVars.ts
export const CLIENT_ID = "NzLJ39zhJ5DgNjRX";
export const AUTHORIZE_ENDPOINT = "https://finer-humpback-59.clerk.accounts.dev/oauth/authorize";
export const LEAKR_UUID_ENDPOINT = "https://db.leakr.net/users/clerk/:clerk_id"; // * `GET /users/clerk/:clerk_id`: Get a user's UUID by their Clerk user ID.
export const AUTH_SERVICE_BASE_URL = "https://auth.leakr.net"; // Base URL for your Go auth-service
