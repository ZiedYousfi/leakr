use axum::Router;
use std::net::SocketAddr;

fn router_v1_constructor() -> Router {
    let init_router = Router::new().merge(rust_monolith::storage::routes::create_routes());
    Router::new().nest("/v1", init_router)
}

fn check_env_vars() {
    dotenvy::dotenv().ok();
    let required_vars = [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_ACCESS_KEY_SECRET",
        "R2_BUCKET_MAIN",
        "DATABASE_URL",
        "RUST_LOG",
        "RUST_BACKTRACE",
        "R2_BUCKET_BACKUP",
    ];

    for var in required_vars {
        if std::env::var(var).is_err() {
            log::error!("Missing required environment variable: {var}");
            std::process::exit(1);
        }
    }
}

#[tokio::main]
async fn main() {
    log::set_max_level(log::LevelFilter::Info);
    env_logger::init();
    check_env_vars();
    let app = Router::new().nest("/api", router_v1_constructor());

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    log::info!("Listening on http://{addr}");

    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(addr).await.unwrap();
    if let Err(e) = axum::serve(listener, app).await {
        log::error!("Server error: {e}");
        std::process::exit(1);
    }
}
