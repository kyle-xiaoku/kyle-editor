# 发布到 npm 并支持 `npm install`

本项目的产物已经按「可直接发布」的标准配置好，本文覆盖：包名选择 → 登录 → 本地验证 → 发布 → 版本管理 → 安装使用 → 私有源 / CI 自动发布。

---

## 0. 先决条件

| 项 | 要求 | 检查命令 |
|----|------|---------|
| npm CLI | ≥ 8（建议 ≥ 10） | `npm -v` |
| Node | ≥ 16 | `node -v` |
| npm 账号 | 已注册且邮箱已验证 | `npm whoami` |
| 包名 | **未被占用** | `npm view <包名> version` |
| 网络 | 能访问 `registry.npmjs.org` | `npm ping` |

未登录时先登录：

```bash
npm login              # 新版 CLI 会打开浏览器授权
# 或 npm adduser --auth-type=legacy   # 走用户名/密码/邮箱/OTP 的传统方式
npm whoami             # 确认已登录
```

账号开启了 2FA 的，发布时会要求输入一次性验证码（OTP）：

```bash
npm publish --access public --otp=123456
```

---

## 1. 包名：已定为 `kyle-editor`

`keditor` 在 npm 上已被他人注册，无法使用：

```bash
npm view keditor version
# 0.0.1   ← 已占用
npm view kyle-editor version
# 404 Not Found   ← 可用，本项目采用的名字
```

> 无作用域的名字遵循「先到先得」，`kyle-editor` 目前可用但没有保留机制 —— 确定后尽快发布占位。
> 若希望长期独占、不怕重名，可改用作用域包 `@kyle/kyle-editor`（作用域 = npm 用户名或组织名，别人无法抢占，发布必须带 `--access public`）。

### 名字已经同步到这些地方（无需再改）

| 位置 | 内容 |
|------|------|
| `package.json` | `name: "kyle-editor"` |
| `src/vue/index.js` | `import { KEditor, defaults } from 'kyle-editor'` |
| `vite.config.vue.js` | `external: ['vue', 'kyle-editor']`、`globals: { 'kyle-editor': 'KEditor' }` |
| `README.md` / `docs/*.md` / `types/*.d.ts` / `demo/esm.html` | 所有 `npm install kyle-editor`、`from 'kyle-editor'`、`kyle-editor/vue` |

> ⚠️ **`external` 与包名必须一致**：Vue 产物把核心包作为外部依赖打包，`dist/keditor-vue.*.js` 里会留下裸说明符 `from "kyle-editor"`。若二者不一致，用户 `npm install` 后会报 `Cannot find module`。`npm run test:package` 会强制校验这一点。

### 不需要改的东西

`dist/` 下的**文件名**（`keditor.es.js` / `keditor.umd.js` / `keditor-vue.es.js`）和**全局变量名**（`window.KEditor`、`window.KEditorVue`）与包名无关，保持不变 —— 改它们会连带影响 `<script>` 引入方式和 CDN 路径。

以后若要再改名，同步这 4 处即可：`package.json.name`、`src/vue/index.js` 的 import、`vite.config.vue.js` 的 `external`/`globals`、文档里的包说明符（`dist` 文件名与 `KEditor` 全局名不动）。

---

## 2. package.json 中与发布相关的字段（已配置）

```jsonc
{
  "name": "…",
  "version": "1.0.0",
  "type": "module",

  // 三种模块格式的入口，兼容 ESM / CJS / 浏览器
  "main":    "./dist/keditor.cjs",   // require()
  "module":  "./dist/keditor.es.js",    // 打包器优先
  "unpkg":   "./dist/keditor.umd.js",   // <script src="https://unpkg.com/…">
  "jsdelivr":"./dist/keditor.umd.js",
  "types":   "./types/index.d.ts",

  // 子路径导出：keditor 与 keditor/vue 分别解析
  "exports": {
    ".":          { "types": "./types/index.d.ts", "import": "./dist/keditor.es.js", "require": "./dist/keditor.cjs" },
    "./vue":      { "types": "./types/vue.d.ts",   "import": "./dist/keditor-vue.es.js", "require": "./dist/keditor-vue.cjs" },
    "./package.json": "./package.json"
  },

  // 白名单：只有这些会进 tarball（node_modules / demo / test 自动排除）
  "files": ["dist", "src", "types", "docs", "README.md", "LICENSE"],

  // 样式随 JS 运行时注入，禁止 tree-shaking 误删 → 必须为 true
  "sideEffects": true,

  "license": "MIT",
  "engines": { "node": ">=16" },

  // Vue 为可选 peer：只用 <script>/核心 API 的项目不会被强制装 Vue
  "peerDependencies": { "vue": "^3.0.0" },
  "peerDependenciesMeta": { "vue": { "optional": true } },

  "publishConfig": { "access": "public" }
}
```

建议再补上（发布前填写真实地址，缺失不影响功能但影响 npm 页面展示）：

```jsonc
{
  "repository": { "type": "git", "url": "git+https://github.com/<你>/keditor.git" },
  "homepage":   "https://github.com/<你>/keditor#readme",
  "bugs":       { "url": "https://github.com/<你>/keditor/issues" },
  "author":     "kyle <zhendong.li@edoctor.cn>"
}
```

> ⚠️ **`main`/`exports.require` 必须指向 `.cjs` 文件**。因为本包 `type` 是 `module`，Node 会用最近的 `package.json` 判定 `.js` 为 ESM；若 CJS 产物叫 `xxx.cjs.js`，`require()` 会把它当 ESM 加载，**导出全部丢失得到空对象**。`npm run test:package` 已把这条列入强制校验。

`scripts` 里已经准备好：

| 命令 | 作用 |
|------|------|
| `npm run build` | 产出 `dist/` 6 个文件 |
| `npm run verify` | build + 66 项冒烟测试 + 4 个 demo 页健康检查 + 类型校验 |
| `npm run test:package` | 校验包名/exports 路径/`.cjs` 后缀/裸说明符一致性（63 项） |
| `npm run pack:check` | build + 一致性校验，并打印**将要发布的文件清单与体积**（不发布） |
| `npm run release` | 自动先跑 `prerelease`(=verify) 再 `npm publish --access public` |
| `npm run release:beta` | 发到 `beta` 标签，不影响 `latest` |

---

## 3. 发布前本地验证（强烈建议）

### 3.1 看将要发布的内容

```bash
npm run pack:check
```

关注输出末尾：`total files`、`package size`、`unpacked size`，以及**是否混入了不该发的文件**（`.DS_Store`、`test/`、`demo/`、`.idea/`）。

### 3.2 真实打 tarball 并在干净目录安装

这是最接近用户实际体验的验证，能提前发现 `exports` 路径写错、`files` 漏配等问题：

```bash
npm run build
npm pack                       # 生成 kyle-editor-1.0.0.tgz

mkdir -p .pack-verify && cd .pack-verify
cat > package.json <<'JSON'
{ "name": "pack-verify", "private": true, "version": "1.0.0" }
JSON
npm install ../kyle-editor-1.0.0.tgz

# 四个入口都必须能解析并拿到导出
node -e "const m=require('kyle-editor');console.log('CJS 核心:',Object.keys(m).length,'个导出, create=',typeof m.create)"
node -e "const m=require('kyle-editor/vue');console.log('CJS Vue :',Object.keys(m).join(','))"
node --input-type=module -e "const m=await import('kyle-editor');console.log('ESM 核心:',Object.keys(m).length,'个导出, default=',typeof m.default)"
node --input-type=module -e "const m=await import('kyle-editor/vue');console.log('ESM Vue :',Object.keys(m).join(','))"
```

期望输出（已实测）：

```
CJS 核心: 22 个导出, create= function
CJS Vue : KEditor,KEditorPlugin,KEditorVue,default,useKEditor
ESM 核心: 22 个导出, default= function
ESM Vue : KEditor,KEditorPlugin,KEditorVue,default,useKEditor
```

> ⚠️ 临时验证目录**必须有自己的 `package.json`**。否则 npm 会向上找到项目根的 `package.json`，把 tarball 装进本项目自己（并往 `dependencies` 里写入 `"kyle-editor": "file:...tgz"` 的自依赖）。万一发生了：删掉 `package.json` 里的 `dependencies` 字段、`rm -rf node_modules/kyle-editor`，再跑 `npm install --package-lock-only` 重建 lock。

浏览器端再验一次（可选，确认样式注入与挂载正常）：

```bash
cd .pack-verify
npx vite --port 5199   # 在页面里 import { KEditor } from 'kyle-editor' 试挂载
```

---

## 4. 正式发布

```bash
# 首次发布（1.0.0）
npm run release
# 等价于：npm run verify && npm publish --access public

# 若账号开了 2FA
npm publish --access public --otp=123456
```

成功后：

- 包页面：`https://www.npmjs.com/package/<包名>`（作用域包为 `/package/@scope/name`）
- CDN 自动可用（发布后约 1–2 分钟生效）：
  - `https://unpkg.com/<包名>/dist/keditor.umd.js`
  - `https://cdn.jsdelivr.net/npm/<包名>/dist/keditor.umd.js`

### 4.1 先发 beta 试水

```bash
npm version 1.0.1-beta.0 --no-git-tag-version
npm run release:beta
npm install <包名>@beta      # 用户侧
```

`beta` 标签不会成为 `latest`，普通 `npm install <包名>` 不受影响。

---

## 5. 版本管理与后续更新

遵循语义化版本 `主.次.补丁`：

```bash
npm version patch   # 1.0.0 → 1.0.1  修 bug
npm version minor   # 1.0.0 → 1.1.0  加功能，向下兼容
npm version major   # 1.0.0 → 2.0.0  破坏性变更
npm publish --access public
```

`npm version` 会自动改 `package.json`、生成 `package-lock.json` 变更并打 git tag（在非 git 仓库中会跳过 tag，可加 `--no-git-tag-version`）。

发布后校验：

```bash
npm view <包名> versions --json     # 历史版本
npm view <包名> dist-tags           # latest / beta 指向
npm cache clean --force && npm install <包名>@1.0.1   # 全新拉一次
```

### 5.1 撤包 / 废弃

```bash
npm deprecate <包名>@1.0.0 "有严重问题，请升级到 1.0.1"   # 推荐：安装时给出警告
npm unpublish <包名>@1.0.0                                # 仅发布 72 小时内、且无其他包依赖时允许
npm unpublish <包名> --force                              # 整包撤销（需邮箱验证，慎用）
```

> 已发布的版本号**不可复用**，即使撤包也不能再发同一个号，只能往上加版本。

---

## 6. 用户安装与集成

发布成功后，使用方只需：

```bash
npm install kyle-editor          # 换成你的实际包名
# 用 Vue 组件的项目
npm install kyle-editor vue@^3
```

### 6.1 打包器 / ESM

```js
import KEditor from 'kyle-editor'
import { createApp } from 'vue'
import KEditorVue, { KEditorComponent } from 'keditor/vue'

createApp(App).use(KEditorVue).mount('#app')
```

样式无需单独引入 —— CSS 随 JS 在运行时注入。

### 6.2 零构建（`<script>` / CDN）

```html
<script src="https://unpkg.com/keditor/dist/keditor.umd.js"></script>
<script>
  const editor = KEditor.create('#editor', { height: 460 })
</script>
```

Vue 3 的 UMD 版本对应 `dist/keditor-vue.umd.js`（需先引入 `vue.global.prod.js`）。

完整的 API、上传适配器接入方式见 `docs/api.md` 与 `docs/upload-adapter.md`。

---

## 7. 发布到私有 npm 源

公司内网发布（不占用公网包名，可直接叫 `keditor`）：

```jsonc
// package.json
{ "publishConfig": { "registry": "https://npm.your-company.com/", "access": "public" } }
```

```bash
npm login --registry=https://npm.your-company.com/
npm publish
```

用户侧配置：

```ini
# 项目根目录 .npmrc
registry=https://npm.your-company.com/
# 或只对某个作用域走私服
@your-org:registry=https://npm.your-company.com/
```

---

## 8. CI 自动发布（GitHub Actions 示例）

```yaml
# .github/workflows/publish.yml
name: publish
on:
  push:
    tags: ['v*']            # 打 tag 才发布

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write       # npm provenance 需要
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run verify
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

`NPM_TOKEN` 在 npmjs.com → Access Tokens 生成 **Granular Access Token**（勾选该包、权限 `Read and write`），存到仓库 Secrets。加 `--provenance` 可在包页面显示构建来源徽章，提升可信度。

---

## 9. 常见问题

| 现象 | 原因 / 处理 |
|------|------------|
| `ENEEDAUTH need auth` | 未登录 → `npm login` |
| `403 Forbidden - You do not have permission to publish "keditor"` | 包名被占用 → 换名或用作用域 |
| `402 Payment Required` | 作用域包默认私有 → 加 `--access public` |
| `EPUBLISHCONFLICT` / `cannot publish over previously published version` | 版本号重复 → `npm version patch` 后重发 |
| `E403 forbidden` + 提到 two-factor | 账号强制 2FA → `--otp=123456`，或把 token 权限设为 Automation |
| 装上了但 `Cannot find module 'kyle-editor/vue'` | `exports` 子路径写错或 `dist` 没进 `files` → `npm run pack:check` 核对 |
| 安装后样式丢失 | `sideEffects` 被设成 `false` 导致注入代码被摇掉 → 保持 `true` |
| `EBADENGINE` 警告 | 用户 Node 低于 `engines.node` → 调低或让用户升级 Node |
| CDN 拿不到最新文件 | unpkg/jsdelivr 有缓存 → `https://unpkg.com/kyle-editor@1.0.1/dist/keditor.umd.js` 锁定版本 |
| `require('kyle-editor')` 得到空对象 `{}` | `type: module` 的包里 CJS 产物用了 `.js` 后缀，Node 按最近 package.json 当成 ESM 解析 → CJS 产物必须是 `.cjs`（本项目已修，`npm run test:package` 会校验） |
| 服务端渲染报 `document is not defined` | 编辑器只能在浏览器运行 → Next.js 用 `'use client'` + `dynamic(..., { ssr: false })`，Nuxt 用 `.client` 插件 + `<ClientOnly>`，详见 `docs/integration.md` §3.5 |
| 发到公司源失败 | 检查 `.npmrc` registry 与该源的登录态（`npm whoami --registry=…`） |

---

## 10. 一键发布检查清单

本项目已完成全部发布准备（包名、exports、`.cjs` 后缀、LICENSE、验证脚本均已就绪），你只需跑这 3 条：

```bash
cd /Users/kyle/Desktop/work/kyle/keditor

npm login                          # 1) 登录（会拉起浏览器授权；开了 2FA 则发布时补 --otp）
npm view kyle-editor version       # 2) 应返回 404，确认名字仍可用
npm run release                    # 3) 构建 + 66 项冒烟 + 4 页健康检查 + 类型/包配置校验 + 发布
```

发布后确认：

```bash
npm whoami                                    # 当前登录账号
npm view kyle-editor versions --json          # 已上线版本
npm view kyle-editor dist-tags                # latest 指向 1.0.0
open https://www.npmjs.com/package/kyle-editor
```

完整验证清单（可选）：

| 步骤 | 命令 | 期望 |
|------|------|------|
| 构建 + 全量验证 | `npm run verify` | 66/66 冒烟、4 页健康、类型通过、63 项包配置通过 |
| 核对发布内容 | `npm run pack:check` | 38 个文件，约 200 KB，无 test/demo/.DS_Store |
| 真实安装验证 | 见 §3.2 | CJS/ESM × 核心/Vue 四个入口均 22 / 5 个导出 |
| 正式发布 | `npm run release` | 返回包页面 URL |
| 先发 beta 试水 | `npm run release:beta` | `dist-tags` 出现 beta，latest 不变 |
