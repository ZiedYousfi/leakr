use crate::db::models::files::NewFileTable;
use crate::storage::filename_utils::Filename;
use crate::storage::storage_utils::{create_client, download_object_as_bytestream, upload_object};
use axum::{
    Router,
    extract::Multipart,
    http::StatusCode,
    response::Json,
    routing::{get, post},
};
use base64::{Engine as _, engine::general_purpose};
use serde_json::json;
use std::io::Write;
use tempfile::NamedTempFile;

pub fn create_routes() -> Router {
    let router = Router::new()
        .route("/upload", post(upload_object_handler))
        .route("/download/file/{filename}", get(download_object_handler))
        .route("/info/user/{uuid}", get(user_info_handler));
    Router::new().nest("/storage", router)
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
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    // Validate filename pattern using Filename utils
    if !Filename::validate_filename(&filename) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let data = match field.bytes().await {
        Ok(data) => data,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    // Save temporarily to disk
    let mut temp_file = match NamedTempFile::new() {
        Ok(file) => file,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };
    let temp_path = temp_file.path().to_string_lossy().to_string();
    let file = &mut temp_file;

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

    let bucket = std::env::var("R2_BUCKET_MAIN").unwrap_or_else(|_| "default-bucket".to_string());

    match upload_object(&client, &bucket, &filename, &temp_path).await {
        Ok(_) => {
            // Upload successful, make it in db

            let file_struct = Filename::from_string(&filename).ok_or(StatusCode::BAD_REQUEST)?;

            let new_file = NewFileTable::new(
                file_struct.uuid,
                file_struct.date,
                file_struct.time,
                file_struct.iteration as i32,
            );

            let mut conn =
                crate::db::db_utils::get_connection(&crate::db::db_utils::establish_pool());

            match new_file.insert_into_db(&mut conn) {
                Ok(_) => {}
                Err(_) => {
                    let _ = std::fs::remove_file(&temp_path);
                    return Err(StatusCode::INTERNAL_SERVER_ERROR);
                }
            }
        }
        Err(_) => {
            let _ = std::fs::remove_file(&temp_path);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    }

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);

    Ok(Json(json!({
      "message": "File uploaded successfully",
      "key": filename
    })))
}

pub async fn download_object_handler(
    axum::extract::Path(filename): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Validate filename pattern using Filename utils
    if !Filename::validate_filename(&filename) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let client = match create_client().await {
        Ok(client) => client,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let bucket = std::env::var("R2_BUCKET_MAIN").unwrap_or_else(|_| "default-bucket".to_string());

    match download_object_as_bytestream(&client, &bucket, &filename).await {
        Ok(mut data) => {
            let mut bytes = Vec::new();
            while let Some(chunk) = data.try_next().await.unwrap_or(None) {
                bytes.extend_from_slice(&chunk);
            }
            let encoded = general_purpose::STANDARD.encode(&bytes);

            Ok(Json(json!({
                "message": "File downloaded successfully",
                "data": encoded
            })))
        }
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn user_info_handler(
    axum::extract::Path(uuid): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Validate UUID format
    if uuid.is_empty() || uuid.len() != 36 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut conn = crate::db::db_utils::get_connection(&crate::db::db_utils::establish_pool());

    match crate::db::models::users::Users::get_user_files(&mut conn, &uuid) {
        Ok(files) => Ok(Json(json!({
            "message": "User files retrieved successfully",
            "files": files
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
