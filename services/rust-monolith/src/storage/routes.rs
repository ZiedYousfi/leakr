use crate::{
    db::models::files::NewFileTable,
    storage::{
        filename_utils::{FileComparisonResult, Filename, compare_files},
        storage_utils::{create_client, download_object_as_bytestream, upload_object},
    },
};
use axum::{
    Router,
    extract::Multipart,
    http::StatusCode,
    response::Json,
    routing::{get, post},
};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use std::io::Write;
use tempfile::NamedTempFile;

pub fn create_routes() -> Router {
    let router = Router::new()
        .route("/upload", post(upload_object_handler))
        .route("/download/file/{filename}", get(download_object_handler))
        .route("/info/user/{uuid}", get(user_info_handler));
    Router::new().nest("/storage", router)
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct UploadResponse {
    pub message: String,
    pub key: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct DownloadResponse {
    pub message: String,
    pub data: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct UserInfoResponse {
    pub uuid: String,
    pub response: FileComparisonResult,
}

// Axum handler functions

pub async fn upload_object_handler(
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
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

    Ok(Json(UploadResponse {
        message: "File uploaded successfully".to_string(),
        key: filename,
    }))
}

pub async fn download_object_handler(
    axum::extract::Path(filename): axum::extract::Path<String>,
) -> Result<Json<DownloadResponse>, StatusCode> {
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

            Ok(Json(DownloadResponse {
                message: "File downloaded successfully".to_string(),
                data: encoded,
            }))
        }
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn user_info_handler(
    axum::extract::Path(uuid): axum::extract::Path<String>,
) -> Result<Json<UserInfoResponse>, StatusCode> {
    // Validate UUID format
    if uuid.is_empty() || uuid.len() != 36 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut conn = crate::db::db_utils::get_connection(&crate::db::db_utils::establish_pool());

    let user_files = match crate::db::models::users::Users::get_user_files(&mut conn, &uuid) {
        Ok(files) => files,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    if user_files.is_empty() {
        return Err(StatusCode::NOT_FOUND);
    }

    let most_recent_file = user_files
        .iter()
        .max_by_key(|file| (file.date.clone(), file.time.clone()))
        .ok_or(StatusCode::NOT_FOUND)?;

    let most_iteration_file = user_files.iter().max_by_key(|file| file.iteration).unwrap();

    let most_iteration_file = Filename::from_parts(
        most_iteration_file.uuid_of_users.as_str(),
        &most_iteration_file.date,
        &most_iteration_file.time,
        most_iteration_file.iteration as u32,
    );

    let most_recent_file = Filename::from_parts(
        most_recent_file.uuid_of_users.as_str(),
        &most_recent_file.date,
        &most_recent_file.time,
        most_recent_file.iteration as u32,
    );

    match compare_files(&most_recent_file, &most_iteration_file) {
        Ok(result) => match result {
            FileComparisonResult::BestFile(file) => Ok(Json(UserInfoResponse {
                uuid: uuid.clone(),
                response: FileComparisonResult::BestFile(file),
            })),
            FileComparisonResult::ConflictingFiles {
                most_recent_file,
                most_iteration_file,
            } => Ok(Json(UserInfoResponse {
                uuid: uuid.clone(),
                response: FileComparisonResult::ConflictingFiles {
                    most_recent_file,
                    most_iteration_file,
                },
            })),
        },
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
