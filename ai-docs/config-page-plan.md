# 配置页面方案（2026-01-11）

## 1. 当前完成度
- 侧栏已挂载「配置」入口，`app/pages/config/index.vue` 作为 `/config` 页面并沿用默认布局。
- `useConfigStore` 管理 FRP 文本、主题、FRP 包信息、模式以及帐号占位状态，所有 Tab 共用同一 store。
- 页面骨架已落地：页头提供刷新按钮，主体用 `AntTabs` 切分 FRP / 常规 / 帐号 三块内容。

## 2. FRP 标签页
- `FrpEditor.vue` 基于 `@monaco-editor/loader` 创建 INI 编辑器，支持 `v-model`、只读切换、自动布局。
- 页面初始通过 `useAsyncData` 并行请求 `store.fetchFrpConfig()` 与 `store.fetchAppSettings()`，FRP 文本存入 `frpOriginal` / `frpDraft`。
- `store.saveFrpConfig` 调用 `/api/config/frp`（PUT），该接口执行 `bridge.execute('config.applyRaw')` 并在成功后返回最新快照；`resetFrpDraft` 可一键回滚。
- 编辑区展示保存时间、错误信息、刷新/重置/保存按钮，`store.frpLoading` 控制自旋。

## 3. 常规标签页
- 主题选择器直接调用 `/api/config/app`（PUT）更新 `appStorage.theme`，界面在 `themeSaving` 期间禁用选择。
- FRP 版本卡片绑定 `frpPackageStorage`，按钮触发 `/api/config/frp-version`（POST），会从 GitHub 获取最新 release 并缓存下载地址、tag、发布时间。
- **FRP 模式切换**：支持在 Client/Server 模式间切换，切换后需要重启 FRP 服务生效。
  - Server 模式：显示 `/proxy` 页面（代理统计）
  - Client 模式：显示 `/tunnel` 页面（隧道管理）
  - 侧边栏导航会根据模式自动切换显示
- 仍留出更多设置位，后续可以在同一区块追加表单项；当前展示主题、版本和模式信息。

## 4. 帐号标签页
- 表单包含用户名、密码、确认密码，数据写入 `accountDraft` 并提供重置、暂存按钮。
- `saveAccountDraft` 仅做本地暂存并记录 `accountSavedAt`，界面显式提示"未持久化"。
- 尚未接入后端 API，未来若需要落库再扩展。

## 5. 服务端接口（已实现）

| 路径 | 方法 | 作用 |
| --- | --- | --- |
| `/api/config/frp` | GET | `readConfigFileText()` 返回 FRP 原文、更新时间、版本。 |
| `/api/config/frp` | PUT | 通过 `bridge.execute('config.applyRaw')` 落盘，可选 `restart`，返回最新快照。 |
| `/api/config/app` | GET | 读取 `appStorage` 与 `frpPackageStorage`，同步主题、版本和模式信息。 |
| `/api/config/app` | PUT | 校验 `theme` 和 `frpMode` 并更新 `appStorage`。 |
| `/api/config/frp-version` | POST | 若未在更新中则从 GitHub releases 拉取最新版本，刷新 `frpPackageStorage`。 |

## 6. FRP 版本管理

### 版本下载流程
1. 用户在配置页面点击"更新 FRP 版本"
2. 调用 `/api/config/frp-version`（POST）
3. 后端从 GitHub Releases 获取最新版本信息
4. 使用 `bridge.downloadFrpBinary()` 下载指定版本
5. 更新 `frpPackageStorage` 缓存版本信息
6. 前端刷新显示最新版本

### 版本信息结构
```typescript
interface FrpPackageStorage {
  version: string // 版本号（如 "0.60.0"）
  downloadUrl: string // GitHub 下载链接
  releaseDate: string // 发布日期
  tag: string // Git tag
  updatedAt: number // 更新时间戳
}
```

## 7. webServer 自动配置

### 触发时机
系统会在以下场景自动为 FRPS 添加 webServer 配置：
1. 下载 FRP 后首次启动时
2. 从 FRP 包复制默认配置文件时

### 实现位置
- `server/bridge/index.ts` - `copyDefaultConfigIfExists()` 函数
- `server/api/config/frp-version.post.ts` - FRP 下载后的配置处理

### 配置内容
```toml
# webServer 配置 - 用于获取 FRPS 连接数据
webServer.addr = "127.0.0.1"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "admin"
```

### 自动配置逻辑
```typescript
// server/bridge/index.ts
if (mode === 'server') {
  const { appendFileSync, readFileSync } = await import('node:fs')
  try {
    const configContent = readFileSync(targetConfigPath, 'utf-8')

    // 检查是否已存在 webServer 配置
    if (!configContent.includes('webServer.addr')) {
      // 添加 webServer 配置
      const webServerConfig = '\n# webServer 配置 - 用于获取 FRPS 连接数据\nwebServer.addr = "127.0.0.1"\nwebServer.port = 7500\nwebServer.user = "admin"\nwebServer.password = "admin"\n'
      appendFileSync(targetConfigPath, webServerConfig)
      console.warn(`Added webServer config to: ${targetConfigPath}`)
    }
  }
  catch (error) {
    console.error('Failed to add webServer config:', error)
  }
}
```

## 8. 模式切换影响

### Server 模式（FRPS）
- 导航显示：Dashboard → Proxies → Config
- Proxies 页面功能：
  - 按 Tabs 切换代理类型（TCP/UDP/HTTP/HTTPS/STCP/XTCP）
  - 展示代理统计信息（连接数、流量、状态等）
  - 只读展示，不提供编辑功能
  - 使用 FRPS webServer API 获取数据

### Client 模式（FRPC）
- 导航显示：Dashboard → Tunnels → Config
- Tunnels 页面功能：
  - 完整的隧道管理 CRUD 功能
  - 支持添加、编辑、删除隧道
  - 本地端口冲突检测
  - 直接操作本地 FRPC 配置

## 9. 后续事项
- [x] ~~为常规 Tab 追加更多系统设置~~（已完成模式切换）
- [ ] 配置备份与恢复功能
- [ ] 将帐号 Tab 接入真实存储或 server route，并追加校验/提示
- [ ] 在保存/更新操作中统一使用通知组件反馈成功或失败
- [ ] 研究结构化配置（TOML/JSON）编辑模式，保留富检验能力
- [ ] FRPS webServer 配置自定义（允许修改 addr/port/user/password）
