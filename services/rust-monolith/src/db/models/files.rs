use diesel::prelude::*;

#[derive(Queryable, Insertable, AsChangeset, Debug)]
#[diesel(table_name = crate::db::schema::files)]
pub struct FileTable {
    pub id: i32,
    pub uuid_of_users: String,
    pub date: String,
    pub time: String,
    pub iteration: i32,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = crate::db::schema::files)]
pub struct NewFileTable {
    pub uuid_of_users: String,
    pub date: String,
    pub time: String,
    pub iteration: i32,
}

impl FileTable {
    pub fn new(id: i32, uuid_of_users: String, date: String, time: String, iteration: i32) -> Self {
        Self {
            id,
            uuid_of_users,
            date,
            time,
            iteration,
        }
    }
}

impl NewFileTable {
    pub fn new(uuid_of_users: String, date: String, time: String, iteration: i32) -> Self {
        Self {
            uuid_of_users,
            date,
            time,
            iteration,
        }
    }

    pub fn insert_into_db(
        &self,
        conn: &mut PgConnection,
    ) -> Result<FileTable, diesel::result::Error> {
        use crate::db::schema::files;

        diesel::insert_into(files::table)
            .values(self)
            .get_result(conn)
    }

    pub fn to_file_table(self, id: i32) -> FileTable {
        FileTable::new(id, self.uuid_of_users, self.date, self.time, self.iteration)
    }
}
