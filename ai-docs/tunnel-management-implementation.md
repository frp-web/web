# 隧道管理功能 - 技术实现文档

## 架构概览

隧道管理分两种模式：
- **Client 模式**：通过 API 直接控制本地 FRP 客户端的隧道
- **Server 模式**：通过 WebSocket RPC 远程控制连接的各个 Node（即各个 Client）的隧道

## 数据流设计

### Client 模式数据流
```
前端 → API /tunnel/* → Bridge → frpc 进程
```

### Server 模式数据流
```
前端 → API /tunnel/* → RPC Server → WebSocket → 远程 Node → frpc 进程
```

## 核心实现

### 1. 前端层 (Vue 组件)

**TunnelManager.vue** 作为通用隧道管理组件，根据 `configStore.frpMode` 配置决定工作模式：
- `frpMode === 'client'`：Client 模式，操作本地隧道
- `frpMode === 'server'`：Server 模式，需要通过节点管理界面操作指定 Node 的隧道

关键状态管理：
- 在 `useConfigStore` 中维护隧道列表
- `frpMode` 来自 `/api/config/app` 响应，由后端配置管理

**已实现组件**：
- `TunnelManager.vue`：隧道列表和管理
- `TunnelFormDrawer.vue`：隧道创建/编辑表单

### 2. API 路由设计

**统一 RESTful API**（Client 模式）：
- `GET /api/config/tunnel` - 获取隧道列表
- `POST /api/config/tunnel` - 添加隧道
- `PUT /api/config/tunnel` - 更新隧道
- `DELETE /api/config/tunnel` - 删除隧道

**Server 隧道**（基于 RPC，待实现）：
- `POST /api/node/:nodeId/tunnel` - 通过 RPC 添加
- `PUT /api/node/:nodeId/tunnel` - 通过 RPC 更新
- `DELETE /api/node/:nodeId/tunnel` - 通过 RPC 删除
- `GET /api/node/:nodeId/tunnel` - 通过 RPC 查询

### 3. 后端实现策略

**Client 模式**：直接调用 `bridge.execute()` 操作隧道
```typescript
// server/api/config/tunnel.post.ts
await bridge.execute({ name: 'proxy.add', payload: { proxy: tunnelConfig } })
```

**Server 模式**：通过 RPC Server 转发请求
```typescript
// server/api/node/[nodeId]/tunnel.post.ts (待实现)
await bridge.execute({
  name: 'proxy.add',
  payload: { proxy: tunnelConfig, nodeId }
})
// 内部会调用 rpcServer.rpcCall(nodeId, 'proxy.add', { proxy: tunnelConfig })
```

### 4. WebSocket RPC 机制

Server 端维护 Client 连接池，每个 Node 对应一个 WebSocket。接收到隧道操作请求时：

1. Server 生成唯一 RPC ID
2. 发送 RPC 请求到对应 Node 的 WebSocket
3. Node 执行隧道操作，返回结果
4. Server 等待响应（默认 30s 超时）
5. 返回结果给前端

**关键协议**：
- 请求：`{ id, method: 'tunnel.add|update|remove', params, timeout }`
- 响应：`{ id, status: 'success|error', result, error }`

### 5. 状态同步

**实时更新隧道列表**：
- Client 模式：SSE 推送隧道状态变化
- Server 模式：RPC 回调通知各 Node 状态变化（或定期轮询）

## 错误处理

1. **Node 离线**：RPC 请求立即失败，前端显示"节点离线"
2. **RPC 超时**：30s 无响应，返回超时错误
3. **执行失败**：Node 返回 error 状态，展示错误信息

## 权限控制

- Client 模式：验证当前用户权限
- Server 模式：验证用户对指定 Node 的操作权限（从数据库或配置获取）

## 存储与配置

- **frpMode 配置**：在 `appStorage` 中存储，由后端管理，通过 `/api/config/app` 暴露给前端
  - `'client'`：客户端模式
  - `'server'`：服务端模式
- **Client 隧道配置**：保存在本地 FRP 配置文件中
- **Server 节点信息**：存储节点列表及其授权用户
- **连接状态**：维护内存 Map 记录活跃 WebSocket 连接

## 模式切换流程

1. 后端管理员修改 `appStorage.frpMode`
2. 前端调用 `/api/config/app` 获取最新 `frpMode`
3. `configStore` 响应式更新，页面导航和组件行为自动调整
4. 隧道操作 API 路由根据 `frpMode` 动态选择（Client 或 Server）

## 关键文件映射

| 功能 | 文件位置 |
|------|---------|
| 通用隧道组件 | `app/components/tunnel/TunnelManager.vue` |
| 隧道表单组件 | `app/components/tunnel/TunnelFormDrawer.vue` |
| 状态管理 | `app/stores/config.ts` |
| Client 隧道 API | `server/api/config/tunnel.*.ts` |
| Server 隧道 API | `server/api/node/[nodeId]/tunnel.*.ts` (待实现) |
| RPC 服务 | `frp-bridge/packages/core/src/rpc/rpc-server.ts` |
| 隧道配置类型 | `@frp-bridge/types` (ProxyConfig) |

## 已完成功能

- ✅ Client 模式隧道 CRUD
- ✅ RESTful API 设计
- ✅ remotePort 冲突检测（本地）
- ✅ 隧道表单组件
- ✅ **服务端隧道冲突检测**（全局）
- ✅ **RPC 隧道管理命令**

## 待实现功能

- ⏳ Server 模式隧道管理 UI
- ⏳ 节点隧道同步机制
- ⏳ 隧道状态实时显示（SSE）
- ⏳ 隧道操作审计日志
