/**
 * X Bookmarks：GraphQL 直调（移植自 favmine x.py + twitter-api-client 常量，已验证）。
 * 只需要 auth_token + ct0 两个 cookie，无浏览器。
 */
import consts from "./x-consts.json" with { type: "json" };
import { cookieHeader, makeItem, parseCookieString, sleep, toDateOnly } from "./model.js";
import type { CollectedItem, HttpGet } from "./model.js";

const QID = "tmd4ifV8RHltzn8ymGg1aw";
const OP = "Bookmarks";
const BEARER =
  "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

export class XError extends Error {}

function findAll(obj: unknown, key: string): unknown[] {
  const out: unknown[] = [];
  if (Array.isArray(obj)) {
    for (const v of obj) out.push(...findAll(v, key));
  } else if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    if (key in rec) out.push(rec[key]);
    for (const v of Object.values(rec)) out.push(...findAll(v, key));
  }
  return out;
}

export function tweetToItem(result: Record<string, unknown>): CollectedItem | null {
  const restId = result.rest_id as string | undefined;
  if (!restId) return null;
  const legacy = (result.legacy ?? {}) as Record<string, unknown>;
  const core = (result.core ?? {}) as Record<string, unknown>;
  const userResult = ((core.user_results ?? {}) as Record<string, unknown>).result as Record<string, unknown> | undefined;
  const uLegacy = ((userResult ?? {}).legacy ?? {}) as Record<string, unknown>;
  const screenName = (uLegacy.screen_name as string) || "i";
  const text = (legacy.full_text as string) || "";
  const it = makeItem("x", restId, `https://x.com/${screenName}/status/${restId}`, (text.split("\n")[0].slice(0, 120) || "(无正文)"));
  it.author = (uLegacy.name as string) || screenName;
  it.description = text.slice(0, 400) || undefined;
  it.publishedAt = toDateOnly(legacy.created_at);
  return it;
}

export function extractTweets(page: unknown): CollectedItem[] {
  const out: CollectedItem[] = [];
  const seen = new Set<string>();
  for (const t of findAll(page, "tweet_results")) {
    const rec = (t ?? {}) as Record<string, unknown>;
    const result = ((rec.result ?? rec) as Record<string, unknown>);
    if (typeof result.__typename === "string" && (result.__typename === "TweetTombstone" || result.__typename === "TweetUnavailable")) continue;
    const it = tweetToItem(result);
    if (it && !seen.has(it.nativeId)) {
      seen.add(it.nativeId);
      out.push(it);
    }
  }
  return out;
}

export function findCursor(page: unknown): string | undefined {
  for (const entries of findAll(page, "entries")) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      const entry = (e ?? {}) as Record<string, unknown>;
      const id = (entry.entryId ?? entry.entry_id ?? "") as string;
      if (id.includes("cursor-bottom") || id.includes("cursor-showmorethreads")) {
        const content = (entry.content ?? {}) as Record<string, unknown>;
        const itemContent = content.itemContent as Record<string, unknown> | undefined;
        if (itemContent && typeof itemContent.value === "string") return itemContent.value;
        if (typeof content.value === "string") return content.value;
      }
    }
  }
  return undefined;
}

export async function collectX(http: HttpGet, cookieRaw: string, maxPages = 30): Promise<CollectedItem[]> {
  const jar = parseCookieString(cookieRaw);
  if (!jar.auth_token) throw new XError("X 未登录：cookie 里没有 auth_token");
  const headers = {
    authorization: BEARER,
    cookie: cookieHeader(jar),
    referer: "https://twitter.com/",
    "user-agent": UA,
    "x-csrf-token": jar.ct0 ?? "",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
  };

  const items: CollectedItem[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const variables: Record<string, unknown> = { ...(consts.variables as Record<string, unknown>), count: 20 };
    if (cursor) variables.cursor = cursor;
    const qs = new URLSearchParams({
      queryId: QID,
      features: JSON.stringify(consts.features),
      variables: JSON.stringify(variables),
    });
    let data: unknown;
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        data = await http(`https://x.com/i/api/graphql/${QID}/${OP}?${qs.toString()}`, headers);
        break;
      } catch (e) {
        lastErr = (e as Error).message;
        if (attempt === 2) throw new XError(`X Bookmarks 抓取失败: ${lastErr.slice(0, 150)}`);
        await sleep(2000 * (attempt + 1));
      }
    }
    const fresh = extractTweets(data).filter((it) => !seen.has(it.nativeId));
    for (const it of fresh) seen.add(it.nativeId);
    items.push(...fresh);
    cursor = findCursor(data);
    if (fresh.length === 0 || !cursor) break;
    await sleep(500);
  }
  // 书签时间线倒序：数组下标即队列位置（0=最新）
  items.forEach((it, i) => {
    it.playlistIndex = i;
  });
  return items;
}
