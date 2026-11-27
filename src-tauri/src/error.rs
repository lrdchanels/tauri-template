//! The error type every command returns. It reaches the frontend as `{ kind, message }`
//! (see src/lib/errors.ts), so the UI can branch on `kind` and always has a message to show.

use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not allowed: {0}")]
    NotAllowed(String),
    #[error("{action} {path}: {source}")]
    Io {
        action: &'static str,
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("{0}")]
    Http(String),
    #[error("{0}")]
    Tauri(String),
}

impl AppError {
    pub fn io(action: &'static str, path: &std::path::Path, source: std::io::Error) -> Self {
        AppError::Io {
            action,
            path: path.display().to_string(),
            source,
        }
    }

    fn kind(&self) -> &'static str {
        match self {
            AppError::NotAllowed(_) => "not_allowed",
            AppError::Io { .. } => "io",
            AppError::Http(_) => "http",
            AppError::Tauri(_) => "tauri",
        }
    }
}

impl From<tauri::Error> for AppError {
    fn from(e: tauri::Error) -> Self {
        AppError::Tauri(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Http(e.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut st = s.serialize_struct("AppError", 2)?;
        st.serialize_field("kind", self.kind())?;
        st.serialize_field("message", &self.to_string())?;
        st.end()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_kind_and_message() {
        let e = AppError::NotAllowed("x.json".into());
        assert_eq!(
            serde_json::to_string(&e).unwrap(),
            r#"{"kind":"not_allowed","message":"Not allowed: x.json"}"#
        );
    }
}
