use clerk_rs::{
    ClerkConfiguration,
    clerk::Clerk,
    validators::{axum::ClerkLayer, jwks::MemoryCacheJwksProvider},
};

pub fn create_client() -> Clerk {
    let config = ClerkConfiguration::new(None, None, Some("CLERK_SECRET_KEY".to_string()), None);
    Clerk::new(config)
}

pub fn create_clerk_layer() -> ClerkLayer<MemoryCacheJwksProvider> {
    let clerk = create_client();
    ClerkLayer::new(MemoryCacheJwksProvider::new(clerk), None, true)
}
