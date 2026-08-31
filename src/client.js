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
		// createPortal lives on react-dom, NOT on react. DeepSeek-pet uses the
		// same require("react-dom") pattern (src/client/DeepSeekPet.jsx:482).
		const reactDom = require("react-dom");
		const createPortal = reactDom.createPortal;

		const inject = ["slots"];
		const POLL_MS = 15000;
		const POS_KEY = "dsh-minimax-usage.pos";
		const BUBBLE = 64;
		const RING = 56;
		const STROKE = 4;
		const RADIUS = (RING - STROKE) / 2;
		const CIRCUM = 2 * Math.PI * RADIUS;
		const MARGIN = 14;
		const GRAD_ID = "mxu-ring-grad";

		const css = [
			// === root + draggable wrapper ===
			".mxu_float{pointer-events:auto;position:fixed;z-index:50;width:" + BUBBLE + "px;height:" + BUBBLE + "px;animation:mxu_in .28s cubic-bezier(.2,.9,.3,1.2)}",
			"@keyframes mxu_in{from{opacity:0;transform:scale(.82)}to{opacity:1;transform:scale(1)}}",

			// === bubble shell ===
			".mxu_bubble{position:relative;width:" + BUBBLE + "px;height:" + BUBBLE + "px;padding:0;border:0;border-radius:50%;cursor:grab;display:grid;place-items:center;user-select:none;touch-action:none;isolation:isolate;",
			// radial gradient: tone-tinted highlight at top-left, deep bg at bottom-right
			"background:radial-gradient(120% 120% at 28% 22%,color-mix(in srgb,var(--mxu-tone) 16%,var(--dsw-alias-bg-overlay,#16181d)) 0%,var(--dsw-alias-bg-overlay,#16181d) 58%,color-mix(in srgb,#000 28%,var(--dsw-alias-bg-overlay,#16181d)) 100%);",
			// layered shadow: drop + tone glow + 1px rim + top sheen + bottom shade
			"box-shadow:0 14px 36px rgba(0,0,0,.30),0 0 0 1px color-mix(in srgb,var(--mxu-tone) 18%,transparent),0 0 28px -4px color-mix(in srgb,var(--mxu-tone) 45%,transparent),inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(0,0,0,.18);",
			"backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);",
			// subtle inner noise overlay for premium texture
			"transition:transform .22s cubic-bezier(.2,.9,.3,1.2),box-shadow .22s ease}",
			// top sheen pseudo-element (cleaner than nested divs)
			".mxu_bubble::before{content:\"\";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(160deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 38%);pointer-events:none;mix-blend-mode:screen}",
			// micro inner ring under the SVG ring for crisp edge
			".mxu_bubble::after{content:\"\";position:absolute;inset:2px;border-radius:inherit;border:1px solid rgba(255,255,255,.05);mask:linear-gradient(#000,#000) content-box,linear-gradient(#000,#000);mask-composite:exclude;-webkit-mask:linear-gradient(#000,#000) content-box,linear-gradient(#000,#000);-webkit-mask-composite:xor;pointer-events:none}",

			// === hover / drag / focus ===
			".mxu_bubble:hover{transform:scale(1.06);box-shadow:0 18px 44px rgba(0,0,0,.36),0 0 0 1px color-mix(in srgb,var(--mxu-tone) 32%,transparent),0 0 36px -2px color-mix(in srgb,var(--mxu-tone) 60%,transparent),inset 0 1px 0 rgba(255,255,255,.14)}",
			".mxu_bubble:active{cursor:grabbing}",
			".mxu_float[data-dragging=true] .mxu_bubble{cursor:grabbing;transform:scale(1.10);transition:none;box-shadow:0 22px 52px rgba(0,0,0,.42),0 0 0 1px color-mix(in srgb,var(--mxu-tone) 38%,transparent),0 0 44px color-mix(in srgb,var(--mxu-tone) 55%,transparent)}",

			// === ring (SVG) ===
			".mxu_ring{position:absolute;inset:4px;width:" + RING + "px;height:" + RING + "px;transform:rotate(-90deg);overflow:visible}",
			".mxu_ring_track{fill:none;stroke:color-mix(in srgb,var(--mxu-tone) 18%,transparent);stroke-width:" + STROKE + "}",
			".mxu_ring_value{fill:none;stroke:url(#" + GRAD_ID + ");stroke-width:" + STROKE + ";stroke-linecap:round;",
			"transition:stroke-dashoffset .55s cubic-bezier(.3,.7,.4,1),stroke .3s ease;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--mxu-tone) 55%,transparent))}",

			// === core (center content) ===
			".mxu_core{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;line-height:1}",
			".mxu_pct{font-size:14px;font-weight:700;letter-spacing:-.045em;font-variant-numeric:tabular-nums;display:inline-flex;align-items:baseline;color:var(--dsw-alias-label-primary,#f4f6f9)}",
			".mxu_pct em{font-style:normal;font-size:8.5px;font-weight:600;opacity:.62;margin-left:1px;align-self:flex-start;margin-top:1.5px}",
			".mxu_pct_dash{font-size:16px;font-weight:700;opacity:.7;letter-spacing:0}",
			".mxu_pct_err{font-size:18px;font-weight:800;line-height:1;color:var(--dsw-alias-state-error-primary,#ef5b5b);filter:drop-shadow(0 0 6px color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef5b5b) 50%,transparent))}",
			".mxu_tag{display:inline-flex;align-items:center;gap:3px;margin-top:2px;font-size:8.5px;font-weight:650;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--dsw-alias-label-secondary,#8b93a1) 90%,transparent)}",
			".mxu_tag::before{content:\"\";width:4px;height:4px;border-radius:50%;background:var(--mxu-tone);box-shadow:0 0 6px var(--mxu-tone);opacity:.85}",

			// === tones (bubble + bar + dot share these) ===
			".mxu_bubble.ok{--mxu-tone:#10b981;--mxu-tone-2:#34d399;--mxu-tone-soft:rgba(16,185,129,.12)}",
			".mxu_bubble.warn{--mxu-tone:#f59e0b;--mxu-tone-2:#fbbf24;--mxu-tone-soft:rgba(245,158,11,.12)}",
			".mxu_bubble.danger{--mxu-tone:#f43f5e;--mxu-tone-2:#fb7185;--mxu-tone-soft:rgba(244,63,94,.12)}",
			".mxu_bubble.muted{--mxu-tone:#64748b;--mxu-tone-2:#94a3b8;--mxu-tone-soft:rgba(100,116,139,.12)}",
			".mxu_bubble.loading{--mxu-tone:#7c8cff;--mxu-tone-2:#a5b4fc;--mxu-tone-soft:rgba(124,140,255,.12);animation:mxu_pulse 2s ease-in-out infinite}",
			"@keyframes mxu_pulse{0%,100%{box-shadow:0 14px 36px rgba(0,0,0,.30),0 0 0 1px color-mix(in srgb,var(--mxu-tone) 18%,transparent),0 0 28px -4px color-mix(in srgb,var(--mxu-tone) 35%,transparent)}50%{box-shadow:0 14px 36px rgba(0,0,0,.30),0 0 0 1px color-mix(in srgb,var(--mxu-tone) 35%,transparent),0 0 44px 4px color-mix(in srgb,var(--mxu-tone) 55%,transparent)}}",

			// === spinner (loading) ===
			".mxu_spin{width:18px;height:18px;border-radius:50%;position:relative}",
			".mxu_spin::before,.mxu_spin::after{content:\"\";position:absolute;inset:0;border-radius:50%;border:2px solid transparent}",
			".mxu_spin::before{border-top-color:var(--mxu-tone);border-right-color:color-mix(in srgb,var(--mxu-tone) 60%,transparent);animation:mxu_spin .9s cubic-bezier(.5,.1,.5,.9) infinite}",
			".mxu_spin::after{border:1px solid color-mix(in srgb,var(--mxu-tone) 20%,transparent);inset:-3px}",
			"@keyframes mxu_spin{to{transform:rotate(360deg)}}",

			// === panel (hover detail) ===
			".mxu_panel{pointer-events:none;position:absolute;width:296px;padding:14px 15px 12px;border-radius:18px;",
			"background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-bg-overlay,#16181d) 94%,transparent),color-mix(in srgb,var(--dsw-alias-bg-overlay,#16181d) 88%,transparent));",
			"color:var(--dsw-alias-label-primary,#e8eaed);",
			// gradient border via mask-composite
			"border:1px solid transparent;",
			"background-clip:padding-box;",
			"box-shadow:0 24px 64px rgba(0,0,0,.42),0 1px 0 rgba(255,255,255,.04) inset;",
			"backdrop-filter:blur(28px) saturate(1.35);-webkit-backdrop-filter:blur(28px) saturate(1.35);",
			"opacity:0;transform:translateY(8px) scale(.96);transform-origin:bottom right;",
			"transition:opacity .18s cubic-bezier(.2,.9,.3,1.1),transform .18s cubic-bezier(.2,.9,.3,1.1);",
			// pseudo border for gradient effect
			"}",
			".mxu_panel::before{content:\"\";position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(140deg,color-mix(in srgb,var(--dsw-alias-border-l1,#fff) 50%,transparent),color-mix(in srgb,var(--mxu-tone,#7c8cff) 28%,transparent) 50%,color-mix(in srgb,var(--dsw-alias-border-l1,#fff) 18%,transparent));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;opacity:.85}",
			".mxu_float:hover .mxu_panel,.mxu_float:focus-within .mxu_panel{opacity:1;transform:none}",
			".mxu_float[data-dragging=true] .mxu_panel{opacity:0;pointer-events:none}",

			// === header ===
			".mxu_head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px}",
			".mxu_brand{display:flex;align-items:center;gap:8px}",
			".mxu_logo{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,var(--mxu-tone,#7c8cff),color-mix(in srgb,var(--mxu-tone,#7c8cff) 50%,#fff));display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;box-shadow:0 4px 10px color-mix(in srgb,var(--mxu-tone,#7c8cff) 45%,transparent),inset 0 1px 0 rgba(255,255,255,.3)}",
			".mxu_title{font-size:13px;font-weight:700;letter-spacing:-.015em}",
			".mxu_sub{font-size:10.5px;color:color-mix(in srgb,var(--dsw-alias-label-secondary,#8b93a1) 92%,transparent);margin-top:1px}",
			".mxu_live{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:550;color:color-mix(in srgb,var(--dsw-alias-label-secondary,#8b93a1) 92%,transparent);white-space:nowrap;padding-top:2px}",
			".mxu_dot{width:7px;height:7px;border-radius:50%;background:var(--mxu-tone);box-shadow:0 0 0 3px color-mix(in srgb,var(--mxu-tone) 18%,transparent),0 0 8px var(--mxu-tone);animation:mxu_blink 2.4s ease-in-out infinite}",
			".mxu_dot.warn{background:var(--dsw-alias-state-warn-primary,#f59e0b);box-shadow:0 0 0 3px color-mix(in srgb,#f59e0b 18%,transparent),0 0 8px #f59e0b}",
			".mxu_dot.danger{background:#f43f5e;box-shadow:0 0 0 3px color-mix(in srgb,#f43f5e 18%,transparent),0 0 8px #f43f5e}",
			"@keyframes mxu_blink{0%,100%{opacity:1}50%{opacity:.55}}",

			// === error / empty ===
			".mxu_err{display:flex;gap:6px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,#f43f5e 12%,transparent);border:1px solid color-mix(in srgb,#f43f5e 22%,transparent);color:#fda4af;font-size:11px;line-height:1.5;margin:0 0 10px}",
			".mxu_err::before{content:\"⚠\";font-size:11px;line-height:1;margin-top:1px;flex:none}",
			".mxu_empty{padding:18px 4px;text-align:center;font-size:11px;color:color-mix(in srgb,var(--dsw-alias-label-secondary,#8b93a1) 92%,transparent)}",
			".mxu_empty .mxu_spin{display:inline-block;margin-bottom:8px}",

			// === account card ===
			".mxu_acc{position:relative;padding:9px 11px 10px 14px;margin-top:8px;border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-overlay,#16181d) 50%,transparent);",
			"border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,#fff) 8%,transparent);transition:background .18s ease,border-color .18s ease}",
			".mxu_acc:first-of-type{margin-top:0}",
			".mxu_acc:hover{background:color-mix(in srgb,var(--dsw-alias-bg-overlay,#16181d) 70%,transparent);border-color:color-mix(in srgb,var(--mxu-tone,#7c8cff) 22%,transparent)}",
			// left accent stripe
			".mxu_acc::before{content:\"\";position:absolute;left:4px;top:10px;bottom:10px;width:2.5px;border-radius:2px;background:linear-gradient(180deg,var(--mxu-tone,#7c8cff),color-mix(in srgb,var(--mxu-tone,#7c8cff) 30%,transparent));box-shadow:0 0 8px color-mix(in srgb,var(--mxu-tone,#7c8cff) 50%,transparent)}",
			".mxu_acc.ok{--mxu-tone:#10b981}",
			".mxu_acc.warn{--mxu-tone:#f59e0b}",
			".mxu_acc.danger{--mxu-tone:#f43f5e}",
			".mxu_acc.muted{--mxu-tone:#64748b}",
			".mxu_acc.loading{--mxu-tone:#7c8cff}",
			".mxu_acc_head{display:flex;align-items:center;gap:6px;margin-bottom:8px}",
			".mxu_chip{font-size:9.5px;font-weight:700;padding:2.5px 7px;border-radius:999px;background:color-mix(in srgb,var(--mxu-tone,#7c8cff) 14%,transparent);color:var(--mxu-tone,#7c8cff);letter-spacing:.02em}",
			".mxu_acc_name{font-size:12px;font-weight:650;letter-spacing:-.005em;display:flex;align-items:center;gap:6px}",
			".mxu_stale{font-size:9px;font-weight:600;padding:1px 5px;border-radius:4px;background:color-mix(in srgb,#f59e0b 14%,transparent);color:#fbbf24;letter-spacing:.02em}",

			// === model rows ===
			".mxu_model{margin-bottom:9px}",
			".mxu_model:last-child{margin-bottom:0}",
			".mxu_model_name{font-size:10.5px;font-weight:650;margin-bottom:6px;color:color-mix(in srgb,var(--dsw-alias-label-secondary,#8b93a1) 88%,transparent);letter-spacing:.01em;text-transform:uppercase}",
			".mxu_row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;margin-bottom:4px}",
			".mxu_row span{color:color-mix(in srgb,var(--dsw-alias-label-secondary,#8b93a1) 92%,transparent)}",
			".mxu_row b{font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em;color:var(--dsw-alias-label-primary,#f4f6f9)}",

			// === bar ===
			".mxu_bar{position:relative;height:5px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-secondary,#888) 14%,transparent);overflow:hidden;margin-bottom:9px}",
			".mxu_bar:last-child{margin-bottom:0}",
			".mxu_bar_fill{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--mxu-tone),var(--mxu-tone-2,var(--mxu-tone)));position:relative;overflow:hidden;transition:width .5s cubic-bezier(.3,.7,.4,1)}",
			".mxu_bar_fill::after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-100%);animation:mxu_shimmer 2.2s ease-in-out infinite}",
			"@keyframes mxu_shimmer{0%{transform:translateX(-100%)}60%,100%{transform:translateX(120%)}}",
			".mxu_bar.ok{--mxu-tone:#10b981;--mxu-tone-2:#34d399}",
			".mxu_bar.warn{--mxu-tone:#f59e0b;--mxu-tone-2:#fbbf24}",
			".mxu_bar.danger{--mxu-tone:#f43f5e;--mxu-tone-2:#fb7185}",
			".mxu_bar.muted{--mxu-tone:#64748b;--mxu-tone-2:#94a3b8}",
			".mxu_bar.dim{opacity:.55}",

			// === hint footer ===
			".mxu_hint{margin-top:10px;padding-top:9px;border-top:1px dashed color-mix(in srgb,var(--dsw-alias-border-l1,#fff) 14%,transparent);font-size:10px;color:color-mix(in srgb,var(--dsw-alias-label-secondary,#8b93a1) 86%,transparent);line-height:1.55;display:flex;align-items:center;gap:6px}",
			".mxu_hint::before{content:\"\";width:5px;height:5px;border-radius:50%;background:var(--mxu-tone,#7c8cff);flex:none;opacity:.7}",

			// === refresh feedback (manual click on the bubble) ===
			// Vibrant indigo tone + glow while busy, regardless of underlying data tone.
			".mxu_bubble[data-busy=\"true\"] .mxu_spin::before{border-top-color:#818cf8;border-right-color:color-mix(in srgb,#818cf8 60%,transparent)}",
			".mxu_bubble[data-busy=\"true\"] .mxu_spin::after{border:1px solid color-mix(in srgb,#818cf8 28%,transparent)}",
			".mxu_bubble[data-busy=\"true\"] .mxu_ring_value{filter:drop-shadow(0 0 7px color-mix(in srgb,#818cf8 65%,transparent))}",
			".mxu_bubble[data-busy=\"true\"]{box-shadow:0 14px 36px rgba(0,0,0,.30),0 0 0 1px color-mix(in srgb,#818cf8 32%,transparent),0 0 38px -4px color-mix(in srgb,#818cf8 60%,transparent),inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(0,0,0,.18)}",
			".mxu_bubble[data-busy=\"true\"]::before{background:linear-gradient(160deg,rgba(129,140,248,.20) 0%,rgba(129,140,248,0) 40%)}",

			// Brief green pulse on successful refresh completion.
			".mxu_bubble[data-success=\"true\"]{animation:mxu_success_glow .9s cubic-bezier(.2,.9,.3,1.2)}",
			"@keyframes mxu_success_glow{0%{box-shadow:0 14px 36px rgba(0,0,0,.30),0 0 0 1px color-mix(in srgb,#10b981 18%,transparent),0 0 28px -4px color-mix(in srgb,#10b981 45%,transparent),inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(0,0,0,.18)}35%{box-shadow:0 14px 36px rgba(0,0,0,.30),0 0 0 2px color-mix(in srgb,#10b981 65%,transparent),0 0 56px color-mix(in srgb,#10b981 75%,transparent),inset 0 1px 0 rgba(255,255,255,.16)}100%{box-shadow:0 14px 36px rgba(0,0,0,.30),0 0 0 1px color-mix(in srgb,var(--mxu-tone) 18%,transparent),0 0 28px -4px color-mix(in srgb,var(--mxu-tone) 45%,transparent),inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(0,0,0,.18)}}",

			// Live label switches to the refreshing tone and the dot pulses faster.
			".mxu_live.refreshing{color:var(--mxu-tone,#818cf8)}",
			".mxu_live.refreshing .mxu_dot{animation:mxu_dot_blink .7s ease-in-out infinite}",
			"@keyframes mxu_dot_blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.82)}}",

			// Tiny inline spinner that can sit next to the live label.
			".mxu_inline_spin{display:inline-block;width:9px;height:9px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--mxu-tone,#818cf8) 28%,transparent);border-top-color:var(--mxu-tone,#818cf8);animation:mxu_spin .8s linear infinite;margin-left:3px;vertical-align:-1px}",

			// Top-of-panel shimmer bar visible only during refresh.
			".mxu_panel_refresh{position:absolute;top:0;left:14px;right:14px;height:2px;border-radius:0 0 2px 2px;background:linear-gradient(90deg,transparent 0%,var(--mxu-tone,#818cf8) 50%,transparent 100%);opacity:0;transform:translateX(-100%);transition:opacity .2s ease;pointer-events:none}",
			".mxu_panel_refresh.busy{opacity:.9;animation:mxu_panel_shimmer 1.1s cubic-bezier(.4,0,.6,1) infinite}",
			"@keyframes mxu_panel_shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}",

			// Slightly more energetic empty-state when a manual refresh is mid-flight.
			".mxu_empty.refreshing .mxu_spin{border-top-color:var(--mxu-tone,#818cf8);border-right-color:color-mix(in srgb,#818cf8 60%,transparent)}",
			".mxu_empty.refreshing div{color:color-mix(in srgb,var(--mxu-tone,#818cf8) 35%,var(--dsw-alias-label-secondary,#8b93a1))}",
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
			return Math.round(percent);
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
				top: Math.max(MARGIN, height - BUBBLE - 96),
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
				createElement("defs", null,
					createElement("linearGradient", { id: GRAD_ID, x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
						createElement("stop", { offset: "0%", style: { stopColor: "var(--mxu-tone)" } }),
						createElement("stop", { offset: "100%", style: { stopColor: "var(--mxu-tone-2)" } }),
					),
				),
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
			const value = props.included === false ? "未包含" : (Math.round(props.percent) + "%");
			const reset = props.included === false ? "" : props.reset;
			return createElement("div", { className: "mxu_bar-wrap" },
				createElement("div", { className: "mxu_row" },
					createElement("span", null, props.label + (reset ? " · " + reset : "")),
					createElement("b", null, value),
				),
				createElement("div", { className: "mxu_bar " + tone + (props.included === false ? " dim" : "") },
					createElement("span", { className: "mxu_bar_fill", style: { width: width + "%" } }),
				),
			);
		}

		function accountTone(account) {
			if (!account || !account.ok) return "danger";
			if (account.stale) return "warn";
			const primary = (account.models || []).find((m) => m.included !== false);
			if (!primary) return "muted";
			return toneOf(primary.intervalRemainingPercent);
		}

		function UsageBubble() {
			const { data, busy, load, tick } = useUsage(true);
			void tick;
			const [pos, setPos] = react.useState(defaultPos);
			const [dragging, setDragging] = react.useState(false);
			const [mounted, setMounted] = react.useState(false);
			const [success, setSuccess] = react.useState(false);
			const drag = react.useRef(null);
			const prevBusy = react.useRef(false);

			// Trigger the success glow when a manual refresh completes.
			react.useEffect(() => {
				if (prevBusy.current && !busy) {
					setSuccess(true);
					const timer = setTimeout(() => setSuccess(false), 950);
					prevBusy.current = false;
					return () => clearTimeout(timer);
				}
				prevBusy.current = busy;
			}, [busy]);

			react.useEffect(() => {
				setPos(loadPos());
				const id = requestAnimationFrame(() => setMounted(true));
				return () => cancelAnimationFrame(id);
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
			const isLoading = !data || data.phase === "init";
			const failed = !isLoading && !!(data && (data.error || accountError) && !accounts.some((a) => a && a.ok));
			const tone = isLoading ? "loading" : (failed ? "danger" : toneOf(percent));
			const short = primary ? Math.round(percent) : (failed ? "!" : null);
			const title = primary
				? ("MiniMax 5h 剩余 " + formatPercent(percent) + "%")
				: (isLoading ? "MiniMax 加载中" : (data && data.error ? data.error : (accountError || "MiniMax 未配置")));
			const liveLabel = isLoading ? "加载中" : (failed ? "异常" : (busy ? "刷新中" : "自动刷新"));
			const dotTone = failed ? "danger" : (busy ? "warn" : "ok");
			const isRefreshing = busy || isLoading;

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
				if (!state.moved) {
					load(true);
				}
			};

			const core = busy
				? createElement("span", { className: "mxu_spin", key: "spin" })
				: isLoading && !primary
					? createElement("span", { className: "mxu_spin", key: "spin" })
					: failed
						? createElement("span", { className: "mxu_pct_err", key: "err" }, "!")
						: short !== null && short !== undefined
							? createElement("span", { className: "mxu_pct", key: "pct" },
								short,
								createElement("em", null, "%"),
							)
							: createElement("span", { className: "mxu_pct mxu_pct_dash", key: "dash" }, "—");

			const wrapper = createElement("div", {
				className: "mxu_float" + (mounted ? "" : " mxu_pre"),
				"data-dragging": dragging ? "true" : undefined,
				style: { left: pos.left + "px", top: pos.top + "px" },
			},
				createElement("button", {
					type: "button",
					className: "mxu_bubble " + tone,
					title: title + " · 悬停看详情 · 拖动换位置 · 点击刷新",
					"aria-label": title,
					"data-busy": busy ? "true" : undefined,
					"data-success": success ? "true" : undefined,
					onPointerDown,
					onPointerMove,
					onPointerUp,
					onPointerCancel: onPointerUp,
				},
					createElement(Ring, { percent: failed ? 0 : percent }),
					createElement("span", { className: "mxu_core" },
						core,
						createElement("span", { className: "mxu_tag" }, "5h"),
					),
				),
				createElement("div", { className: "mxu_panel", style: panelStyle },
					createElement("div", { className: "mxu_panel_refresh" + (busy ? " busy" : ""), "aria-hidden": "true" }),
					createElement("div", { className: "mxu_head" },
						createElement("div", { className: "mxu_brand" },
							createElement("span", { className: "mxu_logo", "aria-hidden": "true" }, "M"),
							createElement("div", null,
								createElement("div", { className: "mxu_title" }, "MiniMax"),
								createElement("div", { className: "mxu_sub" }, "Token Plan 用量"),
							),
						),
						createElement("span", { className: "mxu_live" + (busy ? " refreshing" : "") },
							createElement("span", { className: "mxu_dot " + dotTone }),
							liveLabel + (data && data.fetchedAt && !busy && !isLoading ? " · " + formatFetchedAt(data.fetchedAt) : ""),
							busy ? createElement("span", { className: "mxu_inline_spin", "aria-hidden": "true" }) : null,
						),
					),
					data && data.error ? createElement("div", { className: "mxu_err" }, data.error) : null,
					accounts.length === 0 && !(data && data.error)
						? createElement("div", { className: "mxu_empty" + (busy ? " refreshing" : "") },
							(isLoading || busy) ? createElement("span", { className: "mxu_spin" }) : null,
							createElement("div", null,
								busy ? "正在刷新用量…"
								: isLoading ? "正在拉取用量…"
								: "暂无可用账号"
							),
						)
						: null,
					accounts.map((account) => createElement("div", {
					className: "mxu_acc " + accountTone(account),
					key: account.region,
				},
						createElement("div", { className: "mxu_acc_head" },
							createElement("span", { className: "mxu_chip" }, REGION_LABEL[account.region] || account.region),
							createElement("span", { className: "mxu_acc_name" },
								account.planName || "订阅套餐",
								account.stale ? createElement("span", { className: "mxu_stale" }, "可能过期") : null,
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
					accounts.length > 0 ? createElement("div", { className: "mxu_hint" }, "整轮空闲 15 秒后更新 · 心跳 2 分钟起翻倍 · 点击立即刷新") : null,
				),
			);
		return createPortal(wrapper, document.body);
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