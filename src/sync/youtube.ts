/** YouTube：Watch Later + Liked，yt-dlp 子进程 flat 抓取（标题级增量才补日期）。 */
import { execFile } from "node:child_process";
import { makeItem } from "./model.js";
import type { CollectedItem, RunFn } from "./model.js";

export class YoutubeError extends Error {}

function defaultRun(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // yt-dlp.exe（PyInstaller）在管道输出时跟随系统 locale（GBK），必须强制 UTF-8，
    // 否则中文标题变 ��（2026-09-11 实锤）。
    const env = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" };
    execFile(cmd, args, { timeout: 300000, maxBuffer: 64 * 1024 * 1024, env }, (err, stdout, stderr) => {
      if (err) {
        const msg = `${stderr || err.message}`.slice(0, 300);
        reject(new YoutubeError(`yt-dlp 失败: ${msg}`));
        return;
      }
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

export interface YoutubeOptions {
  ytdlpPath: string;
  /** 默认走 Firefox 专用钥匙扣（和 youtube-obsidian skill 同源，免维护文件）。 */
  cookieFile?: string;
  run?: RunFn;
}

function baseArgs(opts: YoutubeOptions): string[] {
  const args = ["--flat-playlist", "--skip-download", "--no-playlist", "--ignore-errors", "--socket-timeout", "20", "--retries", "2"];
  if (opts.cookieFile?.trim()) {
    args.push("--cookies", opts.cookieFile.trim());
  } else {
    args.push("--cookies-from-browser", "firefox:vyp2edie.ytdlp");
  }
  // EJS 挑战参数（无则部分请求被判 bot）
  args.push("--js-runtimes", "node", "--remote-components", "ejs:github");
  return args;
}

/** 纯函数：解析 flat-playlist 输出（单测）。 */
export function parseFlatList(stdout: string, listId: "WL" | "LL"): CollectedItem[] {
  const items: CollectedItem[] = [];
  for (const line of stdout.split("\n")) {
    const m = line.match(/^(\S+)\t(.*)$/);
    if (!m) continue;
    const it = makeItem("youtube", `${listId}_${m[1]}`, `https://www.youtube.com/watch?v=${m[1]}`, (m[2] || "(无标题)").slice(0, 150));
    it.watchLater = listId === "WL";
    // 收藏夹归属：WL 走 notePathFor 的 watchLater→稍后再看；LL 显式给 folder，保证平台 tab 内有分组
    if (listId === "LL") it.folder = "喜欢";
    it.coverUrl = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
    (it as CollectedItem & { videoId?: string }).videoId = m[1];
    items.push(it);
  }
  return items;
}

export async function collectYoutube(opts: YoutubeOptions): Promise<CollectedItem[]> {
  const run = opts.run ?? defaultRun;
  const items: CollectedItem[] = [];
  for (const listId of ["WL", "LL"] as const) {
    const { stdout } = await run(opts.ytdlpPath, [
      ...baseArgs(opts),
      "--print",
      "%(id)s\t%(title)s",
      `https://www.youtube.com/playlist?list=${listId}`,
    ]).catch((e) => {
      const msg = (e as Error).message;
      if (msg.includes("does not exist") && listId === "WL") {
        throw new YoutubeError("YouTube WL 不存在：大概率登录过期，重导 cookie 或检查 Firefox 钥匙扣");
      }
      throw e;
    });
    items.push(...parseFlatList(stdout, listId));
  }
  return items;
}

/** 仅对新增视频补发布日期（upload_date），存量跳过。 */
export async function enrichYoutubeDates(opts: YoutubeOptions, items: CollectedItem[]): Promise<void> {  const run = opts.run ?? defaultRun;
  const withId = items.filter((it) => (it as CollectedItem & { videoId?: string }).videoId);
  if (withId.length === 0) return;
  const urls = withId.map((it) => (it as CollectedItem & { videoId?: string }).videoId as string).map((id) => `https://www.youtube.com/watch?v=${id}`);
  const { stdout } = await run(opts.ytdlpPath, [...baseArgs(opts), "--print", "%(id)s\t%(upload_date)s", ...urls]);
  const dates = new Map<string, string>();
  for (const line of stdout.split("\n")) {
    const m = line.match(/^(\S+)\s+(\d{8})/);
    if (m) dates.set(m[1], `${m[2].slice(0, 4)}-${m[2].slice(4, 6)}-${m[2].slice(6, 8)}`);
  }
  for (const it of withId) {
    const d = dates.get((it as CollectedItem & { videoId?: string }).videoId as string);
    if (d) it.publishedAt = d;
  }
}

/** 取英文简介前 N 字（按句切断），供翻译。 */
export function snippetForTranslate(desc: string, maxLen = 600): string {
  const oneLine = desc.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  const cut = oneLine.slice(0, maxLen);
  const lastEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf("。"));
  return (lastEnd > maxLen * 0.4 ? cut.slice(0, lastEnd + 1) : cut).trim();
}

/** 判断是否已是中文（CJK 占比过半则不翻）。 */
export function isMostlyChinese(text: string): boolean {
  if (!text) return true;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return cjk * 2 >= text.length;
}

/** gtx 免费端点英→中（无 key；失败抛错由调用方吞掉并回退原文）。 */
export async function translateEnToZh(text: string, httpGet: (url: string) => Promise<string>): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  const raw = await httpGet(url);
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("bad gtx response");
  const zh = (data[0] as unknown[])
    .filter((seg): seg is [string, string] => Array.isArray(seg) && typeof seg[0] === "string")
    .map((seg) => seg[0])
    .join("")
    .trim();
  if (!zh) throw new Error("empty translation");
  return zh.length > 160 ? `${zh.slice(0, 160).trimEnd()}…` : zh;
}

/**
 * 仅对新增视频补中文简介：抓 description → 已是中文则截断直用，否则 gtx 翻译。
 * 写 item.description（buildNote 落为 ## 简介，卡片展示，标题不动）。
 */
export async function enrichYoutubeDesc(
  opts: YoutubeOptions,
  items: CollectedItem[],
  httpGet: (url: string) => Promise<string>,
): Promise<void> {
  const run = opts.run ?? defaultRun;
  const withId = items.filter((it) => (it as CollectedItem & { videoId?: string }).videoId && !it.description);
  if (withId.length === 0) return;
  const urls = withId.map((it) => `https://www.youtube.com/watch?v=${(it as CollectedItem & { videoId?: string }).videoId as string}`);
  const { stdout } = await run(opts.ytdlpPath, [...baseArgs(opts), "--print", "%(id)s\t%(description)j", ...urls]);
  const descs = new Map<string, string>();
  for (const line of stdout.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    try {
      const d = JSON.parse(line.slice(tab + 1)) as unknown;
      if (typeof d === "string" && d.trim()) descs.set(line.slice(0, tab), d);
    } catch {
      // 单条解析失败跳过
    }
  }
  for (const it of withId) {
    const vid = (it as CollectedItem & { videoId?: string }).videoId as string;
    const raw = descs.get(vid);
    if (!raw) continue;
    const snippet = snippetForTranslate(raw);
    if (!snippet) continue;
    try {
      it.description = isMostlyChinese(snippet)
        ? (snippet.length > 160 ? `${snippet.slice(0, 160).trimEnd()}…` : snippet)
        : await translateEnToZh(snippet, httpGet);
    } catch {
      // 翻译失败就留空，不阻塞
    }
  }
}
