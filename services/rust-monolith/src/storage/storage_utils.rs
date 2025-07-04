//! # Storage Utilities
//!
//! This module provides utilities for interacting with Cloudflare R2 (S3-compatible) storage.
//!
//! ## Environment Variables
//!
//! - `R2_ACCOUNT_ID`: Your Cloudflare R2 account ID
//! - `R2_ACCESS_KEY_ID`: Your R2 access key ID
//! - `R2_ACCESS_KEY_SECRET`: Your R2 access key secret

use anyhow::{Error, Result};
use aws_sdk_s3 as s3;
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::primitives::ByteStream;
use dotenvy::dotenv;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::Duration;

pub async fn create_client() -> Result<s3::Client, Error> {
    dotenv().ok();

    let account_id = std::env::var("R2_ACCOUNT_ID")
        .map_err(|_| anyhow::anyhow!("R2_ACCOUNT_ID environment variable not set"))?;
    let access_key_id = std::env::var("R2_ACCESS_KEY_ID")
        .map_err(|_| anyhow::anyhow!("R2_ACCESS_KEY_ID environment variable not set"))?;
    let access_key_secret = std::env::var("R2_ACCESS_KEY_SECRET")
        .map_err(|_| anyhow::anyhow!("R2_ACCESS_KEY_SECRET environment variable not set"))?;

    // Validate account_id contains only alphanumeric characters and hyphens
    if !account_id.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return Err(anyhow::anyhow!("Invalid R2_ACCOUNT_ID format"));
    }

    // Configure the client
    let config = aws_config::from_env()
        .endpoint_url(format!("https://{account_id}.r2.cloudflarestorage.com"))
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            access_key_id,
            access_key_secret,
            None, // session token is not used with R2
            None,
            "R2",
        ))
        .region("auto")
        .load()
        .await;

    let client = s3::Client::new(&config);

    Ok(client)
}

pub async fn upload_object(
    client: &s3::Client,
    bucket: &str,
    key: &str,
    file_path: &str,
) -> Result<(), Error> {
    let body = ByteStream::from_path(Path::new(file_path)).await.unwrap();

    client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(body)
        .send()
        .await?;

    log::info!("Uploaded {file_path} to {bucket}/{key}");
    Ok(())
}

pub async fn download_object(
    client: &s3::Client,
    bucket: &str,
    key: &str,
    output_path: &str,
) -> Result<(), Error> {
    let resp = client.get_object().bucket(bucket).key(key).send().await?;

    let data = resp.body.collect().await?;
    let bytes = data.into_bytes();

    let mut file = fs::File::create(output_path)?;
    file.write_all(&bytes)?;

    log::info!("Downloaded {bucket}/{key} to {output_path}");
    Ok(())
}

pub async fn download_object_as_bytestream(
    client: &s3::Client,
    bucket: &str,
    key: &str,
) -> Result<ByteStream, Error> {
    let resp = client.get_object().bucket(bucket).key(key).send().await?;
    Ok(resp.body)
}

pub async fn generate_get_presigned_url(
    client: &s3::Client,
    bucket: &str,
    key: &str,
    expires_in: Duration,
) -> Result<String, Error> {
    let presigning_config = PresigningConfig::expires_in(expires_in)?;

    // Generate a presigned URL for GET (download)
    let presigned_get_request = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .presigned(presigning_config)
        .await?;

    Ok(presigned_get_request.uri().to_string())
}

pub async fn generate_upload_presigned_url(
    client: &s3::Client,
    bucket: &str,
    key: &str,
    expires_in: Duration,
) -> Result<String, Error> {
    let presigning_config = PresigningConfig::expires_in(expires_in)?;

    // Generate a presigned URL for PUT (upload)
    let presigned_put_request = client
        .put_object()
        .bucket(bucket)
        .key(key)
        .presigned(presigning_config)
        .await?;

    Ok(presigned_put_request.uri().to_string())
}
