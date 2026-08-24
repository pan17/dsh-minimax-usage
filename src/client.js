/**
 * dsh-minimax-usage client half — draggable floating bubble on shell.overlay.
 *
 * Authored directly in the DSH client module format (window.__ModuleLoader__),
 * the same delivery shape as dsh-wechat. Communicates with the host through
 * the plugin's own HTTP API (/minimax-usage/api/*).
 */
window.__ModuleLoader__.load({
	id: "dsh-minimax-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const createElement = react.createElement;

		const inject = ["slots"];
		const POLL_MS = 15000;
		const POS_KEY = "dsh-minimax-usage.pos";
		const BUBBLE = 58;
		const RING = 52;
		const STROKE = 3.5;
		const RADIUS = (RING - STROKE) / 2;
		const CIRCUM = 2 * Math.PI * RADIUS;
		const MARGIN = 16;

		const css = [
			".mxu_float{pointer-events:auto;position:absolute;z-index:30;width:" + BUBBLE + "px;height:" + BUBBLE + "px}",
			".mxu_bubble{appearance:none;width:" + BUBBLE + "px;height:" + BUBBLE + "px;padding:0;border:0;border-radius:50%;background:color-mix(in srgb, var(--dsw-alias-bg-overlay, #16181d) 86%, transparent);color:var(--dsw-alias-label-primary,#e8eaed);box-shadow:0 10px 28px rgba(0,0,0,.22),0 0 0 1px color-mix(in srgb, var(--dsw-alias-border-l1,#fff) 55%, transparent),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);cursor:grab;display:grid;place-items:center;user-select:none;touch-action:none;transition:transform .18s ease,box-shadow .18s ease}",
			".mxu_bubble:hover{transform:scale(1.05);box-shadow:0 14px 34px rgba(0,0,0,.28),0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary,#7c8cff) 35%, transparent),inset 0 1px 0 rgba(255,255,255,.1)}",
			".mxu_float[data-dragging=true] .mxu_bubble{cursor:grabbing;transform:scale(1.08);transition:none}",
			".mxu_ring{position:absolute;inset:3px;width:" + RING + "px;height:" + RING + "px;transform:rotate(-90deg)}",
			".mxu_ring_track{fill:none;stroke:color-mix(in srgb, var(--dsw-alias-label-secondary,#888) 22%, transparent);stroke-width:" + STROKE + "}",
			".mxu_ring_value{fill:none;stroke:var(--mxu-tone, var(--dsw-alias-brand-primary,#7c8cff));stroke-width:" + STROKE + ";stroke-linecap:round;transition:stroke-dashoffset .5s ease,stroke .3s ease}",
			".mxu_core{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1}",
			".mxu_pct{font-size:13px;font-weight:650;letter-spacing:-.03em;font-variant-numeric:tabular-nums;display:inline-flex;align-items:baseline;gap:1px}",
			".mxu_unit{font-size:8px;font-weight:600;opacity:.65;letter-spacing:0;align-self:start;margin-top:1px}",
			".mxu_tag{font-size:8px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#8b93a1)}",
			".mxu_bubble.ok{--mxu-tone:var(--dsw-alias-state-success-primary,#3dbe73)}",
			".mxu_bubble.warn{--mxu-tone:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".mxu_bubble.danger{--mxu-tone:var(--dsw-alias-state-error-primary,#ef5b5b)}",
			".mxu_bubble.muted{--mxu-tone:var(--dsw-alias-label-secondary,#8b93a1)}",
			".mxu_spin{width:14px;height:14px;border:1.5px solid color-mix(in srgb, var(--dsw-alias-label-secondary,#888) 35%, transparent);border-top-color:var(--dsw-alias-brand-primary,#7c8cff);border-radius:50%;animation:mxu_spin .7s linear infinite}",
			"@keyframes mxu_spin{to{transform:rotate(360deg)}}",
			".mxu_panel{pointer-events:none;position:absolute;width:276px;padding:12px 13px 11px;border-radius:16px;background:color-mix(in srgb, var(--dsw-alias-bg-overlay,#16181d) 92%, transparent);color:var(--dsw-alias-label-primary,#e8eaed);border:1px solid color-mix(in srgb, var(--dsw-alias-border-l1,#fff) 65%, transparent);box-shadow:0 18px 48px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(22px) saturate(1.25);-webkit-backdrop-filter:blur(22px) saturate(1.25);opacity:0;transform:translateY(6px) scale(.98);transform-origin:bottom right;transition:opacity .16s ease,transform .16s ease}",
			".mxu_float:hover .mxu_panel,.mxu_float:focus-within .mxu_panel{opacity:1;transform:none}",
			".mxu_float[data-dragging=true] .mxu_panel{opacity:0;pointer-events:none}",
			".mxu_head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}",
			".mxu_brand{display:flex;flex-direction:column;gap:2px}",
			".mxu_title{font-size:13px;font-weight:650;letter-spacing:-.01em}",
			".mxu_sub{font-size:11px;color:var(--dsw-alias-label-secondary,#8b93a1)}",
			".mxu_live{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:var(--dsw-alias-label-secondary,#8b93a1);white-space:nowrap}",
			".mxu_dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3dbe73);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary,#3dbe73) 22%, transparent)}",
			".mxu_dot.warn{background:var(--dsw-alias-state-warn-primary,#e3a008);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-warn-primary,#e3a008) 22%, transparent)}",
			".mxu_dot.danger{background:var(--dsw-alias-state-error-primary,#ef5b5b);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-error-primary,#ef5b5b) 22%, transparent)}",
			".mxu_err{color:var(--dsw-alias-state-error-primary,#ef5b5b);font-size:11px;line-height:1.45;margin:2px 0 8px}",
			".mxu_acc{padding:9px 0 2px;border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l1,#fff) 55%, transparent)}",
			".mxu_acc:first-of-type{border-top:none;padding-top:0}",
			".mxu_acc_head{display:flex;align-items:center;gap:6px;margin-bottom:8px}",
			".mxu_chip{font-size:10px;font-weight:650;padding:2px 7px;border-radius:999px;background:color-mix(in srgb, var(--dsw-alias-brand-primary,#7c8cff) 14%, transparent);color:var(--dsw-alias-brand-primary,#7c8cff)}",
			".mxu_acc_name{font-size:12px;font-weight:600}",
			".mxu_model{margin-bottom:8px}",
			".mxu_model:last-child{margin-bottom:0}",
			".mxu_model_name{font-size:11px;font-weight:600;margin-bottom:5px;color:var(--dsw-alias-label-secondary,#8b93a1)}",
			".mxu_row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;margin-bottom:3px}",
			".mxu_row b{font-weight:650;font-variant-numeric:tabular-nums}",
			".mxu_bar{height:4px;border-radius:999px;background:color-mix(in srgb, var(--dsw-alias-label-secondary,#888) 16%, transparent);overflow:hidden}",
			".mxu_bar_fill{display:block;height:100%;border-radius:inherit;background:var(--mxu-tone, var(--dsw-alias-brand-primary,#7c8cff));transition:width .4s ease}",
			".mxu_bar.ok{--mxu-tone:var(--dsw-alias-state-success-primary,#3dbe73)}",
			".mxu_bar.warn{--mxu-tone:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".mxu_bar.danger{--mxu-tone:var(--dsw-alias-state-error-primary,#ef5b5b)}",
			".mxu_bar.muted{--mxu-tone:var(--dsw-alias-label-secondary,#8b93a1)}",
			".mxu_hint{margin-top:8px;font-size:10px;color:var(--dsw-alias-label-secondary,#8b93a1)}",
		].join("");

		if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="dsh-minimax-usage"]') === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-minimax-usage";
			tag.dataset.pluginCss = "dsh-minimax-usage";
			tag.textContent = css;
			document.head.appendChild(tag);
		} else if (typeof document !== "undefined") {
			const existing = document.querySelector('style[data-plugin-css="dsh-minimax-usage"]');
			if (existing) existing.textContent = css;
		}

		const REGION_LABEL = { global: "国际站", cn: "国内站" };

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

		function toneOf(percent) {
			if (percent === undefined || percent === null || Number.isNaN(percent)) return "muted";
			if (percent < 10) return "danger";
			if (percent < 30) return "warn";
			return "ok";
		}

		function formatPercent(percent) {
			if (percent === undefined || percent === null || Number.isNaN(percent)) return "—";
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

		function pickPrimaryModel(accounts) {
			for (const account of accounts || []) {
				if (!account || !account.ok || !account.models) continue;
				const general = account.models.find((m) => m.included !== false && String(m.name).toLowerCase() === "general");
				const first = account.models.find((m) => m.included !== false) || account.models[0];
				const model = general || first;
				if (model) return { account, model };
			}
			return null;
		}

		function defaultPos() {
			const width = typeof window === "undefined" ? 1200 : window.innerWidth;
			const height = typeof window === "undefined" ? 800 : window.innerHeight;
			return {
				left: Math.max(MARGIN, width - BUBBLE - 24),
				top: Math.max(MARGIN, height - BUBBLE - 88),
			};
		}

		function loadPos() {
			try {
				const raw = localStorage.getItem(POS_KEY);
				if (!raw) return defaultPos();
				const parsed = JSON.parse(raw);
				if (typeof parsed.left !== "number" || typeof parsed.top !== "number") return defaultPos();
				return clampPos(parsed);
			} catch {
				return defaultPos();
			}
		}

		function savePos(pos) {
			try {
				localStorage.setItem(POS_KEY, JSON.stringify(pos));
			} catch {
				// ignore quota / private mode
			}
		}

		function clampPos(pos) {
			const width = typeof window === "undefined" ? 1200 : window.innerWidth;
			const height = typeof window === "undefined" ? 800 : window.innerHeight;
			return {
				left: Math.min(Math.max(MARGIN, pos.left), Math.max(MARGIN, width - BUBBLE - MARGIN)),
				top: Math.min(Math.max(MARGIN, pos.top), Math.max(MARGIN, height - BUBBLE - MARGIN)),
			};
		}

		function useUsage(poll) {
			const [data, setData] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [tick, setTick] = react.useState(0);

			const load = react.useCallback((force) => {
				if (force) setBusy(true);
				return api(force ? "/refresh" : "/status", force ? { method: "POST" } : undefined)
					.then((r) => {
						if (r.body && typeof r.body === "object") setData(r.body);
					})
					.catch(() => {})
					.finally(() => { if (force) setBusy(false); });
			}, []);

			react.useEffect(() => {
				load(false);
			}, [load]);

			react.useEffect(() => {
				if (!poll) return undefined;
				const id = setInterval(() => load(false), POLL_MS);
				const onVis = () => {
					if (document.visibilityState === "visible") load(false);
				};
				document.addEventListener("visibilitychange", onVis);
				return () => {
					clearInterval(id);
					document.removeEventListener("visibilitychange", onVis);
				};
			}, [poll, load]);

			react.useEffect(() => {
				const id = setInterval(() => setTick((n) => n + 1), 30000);
				return () => clearInterval(id);
			}, []);

			return { data, busy, load, tick };
		}

		function Ring(props) {
			const raw = typeof props.percent === "number" && !Number.isNaN(props.percent) ? props.percent : 0;
			const offset = CIRCUM * (1 - Math.max(0, Math.min(100, raw)) / 100);
			return createElement("svg", {
				className: "mxu_ring",
				viewBox: "0 0 " + RING + " " + RING,
				"aria-hidden": "true",
			},
				createElement("circle", {
					className: "mxu_ring_track",
					cx: RING / 2,
					cy: RING / 2,
					r: RADIUS,
				}),
				createElement("circle", {
					className: "mxu_ring_value",
					cx: RING / 2,
					cy: RING / 2,
					r: RADIUS,
					strokeDasharray: String(CIRCUM),
					strokeDashoffset: String(offset),
				}),
			);
		}

		function BarLine(props) {
			const tone = props.included === false ? "muted" : toneOf(props.percent);
			const width = props.included === false ? 0 : Math.max(0, Math.min(100, props.percent ?? 0));
			const value = props.included === false ? "未包含" : formatPercent(props.percent);
			const reset = props.included === false ? "" : props.reset;
			return createElement("div", { style: { marginBottom: "7px" } },
				createElement("div", { className: "mxu_row" },
					createElement("span", null, props.label + (reset ? " · " + reset : "")),
					createElement("b", null, value),
				),
				createElement("div", { className: "mxu_bar " + tone },
					createElement("span", { className: "mxu_bar_fill", style: { width: width + "%" } }),
				),
			);
		}

		function UsageBubble() {
			const { data, busy, load, tick } = useUsage(true);
			void tick;
			const [pos, setPos] = react.useState(defaultPos);
			const [dragging, setDragging] = react.useState(false);
			const drag = react.useRef(null);

			react.useEffect(() => {
				setPos(loadPos());
			}, []);

			react.useEffect(() => {
				const onResize = () => setPos((current) => clampPos(current));
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
			}, []);

			const accounts = (data && data.accounts) || [];
			const primary = pickPrimaryModel(accounts);
			const percent = primary && primary.model ? primary.model.intervalRemainingPercent : undefined;
			const accountError = (accounts.find((a) => a && a.error) || {}).error;
			const failed = !!(data && (data.error || accountError) && !accounts.some((a) => a && a.ok));
			const tone = failed ? "danger" : toneOf(percent);
			const short = primary ? String(Math.round(percent)) : (failed ? "!" : "");
			const title = primary
				? ("MiniMax 5h 剩余 " + formatPercent(percent))
				: (data && data.error ? data.error : (accountError || "MiniMax 未配置"));
			const liveLabel = failed ? "异常" : (busy ? "刷新中" : "自动刷新");

			const panelLeft = pos.left > (typeof window === "undefined" ? 600 : window.innerWidth / 2);
			const panelTop = pos.top > (typeof window === "undefined" ? 400 : window.innerHeight / 2);
			const panelStyle = {
				left: panelLeft ? "auto" : "0",
				right: panelLeft ? "0" : "auto",
				top: panelTop ? "auto" : (BUBBLE + 10) + "px",
				bottom: panelTop ? (BUBBLE + 10) + "px" : "auto",
				transformOrigin: (panelTop ? "bottom" : "top") + " " + (panelLeft ? "right" : "left"),
			};

			const onPointerDown = (event) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					left: pos.left,
					top: pos.top,
					moved: false,
				};
				setDragging(true);
			};

			const onPointerMove = (event) => {
				const state = drag.current;
				if (!state || event.pointerId !== state.pointerId) return;
				const next = clampPos({
					left: state.left + (event.clientX - state.startX),
					top: state.top + (event.clientY - state.startY),
				});
				if (Math.abs(event.clientX - state.startX) > 3 || Math.abs(event.clientY - state.startY) > 3) {
					state.moved = true;
				}
				setPos(next);
			};

			const onPointerUp = (event) => {
				const state = drag.current;
				if (!state || event.pointerId !== state.pointerId) return;
				drag.current = null;
				setDragging(false);
				setPos((current) => {
					const next = clampPos(current);
					savePos(next);
					return next;
				});
				if (!state.moved) load(true);
			};

			return createElement("div", {
				className: "mxu_float",
				"data-dragging": dragging ? "true" : undefined,
				style: { left: pos.left + "px", top: pos.top + "px" },
			},
				createElement("button", {
					type: "button",
					className: "mxu_bubble " + tone,
					title: title + " · 悬停看详情 · 拖动换位置 · 点击刷新",
					onPointerDown,
					onPointerMove,
					onPointerUp,
					onPointerCancel: onPointerUp,
				},
					createElement(Ring, { percent: failed ? 0 : percent }),
					createElement("span", { className: "mxu_core" },
						busy && !primary
							? createElement("span", { className: "mxu_spin" })
							: short
								? createElement("span", { className: "mxu_pct" },
										short,
										createElement("span", { className: "mxu_unit" }, "%"),
									)
								: createElement("span", { className: "mxu_pct" }, "—"),
						createElement("span", { className: "mxu_tag" }, "5h"),
					),
				),
				createElement("div", { className: "mxu_panel", style: panelStyle },
					createElement("div", { className: "mxu_head" },
						createElement("div", { className: "mxu_brand" },
							createElement("span", { className: "mxu_title" }, "MiniMax"),
							createElement("span", { className: "mxu_sub" }, "Token Plan 用量"),
						),
						createElement("span", { className: "mxu_live" },
							createElement("span", { className: "mxu_dot " + (failed ? "danger" : (busy ? "warn" : "ok")) }),
							liveLabel + (data && data.fetchedAt && !busy ? " · " + formatFetchedAt(data.fetchedAt) : ""),
						),
					),
					data && data.error ? createElement("div", { className: "mxu_err" }, data.error) : null,
					accounts.length === 0 && !(data && data.error)
						? createElement("div", { className: "mxu_sub" }, "正在读取用量…")
						: null,
					accounts.map((account) => createElement("div", { className: "mxu_acc", key: account.region },
						createElement("div", { className: "mxu_acc_head" },
							createElement("span", { className: "mxu_chip" }, REGION_LABEL[account.region] || account.region),
							createElement("span", { className: "mxu_acc_name" },
								(account.planName || "订阅套餐") + (account.stale ? " · 可能过期" : ""),
							),
						),
						account.error ? createElement("div", { className: "mxu_err" }, account.error) : null,
						(account.models || []).map((model) => createElement("div", { className: "mxu_model", key: model.name },
							createElement("div", { className: "mxu_model_name" }, model.name),
							createElement(BarLine, {
								label: "5 小时窗口",
								percent: model.intervalRemainingPercent,
								reset: formatCountdown(model.intervalEndAt),
								included: model.included,
							}),
							createElement(BarLine, {
								label: "本周窗口",
								percent: model.weeklyRemainingPercent,
								reset: formatCountdown(model.weeklyEndAt),
								included: model.included,
							}),
						)),
					)),
					createElement("div", { className: "mxu_hint" }, "整轮空闲 15 秒后更新 · 心跳 2 分钟起翻倍 · 点击立即刷新"),
				),
			);
		}

		function apply(ctx) {
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "minimax-usage",
				order: 40,
				label: "MiniMax",
			}, UsageBubble));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
