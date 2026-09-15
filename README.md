**English** · [中文](#chinese)

<a name="english"></a>
# intent-ui-sdk

### 64 KB of vanilla JS that turns any business page into an AI surface — and **never** opens a chat box

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)
![Runtime dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg)
![Size](https://img.shields.io/badge/size-~64%20KB%20unminified-informational.svg)
![Framework](https://img.shields.io/badge/framework-agnostic-blueviolet.svg)
![Backend](https://img.shields.io/badge/backend-any%20(5%20endpoints)-orange.svg)

**Intent as a Service, front end.** Instead of one global chat box, your business pages carry a row
of **intent buttons**. Clicking one runs a declared intent and renders the **structured result card**
right there, in the page the user is already working in.

This repository is the rendering and interaction half — plain JavaScript, **no runtime dependencies,
no framework lock-in**. Intent definitions, executors and LLM wiring live in
[intent-sdk](https://github.com/intent-as-a-service/intent-sdk); this SDK only needs a backend that
speaks **five endpoints**.

```
                      ⊙  one mount call
                            │
        ┌───────────────────▼───────────────────────────────┐
        │  Intent as a Service                              │
        │ ── 📌 Todos · Account risk scan ─────────────────  │
        │     · "Zhang San", inactive 91 days          ▸     │
        │     · "Li Si",     inactive 63 days          ▸     │
        │ ── ⌘ Quick actions ──────────────────────────────  │
        │     [Build a follow-up plan] [Show contacts]       │
        │ ┌───────────────────────────────────────────────┐  │
        │ │ Customer analysis report       AI · verified  │  │
        │ │ text · key-value · table · list · badges      │  │
        │ │ followups ▸ next intents ▸ thumbs up / down   │  │
        │ └───────────────────────────────────────────────┘  │
        │ ▸ Execution trace — 9 steps, 1 tool call           │
        └────────────────────────────────────────────────────┘
```

**One core, two reference hosts.** Both embed the same build, byte for byte — there is no
host-specific version of this package, and that is the whole point:

| Reference host | Stack | Intents |
|---|---|---|
| [ruoyi-office](https://github.com/intent-as-a-service/ruoyi-office) | Vue 3 + Vben (Ant Design) | 40 (full CRM chain) |
| [RuoYi-Vue-Plus](https://github.com/intent-as-a-service/RuoYi-Vue-Plus) | Vue 3 + Element Plus | 14 (system / monitor) |

---

## Why developers pick it up

- **No chat box, no prompt-writing users.** The system declares what can be asked; the user clicks.
- **Framework-agnostic for real.** Vanilla JS core with a `window.IntentUI` global, an ESM entry for
  Vite/webpack/Rollup, and a `.d.ts`. Vue 2, Vue 3, React, jQuery and server-rendered templates all
  use the same build.
- **Zero runtime dependencies, ~64 KB unminified.** No transitive tree to audit, no upgrade treadmill.
- **Backend-agnostic.** Implement five endpoints and any backend works — including your own.
- **It never touches your session.** Auth headers are produced by the host, per request; the SDK has
  no idea what your login even looks like.
- **Everything is in the box.** Floating entry point, intent menu, slot form, todo groups, result
  cards, execution trace, history, feedback.

## What it gives you

| Capability | Description |
|---|---|
| Floating entry point | A draggable AI button plus a drawer panel; the position is remembered in `localStorage`; one line adds it site-wide |
| Embedded panel | Or mount the panel into any container and treat it as an in-page AI area |
| Intent menu | Loads the intents available for the current page (`page`), with fuzzy matching over aliases |
| Slot form | Missing parameters pop a form automatically; the host can supply dropdown candidates for entity parameters |
| Todos & recommendations | Todo groups plus next-step recommendations (`nextIntents`) returned per page by the backend |
| Result cards | One envelope renders as text / key-value / table / list / badges blocks |
| Execution trace | Shows the steps and tool calls of a run, so you can explain *why* the AI answered that way |
| History & feedback | Execution history (`/history`), trace replay (`/trace/:id`), thumbs up/down feedback |

**Design stance**: the host page owns business context and permissions; the SDK only does "fire an
intent → render the result".

## Install

> **Not on npm yet** — today the package is consumed straight from source, and it is two commands.
> The manifest is already npm-shaped; publishing to the registry is the next step.

```bash
git clone https://github.com/intent-as-a-service/intent-ui-sdk.git
```

```jsonc
// package.json — point the dependency at the checkout
"dependencies": {
  "intent-ui-sdk": "link:../intent-ui-sdk"
}
```

```bash
pnpm install        # or npm install / yarn
```

```ts
// vite.config.ts — when linking a directory outside the repo, allow it explicitly
export default defineConfig({
  server: { fs: { allow: ['.', '../intent-ui-sdk'] } },
});
```

> **Just want to look?** Open [`demo/index.html`](./demo/index.html) — a
> zero-build debug console. Serve this directory as static files, point "API prefix" at your
> backend, and try the catalog, slot form, execution and trace with no code at all.

## Quick start

### 1. Floating entry point (recommended: one line for the whole app)

```ts
import 'intent-ui-sdk/css/intent-ui.css';
import { IntentUI } from 'intent-ui-sdk';

const intent = IntentUI.mountFloating({
  apiPrefix: '/dev-api/intent',                            // includes the host API prefix
  authHeaders: () => ({ Authorization: `Bearer ${token}` }),
  getPage: () => route.path.replace(/^\//, ''),            // → 'system/user'
  getContext: () => ({ userId: route.query.id }),          // page context (follows page data)
  onEvent: (type, payload) => console.log('[intent]', type, payload),
});
```

Reset on route change (**required**, otherwise the previous page's result stays in the panel):

```ts
watch(() => route.path, () => {
  intent.close();
  intent.reset();
});
```

> Since v0.4.0 the SDK also detects a page change and resets itself when the panel is reopened.
> Calling `reset()` from the host is still the safer route — especially when the panel stays open
> while only the menu changes.

### 2. Embedded panel

```html
<div id="intent-panel"></div>
```

```ts
IntentUI.mount({
  container: document.querySelector('#intent-panel'),
  page: 'crm/contract',
  context: { contractId: 'C-1024' },
});
```

### 3. Reuse the host's HTTP client

When the host has its own interceptors, encryption or tenant headers, inject a `fetcher` and the SDK
stops sending its own requests:

```ts
IntentUI.configure({
  fetcher: async (url, options, headers) => {
    const res = await myHttp.request({ url, method: options?.method ?? 'GET', data: options?.body, headers });
    return res.data;      // either a { code, data } envelope or the data itself
  },
});
```

---

## Configuration (`IntentUI.configure` / the `mount*` options)

| Option | Default | Description |
|---|---|---|
| `apiPrefix` | `/intent` | Intent API prefix, **including the host's gateway prefix** |
| `basePath` | `''` | Prepended to `apiPrefix`, for hosts deployed under a sub-path |
| `token` | `null` | Static token; prefer `authHeaders` when the session can expire |
| `tenantId` | `null` | Static tenant id, sent as the `tenant-id` header |
| `authHeaders` | `null` | `() => Record<string,string>`, evaluated per request (recommended) |
| `headers` | `null` | Extra static headers |
| `fetcher` | `null` | Custom request function, routed through the host HTTP client |
| `locale` | `'zh-CN'` | Built-in `zh-CN` / `en-US` |
| `strings` | `null` | Override built-in copy (merged by key) |
| `zIndex` | `null` | Stacking base: floating button = z, overlay = z+1, drawer = z+2, popover = z+3 |
| `drawerWidth` | `920` | Drawer width in px |
| `todoPageSize` | `3` | Items per page inside a todo group |
| `maxTodoGroups` | `5` | How many todo groups to show side by side |
| `quickIntents` | `3` | Intents in the "current object" quick bar (`0` = hide) |
| `entityOptions` | `null` | Slot entity candidates: `{ key: [{label,value}] \| () => array/Promise }` |

`mountFloating` also accepts `storageKey` (the `localStorage` key for the button position, default
`intent-fab-position`).

### Handles

```ts
// mountFloating(...) → IntentFloatingHandle
{ root, fab, open(), close(), isOpen(), reload(), reset(), page(), resetPosition(), destroy() }

// mount(...) → IntentMountHandle
{ root, panelRef, reload(), render(), reset(), destroy() }
```

---

## Backend contract

Five endpoints, and any backend works:

| Method | Path | Description |
|---|---|---|
| `GET` | `{prefix}/catalog?page=<page>` | Intent catalog (plus todo groups / recommendations for that page); omit `page` for everything |
| `POST` | `{prefix}/execute` | Execute an intent and return the result envelope |
| `GET` | `{prefix}/history?limit=<n>` | Execution history |
| `GET` | `{prefix}/trace/<traceId>` | Step/tool trace of a single execution |
| `POST` | `{prefix}/feedback` | Feedback on a result (thumbs up/down plus a note) |

Response envelopes accept two success codes: `code === 0` (the SDK's reference host) and
`code === 200` (RuoYi-Vue-Plus's `R<T>`). Either way the SDK reads `data`; when there is no `code`
field, the response body itself is treated as the data.

### Result envelope (the `data` of `/execute`)

```jsonc
{
  "title": "Dormant customers this quarter",
  "summary": "37 customers with no deal closed for over 60 days",
  "blocks": [
    { "kind": "text",   "text": "…" },
    { "kind": "kv",     "items": [{ "label": "Basis", "value": "last deal date" }] },
    { "kind": "table",  "columns": ["Customer", "Days"], "rows": [["Acme Ltd", "72"]] },
    { "kind": "list",   "items": ["…"] },
    { "kind": "badges", "items": [{ "text": "High risk", "tone": "danger" }] }
  ],
  "followups":  [{ "label": "Show their contacts", "intent": "crm.customer.contacts" }],
  "nextIntents":[{ "id": "crm.customer.followup", "name": "Build a follow-up plan" }]
}
```

`blocks[].kind` supports `text` / `kv` / `table` / `list` / `badges`; unknown kinds are ignored
rather than treated as an error, so the backend can extend the format first.

---

## Layout

```
intent-ui-sdk/
├─ js/
│  ├─ intent-ui-sdk.js       # the whole thing (vanilla JS, exposes window.IntentUI, CJS/ESM friendly)
│  ├─ intent-ui-sdk.mjs      # ESM entry for Vite/webpack/Rollup
│  └─ intent-ui-sdk.d.ts     # type declarations, kept in sync with the implementation
├─ css/intent-ui.css         # styles (own stacking context and theme variables, iui- prefix)
├─ demo/index.html           # debug console (owned by the host, see below)
├─ scripts/sync.mjs          # host copy sync (this repository is the single source of truth)
└─ package.json
```

### Single source of truth and host copies

A backend has to serve the SDK as static resources (for example Spring's `classpath:/intent-ui/**`),
so every host directory keeps a **built copy**. Those copies must be generated, never hand-edited —
otherwise hosts drift apart:

```bash
node scripts/sync.mjs            # sync into the built-in default host directories
node scripts/sync.mjs --check    # verify only; exits 1 on drift (usable in CI)
node scripts/sync.mjs <dir>...   # sync into specific directories
```

Only `package.json` + `js/*` + `css/*` are synced. **`index.html` and `js/demo-app.js` belong to the
host**: the debug console's API prefix, demo data and proxy prefix differ per host, so the script
never overwrites them.

## Debug console

`demo/index.html` is a zero-build console: serve the SDK directory as static files (or host this
repository behind any static server), open the page, point "API prefix" at your host's intent prefix,
and try the catalog, slot form, execution and trace without writing any code.

## Related repositories

| Repository | What it is |
|---|---|
| [intent-sdk](https://github.com/intent-as-a-service/intent-sdk) | The framework: protocol, execution engine, host SPI, Spring Boot starter |
| [ruoyi-office](https://github.com/intent-as-a-service/ruoyi-office) | Reference host — 40 CRM intents |
| [RuoYi-Vue-Plus](https://github.com/intent-as-a-service/RuoYi-Vue-Plus) | Reference host — 14 system / monitor intents |

## License

[Apache-2.0](./LICENSE)

**Keywords:** intent as a service · AI UI components · no chat box · framework-agnostic · vanilla JS ·
Vue · React · agentic UI · result cards · execution trace

---

<a name="chinese"></a>
# intent-ui-sdk

**约 64 KB 原生 JS，把任意业务页面变成 AI 入口 —— 而且永远不开聊天框** · [English](#english) · **中文**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
![版本](https://img.shields.io/badge/%E7%89%88%E6%9C%AC-0.4.0-blue.svg)
![运行时依赖](https://img.shields.io/badge/%E8%BF%90%E8%A1%8C%E6%97%B6%E4%BE%9D%E8%B5%96-0-brightgreen.svg)
![体积](https://img.shields.io/badge/%E4%BD%93%E7%A7%AF-%E7%BA%A6%2064%20KB%EF%BC%88%E6%9C%AA%E5%8E%8B%E7%BC%A9%EF%BC%89-informational.svg)
![框架](https://img.shields.io/badge/%E6%A1%86%E6%9E%B6-%E6%97%A0%E9%99%90%E5%88%B6-blueviolet.svg)
![后端](https://img.shields.io/badge/%E5%90%8E%E7%AB%AF-%E4%BB%BB%E6%84%8F%EF%BC%885%20%E4%B8%AA%E7%AB%AF%E7%82%B9%EF%BC%89-orange.svg)

**意图即服务的前端一半。** 不再是一个全局聊天框，而是把一排**意图按钮**放进业务页面：
点一下即执行，**结构化结果卡片**就渲染在用户本来就在操作的那个页面里。

本仓只负责**渲染与交互**：原生 JavaScript，**零运行时依赖、不绑定框架**。意图定义、执行器、
LLM 接入在 [intent-sdk](https://github.com/intent-as-a-service/intent-sdk)；本 SDK 只要求后端实现
**5 个端点**。

```
                      ⊙  一行挂载
                            │
        ┌───────────────────▼───────────────────────────────┐
        │  意图即服务                                        │
        │ ── 📌 待办 · 账号风险体检 ────────────────────────  │
        │     · 账号「张三」已 91 天未登录              ▸     │
        │     · 账号「李四」已 63 天未登录              ▸     │
        │ ── ⌘ 当前对象快捷条 ─────────────────────────────  │
        │     [生成跟进计划] [看看他们的联系人]               │
        │ ┌───────────────────────────────────────────────┐  │
        │ │ 客户经营分析报告              AI · 已通过校验  │  │
        │ │ 文本 · 键值 · 表格 · 列表 · 徽标               │  │
        │ │ 下一步 ▸ 推荐意图 ▸ 点赞 / 点踩                │  │
        │ └───────────────────────────────────────────────┘  │
        │ ▸ 执行轨迹 —— 9 个步骤，1 次工具调用                │
        └────────────────────────────────────────────────────┘
```

**一个核心，两个参考宿主。** 两边内嵌的是同一份产物，逐字节一致 ——
**不存在某个宿主专用的版本**，这正是它保持框架无关的意义：

| 参考宿主 | 技术栈 | 意图数 |
|---|---|---|
| [ruoyi-office](https://github.com/intent-as-a-service/ruoyi-office) | Vue 3 + Vben（Ant Design） | 40 个（CRM 全链路） |
| [RuoYi-Vue-Plus](https://github.com/intent-as-a-service/RuoYi-Vue-Plus) | Vue 3 + Element Plus | 14 个（系统 / 监控） |

---

## 为什么值得用

- **没有聊天框，也不用教用户写提示词**：系统声明能问什么，用户只需要点。
- **真正的框架无关**：原生 JS 挂 `window.IntentUI`，另提供给 Vite/webpack/Rollup 的 ESM 入口与
  `.d.ts`；Vue2 / Vue3 / React / jQuery / 服务端模板共用同一份产物。
- **零运行时依赖、压缩前约 64 KB**：没有传递依赖要审，也没有升级链要跟。
- **后端无关**：实现 5 个端点即可对接任意后端，包括你自己写的。
- **不碰宿主登录态**：鉴权头由宿主每次请求现取，SDK 根本不知道你的登录长什么样。
- **能力全套自带**：悬浮入口、意图菜单、槽位表单、待办分组、结果卡片、执行轨迹、历史、反馈。

## 它提供什么

| 能力 | 说明 |
|---|---|
| 悬浮入口 | 可拖拽的 AI 悬浮球 + 抽屉面板，位置记在 `localStorage`，一行接入全站 |
| 内嵌面板 | 也可把面板挂到页面里的任意容器，做成"页面内的 AI 区域" |
| 意图菜单 | 按当前页面（`page`）装载该页面可用的意图，支持口语化匹配排序 |
| 槽位表单 | 意图缺参时自动弹表单；实体类参数可由宿主提供下拉候选 |
| 待办与推荐 | 后端按页面返回的待办分组 + 下一步推荐（`nextIntents`） |
| 结果卡片 | 统一信封渲染：文本 / 键值 / 表格 / 列表 / 徽标 五类区块 |
| 执行轨迹 | 展示一次意图执行的步骤与工具调用，用于解释"AI 为什么这么答" |
| 历史与反馈 | 执行历史（`/history`）+ 轨迹回放（`/trace/:id`）+ 点赞点踩反馈 |

**核心设计取向**：宿主页面掌握业务上下文与权限，SDK 只做"发起意图 → 展示结果"。

## 安装

> **尚未发布到 npm**：当前以源码方式接入，两条命令即可。包结构已经是 npm 形态，发布是下一步。

```bash
git clone https://github.com/intent-as-a-service/intent-ui-sdk.git
```

```jsonc
// package.json —— 依赖直接指向该目录
"dependencies": {
  "intent-ui-sdk": "link:../intent-ui-sdk"
}
```

```bash
pnpm install        # 或 npm install / yarn
```

```ts
// vite.config.ts —— 用 link: 指向仓库外部目录时，需要放行该目录
export default defineConfig({
  server: { fs: { allow: ['.', '../intent-ui-sdk'] } },
});
```

> **只想先看看？** 直接打开 [`demo/index.html`](./demo/index.html) 零构建调试台：
> 把本目录作为静态资源发布，把"接口前缀"指向你的后端，不写一行代码就能试意图目录、
> 槽位表单、执行与轨迹。

## 快速接入

### 1. 悬浮入口（推荐：一行接入全站）

```ts
import 'intent-ui-sdk/css/intent-ui.css';
import { IntentUI } from 'intent-ui-sdk';

const intent = IntentUI.mountFloating({
  apiPrefix: '/dev-api/intent',                            // 含宿主 API 前缀
  authHeaders: () => ({ Authorization: `Bearer ${token}` }),
  getPage: () => route.path.replace(/^\//, ''),            // → 'system/user'
  getContext: () => ({ userId: route.query.id }),          // 页面上下文（随页面数据变化）
  onEvent: (type, payload) => console.log('[intent]', type, payload),
});
```

在路由变化时复位（**必做**，否则上一个页面的结果会残留在面板里）：

```ts
watch(() => route.path, () => {
  intent.close();
  intent.reset();
});
```

> v0.4.0 起，重开面板时 SDK 也会自己检测页面是否变化并复位；宿主显式调用 `reset()` 仍然是更稳的做法
> （尤其是面板一直开着、只切菜单的场景）。

### 2. 内嵌面板

```html
<div id="intent-panel"></div>
```

```ts
IntentUI.mount({
  container: document.querySelector('#intent-panel'),
  page: 'crm/contract',
  context: { contractId: 'C-1024' },
});
```

### 3. 复用宿主的 HTTP 客户端

宿主有自己的拦截器、加密、租户头时，注入 `fetcher` 即可，SDK 不再自己发请求：

```ts
IntentUI.configure({
  fetcher: async (url, options, headers) => {
    const res = await myHttp.request({ url, method: options?.method ?? 'GET', data: options?.body, headers });
    return res.data;      // { code, data } 信封，或直接返回数据体
  },
});
```

---

## 配置项（`IntentUI.configure` / 各 `mount*` 选项）

| 选项 | 默认值 | 说明 |
|---|---|---|
| `apiPrefix` | `/intent` | 后端意图接口前缀，**含宿主的 API 网关前缀** |
| `basePath` | `''` | 拼在 `apiPrefix` 之前，宿主部署在子路径时用 |
| `token` | `null` | 静态 token；登录态会过期时请改用 `authHeaders` |
| `tenantId` | `null` | 静态租户号，会作为 `tenant-id` 头发送 |
| `authHeaders` | `null` | `() => Record<string,string>`，每次请求动态取（推荐） |
| `headers` | `null` | 固定附加请求头 |
| `fetcher` | `null` | 自定义请求器，走宿主 HTTP 客户端 |
| `locale` | `'zh-CN'` | 内置 `zh-CN` / `en-US` |
| `strings` | `null` | 覆盖内置文案（按 key 合并） |
| `zIndex` | `null` | 层级基数：悬浮球 = z，遮罩 = z+1，抽屉 = z+2，弹层 = z+3 |
| `drawerWidth` | `920` | 抽屉宽度（px） |
| `todoPageSize` | `3` | 待办分组内每页条数 |
| `maxTodoGroups` | `5` | 最多并列展示几个待办分组 |
| `quickIntents` | `3` | 「当前对象快捷条」最多展示几个意图（`0` = 不展示） |
| `entityOptions` | `null` | 槽位实体候选：`{ key: [{label,value}] \| () => 数组/Promise }` |

`mountFloating` 额外支持 `storageKey`（悬浮球位置的 `localStorage` key，默认 `intent-fab-position`）。

### 句柄

```ts
// mountFloating(...) → IntentFloatingHandle
{ root, fab, open(), close(), isOpen(), reload(), reset(), page(), resetPosition(), destroy() }

// mount(...) → IntentMountHandle
{ root, panelRef, reload(), render(), reset(), destroy() }
```

---

## 后端契约

只依赖 5 个端点，任何后端按此实现即可对接：

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `{prefix}/catalog?page=<page>` | 意图目录（含该页面的待办分组 / 推荐），不传 `page` = 全量 |
| `POST` | `{prefix}/execute` | 执行意图，返回结果信封 |
| `GET` | `{prefix}/history?limit=<n>` | 执行历史 |
| `GET` | `{prefix}/trace/<traceId>` | 单次执行的步骤/工具轨迹 |
| `POST` | `{prefix}/feedback` | 结果反馈（点赞/点踩 + 备注） |

响应信封兼容两种成功码：`code === 0`（SDK 参考宿主）与 `code === 200`（RuoYi-Vue-Plus 的 `R<T>`）。
两种情况都取 `data`；没有 `code` 字段时把响应体本身当作数据。

### 结果信封（`/execute` 的 `data`）

```jsonc
{
  "title": "本季度沉睡客户",
  "summary": "共 37 个客户超过 60 天未成交",
  "blocks": [
    { "kind": "text",   "text": "……" },
    { "kind": "kv",     "items": [{ "label": "统计口径", "value": "最近成交时间" }] },
    { "kind": "table",  "columns": ["客户", "天数"], "rows": [["XX 公司", "72"]] },
    { "kind": "list",   "items": ["……"] },
    { "kind": "badges", "items": [{ "text": "高风险", "tone": "danger" }] }
  ],
  "followups":  [{ "label": "看看他们的联系人", "intent": "crm.customer.contacts" }],
  "nextIntents":[{ "id": "crm.customer.followup", "name": "生成跟进计划" }]
}
```

`blocks[].kind` 支持 `text` / `kv` / `table` / `list` / `badges`；未知 `kind` 会被忽略而不是报错，
便于后端先行扩展。

---

## 目录结构

```
intent-ui-sdk/
├─ js/
│  ├─ intent-ui-sdk.js       # 主体（原生 JS，挂 window.IntentUI，也兼容 CJS/ESM 宿主）
│  ├─ intent-ui-sdk.mjs      # ESM 入口：给 Vite/webpack/Rollup 用
│  └─ intent-ui-sdk.d.ts     # 类型声明，与实现一一对应
├─ css/intent-ui.css         # 样式（自带层级/主题变量，前缀 iui-）
├─ demo/index.html           # 调试台（宿主持有，见下）
├─ scripts/sync.mjs          # 宿主副本同步（本仓库是唯一真源）
└─ package.json
```

### 单一真源与宿主副本

后端要把 SDK 作为静态资源对外提供（例如 Spring 的 `classpath:/intent-ui/**`），因此每个宿主目录里
都会有一份**产物副本**。这些副本必须由脚本生成，**不要手工编辑**，否则多个宿主之间必然各自漂移：

```bash
node scripts/sync.mjs            # 同步到内置的默认宿主目录
node scripts/sync.mjs --check    # 只校验；有漂移则退出码 1（可放进 CI）
node scripts/sync.mjs <dir>...   # 同步到指定目录
```

同步范围只有 `package.json` + `js/*` + `css/*`。**`index.html` 与 `js/demo-app.js` 属于宿主自持**：
调试台的 `apiPrefix`、演示数据、代理前缀各宿主不同，脚本不会覆盖它们。

## 调试台

`demo/index.html` 是一个零构建的调试台：把 SDK 目录作为静态资源发布（或直接用任意静态服务器托管本仓），
打开页面、把"接口前缀"改成宿主的意图前缀，即可在不写代码的情况下试意图目录、槽位表单、执行与轨迹。

## 相关仓库

| 仓库 | 说明 |
|---|---|
| [intent-sdk](https://github.com/intent-as-a-service/intent-sdk) | 框架本体：协议、执行引擎、宿主 SPI、Spring Boot Starter |
| [ruoyi-office](https://github.com/intent-as-a-service/ruoyi-office) | 参考宿主 —— 40 个 CRM 意图 |
| [RuoYi-Vue-Plus](https://github.com/intent-as-a-service/RuoYi-Vue-Plus) | 参考宿主 —— 14 个系统 / 监控意图 |

## License

[Apache-2.0](./LICENSE)

**关键词**：意图即服务 · 内嵌 AI 组件 · 去聊天框 · 框架无关 · 原生 JS · Vue · React · 结果卡片 · 执行轨迹
