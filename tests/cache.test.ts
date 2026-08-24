import { describe, expect, it } from "vitest";
import { UsageCache } from "../src/cache.js";
import type { AccountSnapshot } from "../src/types.js";

const account: AccountSnapshot = {
  region: "cn",
  configured: true,
  ok: true,
  models: [{ name: "general", included: true, intervalRemainingPercent: 80 }],
};

describe("UsageCache", () => {
  it("returns a fresh entry inside the TTL", () => {
    const cache = new UsageCache(1000);
    cache.set("cn", account, 10_000);
    expect(cache.get("cn", 10_500)?.account.models[0]?.intervalRemainingPercent).toBe(80);
  });

  it("expires after the TTL", () => {
    const cache = new UsageCache(1000);
    cache.set("cn", account, 10_000);
    expect(cache.get("cn", 11_001)).toBeUndefined();
  });

  it("peek still returns an expired entry", () => {
    const cache = new UsageCache(1000);
    cache.set("cn", account, 10_000);
    expect(cache.peek("cn")?.at).toBe(10_000);
    expect(cache.get("cn", 20_000)).toBeUndefined();
  });

  it("clear drops every region", () => {
    const cache = new UsageCache(1000);
    cache.set("cn", account, 10_000);
    cache.set("global", { ...account, region: "global" }, 10_000);
    cache.clear();
    expect(cache.peek("cn")).toBeUndefined();
    expect(cache.peek("global")).toBeUndefined();
  });
});
