# 隧道管理与代理统计 - 技术实现文档

## 架构概览

系统根据运行模式提供两种不同的功能：
- **Client 模式（FRPC）**：隧道管理，提供完整的 CRUD 功能操作本地 FRP 客户端的隧道
- **Server 模式（FRPS）**：代理统计，通过 FRPS 内置的 webServer API 获取代理统计信息（只读）

## 模式分离设计

### 导航菜单
侧边栏导航根据 `configStore.frpMode` 自动切换：
- **Server 模式**：Dashboard → Proxies → Config
- **Client 模式**：Dashboard → Tunnels → Config

### 页面路由
- `/tunnel` - Client 模式的隧道管理页面
- `/proxy` - Server 模式的代理统计页面

## Client 模式 - 隧道管理

### 数据流
```
前端 → API /api/config/tunnel → Bridge → frpc 进程
```

### 前端层 (Vue 组件)

**页面**：
- `app/pages/tunnel/index.vue` - 隧道管理页面入口

**组件**：
- `TunnelManager.vue` - 隧道列表和管理组件，提供完整的 CRUD 功能
- `TunnelFormDrawer.vue` - 隧道创建/编辑表单组件

关键状态管理：
- 在 `useConfigStore` 中维护隧道列表
- `frpMode` 来自 `/api/config/app` 响应，由后端配置管理

### API 路由设计

**统一 RESTful API**：
- `GET /api/config/tunnel` - 获取隧道列表
- `POST /api/config/tunnel` - 添加隧道
- `PUT /api/config/tunnel` - 更新隧道
- `DELETE /api/config/tunnel` - 删除隧道

### 后端实现

直接调用 `bridge.execute()` 操作隧道：
```typescript
// server/api/config/tunnel.post.ts
await bridge.execute({ name: 'proxy.add', payload: { proxy: tunnelConfig } })
```

### 已完成功能
- ✅ 完整的 CRUD 功能
- ✅ RESTful API 设计
- ✅ remotePort 冲突检测（本地）
- ✅ 隧道表单组件
- ✅ 多类型代理支持（TCP/UDP/HTTP/HTTPS/STCP/XTCP）

## Server 模式 - 代理统计

### 数据流
```
前端 → API /api/proxy/[type] → FRPS webServer API → 统计数据
```

### 前端层 (Vue 组件)

**页面**：
- `app/pages/proxy/index.vue` - 代理统计页面，按类型展示

**组件**：
- `ProxyTable.vue` - 代理表格组件，展示统计信息

**功能特性**：
- 按 Tabs 切换代理类型（TCP/UDP/HTTP/HTTPS/STCP/XTCP）
- 展示代理统计信息：连接数、入站/出站流量、状态等
- 只读展示，不提供编辑功能
- 手动刷新功能

### API 路由设计

**动态路由**：
- `GET /api/proxy/[type]` - 按类型获取代理统计信息

支持类型：`tcp`, `udp`, `http`, `https`, `stcp`, `xtcp`

### 后端实现

#### 工具函数：`server/utils/frps-api.ts`

核心函数：
- `getFrpsApiConfig()` - 从 frps.toml 读取 webServer 配置
  - 读取配置文件
  - 解析 TOML
  - 提取 webServer.addr、webServer.port、webServer.user、webServer.password

- `callFrpsApi<T>()` - 通用 API 调用函数
  - 处理 Basic Auth 认证
  - 发送 HTTP 请求到 FRPS webServer
  - 统一错误处理

- `getFrpsProxiesWithStats()` - 获取所有类型代理的统计信息
  - 并行调用所有类型的 API 端点
  - 统一格式化数据
  - 返回合并后的代理列表

#### API 端点：`server/api/proxy/[type].get.ts`

实现步骤：
1. 验证运行模式（必须是 server 模式）
2. 从路由参数获取代理类型
3. 验证类型是否有效（tcp/udp/http/https/stcp/xtcp）
4. 读取配置文件获取 webServer 配置
5. 构造 Basic Auth 认证头
6. 调用 FRPS API：`http://${addr}:${port}/api/proxy/${type}`
7. 解析响应并格式化数据
8. 返回统一格式的响应

### FRPS API 响应格式

```json
{
  "proxies": [
    {
      "name": "test-tcp",
      "conf": {
        "name": "test-tcp",
        "type": "tcp",
        "localIP": "127.0.0.1",
        "localPort": 22,
        "remotePort": 6000
      },
      "curConns": 1,
      "todayTrafficIn": 1024,
      "todayTrafficOut": 2048,
      "status": "online",
      "clientVersion": "0.60.0",
      "lastStartTime": "2026-01-11 10:00:00",
      "lastCloseTime": ""
    }
  ]
}
```

### 格式化后的数据结构

```typescript
interface ProxyItem {
  name: string
  type: string
  remotePort: number
  localPort: number
  localIP: string
  conns: number
  trafficIn: number
  trafficOut: number
  status: string
  clientVersion: string
  lastStartTime: string
  lastCloseTime: string
  conf: any
}
```

### webServer 配置

系统会在以下场景自动添加 webServer 配置到 frps.toml：
1. 下载 FRP 后首次启动
2. 从 FRP 包复制默认配置文件时

配置内容：
```toml
# webServer 配置 - 用于获取 FRPS 连接数据
webServer.addr = "127.0.0.1"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "admin"
```

### 已完成功能
- ✅ FRPS webServer API 集成
- ✅ 按类型展示代理统计
- ✅ 代理表格组件
- ✅ 类型切换 Tabs
- ✅ 手动刷新功能
- ✅ webServer 自动配置

## 错误处理

### Client 模式
1. **配置文件不存在**：提示用户检查配置
2. **端口冲突**：添加隧道时检测 remotePort 冲突
3. **FRP 进程异常**：展示错误信息，指导用户重启或检查配置

### Server 模式
1. **配置文件不存在**：返回错误，提示检查 frps.toml
2. **webServer 配置缺失**：返回错误，提示添加 webServer 配置
3. **FRPS API 调用失败**：返回错误信息（如 404、认证失败等）
4. **FRPS 未启动**：API 调用超时，提示用户启动 FRPS

## 国际化

相关翻译键：
```json
{
  "nav": {
    "proxy": "代理管理",
    "tunnel": "隧道管理"
  },
  "tunnel": {
    "title": "隧道管理",
    "totalProxies": "共 {count} 个代理",
    "status": {
      "online": "在线",
      "offline": "离线"
    }
  }
}
```

## 关键文件映射

| 功能 | 文件位置 |
|------|---------|
| 隧道管理页面 | `app/pages/tunnel/index.vue` |
| 代理统计页面 | `app/pages/proxy/index.vue` |
| 隧道管理组件 | `app/components/tunnel/TunnelManager.vue` |
| 隧道表单组件 | `app/components/tunnel/TunnelFormDrawer.vue` |
| 代理表格组件 | `app/components/proxy/ProxyTable.vue` |
| 状态管理 | `app/stores/config.ts` |
| Client 隧道 API | `server/api/config/tunnel.*.ts` |
| Server 代理 API | `server/api/proxy/[type].get.ts` |
| FRPS API 工具 | `server/utils/frps-api.ts` |
| 侧边栏导航 | `app/layouts/sider.vue` |
| 隧道配置类型 | `@frp-bridge/types` (ProxyConfig) |

## 待实现功能

### 通用
- [ ] 配置备份与恢复功能
- [ ] 隧道操作审计日志
- [ ] 实时状态监控（SSE/WebSocket）
- [ ] 隧道/代理搜索功能

### Client 模式
- [ ] 隧道模板功能
- [ ] 批量导入/导出隧道配置
- [ ] 隧道启用/禁用功能

### Server 模式
- [ ] 代理详情查看
- [ ] 流量图表展示
- [ ] 客户端信息展示
- [ ] 历史统计数据
