# dsh-minimax-usage

在 DeepSeek Harness (DSH) Web UI 中显示 MiniMax Token Plan 订阅用量。

插件读取官方 [Token Plan 用量接口](https://platform.minimax.io/docs/token-plan/faq)
`GET /v1/token_plan/remains`，在 Web UI 右下角放一个可拖动的用量气泡。
密钥复用 DSH **设置 → 模型** 里已配置的订阅 Key，浏览器拿不到明文。

## 安装

### 推荐：从 npm 安装

```bash
dsh plugin --profile web add dsh-minimax-usage
```

`web` 换成你的 profile 名。装完 **重启 DSH**。

### 备选：从 GitHub 装

锁定版本：

```bash
dsh plugin --profile web add github:pan17/dsh-minimax-usage#v0.1.2
```

或默认分支最新：

```bash
dsh plugin --profile web add github:pan17/dsh-minimax-usage
```

### 构建脚本授权

如果 pnpm 提示不允许跑构建脚本（`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`），在该 profile 的 `pnpm-workspace.yaml` 加上再重跑同一条命令：

```yaml
allowBuilds:
  dsh-minimax-usage: true
```

然后：

1. 打开 Web UI（默认 `http://127.0.0.1:3080`）
2. **设置 → 模型** 填写 Token Plan **订阅 Key**（不是普通按量付费 API Key）
3. 右下角会出现 MiniMax 气泡；悬停看详情，拖动换位置

## 功能

- **悬浮气泡**：默认在右下角，显示 5 小时窗口剩余百分比；可拖到任意位置，位置会记住
- **悬停卡片**：鼠标放上去看国内站 / 国际站、套餐名、5h / 周进度条和重置倒计时
- **点击刷新**：点一下气泡强制刷新；拖动不会误触发刷新
- **密钥来源**：`MINIMAX_API_KEY`（国际）与 `MINIMAX_CN_API_KEY`（国内），优先 `ctx.credentials`，其次进程环境变量
- **自动刷新**：整轮 Agent 回到空闲且这轮用过 MiniMax 后，再等 15 秒打官方用量。之后心跳从 2 分钟起每次翻倍，上限 24 小时；再用 MiniMax 并空闲后心跳重置回 2 分钟。气泡每 15 秒只读 Host 缓存。点击立即强制刷新。

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

## 发布

参见 [PUBLISH.md](./PUBLISH.md)：tag push 触发 GitHub Actions，自动 pack → GitHub Release → 等 CI 绿 → publish 到 npm。

## 开发

```bash
npm install
npm test
npm run build
```

本地未推送时也可以按路径装：

```bash
dsh plugin --profile web add /path/to/dsh-minimax-usage
```