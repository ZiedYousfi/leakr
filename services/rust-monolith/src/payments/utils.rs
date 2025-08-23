pub fn new_stripe_client() -> stripe::Client {
    let stripe_key = std::env::var("STRIPE_API_KEY").expect("STRIPE_API_KEY env var not found");
    stripe::Client::new(stripe_key)
}
