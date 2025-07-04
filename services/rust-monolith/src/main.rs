use axum::Router;
use std::net::SocketAddr;

fn router_v1_constructor() -> Router {
    let init_router = Router::new().merge(rust_monolith::storage::routes::create_routes());
    Router::new().nest("/v1", init_router)
}

#[tokio::main]
async fn main() {
    let app = Router::new().nest("/api", router_v1_constructor());

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    log::info!("Listening on http://{addr}");

    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(addr).await.unwrap();
    if let Err(e) = axum::serve(listener, app).await {
        log::error!("Server error: {e}");
        std::process::exit(1);
    }
}
