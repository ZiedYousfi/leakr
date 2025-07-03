// @generated automatically by Diesel CLI.

diesel::table! {
    users (uuid) {
        uuid -> Text,
        clerk_user_id -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}
