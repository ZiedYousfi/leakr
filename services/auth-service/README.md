# Auth Service

The Auth Service is a Go-based microservice responsible for handling user authentication and token verification using Clerk.

## Prerequisites

- Go (version 1.18 or higher recommended)
- A Clerk account and a Clerk application.
- The following environment variable set:
  - `CLERK_SECRET_KEY`: Your Clerk application's secret key.
  - `PORT`: (Optional) The port on which the service will run. Defaults to `8080`.

## Running the Service

1. **Clone the repository (if applicable) or navigate to the service directory.**
2. **Set the environment variables:**

   ```bash
   export CLERK_SECRET_KEY="your_clerk_secret_key"
   export PORT="8080" # Optional
   ```

3. **Run the service:**

   ```bash
   go run main.go
   ```

   The service will start, and you should see a log message indicating the port it's listening on (e.g., `Starting auth-service on port 8080...`).

## API Endpoints

### 1. Verify Token

- **Endpoint:** `POST /verify`
- **Description:** Verifies a JWT token issued by Clerk.
- **Request:**
  - **Headers:**
    - `Authorization: Bearer <your_jwt_token>`
  - **Body:** None
- **Response:**
  - **Success (200 OK):**

    ```json
    {
        "session_id": "sess_xxxxxxxxxxxx",
        "user_id": "user_yyyyyyyyyyyy",
        "issued_at": "2023-10-27T10:00:00Z",
        "expires_at": "2023-10-27T11:00:00Z"
    }
    ```

  - **Error (401 Unauthorized):** If the token is invalid or expired.

    ```json
    {
        "error": "invalid_token"
    }
    ```

### 2. Get User Information (Me)

- **Endpoint:** `GET /me`
- **Description:** Retrieves information about the authenticated user based on the provided JWT token. This endpoint is protected and requires a valid token.
- **Request:**
  - **Headers:**
    - `Authorization: Bearer <your_jwt_token>`
- **Response:**
  - **Success (200 OK):**

    ```json
    {
        "session_id": "sess_xxxxxxxxxxxx",
        "user_id": "user_yyyyyyyyyyyy",
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

  - **Error (500 Internal Server Error):** If claims cannot be retrieved from the context (should not happen in normal operation).

    ```json
    {
        "error": "claims_not_found"
    }
    ```

## Dependencies

- [Fiber](https://github.com/gofiber/fiber): Express inspired web framework written in Go.
- [Clerk SDK for Go](https://github.com/clerk/clerk-sdk-go): Official Go SDK for Clerk.
