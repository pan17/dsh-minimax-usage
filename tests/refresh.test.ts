import { describe, expect, it } from "vitest";
import {
  HEARTBEAT_MAX_MS,
  HEARTBEAT_MIN_MS,
  IDLE_DELAY_MS,
  RESET_REFRESH_DELAY_MS,
  computeResetFireAt,
  nextHeartbeatMs,
  RefreshScheduler,
  regionOfProvider,
  type Clock,
} from "../src/refresh.js";
import type { AccountSnapshot, RefreshReason, UsageSnapshot } from "../src/types.js";

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

function okAccount(
  region: AccountSnapshot["region"],
  endAts: Array<number | undefined>,
): AccountSnapshot {
  return {
    region,
    configured: true,
    ok: true,
    models: endAts.map((intervalEndAt, idx) => ({
      name: `${region}-${idx}`,
      included: true,
      ...(intervalEndAt === undefined ? {} : { intervalEndAt }),
    })),
  };
}

function snapOf(accounts: AccountSnapshot[]): UsageSnapshot {
  return { fetchedAt: 0, accounts };
}

describe("computeResetFireAt", () => {
  it("returns the earliest intervalEndAt + 30s across accounts/models", () => {
    const snap = snapOf([
      okAccount("global", [10_000]),
      okAccount("cn", [5_000, 8_000]),
    ]);
    expect(computeResetFireAt(snap, 0)).toBe(5_000 + RESET_REFRESH_DELAY_MS);
  });

  it("returns undefined when the snapshot is undefined", () => {
    expect(computeResetFireAt(undefined, 0)).toBeUndefined();
  });

  it("returns undefined when there are no accounts", () => {
    expect(computeResetFireAt(snapOf([]), 0)).toBeUndefined();
  });

  it("returns undefined when no model exposes intervalEndAt", () => {
    const snap = snapOf([okAccount("global", [undefined])]);
    expect(computeResetFireAt(snap, 0)).toBeUndefined();
  });

  it("returns undefined when fireAt is already in the past", () => {
    const snap = snapOf([okAccount("global", [100])]);
    expect(computeResetFireAt(snap, 100 + RESET_REFRESH_DELAY_MS + 1)).toBeUndefined();
  });

  it("returns the fireAt exactly at the boundary", () => {
    const snap = snapOf([okAccount("global", [1_000])]);
    const fireAt = 1_000 + RESET_REFRESH_DELAY_MS;
    expect(computeResetFireAt(snap, fireAt)).toBeUndefined();
    expect(computeResetFireAt(snap, fireAt + 1)).toBeUndefined();
    expect(computeResetFireAt(snap, fireAt - 1)).toBe(fireAt);
  });

  it("skips accounts with ok=false", () => {
    const snap: UsageSnapshot = {
      fetchedAt: 0,
      accounts: [
        { region: "global", configured: true, ok: false, models: [] },
        okAccount("cn", [2_000]),
      ],
    };
    expect(computeResetFireAt(snap, 0)).toBe(2_000 + RESET_REFRESH_DELAY_MS);
  });
});

describe("RefreshScheduler reset-refresh", () => {
  /**
   * Build a snapshot whose `intervalEndAt` is `offsetMs` from the clock's current time.
   * Snapshots are constructed inside the callback so `intervalEndAt` is always relative to
   * the moment of the fetch (not to the test's t=0).
   */
  function snapAtOffset(clock: FakeClock, offsetMs: number): UsageSnapshot {
    return snapOf([okAccount("global", [clock.nowMs + offsetMs])]);
  }

  it("fires an interval-reset prefetch at intervalEndAt + 30s after a heartbeat snapshot", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    let callCount = 0;
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
        callCount += 1;
        // First call (heartbeat at t=2min): intervalEndAt is now + 5s.
        // Second call (interval-reset at t=2min+5.03s): no endAt needed.
        return callCount === 1 ? snapAtOffset(clock, 5_000) : snapOf([]);
      },
    }, clock);

    // First heartbeat at HEARTBEAT_MIN_MS delivers intervalEndAt = clock.now() + 5000.
    await clock.advance(HEARTBEAT_MIN_MS);
    expect(reasons).toEqual(["heartbeat"]);

    // Reset timer should fire at HEARTBEAT_MIN_MS + 5_000 + 30_000 = HEARTBEAT_MIN_MS + 35_000.
    await clock.advance(35_000);
    expect(reasons).toEqual(["heartbeat", "interval-reset"]);
    scheduler.dispose();
  });

  it("re-arms the reset timer when a later snapshot provides a new intervalEndAt", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    let callCount = 0;
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
        callCount += 1;
        // First call (heartbeat at t=2min): intervalEndAt = now + 100ms (would fire almost immediately).
        // Second call (manual refresh just after): intervalEndAt = now + 1h (far future).
        return callCount === 1 ? snapAtOffset(clock, 100) : snapAtOffset(clock, 60 * 60_000);
      },
    }, clock);

    await clock.advance(HEARTBEAT_MIN_MS);
    expect(reasons).toEqual(["heartbeat"]);
    // At this point a reset timer is armed for clock.now() + 100 + 30_000 ≈ t=2min+30s.

    // Trigger a manual refresh that returns the new intervalEndAt; the old timer must be cancelled
    // and a new one armed for clock.now() + 1h + 30s.
    await scheduler.refreshNow("manual");
    expect(reasons).toEqual(["heartbeat", "manual"]);

    // Cross the ORIGINAL fireAt (≈ 2min+30s from t=0) — the old timer was replaced, so no
    // interval-reset should fire.
    await clock.advance(35_000);
    expect(reasons).toEqual(["heartbeat", "manual"]);
    scheduler.dispose();
  });

  it("does not schedule a reset refresh when the snapshot has no intervalEndAt", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
        return snapOf([okAccount("global", [undefined])]);
      },
    }, clock);

    await clock.advance(HEARTBEAT_MIN_MS);
    expect(reasons).toEqual(["heartbeat"]);

    // Advance well past any plausible 30s offset; heartbeats double and keep firing, but no
    // interval-reset should ever appear.
    await clock.advance(60 * 60 * 1000);
    expect(reasons.filter((r) => r === "interval-reset")).toEqual([]);
    expect(reasons[0]).toBe("heartbeat");
    expect(reasons.length).toBeGreaterThan(1);
    scheduler.dispose();
  });

  it("skips the reset prefetch when an idle timer is pending at fire time", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    let callCount = 0;
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
        callCount += 1;
        // First (heartbeat): intervalEndAt = now + 50ms → reset fires ~80ms later.
        // Second (turn-idle): intervalEndAt = now + 5s — a totally different reset moment,
        // which proves the first timer was REPLACED by the idle prefetch rather than fired.
        return callCount === 1 ? snapAtOffset(clock, 50) : snapAtOffset(clock, 5_000);
      },
    }, clock);

    await clock.advance(HEARTBEAT_MIN_MS);
    expect(reasons).toEqual(["heartbeat"]);

    // Mark dirty + go idle BEFORE the reset timer fires (which would be 50ms+30s = ~80ms from now).
    scheduler.markDirty("cn");
    scheduler.onIdle();

    // Cross the reset fireAt (t=2min+80ms); idle timer still pending → interval-reset is skipped.
    await clock.advance(100);
    expect(reasons).toEqual(["heartbeat"]);

    // Wait out the idle delay (15s total from when onIdle was called). At t=2min+15s the idle timer
    // fires, performing the turn-idle prefetch and re-arming the reset timer to ~now+5s+30s.
    await clock.advance(IDLE_DELAY_MS);
    expect(reasons).toEqual(["heartbeat", "turn-idle"]);
    scheduler.dispose();
  });

  it("does not modify heartbeatMs on an interval-reset prefetch", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    let callCount = 0;
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
        callCount += 1;
        return callCount === 1 ? snapAtOffset(clock, 100) : snapOf([]);
      },
    }, clock);

    await clock.advance(HEARTBEAT_MIN_MS);
    // Heartbeat doubled from 2min to 4min after the first tick.
    expect(scheduler.heartbeatMs).toBe(2 * HEARTBEAT_MIN_MS);

    // Advance to the reset fireAt: heartbeatMs + 100ms + 30s = HEARTBEAT_MIN_MS + 30_100ms.
    await clock.advance(30_100);
    expect(reasons).toEqual(["heartbeat", "interval-reset"]);
    // interval-reset must NOT touch the heartbeat backoff.
    expect(scheduler.heartbeatMs).toBe(2 * HEARTBEAT_MIN_MS);
    scheduler.dispose();
  });

  it("dispose cancels a pending reset refresh", async () => {
    const reasons: RefreshReason[] = [];
    const clock = new FakeClock();
    const scheduler = new RefreshScheduler({
      snapshot: async (_force, reason) => {
        reasons.push(reason);
        return snapAtOffset(clock, 10_000_000);
      },
    }, clock);

    await clock.advance(HEARTBEAT_MIN_MS);
    expect(reasons).toEqual(["heartbeat"]);

    scheduler.dispose();
    // Advancing past the reset fireAt must not trigger another prefetch.
    await clock.advance(60 * 60 * 1000);
    expect(reasons).toEqual(["heartbeat"]);
  });
});
