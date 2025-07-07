use axum::Router;
use std::net::SocketAddr;

fn router_v1_constructor() -> Router {
    let init_router = Router::new().merge(rust_monolith::storage::routes::create_routes());
    Router::new().nest("/v1", init_router)
}

fn check_env_vars_and_init_logger() {
    dotenvy::dotenv().ok();
    env_logger::init();
    let required_vars = [
        "RUST_LOG",
        "RUST_BACKTRACE",
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_ACCESS_KEY_SECRET",
        "R2_BUCKET_MAIN",
        "R2_BUCKET_BACKUP",
        "CLERK_SECRET_KEY",
        "DATABASE_URL",
    ];

    let mut missing_or_empty_vars = Vec::new();

    for var in required_vars {
        match std::env::var(var) {
            Ok(val) if !val.trim().is_empty() => {}
            _ => {
                log::error!("Missing or empty required environment variable: {var}");
                missing_or_empty_vars.push(var);
            }
        }
    }

    if !missing_or_empty_vars.is_empty() {
        log::error!(
            "Exiting due to missing or empty environment variables: {missing_or_empty_vars:?}"
        );
        std::process::exit(1);
    }
}

#[tokio::main]
async fn main() {
    check_env_vars_and_init_logger();
    let app = Router::new().nest("/api", router_v1_constructor());

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    log::info!("Listening on http://{addr}");

    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(addr).await.unwrap();
    if let Err(e) = axum::serve(listener, app).await {
        log::error!("Server error: {e}");
        std::process::exit(1);
    }
}
