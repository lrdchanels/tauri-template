//! HTTP from Rust, for APIs that do not accept requests from the webview's origin (CORS) or that
//! need headers the browser will not send. Only HTTPS hosts listed in ALLOWED_HOSTS can be
//! called: add your API's host here. Add a specific command when you need more than a GET.

use crate::error::{AppError, Result};
use reqwest::Url;
use std::time::Duration;

/// Hosts the frontend may call through `http_get_json`. Exact match on the host name.
pub const ALLOWED_HOSTS: &[&str] = &["api.github.com"];

pub struct Http {
    client: reqwest::Client,
}

impl Default for Http {
    fn default() -> Self {
        let client = reqwest::Client::builder()
            .user_agent(concat!(env!("CARGO_PKG_NAME"), "/", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(20))
            .build()
            .expect("HTTP client");
        Http { client }
    }
}

/// Parses `url` and checks it is HTTPS to an allowed host.
pub fn check_url(url: &str) -> Result<Url> {
    let u = Url::parse(url).map_err(|e| AppError::Http(format!("Invalid URL {url}: {e}")))?;
    let host = u.host_str().unwrap_or_default();
    if u.scheme() != "https" || !ALLOWED_HOSTS.contains(&host) {
        return Err(AppError::NotAllowed(format!("{}://{host}", u.scheme())));
    }
    Ok(u)
}

#[tauri::command]
pub async fn http_get_json(state: tauri::State<'_, Http>, url: String) -> Result<serde_json::Value> {
    let u = check_url(&url)?;
    let r = state.client.get(u).send().await?;
    let status = r.status();
    if !status.is_success() {
        return Err(AppError::Http(format!("HTTP {status} from {url}")));
    }
    Ok(r.json().await?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_https_to_allowed_hosts() {
        assert!(check_url("https://api.github.com/repos/tauri-apps/tauri").is_ok());
        assert!(matches!(
            check_url("http://api.github.com/"),
            Err(AppError::NotAllowed(_))
        ));
        assert!(matches!(
            check_url("https://evil.example/"),
            Err(AppError::NotAllowed(_))
        ));
        assert!(matches!(
            check_url("https://api.github.com.evil.example/"),
            Err(AppError::NotAllowed(_))
        ));
        assert!(matches!(check_url("not a url"), Err(AppError::Http(_))));
    }
}
