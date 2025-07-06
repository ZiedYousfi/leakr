use diesel::prelude::*;

#[derive(Queryable, Selectable, Insertable, AsChangeset, Debug)]
#[diesel(table_name = crate::db::schema::users)]
// Add check_for_backend for better error messages (optional)
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Users {
    pub uuid: String,
    pub clerk_user_id: String,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
    pub files: i32,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = crate::db::schema::users)]
pub struct NewUsers {
    pub uuid: String,
    pub clerk_user_id: String,
}

impl Users {
    pub fn new(uuid: String, clerk_user_id: String) -> Self {
        let now = chrono::Local::now().naive_local();
        Self {
            uuid,
            clerk_user_id,
            created_at: now,
            updated_at: now,
            files: 0,
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
