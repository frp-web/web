# FRP Web AI 开发指引

本文件面向 AI 助手或自动化代理，阐述 FRP 领域背景、`frp-bridge` 工具集以及当前 Nuxt Web 管理端的项目约束，确保在实现需求时始终与业务目标一致。

## 1. FRP 领域速览

### 1.1 FRP 是什么
- **FRP (Fast Reverse Proxy)** 由 fatedier 开源，提供反向代理与内网穿透能力。
- 典型拓扑包含 `frps`（服务端）与 `frpc`（客户端）。客户端把本地端口映射为公网服务，服务端负责会话复用、身份认证与流量转发。
- 支持多种代理类型：`tcp` / `udp` / `http(s)` / `stcp` / `xtcp` / `tcpmux` / `sudp` 等，并内置 Visitor 概念实现受控访问。

### 1.2 核心配置要点（摘自 `frp-bridge` 的类型整理）
- **通用配置**：`LogConfig`（等级、输出位置）、`WebServerConfig`（Dashboard/Prometheus）、`TLSConfig`、`QUICOptions`、`PortsRange`、`HTTPHeader`、`ValueSource` 等。
- **服务端配置**：`ServerConfig` 支持 token/OIDC 鉴权、HTTP 插件、端口白名单、Prometheus、日志和传输层（kcp/quic/ws）调优。
- **客户端配置**：`ClientConfig` 承载 `serverAddr/serverPort`、token/OIDC、`transport`、`webServer`、`virtualNet`、`featureGates`、`udpPacketSize`、`metadatas`、`includes` 等，同时管理代理/Visitor 组合。
- **代理/Visitor**：通过 `ProxyConfig`（TCP/UDP/HTTP/HTTPS/TCPMUX/STCP/XTCP/SUDP）与 `VisitorConfig`（STCP/XTCP/SUDP）描述流量类型、凭据、域名、回落策略。

理解这些实体有助于在 UI 中准确建模节点、隧道、鉴权、网络策略等表单。

## 2. `frp-bridge` 库概览（参考 `packages-overview.md`）

| 包 | 职责摘要 |
| --- | --- |
| **`@frp-bridge/core`** | 提供 `FrpBridge` 类：下载/更新 FRP 可执行文件、读取/合并配置、启动/停止进程、节点与隧道（Proxy）增删改查、备份恢复。封装所有文件与子进程操作。 |
| **`frpx` CLI** | 基于 `cac` 暴露 download/start/stop/backup 等子命令，是 `FrpBridge` 的命令行入口，可用于调试或与后端运维脚本集成。 |
| **`frp-bridge`（聚合包）** | 对外统一导出 `FrpBridge` 与类型，屏蔽内部包结构。推荐应用依赖它而非单独拼装多个子包。 |
| **`@frp-bridge/types`** | 汇集 `client.ts`、`server.ts`、`common.ts`、`proxy.ts` 中的 TS 类型，完全对应 FRP 官方配置文档，方便静态校验。 |
| **`@frp-bridge/shared`** | 存放 CLI/核心共用的 loading、日志等小工具。 |

`FrpBridge` 关键 API（供服务端封装或未来 server routes 调用）：
- `downloadFrpBinary` / `updateFrpBinary`：确保指定版本/平台的二进制存在。
- `start(options)` / `stop()` / `isRunning()`：管理 frpc/frps 生命周期。
- `getConfig()` / `updateConfig(partial)` / `backupConfig()`：读取、增量写入、备份 TOML/INI 配置。
- `addNode/updateNode/removeNode`、`addTunnel/updateTunnel/removeTunnel`：以“节点 + 隧道”抽象组织配置，便于 UI 管理。

## 3. 当前 `frp-web` 项目概况

### 3.1 技术栈
- **Nuxt 4.2 / Vue 3.5 / Vite 7**：使用最新目录结构（`app/` 根目录）。
- **UI 组件**：`ant-design-vue@4`（通过 `unplugin-vue-components` 自动引入 + less 主题配置）。
- **状态与工具**：`pinia@3`、`@vueuse/nuxt`。
- **样式系统**：`@unocss/nuxt` + `uno.config.ts` 自定义断点/shortcuts，Icon 走 `presetIcons` + `cdn: https://esm.sh/`，无需本地 `@iconify/json`。
- **主题/暗色**：`@nuxtjs/color-mode`，默认 Light。

### 3.2 目录速览
```
app/
  app.vue            # 根组件，挂载 Ant ConfigProvider + NuxtLayout
  layouts/           # default/header/footer/main/sider 组成多区域布局
  pages/             # 页面路由（当前 demo 为 index）
  components/        # UI 片段（如 layouts/header）
  utils/             # 复用工具（如 ColorMode 枚举）
  stores/            # Pinia store（config 等）
public/              # 静态资源
server/              # Nuxt server routes（可用于封装 frp-bridge）
src/
  storages/          # 文件型配置（AppStorage、FrpPackageStorage 等）
uno.config.ts        # UnoCSS 配置
nuxt.config.ts       # 模块、Vite 插件、head、imports 等
```
- 所有新代码必须放在 `app/` 命名空间下，以匹配 Nuxt 4 自动导入、文件路由与布局机制。
- 组件/模块默认 TypeScript，遵守 `.github/copilot/development-guidelines.md`（性能优先、注释最少但必要、保持类型安全）。

### 3.3 UI 目标
- 构建一个 **FRP 管理后台**：可视化管理服务端节点、客户端代理、实时状态、日志与配置。
- 布局：头部容纳导航/品牌，侧边栏列出功能区（节点、隧道、监控、设置等），主区域显示数据卡片/表格/表单。
- 交互：大量使用 Ant Design Vue 组件（Table/Form/Drawer/Result）+ UnoCSS 原子类。

### 3.4 当前进展（2025-11-16）
- `/config` 页面已上线：页头+三段 Tabs，`FrpEditor` 基于 Monaco 编辑 FRP 文本。
- `useConfigStore` 管理 FRP 文本、主题、FRP 包信息、帐号占位数据；所有 tab 共享该 store。
- 服务端暴露 `/api/config/frp`（GET/PUT）、`/api/config/app`（GET/PUT）与 `/api/config/frp-version`（POST）；均通过 `useFrpBridge` 与本地 `appStorage`/`frpPackageStorage` 协调数据。
- `src/storages` 提供 `BaseStorage` + `useStorage`，将主题、FRP 包元数据等落盘到 `.frp-web/storages`，接口层直接读写。
- 待办集中在常规设置拓展、帐号持久化与更多通知/验证流程。

## 4. AI 开发工作流建议

### 4.1 环境准备
```powershell
# 推荐 Node 20 LTS（Nuxt 官方要求），使用 pnpm 9+ 即可
pnpm install
pnpm lint
pnpm dev -- --host
```
- 构建前若需要静态部署，运行 `pnpm build && pnpm preview`。
- Docker 启动脚本：`pnpm start-docker`（依赖 `NUXT_PORT` 环境变量）。

### 4.2 与 `frp-bridge` 集成思路
1. **Server API 层**：在 `server/api/*.ts` 中引入 `FrpBridge`。
   - 统一初始化 `FrpBridge({ mode: 'server' | 'client' })`，存储于模块级单例，避免重复下载二进制。
   - 提供 REST/RPC 端点包装 `download`, `start`, `stop`, `getConfig`, `updateConfig`, `addTunnel` 等方法。
2. **状态管理**：在 `app/stores`（需要新建 `app/stores` 目录）创建 Pinia store，例如 `useNodeStore`、`useTunnelStore`，通过 `$fetch` 调用上述 API。
3. **配置编辑**：将 `@frp-bridge/types` 引入前端，利用类型定义生成动态表单（字段、校验、默认值来自 types 描述）。
4. **实时状态**：可通过 `server/api/events` + `EventSource`/`WebSocket` 推送 `FrpBridge` 监控信息，或定时轮询 `isRunning()`、日志输出。
5. **安全性**：Server 侧需校验输入（白名单 field），避免生成无效 FRP 配置；向前端暴露的错误信息要经过格式化，防止泄露服务器路径。

### 4.3 UI 开发规范
- **布局组件复用**：`app/layouts/*.vue` 包含顶部/侧边/内容槽位，新增页面应尽量通过 slot 插入，而非复制结构。
- **样式约定**：优先用 UnoCSS 原子类 + shortcuts；仅在必要时编写 SCSS；配合 Ant Design 的 token 自定义品牌色。
- **异步调用**：统一封装在 `app/composables/`（例如 `useFrpBridge()`）中，处理 loading/error/toast，页面仅关注数据展示。
- **国际化**：当前项目为中文语境，保持 copywriting 一致；若需多语言，可引入 Nuxt i18n 模块。

### 4.4 常见任务清单
| 任务 | 关键文件/目录 | 注意事项 |
| --- | --- | --- |
| 新增 FRP 节点管理页 | `app/pages/nodes.vue`, `app/stores/nodes.ts`, `server/api/nodes/*.ts` | 使用 `FrpBridge.addNode/updateNode/removeNode`；表单字段基于 `ServerConfig`/`ClientConfig`。 |
| 隧道（Proxy）列表 | `app/pages/tunnels.vue` | 支持多类型代理，前端字段可引用 `@frp-bridge/types` 的 discriminated union 渲染。 |
| 配置备份/恢复 | `server/api/config/backup.ts`, `app/components/config/BackupDrawer.vue` | 调用 `FrpBridge.backupConfig()` 并提供下载链接；恢复时谨慎覆盖。 |
| 运行状态监控 | `app/components/dashboard/StatusCards.vue` | 展示 `isRunning`、当前版本、活跃代理数、Prometheus URL 等。 |

## 5. 约束与最佳实践
- **性能与安全**：所有后端交互都在服务端 `server/` 目录内完成，前端只通过 `$fetch`。不要在浏览器中直接操作文件系统或执行 CLI。
- **类型完整性**：坚持引用 `@frp-bridge/types` 中的接口，禁止手写“any”结构；组合字段时保持 discriminated union 的 `type` 字段准确无误。
- **注释策略**：仅对复杂算法、非直观逻辑添加短注释；其余通过语义化命名表达。
- **依赖管理**：使用 `pnpm`；如需新增包，评估与 Nuxt 4 的兼容性以及打包体积。保持 `pnpm-lock.yaml` 同步。
- **文档更新**：若添加新模块（例如 `alerts`, `audits`），同时更新此 AI 指南，确保后续代理具备最新背景。

## 6. 功能规划
以下功能是当前阶段需要逐步实现的重点，均需基于现有 Nuxt 4 + Ant Design Vue + Pinia 技术栈落地。

### 6.1 用户引导（Onboarding）
- **FRP 下载/更新**：提供界面驱动的版本选择与下载流程，调用 `FrpBridge.downloadFrpBinary`/`updateFrpBinary` 并缓存至服务器，可在首次启动和后续升级中复用。
- **端类型选择**：初始化引导中让用户指定运行模式（client/server），写入 `FrpBridge` 实例的默认配置，确保后续 API 调用指向正确的配置集合。
- **基础配置**：引导页需覆盖访问账号、FRP API 开启、服务端监听端口、客户端 serverAddr/serverPort 等关键字段，依据 `@frp-bridge/types` 构建必填项校验。

### 6.2 节点管理
- **节点列表**：页面需展示节点名称、类型、端口、连接数、上下行流量、版本号、连接状态等字段；数据由 server routes 聚合 `FrpBridge` 与 FRP API 统计所得。
- **节点增删改**：提供 Drawer/Form 组合，支持添加、编辑、删除节点；操作后调用 `addNode/updateNode/removeNode` 并触发配置刷新，确保残留配置被清理。
- **批量/SLA**：为后期扩展预留批量禁用、状态批量刷新接口，以便履行“安全隐患节点快速下线”的需求。

### 6.3 隧道（Proxy）管理
- **创建与模板**：根据代理类型（TCP/UDP/HTTP/HTTPS/STCP/XTCP/TCPMUX/SUDP）动态渲染字段，提供常用端口预设（22/80/443 等）以减少表单输入。
- **查询与统计**：支持按名称、状态、所属节点等条件过滤；仪表卡片展示流量、连接数、近期失败次数，必要时接入可选的图表库（如 `@antv/g2`）。
- **修改与删除**：与节点操作相同，保证 `FrpBridge` 配置与 UI 状态一致，并在删除时同步清理 Visitor/Proxy 配置段。

### 6.4 日志与监控
- **操作/系统日志**：落盘并展示用户操作、FRP 事件、异常信息，可结合 `FrpBridge` 日志输出或 `execa` stdout/stderr，同时提供下载能力。
- **实时监控**：信息看板需显示节点流量、隧道连接数趋势等指标；在 Ant Design 体系内可使用 `Statistic`, `Card`, `Progress` 等控件，与后台轮询或 SSE 数据源联动。

### 6.5 配置与容错
- **配置表单**：分别提供服务器与客户端基础配置表（`bindAddr`, `webServer.port`, `serverAddr`, `serverPort` 等），字段说明与是否必填来自类型定义。
- **备份与轮换**：每次 `updateConfig` 后自动触发 `backupConfig`，实现最大备份数限制与按时间淘汰旧备份；前端需暴露备份列表与一键恢复操作。
- **自动回滚**：当检测到 FRP 进程异常退出并且重启达到阈值时，调用最近可用备份进行回滚，并在 UI 中提示失败配置，指导用户修复。

### 6.6 进程与接口控制
- **进程管理**：统一通过 `FrpBridge.start/stop/isRunning` 管理子进程，内部默认使用 `execa` 以获得更好的跨平台与日志能力。
- **官方 API 复用**：若 `webServer.port` 已启用，可通过官方 HTTP 接口执行配置热更新、重启等操作，减少对本地子进程的频繁重启；但仍需保持自管备份的权威性。

### 6.7 安全与部署
- **敏感信息保护**：对 token、密码等敏感字段使用服务端加密存储（文档示例为 AES-256-GCM），前端永不回显原文，仅在必要时提供重新录入入口。
- **请求防护**：Nuxt server 中整合安全中间件（Helmet 同类能力）并实现 CSRF/XSS 基本防护；接口层需要白名单校验字段，避免任意配置写入。
- **容器化交付**：保留 Dockerfile/Docker Compose 能力，允许一键启动 Nuxt + 可选 MySQL 服务。若数据库暂未引入，可先保持抽象层以便未来切换真实存储。

---
如需深入了解 FRP 各字段，请参考 `https://github.com/frp-web/bridge/tree/main/ai-docs/frp-config-list.md`；若需更多关于多包协同的信息，阅读 `packages-overview.md`。
