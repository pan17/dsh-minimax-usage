import type { AccountSnapshot, Region, UsageModel } from "./types.js";

const AUTH_HINT =
  "Key 无效或不是订阅 Key。Token Plan 用量查询必须使用订阅 Key，不能使用普通按量付费 API Key。";

export function isAuthFailureMessage(message: string): boolean {
  return /cookie is missing|log in again|unauthorized|invalid api key|invalid token|status_code["\s:]*1004|1004/i.test(
    message,
  );
}

export function mapHttpError(status: number, body: unknown): string {
  const msg = statusMessageOf(body);
  if (status === 401 || status === 403 || (msg !== undefined && isAuthFailureMessage(msg))) {
    return AUTH_HINT;
  }
  if (msg !== undefined && msg.length > 0) return msg;
  return `查询失败 (HTTP ${status})`;
}

export function normalizeRemainsPayload(payload: unknown, region: Region, now = Date.now()): AccountSnapshot {
  const root = asRecord(payload);
  if (root === undefined) {
    return fail(region, "无法解析用量数据");
  }

  const base = asRecord(root.base_resp);
  const statusCode = asNumber(base?.status_code);
  const statusMsg = asString(base?.status_msg);
  if (statusCode !== undefined && statusCode !== 0) {
    const raw = statusMsg ?? `MiniMax 返回错误 (${statusCode})`;
    return fail(region, isAuthFailureMessage(raw) || statusCode === 1004 ? AUTH_HINT : raw);
  }

  const rows = modelRowsOf(root);
  if (rows === undefined) {
    return fail(region, "无模型配额数据");
  }

  const models: UsageModel[] = [];
  for (const row of rows) {
    const model = normalizeModel(row, now);
    if (model !== undefined) models.push(model);
  }
  if (models.length === 0) {
    return fail(region, "无模型配额数据");
  }

  return {
    region,
    configured: true,
    ok: true,
    planName: planNameOf(root, rows),
    models,
  };
}

function fail(region: Region, error: string): AccountSnapshot {
  return {
    region,
    configured: true,
    ok: false,
    error,
    models: [],
  };
}

function normalizeModel(row: Record<string, unknown>, now: number): UsageModel | undefined {
  const name = asString(row.model_name) ?? asString(row.name) ?? asString(row.model);
  if (name === undefined || name.length === 0) return undefined;

  const included = isIncluded(row);
  const intervalRemainingPercent = remainingPercent(row, "interval");
  const weeklyRemainingPercent = remainingPercent(row, "weekly");
  const remainsTimeMs = remainsMs(row, "interval");
  const weeklyRemainsTimeMs = remainsMs(row, "weekly");

  return {
    name,
    included,
    ...optionalNumber("intervalRemainingPercent", intervalRemainingPercent),
    ...optionalNumber("weeklyRemainingPercent", weeklyRemainingPercent),
    ...optionalNumber("remainsTimeMs", remainsTimeMs),
    ...optionalNumber("weeklyRemainsTimeMs", weeklyRemainsTimeMs),
    ...optionalNumber("intervalEndAt", endAt(row, "interval", now, remainsTimeMs)),
    ...optionalNumber("weeklyEndAt", endAt(row, "weekly", now, weeklyRemainsTimeMs)),
  };
}

function remainingPercent(row: Record<string, unknown>, window: "interval" | "weekly"): number | undefined {
  const percent = pickNumber(row, [
    `current_${window}_remaining_percent`,
    `${window}_remaining_percent`,
    `current_${window}_remain_percent`,
  ]);
  if (percent !== undefined) return clamp(percent, 0, 100);

  const remaining = pickNumber(row, [
    `current_${window}_remaining_count`,
    `current_${window}_remains_count`,
    `${window}_remaining_count`,
    `${window}_remains_count`,
  ]);
  const total = pickNumber(row, [
    `current_${window}_total_count`,
    `${window}_total_count`,
  ]);
  if (remaining !== undefined && total !== undefined && total > 0) {
    return clamp((remaining / total) * 100, 0, 100);
  }

  // Legacy remains API: current_*_usage_count is remaining quota, not consumed.
  const usageAsRemaining = pickNumber(row, [`current_${window}_usage_count`, `${window}_usage_count`]);
  if (usageAsRemaining !== undefined && total !== undefined && total > 0) {
    return clamp((usageAsRemaining / total) * 100, 0, 100);
  }
  return undefined;
}

function remainsMs(row: Record<string, unknown>, window: "interval" | "weekly"): number | undefined {
  const keys =
    window === "interval"
      ? ["remains_time", "current_interval_remains_time", "interval_remains_time"]
      : ["weekly_remains_time", "current_weekly_remains_time"];
  const value = pickNumber(row, keys);
  if (value === undefined || value < 0) return undefined;
  return value;
}

function endAt(
  row: Record<string, unknown>,
  window: "interval" | "weekly",
  now: number,
  remainsTimeMs: number | undefined,
): number | undefined {
  const raw = pickNumber(row, [
    window === "interval" ? "end_time" : "weekly_end_time",
    `current_${window}_end_time`,
    `${window}_end_time`,
  ]);
  const normalized = normalizeEpochMs(raw);
  if (normalized !== undefined) return normalized;
  if (remainsTimeMs !== undefined) return now + remainsTimeMs;
  return undefined;
}

function isIncluded(row: Record<string, unknown>): boolean {
  const quotas = [
    row.current_interval_quota,
    row.current_weekly_quota,
    row.interval_quota,
    row.weekly_quota,
    row.quota,
  ]
    .map(asNumber)
    .filter((value): value is number => value !== undefined);
  if (quotas.length === 0) return true;
  return quotas.some((value) => value > 0);
}

function planNameOf(root: Record<string, unknown>, rows: Record<string, unknown>[]): string | undefined {
  const fromRoot =
    asString(root.current_subscribe_title) ??
    asString(root.plan_name) ??
    asString(root.subscribe_title) ??
    asString(root.plan);
  if (fromRoot !== undefined) return fromRoot;
  for (const row of rows) {
    const fromRow =
      asString(row.current_subscribe_title) ??
      asString(row.plan_name) ??
      asString(row.subscribe_title) ??
      asString(row.plan);
    if (fromRow !== undefined) return fromRow;
  }
  return undefined;
}

function modelRowsOf(root: Record<string, unknown>): Record<string, unknown>[] | undefined {
  const raw = root.model_remains ?? root.models ?? root.data;
  const list = asArray(raw);
  if (list === undefined) return undefined;
  const rows: Record<string, unknown>[] = [];
  for (const item of list) {
    const rec = asRecord(item);
    if (rec !== undefined) rows.push(rec);
  }
  return rows;
}

function statusMessageOf(body: unknown): string | undefined {
  const rec = asRecord(body);
  if (rec === undefined) return undefined;
  const base = asRecord(rec.base_resp);
  return asString(base?.status_msg) ?? asString(rec.message) ?? asString(rec.error);
}

function normalizeEpochMs(value: number | undefined): number | undefined {
  if (value === undefined || value <= 0) return undefined;
  if (value > 1e12) return value;
  if (value > 1e9) return value * 1000;
  return undefined;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function optionalNumber<K extends string>(key: K, value: number | undefined): Partial<Record<K, number>> {
  return value === undefined ? {} : ({ [key]: value } as Partial<Record<K, number>>);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
