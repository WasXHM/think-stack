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

详细产品范围见 [ThinkStack 第一版项目功能说明.md](./ThinkStack%20%E7%AC%AC%E4%B8%80%E7%89%88%E9%A1%B9%E7%9B%AE%E5%8A%9F%E8%83%BD%E8%AF%B4%E6%98%8E.md)。
