import { describe, expect, it } from "vitest";
import { describeFetchError, fetchRemains } from "../src/fetch.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchRemains", () => {
  it("falls back to the next host when the first request cannot connect", async () => {
    const seen: string[] = [];
    const payload = {
      model_remains: [{ model_name: "general", current_interval_remaining_percent: 42 }],
      base_resp: { status_code: 0, status_msg: "success" },
    };
    const body = await fetchRemains("cn", "sk-test", async (url) => {
      seen.push(url);
      if (url.includes("api.minimaxi.com")) {
        throw Object.assign(new Error("fetch failed"), { cause: new Error("unable to get local issuer certificate") });
      }
      return jsonResponse(payload);
    });
    expect(seen[0]).toContain("api.minimaxi.com");
    expect(seen[1]).toContain("www.minimaxi.com");
    expect(body).toEqual(payload);
  });

  it("does not fall back on an auth failure", async () => {
    const seen: string[] = [];
    await expect(
      fetchRemains("cn", "sk-test", async (url) => {
        seen.push(url);
        return jsonResponse({ base_resp: { status_code: 1004, status_msg: "unauthorized" } }, 401);
      }),
    ).rejects.toThrow(/订阅 Key/);
    expect(seen).toHaveLength(1);
  });
});

describe("describeFetchError", () => {
  it("rewrites a bare fetch failed error", () => {
    const err = Object.assign(new Error("fetch failed"), { cause: new Error("unable to get local issuer certificate") });
    expect(describeFetchError(err)).toMatch(/证书/);
  });
});
