import { describe, expect, it } from "vitest";
import { UsageService } from "../src/service.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("UsageService", () => {
  it("reports unconfigured when no keys exist", async () => {
    const service = new UsageService({ get: () => undefined }, { env: {} });
    const snap = await service.snapshot();
    expect(snap.accounts).toEqual([]);
    expect(snap.error).toMatch(/未配置/);
  });

  it("reuses a successful snapshot inside the cache TTL", async () => {
    let calls = 0;
    const service = new UsageService(
      { get: () => undefined },
      {
        env: { MINIMAX_API_KEY: "sk-global" },
        fetchImpl: async () => {
          calls += 1;
          return jsonResponse({
            model_remains: [
              { model_name: "general", current_interval_remaining_percent: 70 },
            ],
            base_resp: { status_code: 0, status_msg: "success" },
          });
        },
      },
    );
    const first = await service.snapshot(false, "startup");
    const second = await service.snapshot(false, "startup");
    expect(calls).toBe(1);
    expect(first.accounts[0]?.models[0]?.intervalRemainingPercent).toBe(70);
    expect(second.accounts[0]?.models[0]?.intervalRemainingPercent).toBe(70);
  });

  it("force refresh bypasses the cache", async () => {
    let calls = 0;
    const service = new UsageService(
      { get: () => undefined },
      {
        env: { MINIMAX_API_KEY: "sk-global" },
        fetchImpl: async () => {
          calls += 1;
          return jsonResponse({
            model_remains: [
              { model_name: "general", current_interval_remaining_percent: calls === 1 ? 70 : 40 },
            ],
            base_resp: { status_code: 0, status_msg: "success" },
          });
        },
      },
    );
    await service.snapshot();
    const refreshed = await service.snapshot(true);
    expect(calls).toBe(2);
    expect(refreshed.accounts[0]?.models[0]?.intervalRemainingPercent).toBe(40);
  });

  it("keeps the last good snapshot when a later fetch fails", async () => {
    let calls = 0;
    const service = new UsageService(
      { get: () => undefined },
      {
        env: { MINIMAX_CN_API_KEY: "sk-cn" },
        fetchImpl: async () => {
          calls += 1;
          if (calls === 1) {
            return jsonResponse({
              model_remains: [
                { model_name: "general", current_interval_remaining_percent: 88 },
              ],
              base_resp: { status_code: 0, status_msg: "success" },
            });
          }
          return jsonResponse({ error: "boom" }, 500);
        },
      },
    );
    await service.snapshot();
    const failed = await service.snapshot(true);
    expect(failed.accounts[0]?.ok).toBe(true);
    expect(failed.accounts[0]?.stale).toBe(true);
    expect(failed.accounts[0]?.models[0]?.intervalRemainingPercent).toBe(88);
    expect(failed.accounts[0]?.error).toMatch(/可能过期/);
  });
});
