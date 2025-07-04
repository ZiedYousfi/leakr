use crate::storage::storage_utils::{
    create_client, download_object, generate_get_presigned_url, generate_upload_presigned_url,
    upload_object,
};
use axum::{
    Router,
    extract::{Multipart, Path},
    http::StatusCode,
    response::Json,
    routing::{get, post},
};
use serde_json::json;
use std::io::Write;
use std::time::Duration;

pub fn create_routes() -> Router {
    Router::new()
        .route("/upload", post(upload_object_handler))
        .route("/download/:key", get(download_object_handler))
        .route(
            "/presigned/get/:key",
            get(generate_get_presigned_url_handler),
        )
        .route(
            "/presigned/upload/:key",
            get(generate_upload_presigned_url_handler),
        )
}

// Axum handler functions

pub async fn upload_object_handler(
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let client = match create_client().await {
        Ok(client) => client,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "default-bucket".to_string());

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap_or("file");
        let filename = field.file_name().unwrap_or("unnamed");
        let data = field.bytes().await.unwrap();

        // Save temporarily to upload
        let temp_path = format!("/tmp/{}", filename);
        let mut file = match std::fs::File::create(&temp_path) {
            Ok(file) => file,
            Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
        };

        if file.write_all(&data).is_err() {
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }

        // Upload to R2
        if upload_object(&client, &bucket, filename, &temp_path)
            .await
            .is_err()
        {
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }

        // Clean up temp file
        let _ = std::fs::remove_file(&temp_path);

        return Ok(Json(json!({
            "message": "File uploaded successfully",
            "key": filename
        })));
    }

    Err(StatusCode::BAD_REQUEST)
}

pub async fn download_object_handler(
    Path(key): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let client = match create_client().await {
        Ok(client) => client,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "default-bucket".to_string());

    let temp_path = format!("/tmp/{}", key);

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

pub async fn generate_get_presigned_url_handler(
    Path(key): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let client = match create_client().await {
        Ok(client) => client,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "default-bucket".to_string());

    let expires_in = Duration::from_secs(3600); // 1 hour

    match generate_get_presigned_url(&client, &bucket, &key, expires_in).await {
        Ok(url) => Ok(Json(json!({
            "presigned_url": url,
            "expires_in_seconds": 3600
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn generate_upload_presigned_url_handler(
    Path(key): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let client = match create_client().await {
        Ok(client) => client,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "default-bucket".to_string());

    let expires_in = Duration::from_secs(3600); // 1 hour

    match generate_upload_presigned_url(&client, &bucket, &key, expires_in).await {
        Ok(url) => Ok(Json(json!({
            "presigned_url": url,
            "expires_in_seconds": 3600
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
