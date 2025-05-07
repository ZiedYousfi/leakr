# Storage Service

The `storage-service` is a **Go application** designed to be deployed on **Fly.io**. It is responsible for managing user data backups, specifically their SQLite database files, by interacting with Cloudflare R2.

## 🚀 Features

- **Upload**: Allows authenticated users to upload their SQLite database files for backup to Cloudflare R2.
- **Download**: Enables authenticated users to retrieve their backed-up database files from Cloudflare R2.
- **Backup Management**: Organizes files within Cloudflare R2 buckets (e.g., `main` and `backup`) for versioning and recovery.
- **Secure**: Relies on `auth-service` for request authentication and leverages Cloudflare's infrastructure for secure and reliable storage.

## 🛠️ Technology Stack

- **Go**: Programming language for the service.
- **Fiber**: Go web framework used for building the API.
- **Fly.io**: Deployment platform for the service.
- **Cloudflare R2**: Primary object storage for database files. This service will interact with R2 using the AWS SDK for Go, configured with R2-specific credentials and endpoint.

## ⚙️ Configuration

The service interacts with Cloudflare R2 buckets. Key buckets include:

- `R2_MAIN`: For primary, most recent backups.
- `R2_BACKUP`: For older or archived versions.

This Go service will require environment variables for Cloudflare R2 access:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_MAIN_NAME` (e.g., "main")
- `R2_BUCKET_BACKUP_NAME` (e.g., "backup")

Refer to [../../infra/cloudflare/r2-uploader/wrangler.jsonc](../../infra/cloudflare/r2-uploader/wrangler.jsonc) for R2 bucket naming conventions, although the `r2-uploader` (Cloudflare Worker) is a separate component and not directly used by this Go service for uploads/downloads. This Go service will perform direct S3-compatible API calls to R2.

## ↔️ API Routes

The following routes are handled by this service:

- `POST /upload`: Uploads a database file.
  - Requires authentication (e.g., JWT validated by `auth-service`). (Don't do it for now for the sake of simplicity and testing.)
  - Expects a multipart/form-data request with the file.
  - Filename should ideally contain metadata (user ID, timestamp, iteration).
  - For uploads, the service will receive the file. To handle potential rapid successive uploads from the same user, the service may temporarily cache the received file (e.g., in memory or on local disk) before streaming/uploading it to the appropriate R2 bucket using the AWS SDK for Go (V2) configured for R2. This caching helps prevent redundant R2 operations if a user uploads multiple times in a short period.
- `GET /download/user/{uuid}`: Downloads the latest database file for a specific user.
  - Requires authentication.
  - The `uuid` is the user identifier.
- `GET /download/file/{filename}`: Downloads a specific database file by its filename.
  - Requires authentication.
  - Requires the exact filename as stored in R2.
- `POST /backup`: (Future Scope) Could be used to move files from the `main` bucket to the `backup` bucket in R2, or trigger other archival logic.
  - Requires authentication.

For a comprehensive list of all service routes, see [../routes.md](../routes.md).

## 💡 Implementation Notes

- This Go service, running on Fly.io and built with Fiber, will handle client requests for uploads and downloads.
- It will authenticate requests (likely via `auth-service`) before interacting with Cloudflare R2.
- For uploads, the service will receive the file. To handle potential rapid successive uploads from the same user, the service may temporarily cache the received file (e.g., in memory or on local disk) before streaming/uploading it to the appropriate R2 bucket using the AWS SDK for Go (V2) configured for R2. This caching helps prevent redundant R2 operations if a user uploads multiple times in a short period.
- For downloads, the service will fetch the file from R2 and stream it back to the client.
- Filenames are crucial for identifying and retrieving user-specific backups. A consistent naming convention is enforced: `leakr_db_{uuid}_{timestamp}_it{iteration}.sqlite`. The `uuid` will be derived from the authenticated user.
- The service ensures that uploads are placed into the correct R2 buckets (e.g., `main` for recent, `backup` for older versions) based on internal logic or request parameters.
- The `r2-uploader` Cloudflare Worker mentioned in `wrangler.jsonc` is a separate deployment and not directly invoked by this Go `storage-service` for its core operations. This Go service performs its own S3 API calls to R2.
