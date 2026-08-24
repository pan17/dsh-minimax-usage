import { describe, expect, it } from "vitest";
import { mapHttpError, normalizeRemainsPayload } from "../src/normalize.js";

const NOW = 1_700_000_000_000;

describe("normalizeRemainsPayload", () => {
  it("reads percent-mode model_remains", () => {
    const account = normalizeRemainsPayload(
      {
        current_subscribe_title: "Plus",
        model_remains: [
          {
            model_name: "general",
            current_interval_remaining_percent: 99,
            current_weekly_remaining_percent: 100,
            remains_time: 3_600_000,
            weekly_remains_time: 86_400_000,
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
      "cn",
      NOW,
    );
    expect(account.ok).toBe(true);
    expect(account.planName).toBe("Plus");
    expect(account.models[0]).toMatchObject({
      name: "general",
      included: true,
      intervalRemainingPercent: 99,
      weeklyRemainingPercent: 100,
      remainsTimeMs: 3_600_000,
      intervalEndAt: NOW + 3_600_000,
    });
  });

  it("treats legacy usage_count as remaining quota", () => {
    const account = normalizeRemainsPayload(
      {
        model_remains: [
          {
            model_name: "general",
            current_interval_total_count: 100,
            current_interval_usage_count: 80,
            current_weekly_total_count: 500,
            current_weekly_usage_count: 400,
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
      "global",
      NOW,
    );
    expect(account.ok).toBe(true);
    expect(account.models[0]?.intervalRemainingPercent).toBe(80);
    expect(account.models[0]?.weeklyRemainingPercent).toBe(80);
  });

  it("prefers remaining_count aliases over usage_count", () => {
    const account = normalizeRemainsPayload(
      {
        model_remains: [
          {
            model_name: "general",
            current_interval_total_count: 100,
            current_interval_usage_count: 80,
            current_interval_remaining_count: 25,
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
      "global",
      NOW,
    );
    expect(account.models[0]?.intervalRemainingPercent).toBe(25);
  });

  it("marks quota 0 models as not included", () => {
    const account = normalizeRemainsPayload(
      {
        model_remains: [
          {
            model_name: "video",
            current_interval_quota: 0,
            current_weekly_quota: 0,
            current_interval_remaining_percent: 0,
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
      "cn",
      NOW,
    );
    expect(account.models[0]?.included).toBe(false);
  });

  it("uses end_time when present", () => {
    const account = normalizeRemainsPayload(
      {
        model_remains: [
          {
            model_name: "general",
            current_interval_remaining_percent: 50,
            end_time: NOW + 120_000,
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
      "global",
      NOW,
    );
    expect(account.models[0]?.intervalEndAt).toBe(NOW + 120_000);
  });

  it("fails on non-zero base_resp", () => {
    const account = normalizeRemainsPayload(
      {
        model_remains: [{ model_name: "general" }],
        base_resp: { status_code: 2013, status_msg: "invalid params" },
      },
      "cn",
    );
    expect(account.ok).toBe(false);
    expect(account.error).toBe("invalid params");
  });

  it("maps cookie / 1004 auth errors to subscription-key hint", () => {
    const account = normalizeRemainsPayload(
      { base_resp: { status_code: 1004, status_msg: "cookie is missing, log in again" } },
      "cn",
    );
    expect(account.ok).toBe(false);
    expect(account.error).toMatch(/订阅 Key/);
  });

  it("fails on empty model_remains", () => {
    const account = normalizeRemainsPayload(
      { model_remains: [], base_resp: { status_code: 0, status_msg: "success" } },
      "global",
    );
    expect(account.ok).toBe(false);
    expect(account.error).toBe("无模型配额数据");
  });

  it("ignores unknown extra fields", () => {
    const account = normalizeRemainsPayload(
      {
        extra_future_field: { nested: true },
        model_remains: [
          {
            model_name: "general",
            current_interval_remaining_percent: 12,
            brand_new_counter: 9,
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
      "global",
      NOW,
    );
    expect(account.ok).toBe(true);
    expect(account.models[0]?.intervalRemainingPercent).toBe(12);
  });
});

describe("mapHttpError", () => {
  it("maps 401/403 to the subscription-key hint", () => {
    expect(mapHttpError(401, {})).toMatch(/订阅 Key/);
    expect(mapHttpError(403, { base_resp: { status_msg: "unauthorized" } })).toMatch(/订阅 Key/);
  });

  it("keeps generic HTTP errors", () => {
    expect(mapHttpError(500, {})).toBe("查询失败 (HTTP 500)");
  });
});
