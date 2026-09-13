import { describe, expect, it } from "vitest";
import { collectXiaoyuzhou, episodeToItem, findEpisodeArrays } from "../src/sync/xiaoyuzhou.js";

const ep = {
  eid: "e123",
  title: "单集标题",
  podcast: { pid: "p1", title: "播客名" },
  shownotes: "<p>简介<br/>第二行</p>",
  duration: 3600000,
  pubDate: "2026-09-10T12:00:00.000Z",
  image: { picUrl: "https://img/cover.jpg" },
};

describe("xiaoyuzhou", () => {
  it("episodeToItem maps fields with podcast as folder", () => {
    const it = episodeToItem(ep);
    expect(it?.url).toBe("https://www.xiaoyuzhoufm.com/episode/e123");
    expect(it?.favId).toBe("xiaoyuzhou:e123");
    expect(it?.folder).toBe("播客名");
    expect(it?.author).toBe("播客名");
    expect(it?.description).toBe("简介\n第二行");
    expect(it?.coverUrl).toBe("https://img/cover.jpg");
    expect(it?.publishedAt).toBe("2026-09-10");
    expect(episodeToItem({})).toBeNull();
  });

  it("findEpisodeArrays digs nested lists", () => {
    expect(findEpisodeArrays({ data: { list: [ep] } })).toHaveLength(1);
    expect(findEpisodeArrays({})).toHaveLength(0);
  });

  it("collectXiaoyuzhou requires token", async () => {
    const post = async () => ({ data: {}, headers: {}, status: 200 });
    await expect(collectXiaoyuzhou({ post }, { accessToken: "  " })).rejects.toThrowError(/未登录/);
  });

  it("collectXiaoyuzhou maps 401 to relogin hint", async () => {
    const post = async () => ({ data: {}, headers: {}, status: 401 });
    await expect(collectXiaoyuzhou({ post }, { accessToken: "dead" })).rejects.toThrowError(/过期/);
  });

  it("collectXiaoyuzhou collects + paginates", async () => {
    const pages = [{ data: [ep], loadMoreKey: "k2" }, { data: [ep] }];
    let n = 0;
    const post = async () => ({ data: pages[n++], headers: {}, status: 200 });
    const items = await collectXiaoyuzhou({ post }, { accessToken: "tok" });
    expect(items).toHaveLength(1); // 去重
    expect(n).toBe(2);
  });
});


describe("xiaoyuzhou history", () => {
  it("collectXiaoyuzhouHistory unwraps episode entries + marks unfinished", async () => {
    const { collectXiaoyuzhouHistory: collect } = await import("../src/sync/xiaoyuzhou.js");
    const data = [
      {
        episode: {
          eid: "h1",
          title: "没听完那期",
          podcast: { pid: "p9", title: "堆积播客" },
          shownotes: "<p>简介</p>",
          duration: 3600,
          pubDate: "2026-09-12T12:00:00.000Z",
          isFinished: false,
          isPlayed: true,
        },
      },
      {
        episode: {
          eid: "h2",
          title: "听完那期",
          podcast: { pid: "p9", title: "堆积播客" },
          shownotes: "",
          duration: 1800,
          pubDate: "2026-09-11T12:00:00.000Z",
          isFinished: true,
          isPlayed: true,
        },
      },
    ];
    const seen: string[] = [];
    const post = async (url: string) => {
      seen.push(url);
      return { data: { data }, headers: {}, status: 200 };
    };
    const items = await collect({ post }, { accessToken: "tok" });
    expect(seen[0]).toContain("/v1/episode-played/list-history");
    expect(items).toHaveLength(2);
    expect(items[0].folder).toBe("堆积播客");
    expect(items[0].unfinished).toBe(true);
    expect(items[1].unfinished).toBeUndefined();
    expect(items[0].url).toBe("https://www.xiaoyuzhoufm.com/episode/h1");
  });

  it("collectXiaoyuzhouHistory requires token", async () => {
    const { collectXiaoyuzhouHistory: collect } = await import("../src/sync/xiaoyuzhou.js");
    const post = async () => ({ data: {}, headers: {}, status: 200 });
    await expect(collect({ post }, { accessToken: "  " })).rejects.toThrowError(/未登录/);
  });
});


describe("xiaoyuzhou headers", () => {
  it("appHeaders is Chromium-safe (no manual Host)", async () => {
    const { appHeaders } = await import("../src/sync/xiaoyuzhou.js");
    const h = appHeaders("tok", "dev1");
    expect("Host" in h).toBe(false);
    expect(h["x-jike-access-token"]).toBe("tok");
    expect(h["x-jike-device-id"]).toBe("dev1");
    expect(h["local-time"]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
