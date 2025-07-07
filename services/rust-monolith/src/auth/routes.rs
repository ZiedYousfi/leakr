use axum::{
  body::Bytes,
  http::{HeaderMap, StatusCode},
  response::IntoResponse,
  routing::post,
  Router,
};
use svix::webhooks::Webhook;
use serde_json::Value;

async fn clerk_webhook(
  headers: HeaderMap,
  body: Bytes,
) -> impl IntoResponse {
  // On récupère le corps du POST
  let payload = body;

  // Vérification signature svix
  let secret = std::env::var("CLERK_WEBHOOK_SECRET").expect("CLERK_WEBHOOK_SECRET not set");
  let wh = Webhook::new(&secret).expect("Failed to create webhook");

  // No need to extract headers manually; pass the whole HeaderMap to verify
  if wh.verify(&payload, &headers).is_err() {
      return (StatusCode::UNAUTHORIZED, "invalid signature").into_response();
  }

  // On parse le body JSON
  let event: Value = match serde_json::from_slice(&payload) {
      Ok(val) => val,
      Err(_) => return (StatusCode::BAD_REQUEST, "invalid JSON").into_response(),
  };

  // On récupère les données utilisateur
  if event["type"] == "user.created" {
      let user_data = &event["data"];
      // ===> Ici tu fais ce que tu veux avec `user_data` <===
      dbg!(user_data); // temporaire, à remplacer
  }

  (StatusCode::OK, "ok").into_response()
}

pub fn create_auth_router() -> Router {
  let router = Router::new()
      .route("/webhook/clerk", post(clerk_webhook));
  Router::new().nest("/auth", router)
}
