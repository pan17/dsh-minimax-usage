/**
 * dsh-minimax-usage client half — compact Token Plan quota indicator beside
 * the conversation model selector.
 *
 * Authored directly in the DSH client module format (window.__ModuleLoader__).
 * The Host half remains the source of truth for credentials, caching and
 * refresh scheduling; this half reads only the plugin-owned JSON endpoints.
 */
window.__ModuleLoader__.load({
	id: "dsh-minimax-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const createElement = react.createElement;

		// `slots` is the root service; `modelDirectories` is resolved in the
		// session-scoped inject below so every composer observes its own model.
		const inject = ["slots"];
		const POLL_MS = 15000;
		const REGION_LABEL = { global: "国际站", cn: "国内站" };

		const css = [
			// === inline quota cell ===
			".mxu_inline_host{display:inline-flex;position:relative;flex:none;align-items:center;height:28px;margin:0 2px;z-index:1}",
			".mxu_inline{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;justify-content:center;width:70px;min-height:28px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#8b93a1);cursor:pointer;font:inherit;line-height:1;user-select:none;transition:background .14s ease,opacity .14s ease,transform .14s ease}",
			".mxu_inline:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}",
			".mxu_inline:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3,#8ea3ff)}",
			".mxu_inline:active{transform:scale(.98)}",
			".mxu_inline[data-busy=true]{background:color-mix(in srgb,#818cf8 12%,transparent)}",
			".mxu_inline_rows{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:70px}",
			".mxu_inline_line{display:inline-flex;align-items:center;gap:4px;width:70px;height:6px}",
			".mxu_inline_label{display:inline-block;width:18px;color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:9px;font-weight:600;line-height:10px;text-align:right;letter-spacing:.01em}",
			".mxu_inline_track{display:block;width:48px;height:6px;border-radius:999px;background:var(--dsw-alias-border-l2,rgba(128,128,128,.28));overflow:hidden}",
			".mxu_inline_fill{display:block;height:100%;min-width:0;border-radius:inherit;transition:width .45s cubic-bezier(.3,.7,.4,1),background-color .2s ease}",
			".mxu_inline_fill.ok{background:var(--dsw-alias-state-success-primary,#22c55e)}",
			".mxu_inline_fill.warn{background:var(--dsw-alias-state-warn-primary,#f59e0b)}",
			".mxu_inline_fill.danger{background:var(--dsw-alias-state-error-primary,#ef4444)}",
			".mxu_inline_fill.muted{background:var(--dsw-alias-label-tertiary,#64748b);opacity:.55}",
			".mxu_inline_fill.loading{width:55%;background:linear-gradient(90deg,#7c8cff,#a5b4fc,#7c8cff);background-size:200% 100%;animation:mxu_inline_loading 1.4s ease-in-out infinite}",
			"@keyframes mxu_inline_loading{0%{background-position:100% 0;opacity:.42}50%{opacity:.9}100%{background-position:0 0;opacity:.42}}",

			// === compact tooltip ===
			".mxu_inline_tip{pointer-events:none;position:absolute;right:0;bottom:calc(100% + 7px);width:296px;box-sizing:border-box;padding:12px 13px 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,#fff) 18%,transparent);border-radius:13px;background:var(--dsw-alias-bg-overlay,#16181d);color:var(--dsw-alias-label-primary,#e8eaed);box-shadow:0 14px 34px rgba(0,0,0,.28);z-index:1000;line-height:1.35}",
			".mxu_inline_tip_head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}",
			".mxu_inline_tip_title{font-size:12px;font-weight:700;letter-spacing:-.01em}",
			".mxu_inline_tip_sub{margin-top:2px;color:var(--dsw-alias-label-secondary,#8b93a1);font-size:10px}",
			".mxu_inline_tip_live{color:var(--dsw-alias-label-secondary,#8b93a1);font-size:10px;white-space:nowrap}",
			".mxu_inline_tip_error{margin:0 0 8px;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,#f43f5e 13%,transparent);color:#fda4af;font-size:10px;line-height:1.45}",
			".mxu_inline_tip_empty{padding:8px 2px;color:var(--dsw-alias-label-secondary,#8b93a1);font-size:10px;text-align:center}",
			".mxu_inline_account{margin-top:7px;padding:8px 9px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 7%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,#fff) 9%,transparent)}",
			".mxu_inline_account:first-of-type{margin-top:0}",
			".mxu_inline_account_selected{border-color:color-mix(in srgb,#818cf8 38%,transparent)}",
			".mxu_inline_account_head{display:flex;align-items:center;gap:6px;margin-bottom:6px}",
			".mxu_inline_chip{padding:2px 6px;border-radius:999px;background:color-mix(in srgb,#818cf8 16%,transparent);color:#a5b4fc;font-size:9px;font-weight:700}",
			".mxu_inline_account_name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;font-weight:650}",
			".mxu_inline_stale{margin-left:auto;color:#fbbf24;font-size:9px;white-space:nowrap}",
			".mxu_inline_account_error{margin:0 0 6px;color:#fda4af;font-size:10px;line-height:1.4}",
			".mxu_inline_model{margin-top:6px}",
			".mxu_inline_model:first-of-type{margin-top:0}",
			".mxu_inline_model_name{margin-bottom:4px;color:var(--dsw-alias-label-secondary,#8b93a1);font-size:9.5px;font-weight:650;text-transform:uppercase;letter-spacing:.02em}",
			".mxu_inline_metric{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:2px;color:var(--dsw-alias-label-secondary,#8b93a1);font-size:10px}",
			".mxu_inline_metric b{color:var(--dsw-alias-label-primary,#f4f6f9);font-size:10px;font-weight:700;font-variant-numeric:tabular-nums}",
			".mxu_inline_hint{margin-top:8px;padding-top:7px;border-top:1px dashed color-mix(in srgb,var(--dsw-alias-border-l1,#fff) 14%,transparent);color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:9.5px;line-height:1.45}",
		].join("");

		if (typeof document !== "undefined") {
			const existing = document.querySelector('style[data-plugin-css="dsh-minimax-usage"]');
			if (existing) {
				existing.textContent = css;
			} else {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-minimax-usage";
				tag.dataset.pluginCss = "dsh-minimax-usage";
				tag.textContent = css;
				document.head.appendChild(tag);
			}
		}

		function api(path, options) {
			return fetch("/minimax-usage/api" + path, {
				headers: { "Content-Type": "application/json" },
				...options,
			}).then(async (resp) => ({
				ok: resp.ok,
				status: resp.status,
				body: await resp.json().catch(() => ({})),
			}));
		}

		function minimaxRegion(provider) {
			if (provider === "minimax-cn") return "cn";
			if (provider === "minimax") return "global";
			return undefined;
		}

		function toneOf(percent) {
			if (typeof percent !== "number" || Number.isNaN(percent)) return "muted";
			if (percent < 20) return "danger";
			if (percent < 50) return "warn";
			return "ok";
		}

		function formatPercent(percent) {
			if (typeof percent !== "number" || Number.isNaN(percent)) return "—";
			return Math.round(percent) + "%";
		}

		function formatCountdown(endAt) {
			if (!endAt) return "";
			const remain = endAt - Date.now();
			if (remain <= 0) return "已重置";
			const totalMin = Math.floor(remain / 60000);
			const days = Math.floor(totalMin / (60 * 24));
			const hours = Math.floor((totalMin % (60 * 24)) / 60);
			const mins = totalMin % 60;
			if (days > 0) return days + "天" + hours + "小时";
			if (hours > 0) return hours + "小时" + mins + "分";
			if (mins > 0) return mins + "分";
			return Math.max(1, Math.floor(remain / 1000)) + "秒";
		}

		function formatFetchedAt(ts) {
			if (!ts) return "";
			try {
				return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
			} catch {
				return "";
			}
		}

		function accountForSelection(accounts, region, modelId) {
			const account = (accounts || []).find((item) => item && item.region === region);
			if (!account) return { account: undefined, model: undefined };
			const wanted = typeof modelId === "string" ? modelId.toLowerCase() : "";
			const exact = wanted
				? (account.models || []).find((item) => item && String(item.name).toLowerCase() === wanted)
				: undefined;
			const fallback = (account.models || []).find((item) => item && item.included !== false) || (account.models || [])[0];
			return { account, model: exact || fallback };
		}

		function useUsage(enabled, region) {
			const [data, setData] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [tick, setTick] = react.useState(0);
			const requestSeq = react.useRef(0);

			const load = react.useCallback((force) => {
				if (!enabled) return Promise.resolve();
				const seq = ++requestSeq.current;
				if (force) setBusy(true);
				return api(force ? "/refresh" : "/status", force ? { method: "POST" } : undefined)
					.then((response) => {
						if (seq !== requestSeq.current || !enabled) return;
						if (response.body && typeof response.body === "object") setData(response.body);
					})
					.catch(() => {})
					.finally(() => {
						if (seq === requestSeq.current && force) setBusy(false);
					});
			}, [enabled, region]);

			react.useEffect(() => {
				++requestSeq.current;
				if (!enabled) {
					setData(null);
					setBusy(false);
					return undefined;
				}
				load(false);
				return () => { ++requestSeq.current; };
			}, [enabled, region, load]);

			react.useEffect(() => {
				if (!enabled) return undefined;
				const id = setInterval(() => load(false), POLL_MS);
				return () => clearInterval(id);
			}, [enabled, region, load]);

			react.useEffect(() => {
				if (!enabled) return undefined;
				const id = setInterval(() => setTick((value) => value + 1), 30000);
				return () => clearInterval(id);
			}, [enabled]);

			return { data, busy, load, tick };
		}

		function CompactQuotaLine(props) {
			const percent = typeof props.percent === "number" && !Number.isNaN(props.percent)
				? Math.max(0, Math.min(100, props.percent))
				: undefined;
			const tone = props.loading ? "muted" : (props.included === false ? "muted" : toneOf(percent));
			const fillClass = "mxu_inline_fill " + (props.loading ? "loading" : tone);
			const width = props.loading ? undefined : (props.included === false || percent === undefined ? "0%" : percent + "%");
			return createElement("span", { className: "mxu_inline_line", "aria-hidden": "true" },
				createElement("span", { className: "mxu_inline_label" }, props.label),
				createElement("span", { className: "mxu_inline_track" },
					createElement("span", { className: fillClass, style: width === undefined ? undefined : { width } }),
				),
			);
		}

		function detailMetric(label, percent, included, reset) {
			const value = included === false ? "未包含" : formatPercent(percent);
			return createElement("div", { className: "mxu_inline_metric" },
				createElement("span", null, label + (reset ? " · " + reset : "")),
				createElement("b", null, value),
			);
		}

		function DetailPanel(props) {
			const accounts = Array.isArray(props.accounts) ? props.accounts : [];
			const data = props.data;
			const loading = !data || data.phase === "init";
			return createElement("div", { className: "mxu_inline_tip", role: "tooltip", id: props.id },
				createElement("div", { className: "mxu_inline_tip_head" },
					createElement("div", null,
						createElement("div", { className: "mxu_inline_tip_title" }, "MiniMax Token Plan"),
						createElement("div", { className: "mxu_inline_tip_sub" }, REGION_LABEL[props.region] || "MiniMax"),
					),
					createElement("span", { className: "mxu_inline_tip_live" },
						props.busy ? "刷新中…" : (loading ? "读取中…" : (data.fetchedAt ? "更新于 " + formatFetchedAt(data.fetchedAt) : "")),
					),
				),
				data && data.error ? createElement("div", { className: "mxu_inline_tip_error" }, data.error) : null,
				loading && accounts.length === 0
					? createElement("div", { className: "mxu_inline_tip_empty" }, props.busy ? "正在刷新用量…" : "正在读取用量…")
					: null,
				accounts.map((account) => createElement("div", {
					className: "mxu_inline_account" + (account.region === props.region ? " mxu_inline_account_selected" : ""),
					key: account.region,
				},
					createElement("div", { className: "mxu_inline_account_head" },
						createElement("span", { className: "mxu_inline_chip" }, REGION_LABEL[account.region] || account.region),
						createElement("span", { className: "mxu_inline_account_name" }, account.planName || "订阅套餐"),
						account.stale ? createElement("span", { className: "mxu_inline_stale" }, "可能过期") : null,
					),
					account.error ? createElement("div", { className: "mxu_inline_account_error" }, account.error) : null,
					(account.models || []).map((model) => createElement("div", { className: "mxu_inline_model", key: model.name },
						createElement("div", { className: "mxu_inline_model_name" }, model.name),
						detailMetric("5 小时窗口", model.intervalRemainingPercent, model.included, formatCountdown(model.intervalEndAt)),
						detailMetric("本周窗口", model.weeklyRemainingPercent, model.included, formatCountdown(model.weeklyEndAt)),
					)),
				)),
				createElement("div", { className: "mxu_inline_hint" }, "点击立即刷新 · 仅当前 MiniMax Token Plan provider 显示"),
			);
		}

		function MiniMaxUsageIndicator(props) {
			const directory = props.directory;
			const directoryState = react.useSyncExternalStore(
				(listener) => directory.subscribe(listener),
				() => directory.getSnapshot(),
				() => directory.getSnapshot(),
			);
			const current = directoryState && directoryState.current;
			const region = directoryState && directoryState.status === "ready"
				? minimaxRegion(current && current.provider)
				: undefined;
			const enabled = region !== undefined;
			const { data, busy, load, tick } = useUsage(enabled, region);
			void tick;
			const [hovered, setHovered] = react.useState(false);
			const [focused, setFocused] = react.useState(false);
			const tooltipId = react.useId();

			if (!enabled) return null;

			const accounts = data && Array.isArray(data.accounts) ? data.accounts : [];
			const selected = accountForSelection(accounts, region, current && current.model);
			const account = selected.account;
			const model = selected.model;
			const loading = !data || data.phase === "init";
			const error = (account && account.error) || (data && data.error);
			const summary = loading
				? "MiniMax Token Plan 用量读取中"
				: error && !model
					? "MiniMax Token Plan 用量异常：" + error
					: "MiniMax " + (REGION_LABEL[region] || "") + "：5h 剩余 " + formatPercent(model && model.intervalRemainingPercent) + "，7d 剩余 " + formatPercent(model && model.weeklyRemainingPercent) + "；点击刷新";
			const showTooltip = hovered || focused;
			return createElement("span", {
				className: "mxu_inline_host",
				"data-minimax-usage": "true",
				"data-minimax-usage-provider": current && current.provider,
				"data-minimax-usage-region": region,
				onMouseEnter: () => setHovered(true),
				onMouseLeave: () => setHovered(false),
			},
				createElement("button", {
					type: "button",
					className: "mxu_inline",
					"aria-label": summary,
					"aria-busy": busy || loading ? "true" : "false",
					"aria-describedby": showTooltip ? tooltipId : undefined,
					title: summary,
					"data-busy": busy ? "true" : undefined,
					onClick: () => { void load(true); },
					onFocus: () => setFocused(true),
					onBlur: () => setFocused(false),
				},
					createElement("span", { className: "mxu_inline_rows" },
						createElement(CompactQuotaLine, {
							label: "5h",
							percent: model && model.intervalRemainingPercent,
							included: model && model.included,
							loading,
						}),
						createElement(CompactQuotaLine, {
							label: "7d",
							percent: model && model.weeklyRemainingPercent,
							included: model && model.included,
							loading,
						}),
					),
				),
				showTooltip ? createElement(DetailPanel, {
					id: tooltipId,
					data,
					accounts,
					busy,
					region,
				}) : null,
			);
		}

		function apply(ctx) {
			if (!ctx || typeof ctx.inject !== "function") return;
			ctx.inject(["slots", "modelDirectories"], (scope) => {
				if (!scope || !scope.slots || !scope.modelDirectories) return;
				scope.slots.inject("conversation.input.right", () => scope.slots.register({
					name: "conversation.input.right",
					id: "minimax-usage",
					order: 30,
					label: "MiniMax",
					inject: (sessionId) => ({
						directory: scope.modelDirectories.directoryFor(sessionId).store,
					}),
				}, MiniMaxUsageIndicator));
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
