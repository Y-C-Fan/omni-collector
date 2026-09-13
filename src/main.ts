/**
 * Fav Collector v0.8.0（local-only）：无 Engine、无 SQLite、无常驻进程。
 * 点按钮 → 各平台直抓 → 去重 → 写 md → Dashboard 卡片墙直接读文件。
 */
import { Notice, Plugin, WorkspaceLeaf, requestUrl } from "obsidian";
import { DEFAULT_SETTINGS, type FavSettings } from "./settings.js";import { FavSettingTab } from "./settings-tab.js";
import { FavDashboardView, VIEW_TYPE_FAV_DASHBOARD } from "./ui/dashboard.js";
import { parseFrontmatter } from "./markdown/writer.js";
import { syncPlatform, writeNewItems, relocateItems, refreshQueueOrder, collectGarbage } from "./sync/runner.js";
import { enrichYoutubeDates, enrichYoutubeDesc } from "./sync/youtube.js";
import { PLATFORMS, PLATFORM_LABEL } from "./sync/model.js";
import type { CollectedItem, HttpGet, Platform, PlatformResult } from "./sync/model.js";
import type { XyzCreds } from "./sync/xiaoyuzhou.js";

export interface SyncPlatformProgress {
  platform: Platform;
  ok: boolean;
  added: number;
  /** 本次远端已删、挪进回收站的条数 */
  trashed?: number;
  error?: string;
}

export interface SyncProgress {
  running: boolean;
  current?: Platform;
  /** 正在干嘛（一行，如"抓 YouTube（yt-dlp 扫 WL/LL）…"） */
  step?: string;
  done: SyncPlatformProgress[];
  startedAt?: string;
  finishedAt?: string;
}

export default class FavCollectorPlugin extends Plugin {
  settings!: FavSettings;
  syncing = false;
  private statusEl?: HTMLElement;
  /** 同步进度（面板订阅，实时重渲染）。 */
  syncProgress: SyncProgress = { running: false, done: [] };
  private progressListeners = new Set<() => void>();

  onSyncProgress(cb: () => void): () => void {
    this.progressListeners.add(cb);
    return () => {
      this.progressListeners.delete(cb);
    };
  }

  private emitProgress(): void {
    for (const cb of [...this.progressListeners]) {
      try {
        cb();
      } catch {
        // 忽略订阅者异常
      }
    }
  }

  /** 各平台抓取方式（一行 step 用，程序员友好，拒绝黑盒）。 */
  private fetchHow(p: Platform): string {
    switch (p) {
      case "youtube":
        return "yt-dlp 扫 WL/LL（flat，需 cookies）";
      case "github":
        return "gh api 拉 stars";
      case "x":
        return "GraphQL 抓 bookmarks";
      case "xiaoyuzhou":
        return "POST 收听历史";
      case "bilibili":
        return "API 拉收藏夹+稍后再看";
      case "zhihu":
        return "官方 API 拉公开收藏夹";
    }
  }

  private setStep(text: string): void {
    this.syncProgress.step = text;
    this.emitProgress();
  }

  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) ?? {}) };
    this.statusEl = this.addStatusBarItem();
    this.setStatus("Fav: 就绪");

    this.registerView(VIEW_TYPE_FAV_DASHBOARD, (leaf: WorkspaceLeaf) => new FavDashboardView(leaf, this));

    this.addRibbonIcon("refresh-cw", "同步全部收藏", () => void this.syncAll());
    this.addRibbonIcon("layout-dashboard", "打开收藏总览", () => void this.openDashboard());
    this.addCommand({ id: "sync-all", name: "同步全部收藏", callback: () => void this.syncAll() });
    for (const p of PLATFORMS) {
      this.addCommand({ id: `sync-${p}`, name: `只同步${PLATFORM_LABEL[p]}`, callback: () => void this.syncPlatform(p) });
    }
    this.addCommand({
      id: "open-dashboard",
      name: "打开收藏总览",
      callback: () => void this.openDashboard(),
    });
    this.addSettingTab(new FavSettingTab(this));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private setStatus(text: string): void {
    this.statusEl?.setText(text);
  }

  private http(): HttpGet {
    return async (url, headers) => {
      const res = await requestUrl({ url, method: "GET", headers: headers ?? {} });
      if (res.status >= 400) throw new Error(`HTTP ${res.status}: ${url.slice(0, 80)}`);
      return res.json;
    };
  }

  private runnerSettings() {
    return {
      biliCookies: this.settings.biliCookies,
      xCookies: this.settings.xCookies,
      zhihuSecret: this.settings.zhihuSecret,
      ytdlpPath: this.settings.ytdlpPath || DEFAULT_SETTINGS.ytdlpPath,
      ytCookieFile: this.settings.ytCookieFile || undefined,
      xyzAccessToken: this.settings.xyzAccessToken,
      xyzRefreshToken: this.settings.xyzRefreshToken,
      xyzDeviceId: this.settings.xyzDeviceId,
    };
  }

  private xyzPost() {
    return async (url: string, body: unknown, headers: Record<string, string>) => {
      const res = await requestUrl({
        url,
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {}),
        contentType: "application/json",
        throw: false,
      });
      const hs: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers ?? {})) hs[k.toLowerCase()] = String(v);
      let data: unknown = null;
      try {
        data = res.json;
      } catch {
        data = res.text;
      }
      return { data, headers: hs, status: res.status };
    };
  }

  private runnerDeps() {
    return {
      http: this.http(),
      post: this.xyzPost(),
      onXyzCreds: (next: XyzCreds) => {
        this.settings.xyzAccessToken = next.accessToken;
        if (next.refreshToken) this.settings.xyzRefreshToken = next.refreshToken;
        if (next.deviceId) this.settings.xyzDeviceId = next.deviceId;
        void this.saveSettings();
      },
    };
  }

  async testPlatform(platform: Platform): Promise<PlatformResult> {
    return syncPlatform(platform, this.runnerSettings(), this.runnerDeps());
  }

  /** 扫 Vault 组装去重集合（fav_id + url，兼容旧笔记）。 */
  async scanExisting(): Promise<{ favIds: Set<string>; urls: Set<string>; favIdToPath: Map<string, string>; urlToPath: Map<string, string> }> {
    const favIds = new Set<string>();
    const urls = new Set<string>();
    const favIdToPath = new Map<string, string>();
    const urlToPath = new Map<string, string>();
    const files = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith("Fav Collector/"));
    for (const f of files) {
      try {
        const fm = parseFrontmatter(await this.app.vault.read(f));
        if (fm.fav_id) {
          favIds.add(fm.fav_id);
          if (!favIdToPath.has(fm.fav_id)) favIdToPath.set(fm.fav_id, f.path);
        }
        if (fm.url) {
          urls.add(fm.url);
          if (!urlToPath.has(fm.url)) urlToPath.set(fm.url, f.path);
        }
      } catch {
        // 跳过坏文件
      }
    }
    return { favIds, urls, favIdToPath, urlToPath };
  }

  async syncPlatform(platform: Platform): Promise<void> {
    if (this.syncing) {
      new Notice("正在同步中，稍等…");
      return;
    }
    this.syncing = true;
    this.syncProgress = { running: true, current: platform, done: [], startedAt: new Date().toISOString() };
    this.emitProgress();
    try {
      new Notice(`同步 ${platform} 中…（总览页看实时进度）`);
      this.setStatus(`Fav: 同步 ${platform}…`);
      this.setStep(`抓 ${PLATFORM_LABEL[platform]}：${this.fetchHow(platform)}…`);
      const result = await syncPlatform(platform, this.runnerSettings(), this.runnerDeps());
      const { favIds, urls, favIdToPath, urlToPath } = await this.scanExisting();
      if (result.ok) this.setStep(`${PLATFORM_LABEL[platform]}抓到 ${result.items.length} 条 → 去重/归档/落盘…`);
      const moved = result.ok
        ? await relocateItems(this.fsAdapter(), favIdToPath, urlToPath, [result])
        : { moved: 0, movedPaths: [] as string[] };
      const report = await writeNewItems(this.fsAdapter(), favIds, urls, [result], this.ytEnrich());
      let trashed = 0;
      if (result.ok) {
        this.setStep(`${PLATFORM_LABEL[platform]}队列位置刷新（收藏夹是栈，新加的顶上来）…`);
        await refreshQueueOrder(this.fsAdapter(), urlToPath, result.items);
        this.setStep(`${PLATFORM_LABEL[platform]}检查远端已删除（进回收站，不真删）…`);
        trashed = (await collectGarbage(this.fsAdapter(), urlToPath, [result])).trashed;
      }
      this.settings.lastSync[platform] = {
        at: new Date().toISOString(),
        ok: result.ok,
        added: report.added,
        error: result.error,
      };
      await this.saveSettings();
      this.syncProgress.running = false;
      this.syncProgress.current = undefined;
      this.syncProgress.step = undefined;
      this.syncProgress.done = [{ platform, ok: result.ok, added: report.added, trashed, error: result.error }];
      this.setStatus(result.ok ? `Fav: ${platform} +${report.added}` : `Fav: ${platform} 失败`);
      this.emitProgress();
      new Notice(result.ok ? `${platform} 同步完成，新增 ${report.added} 条${moved.moved > 0 ? `，归档 ${moved.moved} 条` : ""}${trashed > 0 ? `，远端已删 ${trashed} 条进回收站` : ""}` : `${platform} 失败：${result.error}`);
    } finally {
      this.syncing = false;
    }
  }

  private fsAdapter() {
    const va = this.app.vault;
    return {
      exists: (p: string) => va.adapter.exists(p),
      mkdir: (p: string) => va.createFolder(p).then(() => undefined).catch(() => undefined),
      write: (p: string, c: string) => va.create(p, c).then(() => undefined),
      read: async (p: string) => {
        const f = va.getFileByPath(p);
        if (!f) throw new Error(`找不到文件：${p}`);
        return va.read(f);
      },
      overwrite: async (p: string, c: string) => {
        const f = va.getFileByPath(p);
        if (!f) throw new Error(`找不到文件：${p}`);
        await va.modify(f, c);
      },
      rename: async (oldPath: string, newPath: string) => {
        const f = va.getFileByPath(oldPath);
        if (!f) throw new Error(`找不到文件：${oldPath}`);
        await va.rename(f, newPath);
      },
    };
  }

  private ytEnrich() {
    const s = this.runnerSettings();
    const gtxGet = async (url: string) => (await requestUrl({ url })).text;
    return async (items: CollectedItem[]) => {
      try {
        await enrichYoutubeDates({ ytdlpPath: s.ytdlpPath, cookieFile: s.ytCookieFile }, items);
      } catch {
        // 日期补不上不阻塞落盘
      }
      try {
        await enrichYoutubeDesc({ ytdlpPath: s.ytdlpPath, cookieFile: s.ytCookieFile }, items, gtxGet);
      } catch {
        // 简介补不上不阻塞落盘
      }
    };
  }

  async syncAll(): Promise<void> {
    if (this.syncing) {
      new Notice("正在同步中，稍等…");
      return;
    }
    this.syncing = true;
    this.syncProgress = { running: true, done: [], startedAt: new Date().toISOString() };
    this.emitProgress();
    try {
      new Notice("开始同步全部平台…（总览页看实时进度）");
      const settings = this.runnerSettings();
      const deps = this.runnerDeps();
      const { favIds, urls, favIdToPath, urlToPath } = await this.scanExisting();
      let totalAdded = 0;
      let totalMoved = 0;
      let totalTrashed = 0;
      let idx = 0;
      for (const p of PLATFORMS) {
        idx += 1;
        this.syncProgress.current = p;
        this.setStatus(`Fav: 同步 ${p}（${idx}/${PLATFORMS.length}）…`);
        this.setStep(`[${idx}/${PLATFORMS.length}] 抓 ${PLATFORM_LABEL[p]}：${this.fetchHow(p)}…`);
        this.emitProgress();
        let result: PlatformResult;
        try {
          result = await syncPlatform(p, settings, deps);
        } catch (e) {
          result = { platform: p, ok: false, items: [], error: (e as Error).message };
        }
        let added = 0;
        let trashed = 0;
        if (result.ok) {
          try {
            this.setStep(
              p === "youtube"
                ? `${PLATFORM_LABEL[p]}抓到 ${result.items.length} 条 → 补日期+简介（yt-dlp 逐视频，最慢的一步）…`
                : `${PLATFORM_LABEL[p]}抓到 ${result.items.length} 条 → 去重/归档/落盘…`,
            );
            const mv = await relocateItems(this.fsAdapter(), favIdToPath, urlToPath, [result]);
            totalMoved += mv.moved;
            const rep = await writeNewItems(this.fsAdapter(), favIds, urls, [result], this.ytEnrich());
            this.setStep(`${PLATFORM_LABEL[p]}队列位置刷新（收藏夹是栈，新加的顶上来）…`);
            await refreshQueueOrder(this.fsAdapter(), urlToPath, result.items);
            this.setStep(`${PLATFORM_LABEL[p]}检查远端已删除（进回收站，不真删）…`);
            trashed = (await collectGarbage(this.fsAdapter(), urlToPath, [result])).trashed;
            totalTrashed += trashed;
            added = rep.added;
            totalAdded += added;
          } catch (e) {
            result = { platform: p, ok: false, items: [], error: `写笔记失败：${(e as Error).message}` };
          }
        }
        this.syncProgress.done.push({ platform: p, ok: result.ok, added, trashed, error: result.error });
        this.settings.lastSync[p] = { at: new Date().toISOString(), ok: result.ok, added, error: result.error };
        await this.saveSettings();
        this.emitProgress();
      }
      this.syncProgress.running = false;
      this.syncProgress.current = undefined;
      this.syncProgress.step = undefined;
      this.syncProgress.finishedAt = new Date().toISOString();
      const failed = this.syncProgress.done.filter((d) => !d.ok).map((d) => d.platform);
      const okCount = this.syncProgress.done.length - failed.length;
      this.setStatus(failed.length === 0 ? `Fav: 完成 +${totalAdded}` : `Fav: ${failed.join("、")}失败`);
      this.emitProgress();
      new Notice(
        failed.length === 0
          ? `同步完成：${PLATFORMS.length}/${PLATFORMS.length} 平台，新增 ${totalAdded} 条${totalMoved > 0 ? `，归档 ${totalMoved} 条` : ""}${totalTrashed > 0 ? `，远端已删 ${totalTrashed} 条进回收站` : ""}`
          : `同步完成 ${okCount}/${PLATFORMS.length}，新增 ${totalAdded} 条${totalTrashed > 0 ? `，进回收站 ${totalTrashed} 条` : ""}；失败：${failed.join("、")}（看总览红卡重试）`,
      );
      await this.openDashboard();
    } finally {
      this.syncing = false;
    }
  }

  async openDashboard(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FAV_DASHBOARD);
    if (leaves.length > 0) {
      void this.app.workspace.revealLeaf(leaves[0]);
      const view = leaves[0].view;
      if (view instanceof FavDashboardView) await view.render();
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_FAV_DASHBOARD, active: true });
  }
}
