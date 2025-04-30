# DB Service

This service manages the database interactions for the Leakr application, specifically handling user and subscription data. It uses [Ent](https://entgo.io/) for ORM and [Fiber](https://gofiber.io/) as the web framework.

## Prerequisites

* Go (version 1.18 or later recommended)
* PostgreSQL database
* A `.env` file in the service root directory with the following variables:
  * `DATABASE_URL`: The connection string for your PostgreSQL database (e.g., `postgres://user:password@host:port/dbname?sslmode=disable`)
  * `AUTH_SERVICE_URL`: The base URL of the authentication service (e.g., `http://localhost:3001`)

## Setup & Running

1. **Install Dependencies:**

   ```bash
   go mod tidy
   ```

2. **Generate Ent Assets (if schema changes):**

   ```bash
   go generate ./ent
   ```

3. **Run Migrations & Start Server:**

   The service automatically runs migrations on startup (this might be disabled in production).

   ```bash
   go run main.go
   ```

   The service will start listening on port 3000 by default.

## API Endpoints

The service exposes RESTful endpoints under the `/users` path for CRUD operations on user data. Authentication is required via a Bearer token passed in the `Authorization` header, which is verified against the `AUTH_SERVICE_URL`.

* `POST /users`: Create a new user.
* `GET /users`: List all users.
* `GET /users/:id`: Get a specific user by their internal ID.
* `PUT /users/:id`: Update a specific user by their internal ID.
* `DELETE /users/:id`: Delete a specific user by their internal ID.

(Note: Subscription endpoints might be added later)

## Authentication

All endpoints are protected by the `AuthMiddleware`. It expects a valid JWT in the `Authorization: Bearer <token>` header and verifies it by calling the `/verify` endpoint of the configured `AUTH_SERVICE_URL`.
