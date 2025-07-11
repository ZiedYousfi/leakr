pub fn new_stripe_client() -> Result<stripe::Client, stripe::Error> {
    let stripe_key = std::env::var("STRIPE_API_KEY").expect("STRIPE_API_KEY env var not found");
    let client = stripe::Client::new(stripe_key);
    Ok(client)
}
