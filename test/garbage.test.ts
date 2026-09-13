import { describe, expect, it } from "vitest";
import { collectGarbage } from "../src/sync/runner.js";
import type { FsAdapter } from "../src/sync/runner.js";
import type { PlatformResult } from "../src/sync/model.js";

function memFs(seed: Record<string, string>): { fs: FsAdapter; files: Map<string, string> } {
  const files = new Map(Object.entries(seed));
  const fs: FsAdapter = {
    exists: async (p) => files.has(p),
    mkdir: async () => undefined,
    write: async (p, c) => void files.set(p, c),
    read: async (p) => {
      const c = files.get(p);
      if (c === undefined) throw new Error("missing");
      return c;
    },
    overwrite: async (p, c) => void files.set(p, c),
    rename: async (o, n) => {
      const c = files.get(o);
      if (c === undefined) throw new Error("missing");
      files.delete(o);
      files.set(n, c);
    },
  };
  return { fs, files };
}

const item = (url: string) => ({
  platform: "youtube" as const,
  favId: `yt:${url}`,
  nativeId: url,
  url,
  title: "t",
  folder: "稍后再看",
});

describe("collectGarbage", () => {
  it("远端没有的活区笔记进回收站，远端有的不动", async () => {
    const { fs, files } = memFs({
      "Fav Collector/youtube/稍后再看/a.md": "a",
      "Fav Collector/youtube/稍后再看/b.md": "b",
    });
    const urlToPath = new Map([
      ["https://youtu.be/a", "Fav Collector/youtube/稍后再看/a.md"],
      ["https://youtu.be/b", "Fav Collector/youtube/稍后再看/b.md"],
    ]);
    const results: PlatformResult[] = [{ platform: "youtube", ok: true, items: [item("https://youtu.be/a")] }];
    const r = await collectGarbage(fs, urlToPath, results);
    expect(r.trashed).toBe(1);
    expect(files.has("Fav Collector/youtube/稍后再看/b.md")).toBe(false);
    expect(files.has("Fav Collector/_已删除/youtube/稍后再看/b.md")).toBe(true);
    expect(urlToPath.get("https://youtu.be/b")).toBe("Fav Collector/_已删除/youtube/稍后再看/b.md");
  });

  it("回收站里的不重复处理，别家平台的不碰", async () => {
    const { fs, files } = memFs({
      "Fav Collector/_已删除/youtube/稍后再看/old.md": "old",
      "Fav Collector/bilibili/默认收藏夹/c.md": "c",
    });
    const urlToPath = new Map([
      ["https://youtu.be/old", "Fav Collector/_已删除/youtube/稍后再看/old.md"],
      ["https://bili/c", "Fav Collector/bilibili/默认收藏夹/c.md"],
    ]);
    const results: PlatformResult[] = [{ platform: "youtube", ok: true, items: [] }];
    const r = await collectGarbage(fs, urlToPath, results);
    expect(r.trashed).toBe(0);
    expect(files.size).toBe(2);
  });

  it("抓失败的平台绝不删；小宇宙历史窗口不参与", async () => {
    const { fs } = memFs({ "Fav Collector/youtube/稍后再看/a.md": "a", "Fav Collector/xiaoyuzhou/p/e.md": "e" });
    const urlToPath = new Map([
      ["https://youtu.be/a", "Fav Collector/youtube/稍后再看/a.md"],
      ["https://xyz/e", "Fav Collector/xiaoyuzhou/p/e.md"],
    ]);
    const results: PlatformResult[] = [
      { platform: "youtube", ok: false, items: [], error: "挂了" },
      { platform: "xiaoyuzhou", ok: true, items: [] },
    ];
    const r = await collectGarbage(fs, urlToPath, results);
    expect(r.trashed).toBe(0);
  });

  it("目标被占则跳过不覆盖", async () => {
    const { fs, files } = memFs({
      "Fav Collector/youtube/稍后再看/a.md": "live",
      "Fav Collector/_已删除/youtube/稍后再看/a.md": "trash",
    });
    const urlToPath = new Map([["https://youtu.be/a", "Fav Collector/youtube/稍后再看/a.md"]]);
    const results: PlatformResult[] = [{ platform: "youtube", ok: true, items: [] }];
    const r = await collectGarbage(fs, urlToPath, results);
    expect(r.trashed).toBe(0);
    expect(files.get("Fav Collector/youtube/稍后再看/a.md")).toBe("live");
  });
});
