/** MiniMax open-platform region. */
export type Region = "cn" | "global";

/** One model row after field-alias normalization. */
export interface UsageModel {
  name: string;
  /** False when every known quota field is 0 (model not in this plan). */
  included: boolean;
  intervalRemainingPercent?: number;
  weeklyRemainingPercent?: number;
  remainsTimeMs?: number;
  weeklyRemainsTimeMs?: number;
  intervalEndAt?: number;
  weeklyEndAt?: number;
}

/** One configured (or attempted) Token Plan account. */
export interface AccountSnapshot {
  region: Region;
  configured: boolean;
  ok: boolean;
  stale?: boolean;
  error?: string;
  planName?: string;
  models: UsageModel[];
}

export type RefreshReason = "startup" | "turn-idle" | "heartbeat" | "credential" | "manual";

/** Browser-facing usage payload. Never contains secrets or Host objects. */
export interface UsageSnapshot {
  fetchedAt: number | null;
  error?: string;
  reason?: RefreshReason;
  heartbeatMs?: number;
  accounts: AccountSnapshot[];
}

/** Structural face of `ctx.credentials` used by this plugin. */
export interface CredentialsLike {
  resolve(ref: string): Promise<{ value?: string } | undefined>;
}

export const GLOBAL_KEY_REF = "MINIMAX_API_KEY";
export const CN_KEY_REF = "MINIMAX_CN_API_KEY";

/** Official FAQ hosts first; `api.*` is the TLS-stable fallback. */
export const REMAINS_URLS: Record<Region, readonly string[]> = {
  global: [
    "https://www.minimax.io/v1/token_plan/remains",
    "https://api.minimax.io/v1/token_plan/remains",
  ],
  cn: [
    "https://api.minimaxi.com/v1/token_plan/remains",
    "https://www.minimaxi.com/v1/token_plan/remains",
  ],
};

export const CACHE_TTL_MS = 45_000;
export const FETCH_TIMEOUT_MS = 8_000;
