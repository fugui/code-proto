# Code-Proto 接口文稿与 Webhook 事件服务 📡

`code-proto` 是 CodeBench 微前端集成工作台下的**接口变更事件追踪与代码仓 Webhook 消费**子系统。作为一个轻量级微服务，专门用于接收来自华为 CodeArts 等代码托管平台的 Webhook 推送，自动解析合并请求（MR）中的代码变更，精准识别接口相关文件变动，并在前端控制台中集中展示与追踪。

---

## 🧩 系统架构与数据流

```text
华为 CodeArts / Git 平台
        │
        │ POST /api/webhook（免密）
        ▼
  code-proto 后端 (Gin)
        │
        ├── 提取 MR 变动详情，智能识别接口文件 (interface_files)
        ├── 持久化 MrEvent 至 PostgreSQL (共享主库)
        │
        └── 提供受保护 REST API (接入 code-common 鉴权)
              │
              ▼
   前端 (React + Ant Design + @code/common)
   在 /proto/* 路由下通过模块联邦嵌入 code-bench 宿主
```

---

## ✨ 核心功能与特性

*   **Webhook 自动接收与解析**：监听 `POST /api/webhook` 接口，解析华为 CodeArts 的 MR 事件 Payload，提取仓库名、源/目标分支、作者、MR 链接等关键信息并持久化。
*   **接口文件智能识别**：自动分析 MR 变更文件列表（`code_changes`），通过关键词匹配（如 `.proto`、`.yaml`、`.json`、`swagger`、`api`、`interface` 等）精准识别接口文件，标记 `is_proto_change` 标志位并提取 `interface_files` 列表呈现于前端。
*   **MR 事件多维检索**：提供分页查询接口（`GET /api/mr`），支持按仓库名、作者进行过滤查询。
*   **全量接入 `code-common`**：
    - 后端下沉 `User`、`DatabaseConfig` 模型至 `code-common/backend`，统一使用标准 JWT 鉴权中间件。
    - 前端统一采用 `@code/common` 基础组件与样式规范。
*   **微前端菜单与样式隔离**：
    - 菜单配置重构为 `ModuleMenuConfig` 规范，与 `code-bench` 宿主无缝融合。
    - 前端所有 CSS 样式严格限定在 `.proto-app` 作用域内，继承 Portal 全局 CSS 变量。

---

## 🛠️ 技术栈

*   **后端**：Go 1.25+ Gin + GORM v2 + PostgreSQL (接入 `code-common/backend`)
*   **前端**：React 18 + Vite 5 + TypeScript + Ant Design 5 (接入 `@code/common`)
*   **架构**：Vite 模块联邦微前端 Remote 模式

---

## ⚙️ 系统配置 (config.yaml)

```yaml
server:
  port: ":8083"          # 服务监听端口
  gin_log: false

# ── 认证配置 (接入 code-common) ──
auth:
  jwt_secret: "YOUR_SHARED_JWT_SECRET_HERE"  # 必须与 code-bench 保持一致

# ── 数据库配置 (共享 PostgreSQL) ──
database:
  host: "127.0.0.1"
  port: 5432
  user: "postgres"
  password: "YOUR_POSTGRES_PASSWORD"
  dbname: "code_shield"    # 与其他子系统共享同一数据库
  sslmode: "disable"
```

---

## 🚀 快速开始

### 1. 一键全系统构建
```bash
# 安装前端依赖、打包静态资源，并编译 Go 后端二进制
make build
```

### 2. 运行服务
```bash
# 启动服务（默认读取当前目录下的 config.yaml）
make run
```
默认监听 `:8083` 端口。

### 3. 开发模式调试
*   **后端开发**：
    ```bash
    go run main.go -config config.yaml
    ```
*   **前端开发**：
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 📡 API 接口说明

| 方法 | 路径 | 认证 | 说明 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/webhook` | 无（免密） | 接收华为 CodeArts MR Webhook 推送 |
| `GET` | `/api/me` | JWT | 获取当前登录用户信息 |
| `GET` | `/api/mr` | JWT | 分页查询 MR 事件列表 |
| `GET` | `/api/mr/:id` | JWT | 查询单条 MR 事件详情 |

---

## 🔗 集成到 Code-Bench 网关

在 `code-bench` 的 `config.yaml` 中配置微服务代理：
```yaml
gateways:
  shield: "http://127.0.0.1:8080"
  pipeline: "http://127.0.0.1:8082"
  proto: "http://127.0.0.1:8083"   # code-proto 服务地址
  pdm: "http://127.0.0.1:8085"
```

在华为 CodeArts 代码仓库的「设置 → Webhook」中，配置 Webhook 推送地址：
```
http://<code-bench-host>/proto/api/webhook
```

---

## 🏷️ 版本历史

### v1.1.0 (2026-08-14)
*   **全量接入 `code-common`**：
    - 后端下沉 `User`、`DatabaseConfig` 模型至 `code-common/backend`，统一鉴权与响应。
    - 前端接入 `@code/common` 基础组件与样式规范。
*   **微前端菜单规范重构**：菜单配置重构为 `ModuleMenuConfig` 标准规范。
*   **PostgreSQL 架构重构与清理**：全面重构为 PostgreSQL 共享架构，彻底清理 SQLite 遗留代码。

### v1.0.0 (2026-07-22)
*   **接口文件自动识别**：在 `MrEvent` 模型中引入 `interface_files` 字段，Webhook 接收时自动分析并标记变更中的接口文件清单。
*   **微前端样式隔离**：前端全量 CSS 限定在 `.proto-app` 作用域，接入 Portal CSS 变量。
*   **子应用路由修复**：将嵌入模式路由调整为相对路径，修复重定向异常。
*   **初始化建立**：建立 code-proto 子系统，实现接收华为 CodeArts Webhook 接口及 MR 记录展示。
