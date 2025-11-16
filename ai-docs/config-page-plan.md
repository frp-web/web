# 配置页面方案（2025-11-16）

## 1. 当前完成度
- 侧栏已挂载「配置」入口，`app/pages/config/index.vue` 作为 `/config` 页面并沿用默认布局。
- `useConfigStore` 管理 FRP 文本、主题、FRP 包信息以及帐号占位状态，所有 Tab 共用同一 store。
- 页面骨架已落地：页头提供刷新按钮，主体用 `AntTabs` 切分 FRP / 常规 / 帐号 三块内容。

## 2. FRP 标签页
- `FrpEditor.vue` 基于 `@monaco-editor/loader` 创建 INI 编辑器，支持 `v-model`、只读切换、自动布局。
- 页面初始通过 `useAsyncData` 并行请求 `store.fetchFrpConfig()` 与 `store.fetchAppSettings()`，FRP 文本存入 `frpOriginal` / `frpDraft`。
- `store.saveFrpConfig` 调用 `/api/config/frp`（PUT），该接口执行 `bridge.execute('config.applyRaw')` 并在成功后返回最新快照；`resetFrpDraft` 可一键回滚。
- 编辑区展示保存时间、错误信息、刷新/重置/保存按钮，`store.frpLoading` 控制自旋。

## 3. 常规标签页
- 主题选择器直接调用 `/api/config/app`（PUT）更新 `appStorage.theme`，界面在 `themeSaving` 期间禁用选择。
- FRP 版本卡片绑定 `frpPackageStorage`，按钮触发 `/api/config/frp-version`（POST），会从 GitHub 获取最新 release 并缓存下载地址、tag、发布时间。
- 仍留出更多设置位，后续可以在同一区块追加表单项；当前只展示主题与版本信息。

## 4. 帐号标签页
- 表单包含用户名、密码、确认密码，数据写入 `accountDraft` 并提供重置、暂存按钮。
- `saveAccountDraft` 仅做本地暂存并记录 `accountSavedAt`，界面显式提示“未持久化”。
- 尚未接入后端 API，未来若需要落库再扩展。

## 5. 服务端接口（已实现）
| 路径 | 方法 | 作用 |
| --- | --- | --- |
| `/api/config/frp` | GET | `readConfigFileText()` 返回 FRP 原文、更新时间、版本。 |
| `/api/config/frp` | PUT | 通过 `bridge.execute('config.applyRaw')` 落盘，可选 `restart`，返回最新快照。 |
| `/api/config/app` | GET | 读取 `appStorage` 与 `frpPackageStorage`，同步主题和版本信息。 |
| `/api/config/app` | PUT | 校验 `theme` 并更新 `appStorage.theme`。 |
| `/api/config/frp-version` | POST | 若未在更新中则从 GitHub releases 拉取最新版本，刷新 `frpPackageStorage`。 |

## 6. 后续事项
- [ ] 为常规 Tab 追加更多系统设置，并规划 `/api/config/general` 数据结构。
- [ ] 将帐号 Tab 接入真实存储或 server route，并追加校验/提示。
- [ ] 在保存/更新操作中统一使用通知组件反馈成功或失败。
- [ ] 研究结构化配置（TOML/JSON）编辑模式，保留富检验能力。
