use axum::{
    Router,
    body::Bytes,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::post,
};
use serde_json::Value;
use svix::webhooks::Webhook;
use clerk_rs::models::User as ClerkUser;
use crate::db::models::users::NewUsers;

async fn clerk_webhook(headers: HeaderMap, body: Bytes) -> impl IntoResponse {
    let payload = body;

    let secret = std::env::var("CLERK_WEBHOOK_SECRET").expect("CLERK_WEBHOOK_SECRET not set");
    let wh = Webhook::new(&secret).expect("Failed to create webhook");

    if wh.verify(&payload, &headers).is_err() {
        return (StatusCode::UNAUTHORIZED, "invalid signature").into_response();
    }

    // On parse le body JSON
    let event: Value = match serde_json::from_slice(&payload) {
        Ok(val) => val,
        Err(_) => return (StatusCode::BAD_REQUEST, "invalid JSON").into_response(),
    };

    if event["type"] == "user.created" {
        let clerk_user: ClerkUser = serde_json::from_value(event["data"].clone()).unwrap();
        let user: NewUsers = NewUsers::new(uuid::Uuid::new_v4().into(), clerk_user.id.unwrap());
        let pool = crate::db::db_utils::establish_pool();
        let mut conn = crate::db::db_utils::get_connection(&pool);
        let _ = user.insert_into_db(&mut conn);
    }

    (StatusCode::OK, "ok").into_response()
}

pub fn create_auth_router() -> Router {
    let router = Router::new().route("/webhook/clerk", post(clerk_webhook));
    Router::new().nest("/auth", router)
}
