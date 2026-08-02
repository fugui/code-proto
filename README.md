# Code-Proto 接口文稿与 Webhook 事件服务

`code-proto` 是 CodeBench 微前端集成工作台下的**接口变更事件追踪**子系统。它作为一个独立的轻量微服务，专门用于接收来自华为 CodeArts 等代码托管平台的 Webhook 推送，自动解析合并请求（MR）中的代码变更，识别接口相关文件变动，并在前端界面中集中展示与追踪。

---

## 🧩 系统架构

```
华为 CodeArts / 代码托管平台
        │
        │ POST /api/webhook（免密）
        ▼
  code-proto 后端 (Gin)
        │
        ├── 解析 MR 变更，识别接口文件 (interface_files)
        ├── 持久化 MrEvent 至 PostgreSQL
        │
        └── 提供受保护 REST API 供前端查询
              │
              ▼
   前端 (React + Ant Design)
   在 /proto/* 路由下嵌入 code-bench 宿主
```

---

## ✨ 主要功能

*   **Webhook 接收与解析**：监听 `POST /api/webhook` 接口，解析华为 CodeArts 的 MR 事件 Payload，提取项目名称、源/目标分支、作者、MR 链接等关键信息并入库。
*   **接口文件自动识别**：自动分析 MR 变更的文件列表（`code_changes`），识别接口相关文件（如 `.proto`、`.yaml`、`.json`、`swagger`、`api`、`interface` 等关键词匹配），标记 `is_proto_change` 标志位并记录 `interface_files` 清单。
*   **MR 事件列表查询**：提供分页查询接口（`GET /api/mr`），支持按仓库名、作者过滤，供前端展示 MR 历史记录与接口变更详情。
*   **微前端嵌入**：前端以相对路径路由 `/proto/` 作为基准，通过 Module Federation 远程入口无缝嵌入 `code-bench` 宿主，共享 JWT 认证状态。

---

## 🛠️ 技术栈

*   **后端**：Go 1.25 + Gin + GORM + PostgreSQL
*   **前端**：React 18 + Vite 5 + TypeScript + Ant Design 5
*   **认证**：JWT 共享密钥，与 `code-bench` 单点登录体系打通

---

## ⚙️ 系统配置 (config.yaml)

复制模板文件并按需修改：
```bash
cp config.yaml.example config.yaml
```

关键配置项：
```yaml
server:
  port: ":8083"          # 服务监听端口（建议 :8083，避免与其他子服务冲突）
  gin_log: true

auth:
  jwt_secret: "YOUR_SHARED_JWT_SECRET_HERE"  # 必须与 code-bench 保持一致

database:
  host: "127.0.0.1"
  port: 5432
  user: "postgres"
  password: "YOUR_POSTGRES_PASSWORD"
  dbname: "code_shield"    # 与其他子系统共享同一数据库
  sslmode: "disable"
```

---

## 🚀 构建与运行

### 一键构建
```bash
# 安装前端依赖、构建前端静态资产，并编译 Go 后端为可执行文件
make build

# 启动服务（默认读取当前目录下的 config.yaml）
make run
# 或直接运行
./code-proto-server
```

### 开发模式调试
```bash
# 后端
go run main.go -config config.yaml

# 前端（另开终端）
cd frontend && npm install && npm run dev
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

在 `code-bench` 的 `config.yaml` 中，将 `proto` 指向当前服务地址：
```yaml
gateways:
  shield: "http://127.0.0.1:8080"
  pipeline: "http://127.0.0.1:8082"
  proto: "http://127.0.0.1:8083"   # code-proto 服务地址
  pdm: "http://127.0.0.1:8085"
```

在华为 CodeArts 代码仓库的「设置 → Webhook」中，填写 Webhook 地址：
```
http://<code-bench-host>/proto/api/webhook
```

---

## 🏷️ 版本历史

### v1.0.0 (2026-07-22)
*   **PostgreSQL 架构重构**：全面迁移至 PostgreSQL，清理 SQLite 依赖，提升生产稳定性。
*   **接口文件识别**：在 `MrEvent` 模型中引入 `interface_files` 字段，Webhook 接收时自动识别 MR 变更中的接口相关文件并呈现在界面。
*   **微前端样式隔离**：前端全量 CSS 限定在 `.proto-app` 容器作用域，接入 Portal CSS 变量继承全局主题，避免与宿主样式冲突。
*   **子应用路由修复**：将子应用嵌入模式路由改为相对路径，修复了子应用嵌入时重定向至根目录的问题。
*   **初始化建立**：创建 code-proto 子系统，实现接收华为 CodeArts Webhook 接口，建立 MR 事件记录与查询基础架构。
