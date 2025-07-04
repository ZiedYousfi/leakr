use std::fmt;

pub struct Filename {
    pub db_name: String,
    pub uuid: String,
    pub date: String,
    pub time: String,
    pub iteration: u32,
}

impl Filename {
    pub fn new(db_name: String, uuid: String, date: String, time: String, iteration: u32) -> Self {
        Self {
            db_name,
            uuid,
            date,
            time,
            iteration,
        }
    }

    pub fn from_string(filename: &str) -> Option<Self> {
        let parts: Vec<&str> = filename.split('_').collect();
        if parts.len() < 5 || !parts[parts.len() - 1].starts_with("it") {
            return None;
        }

        let db_name = parts[0].to_string();
        let uuid = parts[1].to_string();
        let date = parts[2].to_string();
        let time = parts[3].to_string();
        let iteration_str = parts[4].trim_start_matches("it");
        let iteration = iteration_str.parse::<u32>().ok()?;

        Some(Self::new(db_name, uuid, date, time, iteration))
    }

    pub fn validate_filename(filename: &str) -> bool {
        let re = regex::Regex::new(r"^leakr_db_[0-9a-fA-F-]{36}_[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}-[0-9]{2}-[0-9]{2}_it[0-9]+\.sqlite$").unwrap();
        re.is_match(filename)
    }
}

impl fmt::Display for Filename {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}_{}_{}_{}_it{}.sqlite",
            self.db_name, self.uuid, self.date, self.time, self.iteration
        )
    }
}
