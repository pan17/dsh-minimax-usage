import { describe, expect, it } from "vitest";
import { configuredRegions, resolveKeys } from "../src/credentials.js";
import type { CredentialsLike } from "../src/types.js";

describe("resolveKeys", () => {
  it("returns nothing when no source is configured", async () => {
    const keys = await resolveKeys(undefined, {});
    expect(keys).toEqual({});
    expect(configuredRegions(keys)).toEqual([]);
  });

  it("reads only the global env key", async () => {
    const keys = await resolveKeys(undefined, { MINIMAX_API_KEY: "sk-global" });
    expect(keys).toEqual({ global: "sk-global" });
    expect(configuredRegions(keys)).toEqual(["global"]);
  });

  it("reads only the CN env key", async () => {
    const keys = await resolveKeys(undefined, { MINIMAX_CN_API_KEY: "sk-cn" });
    expect(keys).toEqual({ cn: "sk-cn" });
    expect(configuredRegions(keys)).toEqual(["cn"]);
  });

  it("reads both keys when both are set", async () => {
    const keys = await resolveKeys(undefined, {
      MINIMAX_API_KEY: "sk-global",
      MINIMAX_CN_API_KEY: "sk-cn",
    });
    expect(keys).toEqual({ global: "sk-global", cn: "sk-cn" });
    expect(configuredRegions(keys)).toEqual(["global", "cn"]);
  });

  it("prefers the credentials seam over process env", async () => {
    const credentials: CredentialsLike = {
      async resolve(ref) {
        if (ref === "MINIMAX_API_KEY") return { value: "from-seam" };
        return undefined;
      },
    };
    const keys = await resolveKeys(credentials, { MINIMAX_API_KEY: "from-env" });
    expect(keys.global).toBe("from-seam");
  });

  it("falls back to env when the seam has no value", async () => {
    const credentials: CredentialsLike = {
      async resolve() {
        return undefined;
      },
    };
    const keys = await resolveKeys(credentials, { MINIMAX_CN_API_KEY: "from-env" });
    expect(keys.cn).toBe("from-env");
  });

  it("treats empty stored values as absent", async () => {
    const credentials: CredentialsLike = {
      async resolve() {
        return { value: "" };
      },
    };
    const keys = await resolveKeys(credentials, {});
    expect(keys).toEqual({});
  });
});
