use axum::Router;
use rust_monolith::storage::routes::create_routes;
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = Router::new().merge(create_routes());

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    log::info!("Listening on http://{addr}");

    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(addr).await.unwrap();
    if let Err(e) = axum::serve(listener, app).await {
        log::error!("Server error: {e}");
        std::process::exit(1);
    }
}
