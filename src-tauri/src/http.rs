//! HTTP from Rust, for APIs that do not accept requests from the webview's origin (CORS) or that
//! need headers the browser will not send. Only HTTPS hosts listed in ALLOWED_HOSTS can be
//! called (redirects included): add your API's host here. Add a specific command when you need
//! more than a GET.

use crate::error::{AppError, Result};
use reqwest::{redirect, Url};
use std::time::Duration;

/// Hosts the frontend may call through `http_get_json`. Exact match on the host name.
pub const ALLOWED_HOSTS: &[&str] = &["api.github.com"];

/// Largest response body accepted, so a misbehaving server cannot exhaust memory.
pub const MAX_RESPONSE_BYTES: usize = 10 * 1024 * 1024;

const MAX_REDIRECTS: usize = 5;

pub struct Http {
    client: reqwest::Client,
}

impl Default for Http {
    fn default() -> Self {
        // Every redirect hop is checked against the allowlist too: otherwise an allowed host
        // could send the request anywhere.
        let policy = redirect::Policy::custom(|a| {
            if a.previous().len() >= MAX_REDIRECTS {
                a.error("too many redirects")
            } else if is_allowed(a.url()) {
                a.follow()
            } else {
                let msg = format!("redirect to a host that is not allowed: {}", a.url());
                a.error(msg)
            }
        });
        let client = reqwest::Client::builder()
            .user_agent(concat!(env!("CARGO_PKG_NAME"), "/", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(20))
            .redirect(policy)
            .build()
            .expect("HTTP client");
        Http { client }
    }
}

/// HTTPS to a host in ALLOWED_HOSTS.
pub fn is_allowed(u: &Url) -> bool {
    u.scheme() == "https" && ALLOWED_HOSTS.contains(&u.host_str().unwrap_or_default())
}

/// Parses `url` and checks it is HTTPS to an allowed host.
pub fn check_url(url: &str) -> Result<Url> {
    let u = Url::parse(url).map_err(|e| AppError::Http(format!("Invalid URL {url}: {e}")))?;
    if !is_allowed(&u) {
        return Err(AppError::NotAllowed(format!(
            "{}://{}",
            u.scheme(),
            u.host_str().unwrap_or_default()
        )));
    }
    Ok(u)
}

/// Rejects bodies larger than MAX_RESPONSE_BYTES.
pub fn check_size(len: u64) -> Result<()> {
    if len > MAX_RESPONSE_BYTES as u64 {
        return Err(AppError::Http(format!(
            "Response too large: {len} bytes (max {MAX_RESPONSE_BYTES})"
        )));
    }
    Ok(())
}

#[tauri::command]
pub async fn http_get_json(state: tauri::State<'_, Http>, url: String) -> Result<serde_json::Value> {
    let u = check_url(&url)?;
    let mut r = state.client.get(u).send().await?;
    let status = r.status();
    if !status.is_success() {
        return Err(AppError::Http(format!("HTTP {status} from {url}")));
    }
    if let Some(len) = r.content_length() {
        check_size(len)?;
    }
    // Read in chunks so a body without (or with a lying) Content-Length is still bounded.
    let mut body = Vec::new();
    while let Some(chunk) = r.chunk().await? {
        body.extend_from_slice(&chunk);
        check_size(body.len() as u64)?;
    }
    serde_json::from_slice(&body).map_err(|e| AppError::Http(format!("Invalid JSON from {url}: {e}")))
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

    #[test]
    fn redirect_targets_are_checked_like_requests() {
        let u = |s: &str| Url::parse(s).unwrap();
        assert!(is_allowed(&u("https://api.github.com/x")));
        assert!(!is_allowed(&u("http://api.github.com/x")));
        assert!(!is_allowed(&u("https://169.254.169.254/latest/meta-data")));
        assert!(!is_allowed(&u("https://user@evil.example/")));
    }

    #[test]
    fn limits_response_size() {
        assert!(check_size(MAX_RESPONSE_BYTES as u64).is_ok());
        assert!(check_size(MAX_RESPONSE_BYTES as u64 + 1).is_err());
    }
}
