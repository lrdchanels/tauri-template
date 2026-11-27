//! App data in its own folder (`app_data_dir`): JSON documents written by the frontend, always
//! atomically (temporary file + rename) so a crash mid-write never leaves a broken file.
//! The frontend can only touch the documents named in ALLOWED.

use crate::error::{AppError, Result};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// The only documents the frontend may read or write. Keep in sync with STORE_KEYS in
/// src/platform/types.ts (test/storage-keys.test.ts checks it).
pub const ALLOWED: &[&str] = &["config", "data"];

fn folder(app: &AppHandle) -> Result<PathBuf> {
    let dir = app.path().app_data_dir()?;
    fs::create_dir_all(&dir).map_err(|e| AppError::io("Cannot create", &dir, e))?;
    Ok(dir)
}

/// `key` → `<data dir>/<key>.json`, or an error if the key is not allowed.
pub fn path_for(dir: &Path, key: &str) -> Result<PathBuf> {
    if !ALLOWED.contains(&key) {
        return Err(AppError::NotAllowed(key.to_string()));
    }
    Ok(dir.join(format!("{key}.json")))
}

/// Writes `contents` to `target` through a temporary file in the same folder.
pub fn write_atomic(target: &Path, contents: &str) -> Result<()> {
    let tmp = target.with_extension("json.tmp");
    fs::write(&tmp, contents).map_err(|e| AppError::io("Cannot write", &tmp, e))?;
    fs::rename(&tmp, target).map_err(|e| AppError::io("Cannot save", target, e))
}

pub fn read(dir: &Path, key: &str) -> Result<Option<String>> {
    let p = path_for(dir, key)?;
    match fs::read_to_string(&p) {
        Ok(t) => Ok(Some(t)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(AppError::io("Cannot read", &p, e)),
    }
}

pub fn clear(dir: &Path) -> Result<()> {
    for key in ALLOWED {
        let p = path_for(dir, key)?;
        if p.exists() {
            fs::remove_file(&p).map_err(|e| AppError::io("Cannot delete", &p, e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn storage_read(app: AppHandle, key: String) -> Result<Option<String>> {
    read(&folder(&app)?, &key)
}

#[tauri::command]
pub fn storage_write(app: AppHandle, key: String, contents: String) -> Result<()> {
    write_atomic(&path_for(&folder(&app)?, &key)?, &contents)
}

/// Deletes every document (the UI asks for confirmation first).
#[tauri::command]
pub fn storage_clear(app: AppHandle) -> Result<()> {
    clear(&folder(&app)?)
}

#[tauri::command]
pub fn storage_dir(app: AppHandle) -> Result<String> {
    Ok(folder(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn log_dir(app: AppHandle) -> Result<String> {
    let dir = app.path().app_log_dir()?;
    fs::create_dir_all(&dir).map_err(|e| AppError::io("Cannot create", &dir, e))?;
    Ok(dir.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("tauri-template-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn writes_atomically_without_leaving_a_temp_file() {
        let d = tmp("atomic");
        let f = path_for(&d, "config").unwrap();
        write_atomic(&f, "{\"a\":1}").unwrap();
        write_atomic(&f, "{\"a\":2}").unwrap();
        assert_eq!(read(&d, "config").unwrap().as_deref(), Some("{\"a\":2}"));
        assert!(!d.join("config.json.tmp").exists());
    }

    #[test]
    fn rejects_keys_outside_the_whitelist() {
        let d = tmp("whitelist");
        assert!(matches!(path_for(&d, "../secrets"), Err(AppError::NotAllowed(_))));
        assert!(matches!(read(&d, "other"), Err(AppError::NotAllowed(_))));
    }

    #[test]
    fn missing_document_reads_as_none_and_clear_removes_all() {
        let d = tmp("clear");
        assert_eq!(read(&d, "data").unwrap(), None);
        write_atomic(&path_for(&d, "data").unwrap(), "{}").unwrap();
        clear(&d).unwrap();
        assert_eq!(read(&d, "data").unwrap(), None);
    }
}
