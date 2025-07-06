use diesel::prelude::*;

#[derive(Queryable, Insertable, AsChangeset, Debug)]
#[diesel(table_name = crate::db::schema::users)]
pub struct Users {
    pub uuid: String,
    pub created_at: chrono::NaiveDateTime,
    pub files: i32,
    pub clerk_user_id: String,
}
