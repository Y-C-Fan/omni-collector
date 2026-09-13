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

  it("collectYoutube collects WL + LL via fake run", async () => {
    const run = async (_cmd: string, args: string[]) => {
      const list = args[args.length - 1].includes("list=WL") ? "WL" : "LL";
      return { stdout: list === "WL" ? "v1\tT1\n" : "v2\tT2\n", stderr: "" };
    };
    const items = await collectYoutube({ ytdlpPath: "yt-dlp", run });
    expect(items.map((i) => i.nativeId)).toEqual(["WL_v1", "LL_v2"]);
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
