import { describe, expect, it } from "vitest";
import { collectYoutube, enrichYoutubeDates, parseFlatList } from "../src/sync/youtube.js";

describe("youtube", () => {
  it("parseFlatList maps id/title", () => {
    const items = parseFlatList("abc\tHello\ndef\tWorld\nbadline\n", "WL");
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe("https://www.youtube.com/watch?v=abc");
    expect(items[0].watchLater).toBe(true);
    expect(items[0].favId).toBe("youtube:WL_abc");
    expect(items[0].coverUrl).toBe("https://i.ytimg.com/vi/abc/hqdefault.jpg");
  });

  it("parseFlatList assigns LL to folder", () => {
    const wl = parseFlatList("abc\tHello\n", "WL");
    expect(wl[0].watchLater).toBe(true);
    expect(wl[0].folder).toBeUndefined();
    const ll = parseFlatList("def\tWorld\n", "LL");
    expect(ll[0].watchLater).toBe(false);
    expect(ll[0].folder).toBe("喜欢");
  });

  it("collectYoutube only fetches Watch Later", async () => {
    const seen: string[] = [];
    const run = async (_cmd: string, args: string[]) => {
      seen.push(args[args.length - 1]);
      return { stdout: "v1\tT1\n", stderr: "" };
    };
    const items = await collectYoutube({ ytdlpPath: "yt-dlp", run });
    expect(seen).toEqual(["https://www.youtube.com/playlist?list=WL"]);
    expect(items.map((i) => i.nativeId)).toEqual(["WL_v1"]);
  });

  it("collectYoutube maps WL-missing to friendly error", async () => {
    const run = async () => {
      throw new Error("ERROR: [youtube:tab] WL: YouTube said: The playlist does not exist.");
    };
    await expect(collectYoutube({ ytdlpPath: "yt-dlp", run })).rejects.toThrowError(/登录过期/);
  });

  it("enrichYoutubeDates fills publishedAt", async () => {
    const items = parseFlatList("abc\tHello\n", "WL");
    const run = async () => ({ stdout: "abc\t20240115\n", stderr: "" });
    await enrichYoutubeDates({ ytdlpPath: "yt-dlp", run }, items);
    expect(items[0].publishedAt).toBe("2024-01-15");
  });
});


describe("youtube desc", () => {
  it("snippetForTranslate cuts at sentence boundary", async () => {
    const { snippetForTranslate: snip, isMostlyChinese: isZh, translateEnToZh: tr } = await import("../src/sync/youtube.js");
    expect(snip("short")).toBe("short");
    const head = "This is a deliberately very long opening sentence designed to exceed forty percent of the six hundred character truncation window without any doubt whatsoever, with some extra padding words to make it long enough for sure indeed absolutely definitely. ";
    const long = `${head}${"x".repeat(700)}`;
    expect(snip(long)).toBe(head.trimEnd());
    expect(isZh("这是中文介绍内容")).toBe(true);
    expect(isZh("This is an English description of the video")).toBe(false);
    const fakeGet = async () => JSON.stringify([[["你好世界", "hello world", null, null, 1]], null, "en"]);
    expect(await tr("hello world", fakeGet)).toBe("你好世界");
  });

  it("enrichYoutubeDesc fills Chinese description via fake run + fake translate", async () => {
    const { parseFlatList: pfl, enrichYoutubeDesc: enrich } = await import("../src/sync/youtube.js");
    const items = pfl("abc\tHello\n", "WL");
    const run = async () => ({ stdout: `abc\t${JSON.stringify("An English intro. More words here.")}\n`, stderr: "" });
    const fakeGet = async () => JSON.stringify([[["英文介绍", "An English intro.", null, null, 1]], null, "en"]);
    await enrich({ ytdlpPath: "yt-dlp", run }, items, fakeGet);
    expect(items[0].description).toBe("英文介绍");
  });

  it("enrichYoutubeDesc keeps Chinese source as-is", async () => {
    const { parseFlatList: pfl, enrichYoutubeDesc: enrich } = await import("../src/sync/youtube.js");
    const items = pfl("abc\tHello\n", "WL");
    const run = async () => ({ stdout: `abc\t${JSON.stringify("这是一段中文视频简介。")}\n`, stderr: "" });
    let called = false;
    const fakeGet = async (): Promise<string> => {
      called = true;
      return "";
    };
    await enrich({ ytdlpPath: "yt-dlp", run }, items, fakeGet);
    expect(called).toBe(false);
    expect(items[0].description).toBe("这是一段中文视频简介。");
  });
});


describe("youtube queue", () => {
  it("parseFlatList records playlist position", async () => {
    const { parseFlatList: pfl } = await import("../src/sync/youtube.js");
    const items = pfl("a\tA\nbadline\nb\tB\n", "WL");
    expect(items.map((i) => i.playlistIndex)).toEqual([0, 1]);
  });

  it("refreshQueueOrder rewrites only the index line", async () => {
    const { refreshQueueOrder: refresh } = await import("../src/sync/runner.js");
    const { makeItem } = await import("../src/sync/model.js");
    const store = new Map<string, string>([
      ["Fav Collector/youtube/A.md", '---\nplatform: "youtube"\nurl: "https://www.youtube.com/watch?v=a"\nplaylist_index: 9\n---\n# A\n\n## 我的笔记\n\n私密\n'],
      ["Fav Collector/youtube/B.md", '---\nplatform: "youtube"\nurl: "https://www.youtube.com/watch?v=b"\n---\n# B\n'],
    ]);
    const fs = {
      exists: async (p: string) => store.has(p),
      mkdir: async () => {},
      write: async (p: string, c: string) => {
        store.set(p, c);
      },
      read: async (p: string) => store.get(p) as string,
      overwrite: async (p: string, c: string) => {
        store.set(p, c);
      },
      rename: async () => {},
    };
    const a = { ...makeItem("youtube", "WL_a", "https://www.youtube.com/watch?v=a", "A"), playlistIndex: 0 };
    const b = { ...makeItem("youtube", "WL_b", "https://www.youtube.com/watch?v=b", "B"), playlistIndex: 1 };
    const urlToPath = new Map([
      ["https://www.youtube.com/watch?v=a", "Fav Collector/youtube/A.md"],
      ["https://www.youtube.com/watch?v=b", "Fav Collector/youtube/B.md"],
    ]);
    const rep = await refresh(fs, urlToPath, [a, b]);
    expect(rep.updated).toBe(2);
    expect(store.get("Fav Collector/youtube/A.md")).toContain("playlist_index: 0");
    expect(store.get("Fav Collector/youtube/A.md")).toContain("私密");
    expect(store.get("Fav Collector/youtube/B.md")).toContain('url: "https://www.youtube.com/watch?v=b"\nplaylist_index: 1');
  });

  it("cardFromNote shows queue number instead of unknown time", async () => {
    const { cardFromNote: cfn } = await import("../src/markdown/writer.js");
    const card = cfn(
      "Fav Collector/youtube/T.md",
      '---\nplatform: "youtube"\nurl: "https://u"\nplaylist_index: 2\npublished_at: "2026-01-01"\n---\n# T\n',
    );
    expect(card?.queueIndex).toBe(2);
    expect(card?.dateLabel).toBe("#3 · 2026-01-01");
    const bare = cfn("Fav Collector/youtube/T.md", '---\nplatform: "youtube"\nurl: "https://u"\nplaylist_index: 0\n---\n# T\n');
    expect(bare?.dateLabel).toBe("#1");
  });
});
