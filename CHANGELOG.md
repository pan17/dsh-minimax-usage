# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.1.7] - 2026-09-04

### Changed

- 将右下角浮动气泡改为模型选择器左侧的紧凑 `5h` / `7d` 内联用量条。
- 仅当前选择 `minimax-cn` 或 `minimax` Token Plan provider 时显示；保留自动刷新、点击刷新和悬停详情。

## [0.1.6] - 2026-08-31

### Added

- 气泡拖到屏幕边缘松手后自动贴边收起，只留一小截标志；悬停（或点一下）滑出，拖回屏幕内取消停靠

### Changed

- 去掉气泡外圈投影和色调光晕，只保留细描边和内部高光
- 浅色主题改用 layer-1 白底，避免 overlay 灰蓝叠黑后发脏

### Fixed

- 气泡改为 portal 到 `document.body`，不再被右侧栏挡住

## [0.1.5] - 2026-08-28

### Fixed

- 修复手动刷新请求 URL 错误的 bug：`load(true)` 实际发到 `/minimax-usage/apiNaN`（一元加号把 `"/refresh"` 转成了 `NaN`），服务器 404 后客户端 `setData({})`，导致气泡瞬间变灰显示"暂无可用账号"，过一会才被下一次 polling 拉回正确数据。改为正确的 `/minimax-usage/api/refresh`。

### Changed

- 优化手动刷新的视觉反馈：点击气泡触发刷新时，气泡核心替换为 indigo spinner 并叠加 indigo 光晕；面板顶部出现横向 shimmer 进度条；live label 切换到刷新色 + 更快闪烁的状态点 + 内联小转圈；空账号状态下显示"正在刷新用量…"。刷新成功后，气泡播放 0.95s 绿色脉冲辉光，给到明确的"刷好了"反馈。

## [0.1.4] - 2026-08-28

### Changed

- 气泡视觉重设计：64px 径向渐变背景 + tone 双层阴影 + SVG 渐变进度环（带辉光）+ tone-aware 字号 + 入场弹性动画
- 加载态加入呼吸光晕与双圈旋转 spinner；详情面板加入渐变描边、tone 左侧色条、shimmer 进度条
- 面板头部加入 M logo + 状态点闪烁动画；气泡增加 `aria-label`，提升无障碍体验

## [0.1.3] - 2026-08-25

### Added

- 每轮快照根据 5 小时窗口的 `intervalEndAt`，在重置时刻 + 30 秒自动再刷一次，及时捕获窗口翻页后的新额度（`interval-reset` reason）

## [0.1.2] - 2026-08-24

### Added

- GitHub Actions CI workflow：每次 push/PR 跑 build + test
- Release workflow：tag 推送时自动建 GitHub Release（带 tarball）+ 发布到 npm，等 CI green 再 publish

## [0.1.1] - 2026-08-24

### Changed

- 气泡中心的百分比数字后追加 `%` 单位（字号 9px，opacity 0.65，顶对齐），更明确表达语义

## [0.1.0] - 2026-08-24

### Added

- 浮窗气泡形式在 DSH Web UI 显示 MiniMax Token Plan 订阅用量
- 支持国内站 (`MINIMAX_CN_API_KEY`) 和国际站 (`MINIMAX_API_KEY`)，未配置的站静默跳过
- 拖动换位置（位置存到 localStorage），悬停/聚焦展开详情面板（5 小时窗口 + 本周窗口，百分比条 + 重置倒计时）
- 智能刷新：整轮 Agent 回到空闲 15 秒后刷新；心跳 2 分钟起步，每次翻倍到 24 小时上限；点击立即刷新；切凭据后立即刷新
- 失败重试：自动尝试多个 endpoint（CN 优先 `api.minimaxi.com`、global 优先 `www.minimax.io`），SSL/网络错误透明重试，认证错误透传
- 36 个 vitest 单元测试覆盖 refresh 调度、normalize、credentials、cache、fetch、service
- DSH bundle manifest（`dsh.bundle.patch` + `dsh.client.platform=web`），可走 `dsh plugin add` 安装
- GitHub Release workflow：tag push 时自动 pack tarball 并上传