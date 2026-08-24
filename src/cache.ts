import { CACHE_TTL_MS, type AccountSnapshot, type Region } from "./types.js";

interface CacheEntry {
  at: number;
  account: AccountSnapshot;
}

export class UsageCache {
  private readonly ttlMs: number;
  private readonly entries = new Map<Region, CacheEntry>();

  constructor(ttlMs = CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(region: Region, now = Date.now()): CacheEntry | undefined {
    const entry = this.entries.get(region);
    if (entry === undefined) return undefined;
    if (now - entry.at > this.ttlMs) return undefined;
    return entry;
  }

  peek(region: Region): CacheEntry | undefined {
    return this.entries.get(region);
  }

  set(region: Region, account: AccountSnapshot, now = Date.now()): void {
    this.entries.set(region, { at: now, account });
  }

  clear(): void {
    this.entries.clear();
  }
}
