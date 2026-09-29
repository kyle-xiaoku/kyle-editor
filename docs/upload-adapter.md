# 分片上传（Chunk Upload）

编辑器的图片与视频统一走 `ChunkUploader`：**切片 → 并发上传 → 失败重试 → 合并**。它只依赖一个适配器对象，因此既能在**无后端**环境下演示，也能一行切换成真实服务。

```
File
 └─ 切片（file.slice，默认 1MB/片）
     ├─ worker 1 → put(chunk 0) → put(chunk 3) …   ← 并发数 concurrency
     ├─ worker 2 → put(chunk 1) …
     └─ worker 3 → put(chunk 2) …
         每片失败自动重试 retries 次（退避 600ms * n）
 └─ 全部完成 → complete() → 返回最终 url → 替换编辑器内的占位块
```

进度、已传字节、分片数、实时速度会通过 `onProgress(ratio, info)` 回传给编辑区占位块。

---

## 1. 三种开箱适配器

### 1.1 mock（默认，无需后端）

```js
KEditor.create('#editor', { uploader: 'mock' })

// 可调参数
KEditor.create('#editor', {
  uploader: KEditor.mockAdapter({
    speed: 8,            // 模拟带宽 MB/s
    latency: 160,        // 每片固定往返 ms
    failFirstChunk: true,// 演示「分片失败 → 自动重试」
    onEvent: (type, payload) => console.log(type, payload), // init/chunk/complete/instant/abort
  }),
  upload: { chunkSize: 256 * 1024 },
})
```

特点：分片真实切片与限速；完成后用 `URL.createObjectURL` 生成本地地址，可直接预览；同一文件重复上传命中「秒传」，不再重复切片。

### 1.2 http（对接真实后端）

```js
KEditor.create('#editor', {
  uploader: {
    type: 'http',
    initUrl: '/api/upload/init',
    chunkUrl: '/api/upload/chunk',
    completeUrl: '/api/upload/complete',
    abortUrl: '/api/upload/abort',        // 可选
    mode: 'raw',                          // 'raw' 裸 body（推荐）| 'formdata'
    headers: () => ({ Authorization: `Bearer ${getToken()}` }),
    withCredentials: true,                // 需要 Cookie 时
    parse: (json) => json.data,           // 统一响应外层包装
  },
  upload: { chunkSize: 5 * 1024 * 1024, concurrency: 4, retries: 2, fingerprint: 'strong' },
})
```

### 1.3 simple（已有单次上传接口）

```js
KEditor.create('#editor', {
  uploader: KEditor.simpleAdapter(async (file, { signal, onProgress }) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form, signal })
    onProgress?.(file.size, file.size)
    return (await res.json()).url          // 也可直接返回字符串
  }),
})
```

---

## 2. 后端接口约定（推荐实现）

### `POST /api/upload/init`

请求：

```json
{ "fileName": "a.mp4", "fileSize": 73400320, "fileType": "video/mp4",
  "lastModified": 1758000000000, "identifier": "…", "chunkSize": 1048576, "totalChunks": 71 }
```

响应（三选一）：

```jsonc
{ "uploadId": "u_8f3c", "uploadedChunks": [0, 1, 2] }   // 断点续传：告知已存在哪些片
{ "url": "https://cdn/x.png", "key": "…" }              // 秒传：identifier 已存在，直接返回地址
{ "uploadId": "u_8f3c", "uploadedChunks": [] }          // 全新任务
```

### `PUT /api/upload/chunk?uploadId=u_8f3c&index=3&total=71&filename=a.mp4`

- `mode: 'raw'`：请求体是二进制分片，`Content-Type: application/octet-stream`，服务端按 `uploadId` 落盘为 `parts/{index}`，可用 `X-Chunk-Index` 头做幂等校验。
- `mode: 'formdata'`：`multipart/form-data`，文件字段名 `fieldName`（默认 `file`），附带 `uploadId` / `index` / `total` / `filename`。
- 响应：`{}` 即可；若返回 `{ "url": "…" }` 则该分片自带地址（适合对象存储分片直传）。

### `POST /api/upload/complete`

```json
{ "uploadId": "u_8f3c", "identifier": "…", "fileName": "a.mp4", "fileSize": 73400320,
  "fileType": "video/mp4", "chunkSize": 1048576, "totalChunks": 71 }
```

响应必须包含 `url`：

```json
{ "url": "https://cdn/a.mp4", "key": "media/2026/09/a.mp4", "poster": "https://cdn/a.jpg", "duration": 63 }
```

### `POST /api/upload/abort`

`{ "uploadId": "u_8f3c" }`，用于清理临时分片（用户取消时触发，失败会被忽略）。

> Node/Express 的极简实现思路：`init` 建目录 + 扫已存在分片返回 `uploadedChunks`；`chunk` 用 `raw body → fs.createWriteStream`；`complete` 按 index 顺序 `concat` 后交给对象存储。若直接用 OSS/S3 分片上传，把 `put` 换成「拿签名 URL → PUT」即可，`complete` 调用 `CompleteMultipartUpload`。

---

## 3. 自定义适配器

只要实现 `put`，其余可选：

```js
const adapter = {
  async init(meta, { signal }) {
    // meta: {name,size,type,lastModified,fingerprint,chunkSize,totalChunks}
    return { uploadId: meta.fingerprint, uploadedChunks: [] } // 或 { url } 表示秒传
  },
  async put({ uploadId, index, total, blob, file, meta, size, signal }) {
    await myClient.send(blob, { index, signal })
    return {} // 或 { url }
  },
  async complete({ uploadId, meta, total, uploaded, chunkResults, file }) {
    return { url: 'https://…' } // 必须返回 url
  },
  async abort({ uploadId, meta, error }) {},
}

KEditor.create('#editor', { uploader: adapter, upload: { chunkSize: 2 * 1024 * 1024, concurrency: 2 } })
```

### 断点续传 / 秒传的判定依据

`meta.fingerprint` 默认由 `size + lastModified + 文件名` 组成（`upload.fingerprint: 'fast'`）。
改为 `'strong'` 时读取文件首尾各 256KB 计算 SHA-256（HTTPS / localhost 下可用），也允许传函数：

```js
upload: { fingerprint: async (file) => `${file.name}-${file.size}` }
```

服务端把 `identifier → 最终 url` 建索引即可实现秒传；把已落盘分片 index 列表返回即可续传。

---

## 4. 独立使用（不依赖编辑器）

```js
import { ChunkUploader, httpAdapter } from 'kyle-editor'

const uploader = new ChunkUploader(httpAdapter({ initUrl: '/api/upload/init', chunkUrl: '/api/upload/chunk', completeUrl: '/api/upload/complete' }), {
  chunkSize: 4 * 1024 * 1024,
  concurrency: 5,
  retries: 3,
})

const ctrl = new AbortController()
const { url, chunks } = await uploader.upload(bigFile, {
  signal: ctrl.signal,
  onProgress: (ratio, info) => bar.style.width = `${info.percent}%`,
  onChunk: ({ index, total }) => console.log(`${index + 1}/${total}`),
})
```

## 5. 编辑器内的交互契约

| 场景 | 行为 |
|------|------|
| 点击工具栏图片/视频 | 选择文件 → 就地插入占位块（含进度条、分片数、速度、取消按钮） |
| 拖拽文件到编辑区 | 光标定位到落点后插入占位块 |
| 粘贴截图 | 自动生成文件名并上传 |
| 上传成功 | 占位块替换为 `<img>` / `<video>`，图片支持双击放大、气泡工具条调整对齐/宽度/圆角/替换/删除 |
| 分片失败 | 自动重试 `retries` 次；仍失败则占位块转为错误态，提供「重试 / 移除」 |
| 取消 | `AbortController` 中止全部在传分片并调用 `abort()`，占位块移除 |
| 同一文件重复插入 | 适配器 `init` 返回 `url` 时直接秒传，不再切片 |
