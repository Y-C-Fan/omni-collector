import { describe, expect, it } from "vitest";
import { extractTweets, findCursor, tweetToItem } from "../src/sync/x.js";

const tweetResult = {
  rest_id: "123",
  core: { user_results: { result: { legacy: { screen_name: "alice", name: "Alice" } } } },
  legacy: { full_text: "hello\nworld", created_at: "Wed Oct 10 20:19:24 +0000 2018", favorite_count: 5 },
};

describe("x parsing", () => {
  it("tweetToItem maps fields", () => {
    const it = tweetToItem(tweetResult);
    expect(it?.url).toBe("https://x.com/alice/status/123");
    expect(it?.title).toBe("hello");
    expect(it?.author).toBe("Alice");
    expect(it?.publishedAt).toBe("2018-10-10");
    expect(tweetToItem({})).toBeNull();
  });

  it("extractTweets skips tombstones and dedups", () => {
    const page = {
      data: {
        bookmark_timeline: {
          timeline: {
            instructions: [
              {
                entries: [
                  { entryId: "tweet-123", content: { itemContent: { tweet_results: { result: tweetResult } } } },
                  { entryId: "tweet-123-dup", content: { itemContent: { tweet_results: { result: tweetResult } } } },
                  { entryId: "tomb", content: { itemContent: { tweet_results: { result: { __typename: "TweetTombstone" } } } } },
                  { entryId: "cursor-bottom-1", content: { value: "CURSOR123" } },
                ],
              },
            ],
          },
        },
      },
    };
    expect(extractTweets(page)).toHaveLength(1);
    expect(findCursor(page)).toBe("CURSOR123");
  });

  it("findCursor returns undefined without cursor", () => {
    expect(findCursor({})).toBeUndefined();
  });

  it("collectX assigns queue position in timeline order", async () => {
    const { collectX } = await import("../src/sync/x.js");
    const t2 = {
      rest_id: "999",
      core: { user_results: { result: { legacy: { screen_name: "bob", name: "Bob" } } } },
      legacy: { full_text: "second", created_at: "Wed Oct 10 20:19:24 +0000 2018" },
    };
    const page = {
      data: {
        bookmark_timeline: {
          timeline: {
            instructions: [
              {
                entries: [
                  { entryId: "tweet-123", content: { itemContent: { tweet_results: { result: tweetResult } } } },
                  { entryId: "tweet-999", content: { itemContent: { tweet_results: { result: t2 } } } },
                ],
              },
            ],
          },
        },
      },
    };
    const http = async () => page;
    const items = await collectX(http, "auth_token=tok; ct0=ct", 5);
    expect(items.map((i) => i.nativeId)).toEqual(["123", "999"]);
    expect(items.map((i) => i.playlistIndex)).toEqual([0, 1]);
  });
});
