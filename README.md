# ThinkStack / 思栈

ThinkStack 是一个围绕“问题 → 外部观点 → 自己理解 → 认知演进”组织内容的个人技术思考工作台。

首版由两个相邻应用组成：

- `webapi/`：Koa 2 + Socket.IO，提供 JSON API。
- `webapp/`：React 18 + React Router + Webpack/Babel。

项目不依赖常规数据库。每个 Topic 及其外部解答、理解记录都保存在 `webapi/resources/topics/` 下的独立 JSON 文本文件中。

## 本地运行

需要 Node.js 20.10 或更新版本。在两个终端中分别运行：

```bash
cd webapi
npm install
npm run dev
```

```bash
cd webapp
npm install
npm run dev
```

打开 <http://127.0.0.1:3000/think-stack/>。开发服务器会把 `/think-stack/api/*` 和 `/think-stack/socket.io/*` 转发到 `http://127.0.0.1:3001`。

## 文本资源布局

```text
webapi/resources/topics/<topic-id>/
├── topic.json
├── external-answers/
│   └── <answer-id>.json
└── understandings/
    └── <understanding-id>.json
```

资源写入采用同目录临时文件加原子替换。`RESOURCES_DIR` 可在测试或部署时覆盖默认资源根目录；日常备份只需复制 `webapi/resources/`。

首版文件仓库采用单进程写入模型。请只运行一个指向同一 `RESOURCES_DIR` 的 Web API 进程；若未来需要多实例部署，应先增加共享文件锁或迁移到正式数据库。

## 首版 API

```text
GET    /health
GET    /topics?q=<keyword>
POST   /topics
GET    /topics/:topicId
PATCH  /topics/:topicId
DELETE /topics/:topicId

POST   /topics/:topicId/external-answers
PATCH  /topics/:topicId/external-answers/:answerId
DELETE /topics/:topicId/external-answers/:answerId

POST   /topics/:topicId/understandings
PATCH  /topics/:topicId/understandings/:understandingId
DELETE /topics/:topicId/understandings/:understandingId
```

浏览器只访问带 `baseHref` 的代理路径，Web API 本身不包含 `/think-stack/api` 前缀。

## 生产部署路径

生产网关需要复刻开发代理的四条规则：

```text
/think-stack/                     -> webapp/dist/index.html 与静态资源
/think-stack/api/<business-path>  -> webapi /<business-path>
/think-stack/socket.io/*          -> webapi /socket.io/*（启用 WebSocket upgrade）
/think-stack/<client-route>       -> /think-stack/index.html
```

API 与 Socket.IO 路径必须先于 SPA fallback 匹配；未知 API 应保留后端 JSON 404，不能被改写为 HTML。

## 验证

```bash
cd webapi && npm test
cd webapp && npm test && npm run build
```

## Next.js App Router

项目现在提供单体 Next.js 入口，根目录 `package.json` 使用 `next dev`、`next build` 和 `next start`。

```text
app/
├── layout.js                 根布局与 Providers
├── [[...slug]]/page.js       App Router 工作区入口（支持嵌套路由刷新）
├── not-found.js              Next 404
└── api/
    ├── health/route.js
    ├── categories/route.js
    ├── images/route.js
    └── topics/**/route.js    Route Handlers
lib/topic-store.js            服务端文件存储单例
next.config.mjs               basePath=/think-stack
```

新的启动方式：

```bash
npm install
npm run dev
```

访问 `http://127.0.0.1:3000/think-stack/`。`webapp/` 和 `webapi/` 目录保留为迁移期间的组件、存储和测试源，新的部署入口是根目录 Next 应用。Next Route Handlers 复用原有文件存储和业务方法，图片、分类、主题、外部解答及理解记录均走 `/think-stack/api/*`。

详细产品范围见 [ThinkStack 第一版项目功能说明.md](./ThinkStack%20%E7%AC%AC%E4%B8%80%E7%89%88%E9%A1%B9%E7%9B%AE%E5%8A%9F%E8%83%BD%E8%AF%B4%E6%98%8E.md)。

## Markdown 编辑与截图

所有原始问题、外部解答和理解记录共用 `webapp/src/components/MarkdownEditor.js`。
在正文中定位光标后使用 `⌘V` / `Ctrl+V` 粘贴剪贴板中的截图，或点击“插入图片”选择文件。
组件上传成功后在光标处插入图片 Markdown；有选中文字时替换选区。支持一次插入多张图片。
预览与详情页共用 `MarkdownContent`，保存后重新打开仍可查看图片。

支持 PNG、JPEG、WebP，单张上限 10 MB。上传期间正文只读、保存按钮禁用；失败保留原文并显示错误，可重新粘贴重试。离开编辑器会中止进行中的上传请求。

组件采用受控接口：

```jsx
<MarkdownEditor
  label="正文"
  value={content}
  onChange={setContent}
  onUploadStateChange={setUploading}
  disabled={saving}
/>
```

- `uploadImage(file, { signal }) => Promise<string>`：可注入其他上传服务，返回 HTTP(S) 或站点绝对路径的图片 URL；默认使用项目的图片 API。
- `onUploadStateChange(boolean)`：通知父表单上传状态，父表单应阻止上传期间提交。
- `maxLength`：正文长度限制，默认 500000。
- 保留 `id`、`label`、`error`、`helper`、`required`、`placeholder`、`minHeight`、`previewOnDemand` 和 `fillAvailable`。

新增图片 API：

```text
POST /images        原始二进制请求体，Content-Type 为 image/png、image/jpeg 或 image/webp
GET  /images/:name  返回图片字节（支持 HEAD）
```

上传返回 `{ data: { path, size, contentType } }`。前端为 `path` 加上统一的 `apiPrefix`，写入 Markdown 的地址例如 `/think-stack/api/images/<uuid>.png`。图片沿用 API 代理，无需额外静态资源路由。生产网关需要允许至少 10 MB 的上传请求体。

图片持久保存在 `RESOURCES_DIR/images/`，备份时与主题文件一起保留。图片使用独立 UUID 和原子写入；服务校验类型、文件签名及大小，不接受 SVG。当前不自动删除已上传图片，包括取消编辑后未引用的图片，以避免误删其他正文引用的资源。
