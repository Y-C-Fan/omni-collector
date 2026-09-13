/** 知乎：开放平台 API + Access Secret（移植自 favmine zhihu.py，已验证；仅公开收藏夹）。 */
import { makeItem, sleep, toDateOnly } from "./model.js";
import type { CollectedItem, HttpGet } from "./model.js";

const BASE = "https://developer.zhihu.com";

export class ZhihuError extends Error {}

async function zget(http: HttpGet, secret: string, path: string, params: Record<string, string | number>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const body = (await http(`${BASE}${path}?${qs.toString()}`, {
    Authorization: `Bearer ${secret}`,
    "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
    "Content-Type": "application/json",
  })) as { Code?: number; Message?: string; Data?: Record<string, unknown> };
  if (!body || body.Code !== 0) {
    if (body?.Code === 20001) throw new ZhihuError("知乎鉴权失败（Code 20001）：去 developer.zhihu.com/profile 重生成 Secret");
    if (body?.Code === 30001 || body?.Code === 30002) throw new ZhihuError(`知乎限流/配额（Code ${body?.Code}）`);
    throw new ZhihuError(`知乎错误 Code=${body?.Code} ${body?.Message ?? "无响应"}`);
  }
  return body.Data ?? {};
}

export async function collectZhihu(http: HttpGet, secret: string): Promise<CollectedItem[]> {
  if (!secret.trim()) throw new ZhihuError("知乎 Secret 未填");
  const favlists = ((await zget(http, secret, "/api/v1/user/favlists", { Limit: 50 })).Items ?? []) as Array<{
    UrlToken: string;
    Title: string;
  }>;
  if (favlists.length === 0) throw new ZhihuError("知乎未返回任何收藏夹（可能都未公开）");

  const items: CollectedItem[] = [];
  for (const fav of favlists) {
    let offset = 0;
    let qi = 0; // 本收藏夹内的队列位置（0=最上=最新收藏）
    for (;;) {
      const data = await zget(http, secret, "/api/v1/user/favlist_contents", {
        FavlistUrlToken: fav.UrlToken,
        Offset: offset,
        Limit: 50,
      });
      const list = (data.Items ?? []) as Array<Record<string, unknown>>;
      for (const it of list) {
        const url = it.Url as string | undefined;
        const author = it.Author as { Name?: string } | undefined;
        const item = makeItem("zhihu", url ?? `${fav.UrlToken}_${it.CreatedAt}`, url ?? "", (((it.Title as string) || "(无标题)").slice(0, 150)));
        item.author = author?.Name;
        item.description = ((it.Summary as string) || "").slice(0, 200) || undefined;
        item.folder = fav.Title;
        item.playlistIndex = qi;
        qi += 1;
        item.publishedAt = toDateOnly(it.FavTime ?? it.CreatedAt);
        items.push(item);
      }
      const paging = (data.Paging ?? {}) as { IsEnd?: boolean; NextOffset?: unknown };
      if (paging.IsEnd !== false) break;
      const next = Number(paging.NextOffset);
      if (!Number.isFinite(next)) break;
      offset = next;
      await sleep(500);
    }
    await sleep(500);
  }
  return items;
}
