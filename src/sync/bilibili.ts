/** B站：收藏夹 + 稍后再看，纯 HTTPS + SESSDATA（移植自 favmine bili.py，已验证）。 */
import { cookieHeader, makeItem, parseCookieString, sleep, toDateOnly } from "./model.js";
import type { CollectedItem, HttpGet } from "./model.js";

const API = "https://api.bilibili.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

export class BiliError extends Error {}

async function api(http: HttpGet, cookie: string, path: string, params: Record<string, string | number>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const body = (await http(`${API}${path}?${qs.toString()}`, {
    "user-agent": UA,
    referer: "https://www.bilibili.com/",
    cookie,
  })) as { code?: number; message?: string; data?: Record<string, unknown> };
  if (!body || body.code !== 0) {
    throw new BiliError(`B站接口 ${path} code=${body?.code}: ${body?.message ?? "无响应"}`);
  }
  return body.data ?? {};
}

export async function collectBilibili(http: HttpGet, cookieRaw: string): Promise<CollectedItem[]> {
  const jar = parseCookieString(cookieRaw);
  if (!jar.SESSDATA) throw new BiliError("B站未登录：cookie 里没有 SESSDATA");
  const cookie = cookieHeader(jar);

  const nav = await api(http, cookie, "/x/web-interface/nav", {});
  const mid = (nav as { mid?: number }).mid;
  if (!mid) throw new BiliError("B站 nav 未返回 mid（SESSDATA 可能过期）");

  const items: CollectedItem[] = [];

  // 收藏夹列表
  const folders: Array<{ id: number; title: string; media_count?: number }> = [];
  let pn = 1;
  for (;;) {
    const page = (await api(http, cookie, "/x/v3/fav/folder/created/list", {
      pn,
      ps: 20,
      up_mid: mid,
    })) as { list?: typeof folders; count?: number };
    folders.push(...(page.list ?? []));
    if (pn * 20 >= (page.count ?? 0) || (page.list ?? []).length === 0) break;
    pn += 1;
    await sleep(400);
  }
  for (const folder of folders) {
    let fpn = 1;
    let got = 0;
    let qi = 0; // 本收藏夹内的队列位置（0=最上=最新收藏）
    const total = folder.media_count ?? 0;
    while (got < total && fpn <= 100) {
      const page = (await api(http, cookie, "/x/v3/fav/resource/list", {
        media_id: folder.id,
        pn: fpn,
        ps: 20,
        keyword: "",
        order: "mtime",
        type: 0,
        tid: 0,
        platform: "web",
      })) as { medias?: Array<Record<string, unknown>> };
      const meds = page.medias ?? [];
      if (meds.length === 0) break;
      for (const m of meds) {
        const bvid = (m.bvid ?? m.bv_id) as string | undefined;
        if (!bvid) continue;
        const upper = m.upper as { name?: string } | undefined;
        const it = makeItem("bilibili", `${folder.id}_${bvid}`, `https://www.bilibili.com/video/${bvid}`, ((m.title as string) || "(失效视频)").slice(0, 150));
        it.author = upper?.name;
        it.description = ((m.intro as string) || "").slice(0, 200) || undefined;
        it.coverUrl = m.pic as string | undefined;
        it.folder = folder.title;
        it.playlistIndex = qi;
        qi += 1;
        it.publishedAt = toDateOnly(m.pubdate ?? m.created);
        items.push(it);
        got += 1;
      }
      fpn += 1;
      await sleep(400);
    }
  }

  // 稍后再看
  const toview = (await api(http, cookie, "/x/v2/history/toview", {})) as {
    list?: Array<Record<string, unknown>>;
  };
  let wlQi = 0; // 稍后再看队列位置（0=最上=最新加入）
  for (const v of toview.list ?? []) {
    const bvid = v.bvid as string | undefined;
    if (!bvid) continue;
    const owner = v.owner as { name?: string } | undefined;
    const it = makeItem("bilibili", bvid, `https://www.bilibili.com/video/${bvid}`, ((v.title as string) || "(失效视频)").slice(0, 150));
    it.author = owner?.name;
    it.coverUrl = v.pic as string | undefined;
    it.watchLater = true;
    it.playlistIndex = wlQi;
    wlQi += 1;
    it.publishedAt = toDateOnly(v.pubdate ?? v.add_dt);
    items.push(it);
  }
  return items;
}
