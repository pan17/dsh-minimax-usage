import { FETCH_TIMEOUT_MS, REMAINS_URLS, type Region } from "./types.js";
import { mapHttpError } from "./normalize.js";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function fetchRemains(
  region: Region,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<unknown> {
  const urls = REMAINS_URLS[region];
  let lastError: Error | undefined;
  for (const url of urls) {
    try {
      return await fetchOne(url, apiKey, fetchImpl, timeoutMs);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isRetryableFetchError(lastError)) throw lastError;
    }
  }
  throw lastError ?? new Error("查询失败");
}

async function fetchOne(
  url: string,
  apiKey: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    const text = await resp.text();
    let body: unknown = {};
    if (text.trim().length > 0) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new Error("无法解析用量数据");
      }
    }
    if (!resp.ok) throw new Error(mapHttpError(resp.status, body));
    return body;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("查询超时");
    }
    if (!(err instanceof Error)) throw err;
    if (err.message.includes("订阅 Key") || err.message.startsWith("无法解析用量")) throw err;
    throw new Error(describeFetchError(err));
  } finally {
    clearTimeout(timer);
  }
}

export function describeFetchError(err: Error): string {
  const cause = causeMessage(err);
  const combined = [err.message, cause].filter((part) => part && part.length > 0).join(": ");
  if (/unable to verify|certificate|ssl|tls|UNABLE_TO_VERIFY|CERT_/i.test(combined)) {
    return "连接 MiniMax 时证书校验失败，已尝试备用域名";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(combined)) {
    return "无法解析 MiniMax 域名";
  }
  if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|fetch failed/i.test(combined)) {
    return cause && cause !== err.message ? `无法连接 MiniMax（${cause}）` : "无法连接 MiniMax";
  }
  return combined || "查询失败";
}

export function isRetryableFetchError(err: Error): boolean {
  return /无法连接|证书|域名|超时|fetch failed|ssl|tls|certificate|ENOTFOUND|ECONN|ETIMEDOUT|AbortError/i.test(
    `${err.name} ${err.message}`,
  );
}

function causeMessage(err: Error): string | undefined {
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string" && cause.length > 0) return cause;
  return undefined;
}
