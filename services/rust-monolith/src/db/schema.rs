// @generated automatically by Diesel CLI.

diesel::table! {
    users (uuid) {
        uuid -> Text,
        clerk_user_id -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    files (id){
        id -> Integer,
        uuid_of_users -> Text,
        date -> Text,
        time -> Text,
        iteration -> Integer,
    }
}

diesel::joinable!(files -> users(uuid_of_users));
diesel::allow_tables_to_appear_in_same_query!(
    users,
    files,
);
