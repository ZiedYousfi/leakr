use crate::storage::storage_utils::{create_client, download_object, upload_object};
use axum::{
    Router,
    extract::{Multipart, Path},
    http::StatusCode,
    response::Json,
    routing::{get, post},
};
use serde_json::json;
use std::io::Write;

pub fn create_routes() -> Router {
    Router::new()
        .route("/upload", post(upload_object_handler))
        .route("/download/:key", get(download_object_handler))
}

// Axum handler functions

pub async fn upload_object_handler(
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Extract the file from the multipart form
    let field = match multipart.next_field().await {
        Ok(Some(field)) => field,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let filename = match field.file_name().map(|s| s.to_string()) {
        Some(name) => name,
        None => return Err(StatusCode::BAD_REQUEST),
    };

    // Validate filename pattern
    let re = regex::Regex::new(r"^leakr_db_[0-9a-fA-F-]{36}_[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}-[0-9]{2}-[0-9]{2}_it[0-9]+\.sqlite$")
    .unwrap();
    if !re.is_match(&filename) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let data = match field.bytes().await {
        Ok(data) => data,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    // Save temporarily to disk
    let temp_path = format!("/tmp/{filename}");
    let mut file = match std::fs::File::create(&temp_path) {
        Ok(file) => file,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    if file.write_all(&data).is_err() {
        let _ = std::fs::remove_file(&temp_path);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    // Upload to R2
    let client = match create_client().await {
        Ok(client) => client,
        Err(_) => {
            let _ = std::fs::remove_file(&temp_path);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "default-bucket".to_string());

    if upload_object(&client, &bucket, &filename, &temp_path)
        .await
        .is_err()
    {
        let _ = std::fs::remove_file(&temp_path);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);

    Ok(Json(json!({
      "message": "File uploaded successfully",
      "key": filename
    })))
}

pub async fn download_object_handler(
    Path(key): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let client = match create_client().await {
        Ok(client) => client,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "default-bucket".to_string());

    let temp_path = format!("/tmp/{key}");

    match download_object(&client, &bucket, &key, &temp_path).await {
        Ok(_) => {
            // In a real implementation, you'd want to stream the file back
            // For now, just return a success message
            Ok(Json(json!({
                "message": "File downloaded successfully",
                "key": key,
                "path": temp_path
            })))
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
