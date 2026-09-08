# ThinkStack / 思栈

## 1. 项目名称

中文名称：**思栈**

英文名称：**ThinkStack**

项目名称：**ThinkStack**

项目根目录：

`think-stack`

ThinkStack 是一个面向个人使用的技术思考与知识沉淀 Web 应用。

它并不是传统意义上的博客、Markdown 笔记或者知识库，而是围绕“问题”组织个人长期的技术思考过程。

系统需要记录一个技术问题从最初提出，到查阅外部答案，再到形成自己的理解，以及之后不断补充和修正理解的完整过程。

核心思想为：

问题 → 外部观点 → 自己理解 → 持续补充 → 认知演进

---

# 2. 项目目标

开发者在日常学习、工作和技术研究过程中，经常会产生大量问题。

例如：

主题：

“MCP 与 API 网关区别”

问题内容：

“我无法理解 MCP 的定位和标准 API 调用网关的差别边界。如果 MCP 是为了标准化一个工具体提供的所有能力输出，拿为所有 API 接口构造一个统一的调用网关或中间层，然后提供标准的能力描述提示词，貌似也能达到这个效果。”

这个问题提出以后，用户可能分别向：

- ChatGPT
- DeepSeek
- Claude
- Gemini
- 搜索引擎
- 技术文章
- 技术社区

查询相关资料。

用户希望把这些外部答案保存到当前问题下面。

之后用户根据这些资料形成自己的理解，例如：

“经过比较以后，我目前认为 MCP 和 API Gateway 最大的区别并不是有没有统一调用入口，而是服务对象不同……”

随着后续学习，用户可能再次对这个问题产生新的认识，因此需要继续追加新的理解。

ThinkStack 的目标就是保存整个过程。

---

# 3. 核心数据结构思想

整个系统最重要的一级对象为：

Topic

即“思考主题”。

例如：

MCP 与 API 网关区别

一个 Topic 下面至少包含三类信息：

1. Question
2. External Answer
3. Understanding

整体结构：

Topic

├── Question

├── External Answer 1

├── External Answer 2

├── External Answer 3

├── Understanding 1

├── Understanding 2

└── Understanding N

其中：

External Answer 数量不限。

Understanding 数量不限。

后续可以不断向已有 Topic 中追加新的内容。

---

# 4. Topic

Topic 表示一个技术思考主题。

例如：

- MCP 与 API 网关区别
- Promise.all 为什么会快速失败
- B+ 树为什么适合数据库索引
- React Concurrent Rendering 到底解决什么问题
- HTTP/2 为什么能够解决 HTTP/1.1 的连接限制
- RAG 和 Fine-tuning 的边界是什么

Topic 至少包含：

- 标题
- 原始问题内容
- 创建时间
- 更新时间

后续可以扩展：

- 标签
- 分类
- 当前理解状态
- 是否收藏
- 是否归档

第一版本可以优先实现标题和问题正文。

---

# 5. 原始问题 Question

创建 Topic 时必须允许用户输入：

主题标题

以及：

问题正文。

标题一般是一句话。

例如：

MCP 与 API 网关区别

问题正文则记录用户当时真正产生疑问的上下文。

问题正文允许较长文本。

必须支持多段文字。

建议支持 Markdown。

例如：

我无法理解 MCP 的定位和标准 API 调用网关的差别边界。

如果 MCP 是为了标准化一个工具体提供的所有能力输出，那么为所有 API 接口构造一个统一调用网关或中间层，然后提供标准能力描述，貌似也能达到类似效果。

那么 MCP 真正解决的问题究竟是什么？

---

# 6. External Answer 外部解答

Topic 创建以后，用户可以追加任意数量的“外部解答”。

外部解答主要用于保存：

- ChatGPT 回答
- DeepSeek 回答
- Claude 回答
- Gemini 回答
- 搜索得到的资料
- 技术文章观点
- Stack Overflow 回答
- GitHub Discussion
- 其他资料

每一条 External Answer 必须作为独立数据存在。

不要把所有外部回答保存到 Topic 的一个大字段中。

每条 External Answer 至少包含：

- 所属 Topic
- 来源
- 内容
- 创建时间
- 更新时间

来源可以是：

ChatGPT

DeepSeek

Claude

Gemini

Article

Other

同时允许用户自己填写来源名称。

外部解答正文必须允许长文本，并支持 Markdown。

一个 Topic 可以拥有：

0 ～ N 条 External Answer。

例如：

MCP 与 API 网关区别

External Answer #1

来源：ChatGPT

内容：
……

External Answer #2

来源：DeepSeek

内容：
……

External Answer #3

来源：Claude

内容：
……

---

# 7. Understanding 我的理解

Understanding 用于记录用户自己对这个问题的阶段性理解。

这是 ThinkStack 最重要的数据之一。

一个 Topic 可以拥有任意数量的 Understanding。

不要设计成 Topic 中只有一个：

myUnderstanding

字段。

因为用户对技术问题的理解会随着时间变化。

例如第一次理解：

2026-08-29

“目前我认为 MCP 和 API Gateway 的区别主要在于……”

几个月以后可能追加：

2026-11-10

“之前的理解并不完整。最近实际写 MCP Server 后发现……”

因此 Understanding 本质上应该形成：

个人认知演进记录。

每一条 Understanding 至少包含：

- 所属 Topic
- 内容
- 创建时间
- 更新时间

正文支持 Markdown。

允许：

0 ～ N 条 Understanding。

历史 Understanding 默认保留。

新理解应该采用“追加”的方式，而不是直接覆盖旧理解。

---

# 8. Topic 详情页面

Topic Detail 是整个网站最核心的页面。

推荐页面信息顺序：

Topic Title

↓

Question

↓

External Answers

↓

My Understandings

↓

追加内容操作

例如：

MCP 与 API 网关区别

问题

我无法理解 MCP 的定位……

--------------------------------

外部解答

ChatGPT
2026-08-29

……

--------------------------------

DeepSeek
2026-08-29

……

--------------------------------

我的理解

2026-08-29

……

--------------------------------

我的理解

2026-09-12

……

--------------------------------

+ 添加外部解答

+ 添加我的理解

页面应该让用户非常容易看出：

“我当时为什么产生这个问题”

“外界有哪些解释”

“我是怎么理解的”

“我的理解后来发生了什么变化”

---

# 9. Topic 列表

首页主要展示 Topic 列表。

每个 Topic 建议展示：

- Topic 标题
- 问题摘要
- 创建日期
- 更新时间
- External Answer 数量
- Understanding 数量

例如：

MCP 与 API 网关区别

我无法理解 MCP 的定位和标准 API 调用网关……

3 个外部解答 · 2 条我的理解

2026-08-29

点击进入 Topic Detail。

---

# 10. 新建 Topic

提供明显的：

“新建思考”

或者：

“New Topic”

入口。

创建页面第一版本只需要：

标题

问题正文

创建按钮

即可。

Topic 创建完成以后自动进入 Topic Detail。

然后再逐渐追加：

External Answer

以及：

Understanding。

---

# 11. 内容编辑

第一版至少支持：

Topic 修改

External Answer 修改

Understanding 修改

External Answer 删除

Understanding 删除

Topic 删除

删除操作需要二次确认。

修改 Understanding 时必须注意：

普通的文字错误允许直接修改。

但用户产生新的理解时，应引导用户使用：

“添加新的理解”

而不是覆盖历史 Understanding。

---

# 12. Markdown

Question、External Answer、Understanding 都需要支持较长技术文本。

因为内容中大量包含：

代码

SQL

JSON

Shell

Markdown

表格

列表

链接

因此编辑器和展示组件应该支持 Markdown。

第一阶段无需构建复杂的 Notion 类型编辑器。

优先选择：

Markdown Textarea + Markdown Preview

或者轻量 Markdown Editor。

必须正确展示代码块。

---

# 13. 搜索

第一版本提供基础搜索功能。

至少可以根据：

Topic 标题

Question 内容

进行关键词搜索。

后续可以扩展搜索：

External Answer

Understanding

Tag

全文搜索。

---

# 14. Tag

建议数据库结构从第一版就考虑 Tag，但 UI 可以作为第二阶段功能。

例如：

MCP 与 API 网关区别

Tags：

MCP

AI Agent

Backend

Architecture

后续可以通过标签快速查看同类技术思考。

---

# 15. 时间属性

ThinkStack 一个非常重要的概念是：

“思考随着时间演进”。

因此所有核心内容都必须保存时间。

Topic：

createdAt

updatedAt

External Answer：

createdAt

updatedAt

Understanding：

createdAt

updatedAt

UI 中应该适当展示日期。

特别是 Understanding，应明显显示创建时间，从而形成理解时间线。

---

# 16. 第一版暂不实现

为了避免第一版本范围过大，暂时不要实现：

AI 自动回答

OpenAI API

DeepSeek API

Claude API

自动抓取 ChatGPT 对话

浏览器插件

向量数据库

Embedding

RAG

知识图谱

多人协作

评论系统

公开博客

社交功能

复杂权限管理

第一阶段全部采用：

用户手动复制外部答案 → ThinkStack → 保存

的方式。

首先把最核心的个人知识记录流程做好。

---

# 17. 第一版核心操作链路

完整用户流程应该是：

产生一个技术问题

↓

打开 ThinkStack

↓

点击“新建思考”

↓

输入 Topic

↓

输入 Question

↓

保存

↓

进入 Topic Detail

↓

向 ChatGPT 提问

↓

复制 ChatGPT 回答

↓

ThinkStack

↓

添加 External Answer

↓

来源选择 ChatGPT

↓

粘贴回答

↓

保存

↓

向 DeepSeek 提问

↓

复制回答

↓

再次添加 External Answer

↓

阅读多个答案

↓

形成自己的理解

↓

点击“添加我的理解”

↓

记录当前理解

↓

保存

↓

未来再次学习这个问题

↓

回到原 Topic

↓

继续追加新的 External Answer

或者新的 Understanding

最终形成长期的技术思考历史。

---

# 18. 产品设计原则

ThinkStack 不应该设计成传统博客。

不要强调：

文章发布

文章阅读量

文章封面

作者信息

评论

点赞

社交分享

它应该更接近：

个人技术研究工作台。

核心关注：

问题

资料

思考

理解

时间

内容密度可以略高于普通内容网站。

整体视觉建议：

简洁

克制

开发者工具风格

轻量

高信息密度

突出正文阅读体验

支持 Light / Dark Mode。

---

# 19. 第一阶段页面

第一版本优先完成以下页面：

Home / Topic List

Topic Detail

Create Topic

Edit Topic

Settings 可以暂时不做。

External Answer 和 Understanding 的创建可以优先采用：

Dialog

Drawer

或者 Topic Detail 内联编辑。

不需要单独制作很多页面。

---

# 20. 第一阶段成功标准

第一版本完成以后，必须能够完整执行以下场景：

用户产生：

“MCP 与 API 网关区别”

↓

在 ThinkStack 创建 Topic

↓

保存问题正文

↓

追加一条 ChatGPT 回答

↓

追加一条 DeepSeek 回答

↓

追加自己的第一版理解

↓

几天以后再次打开这个 Topic

↓

继续追加新的外部回答

↓

继续追加新的理解

↓

过去的所有内容仍然完整保留。

只要这一条核心流程稳定可用，就认为 ThinkStack V1 的主要目标完成。