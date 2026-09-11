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
