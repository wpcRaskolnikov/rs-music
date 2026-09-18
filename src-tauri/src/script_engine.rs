use anyhow::Result;
use reqwest::Client;
use rquickjs::{
    AsyncContext, AsyncRuntime, Function, IntoJs, Object, Promise, Value,
    function::{Async, Func},
};
use std::{collections::HashMap, sync::OnceLock, time::Duration};
use tokio::sync::RwLock;

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

pub struct ScriptEngine {
    #[allow(dead_code)]
    rt: AsyncRuntime,
    ctx: RwLock<AsyncContext>,
}

impl ScriptEngine {
    pub async fn new() -> Self {
        let rt = AsyncRuntime::new().expect("Failed to initialize QuickJS AsyncRuntime");

        let ctx = AsyncContext::full(&rt)
            .await
            .expect("Failed to initialize QuickJS AsyncContext");

        Self {
            rt,
            ctx: RwLock::new(ctx),
        }
    }

    pub async fn init_script(&self, script: &str) -> Result<()> {
        let ctx = AsyncContext::full(&self.rt).await?;
        ctx.async_with(async |ctx| -> Result<()> {
            ctx.eval::<(), _>(include_str!("lx_polyfill.js"))?;

            let lx: Object = ctx.globals().get("lx")?;
            lx.set("_doHttp", Func::from(Async(do_http)))?;

            ctx.eval::<(), _>(script)?;
            Ok(())
        })
        .await?;

        let mut lock = self.ctx.write().await;
        *lock = ctx;
        Ok(())
    }

    pub async fn get_music_url(&self, id: &str, platform: &str, quality: &str) -> Result<String> {
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

        let ctx = {
            let lock = self.ctx.read().await;
            lock.clone()
        };
        ctx.async_with(async |ctx| -> Result<String> {
            let lx: Object = ctx.globals().get("lx")?;
            let handler: Function = lx.get("_requestHandler")?;
            let promise: Promise = handler
                .call::<_, Value>((request_data,))?
                .into_promise()
                .ok_or_else(|| anyhow::anyhow!("Handler did not return a Promise"))?;

            let result: String = promise.into_future().await?;
            Ok(result)
        })
        .await
    }

    pub async fn get_qualities(&self) -> Result<HashMap<String, Vec<String>>> {
        let ctx = {
            let lock = self.ctx.read().await;
            lock.clone()
        };
        ctx.async_with(async |ctx| -> Result<HashMap<String, Vec<String>>> {
            let lx: Object = ctx.globals().get("lx")?;
            let qualities: HashMap<String, Vec<String>> = lx.get("_qualities")?;
            Ok(qualities)
        })
        .await
    }
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

async fn do_http(url: String, headers_json: Option<String>) -> rquickjs::Result<String> {
    let headers: HashMap<String, String> = headers_json
        .as_deref()
        .and_then(|h| serde_json::from_str(h).ok())
        .unwrap_or_default();

    let req = get_http_client().get(&url);
    let req = headers.into_iter().fold(req, |r, (k, v)| r.header(k, v));

    let json_val = match req.send().await {
        Ok(resp) => {
            let status = resp.status().as_u16() as i32;
            let body = resp.text().await.unwrap_or_default();
            let body_val = serde_json::from_str::<serde_json::Value>(&body)
                .unwrap_or_else(|_| serde_json::Value::String(body));
            serde_json::json!({ "statusCode": status, "body": body_val })
        }
        Err(e) => serde_json::json!({ "statusCode": -1, "body": e.to_string() }),
    };

    Ok(serde_json::to_string(&json_val).unwrap_or_default())
}

#[tauri::command]
pub async fn init_script(
    engine: tauri::State<'_, ScriptEngine>,
    script: String,
) -> Result<(), String> {
    engine
        .init_script(&script)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub async fn get_music_url(
    engine: tauri::State<'_, ScriptEngine>,
    id: String,
    platform: String,
    quality: String,
) -> Result<String, String> {
    engine
        .get_music_url(&id, &platform, &quality)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub async fn get_qualities(
    engine: tauri::State<'_, ScriptEngine>,
) -> Result<HashMap<String, Vec<String>>, String> {
    engine.get_qualities().await.map_err(|e| format!("{e:#}"))
}
