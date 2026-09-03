use anyhow::Result;
use reqwest::Client;
use rquickjs::{
    AsyncContext, AsyncRuntime, Function, IntoJs, Object, Promise, Value, function::Async,
    function::Func,
};
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
) -> Result<String, String> {
    execute_script(&script, &id, &platform, &quality)
        .await
        .map_err(|e| format!("{e:#}"))
}

async fn execute_script(script: &str, id: &str, platform: &str, quality: &str) -> Result<String> {
    let rt = AsyncRuntime::new()?;
    let ctx = AsyncContext::full(&rt).await?;

    let result = ctx
        .async_with(async |ctx| -> Result<String> {
            let globals = ctx.globals();
            ctx.eval::<(), _>(include_str!("lx_polyfill.js"))?;
            let lx: Object = globals.get("lx")?;
            lx.set("_doHttp", Func::from(Async(do_http)))?;

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

            let promise: Promise = handler
                .call::<_, Value>((request_data,))?
                .into_promise()
                .ok_or_else(|| anyhow::anyhow!("Handler did not return a Promise"))?;

            let result: String = promise.into_future::<String>().await?;
            Ok(result)
        })
        .await?;

    Ok(result)
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
