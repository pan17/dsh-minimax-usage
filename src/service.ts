import { UsageCache } from "./cache.js";
import { configuredRegions, resolveKeys, type ResolvedKeys } from "./credentials.js";
import { fetchRemains, type FetchLike } from "./fetch.js";
import { normalizeRemainsPayload } from "./normalize.js";
import type { AccountSnapshot, CredentialsLike, RefreshReason, Region, UsageSnapshot } from "./types.js";

const UNCONFIGURED =
  "未配置 MiniMax 订阅 Key。请到 设置 → 模型 填写 Token Plan 订阅 Key（MINIMAX_API_KEY / MINIMAX_CN_API_KEY）。";

export interface UsageContext {
  get<T = unknown>(name: string): T | undefined;
}

export class UsageService {
  private readonly cache = new UsageCache();
  private readonly lastOk = new Map<Region, AccountSnapshot>();
  private readonly fetchImpl: FetchLike;
  private readonly env: NodeJS.ProcessEnv;
  private latest: UsageSnapshot | undefined;
  heartbeatMs = 2 * 60 * 1000;

  constructor(
    private readonly ctx: UsageContext,
    options: { fetchImpl?: FetchLike; env?: NodeJS.ProcessEnv } = {},
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.env = options.env ?? process.env;
  }

  /** Cached snapshot only. First call with no cache fetches once (startup). */
  async snapshot(force = false, reason: RefreshReason = force ? "manual" : "startup"): Promise<UsageSnapshot> {
    if (!force && this.latest !== undefined) {
      return { ...this.latest, heartbeatMs: this.heartbeatMs };
    }
    const snap = await this.fetchAll(reason);
    this.latest = snap;
    return snap;
  }

  invalidate(region?: Region): void {
    if (region === undefined) this.cache.clear();
    else {
      const peek = this.cache.peek(region);
      if (peek !== undefined) this.cache.set(region, peek.account, 0);
    }
  }

  dispose(): void {
    this.cache.clear();
    this.lastOk.clear();
    this.latest = undefined;
  }

  private async keys(): Promise<ResolvedKeys> {
    return resolveKeys(this.ctx.get<CredentialsLike>("credentials"), this.env);
  }

  private async fetchAll(reason: RefreshReason): Promise<UsageSnapshot> {
    const keys = await this.keys();
    const regions = configuredRegions(keys);
    if (regions.length === 0) {
      return { fetchedAt: null, error: UNCONFIGURED, reason, heartbeatMs: this.heartbeatMs, accounts: [] };
    }

    const results = await Promise.all(regions.map((region) => this.loadRegion(region, keys, true)));
    const accounts = results.map((item) => item.account);
    const fetchedAt = results.reduce<number | null>((max, item) => {
      if (max === null || item.at > max) return item.at;
      return max;
    }, null);
    return { fetchedAt, reason, heartbeatMs: this.heartbeatMs, accounts };
  }

  private async loadRegion(
    region: Region,
    keys: ResolvedKeys,
    force: boolean,
  ): Promise<{ at: number; account: AccountSnapshot }> {
    const now = Date.now();
    if (!force) {
      const cached = this.cache.get(region, now);
      if (cached !== undefined) return cached;
    }

    const apiKey = keys[region];
    if (apiKey === undefined) {
      return {
        at: now,
        account: { region, configured: false, ok: false, error: UNCONFIGURED, models: [] },
      };
    }

    try {
      const payload = await fetchRemains(region, apiKey, this.fetchImpl);
      const account = normalizeRemainsPayload(payload, region, now);
      if (account.ok) {
        this.cache.set(region, account, now);
        this.lastOk.set(region, account);
      }
      return { at: now, account };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stale = this.lastOk.get(region);
      if (stale !== undefined) {
        return {
          at: this.cache.peek(region)?.at ?? now,
          account: {
            ...stale,
            stale: true,
            error: `可能过期：${message}`,
          },
        };
      }
      return {
        at: now,
        account: { region, configured: true, ok: false, error: message, models: [] },
      };
    }
  }
}
