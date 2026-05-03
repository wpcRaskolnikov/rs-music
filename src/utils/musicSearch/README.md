# 酷我 (KuWo) 搜索接口说明

## 请求 URL

```
http://search.kuwo.cn/r.s?all={keyword}&pn={page-1}&rn={limit}&mobi=1&vipver=1&show_copyright_off=1&ft=music&rformat=json&encoding=utf8&vermerge=1
```

## 参数说明

| 参数 | 值 | 说明 |
|------|------|------|
| `all` | 关键词（URL编码） | 搜索关键词 |
| `pn` | 从 0 开始 | 页码（第几页，需减 1） |
| `rn` | 默认 50 | 每页条数 |
| `mobi` | 1 | **必须**，控制返回双引号合法 JSON；去掉后返回单引号伪 JSON |
| `vipver` | 1 | 去掉后排序改变 |
| `show_copyright_off` | 1 | 去掉后搜索结果集和排序变化 |
| `ft` | music | **必须**，控制返回 `N_MINFO` 字段（音质信息），去掉后无可用歌曲 |
| `rformat` | json | 返回格式 |
| `encoding` | utf8 | 字符编码 |
| `vermerge` | 1 | 去掉后排序完全不同 |

## 原始 17 参数 → 精简 9 参数

以下参数经测试可安全去掉，不影响结果数量、排序、`N_MINFO` 返回：
- `client=kt`
- `uid=794762570`
- `ver=kwplayer_ar_9.2.2.1`
- `newver=1`
- `cluster=0`
- `strategy=2012`
- `issubtitle=1`

## 响应解析

- 返回标准 JSON（因 `mobi=1`），直接 `JSON.parse`
- 结果在 `abslist` 数组中
- 每条关键字段：
  - `MUSICRID`：歌曲 ID（格式 `"MUSIC_xxx"`，需去掉 `"MUSIC_"` 前缀）
  - `SONGNAME`：歌名
  - `ARTIST`：歌手
  - `ALBUM`：专辑
  - `DURATION`：时长（秒）
  - `N_MINFO`：音质信息，缺少此字段表示不可播放，应过滤

歌手名中的 `&` 需替换为 `、` 分隔符。

---

# QQ音乐 (QQ) 搜索接口说明

## 请求 URL

```
POST https://u.y.qq.com/cgi-bin/musics.fcg?sign={sign}
```

签名通过 `zzcSign(JSON.stringify(data))` 生成。

## 签名算法 (zzcSign)

1. 对请求体 JSON 字符串计算 SHA-1 哈希（40 位 hex）
2. 从哈希中提取 `PART_1_INDEXES = [23, 14, 6, 36, 16, 40, 7, 19]` 位置字符作为前半部分
3. 提取 `PART_2_INDEXES = [16, 1, 32, 12, 19, 27, 8, 5]` 位置字符作为后半部分
4. 对哈希值每两位 hex 与 `SCRAMBLE_VALUES`（20 个字节）逐位异或，取前 20 字节做 base64 编码
5. 拼接：`zzc{part1}{base64}{part2}`，转为小写

## 请求体结构

```json
{
  "comm": { ... },
  "req": {
    "module": "music.search.SearchCgiService",
    "method": "DoSearchForQQMusicMobile",
    "param": { ... }
  }
}
```

### comm 字段

包含 27 个设备信息字段，经测试**全部不可删除**，任意字段移除会导致无结果或结果异常。关键字段包括：
- `ct: "11"` — 客户端类型
- `cv: "14090508"` — 客户端版本
- `v: "14090508"` — 版本号
- `tmeAppID: "qqmusic"` — 应用 ID
- 设备标识：`phonetype`、`rom`、`os_ver`、`deviceScore` 等
- ID 类字段：`OpenUDID`、`QIMEI36`、`uid` 等（均需传 `"0"`）

### param 字段（精简后 8 个参数）

| 参数 | 值 | 说明 |
|------|------|------|
| `search_type` | 0 | 搜索类型（0=歌曲） |
| `searchid` | 随机数字 | 请求 ID |
| `query` | 关键词 | 搜索关键词 |
| `page_num` | 从 1 开始 | 页码（1-based） |
| `num_per_page` | 默认 50 | 每页条数 |
| `cat` | 2 | **必须**，分类（歌曲），影响排序 |
| `grp` | 1 | **必须**，分组，影响排序 |
| `sin` | 0 | 偏移量，API 忽略此字段但需保留 |

## 原始 12 参数 → 精简 8 参数

以下参数经测试可安全去掉，不影响结果数量和排序：
- `highlight: 0` — 高亮标记
- `nqc_flag: 0` — 无损音质标志
- `multi_zhida: 0` — 多智达模式
- `sem: 0` — 搜索引擎模式

## 注意事项

- `page_num` 为 1-based：`page_num=0` 和 `page_num=1` 均返回第一页，`page_num=2` 返回第二页
- `sin` 参数经测试被 API 忽略，实际分页仅由 `page_num` 控制
- 请求 Header 中的 `User-Agent` 可省略
- 不需要 `Content-Type` header

## 响应解析

- `body.req.code === 0` 表示成功
- 结果在 `body.req.data.body.item_song` 数组中
- 总数在 `body.req.data.meta.sum` 中（使用 `sum` 而非 `estimate_sum`，后者会返回虚高的预估值导致空页）
- 每条关键字段：
  - `mid`：歌曲 ID
  - `title`：歌名
  - `singer`：歌手数组，需从 `name` 字段拼接
  - `album.name`：专辑名
  - `interval`：时长（秒）
  - `file.media_mid`：文件标识，缺少此字段表示不可播放，应过滤

---

# 酷狗 (KuGou) 搜索接口说明

# 酷狗 (KuGou) 搜索接口说明

## 请求 URL

```
https://songsearch.kugou.com/song_search_v2?keyword={keyword}&page={page}&pagesize={limit}&platform=WebFilter&iscorrection=1
```

## 参数说明

| 参数 | 值 | 说明 |
|------|------|------|
| `keyword` | 关键词（URL编码） | 搜索关键词 |
| `page` | 从 1 开始 | 页码 |
| `pagesize` | 默认 50 | 每页条数 |
| `platform` | `WebFilter` | **必须**，去掉后排序完全不同 |
| `iscorrection` | `1` | **必须**，去掉后排序不同 |

以下参数经测试可安全去掉：`userid`、`clientver`、`filter`、`privilege_filter`、`area_code`

## 特殊处理：error_code 149

当 `page × pagesize` 超过实际总数时，KG 返回 `error_code=149` 且 `total=0`。
处理方式：
1. 先用 `page=1, pagesize=1` 获取实际总数
2. 计算偏移量 `offset = (page - 1) × limit`
3. 计算剩余数量 `remaining = total - offset`
4. 重新计算页码 `newPage = floor(offset / remaining) + 1`
5. 用 `newPage` 和 `remaining` 重新请求

## 响应解析

- `error_code === 0` 表示成功
- 结果在 `data.lists` 数组中
- 每条关键字段：
  - `Audioid`：音频 ID
  - `FileHash`：文件 Hash
  - `SongName`：歌名
  - `Singers`：歌手数组，需从 `name` 字段拼接
  - `AlbumName`：专辑名
  - `Duration`：时长（秒）

去重键：`Audioid + FileHash`

---

# 网易云 (NetEase) 搜索接口说明

## 请求 URL

```
POST http://interface.music.163.com/eapi/batch
```

## 加密算法 (eapi)

1. 将请求参数序列化为 JSON 字符串
2. 计算签名消息：`nobody{url}use{text}md5forencrypt`
3. 对签名消息计算 MD5（32 位 hex）
4. 拼接数据：`{url}-36cd479b6b5-{text}-36cd479b6b5-{digest}`
5. 使用 AES-128-ECB 加密（密钥 `e82ckenh8dichen8`，Pkcs7 填充，输出 hex）
6. 将加密结果作为 `params` 表单字段发送

## 请求参数

| 参数 | 值 | 说明 |
|------|------|------|
| `keyword` | 关键词 | 搜索关键词 |
| `needCorrect` | `"1"` | 纠错标记 |
| `channel` | `"typing"` | 渠道标识，删除后排序有轻微变化 |
| `offset` | `limit * (page - 1)` | 偏移量 |
| `scene` | `"normal"` | 场景标识 |
| `total` | `page === 1` | 仅第一页请求总数，**必须**，删除后结果集和排序均变化 |
| `limit` | 20 | 每页条数，API 硬限制为 20 |

### 请求 Header

| Header | 值 | 说明 |
|--------|------|------|
| `Content-Type` | `application/x-www-form-urlencoded` | **必须**，Tauri fetch 解析表单数据需要 |

## 响应解析

- `code === 200` 表示成功
- 结果在 `data.resources` 数组中
- 每条关键字段（从 `baseInfo.simpleSongData` 解析）：
  - `id`：歌曲 ID
  - `name`：歌名
  - `ar`：歌手数组，需从 `name` 字段拼接
  - `al.name`：专辑名
  - `dt`：时长（毫秒，需转秒）

## 注意事项

- 每页固定 20 条，API 服务端限制无法修改
- `totalCount` 最大 300，超出部分返回重复结果
- `total` 参数仅第一页为 `true`，后续页为 `false`；删除会导致结果集完全不同
- 不需要 `Content-Type` 以外的其他 header

---

---

# 咪咕 (MiGu) 搜索接口说明

## 请求 URL

```
https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch={encoded}&pageSize={limit}&text={keyword}&pageNo={page}&sort=0&sid=USS
```

其中 `searchSwitch` 为 `{"song":1}` 的 URL 编码。

## 参数说明

### URL 参数

| 参数 | 值 | 说明 |
|------|------|------|
| `isCorrect` | 0 | **必须**，去掉后 total 从 124 变成 150，排序变化 |
| `isCopyright` | 1 | 版权过滤 |
| `searchSwitch` | `{"song":1}` | 搜索类型开关，原始有 8 个字段，精简后只保留 `song: 1` |
| `pageSize` | 默认 50 | 每页条数 |
| `text` | 关键词（URL编码） | 搜索关键词 |
| `pageNo` | 从 1 开始 | 页码 |
| `sort` | 0 | 排序方式 |
| `sid` | USS | 必须，去掉后返回 403 |

### searchSwitch 精简

原始 8 个字段 → 只保留 `song: 1`，结果完全一致：

可去掉的字段：`album: 0`, `singer: 0`, `tagSong: 1`, `mvSong: 0`, `bestShow: 1`, `songlist: 0`, `lyricSong: 0`

### 请求 Header

| Header | 值 | 说明 |
|--------|------|------|
| `uiVersion` | `A_music_3.6.1` | **必须**，去掉后返回 411 错误 |
| `deviceId` | 固定字符串 | 设备 ID |
| `timestamp` | 当前毫秒时间戳 | 用于签名 |
| `sign` | MD5 签名 | 签名算法：`md5({keyword}{SIGNATURE_MD5}yyapp2d16148780a1dcc7408e06336b98cfd50{DEVICE_ID}{timestamp})` |
| `User-Agent` | 移动端 UA | 模拟 Android 客户端 |

可去掉的 header：`channel`

## 响应解析

- 返回标准 JSON，`code === "000000"` 表示成功
- 结果在 `songResultData.resultList` 中，是一个二维数组
- 每条关键字段：
  - `copyrightId`：版权 ID（用作歌曲 ID）
  - `songId`：歌曲 ID（用于过滤重复）
  - `name`：歌名
  - `singerList`：歌手数组，需从 `name` 字段拼接
  - `album`：专辑名
  - `duration`：时长（秒）
