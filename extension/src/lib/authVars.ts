export const CLIENT_ID = "NzLJ39zhJ5DgNjRX";
// CLIENT_SECRET is no longer needed here as it's handled by the auth-service
export const AUTHORIZE_ENDPOINT = "https://finer-humpback-59.clerk.accounts.dev/oauth/authorize";
// TOKEN_ENDPOINT is no longer directly called from the extension for exchange/refresh
export const TOKEN_ENDPOINT = "https://finer-humpback-59.clerk.accounts.dev/oauth/token"; // Kept for reference or other direct calls if any
export const USERINFO_ENDPOINT = "https://finer-humpback-59.clerk.accounts.dev/oauth/userinfo";
export const LEAKR_UUID_ENDPOINT = "https://db.leakr.net/users/clerk/:clerk_id"; // * `GET /users/clerk/:clerk_id`: Get a user's UUID by their Clerk user ID.
// INTROSPECTION_ENDPOINT is no longer directly called from the extension
export const INTROSPECTION_ENDPOINT = "https://finer-humpback-59.clerk.accounts.dev/oauth/token_info"; // Kept for reference

export const AUTH_SERVICE_BASE_URL = "https://auth.leakr.net"; // Base URL for your Go auth-service

