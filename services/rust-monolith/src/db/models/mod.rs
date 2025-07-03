/// After changing schema.rs, you need to run the migration command to apply changes.
///
/// You can use the `diesel` CLI to manage migrations in your Rust project.
///
/// To generate a new migration using the `diesel` CLI, run the following commands:
/// ```bash
/// diesel migration generate --diff-schema <migration_name>
/// diesel migration run
/// ```
/// Then i recommend properly making your models here
pub mod accounts;
pub mod posts;
pub mod users;
