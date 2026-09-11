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
export async function enrichYoutubeDates(opts: YoutubeOptions, items: CollectedItem[]): Promise<void> {
  const run = opts.run ?? defaultRun;
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
