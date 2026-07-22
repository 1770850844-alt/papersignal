use keyring::Entry;
use regex::Regex;
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::time::Duration;

const SERVICE: &str = "com.papersignal.desktop";

fn entry(service_id: &str) -> Result<Entry, String> {
  Entry::new(SERVICE, service_id).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_api_key(service_id: String, api_key: String) -> Result<(), String> {
  if service_id.trim().is_empty() || api_key.trim().is_empty() { return Err("服务和 API Key 不能为空".into()); }
  entry(&service_id)?.set_password(&api_key).map_err(|error| error.to_string())
}

#[tauri::command]
fn has_api_key(service_id: String) -> bool {
  entry(&service_id).and_then(|item| item.get_password().map_err(|error| error.to_string())).is_ok()
}

#[tauri::command]
fn delete_api_key(service_id: String) -> Result<(), String> {
  entry(&service_id)?.delete_credential().map_err(|error| error.to_string())
}

async fn request_chat(service_id: &str, base_url: &str, model: &str, prompt: &str, supplied_key: Option<String>) -> Result<String, String> {
  if base_url.trim().is_empty() || model.trim().is_empty() { return Err("请填写 Base URL 和模型名。".into()); }
  let api_key = match supplied_key.filter(|key| !key.trim().is_empty()) {
    Some(key) => key,
    None => entry(service_id)?.get_password().map_err(|_| "未找到此服务的 API Key，请先保存 Key。".to_string())?
  };
  let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));
  let body = json!({
    "model": model.trim(),
    "temperature": 0.2,
    "messages": [
      { "role": "system", "content": "你是中文内容编辑助手。严格遵守用户要求，输出可直接使用的中文内容。" },
      { "role": "user", "content": prompt }
    ]
  });
  let response = reqwest::Client::new().post(url).bearer_auth(api_key).json(&body).send().await.map_err(|error| format!("请求失败：{error}"))?;
  let status = response.status();
  let payload: Value = response.json().await.map_err(|error| format!("响应解析失败：{error}"))?;
  if !status.is_success() { return Err(payload.get("error").and_then(|value| value.get("message")).and_then(Value::as_str).unwrap_or("服务商返回错误").to_string()); }
  payload.get("choices").and_then(|value| value.get(0)).and_then(|value| value.get("message")).and_then(|value| value.get("content")).and_then(Value::as_str).map(str::to_owned).ok_or_else(|| "服务商未返回可用内容".to_string())
}

#[tauri::command]
async fn test_ai_connection(service_id: String, base_url: String, model: String, api_key: Option<String>) -> Result<String, String> {
  let response = request_chat(&service_id, &base_url, &model, "这是服务连通性测试。仅回复 OK。", api_key).await?;
  if response.trim().is_empty() { return Err("服务返回为空，无法确认模型可用。".into()); }
  Ok(format!("连接成功，模型已响应：{}", response.trim().chars().take(32).collect::<String>()))
}

#[tauri::command]
async fn generate_content(service_id: String, base_url: String, model: String, prompt: String) -> Result<String, String> {
  request_chat(&service_id, &base_url, &model, &prompt, None).await
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ArticleReference {
  url: String,
  title: Option<String>,
  description: Option<String>,
  cover_url: Option<String>,
  text_excerpt: Option<String>,
  color_hints: Vec<String>,
  image_count: usize,
  paragraph_count: usize,
  error: Option<String>,
}

fn attribute_value(tag: &str, name: &str) -> Option<String> {
  let expression = format!(r#"(?i)\b{}\s*=\s*[\"']([^\"']*)[\"']"#, name);
  Regex::new(&expression).ok()?.captures(tag)?.get(1).map(|capture| capture.as_str().trim().to_string()).filter(|value| !value.is_empty())
}

fn meta_value(html: &str, key: &str) -> Option<String> {
  let tags = Regex::new(r"(?is)<meta\b[^>]*>").ok()?;
  for matched in tags.find_iter(html) {
    let tag = matched.as_str();
    let property = attribute_value(tag, "property").or_else(|| attribute_value(tag, "name"));
    if property.as_deref().is_some_and(|value| value.eq_ignore_ascii_case(key)) {
      return attribute_value(tag, "content");
    }
  }
  None
}

fn clean_text(html: &str) -> String {
  let tag_pattern = Regex::new(r"(?is)<[^>]+>").expect("valid tag expression");
  let whitespace = Regex::new(r"\s+").expect("valid whitespace expression");
  whitespace.replace_all(&tag_pattern.replace_all(html, " "), " ").trim().chars().take(360).collect()
}

fn extract_reference(url: String, html: &str) -> ArticleReference {
  let title = meta_value(html, "og:title").or_else(|| {
    Regex::new(r"(?is)<title[^>]*>(.*?)</title>").ok()?.captures(html)?.get(1).map(|capture| clean_text(capture.as_str()))
  });
  let description = meta_value(html, "description").or_else(|| meta_value(html, "og:description"));
  let cover_url = meta_value(html, "og:image");
  let color_pattern = Regex::new(r"(?i)#[0-9a-f]{3,8}\b").expect("valid color expression");
  let mut colors = BTreeMap::<String, usize>::new();
  for found in color_pattern.find_iter(html) {
    let color = found.as_str().to_ascii_lowercase();
    *colors.entry(color).or_default() += 1;
  }
  let mut color_hints: Vec<(String, usize)> = colors.into_iter().collect();
  color_hints.sort_by(|left, right| right.1.cmp(&left.1));
  let image_count = Regex::new(r"(?i)<img\b").expect("valid image expression").find_iter(html).count();
  let paragraph_count = Regex::new(r"(?i)<(?:p|section)\b").expect("valid paragraph expression").find_iter(html).count();
  let content = Regex::new(r#"(?is)<[^>]+id=[\"']js_content[\"'][^>]*>(.*?)</(?:div|section)>"#).ok().and_then(|pattern| pattern.captures(html)).and_then(|capture| capture.get(1)).map(|capture| capture.as_str()).unwrap_or(html);
  ArticleReference { url, title, description, cover_url, text_excerpt: Some(clean_text(content)), color_hints: color_hints.into_iter().take(4).map(|item| item.0).collect(), image_count, paragraph_count, error: None }
}

fn invalid_reference(url: String, error: impl Into<String>) -> ArticleReference {
  ArticleReference { url, title: None, description: None, cover_url: None, text_excerpt: None, color_hints: vec![], image_count: 0, paragraph_count: 0, error: Some(error.into()) }
}

#[tauri::command]
async fn inspect_wechat_articles(urls: Vec<String>) -> Result<Vec<ArticleReference>, String> {
  if urls.is_empty() { return Err("请至少粘贴一篇公众号文章链接。".into()); }
  if urls.len() > 5 { return Err("一次最多分析 5 篇文章。".into()); }
  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(15))
    .redirect(reqwest::redirect::Policy::none())
    .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36")
    .build()
    .map_err(|error| format!("初始化链接分析失败：{error}"))?;
  let mut references = Vec::with_capacity(urls.len());
  for raw_url in urls {
    let url = raw_url.trim().to_string();
    let parsed = match reqwest::Url::parse(&url) {
      Ok(parsed) if parsed.scheme() == "https" && parsed.host_str().is_some_and(|host| host.eq_ignore_ascii_case("mp.weixin.qq.com")) => parsed,
      _ => { references.push(invalid_reference(url, "仅支持 https://mp.weixin.qq.com/ 的公众号文章链接。")); continue; }
    };
    let response = match client.get(parsed).send().await {
      Ok(response) if response.status().is_success() => response,
      Ok(response) => { references.push(invalid_reference(url, format!("文章页面返回 HTTP {}。", response.status()))); continue; }
      Err(_) => { references.push(invalid_reference(url, "无法读取该文章，请检查链接是否公开且可访问。")); continue; }
    };
    let html = match response.text().await {
      Ok(html) if html.len() <= 2_000_000 => html,
      Ok(_) => { references.push(invalid_reference(url, "文章页面过大，无法安全分析。")); continue; }
      Err(_) => { references.push(invalid_reference(url, "文章内容读取失败。")); continue; }
    };
    references.push(extract_reference(url, &html));
  }
  Ok(references)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![save_api_key, has_api_key, delete_api_key, test_ai_connection, generate_content, inspect_wechat_articles])
    .run(tauri::generate_context!())
    .expect("error while running LayoutGo");
}
