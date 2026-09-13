import { describe, expect, it } from "vitest";
import { collectGithub, parseStarredTsv } from "../src/sync/github.js";

describe("github", () => {
  it("parseStarredTsv maps fields", () => {
    const items = parseStarredTsv("2026-09-11T06:06:18Z\tfruitflydev/flycoinrh\thttps://github.com/fruitflydev/flycoinrh\tA coin\tPython\thttps://avatars/u/1?v=4\n\n");
    expect(items).toHaveLength(1);
    expect(items[0].favId).toBe("github:fruitflydev/flycoinrh");
    expect(items[0].title).toBe("fruitflydev/flycoinrh");
    expect(items[0].publishedAt).toBe("2026-09-11");
    expect(items[0].description).toBe("A coin（Python）");
    expect(items[0].coverUrl).toContain("avatars");
  });

  it("parseStarredTsv records queue position (0=newest)", () => {
    const items = parseStarredTsv("2026-09-11T06:06:18Z\ta/a\thttps://github.com/a/b\t\t\t\n2026-09-10T00:00:00Z\tb/b\thttps://github.com/b/b\t\t\t\n");
    expect(items.map((i) => i.playlistIndex)).toEqual([0, 1]);
  });

  it("enrichGithubDesc translates English intro, keeps lang suffix", async () => {
    const { enrichGithubDesc: enrich } = await import("../src/sync/github.js");
    const { makeItem } = await import("../src/sync/model.js");
    const a = { ...makeItem("github", "a/a", "https://github.com/a", "a"), description: "A fast bundler（TypeScript）" };
    const b = { ...makeItem("github", "b/b", "https://github.com/b", "b"), description: "中文简介（Python）" };
    const c = { ...makeItem("github", "c/c", "https://github.com/c", "c") };
    const fakeGet = async () => JSON.stringify([[["极速打包器", "A fast bundler", null, null, 1]], null, "en"]);
    await enrich([a, b, c], fakeGet);
    expect(a.description).toBe("极速打包器（TypeScript）");
    expect(b.description).toBe("中文简介（Python）");
    expect(c.description).toBeUndefined();
  });

  it("collectGithub uses gh CLI", async () => {
    let seen: string[] = [];
    const run = async (cmd: string, args: string[]) => {
      seen = [cmd, ...args];
      return { stdout: "2026-01-01T00:00:00Z\ta/b\thttps://github.com/a/b\t\t\t\n", stderr: "" };
    };
    const items = await collectGithub(run);
    expect(seen[0]).toBe("gh");
    expect(items).toHaveLength(1);
    expect(items[0].publishedAt).toBe("2026-01-01");
  });
});
