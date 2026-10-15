# 上传（普通上传 / 分片上传）

编辑器有两条上传链路，**各自独立配置、互不影响**：

| 链路 | 选项 | 过程 | 适用 |
|------|------|------|------|
| 普通上传 | `uploader` | 整个文件**一次请求** | 小文件（图片为主） |
| 分片上传 | `chunkUploader` | 切片 → 并发 → 重试，**只打一个接口** | 大文件（视频为主） |

编辑器按 `upload.mode` 选路：

```js
KEditor.create('#editor', {
  uploader: '/api/upload',              // 普通上传
  chunkUploader: '/api/chunk-upload',   // 分片上传
  upload: {
    mode: 'auto',                       // 'auto'（默认，按体积）| 'normal' | 'chunk'
    chunkThreshold: 5 * 1024 * 1024,    // auto：达到该体积才走分片
    chunkSize: 1024 * 1024,
    concurrency: 4,
    retries: 2,
  },
})
```

```
File ──┬─ size < chunkThreshold ─→ SimpleUploader  ─→ POST /api/upload        （整包一次）
       └─ size ≥ chunkThreshold ─→ ChunkUploader   ─→ POST /api/chunk-upload   （每片一次，并发）
```

| 想做的事 | 怎么写 |
|----------|--------|
| 小文件直传、大文件分片 | `uploader` + `chunkUploader` + `mode: 'auto'`（默认） |
| 全部走普通上传 | 只配 `uploader`（分片自动不启用） |
| 全部走分片上传 | 只配 `chunkUploader`（`mode` 自动变 `'chunk'`） |
| 调阈值 | `upload: { chunkThreshold: 2 * 1024 * 1024 }` |
| 开箱演示（无后端） | 两条都不配，默认两条都是 `'mock'` |

> 只配一条链路时，另一条**不会**被默认 `mock` 顶上 —— 否则真实后端只接了一半，另一半会静默产生 `blob:` 假地址。显式写 `upload` 时以你的配置为准。
>
> `mode: 'chunk'` 但没配 `chunkUploader`：控制台告警并回退为普通上传，不会静默失败。

进度、已传字节、分片数、实时速度通过 `onProgress(ratio, info)` 回传到编辑区占位块（`info.mode` 为 `'normal'` / `'chunk'`）。

---

## 1. 普通上传（整个文件一次请求）

```js
KEditor.create('#editor', {
  uploader: '/api/upload',
  // 或：uploader: KEditor.httpAdapter({ url: '/api/upload' })
  // 或：uploader: async (file) => (await myUpload(file)).url
})
```

请求是 `multipart/form-data`，响应里 `url` 非空即成功：

```jsonc
// POST /api/upload   Content-Type: multipart/form-data
//   file       整个文件（字段名可用 fieldName 改）
//   filename   原始文件名
//   fileSize   总字节数

{ "url": "https://cdn.example.com/a.png" }           // ✅ 成功
{ "code": 0, "data": { "url": "https://…/a.png" } }  // ✅ 外层包装用 parse 解开
{ "code": 0, "msg": "ok" }                           // ❌ 没有 url → 判定失败
```

> 一次请求无法拿到逐字节进度，普通上传只上报「开始 / 结束」两个点。需要精细进度条就用分片上传。

## 2. 分片上传（只配一个地址）

```js
KEditor.create('#editor', {
  chunkUploader: '/api/chunk-upload',                       // 就这一个地址
  upload: { mode: 'chunk', chunkSize: 5 * 1024 * 1024, concurrency: 4 },
})
```

**约定：只要接口响应里 `url` 不为空，就代表这个文件上传成功。** 每个分片都打到这一个地址，不需要 `init` / `complete`：

```jsonc
// 请求：POST /api/chunk-upload  multipart/form-data
//   file       分片二进制（字段名可用 fieldName 改）
//   identifier 文件指纹，同一文件恒定（用来定位、续传、秒传）
//   index      分片下标，从 0 开始
//   total      总片数
//   filename / fileSize / chunkSize

// 响应：
{ "url": "https://cdn.example.com/a.png" }              // ✅ 非空 url = 成功
{ "code": 0, "data": { "url": "https://…/a.png" } }     // ✅ 外层包装用 parse 解开
{ "code": 0, "msg": "ok" }                              // ⏳ 还没收齐，继续传
{}
```

拿到 `url` 后：编辑器立即用该地址替换占位块，**剩余未发出的分片不再上传**，上传进度直接置 100%。所以服务端两种实现都支持 ——

| 服务端实现 | 行为 |
|------------|------|
| 收齐全部分片后返回 url（常见） | 最后一片的响应带回 url，自然成功 |
| `identifier` 命中已知文件则秒传 | 第一个响应就带 url，后面分片直接不发 |

全程都没有 `url` → 判定为失败，占位块转错误态并给出「重试 / 移除」，**不会静默当成功**。

需要鉴权 / 自定义字段名 / 地址字段不叫 `url` 时（两条链路写法相同）：

```js
KEditor.create('#editor', {
  chunkUploader: {
    type: 'http',
    url: '/api/chunk-upload',
    fieldName: 'chunk',                                      // 默认 'file'
    headers: () => ({ Authorization: `Bearer ${getToken()}` }), // 传函数每次请求实时取值
    withCredentials: true,
    parse: (json) => json.data,                              // 默认 json.data ?? json
    pickUrl: (json) => json?.payload?.filePath || '',         // 默认认 url / fileUrl / src
    mode: 'formdata',                                        // 默认 formdata
    method: 'POST',                                           // 默认：formdata → POST，raw → PUT
    chunkUrlFor: ({ index }) => `/api/chunk-upload?part=${index}`, // 可选：动态分片地址
  },
})
```

`mode` 的两种选择：

| mode | 请求形式 | 文件与上下文位置 |
|------|----------|------------------|
| `'formdata'`（默认） | `POST` multipart | 文件在 `fieldName` 字段，其余在表单字段 |
| `'raw'` | `PUT`/`POST` 裸 body | 文件是请求体，上下文（`identifier/index/total/filename`）在查询串 |

> **已移除三接口模式**：`httpAdapter` 不再接受 `initUrl` / `chunkUrl` / `completeUrl` / `abortUrl`，配了会直接报错并提示迁移。
> 需要 `init`（断点续传 / 秒传）/ `complete`（自行合并）这类自定义流程时，自己写适配器传给 `chunkUploader`，见第 5 节。

## 3. mock（默认，无需后端）

```js
KEditor.create('#editor')                  // uploader / chunkUploader 默认都是 'mock'

// 可调参数
KEditor.create('#editor', {
  chunkUploader: KEditor.mockAdapter({
    speed: 8,             // 模拟带宽 MB/s
    latency: 160,         // 每片固定往返 ms
    failFirstChunk: true, // 演示「分片失败 → 自动重试」
    onEvent: (type, payload) => console.log(type, payload), // init/chunk/complete/upload/instant/abort
  }),
  upload: { mode: 'chunk', chunkSize: 256 * 1024 },
})
```

特点：真实切片与限速；完成后用 `URL.createObjectURL` 生成本地地址，可直接预览；同一文件重复上传命中「秒传」，不再重复传输。普通上传链路同样可用（`adapter.upload()`，按体积分步上报进度）。

## 4. 后端接口约定

### 4.1 普通上传

```
POST /api/upload    Content-Type: multipart/form-data
```

| 字段 | 说明 |
|------|------|
| `file` | 整个文件（`fieldName` 可改） |
| `filename` / `fileSize` | 原始文件名 / 总字节 |

服务端存好文件后响应 `{ "url": "…" }` 即可。

### 4.2 分片上传（真的只需要这一个）

```
POST /api/chunk-upload    Content-Type: multipart/form-data
```

| 字段 | 说明 |
|------|------|
| `file` | 分片二进制（`fieldName` 可改） |
| `identifier` | 文件指纹，同一文件所有分片一致 —— 用它定位临时目录、做续传与秒传 |
| `index` / `total` | 当前分片下标（从 0 起）/ 总分片数 |
| `filename` / `fileSize` / `chunkSize` | 原始文件名 / 总字节 / 分片大小 |

服务端要做的事：把分片落到 `tmp/{identifier}/{index}.part`；当 `{identifier}` 下已集齐 `total` 片（或 `identifier` 早已上传过）时，按 index 顺序合并 → 传对象存储 → 响应 `{ "url": "…" }`。其他情况响应 `{}` 即可（不要返回空 `url` 字段）。

> 要注意的是分片并发到达，`index === total - 1` 并不意味着"前面都到了"，判定"集齐"要按磁盘上实际存在的分片数。
>
> 服务端只需要处理「一段二进制 + 几个上下文参数」，不需要 session、不需要 uploadId —— 分片并发到达也不会乱序落盘（文件名就是 index）。

## 5. 自定义适配器

**普通上传**只需实现 `upload()`：

```js
const normalAdapter = {
  async upload(file, { signal, onProgress }) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form, signal })
    onProgress?.(file.size, file.size)   // 可选：(已传字节, 总字节)
    return (await res.json()).url         // 返回字符串或 { url }
  },
}

KEditor.create('#editor', { uploader: normalAdapter })
```

**分片上传**实现 `put()` 即可，`init` / `complete` 可选：

```js
const chunkAdapter = {
  // 「响应里带 url 就是整份文件成功了」，拿到就收工、不再等 complete
  // 不用这个字段时，最终地址必须由 complete() 返回
  completeOnUrl: true,
  async put({ uploadId, index, total, blob, file, meta, size, signal }) {
    const res = await myClient.send(blob, { index, signal })
    return { url: res?.url } // 配合 completeOnUrl 使用：非空即当成功
  },
  // 可选：秒传 / 断点续传
  async init(meta, { signal }) {
    // meta: {name,size,type,lastModified,fingerprint,chunkSize,totalChunks}
    return { uploadId: meta.fingerprint, uploadedChunks: [] } // 或 { url } 表示秒传
  },
  // 可选：自己合并并返回地址（没有 completeOnUrl 时必须实现）
  async complete({ uploadId, meta, total, uploaded, chunkResults, file }) {
    return { url: 'https://…' }
  },
}

KEditor.create('#editor', {
  chunkUploader: chunkAdapter,
  upload: { mode: 'chunk', chunkSize: 2 * 1024 * 1024, concurrency: 2 },
})
```

`completeOnUrl` 也可以由调用方给定，优先级高于适配器：

```js
new ChunkUploader(adapter, { completeOnUrl: true })
KEditor.create('#editor', { chunkUploader: adapter, upload: { completeOnUrl: true } })
```

> 只实现了 `upload()` 的适配器传给 `chunkUploader` 也不会出错：分片链路会**自动退化为整包直传**（等价普通上传）。

### 断点续传 / 秒传的判定依据

`meta.fingerprint` 默认由 `size + lastModified + 文件名` 组成（`upload.fingerprint: 'fast'`）。
改为 `'strong'` 时读取文件首尾各 256KB 计算 SHA-256（HTTPS / localhost 下可用），也允许传函数：

```js
upload: { fingerprint: async (file) => `${file.name}-${file.size}` }
```

服务端把 `identifier → 最终 url` 建索引即可实现秒传；把已落盘分片 index 列表返回即可续传（需适配器实现 `init`）。

---

## 6. 独立使用（不依赖编辑器）

```js
import { SimpleUploader, ChunkUploader, httpAdapter, createSimpleUploader, createChunkUploader } from 'kyle-editor'

// 普通上传
const simple = createSimpleUploader('/api/upload')
const one = await simple.upload(file)

// 分片上传
const uploader = new ChunkUploader(httpAdapter({ url: '/api/chunk-upload' }), { chunkSize: 4 * 1024 * 1024, concurrency: 5, retries: 3 })

const ctrl = new AbortController()
const { url, chunks, mode } = await uploader.upload(bigFile, {
  signal: ctrl.signal,
  onProgress: (ratio, info) => bar.style.width = `${info.percent}%`,
  onChunk: ({ index, total }) => console.log(`${index + 1}/${total}`),
})
```

选路器也可以单独用（`editor.uploader` 就是它）：

```js
const pipeline = new UploadPipeline(simple, uploader, { mode: 'auto', chunkThreshold: 5 * 1024 * 1024 })
pipeline.pick(file)      // 'normal' | 'chunk'
await pipeline.upload(file, { onProgress })
```

## 7. 编辑器内的交互契约

| 场景 | 行为 |
|------|------|
| 点击工具栏图片/视频 | 选择文件 → 就地插入占位块（含进度条、分片数、速度、取消按钮） |
| 拖拽文件到编辑区 | 光标定位到落点后插入占位块 |
| 粘贴截图 | 自动生成文件名并上传 |
| 上传成功 | 占位块替换为 `<img>` / `<video>`，地址取接口返回的 `url`；图片支持双击放大、气泡工具条调整对齐/宽度/圆角/替换/删除、**拖拽右下角把手实时缩放** |
| 分片失败 | 自动重试 `retries` 次；仍失败则占位块转为错误态，提供「重试 / 移除」 |
| 取消 | `AbortController` 中止全部在传请求（分片链路若有 `abort()` 也会调用），占位块移除 |
| 同一文件重复插入 | 适配器 `init` 返回 `url` 时直接秒传，不再切片 |
