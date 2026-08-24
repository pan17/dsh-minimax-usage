# dsh-minimax-usage

在 DeepSeek Harness (DSH) Web UI 中显示 MiniMax Token Plan 订阅用量。

插件读取官方 [Token Plan 用量接口](https://platform.minimax.io/docs/token-plan/faq)
`GET /v1/token_plan/remains`，在 Web UI 右下角放一个可拖动的用量气泡。
密钥复用 DSH **设置 → 模型** 里已配置的订阅 Key，浏览器拿不到明文。

## 功能

- **悬浮气泡**：默认在右下角，显示 5 小时窗口剩余百分比；可拖到任意位置，位置会记住
- **悬停卡片**：鼠标放上去看国内站 / 国际站、套餐名、5h / 周进度条和重置倒计时
- **点击刷新**：点一下气泡强制刷新；拖动不会误触发刷新
- **密钥来源**：`MINIMAX_API_KEY`（国际）与 `MINIMAX_CN_API_KEY`（国内），优先 `ctx.credentials`，其次进程环境变量
- **自动刷新**：整轮 Agent 回到空闲且这轮用过 MiniMax 后，再等 15 秒打官方用量。之后心跳从 2 分钟起每次翻倍，上限 24 小时；再用 MiniMax 并空闲后心跳重置回 2 分钟。气泡每 15 秒只读 Host 缓存。点击立即强制刷新。

## 安装

```bash
dsh plugin --profile <profile> add dsh-minimax-usage
dsh --profile <profile> --dump-config   # 应看到 "- id: dsh-minimax-usage"
```

本地开发目录可直接加路径：

```bash
dsh plugin --profile <profile> add F:\project_pan\dsh-pan-plugin-collection\dsh-minimax-usage
```

改代码后必须 **重启 DSH** 才会生效。

然后：

1. 打开 DSH Web UI（默认 `http://127.0.0.1:3080`）
2. **设置 → 模型** 填写 Token Plan **订阅 Key**（不是普通按量付费 API Key）
3. 重启后页面右下角会出现 MiniMax 气泡；鼠标悬停看详情，拖动可换位置

## 接口

| 区域 | 凭据 | 用量 URL |
|---|---|---|
| 国际 | `MINIMAX_API_KEY` | `www.minimax.io`，失败则回退 `api.minimax.io` |
| 国内 | `MINIMAX_CN_API_KEY` | `api.minimaxi.com`，失败则回退 `www.minimaxi.com` |

只查询已配置的区域。两把 Key 都有就并排两张卡。

## 注意

- 订阅 Key 与普通开放平台 API Key **不能混用**。用量接口拒绝普通 Key 时，页面会提示改用订阅 Key。
- 插件原样展示官方剩余额度，不本地「修正」扣费；`remains_time` 的语义以 MiniMax 控制台为准。
- `*_quota = 0` 的模型会标成「未包含」，而不是 0%。

## 开发

```bash
npm install
npm test
npm run build
```
