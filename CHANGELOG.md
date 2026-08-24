# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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