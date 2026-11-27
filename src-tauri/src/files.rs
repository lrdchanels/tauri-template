//! Files the user chooses. Dialogs open here, in Rust, so the webview never passes a path and
//! cannot read or write anything the user did not pick.

use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

/// A file-type filter for the dialog: `{ name: "CSV", extensions: ["csv"] }`.
#[derive(Deserialize, Debug, Clone)]
pub struct Filter {
    pub name: String,
    pub extensions: Vec<String>,
}

/// A file picked in the dialog, with its contents.
#[derive(Serialize)]
pub struct PickedFile {
    name: String,
    bytes: Vec<u8>,
}

fn to_path(f: FilePath) -> Result<PathBuf> {
    f.into_path().map_err(|e| AppError::Tauri(e.to_string()))
}

fn exts(f: &Filter) -> Vec<&str> {
    f.extensions.iter().map(String::as_str).collect()
}

/// Dialog to choose one or more files → their contents (empty if cancelled).
#[tauri::command]
pub async fn pick_files(
    app: AppHandle,
    title: Option<String>,
    filters: Vec<Filter>,
    multiple: bool,
) -> Result<Vec<PickedFile>> {
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
    picked
        .into_iter()
        .map(|f| {
            let path = to_path(f)?;
            let bytes = fs::read(&path).map_err(|e| AppError::io("Cannot read", &path, e))?;
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default();
            Ok(PickedFile { name, bytes })
        })
        .collect()
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
