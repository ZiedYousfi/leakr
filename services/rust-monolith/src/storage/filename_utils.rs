use std::fmt;

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

static FILENAME_REGEX: Lazy<regex::Regex> = Lazy::new(|| {
    // Add named capture groups for all fields
    regex::Regex::new(
        r"^(?P<db_name>leakr_db)_(?P<uuid>[0-9a-fA-F-]{36})_(?P<date>[0-9]{4}-[0-9]{2}-[0-9]{2}) (?P<time>[0-9]{2}-[0-9]{2}-[0-9]{2})_it(?P<iteration>[0-9]+)\.sqlite$",
    )
    .expect("Invalid regex pattern")
});

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize, Hash)]
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
        // Regex to match: db_name_uuid_date time_itN
        let re = &FILENAME_REGEX;
        let caps = re.captures(filename)?;
        let db_name = caps.name("db_name")?.as_str().to_string();
        let uuid = caps.name("uuid")?.as_str().to_string();
        let date = caps.name("date")?.as_str().to_string();
        let time = caps.name("time")?.as_str().to_string();
        let iteration = caps.name("iteration")?.as_str().parse::<u32>().ok()?;
        Some(Self::new(db_name, uuid, date, time, iteration))
    }

    pub fn validate_filename(filename: &str) -> bool {
        FILENAME_REGEX.is_match(filename)
    }

    pub fn from_parts(uuid: &str, date: &str, time: &str, iteration: u32) -> Self {
        Self::new(
            "leakr_db".to_string(),
            uuid.to_string(),
            date.to_string(),
            time.to_string(),
            iteration,
        )
    }
}

pub enum FileComparisonResult {
    BestFile(Filename),
    ConflictingFiles {
        most_recent_file: Filename,
        most_iteration_file: Filename,
    },
}

pub fn compare_files(
    most_recent_file: &Filename,
    most_iteration_file: &Filename,
) -> Result<FileComparisonResult, anyhow::Error> {
    if most_recent_file == most_iteration_file {
        let file_struct = Filename::from_parts(
            &most_recent_file.uuid,
            &most_recent_file.date,
            &most_recent_file.time,
            most_recent_file.iteration,
        );
        Ok(FileComparisonResult::BestFile(file_struct))
    } else {
        let file_struct_most_recent = Filename::from_parts(
            &most_recent_file.uuid,
            &most_recent_file.date,
            &most_recent_file.time,
            most_recent_file.iteration,
        );

        let file_struct_most_iter = Filename::from_parts(
            &most_iteration_file.uuid,
            &most_iteration_file.date,
            &most_iteration_file.time,
            most_iteration_file.iteration,
        );
        Ok(FileComparisonResult::ConflictingFiles {
            most_recent_file: file_struct_most_recent,
            most_iteration_file: file_struct_most_iter,
        })
    }
}

impl fmt::Display for Filename {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}_{}_{} {}_it{}.sqlite",
            self.db_name, self.uuid, self.date, self.time, self.iteration
        )
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_string_valid_filename() {
        let filename =
            "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_it292.sqlite";
        let parsed = Filename::from_string(filename).unwrap();
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
        let expected =
            "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_it292.sqlite";
        assert_eq!(filename.to_string(), expected);
    }

    #[test]
    fn test_validate_filename_valid() {
        let filename =
            "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_it292.sqlite";
        assert!(Filename::validate_filename(filename));
    }

    #[test]
    fn test_validate_filename_invalid_uuid() {
        let filename = "leakr_db_invaliduuid_2025-05-09 10-36-53_it292.sqlite";
        assert!(!Filename::validate_filename(filename));
    }

    #[test]
    fn test_validate_filename_invalid_prefix() {
        let filename =
            "otherdb_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_it292.sqlite";
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
        let filename =
            "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09 10-36-53_itXYZ.sqlite";
        assert!(Filename::from_string(filename.trim_end_matches(".sqlite")).is_none());
    }

    #[test]
    fn test_from_string_with_invalid_date_time_separator() {
        // Using 'T' instead of space between date and time
        let filename =
            "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09T10-36-53_it292.sqlite";
        assert!(Filename::from_string(filename).is_none());
        assert!(!Filename::validate_filename(filename));
    }

    #[test]
    fn test_from_string_with_extra_spaces_in_date_time() {
        // Extra spaces between date and time
        let filename =
            "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09  10-36-53_it292.sqlite";
        assert!(Filename::from_string(filename).is_none());
        assert!(!Filename::validate_filename(filename));
    }

    #[test]
    fn test_to_string_and_from_string_roundtrip() {
        let original = Filename::new(
            "leakr_db".to_string(),
            "1f959aee-206e-4ef0-9ef9-7d50320da348".to_string(),
            "2025-05-09".to_string(),
            "10-36-53".to_string(),
            123,
        );
        let filename_str = original.to_string();
        let parsed = Filename::from_string(&filename_str).unwrap();
        assert_eq!(original, parsed);
    }

    #[test]
    fn test_to_string_invalid_date_time_format() {
        // This struct has an invalid date-time format (missing space)
        let filename = Filename::new(
            "leakr_db".to_string(),
            "1f959aee-206e-4ef0-9ef9-7d50320da348".to_string(),
            "2025-05-09".to_string(),
            "10-36-53".to_string(),
            1,
        );
        let filename_str = filename.to_string().replace(" ", "T");
        assert!(Filename::from_string(&filename_str).is_none());
        assert!(!Filename::validate_filename(&filename_str));
    }

    #[test]
    fn test_validate_filename_with_date_time_as_one_field() {
        // DateTime as one field (no space)
        let filename =
            "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09-10-36-53_it1.sqlite";
        assert!(!Filename::validate_filename(filename));
        assert!(Filename::from_string(filename).is_none());
    }

    #[test]
    fn test_validate_filename_with_only_date() {
        // Only date, no time
        let filename = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_2025-05-09_it1.sqlite";
        assert!(!Filename::validate_filename(filename));
        assert!(Filename::from_string(filename).is_none());
    }

    #[test]
    fn test_validate_filename_with_only_time() {
        // Only time, no date
        let filename = "leakr_db_1f959aee-206e-4ef0-9ef9-7d50320da348_10-36-53_it1.sqlite";
        assert!(!Filename::validate_filename(filename));
        assert!(Filename::from_string(filename).is_none());
    }
}
