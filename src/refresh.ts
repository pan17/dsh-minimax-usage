import type { Region, RefreshReason } from "./types.js";

export const IDLE_DELAY_MS = 15_000;
export const HEARTBEAT_MIN_MS = 2 * 60 * 1000;
export const HEARTBEAT_MAX_MS = 24 * 60 * 60 * 1000;

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
  snapshot(force: boolean, reason: RefreshReason): Promise<unknown>;
}

export class RefreshScheduler {
  private readonly dirty = new Set<Region>();
  private idleCancel: (() => void) | undefined;
  private heartbeatCancel: (() => void) | undefined;
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
    this.dirty.clear();
  }

  private async prefetch(reason: RefreshReason, resetHeartbeat: boolean): Promise<void> {
    if (this.prefetching) return;
    this.prefetching = true;
    try {
      await this.target.snapshot(true, reason);
      if (reason === "turn-idle") this.dirty.clear();
      if (resetHeartbeat) this.heartbeatMs = HEARTBEAT_MIN_MS;
      else if (reason === "heartbeat") this.heartbeatMs = nextHeartbeatMs(this.heartbeatMs);
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

  private clearIdleTimer(): void {
    this.idleCancel?.();
    this.idleCancel = undefined;
  }

  private clearHeartbeat(): void {
    this.heartbeatCancel?.();
    this.heartbeatCancel = undefined;
  }
}
