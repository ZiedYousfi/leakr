# Auth Service

The Auth Service is a Go-based microservice responsible for handling user authentication, OAuth token exchange, token refresh, and token verification using Clerk.

## Prerequisites

- Go (version 1.18 or higher recommended)
- A Clerk account and a Clerk application configured for OAuth 2.0.
- The following environment variables set:
  - `CLERK_BASE_URL`: Your Clerk instance's base URL (e.g., `https://your-instance.clerk.accounts.dev`). Used for all Clerk OAuth and introspection calls.
  - `CLERK_OAUTH_CLIENT_ID`: Your Clerk OAuth application's Client ID. Used for authenticating with Clerk's OAuth endpoints (token exchange, refresh, and introspection via `/oauth/token_info`).
  - `CLERK_OAUTH_CLIENT_SECRET`: Your Clerk OAuth application's Client Secret. Used for authenticating with Clerk's OAuth endpoints (token exchange, refresh, and introspection via `/oauth/token_info`).
  - `DB_SERVICE_URL`: (Optional, for webhook functionality) The URL of your database service (e.g., `http://localhost:8081`).
  - `PORT`: (Optional) The port on which the service will run. Defaults to `8080`.
  - `CLERK_SECRET_KEY`: Your Clerk application's secret key. (Optional: Primarily intended for webhook signature verification if implemented, or if using Clerk's backend SDK for other verification methods not currently active in `/verify`).

## Running the Service

1. **Clone the repository (if applicable) or navigate to the service directory.**
2. **Set the environment variables:**
   Create a `.env` file in the service directory or export them in your shell:

   ```bash
   export CLERK_BASE_URL="https://your-instance.clerk.accounts.dev"
   export CLERK_OAUTH_CLIENT_ID="your_clerk_oauth_client_id"
   export CLERK_OAUTH_CLIENT_SECRET="your_clerk_oauth_client_secret"
   export DB_SERVICE_URL="http://localhost:8081" # If using webhooks
   export PORT="8080" # Optional
   # export CLERK_SECRET_KEY="your_clerk_secret_key" # If using webhook signature verification
   ```

3. **Run the service:**

   ```bash
   go run main.go
   ```

   The service will start, and you should see a log message indicating the port it's listening on.

## API Endpoints

### 1. Verify Token

- **Endpoint:** `POST /verify`
- **Description:** Verifies an access token issued by Clerk (via introspection).
- **Request:**
  - **Headers:**
    - `Authorization: Bearer <your_access_token>`
  - **Body:** None
- **Response:**
  - **Success (200 OK):**

    ```json
    {
        "active": true,
        "user_id": "user_yyyyyyyyyyyy", // Clerk User ID (sub claim)
        "issued_at": "2023-10-27T10:00:00Z",
        "expires_at": "2023-10-27T11:00:00Z"
    }
    ```

  - **Error (401 Unauthorized):** If the token is invalid, expired, or missing.

    ```json
    {
        "error": "invalid_token"
    }
    ```

    (Or other specific errors like `missing_authorization_header`, `empty_token`)

### 2. Get User Information (Me)

- **Endpoint:** `GET /me`
- **Description:** Retrieves information about the authenticated user based on the provided access token. This endpoint is protected and requires a valid token.
- **Request:**
  - **Headers:**
    - `Authorization: Bearer <your_access_token>`
- **Response:**
  - **Success (200 OK):**

    ```json
    {
        "user_id": "user_yyyyyyyyyyyy", // Clerk User ID (sub claim)
        "issued_at": "2023-10-27T10:00:00Z",
        "expires_at": "2023-10-27T11:00:00Z"
    }
    ```

  - **Error (403 Forbidden):** If the token is missing, invalid, or expired.

    ```json
    {
        "error": "forbidden"
    }
    ```

    (Or other specific errors like `missing_authorization_header`, `empty_token`)
  - **Error (500 Internal Server Error):** If an unexpected error occurs.

### 3. Exchange Authorization Code for Tokens

- **Endpoint:** `POST /oauth/exchange-code`
- **Description:** Exchanges an OAuth authorization code (and PKCE code verifier) for an access token and refresh token from Clerk. This endpoint is called by the client (e.g., browser extension) after a successful user authorization redirect.
- **Request:**
  - **Headers:**
    - `Content-Type: application/json`
  - **Body:**

    ```json
    {
        "code": "your_authorization_code",
        "redirect_uri": "your_client_redirect_uri",
        "code_verifier": "your_pkce_code_verifier"
    }
    ```

- **Response:**
  - **Success (200 OK):** Proxies the JSON response from Clerk's token endpoint.

    ```json
    {
        "access_token": "ey...",
        "refresh_token": "rfs_...",
        "id_token": "ey...", // If openid scope was used
        "token_type": "Bearer",
        "expires_in": 3599,
        // ... other fields from Clerk
    }
    ```

  - **Error (4xx/5xx):** If the exchange fails (e.g., invalid code, client auth failed, Clerk error). The response body will typically be a JSON error from Clerk or the auth-service.

    ```json
    {
        "error": "invalid_grant", // Example from Clerk
        "error_description": "The provided authorization grant or refresh token is invalid, expired, revoked, ..."
    }
    ```

    ```json
    {
        "error": "clerk_oauth_config_missing" // Example from auth-service
    }
    ```

### 4. Refresh Access Token

- **Endpoint:** `POST /oauth/refresh-token`
- **Description:** Uses a refresh token to obtain a new access token (and potentially a new refresh token) from Clerk.
- **Request:**
  - **Headers:**
    - `Content-Type: application/json`
  - **Body:**

    ```json
    {
        "refresh_token": "your_existing_refresh_token"
    }
    ```

- **Response:**
  - **Success (200 OK):** Proxies the JSON response from Clerk's token endpoint.

    ```json
    {
        "access_token": "ey_new...",
        "refresh_token": "rfs_new...", // Clerk might issue a new refresh token
        "id_token": "ey_new...", // If applicable
        "token_type": "Bearer",
        "expires_in": 3599,
        // ... other fields from Clerk
    }
    ```

  - **Error (4xx/5xx):** If the refresh fails (e.g., invalid refresh token, Clerk error). The response body will typically be a JSON error from Clerk or the auth-service.

    ```json
    {
        "error": "invalid_grant", // Example from Clerk
        "error_description": "The provided authorization grant or refresh token is invalid, expired, revoked, ..."
    }
    ```

### 5. Clerk Webhook Handler

- **Endpoint:** `POST /webhooks/clerk`
- **Description:** Handles incoming webhooks from Clerk (e.g., `user.created`). The current implementation is simplified and expects a `user.created` event to then call a DB service. **Note:** Secure signature verification for webhooks should be implemented.
- **Request:**
  - Body: Clerk webhook payload (JSON).
- **Response:**
  - **Success (200 OK):**

    ```json
    {
        "message": "webhook_ok"
    }
    ```

    Or for unhandled event types:

    ```json
    {
        "message": "event_type_not_handled",
        "type": "event.type"
    }
    ```

  - **Error (4xx/5xx):** If processing fails.

## Dependencies

- [Fiber](https://github.com/gofiber/fiber): Express inspired web framework written in Go.
- [Clerk SDK for Go](https://github.com/clerk/clerk-sdk-go): Official Go SDK for Clerk.
