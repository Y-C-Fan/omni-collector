"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FavCollectorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var DEFAULT_SETTINGS = {
  biliCookies: "",
  xCookies: "",
  zhihuSecret: "",
  ytdlpPath: "D:\\DevEnv\\bin\\yt-dlp.exe",
  ytCookieFile: "",
  xyzAccessToken: "",
  xyzRefreshToken: "",
  xyzDeviceId: "",
  lastSync: {}
};

// src/settings-tab.ts
var import_obsidian = require("obsidian");
var FavSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    containerEl.createEl("h3", { text: "\u767B\u5F55\u6001\uFF08\u53EA\u5B58\u672C\u673A data.json\uFF0C\u4E0D\u4E0A\u4F20\uFF09" });
    new import_obsidian.Setting(containerEl).setName("B\u7AD9 Cookie").setDesc('SESSDATA \u7C98\u8D34 "k=v; k2=v2" \u683C\u5F0F\uFF08Cookie-Editor \u5BFC\u51FA\uFF09').addTextArea(
      (t) => t.setValue(s.biliCookies).onChange(async (v) => {
        s.biliCookies = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("X Cookie").setDesc('auth_token + ct0\uFF0C"k=v; k2=v2" \u683C\u5F0F\uFF08\u548C\u5468\u62A5\u540C\u4E00\u5957\uFF09').addTextArea(
      (t) => t.setValue(s.xCookies).onChange(async (v) => {
        s.xCookies = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u77E5\u4E4E Access Secret").setDesc("developer.zhihu.com/profile \u751F\u6210").addText(
      (t) => t.setValue(s.zhihuSecret).onChange(async (v) => {
        s.zhihuSecret = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("yt-dlp \u8DEF\u5F84").addText(
      (t) => t.setValue(s.ytdlpPath).onChange(async (v) => {
        s.ytdlpPath = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("YouTube Cookie \u6587\u4EF6\uFF08\u53EF\u9009\uFF09").setDesc("\u7559\u7A7A\u5219\u8D70 Firefox \u4E13\u7528\u94A5\u5319\u6263\uFF0C\u514D\u7EF4\u62A4").addText(
      (t) => t.setValue(s.ytCookieFile).onChange(async (v) => {
        s.ytCookieFile = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u5C0F\u5B87\u5B99 access_token").setDesc("\u7F51\u9875\u7248\u626B\u7801\u767B\u5F55\u540E\u4ECE\u8BF7\u6C42\u5934\u62F7\uFF08refresh_token \u4E00\u8D77\u7C98\uFF0C\u8FC7\u671F\u81EA\u52A8\u7EED\uFF09;\u540C\u6B65\u6536\u542C\u5386\u53F2\uFF0C\u6309\u64AD\u5BA2\u5F52\u6863").addText(
      (t) => t.setValue(s.xyzAccessToken).onChange(async (v) => {
        s.xyzAccessToken = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u5C0F\u5B87\u5B99 refresh_token\uFF08\u53EF\u9009\uFF09").addText(
      (t) => t.setValue(s.xyzRefreshToken).onChange(async (v) => {
        s.xyzRefreshToken = v.trim();
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "\u8FDE\u901A\u6027\u6D4B\u8BD5" });
    for (const p of ["bilibili", "youtube", "zhihu", "x", "github", "xiaoyuzhou"]) {
      new import_obsidian.Setting(containerEl).setName(`\u6D4B\u8BD5 ${p}`).addButton(
        (b) => b.setButtonText("\u6D4B\u8BD5").onClick(async () => {
          new import_obsidian.Notice(`\u6D4B\u8BD5 ${p} \u4E2D\u2026`);
          const r = await this.plugin.testPlatform(p);
          new import_obsidian.Notice(r.ok ? `${p} OK\uFF08${r.items.length} \u6761\uFF09` : `${p} \u5931\u8D25\uFF1A${r.error}`);
        })
      );
    }
  }
};

// src/ui/dashboard.ts
var import_obsidian2 = require("obsidian");

// src/sync/model.ts
var PLATFORMS = ["bilibili", "youtube", "zhihu", "x", "github", "xiaoyuzhou"];
var PLATFORM_LABEL = {
  bilibili: "B\u7AD9",
  youtube: "YouTube",
  zhihu: "\u77E5\u4E4E",
  x: "X",
  github: "GitHub",
  xiaoyuzhou: "\u5C0F\u5B87\u5B99"
};
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function toDateOnly(v) {
  if (v === null || v === void 0) return void 0;
  if (typeof v === "number" && Number.isFinite(v)) {
    const sec = v > 1e12 ? Math.floor(v / 1e3) : Math.floor(v);
    const d = new Date(sec * 1e3);
    if (Number.isNaN(d.getTime())) return void 0;
    const cst = new Date(d.getTime() + 8 * 3600 * 1e3);
    return cst.toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  }
  return void 0;
}
function parseCookieString(raw) {
  const out = {};
  for (const part of (raw ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (k) out[k] = val;
  }
  return out;
}
function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}
function makeItem(platform, nativeId, url, title) {
  return { platform, nativeId, favId: `${platform}:${nativeId}`, url, title };
}

// src/markdown/writer.ts
function sanitizeFilename(name) {
  return (name || "untitled").replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
}
function yamlString(v) {
  return JSON.stringify(String(v ?? ""));
}
function notePathFor(item) {
  const dir = item.folder?.trim() || (item.watchLater ? "\u7A0D\u540E\u518D\u770B" : void 0);
  const base = `Fav Collector/${item.platform}${dir ? `/${sanitizeFilename(dir)}` : ""}`;
  const datePrefix = item.publishedAt?.trim() ? `${item.publishedAt.trim()}_` : "";
  return `${base}/${datePrefix}${sanitizeFilename(item.title)}.md`;
}
function buildNote(item) {
  const fm = [
    "---",
    `platform: ${yamlString(item.platform)}`,
    `fav_id: ${yamlString(item.favId)}`,
    `url: ${yamlString(item.url)}`,
    ...item.author ? [`author: ${yamlString(item.author)}`] : [],
    ...item.publishedAt ? [`published_at: ${yamlString(item.publishedAt)}`] : [],
    ...item.playlistIndex !== void 0 ? [`playlist_index: ${item.playlistIndex}`] : [],
    ...item.unfinished ? [`unfinished: true`] : [],
    ...item.folder ? [`folder: ${yamlString(item.folder)}`] : [],
    ...item.coverUrl ? [`cover: ${yamlString(item.coverUrl)}`] : [],
    "---",
    "",
    `# ${item.title.replace(/#/g, "\\#")}`,
    "",
    ...item.coverUrl ? [`![cover](${item.coverUrl})`, ""] : [],
    ...item.author ? [`\u4F5C\u8005\uFF1A${item.author}`, ""] : [],
    ...item.publishedAt ? [`\u53D1\u5E03\u65E5\u671F\uFF1A${item.publishedAt}`, ""] : [],
    ...item.description ? ["## \u7B80\u4ECB", "", item.description, ""] : [],
    "<!-- \u4EE5\u4E0B\u4E3A\u7528\u6237\u79C1\u6709\u7F16\u8F91\u533A\uFF0C\u4EFB\u4F55\u81EA\u52A8\u5316\u903B\u8F91\u7981\u6B62\u4FEE\u6539 -->",
    "## \u6211\u7684\u7B14\u8BB0",
    ""
  ];
  return fm.join("\n");
}
function parseFrontmatter(md) {
  const norm = md.replace(/\r\n?/g, "\n");
  const out = {};
  const m = norm.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"') || v.startsWith("'") && v.endsWith("'")) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    }
    if (k) out[k] = v;
  }
  return out;
}
function cardFromNote(path, md, ctime = 0) {
  md = md.replace(/\r\n?/g, "\n");
  const fm = parseFrontmatter(md);
  if (!fm.platform || !fm.url) return null;
  const headings = [...md.matchAll(/^# (.+)$/gm)].map((m) => m[1]).filter((h) => h !== "Fav Collector System Zone");
  const title = (headings[0] ?? fm.url).replace(/\\#/g, "#");
  let cover = fm.cover;
  if (!cover && fm.platform === "youtube") {
    const m = fm.url.match(/watch\?v=([\w-]{6,})/);
    if (m) cover = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
  }
  let folder = fm.folder;
  const segs = path.split("/");
  if (segs.length >= 4) folder = segs[2];
  let description;
  const introM = md.match(/^## 简介\s*\n([\s\S]*?)(?=^## |^# |<!--|\Z)/m);
  if (introM) description = introM[1].trim().slice(0, 200) || void 0;
  const fileName = segs[segs.length - 1] ?? "";
  const dateM = fileName.match(/^(\d{4}-\d{2}-\d{2})_/);
  const publishedAt = fm.published_at || void 0;
  const sortKey = publishedAt ?? dateM?.[1] ?? "";
  const unfinished = fm.unfinished === "true";
  const qi = fm.playlist_index !== void 0 && fm.playlist_index !== "" ? Number(fm.playlist_index) : void 0;
  const queueIndex = qi !== void 0 && Number.isFinite(qi) ? qi : void 0;
  const dateLabel = queueIndex !== void 0 ? `#${queueIndex + 1}${publishedAt ? ` \xB7 ${publishedAt}` : ""}` : publishedAt ?? dateM?.[1] ?? "\u672A\u77E5\u65F6\u95F4";
  return {
    path,
    platform: fm.platform,
    title,
    url: fm.url,
    author: fm.author,
    publishedAt,
    unfinished,
    folder,
    cover,
    description,
    sortKey,
    dateLabel,
    queueIndex,
    ctime
  };
}
function groupCards(cards, platform) {
  const map = /* @__PURE__ */ new Map();
  for (const c of cards) {
    const folder = c.folder ?? "\u672A\u5206\u7C7B";
    const key = platform === "all" ? `${c.platform}::${folder}` : folder;
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  const groups = [...map.entries()].map(([key, items]) => {
    let label;
    if (platform === "all") {
      const [p, f] = key.split("::");
      label = `${PLATFORM_LABEL[p]} \xB7 ${f}`;
    } else {
      label = key;
    }
    return { key, label, items };
  });
  groups.sort((a, b) => {
    const au = a.label.endsWith("\u672A\u5206\u7C7B") ? 1 : 0;
    const bu = b.label.endsWith("\u672A\u5206\u7C7B") ? 1 : 0;
    if (au !== bu) return au - bu;
    if (b.items.length !== a.items.length) return b.items.length - a.items.length;
    return a.label.localeCompare(b.label, "zh");
  });
  return groups;
}

// src/ui/dashboard.ts
var VIEW_TYPE_FAV_DASHBOARD = "fav-collector-dashboard";
var FavDashboardView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.filter = "all";
    this.folderFilter = "all";
    this.showTrash = false;
    this.lastRenderAt = 0;
  }
  getViewType() {
    return VIEW_TYPE_FAV_DASHBOARD;
  }
  getDisplayText() {
    return "\u6536\u85CF\u603B\u89C8";
  }
  async onOpen() {
    await this.render();
  }
  onunload() {
    this.unsubProgress?.();
    this.unsubProgress = void 0;
  }
  clock(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const p = (n) => n.toString().padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  /** 同步进度区：跑的时候实时刷新 intention, 跑完留成绩单。 */
  renderProgress(el) {
    const sp = this.plugin.syncProgress;
    const box = el.createDiv({ cls: "fav-syncgress" });
    if (sp.running) {
      const doneMap = new Map(sp.done.map((d) => [d.platform, d]));
      const parts = [];
      for (const p of PLATFORMS) {
        const d = doneMap.get(p);
        const tail = (x) => x.ok ? ` +${x.added}${x.trashed ? ` \u{1F5D1}${x.trashed}` : ""}` : "";
        if (d) parts.push(`${d.ok ? "\u2713" : "\u2717"} ${PLATFORM_LABEL[p]}${tail(d)}`);
        else if (sp.current === p) parts.push(`\u25B6 ${PLATFORM_LABEL[p]}\u2026`);
        else parts.push(`\u23F3 ${PLATFORM_LABEL[p]}`);
      }
      box.createDiv({ cls: "fav-syncgress-title", text: `\u540C\u6B65\u4E2D\uFF08${this.clock(sp.startedAt)} \u5F00\u59CB\uFF09` });
      box.createDiv({ cls: "fav-syncgress-line", text: parts.join(" \xB7 ") });
      if (sp.step) box.createDiv({ cls: "fav-syncgress-step", text: `\u203A ${sp.step}` });
    } else if (sp.done.length > 0) {
      const okN = sp.done.filter((d) => d.ok).length;
      box.createDiv({
        cls: "fav-syncgress-title",
        text: `\u4E0A\u6B21\u540C\u6B65 ${this.clock(sp.finishedAt)}\uFF1A${okN}/${sp.done.length} \u6210\u529F`
      });
      box.createDiv({
        cls: "fav-syncgress-line",
        text: sp.done.map((d) => `${d.ok ? "\u2713" : "\u2717"} ${PLATFORM_LABEL[d.platform]} +${d.added}${d.trashed ? ` \u{1F5D1}${d.trashed}` : ""}`).join(" \xB7 ")
      });
    } else {
      const last = this.plugin.settings.lastSync;
      const keys = PLATFORMS.filter((p) => last[p]);
      if (keys.length === 0) {
        box.createDiv({ cls: "fav-status", text: "\u8FD8\u6CA1\u540C\u6B65\u8FC7\uFF0C\u70B9\u5DE6\u4E0A\u300C\u540C\u6B65\u5168\u90E8\u300D\u5F00\u59CB" });
        return;
      }
      box.createDiv({ cls: "fav-syncgress-title", text: "\u4E0A\u6B21\u540C\u6B65\u6210\u7EE9" });
      box.createDiv({
        cls: "fav-syncgress-line",
        text: keys.map((p) => `${last[p].ok ? "\u2713" : "\u2717"} ${PLATFORM_LABEL[p]} ${this.clock(last[p].at)} +${last[p].added}`).join(" \xB7 ")
      });
    }
  }
  async render() {
    this.unsubProgress?.();
    this.unsubProgress = this.plugin.onSyncProgress(() => {
      const now2 = Date.now();
      if (now2 - this.lastRenderAt < 2e3) return;
      this.lastRenderAt = now2;
      void this.render();
    });
    this.lastRenderAt = Date.now();
    const el = this.containerEl.children[1];
    el.empty();
    el.addClass("fav-dashboard");
    const bar = el.createDiv({ cls: "fav-toolbar" });
    const syncBtn = bar.createEl("button", { text: this.plugin.syncing ? "\u540C\u6B65\u4E2D\u2026" : "\u540C\u6B65\u5168\u90E8" });
    syncBtn.disabled = this.plugin.syncing;
    syncBtn.onclick = () => void this.plugin.syncAll().then(() => this.render());
    const openBtn = bar.createEl("button", { text: "\u6253\u5F00 Fav Collector \u6587\u4EF6\u5939" });
    openBtn.onclick = () => {
      const folder = this.app.vault.getFolderByPath("Fav Collector");
      if (folder) void this.app.workspace.getLeaf().openFile(folder);
      else new import_obsidian2.Notice("Fav Collector \u6587\u4EF6\u5939\u8FD8\u4E0D\u5B58\u5728\uFF0C\u5148\u70B9\u4E00\u6B21\u540C\u6B65");
    };
    const status = bar.createSpan({ cls: "fav-status" });
    const oneBar = el.createDiv({ cls: "fav-filter" });
    for (const p of PLATFORMS) {
      const b = oneBar.createEl("button", { text: `\u540C\u6B65${PLATFORM_LABEL[p]}` });
      b.disabled = this.plugin.syncing;
      b.onclick = () => void this.plugin.syncPlatform(p).then(() => this.render());
    }
    this.renderProgress(el);
    const last = this.plugin.settings.lastSync;
    for (const p of PLATFORMS) {
      const rec = last[p];
      if (rec && !rec.ok) {
        const card = el.createDiv({ cls: "fav-error" });
        card.createDiv({ cls: "fav-error-title", text: `${PLATFORM_LABEL[p]} \u4E0A\u6B21\u540C\u6B65\u5931\u8D25` });
        card.createDiv({ text: (rec.error ?? "\u672A\u77E5\u9519\u8BEF").slice(0, 200) });
        card.createDiv({ cls: "fav-status", text: `\u65F6\u95F4\uFF1A${rec.at}` });
        const retry = card.createEl("button", { text: `\u91CD\u8BD5 ${PLATFORM_LABEL[p]}` });
        retry.onclick = () => void this.plugin.syncPlatform(p).then(() => this.render());
      }
    }
    const filterBar = el.createDiv({ cls: "fav-filter" });
    const mkPlatFilter = (key, label) => {
      const b = filterBar.createEl("button", { text: label, cls: key === this.filter ? "active" : "" });
      b.onclick = () => {
        this.filter = key;
        this.folderFilter = "all";
        void this.render();
      };
    };
    mkPlatFilter("all", "\u5168\u90E8");
    for (const p of PLATFORMS) mkPlatFilter(p, PLATFORM_LABEL[p]);
    const { cards, trash, scanned, skipped } = await this.loadCards();
    const trashB = filterBar.createEl("button", { text: `\u56DE\u6536\u7AD9\uFF08${trash.length}\uFF09`, cls: this.showTrash ? "active" : "" });
    trashB.onclick = () => {
      this.showTrash = !this.showTrash;
      void this.render();
    };
    const now0 = /* @__PURE__ */ new Date();
    const p2 = (n) => n.toString().padStart(2, "0");
    const stampNow = `${p2(now0.getHours())}:${p2(now0.getMinutes())}:${p2(now0.getSeconds())}`;
    if (this.showTrash) {
      const tShown = trash.filter((c) => this.filter === "all" || c.platform === this.filter);
      const tGroups = groupCards(tShown, "all");
      status.setText(`\u56DE\u6536\u7AD9 ${tShown.length} \u6761\uFF08\u8FDC\u7AEF\u5DF2\u5220\uFF0C\u5185\u5BB9\u4FDD\u7559\uFF09\xB7 \u626B\u63CF ${scanned} \u6587\u4EF6 \xB7 \u66F4\u65B0\u4E8E ${stampNow}`);
      for (const g of tGroups) {
        el.createEl("h4", { text: `${g.label}\uFF08${g.items.length}\uFF09`, cls: "fav-group-title" });
        const grid = el.createDiv({ cls: "fav-cards" });
        for (const c of g.items) {
          const card = this.cardEl(grid, c);
          const restore = card.createEl("button", { text: "\u6062\u590D" });
          restore.onclick = () => void this.restoreTrash(c.path);
        }
      }
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const stamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    status.setText(
      `\u5171 ${cards.length} \u6761${this.filter !== "all" ? `\uFF08${PLATFORM_LABEL[this.filter]}\uFF09` : ""} \xB7 \u626B\u63CF ${scanned} \u6587\u4EF6${skipped > 0 ? `\uFF08\u8DF3\u8FC7 ${skipped} \u65E0\u5143\u6570\u636E\uFF09` : ""} \xB7 \u66F4\u65B0\u4E8E ${stamp}`
    );
    const platformsToShow = (this.filter === "all" ? PLATFORMS : [this.filter]).filter(
      (p) => cards.some((c) => c.platform === p)
    );
    let rendered = 0;
    for (const p of platformsToShow) {
      const pcards = cards.filter((c) => c.platform === p);
      const pgroups = groupCards(pcards, p);
      const drilled = this.filter === p && this.folderFilter !== "all";
      const h3 = el.createEl("h3", { text: `${PLATFORM_LABEL[p]}\uFF08${pcards.length}\uFF09`, cls: "fav-platform-title" });
      h3.onclick = () => {
        this.filter = p;
        this.folderFilter = "all";
        void this.render();
      };
      if (pgroups.length > 1) {
        const folderBar = el.createDiv({ cls: "fav-filter" });
        const allB = folderBar.createEl("button", {
          text: `\u5168\u90E8\uFF08${pcards.length}\uFF09`,
          cls: this.folderFilter === "all" && (this.filter === "all" || this.filter === p) ? "active" : ""
        });
        allB.onclick = () => {
          this.filter = p;
          this.folderFilter = "all";
          void this.render();
        };
        for (const g of pgroups) {
          const b = folderBar.createEl("button", {
            text: `${g.label}\uFF08${g.items.length}\uFF09`,
            cls: this.filter === p && g.key === this.folderFilter ? "active" : ""
          });
          b.onclick = () => {
            this.filter = p;
            this.folderFilter = g.key;
            void this.render();
          };
        }
      }
      const show = drilled ? pgroups.filter((g) => g.key === this.folderFilter) : pgroups;
      for (const g of show) {
        if (!drilled && pgroups.length > 1) el.createEl("h4", { text: `${g.label}\uFF08${g.items.length}\uFF09`, cls: "fav-group-title" });
        const grid = el.createDiv({ cls: "fav-cards" });
        for (const c of g.items) {
          if (rendered >= 500) break;
          rendered += 1;
          this.cardEl(grid, c);
        }
        if (rendered >= 500) break;
      }
      if (rendered >= 500) break;
    }
  }
  /** 单张卡片（标题/封面/meta/简介）；回收站视图复用后再挂恢复按钮。 */
  cardEl(grid, c) {
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
    meta.appendText(`${c.dateLabel}${c.author ? ` \xB7 ${c.author}` : ""}${c.unfinished ? " \xB7 \u672A\u542C\u5B8C" : ""}`);
    if (c.description) card.createDiv({ cls: "fav-desc", text: c.description });
    return card;
  }
  async openNote(path) {
    const f = this.app.vault.getFileByPath(path);
    if (f) await this.app.workspace.getLeaf().openFile(f);
    else new import_obsidian2.Notice(`\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${path}`);
  }
  async loadCards() {
    const files = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith("Fav Collector/"));
    const out = [];
    const trash = [];
    let skipped = 0;
    for (const f of files) {
      try {
        const md = await this.app.vault.read(f);
        const card = cardFromNote(f.path, md, f.stat.ctime);
        if (card) (f.path.includes("/_\u5DF2\u5220\u9664/") ? trash : out).push(card);
        else skipped += 1;
      } catch {
        skipped += 1;
      }
    }
    out.sort((a, b) => {
      const aq = a.queueIndex;
      const bq = b.queueIndex;
      if (aq !== void 0 && bq !== void 0 && a.platform === b.platform) return aq - bq;
      if (aq !== void 0 && bq === void 0) return -1;
      if (aq === void 0 && bq !== void 0) return 1;
      return b.sortKey.localeCompare(a.sortKey) || b.ctime - a.ctime || a.path.localeCompare(b.path);
    });
    return { cards: out, trash, scanned: files.length, skipped };
  }
  /** 回收站恢复：去掉 _已删除/ 前缀搬回原位（内容不动）。 */
  async restoreTrash(path) {
    const target = path.replace("Fav Collector/_\u5DF2\u5220\u9664/", "Fav Collector/");
    if (target === path) return;
    const f = this.app.vault.getFileByPath(path);
    if (!f) {
      new import_obsidian2.Notice("\u6587\u4EF6\u5DF2\u7ECF\u4E0D\u5728\u4E86");
      return;
    }
    try {
      await this.app.vault.createFolder(target.slice(0, target.lastIndexOf("/"))).catch(() => void 0);
      await this.app.vault.rename(f, target);
      new import_obsidian2.Notice("\u5DF2\u4ECE\u56DE\u6536\u7AD9\u6062\u590D");
    } catch (e) {
      new import_obsidian2.Notice(`\u6062\u590D\u5931\u8D25\uFF1A${e.message}`);
    }
    await this.render();
  }
};

// src/sync/bilibili.ts
var API = "https://api.bilibili.com";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
var BiliError = class extends Error {
};
async function api(http, cookie, path, params) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const body = await http(`${API}${path}?${qs.toString()}`, {
    "user-agent": UA,
    referer: "https://www.bilibili.com/",
    cookie
  });
  if (!body || body.code !== 0) {
    throw new BiliError(`B\u7AD9\u63A5\u53E3 ${path} code=${body?.code}: ${body?.message ?? "\u65E0\u54CD\u5E94"}`);
  }
  return body.data ?? {};
}
async function collectBilibili(http, cookieRaw) {
  const jar = parseCookieString(cookieRaw);
  if (!jar.SESSDATA) throw new BiliError("B\u7AD9\u672A\u767B\u5F55\uFF1Acookie \u91CC\u6CA1\u6709 SESSDATA");
  const cookie = cookieHeader(jar);
  const nav = await api(http, cookie, "/x/web-interface/nav", {});
  const mid = nav.mid;
  if (!mid) throw new BiliError("B\u7AD9 nav \u672A\u8FD4\u56DE mid\uFF08SESSDATA \u53EF\u80FD\u8FC7\u671F\uFF09");
  const items = [];
  const folders = [];
  let pn = 1;
  for (; ; ) {
    const page = await api(http, cookie, "/x/v3/fav/folder/created/list", {
      pn,
      ps: 20,
      up_mid: mid
    });
    folders.push(...page.list ?? []);
    if (pn * 20 >= (page.count ?? 0) || (page.list ?? []).length === 0) break;
    pn += 1;
    await sleep(400);
  }
  for (const folder of folders) {
    let fpn = 1;
    let got = 0;
    let qi = 0;
    const total = folder.media_count ?? 0;
    while (got < total && fpn <= 100) {
      const page = await api(http, cookie, "/x/v3/fav/resource/list", {
        media_id: folder.id,
        pn: fpn,
        ps: 20,
        keyword: "",
        order: "mtime",
        type: 0,
        tid: 0,
        platform: "web"
      });
      const meds = page.medias ?? [];
      if (meds.length === 0) break;
      for (const m of meds) {
        const bvid = m.bvid ?? m.bv_id;
        if (!bvid) continue;
        const upper = m.upper;
        const it = makeItem("bilibili", `${folder.id}_${bvid}`, `https://www.bilibili.com/video/${bvid}`, (m.title || "(\u5931\u6548\u89C6\u9891)").slice(0, 150));
        it.author = upper?.name;
        it.description = (m.intro || "").slice(0, 200) || void 0;
        it.coverUrl = m.pic;
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
  const toview = await api(http, cookie, "/x/v2/history/toview", {});
  let wlQi = 0;
  for (const v of toview.list ?? []) {
    const bvid = v.bvid;
    if (!bvid) continue;
    const owner = v.owner;
    const it = makeItem("bilibili", bvid, `https://www.bilibili.com/video/${bvid}`, (v.title || "(\u5931\u6548\u89C6\u9891)").slice(0, 150));
    it.author = owner?.name;
    it.coverUrl = v.pic;
    it.watchLater = true;
    it.playlistIndex = wlQi;
    wlQi += 1;
    it.publishedAt = toDateOnly(v.pubdate ?? v.add_dt);
    items.push(it);
  }
  return items;
}

// src/sync/github.ts
var import_node_child_process2 = require("node:child_process");

// src/sync/youtube.ts
var import_node_child_process = require("node:child_process");
var YoutubeError = class extends Error {
};
function defaultRun(cmd, args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" };
    (0, import_node_child_process.execFile)(cmd, args, { timeout: 3e5, maxBuffer: 64 * 1024 * 1024, env }, (err, stdout, stderr) => {
      if (err) {
        const msg = `${stderr || err.message}`.slice(0, 300);
        reject(new YoutubeError(`yt-dlp \u5931\u8D25: ${msg}`));
        return;
      }
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}
function baseArgs(opts) {
  const args = ["--flat-playlist", "--skip-download", "--no-playlist", "--ignore-errors", "--socket-timeout", "20", "--retries", "2"];
  if (opts.cookieFile?.trim()) {
    args.push("--cookies", opts.cookieFile.trim());
  } else {
    args.push("--cookies-from-browser", "firefox:vyp2edie.ytdlp");
  }
  args.push("--js-runtimes", "node", "--remote-components", "ejs:github");
  return args;
}
function parseFlatList(stdout, listId) {
  const items = [];
  let idx = 0;
  for (const line of stdout.split("\n")) {
    const m = line.match(/^(\S+)\t(.*)$/);
    if (!m) continue;
    const it = makeItem("youtube", `${listId}_${m[1]}`, `https://www.youtube.com/watch?v=${m[1]}`, (m[2] || "(\u65E0\u6807\u9898)").slice(0, 150));
    it.watchLater = listId === "WL";
    it.playlistIndex = idx;
    idx += 1;
    if (listId === "LL") it.folder = "\u559C\u6B22";
    it.coverUrl = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
    it.videoId = m[1];
    items.push(it);
  }
  return items;
}
async function collectYoutube(opts) {
  const run = opts.run ?? defaultRun;
  const { stdout } = await run(opts.ytdlpPath, [
    ...baseArgs(opts),
    "--print",
    "%(id)s	%(title)s",
    "https://www.youtube.com/playlist?list=WL"
  ]).catch((e) => {
    const msg = e.message;
    if (msg.includes("does not exist")) {
      throw new YoutubeError("YouTube WL \u4E0D\u5B58\u5728\uFF1A\u5927\u6982\u7387\u767B\u5F55\u8FC7\u671F\uFF0C\u91CD\u5BFC cookie \u6216\u68C0\u67E5 Firefox \u94A5\u5319\u6263");
    }
    throw e;
  });
  return parseFlatList(stdout, "WL");
}
async function enrichYoutubeDates(opts, items) {
  const run = opts.run ?? defaultRun;
  const withId = items.filter((it) => it.videoId);
  if (withId.length === 0) return;
  const urls = withId.map((it) => it.videoId).map((id) => `https://www.youtube.com/watch?v=${id}`);
  const { stdout } = await run(opts.ytdlpPath, [...baseArgs(opts), "--print", "%(id)s	%(upload_date)s", ...urls]);
  const dates = /* @__PURE__ */ new Map();
  for (const line of stdout.split("\n")) {
    const m = line.match(/^(\S+)\s+(\d{8})/);
    if (m) dates.set(m[1], `${m[2].slice(0, 4)}-${m[2].slice(4, 6)}-${m[2].slice(6, 8)}`);
  }
  for (const it of withId) {
    const d = dates.get(it.videoId);
    if (d) it.publishedAt = d;
  }
}
function snippetForTranslate(desc, maxLen = 600) {
  const oneLine = desc.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  const cut = oneLine.slice(0, maxLen);
  const lastEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf("\u3002"));
  return (lastEnd > maxLen * 0.4 ? cut.slice(0, lastEnd + 1) : cut).trim();
}
function isMostlyChinese(text) {
  if (!text) return true;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return cjk * 2 >= text.length;
}
async function translateEnToZh(text, httpGet) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  const raw = await httpGet(url);
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("bad gtx response");
  const zh = data[0].filter((seg) => Array.isArray(seg) && typeof seg[0] === "string").map((seg) => seg[0]).join("").trim();
  if (!zh) throw new Error("empty translation");
  return zh.length > 160 ? `${zh.slice(0, 160).trimEnd()}\u2026` : zh;
}
async function enrichYoutubeDesc(opts, items, httpGet) {
  const run = opts.run ?? defaultRun;
  const withId = items.filter((it) => it.videoId && !it.description);
  if (withId.length === 0) return;
  const urls = withId.map((it) => `https://www.youtube.com/watch?v=${it.videoId}`);
  const { stdout } = await run(opts.ytdlpPath, [...baseArgs(opts), "--print", "%(id)s	%(description)j", ...urls]);
  const descs = /* @__PURE__ */ new Map();
  for (const line of stdout.split("\n")) {
    const tab = line.indexOf("	");
    if (tab <= 0) continue;
    try {
      const d = JSON.parse(line.slice(tab + 1));
      if (typeof d === "string" && d.trim()) descs.set(line.slice(0, tab), d);
    } catch {
    }
  }
  for (const it of withId) {
    const vid = it.videoId;
    const raw = descs.get(vid);
    if (!raw) continue;
    const snippet = snippetForTranslate(raw);
    if (!snippet) continue;
    try {
      it.description = isMostlyChinese(snippet) ? snippet.length > 160 ? `${snippet.slice(0, 160).trimEnd()}\u2026` : snippet : await translateEnToZh(snippet, httpGet);
    } catch {
    }
  }
}

// src/sync/github.ts
var GithubError = class extends Error {
};
function defaultRun2(cmd, args) {
  return new Promise((resolve, reject) => {
    (0, import_node_child_process2.execFile)(cmd, args, { timeout: 3e5, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new GithubError(`gh \u5931\u8D25\uFF08\u5148\u8DD1 gh auth login\uFF09\uFF1A${`${stderr || err.message}`.slice(0, 200)}`));
        return;
      }
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}
function parseStarredTsv(tsv) {
  const items = [];
  let qi = 0;
  for (const line of tsv.split("\n")) {
    if (!line.trim()) continue;
    const [starredAt, full, url, desc, lang, avatar] = line.split("	");
    if (!full || !url) continue;
    const it = makeItem("github", full, url, full.slice(0, 150));
    it.playlistIndex = qi;
    qi += 1;
    it.author = full.split("/")[0];
    it.description = [desc && desc !== "null" ? desc : "", lang && lang !== "null" ? `\uFF08${lang}\uFF09` : ""].join("").slice(0, 200) || void 0;
    it.coverUrl = avatar && avatar !== "null" ? avatar : void 0;
    it.publishedAt = toDateOnly(starredAt);
    items.push(it);
  }
  return items;
}
async function collectGithub(run = defaultRun2) {
  const { stdout } = await run("gh", [
    "api",
    "--paginate",
    "user/starred?per_page=100",
    "-H",
    "Accept: application/vnd.github.v3.star+json",
    "--jq",
    '.[] | [.starred_at, .repo.full_name, .repo.html_url, (.repo.description // ""), (.repo.language // ""), .repo.owner.avatar_url] | @tsv'
  ]);
  return parseStarredTsv(stdout);
}
async function enrichGithubDesc(items, httpGet) {
  for (const it of items) {
    if (!it.description) continue;
    const m = it.description.match(/^(.*?)（([^（）]*)）$/);
    const body = (m ? m[1] : it.description).trim();
    const lang = m ? `\uFF08${m[2]}\uFF09` : "";
    if (!body || isMostlyChinese(body)) continue;
    try {
      const zh = await translateEnToZh(body.length > 600 ? body.slice(0, 600) : body, httpGet);
      it.description = `${zh}${lang}`;
    } catch {
    }
  }
}

// src/sync/zhihu.ts
var BASE = "https://developer.zhihu.com";
var ZhihuError = class extends Error {
};
async function zget(http, secret, path, params) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const body = await http(`${BASE}${path}?${qs.toString()}`, {
    Authorization: `Bearer ${secret}`,
    "X-Request-Timestamp": String(Math.floor(Date.now() / 1e3)),
    "Content-Type": "application/json"
  });
  if (!body || body.Code !== 0) {
    if (body?.Code === 20001) throw new ZhihuError("\u77E5\u4E4E\u9274\u6743\u5931\u8D25\uFF08Code 20001\uFF09\uFF1A\u53BB developer.zhihu.com/profile \u91CD\u751F\u6210 Secret");
    if (body?.Code === 30001 || body?.Code === 30002) throw new ZhihuError(`\u77E5\u4E4E\u9650\u6D41/\u914D\u989D\uFF08Code ${body?.Code}\uFF09`);
    throw new ZhihuError(`\u77E5\u4E4E\u9519\u8BEF Code=${body?.Code} ${body?.Message ?? "\u65E0\u54CD\u5E94"}`);
  }
  return body.Data ?? {};
}
async function collectZhihu(http, secret) {
  if (!secret.trim()) throw new ZhihuError("\u77E5\u4E4E Secret \u672A\u586B");
  const favlists = (await zget(http, secret, "/api/v1/user/favlists", { Limit: 50 })).Items ?? [];
  if (favlists.length === 0) throw new ZhihuError("\u77E5\u4E4E\u672A\u8FD4\u56DE\u4EFB\u4F55\u6536\u85CF\u5939\uFF08\u53EF\u80FD\u90FD\u672A\u516C\u5F00\uFF09");
  const items = [];
  for (const fav of favlists) {
    let offset = 0;
    let qi = 0;
    for (; ; ) {
      const data = await zget(http, secret, "/api/v1/user/favlist_contents", {
        FavlistUrlToken: fav.UrlToken,
        Offset: offset,
        Limit: 50
      });
      const list = data.Items ?? [];
      for (const it of list) {
        const url = it.Url;
        const author = it.Author;
        const item = makeItem("zhihu", url ?? `${fav.UrlToken}_${it.CreatedAt}`, url ?? "", (it.Title || "(\u65E0\u6807\u9898)").slice(0, 150));
        item.author = author?.Name;
        item.description = (it.Summary || "").slice(0, 200) || void 0;
        item.folder = fav.Title;
        item.playlistIndex = qi;
        qi += 1;
        item.publishedAt = toDateOnly(it.FavTime ?? it.CreatedAt);
        items.push(item);
      }
      const paging = data.Paging ?? {};
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

// src/sync/x-consts.json
var x_consts_default = { features: { c9s_tweet_anatomy_moderator_badge_enabled: true, responsive_web_home_pinned_timelines_enabled: true, blue_business_profile_image_shape_enabled: true, creator_subscriptions_tweet_preview_api_enabled: true, freedom_of_speech_not_reach_fetch_enabled: true, graphql_is_translatable_rweb_tweet_is_translatable_enabled: true, graphql_timeline_v2_bookmark_timeline: true, hidden_profile_likes_enabled: true, highlights_tweets_tab_ui_enabled: true, interactive_text_enabled: true, longform_notetweets_consumption_enabled: true, longform_notetweets_inline_media_enabled: true, longform_notetweets_rich_text_read_enabled: true, longform_notetweets_richtext_consumption_enabled: true, profile_foundations_tweet_stats_enabled: true, profile_foundations_tweet_stats_tweet_frequency: true, responsive_web_birdwatch_note_limit_enabled: true, responsive_web_edit_tweet_api_enabled: true, responsive_web_enhance_cards_enabled: false, responsive_web_graphql_exclude_directive_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true, responsive_web_media_download_video_enabled: false, responsive_web_text_conversations_enabled: false, responsive_web_twitter_article_data_v2_enabled: true, responsive_web_twitter_article_tweet_consumption_enabled: false, responsive_web_twitter_blue_verified_badge_is_enabled: true, rweb_lists_timeline_redesign_enabled: true, spaces_2022_h2_clipping: true, spaces_2022_h2_spaces_communities: true, standardized_nudges_misinfo: true, subscriptions_verification_info_verified_since_enabled: true, tweet_awards_web_tipping_enabled: false, tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true, tweetypie_unmention_optimization_enabled: true, verified_phone_label_enabled: false, vibe_api_enabled: true, view_counts_everywhere_api_enabled: true }, variables: { count: 1e3, withSafetyModeUserFields: true, includePromotedContent: true, withQuickPromoteEligibilityTweetFields: true, withVoice: true, withV2Timeline: true, withDownvotePerspective: false, withBirdwatchNotes: true, withCommunity: true, withSuperFollowsUserFields: true, withReactionsMetadata: false, withReactionsPerspective: false, withSuperFollowsTweetFields: true, isMetatagsQuery: false, withReplays: true, withClientEventToken: false, withAttachments: true, withConversationQueryHighlights: true, withMessageQueryHighlights: true, withMessages: true } };

// src/sync/x.ts
var QID = "tmd4ifV8RHltzn8ymGg1aw";
var OP = "Bookmarks";
var BEARER = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
var UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
var XError = class extends Error {
};
function findAll(obj, key) {
  const out = [];
  if (Array.isArray(obj)) {
    for (const v of obj) out.push(...findAll(v, key));
  } else if (obj && typeof obj === "object") {
    const rec = obj;
    if (key in rec) out.push(rec[key]);
    for (const v of Object.values(rec)) out.push(...findAll(v, key));
  }
  return out;
}
function tweetToItem(result) {
  const restId = result.rest_id;
  if (!restId) return null;
  const legacy = result.legacy ?? {};
  const core = result.core ?? {};
  const userResult = (core.user_results ?? {}).result;
  const uLegacy = (userResult ?? {}).legacy ?? {};
  const screenName = uLegacy.screen_name || "i";
  const text = legacy.full_text || "";
  const it = makeItem("x", restId, `https://x.com/${screenName}/status/${restId}`, text.split("\n")[0].slice(0, 120) || "(\u65E0\u6B63\u6587)");
  it.author = uLegacy.name || screenName;
  it.description = text.slice(0, 400) || void 0;
  it.publishedAt = toDateOnly(legacy.created_at);
  return it;
}
function extractTweets(page) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const t of findAll(page, "tweet_results")) {
    const rec = t ?? {};
    const result = rec.result ?? rec;
    if (typeof result.__typename === "string" && (result.__typename === "TweetTombstone" || result.__typename === "TweetUnavailable")) continue;
    const it = tweetToItem(result);
    if (it && !seen.has(it.nativeId)) {
      seen.add(it.nativeId);
      out.push(it);
    }
  }
  return out;
}
function findCursor(page) {
  for (const entries of findAll(page, "entries")) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      const entry = e ?? {};
      const id = entry.entryId ?? entry.entry_id ?? "";
      if (id.includes("cursor-bottom") || id.includes("cursor-showmorethreads")) {
        const content = entry.content ?? {};
        const itemContent = content.itemContent;
        if (itemContent && typeof itemContent.value === "string") return itemContent.value;
        if (typeof content.value === "string") return content.value;
      }
    }
  }
  return void 0;
}
async function collectX(http, cookieRaw, maxPages = 30) {
  const jar = parseCookieString(cookieRaw);
  if (!jar.auth_token) throw new XError("X \u672A\u767B\u5F55\uFF1Acookie \u91CC\u6CA1\u6709 auth_token");
  const headers = {
    authorization: BEARER,
    cookie: cookieHeader(jar),
    referer: "https://twitter.com/",
    "user-agent": UA2,
    "x-csrf-token": jar.ct0 ?? "",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en"
  };
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  let cursor;
  for (let page = 0; page < maxPages; page += 1) {
    const variables = { ...x_consts_default.variables, count: 20 };
    if (cursor) variables.cursor = cursor;
    const qs = new URLSearchParams({
      queryId: QID,
      features: JSON.stringify(x_consts_default.features),
      variables: JSON.stringify(variables)
    });
    let data;
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        data = await http(`https://x.com/i/api/graphql/${QID}/${OP}?${qs.toString()}`, headers);
        break;
      } catch (e) {
        lastErr = e.message;
        if (attempt === 2) throw new XError(`X Bookmarks \u6293\u53D6\u5931\u8D25: ${lastErr.slice(0, 150)}`);
        await sleep(2e3 * (attempt + 1));
      }
    }
    const fresh = extractTweets(data).filter((it) => !seen.has(it.nativeId));
    for (const it of fresh) seen.add(it.nativeId);
    items.push(...fresh);
    cursor = findCursor(data);
    if (fresh.length === 0 || !cursor) break;
    await sleep(500);
  }
  items.forEach((it, i) => {
    it.playlistIndex = i;
  });
  return items;
}

// src/sync/xiaoyuzhou.ts
var API2 = "https://api.xiaoyuzhoufm.com";
var XiaoyuzhouError = class extends Error {
};
function appHeaders(accessToken, deviceId) {
  const now = /* @__PURE__ */ new Date();
  const p = (n, l = 2) => String(n).padStart(l, "0");
  const off = -now.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const local = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}.${p(now.getMilliseconds(), 3)}${sign}${p(Math.floor(Math.abs(off) / 60))}00`;
  const h = {
    // 注：不要手动设 Host，Obsidian requestUrl（Chromium）会直接 ERR_INVALID_ARGUMENT
    os: "android",
    "os-version": "28",
    manufacturer: "Xiaomi",
    model: "MI 6",
    market: "xiaomi",
    applicationid: "app.podcast.cosmos",
    "app-version": "2.99.1",
    "app-buildno": "1362",
    "User-Agent": "Xiaoyuzhou/2.99.1(android 28)",
    timezone: "Asia/Shanghai",
    "local-time": local,
    "content-type": "application/json;charset=utf-8"
  };
  if (accessToken) h["x-jike-access-token"] = accessToken;
  if (deviceId) h["x-jike-device-id"] = deviceId;
  return h;
}
function stripHtml(html) {
  return (html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}
function findEpisodeArrays(obj) {
  if (Array.isArray(obj)) {
    const out = [];
    for (const v of obj) out.push(...findEpisodeArrays(v));
    return out;
  }
  if (obj && typeof obj === "object") {
    const rec = obj;
    if (typeof rec.eid === "string") return [rec];
    const out = [];
    for (const v of Object.values(rec)) out.push(...findEpisodeArrays(v));
    return out;
  }
  return [];
}
function episodeToItem(raw) {
  const eid = raw.eid ?? raw.episodeId;
  if (!eid) return null;
  const podcast = raw.podcast ?? {};
  const title = (raw.title || "(\u65E0\u6807\u9898)").slice(0, 150);
  const it = makeItem("xiaoyuzhou", eid, `https://www.xiaoyuzhoufm.com/episode/${eid}`, title);
  const podTitle = podcast.title || void 0;
  it.author = podTitle;
  it.folder = podTitle;
  it.description = stripHtml(raw.shownotes ?? raw.description).slice(0, 200) || void 0;
  const image = raw.image ?? {};
  it.coverUrl = image.picUrl || void 0;
  it.publishedAt = toDateOnly(raw.pubDate ?? raw.publishDate ?? raw.createdAt);
  if (raw.isFinished === false) it.unfinished = true;
  const duration = raw.duration;
  if (typeof duration === "number" && duration > 0) {
    const m = Math.floor(duration / 6e4) || Math.floor(duration / 60);
    if (!it.description) it.description = `\u7EA6 ${m} \u5206\u949F`;
  }
  return it;
}
async function collectXiaoyuzhouHistory(http, creds, onCreds) {
  if (!creds.accessToken.trim()) {
    throw new XiaoyuzhouError("\u5C0F\u5B87\u5B99\u672A\u767B\u5F55\uFF1A\u8BBE\u7F6E\u9875\u586B access_token \u548C refresh_token\uFF08\u7F51\u9875\u626B\u7801\u4E00\u6B21\u5373\u53EF\uFF09");
  }
  let token = creds.accessToken.trim();
  const deviceId = creds.deviceId?.trim() || void 0;
  const postHistory = async () => {
    const r2 = await http.post(`${API2}/v1/episode-played/list-history`, {}, appHeaders(token, deviceId));
    if (r2.status === 401 && creds.refreshToken?.trim()) {
      const rr = await http.post(
        `${API2}/app_auth_tokens.refresh`,
        {},
        { ...appHeaders(void 0, deviceId), "x-jike-refresh-token": creds.refreshToken.trim() }
      );
      const newAccess = rr.headers["x-jike-access-token"] ?? rr.data["x-jike-access-token"];
      if (typeof newAccess === "string" && newAccess) {
        token = newAccess;
        const newRefresh = rr.headers["x-jike-refresh-token"] ?? rr.data["x-jike-refresh-token"];
        onCreds?.({
          accessToken: token,
          refreshToken: typeof newRefresh === "string" ? newRefresh : creds.refreshToken,
          deviceId
        });
        return http.post(`${API2}/v1/episode-played/list-history`, {}, appHeaders(token, deviceId));
      }
    }
    return r2;
  };
  let r;
  try {
    r = await postHistory();
  } catch (e) {
    throw new XiaoyuzhouError(`\u5C0F\u5B87\u5B99\u5386\u53F2\u6293\u53D6\u5931\u8D25: ${e.message.slice(0, 150)}`);
  }
  if (r.status === 401) {
    throw new XiaoyuzhouError("\u5C0F\u5B87\u5B99\u767B\u5F55\u8FC7\u671F\uFF1A\u7F51\u9875\u7248\u91CD\u767B\u540E\u66F4\u65B0\u8BBE\u7F6E\u9875 token");
  }
  if (r.status !== 200) {
    throw new XiaoyuzhouError(`\u5C0F\u5B87\u5B99\u63A5\u53E3\u8FD4\u56DE HTTP ${r.status}`);
  }
  const body = r.data ?? {};
  const raws = findEpisodeArrays(body.data ?? body);
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of raws) {
    const it = episodeToItem(raw);
    if (it && !seen.has(it.nativeId)) {
      seen.add(it.nativeId);
      items.push(it);
    }
  }
  items.forEach((it, i) => {
    it.playlistIndex = i;
  });
  return items;
}

// src/sync/runner.ts
async function syncPlatform(platform, settings, deps) {
  const { http, post, onXyzCreds } = deps;
  try {
    let items;
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
        items = await collectXiaoyuzhouHistory(
          { post },
          {
            accessToken: settings.xyzAccessToken,
            refreshToken: settings.xyzRefreshToken || void 0,
            deviceId: settings.xyzDeviceId || void 0
          },
          onXyzCreds
        );
        break;
    }
    return { platform, ok: true, items };
  } catch (e) {
    return { platform, ok: false, items: [], error: e.message };
  }
}
async function writeNewItems(fs, existingFavIds, existingUrls, results, enrichYoutube, enrichGithub) {
  const addedPaths = [];
  for (const r of results) {
    if (!r.ok) continue;
    const fresh = r.items.filter((it) => !existingFavIds.has(it.favId) && !existingUrls.has(it.url));
    if (r.platform === "youtube" && fresh.length > 0) {
      try {
        await enrichYoutube(fresh);
      } catch {
      }
    }
    if (r.platform === "github" && fresh.length > 0) {
      try {
        await enrichGithub?.(fresh);
      } catch {
      }
    }
    for (const it of fresh) {
      const p = notePathFor(it);
      const dir = p.slice(0, p.lastIndexOf("/"));
      await fs.mkdir(dir);
      if (await fs.exists(p)) continue;
      await fs.write(p, buildNote(it));
      existingFavIds.add(it.favId);
      existingUrls.add(it.url);
      addedPaths.push(p);
    }
  }
  return { added: addedPaths.length, addedPaths, results };
}
async function relocateItems(fs, favIdToPath, urlToPath, results) {
  const movedPaths = [];
  for (const r of results) {
    if (!r.ok) continue;
    for (const it of r.items) {
      const target = notePathFor(it);
      const known = favIdToPath.get(it.favId) ?? urlToPath.get(it.url);
      if (!known || known === target) continue;
      if (await fs.exists(target)) continue;
      try {
        const dir = target.slice(0, target.lastIndexOf("/"));
        await fs.mkdir(dir);
        await fs.rename(known, target);
        favIdToPath.set(it.favId, target);
        if (it.url) urlToPath.set(it.url, target);
        movedPaths.push(`${known} -> ${target}`);
      } catch {
      }
    }
  }
  return { moved: movedPaths.length, movedPaths };
}
async function refreshQueueOrder(fs, urlToPath, items) {
  let updated = 0;
  for (const it of items) {
    if (it.playlistIndex === void 0) continue;
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
    }
  }
  return { updated };
}
var TRASH_DIR = "Fav Collector/_\u5DF2\u5220\u9664";
var TRASH_PREFIX = `${TRASH_DIR}/`;
var GARBAGE_PLATFORMS = ["bilibili", "youtube", "zhihu", "x", "github"];
async function collectGarbage(fs, urlToPath, results) {
  const trashedPaths = [];
  for (const r of results) {
    if (!r.ok || !GARBAGE_PLATFORMS.includes(r.platform)) continue;
    const live = new Set(r.items.map((it) => it.url));
    const prefix = `Fav Collector/${r.platform}/`;
    for (const [url, path] of urlToPath) {
      if (!path.startsWith(prefix)) continue;
      if (live.has(url)) continue;
      const target = `${TRASH_PREFIX}${path.slice("Fav Collector/".length)}`;
      if (await fs.exists(target)) continue;
      try {
        await fs.mkdir(target.slice(0, target.lastIndexOf("/")));
        await fs.rename(path, target);
        urlToPath.set(url, target);
        trashedPaths.push(`${path} -> ${target}`);
      } catch {
      }
    }
  }
  return { trashed: trashedPaths.length, trashedPaths };
}

// src/main.ts
var FavCollectorPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.syncing = false;
    /** 同步进度（面板订阅，实时重渲染）。 */
    this.syncProgress = { running: false, done: [] };
    this.progressListeners = /* @__PURE__ */ new Set();
  }
  onSyncProgress(cb) {
    this.progressListeners.add(cb);
    return () => {
      this.progressListeners.delete(cb);
    };
  }
  emitProgress() {
    for (const cb of [...this.progressListeners]) {
      try {
        cb();
      } catch {
      }
    }
  }
  /** 各平台抓取方式（一行 step 用，程序员友好，拒绝黑盒）。 */
  fetchHow(p) {
    switch (p) {
      case "youtube":
        return "yt-dlp \u626B\u7A0D\u540E\u518D\u770B\uFF08flat\uFF0C\u9700 cookies\uFF09";
      case "github":
        return "gh api \u62C9 stars";
      case "x":
        return "GraphQL \u6293 bookmarks";
      case "xiaoyuzhou":
        return "POST \u6536\u542C\u5386\u53F2";
      case "bilibili":
        return "API \u62C9\u6536\u85CF\u5939+\u7A0D\u540E\u518D\u770B";
      case "zhihu":
        return "\u5B98\u65B9 API \u62C9\u516C\u5F00\u6536\u85CF\u5939";
    }
  }
  setStep(text) {
    this.syncProgress.step = text;
    this.emitProgress();
  }
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() ?? {} };
    this.statusEl = this.addStatusBarItem();
    this.setStatus("Fav: \u5C31\u7EEA");
    this.registerView(VIEW_TYPE_FAV_DASHBOARD, (leaf) => new FavDashboardView(leaf, this));
    this.addRibbonIcon("refresh-cw", "\u540C\u6B65\u5168\u90E8\u6536\u85CF", () => void this.syncAll());
    this.addRibbonIcon("layout-dashboard", "\u6253\u5F00\u6536\u85CF\u603B\u89C8", () => void this.openDashboard());
    this.addCommand({ id: "sync-all", name: "\u540C\u6B65\u5168\u90E8\u6536\u85CF", callback: () => void this.syncAll() });
    for (const p of PLATFORMS) {
      this.addCommand({ id: `sync-${p}`, name: `\u53EA\u540C\u6B65${PLATFORM_LABEL[p]}`, callback: () => void this.syncPlatform(p) });
    }
    this.addCommand({
      id: "open-dashboard",
      name: "\u6253\u5F00\u6536\u85CF\u603B\u89C8",
      callback: () => void this.openDashboard()
    });
    this.addSettingTab(new FavSettingTab(this));
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  setStatus(text) {
    this.statusEl?.setText(text);
  }
  http() {
    return async (url, headers) => {
      const res = await (0, import_obsidian3.requestUrl)({ url, method: "GET", headers: headers ?? {} });
      if (res.status >= 400) throw new Error(`HTTP ${res.status}: ${url.slice(0, 80)}`);
      return res.json;
    };
  }
  runnerSettings() {
    return {
      biliCookies: this.settings.biliCookies,
      xCookies: this.settings.xCookies,
      zhihuSecret: this.settings.zhihuSecret,
      ytdlpPath: this.settings.ytdlpPath || DEFAULT_SETTINGS.ytdlpPath,
      ytCookieFile: this.settings.ytCookieFile || void 0,
      xyzAccessToken: this.settings.xyzAccessToken,
      xyzRefreshToken: this.settings.xyzRefreshToken,
      xyzDeviceId: this.settings.xyzDeviceId
    };
  }
  xyzPost() {
    return async (url, body, headers) => {
      const res = await (0, import_obsidian3.requestUrl)({
        url,
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {}),
        contentType: "application/json",
        throw: false
      });
      const hs = {};
      for (const [k, v] of Object.entries(res.headers ?? {})) hs[k.toLowerCase()] = String(v);
      let data = null;
      try {
        data = res.json;
      } catch {
        data = res.text;
      }
      return { data, headers: hs, status: res.status };
    };
  }
  runnerDeps() {
    return {
      http: this.http(),
      post: this.xyzPost(),
      onXyzCreds: (next) => {
        this.settings.xyzAccessToken = next.accessToken;
        if (next.refreshToken) this.settings.xyzRefreshToken = next.refreshToken;
        if (next.deviceId) this.settings.xyzDeviceId = next.deviceId;
        void this.saveSettings();
      }
    };
  }
  async testPlatform(platform) {
    return syncPlatform(platform, this.runnerSettings(), this.runnerDeps());
  }
  /** 扫 Vault 组装去重集合（fav_id + url，兼容旧笔记）。 */
  async scanExisting() {
    const favIds = /* @__PURE__ */ new Set();
    const urls = /* @__PURE__ */ new Set();
    const favIdToPath = /* @__PURE__ */ new Map();
    const urlToPath = /* @__PURE__ */ new Map();
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
      }
    }
    return { favIds, urls, favIdToPath, urlToPath };
  }
  async syncPlatform(platform) {
    if (this.syncing) {
      new import_obsidian3.Notice("\u6B63\u5728\u540C\u6B65\u4E2D\uFF0C\u7A0D\u7B49\u2026");
      return;
    }
    this.syncing = true;
    this.syncProgress = { running: true, current: platform, done: [], startedAt: (/* @__PURE__ */ new Date()).toISOString() };
    this.emitProgress();
    try {
      new import_obsidian3.Notice(`\u540C\u6B65 ${platform} \u4E2D\u2026\uFF08\u603B\u89C8\u9875\u770B\u5B9E\u65F6\u8FDB\u5EA6\uFF09`);
      this.setStatus(`Fav: \u540C\u6B65 ${platform}\u2026`);
      this.setStep(`\u6293 ${PLATFORM_LABEL[platform]}\uFF1A${this.fetchHow(platform)}\u2026`);
      const result = await syncPlatform(platform, this.runnerSettings(), this.runnerDeps());
      const { favIds, urls, favIdToPath, urlToPath } = await this.scanExisting();
      if (result.ok) this.setStep(`${PLATFORM_LABEL[platform]}\u6293\u5230 ${result.items.length} \u6761 \u2192 \u53BB\u91CD/\u5F52\u6863/\u843D\u76D8\u2026`);
      const moved = result.ok ? await relocateItems(this.fsAdapter(), favIdToPath, urlToPath, [result]) : { moved: 0, movedPaths: [] };
      const report = await writeNewItems(this.fsAdapter(), favIds, urls, [result], this.ytEnrich(), this.ghEnrich());
      let trashed = 0;
      if (result.ok) {
        this.setStep(`${PLATFORM_LABEL[platform]}\u961F\u5217\u4F4D\u7F6E\u5237\u65B0\uFF08\u6536\u85CF\u5939\u662F\u6808\uFF0C\u65B0\u52A0\u7684\u9876\u4E0A\u6765\uFF09\u2026`);
        await refreshQueueOrder(this.fsAdapter(), urlToPath, result.items);
        this.setStep(`${PLATFORM_LABEL[platform]}\u68C0\u67E5\u8FDC\u7AEF\u5DF2\u5220\u9664\uFF08\u8FDB\u56DE\u6536\u7AD9\uFF0C\u4E0D\u771F\u5220\uFF09\u2026`);
        trashed = (await collectGarbage(this.fsAdapter(), urlToPath, [result])).trashed;
      }
      this.settings.lastSync[platform] = {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        ok: result.ok,
        added: report.added,
        error: result.error
      };
      await this.saveSettings();
      this.syncProgress.running = false;
      this.syncProgress.current = void 0;
      this.syncProgress.step = void 0;
      this.syncProgress.done = [{ platform, ok: result.ok, added: report.added, trashed, error: result.error }];
      this.setStatus(result.ok ? `Fav: ${platform} +${report.added}` : `Fav: ${platform} \u5931\u8D25`);
      this.emitProgress();
      new import_obsidian3.Notice(result.ok ? `${platform} \u540C\u6B65\u5B8C\u6210\uFF0C\u65B0\u589E ${report.added} \u6761${moved.moved > 0 ? `\uFF0C\u5F52\u6863 ${moved.moved} \u6761` : ""}${trashed > 0 ? `\uFF0C\u8FDC\u7AEF\u5DF2\u5220 ${trashed} \u6761\u8FDB\u56DE\u6536\u7AD9` : ""}` : `${platform} \u5931\u8D25\uFF1A${result.error}`);
    } finally {
      this.syncing = false;
    }
  }
  fsAdapter() {
    const va = this.app.vault;
    return {
      exists: (p) => va.adapter.exists(p),
      mkdir: (p) => va.createFolder(p).then(() => void 0).catch(() => void 0),
      write: (p, c) => va.create(p, c).then(() => void 0),
      read: async (p) => {
        const f = va.getFileByPath(p);
        if (!f) throw new Error(`\u627E\u4E0D\u5230\u6587\u4EF6\uFF1A${p}`);
        return va.read(f);
      },
      overwrite: async (p, c) => {
        const f = va.getFileByPath(p);
        if (!f) throw new Error(`\u627E\u4E0D\u5230\u6587\u4EF6\uFF1A${p}`);
        await va.modify(f, c);
      },
      rename: async (oldPath, newPath) => {
        const f = va.getFileByPath(oldPath);
        if (!f) throw new Error(`\u627E\u4E0D\u5230\u6587\u4EF6\uFF1A${oldPath}`);
        await va.rename(f, newPath);
      }
    };
  }
  ytEnrich() {
    const s = this.runnerSettings();
    const gtxGet = async (url) => (await (0, import_obsidian3.requestUrl)({ url })).text;
    return async (items) => {
      try {
        await enrichYoutubeDates({ ytdlpPath: s.ytdlpPath, cookieFile: s.ytCookieFile }, items);
      } catch {
      }
      try {
        await enrichYoutubeDesc({ ytdlpPath: s.ytdlpPath, cookieFile: s.ytCookieFile }, items, gtxGet);
      } catch {
      }
    };
  }
  /** GitHub 新 star 简介汉化（API 自带英文简介，无 key 走 gtx）。 */
  ghEnrich() {
    const gtxGet = async (url) => (await (0, import_obsidian3.requestUrl)({ url })).text;
    return async (items) => {
      try {
        await enrichGithubDesc(items, gtxGet);
      } catch {
      }
    };
  }
  async syncAll() {
    if (this.syncing) {
      new import_obsidian3.Notice("\u6B63\u5728\u540C\u6B65\u4E2D\uFF0C\u7A0D\u7B49\u2026");
      return;
    }
    this.syncing = true;
    this.syncProgress = { running: true, done: [], startedAt: (/* @__PURE__ */ new Date()).toISOString() };
    this.emitProgress();
    try {
      new import_obsidian3.Notice("\u5F00\u59CB\u540C\u6B65\u5168\u90E8\u5E73\u53F0\u2026\uFF08\u603B\u89C8\u9875\u770B\u5B9E\u65F6\u8FDB\u5EA6\uFF09");
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
        this.setStatus(`Fav: \u540C\u6B65 ${p}\uFF08${idx}/${PLATFORMS.length}\uFF09\u2026`);
        this.setStep(`[${idx}/${PLATFORMS.length}] \u6293 ${PLATFORM_LABEL[p]}\uFF1A${this.fetchHow(p)}\u2026`);
        this.emitProgress();
        let result;
        try {
          result = await syncPlatform(p, settings, deps);
        } catch (e) {
          result = { platform: p, ok: false, items: [], error: e.message };
        }
        let added = 0;
        let trashed = 0;
        if (result.ok) {
          try {
            this.setStep(
              p === "youtube" ? `${PLATFORM_LABEL[p]}\u6293\u5230 ${result.items.length} \u6761 \u2192 \u8865\u65E5\u671F+\u7B80\u4ECB\uFF08yt-dlp \u9010\u89C6\u9891\uFF0C\u6700\u6162\u7684\u4E00\u6B65\uFF09\u2026` : `${PLATFORM_LABEL[p]}\u6293\u5230 ${result.items.length} \u6761 \u2192 \u53BB\u91CD/\u5F52\u6863/\u843D\u76D8\u2026`
            );
            const mv = await relocateItems(this.fsAdapter(), favIdToPath, urlToPath, [result]);
            totalMoved += mv.moved;
            const rep = await writeNewItems(this.fsAdapter(), favIds, urls, [result], this.ytEnrich(), this.ghEnrich());
            this.setStep(`${PLATFORM_LABEL[p]}\u961F\u5217\u4F4D\u7F6E\u5237\u65B0\uFF08\u6536\u85CF\u5939\u662F\u6808\uFF0C\u65B0\u52A0\u7684\u9876\u4E0A\u6765\uFF09\u2026`);
            await refreshQueueOrder(this.fsAdapter(), urlToPath, result.items);
            this.setStep(`${PLATFORM_LABEL[p]}\u68C0\u67E5\u8FDC\u7AEF\u5DF2\u5220\u9664\uFF08\u8FDB\u56DE\u6536\u7AD9\uFF0C\u4E0D\u771F\u5220\uFF09\u2026`);
            trashed = (await collectGarbage(this.fsAdapter(), urlToPath, [result])).trashed;
            totalTrashed += trashed;
            added = rep.added;
            totalAdded += added;
          } catch (e) {
            result = { platform: p, ok: false, items: [], error: `\u5199\u7B14\u8BB0\u5931\u8D25\uFF1A${e.message}` };
          }
        }
        this.syncProgress.done.push({ platform: p, ok: result.ok, added, trashed, error: result.error });
        this.settings.lastSync[p] = { at: (/* @__PURE__ */ new Date()).toISOString(), ok: result.ok, added, error: result.error };
        await this.saveSettings();
        this.emitProgress();
      }
      this.syncProgress.running = false;
      this.syncProgress.current = void 0;
      this.syncProgress.step = void 0;
      this.syncProgress.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      const failed = this.syncProgress.done.filter((d) => !d.ok).map((d) => d.platform);
      const okCount = this.syncProgress.done.length - failed.length;
      this.setStatus(failed.length === 0 ? `Fav: \u5B8C\u6210 +${totalAdded}` : `Fav: ${failed.join("\u3001")}\u5931\u8D25`);
      this.emitProgress();
      new import_obsidian3.Notice(
        failed.length === 0 ? `\u540C\u6B65\u5B8C\u6210\uFF1A${PLATFORMS.length}/${PLATFORMS.length} \u5E73\u53F0\uFF0C\u65B0\u589E ${totalAdded} \u6761${totalMoved > 0 ? `\uFF0C\u5F52\u6863 ${totalMoved} \u6761` : ""}${totalTrashed > 0 ? `\uFF0C\u8FDC\u7AEF\u5DF2\u5220 ${totalTrashed} \u6761\u8FDB\u56DE\u6536\u7AD9` : ""}` : `\u540C\u6B65\u5B8C\u6210 ${okCount}/${PLATFORMS.length}\uFF0C\u65B0\u589E ${totalAdded} \u6761${totalTrashed > 0 ? `\uFF0C\u8FDB\u56DE\u6536\u7AD9 ${totalTrashed} \u6761` : ""}\uFF1B\u5931\u8D25\uFF1A${failed.join("\u3001")}\uFF08\u770B\u603B\u89C8\u7EA2\u5361\u91CD\u8BD5\uFF09`
      );
      await this.openDashboard();
    } finally {
      this.syncing = false;
    }
  }
  async openDashboard() {
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
};
