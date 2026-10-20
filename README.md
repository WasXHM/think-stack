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

外部解答和我的理解的创建窗口会把草稿自动保存到当前浏览器 Tab 的 `sessionStorage`，仅用于刷新页面时恢复编辑内容。索引包含主题 ID 与记录类型，因此两个入口互不覆盖；刷新页面或重新打开窗口会恢复草稿，成功提交、点击取消、关闭窗口或按 Escape 放弃编辑时自动清除。草稿不会写入服务端，也不会在不同 Tab 之间共享。

## SSH 一键部署（Next.js）

默认部署到服务器 `101.37.105.190` 的 `/mnt/apps/think-stack`，访问地址为：

**http://101.37.105.190/think-stack/**

服务器要求：Linux + systemd，已安装 Node.js 20+、npm、Nginx、curl、util-linux（flock/runuser），以及可用的 root 或 sudo 管理账号。支持系统级安装及 nvm 安装（包括 `/root/.nvm`）；脚本会将 nvm 的 Node.js/npm 复制到项目的 `runtimes/<release-id>/`，由 root 持有、服务账号只读执行。服务器需要能访问 npm registry，安全组及防火墙需放行 SSH 端口和 TCP 80。

在本项目根目录执行：

```bash
npm run deploy

# SSH 登录用户不是 root，或使用其他 SSH 端口时：
SSH_USER=ubuntu SSH_PORT=22 npm run deploy
```

按终端提示输入 SSH 密码；非 root 用户还可能需要输入 sudo 密码。脚本复用 SSH 连接，不保存密码，也不会跳过主机指纹校验。可通过 `SSH_HOST` 覆盖目标服务器。

部署脚本会上传源码，在服务器执行 `npm ci` 和 `npm run build`，创建单进程 `think-stack.service`，监听 `127.0.0.1:3100`，并配置 Nginx 在 80 端口保留 `/think-stack` 前缀转发请求。无需另行启动旧的 Koa 或 Webpack 服务。`basePath` 沿用代码中的固定 `/think-stack`，修改它时需同步调整前端配置与部署脚本。

```text
/mnt/apps/think-stack/
├── current -> releases/<release-id>
├── releases/<release-id>/       每次部署的代码和构建产物
├── runtimes/<release-id>/       nvm 运行时副本（按需创建）
└── shared/resources/            持久数据：主题、分类、图片
```

部署不会上传本地 `webapi/resources`、`.env*`、`node_modules`，首次部署使用空数据目录。若需迁移本地数据，应在停止线上服务后单独复制到 `shared/resources/`，并确保归属为 `think-stack:think-stack`；日常备份也只需备份此目录。历史版本保留供排查，暂不自动清理。

构建成功后才切换版本；切换后执行应用和 Nginx 健康检查，失败会尝试恢复上一代码版本。更新会有短暂服务重启，回滚不会回退数据。脚本管理 `/etc/systemd/system/think-stack.service` 和 `/etc/nginx/conf.d/think-stack.conf`。若已有 Nginx 站点使用相同 IP 的 `server_name`，脚本会停止，需先合并站点配置，避免冲突。

部署时会显式向 `think-stack` 服务账号传递 Node.js/npm 路径，避免 `runuser` 重置 PATH 导致 `npm: command not found`。构建前会检查该账号能否执行这两个程序；nvm 安装会使用项目内的独立副本，不依赖服务账号访问 `/root`；其他安装方式仍需确保服务账号有执行权限。运行时副本随历史版本保留，暂不自动清理。

服务器排查命令：

```bash
sudo systemctl status think-stack
sudo journalctl -u think-stack -n 100 --no-pager
sudo nginx -t
curl -f http://127.0.0.1:3100/think-stack/api/health
```

当前应用没有登录鉴权；开放公网访问后，能访问此地址的人也能读写项目数据。

### 一次性导入本地数据

先暂停本地应用的数据编辑，确保 `webapi/resources/` 是完整快照，然后执行：

```bash
npm run deploy             # 先部署统一资源目录的图片 API 修复
npm run import:resources   # 按提示输入 SSH 密码，只需执行一次
```

导入目标固定为 `101.37.105.190:/mnt/apps/think-stack/shared/resources`；SSH 账号、端口和主机参数与 deploy 相同。服务器需有 Python 3，用于校验归档路径和 JSON。导入会短暂停止服务，**以本地快照整体替换远程 resources，不进行合并**；原远程目录完整保留在 `/mnt/apps/think-stack/backups/resources-before-<id>/`。服务健康检查失败时会尝试恢复原目录。

成功后写入 `shared/.resources-imported` 标记，后续重复执行会拒绝覆盖。导入命令独立于 deploy，部署不会调用它。之后只在远程维护主题、分类和图片。

后续 `npm run deploy` 始终排除本地 `webapi/resources`，运行时通过 `RESOURCES_DIR` 指向固定的 `shared/resources`；主题与图片使用同一个目录。发布及代码回滚不复制、清空或替换已有资源文件。

### 登录与只读权限

页面无需登录即可查看全部主题、外部解答、理解记录和图片。右上角「登录」打开用户名和密码弹窗；初始账号为 `admin`，密码使用本次指定的管理员密码，不提供注册功能。登录后显示新增、编辑、删除、分类创建和图片上传入口；退出或会话失效后恢复只读。直接访问新增或编辑地址会显示登录提示。

Next.js 和 Koa 两套 API 均在服务端校验所有写请求，未登录返回 `401`。登录使用 HttpOnly、SameSite=Strict Cookie，会话有效期为 7 天；退出会删除服务端会话。写请求还需携带 `X-ThinkStack-Request: 1`（共享前端 HTTP 客户端已自动添加）。

首次启动或登录时，自动在当前 `RESOURCES_DIR` 下初始化 `auth/users.json`，仅保存用户名、随机盐和 scrypt 密码哈希；会话存入 `auth/sessions/*.json`，文件名为令牌哈希。重启保留登录状态，初始化不会覆盖已有用户文件。默认目录为 `webapi/resources/auth/`，已排除在 Git 之外；部署时保留这一数据目录。不要将 resources 目录整体作为静态文件目录对外公开。

### 中英文界面与文章版本

右上角语言选择器支持中文和 English，选择保存在当前浏览器。界面映射资源位于 `webapp/src/i18n/zh.js` 和 `en.js`；`t()` 支持带命名参数的文案。分类名称是用户数据，共用一套名称及顺序；只有系统「默认分类」会显示为 Default。不会自动翻译已有文章或分类名称。

文章按主题、外部解答、理解记录分别读取语言版本：英文模式优先英文，缺失时回退到对应中文内容；中文模式优先中文。英文模式新建但尚无中文的内容，在中文模式也会显示已有英文，以免内容消失。

```text
resources/topics/<topicId>/
  topic.json                             # 共享元数据及原有中文 title/question
  topic.en.json                          # 英文 title/question
  external-answers/<answerId>.json        # 共享元数据及中文 source/content
  external-answers/<answerId>.en.json     # 英文 source/content
  understandings/<understandingId>.json   # 共享元数据及中文 content
  understandings/<understandingId>.en.json # 英文 content
```

英文资源是只包含正文相关字段的 JSON。例如 `topic.en.json`：

```json
{ "title": "English title", "question": "English Markdown content" }
```

英文新建记录的基础 `.json` 仅保存 ID、关联关系和时间等元数据，正文只写入 `.en.json`，不生成伪中文。后续在中文模式编辑时才保存中文正文。英文编辑不会覆盖原有中文正文，反之亦然。英文文件不存在时，浏览和修改分类都不会主动生成英文文章文件。可手工维护 `.en.json`；未提供的字段会回退到中文字段。

前端请求自动携带 `lang=zh|en` 和 `X-ThinkStack-Language`；两套 API 均按请求独立处理语言，不使用跨请求的全局语言状态。列表、搜索和详情均按所选语言读取。分类归属、排序、记录 ID 和时间是共享元数据。删除主题或记录会删除所有语言版本；删除分类仍将主题的所有语言版本转移到默认分类。

编辑器显示当前保存语言。切换语言前会提示放弃尚未保存的表单，保存或上传期间禁用切换。外部解答和理解记录的临时草稿按语言隔离。

验证命令：`npm test`、`npm run build`、`node scripts/auth-next-smoke.mjs`。最后一个命令使用隔离的临时 Next.js 服务，验证真实 HTTP 登录和中英文读写，不修改当前文章资源。
