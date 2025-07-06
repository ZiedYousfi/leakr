use diesel::prelude::*;

#[derive(Queryable, Insertable, AsChangeset, Debug)]
#[diesel(table_name = crate::db::schema::users)]
// Add check_for_backend for better error messages (optional)
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Users {
    pub uuid: String,
    pub created_at: chrono::NaiveDateTime,
    pub files: i32,
    pub clerk_user_id: String,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = crate::db::schema::users)]
pub struct NewUsers {
    // id is usually auto-incremented, so not included here
    pub uuid: String,
    pub clerk_user_id: String,
}

impl Users {
    pub fn new(uuid: String, clerk_user_id: String) -> Self {
        Self {
            uuid,
            created_at: chrono::Local::now().naive_local(),
            files: 0,
            clerk_user_id,
        }
    }

    pub fn get_user_files(
        conn: &mut PgConnection,
        uuid_str: &str,
    ) -> Result<Vec<crate::db::models::files::FileTable>, diesel::result::Error> {
        use crate::db::schema::files;
        use crate::db::schema::users::dsl::*;

        let user = users.filter(uuid.eq(uuid_str)).first::<Users>(conn)?;
        files::table
            .filter(files::uuid_of_users.eq(user.uuid.clone()))
            .load::<crate::db::models::files::FileTable>(conn)
    }
}
