# AI 智能客服系统

基于 Next.js 16 + Socket.IO + SQLite 的全栈 AI 客服系统，集成 AnythingLLM 实现智能对话，支持人工客服接入、会话管理、评分反馈等功能。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript 5 |
| 前端 | React 19 + Tailwind CSS v4 + shadcn/ui |
| 实时通信 | Socket.IO |
| 数据库 | SQLite (better-sqlite3) + Drizzle ORM |
| 认证 | JWT (jose) + bcryptjs |
| 定时任务 | node-cron |
| AI 接口 | AnythingLLM API |
| 包管理 | pnpm |

## 功能概览

### 客户端

- **悬浮气泡聊天** — 右下角浮动按钮，点击弹出聊天窗口，可跳转全屏页 (`/chat`)
- **实时消息** — 基于 Socket.IO 的 WebSocket 通信，消息即时送达
- **会话持久化** — 刷新页面或切换窗口后自动恢复聊天记录
- **AI 智能回复** — 接入 AnythingLLM，支持多轮对话和单轮查询模式
- **@人工 转接** — 输入 `@人工` 或 `@manual` 触发人工客服接入，带 `@` 自动补全提示
- **评分反馈** — 会话中最后一条消息超过 1 分钟无活动时，服务端通过 cron 推送评分弹窗（五星制）
- **会话自动结束** — 超过 30 分钟无活动的会话自动标记为已结束

### 管理后台 (`/admin`)

- **登录鉴权** — JWT 认证，默认账号 `admin` / `admin123`
- **仪表盘** — 会话数量统计概览
- **会话管理** — 实时更新的会话列表，支持筛选：
  - 全部 / AI 对话 / 等待人工 / 已接入 / 已结束
  - 接入等待中的对话并回复
  - 结束人工服务 / 结束会话
  - 单个删除或批量删除已结束的会话
- **数据分析** — 会话统计图表
- **系统设置** — 配置 AnythingLLM 连接参数
  - API 地址和密钥
  - 连接测试
  - 工作区拉取与选择
  - 知识库文档上传

### 服务端

- **自定义服务器** (`server.ts`) — Next.js + Socket.IO + cron
- **定时任务 (node-cron)**：
  - 每 5 分钟检查并自动结束超过 30 分钟无活动的会话
  - 每分钟检查活跃会话，最后消息超过 1 分钟未评分时推送评分弹窗
- **WebSocket 事件**：
  - `chat:send` / `chat:reply` — 客户消息收发
  - `chat:status` — 会话状态变更（结束等）
  - `chat:rating` — 评分弹窗推送
  - `admin:message` / `admin:conversation-update` — 管理端实时通知

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm

### 安装

```bash
# 克隆项目
git clone <repo-url>
cd AI-Customer-Service

# 安装依赖
pnpm install

# 初始化数据库（创建表 + 种子数据）
pnpm db:push
pnpm db:seed

# 启动开发服务器
pnpm dev
```

启动后访问：

- 客户端首页：http://localhost:3000
- 管理后台：http://localhost:3000/admin/login

### 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器（自定义 server.ts，含 Socket.IO） |
| `pnpm build` | 构建 Next.js 生产包 |
| `pnpm start` | 启动生产服务器 |
| `pnpm db:generate` | 生成 Drizzle 迁移文件 |
| `pnpm db:push` | 推送 schema 到数据库 |
| `pnpm db:seed` | 执行种子数据脚本 |
| `pnpm db:studio` | 启动 Drizzle Studio（可视化数据库管理） |

## 项目结构

```
├── server.ts                          # 自定义服务器（Next.js + Socket.IO + cron）
├── drizzle.config.ts                  # Drizzle ORM 配置
├── data/
│   └── customer-service.db            # SQLite 数据库文件
├── src/
│   ├── app/                           # Next.js App Router 页面
│   │   ├── layout.tsx                 # 根布局
│   │   ├── page.tsx                   # 首页（含悬浮聊天）
│   │   ├── chat/
│   │   │   └── page.tsx               # 全屏聊天页
│   │   ├── admin/
│   │   │   ├── layout.tsx             # 管理后台布局
│   │   │   ├── login/page.tsx         # 登录页
│   │   │   ├── page.tsx               # 仪表盘
│   │   │   ├── conversations/page.tsx # 会话管理
│   │   │   ├── analytics/page.tsx     # 数据分析
│   │   │   └── settings/page.tsx      # 系统设置
│   │   └── api/                       # API 路由
│   │       ├── auth/{login,logout,me}/
│   │       ├── chat/
│   │       ├── conversations/[id]/    # 含 agent-reply
│   │       ├── settings/
│   │       └── workspaces/[slug]/documents/
│   ├── components/                    # React 组件
│   │   ├── chat-window.tsx            # 全屏聊天界面
│   │   ├── floating-chat.tsx          # 悬浮气泡聊天
│   │   ├── client-floating-chat.tsx   # 客户端包装（SSR 安全）
│   │   ├── message-bubble.tsx         # 消息气泡
│   │   ├── mention-popup.tsx          # @提及自动补全
│   │   ├── rating-bubble.tsx          # 评分弹窗
│   │   ├── admin/                     # 管理后台组件
│   │   │   ├── sidebar.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── conversation-panel.tsx
│   │   │   ├── analytics.tsx
│   │   │   ├── settings-form.tsx
│   │   │   └── login-form.tsx
│   │   └── ui/                        # shadcn/ui 基础组件
│   ├── lib/                           # 工具库
│   │   ├── auth.ts                    # JWT 认证工具
│   │   ├── anythingllm.ts            # AnythingLLM API 封装
│   │   ├── chat-handler.ts            # 聊天逻辑（Socket.IO + REST 共用）
│   │   ├── socket-client.ts           # 客户端 Socket.IO 单例
│   │   ├── db/
│   │   │   ├── index.ts              # 数据库连接
│   │   │   ├── schema.ts             # Drizzle 表定义
│   │   │   └── seed.ts               # 种子数据
│   │   └── utils.ts                  # 通用工具函数
│   └── middleware.ts                  # Next.js 中间件（JWT 鉴权）
```

## 数据库设计

### admin_users — 管理员

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| username | TEXT UNIQUE | 用户名 |
| password_hash | TEXT | bcrypt 哈希密码 |
| created_at | INTEGER | 创建时间戳 |

### conversations — 会话

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| title | TEXT | 会话标题 |
| customer_name | TEXT | 客户名称 |
| status | TEXT | `active` / `closed` / `ended` |
| mode | TEXT | `ai` / `manual` |
| waiting_for_agent | BOOLEAN | 是否等待人工接入 |
| rating | INTEGER | 客户评分 (1-5)，NULL 为未评 |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 最后更新时间戳 |

### messages — 消息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| conversation_id | TEXT FK | 关联会话 |
| role | TEXT | `user` / `assistant` / `agent` / `system` |
| content | TEXT | 消息内容 |
| created_at | INTEGER | 创建时间戳 |

### settings — 系统配置

| 字段 | 类型 | 说明 |
|------|------|------|
| key | TEXT PK | 配置键 |
| value | TEXT | 配置值 |

## AnythingLLM 集成

本系统通过 AnythingLLM 的 REST API 实现 AI 对话功能：

1. 在管理后台「系统设置」中配置 API 地址和密钥
2. 拉取可用工作区并选择目标工作区
3. 上传知识库文档到工作区
4. 客户端聊天时自动调用 AnythingLLM 获取 AI 回复

支持的聊天模式：
- **chat（多轮对话）** — 保留上下文的连续对话
- **query（单轮查询）** — 基于知识库的单次查询

## 会话生命周期

```
创建会话 (active)
  ↓
用户发消息 → AI 自动回复 (mode: ai)
  ↓
用户输入 @人工 → 等待人工接入 (waitingForAgent: true)
  ↓
管理员接入 → 人工回复 (mode: manual)
  ↓
管理员结束人工服务 → 回到 AI 模式 (mode: ai)
  ↓
自动/手动结束会话 (status: ended)
  ↓
管理员删除会话
```

## License

MIT


