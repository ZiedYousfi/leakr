// @generated automatically by Diesel CLI.

diesel::table! {
    files (id) {
        id -> Int4,
        uuid_of_users -> Text,
        date -> Text,
        time -> Text,
        iteration -> Int4,
    }
}

diesel::table! {
    users (uuid) {
        uuid -> Text,
        clerk_user_id -> Text,
        name -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
        files -> Int4,
    }
}

diesel::joinable!(files -> users (uuid_of_users));

diesel::allow_tables_to_appear_in_same_query!(
    files,
    users,
);
