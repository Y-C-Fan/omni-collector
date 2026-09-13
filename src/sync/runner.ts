/** 编排：各平台抓取 → 对照现存笔记去重 → 只写新文件。跑挂一个平台不影响其他。 */
import { collectBilibili } from "./bilibili.js";
import { collectGithub } from "./github.js";
import { collectYoutube, enrichYoutubeDates } from "./youtube.js";
import { collectZhihu } from "./zhihu.js";
import { collectX } from "./x.js";
import { collectXiaoyuzhouHistory, type XyzCreds, type XyzHttp } from "./xiaoyuzhou.js";
import { buildNote, notePathFor } from "../markdown/writer.js";
import type { CollectedItem, HttpGet, Platform, PlatformResult } from "./model.js";
import { PLATFORMS } from "./model.js";

export interface RunnerSettings {
  biliCookies: string;
  xCookies: string;
  zhihuSecret: string;
  ytdlpPath: string;
  ytCookieFile?: string;
  xyzAccessToken: string;
  xyzRefreshToken: string;
  xyzDeviceId: string;
}

export interface RunnerDeps {
  http: HttpGet;
  post: XyzHttp["post"];
  onXyzCreds?: (next: XyzCreds) => void;
}

export interface FsAdapter {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  write(path: string, content: string): Promise<void>;
  read(path: string): Promise<string>;
  /** 覆盖已存在文件内容（仅 refreshYoutubeOrder 用，只碰 frontmatter 一行）。 */
  overwrite(path: string, content: string): Promise<void>;
  /** 把旧路径笔记搬到新路径（仅改路径，不碰内容）；不支持则抛错由调用方吞掉 */
  rename(oldPath: string, newPath: string): Promise<void>;
}

export async function syncPlatform(
  platform: Platform,
  settings: RunnerSettings,
  deps: RunnerDeps,
): Promise<PlatformResult> {
  const { http, post, onXyzCreds } = deps;
  try {
    let items: CollectedItem[];
    switch (platform) {
      case "bilibili":
        items = await collectBilibili(http, settings.biliCookies);
        break;
      case "youtube":
        items = await collectYoutube({ ytdlpPath: settings.ytdlpPath, cookieFile: settings.ytCookieFile });
        break;
      case "zhihu":
        items = await collectZhihu(http, settings.zhihuSecret);
        break;
      case "x":
        items = await collectX(http, settings.xCookies);
        break;
      case "github":
        items = await collectGithub();
        break;
      case "xiaoyuzhou":
        // 主入口：收听历史（按播客归档+标未听完）；收藏接口服务端异常，暂不走
        items = await collectXiaoyuzhouHistory(
          { post },
          {
            accessToken: settings.xyzAccessToken,
            refreshToken: settings.xyzRefreshToken || undefined,
            deviceId: settings.xyzDeviceId || undefined,
          },
          onXyzCreds,
        );
        break;
    }
    return { platform, ok: true, items };
  } catch (e) {
    return { platform, ok: false, items: [], error: (e as Error).message };
  }
}

export interface SyncReport {
  added: number;
  addedPaths: string[];
  results: PlatformResult[];
}

/** existing: 已存在笔记的 fav_id + url（调用方扫 Vault 组装）。 */
export async function writeNewItems(
  fs: FsAdapter,
  existingFavIds: Set<string>,
  existingUrls: Set<string>,
  results: PlatformResult[],
  enrichYoutube: (items: CollectedItem[]) => Promise<void>,
): Promise<SyncReport> {
  const addedPaths: string[] = [];
  for (const r of results) {
    if (!r.ok) continue;
    const fresh = r.items.filter((it) => !existingFavIds.has(it.favId) && !existingUrls.has(it.url));
    if (r.platform === "youtube" && fresh.length > 0) {
      try {
        await enrichYoutube(fresh);
      } catch {
        // 日期补不上不阻塞落盘
      }
    }
    for (const it of fresh) {
      const p = notePathFor(it);
      const dir = p.slice(0, p.lastIndexOf("/"));
      await fs.mkdir(dir);
      if (await fs.exists(p)) continue; // 同名文件已存在则跳过，绝不覆盖
      await fs.write(p, buildNote(it));
      existingFavIds.add(it.favId);
      existingUrls.add(it.url);
      addedPaths.push(p);
    }
  }
  return { added: addedPaths.length, addedPaths, results };
}

/**
 * 搬家：已存在笔记若不在当前应有目录（收藏夹改名/新加 folder 规则，如 YouTube LL→喜欢），
 * 只改路径不碰内容。按 favId 找，旧版 YT 笔记 fav_id 无 WL_/LL_ 前缀则按 url 找。
 */
export async function relocateItems(
  fs: FsAdapter,
  favIdToPath: Map<string, string>,
  urlToPath: Map<string, string>,
  results: PlatformResult[],
): Promise<{ moved: number; movedPaths: string[] }> {
  const movedPaths: string[] = [];
  for (const r of results) {
    if (!r.ok) continue;
    for (const it of r.items) {
      const target = notePathFor(it);
      const known = favIdToPath.get(it.favId) ?? urlToPath.get(it.url);
      if (!known || known === target) continue;
      if (await fs.exists(target)) continue; // 目标被占则跳过，绝不覆盖
      try {
        const dir = target.slice(0, target.lastIndexOf("/"));
        await fs.mkdir(dir);
        await fs.rename(known, target);
        favIdToPath.set(it.favId, target);
        if (it.url) urlToPath.set(it.url, target);
        movedPaths.push(`${known} -> ${target}`);
      } catch {
        // 搬不动不阻塞同步
      }
    }
  }
  return { moved: movedPaths.length, movedPaths };
}

/**
 * 刷新 YouTube 队列位置号：稍后再看是栈，新加的顶上来，旧位置全变。
 * 只改 frontmatter 的 playlist_index 行（或在 url 行后插入），不动用户区。
 */
export async function refreshYoutubeOrder(
  fs: FsAdapter,
  urlToPath: Map<string, string>,
  items: CollectedItem[],
): Promise<{ updated: number }> {
  let updated = 0;
  for (const it of items) {
    if (it.platform !== "youtube" || it.playlistIndex === undefined) continue;
    const p = urlToPath.get(it.url);
    if (!p) continue;
    try {
      const md = await fs.read(p);
      const nl = md.includes("\r\n") ? "\r\n" : "\n";
      const lines = md.split(/\r?\n/);
      const fmEnd = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
      if (fmEnd <= 0) continue;
      let touched = false;
      for (let i = 1; i < fmEnd; i += 1) {
        if (/^playlist_index:\s*\d+/.test(lines[i])) {
          const next = `playlist_index: ${it.playlistIndex}`;
          if (lines[i] !== next) {
            lines[i] = next;
            touched = true;
          }
          break;
        }
      }
      if (!touched) {
        const urlIdx = lines.findIndex((l, i) => i < fmEnd && /^url:\s*/.test(l));
        if (urlIdx < 0) continue;
        lines.splice(urlIdx + 1, 0, `playlist_index: ${it.playlistIndex}`);
        touched = true;
      }
      if (touched) {
        await fs.overwrite(p, lines.join(nl));
        updated += 1;
      }
    } catch {
      // 单条失败不阻塞
    }
  }
  return { updated };
}

export { PLATFORMS };
