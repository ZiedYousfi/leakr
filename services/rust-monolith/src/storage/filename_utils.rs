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
#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_from_string_valid_filename() {
    let filename = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_it292.sqlite";
    let parsed = Filename::from_string(
      filename.trim_end_matches(".sqlite")
    ).unwrap();
    assert_eq!(parsed.db_name, "leakr_db");
    assert_eq!(parsed.uuid, "1f959aee-206e-4ef0-9ef9-7d50320da348");
    assert_eq!(parsed.date, "2025-05-09");
    assert_eq!(parsed.time, "10-36-53");
    assert_eq!(parsed.iteration, 292);
  }

  #[test]
  fn test_display_trait() {
    let filename = Filename::new(
      "leakr_db".to_string(),
      "1f959aee-206e-4ef0-9ef9-7d50320da348".to_string(),
      "2025-05-09".to_string(),
      "10-36-53".to_string(),
      292,
    );
    let expected = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09_10-36-53_it292.sqlite";
    assert_eq!(filename.to_string(), expected);
  }

  #[test]
  fn test_validate_filename_valid() {
    let filename = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_it292.sqlite";
    assert!(Filename::validate_filename(filename));
  }

  #[test]
  fn test_validate_filename_invalid_uuid() {
    let filename = "leakr_db_invaliduuid_2025-05-09 10-36-53_it292.sqlite";
    assert!(!Filename::validate_filename(filename));
  }

  #[test]
  fn test_validate_filename_invalid_prefix() {
    let filename = "otherdb_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_it292.sqlite";
    assert!(!Filename::validate_filename(filename));
  }

  #[test]
  fn test_validate_filename_missing_iteration() {
    let filename = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53.sqlite";
    assert!(!Filename::validate_filename(filename));
  }

  #[test]
  fn test_from_string_invalid_format() {
    let filename = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53.sqlite";
    assert!(Filename::from_string(filename).is_none());
  }

  #[test]
  fn test_from_string_invalid_iteration() {
    let filename = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_itXYZ.sqlite";
    assert!(Filename::from_string(filename.trim_end_matches(".sqlite")).is_none());
  }
}
