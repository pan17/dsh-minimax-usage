import type { Region, RefreshReason, UsageSnapshot } from "./types.js";

export const IDLE_DELAY_MS = 15_000;
export const HEARTBEAT_MIN_MS = 2 * 60 * 1000;
export const HEARTBEAT_MAX_MS = 24 * 60 * 60 * 1000;
/** Fixed offset past the 5h-window reset time at which we re-fetch. */
export const RESET_REFRESH_DELAY_MS = 30_000;

export function nextHeartbeatMs(current: number): number {
  if (current <= 0) return HEARTBEAT_MIN_MS;
  return Math.min(current * 2, HEARTBEAT_MAX_MS);
}

export function regionOfProvider(provider: unknown): Region | undefined {
  if (provider === "minimax-cn") return "cn";
  if (provider === "minimax") return "global";
  return undefined;
}

export interface Clock {
  now(): number;
  timeout(callback: () => void, delay: number): () => void;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  timeout(callback, delay) {
    const id = setTimeout(callback, delay);
    return () => clearTimeout(id);
  },
};

export interface RefreshTarget {
  snapshot(force: boolean, reason: RefreshReason): Promise<UsageSnapshot | undefined>;
}

/**
 * Earliest fire time across all `ok` accounts/models: `intervalEndAt + RESET_REFRESH_DELAY_MS`.
 * Returns undefined when no model carries a usable end time, or when the computed fire time has
 * already passed (the reset already happened — we don't fire in the past).
 */
export function computeResetFireAt(
  snap: UsageSnapshot | undefined,
  now: number,
): number | undefined {
  if (snap === undefined) return undefined;
  let earliest: number | undefined;
  for (const account of snap.accounts) {
    if (!account.ok) continue;
    for (const model of account.models) {
      const endAt = model.intervalEndAt;
      if (endAt === undefined) continue;
      if (earliest === undefined || endAt < earliest) earliest = endAt;
    }
  }
  if (earliest === undefined) return undefined;
  const fireAt = earliest + RESET_REFRESH_DELAY_MS;
  return fireAt > now ? fireAt : undefined;
}

export class RefreshScheduler {
  private readonly dirty = new Set<Region>();
  private idleCancel: (() => void) | undefined;
  private heartbeatCancel: (() => void) | undefined;
  private resetCancel: (() => void) | undefined;
  private resetFireAt: number | undefined;
  private prefetching = false;
  heartbeatMs = HEARTBEAT_MIN_MS;

  constructor(
    private readonly target: RefreshTarget,
    private readonly clock: Clock = systemClock,
  ) {
    this.armHeartbeat();
  }

  markDirty(region: Region): void {
    this.dirty.add(region);
  }

  get dirtyRegions(): Region[] {
    return [...this.dirty];
  }

  onRunning(): void {
    this.clearIdleTimer();
  }

  onIdle(): void {
    if (this.dirty.size === 0) return;
    this.clearIdleTimer();
    this.idleCancel = this.clock.timeout(() => {
      this.idleCancel = undefined;
      void this.prefetch("turn-idle", true);
    }, IDLE_DELAY_MS);
  }

  async refreshNow(reason: RefreshReason): Promise<void> {
    this.clearIdleTimer();
    await this.prefetch(reason, false);
  }

  dispose(): void {
    this.clearIdleTimer();
    this.clearHeartbeat();
    this.clearResetRefresh();
    this.dirty.clear();
  }

  private async prefetch(reason: RefreshReason, resetHeartbeat: boolean): Promise<void> {
    if (this.prefetching) return;
    this.prefetching = true;
    try {
      const snap = await this.target.snapshot(true, reason);
      if (reason === "turn-idle") this.dirty.clear();
      if (resetHeartbeat) this.heartbeatMs = HEARTBEAT_MIN_MS;
      else if (reason === "heartbeat") this.heartbeatMs = nextHeartbeatMs(this.heartbeatMs);
      this.armResetRefresh(snap);
    } finally {
      this.prefetching = false;
      this.armHeartbeat();
    }
  }

  private armHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatCancel = this.clock.timeout(() => {
      this.heartbeatCancel = undefined;
      if (this.idleCancel !== undefined) {
        this.armHeartbeat();
        return;
      }
      void this.prefetch("heartbeat", false);
    }, this.heartbeatMs);
  }

  /**
   * One-shot timer scheduled at the earliest 5h-window reset time + 30s. Re-armed on every
   * successful snapshot so the timer always tracks the latest known reset moment. When the
   * timer fires while an idle-prefetch is already pending we re-arm against the same fireAt;
   * if `fireAt` has since passed (the idle window dragged us past it) we simply drop it —
   * the next prefetch (post-idle) will re-arm with the freshly-fetched reset time.
   */
  private armResetRefresh(snap: UsageSnapshot | undefined): void {
    const fireAt = computeResetFireAt(snap, this.clock.now());
    this.armResetRefreshAt(fireAt);
  }

  private armResetRefreshAt(fireAt: number | undefined): void {
    this.clearResetRefresh();
    if (fireAt === undefined) return;
    const delay = fireAt - this.clock.now();
    if (delay <= 0) return;
    this.resetFireAt = fireAt;
    this.resetCancel = this.clock.timeout(() => {
      this.resetCancel = undefined;
      this.resetFireAt = undefined;
      if (this.idleCancel !== undefined) {
        this.armResetRefreshAt(fireAt);
        return;
      }
      void this.prefetch("interval-reset", false);
    }, delay);
  }

  private clearIdleTimer(): void {
    this.idleCancel?.();
    this.idleCancel = undefined;
  }

  private clearHeartbeat(): void {
    this.heartbeatCancel?.();
    this.heartbeatCancel = undefined;
  }

  private clearResetRefresh(): void {
    this.resetCancel?.();
    this.resetCancel = undefined;
    this.resetFireAt = undefined;
  }
}
