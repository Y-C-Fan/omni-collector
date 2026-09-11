import { describe, expect, it } from "vitest";
import { relocateItems, writeNewItems } from "../src/sync/runner.js";
import { makeItem } from "../src/sync/model.js";
import type { PlatformResult } from "../src/sync/model.js";

describe("runner dedup", () => {
  it("writes only new items and never overwrites", async () => {
    const store = new Map<string, string>([
      ["Fav Collector/bilibili/旧.md", '---\nplatform: "bilibili"\nfav_id: "bilibili:old"\nurl: "https://u/old"\n---\n'],
    ]);
    const fs = {
      exists: async (p: string) => store.has(p),
      mkdir: async () => {},
      write: async (p: string, c: string) => {
        store.set(p, c);
      },
      rename: async () => {},
    };
    const fresh = makeItem("bilibili", "new1", "https://u/new1", "新标题");
    const dupe = makeItem("bilibili", "old", "https://u/old", "旧标题");
    const results: PlatformResult[] = [{ platform: "bilibili", ok: true, items: [fresh, dupe] }];
    const report = await writeNewItems(fs, new Set(["bilibili:old"]), new Set(["https://u/old"]), results, async () => {});
    expect(report.added).toBe(1);
    expect(report.addedPaths).toEqual(["Fav Collector/bilibili/新标题.md"]);
    expect(store.get("Fav Collector/bilibili/旧.md")).toContain('fav_id: "bilibili:old"');
  });
});


describe("runner relocate", () => {
  it("moves legacy flat notes into folders by url match without touching content", async () => {
    const oldMd = '---\nplatform: "youtube"\nfav_id: "youtube:abc"\nurl: "https://www.youtube.com/watch?v=abc"\n---\n';
    const store = new Map<string, string>([["Fav Collector/youtube/Hello.md", oldMd]]);
    const fs = {
      exists: async (p: string) => store.has(p),
      mkdir: async () => {},
      write: async (p: string, c: string) => {
        store.set(p, c);
      },
      rename: async (o: string, n: string) => {
        store.set(n, store.get(o) as string);
        store.delete(o);
      },
    };
    const it = { ...makeItem("youtube", "LL_abc", "https://www.youtube.com/watch?v=abc", "Hello"), folder: "喜欢" };
    const results: PlatformResult[] = [{ platform: "youtube", ok: true, items: [it] }];
    const rep = await relocateItems(fs, new Map(), new Map([["https://www.youtube.com/watch?v=abc", "Fav Collector/youtube/Hello.md"]]), results);
    expect(rep.moved).toBe(1);
    expect(store.has("Fav Collector/youtube/Hello.md")).toBe(false);
    expect(store.get("Fav Collector/youtube/喜欢/Hello.md")).toBe(oldMd);
  });

  it("skips relocate when already in place or target occupied", async () => {
    const store = new Map<string, string>([
      ["Fav Collector/youtube/喜欢/A.md", "a"],
      ["Fav Collector/youtube/B.md", "b"],
      ["Fav Collector/youtube/喜欢/B.md", "occupied"],
    ]);
    const fs = {
      exists: async (p: string) => store.has(p),
      mkdir: async () => {},
      write: async (p: string, c: string) => {
        store.set(p, c);
      },
      rename: async (o: string, n: string) => {
        store.set(n, store.get(o) as string);
        store.delete(o);
      },
    };
    const a = { ...makeItem("youtube", "LL_a", "https://u/a", "A"), folder: "喜欢" };
    const b = { ...makeItem("youtube", "LL_b", "https://u/b", "B"), folder: "喜欢" };
    const rep = await relocateItems(
      fs,
      new Map(),
      new Map([
        ["https://u/a", "Fav Collector/youtube/喜欢/A.md"],
        ["https://u/b", "Fav Collector/youtube/B.md"],
      ]),
      [{ platform: "youtube", ok: true, items: [a, b] }],
    );
    expect(rep.moved).toBe(0);
    expect(store.get("Fav Collector/youtube/B.md")).toBe("b");
  });
});
