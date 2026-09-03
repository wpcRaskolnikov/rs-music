use anyhow::Result;
use reqwest::Client;
use rquickjs::{Context, Runtime};
use rquickjs::{Function, IntoJs, Object, Value, function::Func};
use std::{collections::HashMap, sync::OnceLock, time::Duration};

#[derive(Debug, Clone, IntoJs)]
struct RequestInfo {
    #[qjs(rename = "type")]
    quality: String,
    #[qjs(rename = "musicInfo")]
    music_info: MusicInfo,
}

#[derive(Debug, Clone, IntoJs)]
struct MusicInfo {
    id: String,
    #[qjs(rename = "songId")]
    song_id: String,
    hash: String,
    songmid: String,
}

#[derive(Debug, Clone, IntoJs)]
struct RequestData {
    source: String,
    action: String,
    info: RequestInfo,
}

#[tauri::command]
pub async fn get_music_url(
    _app: tauri::AppHandle,
    script: String,
    id: String,
    platform: String,
    quality: String,
) -> std::result::Result<String, String> {
    tokio::task::spawn_blocking(move || execute_script(&script, &id, &platform, &quality))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
        .map_err(|e| format!("{e:#}"))
}

fn execute_script(script: &str, id: &str, platform: &str, quality: &str) -> Result<String> {
    let rt = Runtime::new()?;
    let ctx = Context::full(&rt)?;

    ctx.with(|ctx| {
        let globals = ctx.globals();
        ctx.eval::<(), _>(include_str!("lx_polyfill.js"))?;
        let lx: Object = globals.get("lx")?;
        lx.set("_doHttp", Func::from(do_http))?;

        let _: Value = ctx.eval(script)?;

        let _qualities: HashMap<String, Vec<String>> =
            globals.get::<_, Object>("lx")?.get("_qualities")?;
        let request_data = RequestData {
            source: platform.to_string(),
            action: "musicUrl".to_string(),
            info: RequestInfo {
                quality: quality.to_string(),
                music_info: MusicInfo {
                    id: id.to_string(),
                    song_id: id.to_string(),
                    hash: id.to_string(),
                    songmid: id.to_string(),
                },
            },
        };
        let handler: Function = lx.get("_requestHandler")?;

        if let Some(promise) = handler.call::<_, Value>((request_data,))?.as_promise() {
            let result = promise.finish::<String>()?;
            return Ok(result);
        }

        return Err(anyhow::anyhow!("Handler did not return a Promise"));
    })
}

fn get_http_client() -> &'static Client {
    static CLIENT: OnceLock<Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client")
    })
}

fn do_http(url: String, headers: HashMap<String, String>) -> String {
    let req = get_http_client().get(&url);
    let req = headers.into_iter().fold(req, |r, (k, v)| r.header(k, v));

    let fut = async move {
        match req.send().await {
            Ok(resp) => {
                let status = resp.status().as_u16() as i32;
                let body = resp.text().await.unwrap_or_default();
                let body_val = serde_json::from_str::<serde_json::Value>(&body)
                    .unwrap_or_else(|_| serde_json::Value::String(body));
                serde_json::json!({ "statusCode": status, "body": body_val })
            }
            Err(e) => serde_json::json!({ "statusCode": -1, "body": e.to_string() }),
        }
    };

    serde_json::to_string(&tauri::async_runtime::block_on(fut)).unwrap_or_default()
}
