/** Local-only Fav Collector: shared model. No engine, no database. */

export type Platform = "bilibili" | "youtube" | "zhihu" | "x" | "github" | "xiaoyuzhou";

export const PLATFORMS: Platform[] = ["bilibili", "youtube", "zhihu", "x", "github", "xiaoyuzhou"];

export const PLATFORM_LABEL: Record<Platform, string> = {
  bilibili: "B站",
  youtube: "YouTube",
  zhihu: "知乎",
  x: "X",
  github: "GitHub",
  xiaoyuzhou: "小宇宙",
};

export interface CollectedItem {
  platform: Platform;
  /** 平台内稳定去重键（如 BV 号、videoId、推文 id、知乎 URL）。 */
  nativeId: string;
  /** 全局去重键 `${platform}:${nativeId}`，写进 frontmatter.fav_id。 */
  favId: string;
  url: string;
  title: string;
  author?: string;
  /** 一句话简介（卡片用，取自 intro/summary/正文前 200 字）。 */
  description?: string;
  coverUrl?: string;
  /** 收藏夹名；无则按稍后再看归位。 */
  folder?: string;
  watchLater?: boolean;
  /** YYYY-MM-DD（有才排序）。 */
  publishedAt?: string;
  /** 小宇宙等：未听完（收听历史 isFinished=false）。 */
  unfinished?: boolean;
  /** YouTube 等：列表中的位置（0=最上/最新加入），队列排序用。 */
  playlistIndex?: number;
}

export interface PlatformResult {
  platform: Platform;
  ok: boolean;
  items: CollectedItem[];
  error?: string;
}

/** 可注入的 HTTP GET（插件侧用 Obsidian requestUrl，单测用假函数）。 */
export type HttpGet = (url: string, headers?: Record<string, string>) => Promise<unknown>;

/** 可注入的子进程执行（gh / yt-dlp，单测用假函数）。 */
export type RunFn = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function toDateOnly(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) {
    const sec = v > 1e12 ? Math.floor(v / 1000) : Math.floor(v);
    const d = new Date(sec * 1000);
    if (Number.isNaN(d.getTime())) return undefined;
    // 内容平台时间按北京时间呈现
    const cst = new Date(d.getTime() + 8 * 3600 * 1000);
    return cst.toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  }
  return undefined;
}

/** 解析 "k=v; k2=v2" cookie 串为字典。 */
export function parseCookieString(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (raw ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (k) out[k] = val;
  }
  return out;
}

export function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

export function makeItem(platform: Platform, nativeId: string, url: string, title: string): CollectedItem {
  return { platform, nativeId, favId: `${platform}:${nativeId}`, url, title };
}
