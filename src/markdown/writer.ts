/**
 * 落盘：Fav Collector/{平台}[/{收藏夹|稍后再看}]/{日期_}{标题}.md。
 * 只创建新文件，绝不改写旧文件（用户区天然安全）。
 */
import type { CollectedItem, Platform } from "../sync/model.js";
import { PLATFORM_LABEL } from "../sync/model.js";

export function sanitizeFilename(name: string): string {
  return (name || "untitled").replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
}

function yamlString(v: string): string {
  return JSON.stringify(String(v ?? ""));
}

export function notePathFor(item: Pick<CollectedItem, "platform" | "title" | "folder" | "watchLater" | "publishedAt">): string {
  const dir = item.folder?.trim() || (item.watchLater ? "稍后再看" : undefined);
  const base = `Fav Collector/${item.platform}${dir ? `/${sanitizeFilename(dir)}` : ""}`;
  const datePrefix = item.publishedAt?.trim() ? `${item.publishedAt.trim()}_` : "";
  return `${base}/${datePrefix}${sanitizeFilename(item.title)}.md`;
}

export function buildNote(item: CollectedItem): string {
  const fm = [
    "---",
    `platform: ${yamlString(item.platform)}`,
    `fav_id: ${yamlString(item.favId)}`,
    `url: ${yamlString(item.url)}`,
    ...(item.author ? [`author: ${yamlString(item.author)}`] : []),
    ...(item.publishedAt ? [`published_at: ${yamlString(item.publishedAt)}`] : []),
    ...(item.folder ? [`folder: ${yamlString(item.folder)}`] : []),
    ...(item.coverUrl ? [`cover: ${yamlString(item.coverUrl)}`] : []),
    "---",
    "",
    `# ${item.title.replace(/#/g, "\\#")}`,
    "",
    ...(item.coverUrl ? [`![cover](${item.coverUrl})`, ""] : []),
    ...(item.author ? [`作者：${item.author}`, ""] : []),
    ...(item.publishedAt ? [`发布日期：${item.publishedAt}`, ""] : []),
    ...(item.description ? ["## 简介", "", item.description, ""] : []),
    "<!-- 以下为用户私有编辑区，任何自动化逻辑禁止修改 -->",
    "## 我的笔记",
    "",
  ];
  return fm.join("\n");
}

export interface NoteIndex {
  /** fav_id 集合（新笔记）+ url 集合（兼容无 fav_id 的旧笔记）。 */
  favIds: Set<string>;
  urls: Set<string>;
}

/** 解析 frontmatter（dashboard + 去重共用，极简 YAML 子集；兼容 CRLF）。 */
export function parseFrontmatter(md: string): Record<string, string> {
  const norm = md.replace(/\r\n?/g, "\n");
  const out: Record<string, string> = {};
  const m = norm.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      try {
        v = JSON.parse(v) as string;
      } catch {
        v = v.slice(1, -1);
      }
    }
    if (k) out[k] = v;
  }
  return out;
}

export interface CardData {
  path: string;
  platform: Platform;
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
  folder?: string;
  cover?: string;
  description?: string;
  /** 排序键：published_at → 文件名 YYYY-MM-DD 前缀 → ""（再按 ctime 兜底） */
  sortKey: string;
  /** 卡片上显示的日期：published_at → 文件名前缀日期 → 未知时间 */
  dateLabel: string;
  /** 文件创建时间（入库顺序兜底，最新入库在上） */
  ctime: number;
}

export function cardFromNote(path: string, md: string, ctime = 0): CardData | null {
  md = md.replace(/\r\n?/g, "\n");
  const fm = parseFrontmatter(md);
  if (!fm.platform || !fm.url) return null;
  // 旧版笔记第一个 H1 是系统区标记行，跳过它取真正的标题
  const headings = [...md.matchAll(/^# (.+)$/gm)].map((m) => m[1]).filter((h) => h !== "Fav Collector System Zone");
  const title = (headings[0] ?? fm.url).replace(/\\#/g, "#");
  let cover = fm.cover;
  if (!cover && fm.platform === "youtube") {
    // flat 抓取没有缩略图：yt 封面 URL 是确定性规则，直接拼
    const m = fm.url.match(/watch\?v=([\w-]{6,})/);
    if (m) cover = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
  }
  // 文件夹以文件路径为准（Fav Collector/{平台}/{收藏夹}/x.md），frontmatter 只是兜底
  let folder = fm.folder;
  const segs = path.split("/");
  if (segs.length >= 4) folder = segs[2];
  let description: string | undefined;
  const introM = md.match(/^## 简介\s*\n([\s\S]*?)(?=^## |^# |<!--|\Z)/m);
  if (introM) description = introM[1].trim().slice(0, 200) || undefined;
  const fileName = segs[segs.length - 1] ?? "";
  const dateM = fileName.match(/^(\d{4}-\d{2}-\d{2})_/);
  const publishedAt = fm.published_at || undefined;
  const sortKey = publishedAt ?? dateM?.[1] ?? "";
  return {
    path,
    platform: fm.platform as Platform,
    title,
    url: fm.url,
    author: fm.author,
    publishedAt,
    folder,
    cover,
    description,
    sortKey,
    dateLabel: publishedAt ?? dateM?.[1] ?? "未知时间",
    ctime,
  };
}

export interface CardGroup {
  key: string;
  label: string;
  items: CardData[];
}

/** 按收藏夹分组（未分类沉底，其余按名称排；组内保持时间倒序）。 */
export function groupCards(cards: CardData[], platform: Platform | "all"): CardGroup[] {
  const map = new Map<string, CardData[]>();
  for (const c of cards) {
    const folder = c.folder ?? "未分类";
    const key = platform === "all" ? `${c.platform}::${folder}` : folder;
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  const groups: CardGroup[] = [...map.entries()].map(([key, items]) => {
    let label: string;
    if (platform === "all") {
      const [p, f] = key.split("::");
      label = `${PLATFORM_LABEL[p as Platform]} · ${f}`;
    } else {
      label = key;
    }
    return { key, label, items };
  });
  groups.sort((a, b) => {
    const au = a.label.endsWith("未分类") ? 1 : 0;
    const bu = b.label.endsWith("未分类") ? 1 : 0;
    if (au !== bu) return au - bu;
    if (b.items.length !== a.items.length) return b.items.length - a.items.length;
    return a.label.localeCompare(b.label, "zh");
  });
  return groups;
}
