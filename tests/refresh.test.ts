import { describe, expect, it } from "vitest";
import {
  HEARTBEAT_MAX_MS,
  HEARTBEAT_MIN_MS,
  IDLE_DELAY_MS,
  nextHeartbeatMs,
  RefreshScheduler,
  regionOfProvider,
  type Clock,
} from "../src/refresh.js";
import type { RefreshReason } from "../src/types.js";

class FakeClock implements Clock {
  nowMs = 0;
  private readonly timers: Array<{ at: number; cb: () => void; cancelled: boolean }> = [];

  now(): number {
    return this.nowMs;
  }

  timeout(callback: () => void, delay: number): () => void {
    const timer = { at: this.nowMs + delay, cb: callback, cancelled: false };
    this.timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  }

  async advance(ms: number): Promise<void> {
    const target = this.nowMs + ms;
    while (true) {
      const due = this.timers
        .filter((timer) => !timer.cancelled && timer.at <= target)
        .sort((a, b) => a.at - b.at);
      if (due.length === 0) {
        this.nowMs = target;
        return;
      }
      const next = due[0]!;
      this.nowMs = next.at;
      next.cancelled = true;
      next.cb();
      await Promise.resolve();
    }
  }
}

describe("regionOfProvider", () => {
  it("maps only MiniMax routes", () => {
    expect(regionOfProvider("minimax")).toBe("global");
    expect(regionOfProvider("minimax-cn")).toBe("cn");
    expect(regionOfProvider("grok")).toBeUndefined();
  });
});

describe("nextHeartbeatMs", () => {
  it("doubles until 24h", () => {
    expect(nextHeartbeatMs(HEARTBEAT_MIN_MS)).toBe(4 * 60 * 1000);
    expect(nextHeartbeatMs(HEARTBEAT_MAX_MS / 2)).toBe(HEARTBEAT_MAX_MS);
    expect(nextHeartbeatMs(HEARTBEAT_MAX_MS)).toBe(HEARTBEAT_MAX_MS);
  });
});

describe("RefreshScheduler", () => {
  it("does not prefetch on Grok idle", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
      },
    }, clock);
    scheduler.onIdle();
    await clock.advance(IDLE_DELAY_MS + 10);
    expect(reasons).toEqual([]);
    scheduler.dispose();
  });

  it("waits 15s after MiniMax idle before prefetching and resets heartbeat", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
      },
    }, clock);
    scheduler.heartbeatMs = 8 * 60 * 1000;
    scheduler.markDirty("cn");
    scheduler.onIdle();
    await clock.advance(IDLE_DELAY_MS - 1);
    expect(reasons).toEqual([]);
    await clock.advance(1);
    expect(reasons).toEqual(["turn-idle"]);
    expect(scheduler.heartbeatMs).toBe(HEARTBEAT_MIN_MS);
    expect(scheduler.dirtyRegions).toEqual([]);
    scheduler.dispose();
  });

  it("cancels the idle timer if the agent starts running again", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
      },
    }, clock);
    scheduler.markDirty("global");
    scheduler.onIdle();
    scheduler.onRunning();
    await clock.advance(IDLE_DELAY_MS + 50);
    expect(reasons).toEqual([]);
    scheduler.dispose();
  });

  it("doubles heartbeat after a heartbeat tick", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
      },
    }, clock);
    await clock.advance(HEARTBEAT_MIN_MS);
    expect(reasons).toEqual(["heartbeat"]);
    expect(scheduler.heartbeatMs).toBe(4 * 60 * 1000);
    scheduler.dispose();
  });

  it("manual refresh does not reset heartbeat", async () => {
    const clock = new FakeClock();
    const scheduler = new RefreshScheduler({
      snapshot: async () => undefined,
    }, clock);
    scheduler.heartbeatMs = 8 * 60 * 1000;
    await scheduler.refreshNow("manual");
    expect(scheduler.heartbeatMs).toBe(8 * 60 * 1000);
    scheduler.dispose();
  });
});
