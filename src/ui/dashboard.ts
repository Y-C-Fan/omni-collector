/** Dashboard 卡片墙：直接读 Vault md 文件，无数据库。红卡 = 上次挂掉的平台 + 一键重试。 */
import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { cardFromNote, groupCards } from "../markdown/writer.js";
import type { CardData } from "../markdown/writer.js";
import { PLATFORM_LABEL, PLATFORMS } from "../sync/model.js";
import type { Platform } from "../sync/model.js";
import type FavCollectorPlugin from "../main.js";

export const VIEW_TYPE_FAV_DASHBOARD = "fav-collector-dashboard";

export class FavDashboardView extends ItemView {
  private filter: Platform | "all" = "all";
  private folderFilter = "all";
  private showTrash = false;
  private unsubProgress?: () => void;
  private lastRenderAt = 0;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: FavCollectorPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_FAV_DASHBOARD;
  }

  getDisplayText(): string {
    return "收藏总览";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  onunload(): void {
    this.unsubProgress?.();
    this.unsubProgress = undefined;
  }

  private clock(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    const p = (n: number) => n.toString().padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  /** 同步进度区：跑的时候实时刷新 intention, 跑完留成绩单。 */
  private renderProgress(el: HTMLElement): void {
    const sp = this.plugin.syncProgress;
    const box = el.createDiv({ cls: "fav-syncgress" });
    if (sp.running) {
      const doneMap = new Map(sp.done.map((d) => [d.platform, d]));
      const parts: string[] = [];
      for (const p of PLATFORMS) {
        const d = doneMap.get(p);
        const tail = (x: { ok: boolean; added: number; trashed?: number }) => (x.ok ? ` +${x.added}${x.trashed ? ` 🗑${x.trashed}` : ""}` : "");
        if (d) parts.push(`${d.ok ? "✓" : "✗"} ${PLATFORM_LABEL[p]}${tail(d)}`);
        else if (sp.current === p) parts.push(`▶ ${PLATFORM_LABEL[p]}…`);
        else parts.push(`⏳ ${PLATFORM_LABEL[p]}`);
      }
      box.createDiv({ cls: "fav-syncgress-title", text: `同步中（${this.clock(sp.startedAt)} 开始）` });
      box.createDiv({ cls: "fav-syncgress-line", text: parts.join(" · ") });
      if (sp.step) box.createDiv({ cls: "fav-syncgress-step", text: `› ${sp.step}` });
    } else if (sp.done.length > 0) {
      const okN = sp.done.filter((d) => d.ok).length;
      box.createDiv({
        cls: "fav-syncgress-title",
        text: `上次同步 ${this.clock(sp.finishedAt)}：${okN}/${sp.done.length} 成功`,
      });
      box.createDiv({
        cls: "fav-syncgress-line",
        text: sp.done.map((d) => `${d.ok ? "✓" : "✗"} ${PLATFORM_LABEL[d.platform]} +${d.added}${d.trashed ? ` 🗑${d.trashed}` : ""}`).join(" · "),
      });
    } else {
      // 本次会话没跑过：读上次持久化成绩
      const last = this.plugin.settings.lastSync;
      const keys = PLATFORMS.filter((p) => last[p]);
      if (keys.length === 0) {
        box.createDiv({ cls: "fav-status", text: "还没同步过，点左上「同步全部」开始" });
        return;
      }
      box.createDiv({ cls: "fav-syncgress-title", text: "上次同步成绩" });
      box.createDiv({
        cls: "fav-syncgress-line",
        text: keys.map((p) => `${last[p].ok ? "✓" : "✗"} ${PLATFORM_LABEL[p]} ${this.clock(last[p].at)} +${last[p].added}`).join(" · "),
      });
    }
  }

  async render(): Promise<void> {
    this.unsubProgress?.();
    this.unsubProgress = this.plugin.onSyncProgress(() => {
      // 进度事件节流：重读全库很贵，2 秒内最多刷一次
      const now = Date.now();
      if (now - this.lastRenderAt < 2000) return;
      this.lastRenderAt = now;
      void this.render();
    });
    this.lastRenderAt = Date.now();
    const el = this.containerEl.children[1] as HTMLElement;
    el.empty();
    el.addClass("fav-dashboard");

    // 工具条
    const bar = el.createDiv({ cls: "fav-toolbar" });
    const syncBtn = bar.createEl("button", { text: this.plugin.syncing ? "同步中…" : "同步全部" });
    syncBtn.disabled = this.plugin.syncing;
    syncBtn.onclick = () => void this.plugin.syncAll().then(() => this.render());
    const openBtn = bar.createEl("button", { text: "打开 Fav Collector 文件夹" });
    openBtn.onclick = () => {
      const folder = this.app.vault.getFolderByPath("Fav Collector");
      if (folder) void this.app.workspace.getLeaf().openFile(folder as unknown as never);
      else new Notice("Fav Collector 文件夹还不存在，先点一次同步");
    };
    const status = bar.createSpan({ cls: "fav-status" });

    // 单平台同步（只更一家，不用全量跑）
    const oneBar = el.createDiv({ cls: "fav-filter" });
    for (const p of PLATFORMS) {
      const b = oneBar.createEl("button", { text: `同步${PLATFORM_LABEL[p]}` });
      b.disabled = this.plugin.syncing;
      b.onclick = () => void this.plugin.syncPlatform(p).then(() => this.render());
    }

    // 同步进度（实时）
    this.renderProgress(el);

    // 红卡：上次失败的平台
    const last = this.plugin.settings.lastSync;
    for (const p of PLATFORMS) {
      const rec = last[p];
      if (rec && !rec.ok) {
        const card = el.createDiv({ cls: "fav-error" });
        card.createDiv({ cls: "fav-error-title", text: `${PLATFORM_LABEL[p]} 上次同步失败` });
        card.createDiv({ text: (rec.error ?? "未知错误").slice(0, 200) });
        card.createDiv({ cls: "fav-status", text: `时间：${rec.at}` });
        const retry = card.createEl("button", { text: `重试 ${PLATFORM_LABEL[p]}` });
        retry.onclick = () => void this.plugin.syncPlatform(p).then(() => this.render());
      }
    }

    // 平台筛选
    const filterBar = el.createDiv({ cls: "fav-filter" });
    const mkPlatFilter = (key: Platform | "all", label: string) => {
      const b = filterBar.createEl("button", { text: label, cls: key === this.filter ? "active" : "" });
      b.onclick = () => {
        this.filter = key;
        this.folderFilter = "all";
        void this.render();
      };
    };
    mkPlatFilter("all", "全部");
    for (const p of PLATFORMS) mkPlatFilter(p, PLATFORM_LABEL[p]);

    // 卡片（按收藏夹分组）
    const { cards, trash, scanned, skipped } = await this.loadCards();
    const trashB = filterBar.createEl("button", { text: `回收站（${trash.length}）`, cls: this.showTrash ? "active" : "" });
    trashB.onclick = () => {
      this.showTrash = !this.showTrash;
      void this.render();
    };
    const now0 = new Date();
    const p2 = (n: number) => n.toString().padStart(2, "0");
    const stampNow = `${p2(now0.getHours())}:${p2(now0.getMinutes())}:${p2(now0.getSeconds())}`;
    if (this.showTrash) {
      // 回收站视图：远端已删的笔记，每条可一键恢复
      const tShown = trash.filter((c) => this.filter === "all" || c.platform === this.filter);
      const tGroups = groupCards(tShown, "all");
      status.setText(`回收站 ${tShown.length} 条（远端已删，内容保留）· 扫描 ${scanned} 文件 · 更新于 ${stampNow}`);
      for (const g of tGroups) {
        el.createEl("h4", { text: `${g.label}（${g.items.length}）`, cls: "fav-group-title" });
        const grid = el.createDiv({ cls: "fav-cards" });
        for (const c of g.items) {
          const card = this.cardEl(grid, c);
          const restore = card.createEl("button", { text: "恢复" });
          restore.onclick = () => void this.restoreTrash(c.path);
        }
      }
      return;
    }
    const shown = cards.filter((c) => this.filter === "all" || c.platform === this.filter);
    let groups = groupCards(shown, this.filter);
    // 收藏夹筛选条
    if (groups.length > 1) {
      const folderBar = el.createDiv({ cls: "fav-filter" });
      const allB = folderBar.createEl("button", { text: `全部文件夹（${shown.length}）`, cls: this.folderFilter === "all" ? "active" : "" });
      allB.onclick = () => {
        this.folderFilter = "all";
        void this.render();
      };
      for (const g of groups) {
        const b = folderBar.createEl("button", { text: `${g.label}（${g.items.length}）`, cls: g.key === this.folderFilter ? "active" : "" });
        b.onclick = () => {
          this.folderFilter = g.key;
          void this.render();
        };
      }
      if (this.folderFilter !== "all") groups = groups.filter((g) => g.key === this.folderFilter);
    }
    const now = new Date();
    const stamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    status.setText(
      `共 ${cards.length} 条${this.filter !== "all" ? `（${PLATFORM_LABEL[this.filter as Platform]} ${shown.length} 条）` : ""} · 扫描 ${scanned} 文件${skipped > 0 ? `（跳过 ${skipped} 无元数据）` : ""} · 更新于 ${stamp}`,
    );
    let rendered = 0;
    for (const g of groups) {
      if (this.folderFilter === "all") el.createEl("h4", { text: `${g.label}（${g.items.length}）`, cls: "fav-group-title" });
      const grid = el.createDiv({ cls: "fav-cards" });
      for (const c of g.items) {
        if (rendered >= 500) break;
        rendered += 1;
        this.cardEl(grid, c);
      }
      if (rendered >= 500) break;
    }
  }

  /** 单张卡片（标题/封面/meta/简介）；回收站视图复用后再挂恢复按钮。 */
  private cardEl(grid: HTMLElement, c: CardData): HTMLElement {
    const card = grid.createDiv({ cls: "fav-card" });
    if (c.cover) {
      const img = card.createEl("img", { cls: "fav-cover" });
      img.src = c.cover;
      img.loading = "lazy";
    }
    const title = card.createDiv({ cls: "fav-title" });
    const link = title.createEl("a", { text: c.title, cls: "internal-link" });
    link.onclick = (e) => {
      e.preventDefault();
      void this.openNote(c.path);
    };
    const meta = card.createDiv({ cls: "fav-meta" });
    const badge = meta.createSpan({ cls: `fav-badge ${c.platform}`, text: PLATFORM_LABEL[c.platform] });
    void badge;
    meta.appendText(`${c.dateLabel}${c.author ? ` · ${c.author}` : ""}${c.unfinished ? " · 未听完" : ""}`);
    if (c.description) card.createDiv({ cls: "fav-desc", text: c.description });
    return card;
  }

  private async openNote(path: string): Promise<void> {
    const f = this.app.vault.getFileByPath(path);
    if (f) await this.app.workspace.getLeaf().openFile(f);
    else new Notice(`文件不存在：${path}`);
  }

  private async loadCards(): Promise<{ cards: CardData[]; trash: CardData[]; scanned: number; skipped: number }> {
    const files = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith("Fav Collector/"));
    const out: CardData[] = [];
    const trash: CardData[] = [];
    let skipped = 0;
    for (const f of files) {
      try {
        const md = await this.app.vault.read(f);
        const card = cardFromNote(f.path, md, f.stat.ctime);
        if (card) (f.path.includes("/_已删除/") ? trash : out).push(card);
        else skipped += 1;
      } catch {
        skipped += 1;
      }
    }
    // 队列优先（YouTube 稍后再看/喜欢：位置号小=新加入在上）；其余按时间倒序→入库倒序
    out.sort((a, b) => {
      const aq = a.queueIndex;
      const bq = b.queueIndex;
      if (aq !== undefined && bq !== undefined && a.platform === b.platform) return aq - bq;
      if (aq !== undefined && bq === undefined) return -1;
      if (aq === undefined && bq !== undefined) return 1;
      return b.sortKey.localeCompare(a.sortKey) || b.ctime - a.ctime || a.path.localeCompare(b.path);
    });
    return { cards: out, trash, scanned: files.length, skipped };
  }

  /** 回收站恢复：去掉 _已删除/ 前缀搬回原位（内容不动）。 */
  private async restoreTrash(path: string): Promise<void> {
    const target = path.replace("Fav Collector/_已删除/", "Fav Collector/");
    if (target === path) return;
    const f = this.app.vault.getFileByPath(path);
    if (!f) {
      new Notice("文件已经不在了");
      return;
    }
    try {
      await this.app.vault.createFolder(target.slice(0, target.lastIndexOf("/"))).catch(() => undefined);
      await this.app.vault.rename(f, target);
      new Notice("已从回收站恢复");
    } catch (e) {
      new Notice(`恢复失败：${(e as Error).message}`);
    }
    await this.render();
  }
}
