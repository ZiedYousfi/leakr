use axum::extract::Request;
use axum::http::StatusCode;
use axum::{
    body::to_bytes,
    extract::FromRequest,
    response::{IntoResponse, Response},
}; // alias for Request with default body

// Public so it can be used in route handlers.
pub struct StripeEvent(pub stripe::Event);

impl FromRequest<()> for StripeEvent {
    type Rejection = Response;

    async fn from_request(req: Request, _state: &()) -> Result<Self, Self::Rejection> {
        let signature_header = req
            .headers()
            .get("stripe-signature")
            .ok_or_else(|| StatusCode::BAD_REQUEST.into_response())?
            .to_str()
            .map_err(|_| StatusCode::BAD_REQUEST.into_response())?
            .to_owned();

        let body = req.into_body();
        // Limit body to e.g. 1MB for safety.
        let bytes = to_bytes(body, 1024 * 1024)
            .await
            .map_err(|_| StatusCode::BAD_REQUEST.into_response())?;
        let payload = String::from_utf8(bytes.to_vec())
            .map_err(|_| StatusCode::BAD_REQUEST.into_response())?;

        let webhook_secret =
            std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_else(|_| "whsec_xxxxx".to_string());

        let event = stripe::Webhook::construct_event(&payload, &signature_header, &webhook_secret)
            .map_err(|_| StatusCode::BAD_REQUEST.into_response())?;

        Ok(Self(event))
    }
}
