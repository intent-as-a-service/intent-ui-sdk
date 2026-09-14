# intent-ui-sdk

框架无关的**「意图即服务」前端组件**：把 AI 能力以*意图按钮*的形式嵌进业务页面，点一下就在当前页面出结果卡片——不再额外开一个聊天框。

后端对应的意图定义、执行器、LLM 接入在 [`intent-sdk`](https://github.com/intent-as-a-service/intent-sdk)；本仓库只负责**渲染与交互**，不绑定任何前端框架（原生 JS，无运行时依赖，压缩前约 64 KB）。

---

## 它提供什么

| 能力 | 说明 |
| --- | --- |
| 悬浮入口 | 可拖拽的 AI 悬浮球 + 抽屉面板，位置记在 `localStorage`，一行接入全站 |
| 内嵌面板 | 也可把面板挂到页面里的任意容器，做成"页面内的 AI 区域" |
| 意图菜单 | 按当前页面（`page`）装载该页面可用的意图，支持口语化匹配排序 |
| 槽位表单 | 意图缺参时自动弹表单；实体类参数可由宿主提供下拉候选 |
| 待办与推荐 | 后端按页面返回的待办分组 + 下一步推荐（`nextIntents`） |
| 结果卡片 | 统一信封渲染：文本 / 键值 / 表格 / 列表 / 徽标 五类区块 |
| 执行轨迹 | 展示一次意图执行的步骤与工具调用，用于解释"AI 为什么这么答" |
| 历史与反馈 | 执行历史（`/history`）+ 轨迹回放（`/trace/:id`）+ 点踩反馈 |

**核心设计取向**：宿主页面掌握业务上下文与权限，SDK 只做"发起意图 → 展示结果"。鉴权头由宿主动态提供，SDK 不碰宿主的登录态。

---

## 安装

```bash
pnpm add intent-ui-sdk
# 或 npm i intent-ui-sdk / yarn add intent-ui-sdk
```

本地开发（npm 尚未发布时的接入方式）：

```jsonc
// package.json
"dependencies": {
  "intent-ui-sdk": "link:../path/to/intent-ui-sdk"
}
```

```ts
// vite.config.ts —— 用 link: 指向仓库外部目录时，需要放行该目录
export default defineConfig({
  server: { fs: { allow: ['.', '../path/to/intent-ui-sdk'] } },
});
```

---

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

> v0.4.0 起，重开面板时 SDK 也会自己检测页面是否变化并复位；宿主显式调用 `reset()` 仍然是更稳的做法（尤其是面板一直开着、只切菜单的场景）。

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
    return res.data;      // { code, data } 信封或 data 本体都行
  },
});
```

---

## 配置项（`IntentUI.configure` / 各 `mount*` 选项）

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
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

SDK 只依赖 5 个端点，任何后端按此实现即可对接：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `{prefix}/catalog?page=<page>` | 意图目录（含该页面的待办分组 / 推荐），不传 `page` = 全量 |
| `POST` | `{prefix}/execute` | 执行意图，返回结果信封 |
| `GET` | `{prefix}/history?limit=<n>` | 执行历史 |
| `GET` | `{prefix}/trace/<traceId>` | 单次执行的步骤/工具轨迹 |
| `POST` | `{prefix}/feedback` | 结果反馈（点赞/点踩 + 备注） |

响应信封兼容两种成功码：`code === 0`（SDK 参考宿主）与 `code === 200`（RuoYi-Vue-Plus 的 `R<T>`）。两种情况都取 `data`；没有 `code` 字段时把响应体本身当作数据。

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

`blocks[].kind` 支持 `text` / `kv` / `table` / `list` / `badges`；未知 `kind` 会被忽略而不是报错，便于后端先行扩展。

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

后端要把 SDK 作为静态资源对外提供（例如 Spring 的 `classpath:/intent-ui/**`），因此每个宿主目录里都会有一份**产物副本**。这些副本必须由脚本生成，**不要手工编辑**，否则多个宿主之间必然各自漂移：

```bash
node scripts/sync.mjs            # 同步到内置的默认宿主目录
node scripts/sync.mjs --check    # 只校验；有漂移则退出码 1（可放进 CI）
node scripts/sync.mjs <dir>...   # 同步到指定目录
```

同步范围只有 `package.json` + `js/*` + `css/*`。**`index.html` 与 `js/demo-app.js` 属于宿主自持**：调试台的 `apiPrefix`、演示数据、代理前缀各宿主不同，脚本不会覆盖它们。

---

## 调试台

`demo/index.html` 是一个零构建的调试台：把 SDK 目录作为静态资源发布（或直接用任意静态服务器托管本仓库），打开页面、把"接口前缀"改成宿主的意图前缀，即可在不写代码的情况下试意图目录、槽位表单、执行与轨迹。

---

## License

[Apache-2.0](./LICENSE)
