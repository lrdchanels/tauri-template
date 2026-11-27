//! Files the user chooses. Dialogs open here, in Rust, so the webview never passes a path and
//! cannot read or write anything the user did not pick.

use crate::error::{AppError, Result};
use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::ipc::Response;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

/// Largest file the app reads into memory.
pub const MAX_FILE_BYTES: u64 = 100 * 1024 * 1024;

/// A file-type filter for the dialog: `{ name: "CSV", extensions: ["csv"] }`.
#[derive(Deserialize, Debug, Clone)]
pub struct Filter {
    pub name: String,
    pub extensions: Vec<String>,
}

fn to_path(f: FilePath) -> Result<PathBuf> {
    f.into_path().map_err(|e| AppError::Tauri(e.to_string()))
}

fn exts(f: &Filter) -> Vec<&str> {
    f.extensions.iter().map(String::as_str).collect()
}

/// Fails with NotAllowed when the file is larger than `max`.
pub fn check_size(path: &Path, max: u64) -> Result<()> {
    let len = fs::metadata(path)
        .map_err(|e| AppError::io("Cannot read", path, e))?
        .len();
    if len > max {
        return Err(AppError::NotAllowed(format!(
            "{} is too large ({len} bytes, max {max})",
            path.display()
        )));
    }
    Ok(())
}

/// Picked files → one binary buffer, decoded by src/lib/pack.ts:
/// u32 count, then per file: u32 name length, UTF-8 name, u32 data length, data (all little endian).
/// Raw bytes avoid serialising contents as a JSON array of numbers (~4× larger and slow to parse).
pub fn pack(files: &[(String, Vec<u8>)]) -> Vec<u8> {
    let size = 4 + files.iter().map(|(n, b)| 8 + n.len() + b.len()).sum::<usize>();
    let mut out = Vec::with_capacity(size);
    out.extend_from_slice(&(files.len() as u32).to_le_bytes());
    for (name, bytes) in files {
        out.extend_from_slice(&(name.len() as u32).to_le_bytes());
        out.extend_from_slice(name.as_bytes());
        out.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
        out.extend_from_slice(bytes);
    }
    out
}

/// Dialog to choose one or more files → their names and contents, packed (empty if cancelled).
#[tauri::command]
pub async fn pick_files(
    app: AppHandle,
    title: Option<String>,
    filters: Vec<Filter>,
    multiple: bool,
) -> Result<Response> {
    let mut d = app.dialog().file();
    if let Some(t) = title {
        d = d.set_title(t);
    }
    for f in &filters {
        d = d.add_filter(&f.name, &exts(f));
    }
    let picked = if multiple {
        d.blocking_pick_files().unwrap_or_default()
    } else {
        d.blocking_pick_file().into_iter().collect()
    };
    let files = picked
        .into_iter()
        .map(|f| {
            let path = to_path(f)?;
            check_size(&path, MAX_FILE_BYTES)?;
            let bytes = fs::read(&path).map_err(|e| AppError::io("Cannot read", &path, e))?;
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default();
            Ok((name, bytes))
        })
        .collect::<Result<Vec<_>>>()?;
    Ok(Response::new(pack(&files)))
}

/// Dialog to open a text file → its contents, or None if cancelled.
#[tauri::command]
pub async fn open_text(app: AppHandle, filter: Filter) -> Result<Option<String>> {
    let Some(f) = app
        .dialog()
        .file()
        .add_filter(&filter.name, &exts(&filter))
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = to_path(f)?;
    check_size(&path, MAX_FILE_BYTES)?;
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| AppError::io("Cannot read", &path, e))
}

/// Save dialog and write → the chosen path, or None if cancelled.
#[tauri::command]
pub async fn save_as(
    app: AppHandle,
    file_name: String,
    contents: String,
    filter: Filter,
) -> Result<Option<String>> {
    let Some(f) = app
        .dialog()
        .file()
        .set_file_name(file_name)
        .add_filter(&filter.name, &exts(&filter))
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let path = to_path(f)?;
    fs::write(&path, contents).map_err(|e| AppError::io("Cannot write", &path, e))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packs_names_and_contents() {
        assert_eq!(pack(&[]), vec![0, 0, 0, 0]);
        let out = pack(&[("añ.csv".into(), vec![1, 2]), ("b".into(), vec![])]);
        let mut want = vec![2, 0, 0, 0, 7, 0, 0, 0];
        want.extend_from_slice("añ.csv".as_bytes());
        want.extend_from_slice(&[2, 0, 0, 0, 1, 2, 1, 0, 0, 0, b'b', 0, 0, 0, 0]);
        assert_eq!(out, want);
    }

    #[test]
    fn refuses_files_over_the_limit() {
        let p = std::env::temp_dir().join(format!("tauri-template-size-{}", std::process::id()));
        fs::write(&p, [0u8; 10]).unwrap();
        assert!(check_size(&p, 10).is_ok());
        assert!(matches!(check_size(&p, 9), Err(AppError::NotAllowed(_))));
        let _ = fs::remove_file(&p);
    }
}
