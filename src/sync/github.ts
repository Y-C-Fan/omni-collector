/** GitHub Stars：gh CLI（已登录，无需 cookie），star+json 拿真实 star 时间。 */
import { execFile } from "node:child_process";
import { makeItem, toDateOnly } from "./model.js";
import type { CollectedItem, RunFn } from "./model.js";

export class GithubError extends Error {}

function defaultRun(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 300000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new GithubError(`gh 失败（先跑 gh auth login）：${`${stderr || err.message}`.slice(0, 200)}`));
        return;
      }
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

/** 纯函数：解析 TSV（starred_at, full_name, url, desc, lang, avatar）；API 按 star 时间倒序，行号即队列位置。 */
export function parseStarredTsv(tsv: string): CollectedItem[] {
  const items: CollectedItem[] = [];
  let qi = 0;
  for (const line of tsv.split("\n")) {
    if (!line.trim()) continue;
    const [starredAt, full, url, desc, lang, avatar] = line.split("\t");
    if (!full || !url) continue;
    const it = makeItem("github", full, url, full.slice(0, 150));
    it.playlistIndex = qi;
    qi += 1;
    it.author = full.split("/")[0];
    it.description = [desc && desc !== "null" ? desc : "", lang && lang !== "null" ? `（${lang}）` : ""]
      .join("")
      .slice(0, 200) || undefined;
    it.coverUrl = avatar && avatar !== "null" ? avatar : undefined;
    it.publishedAt = toDateOnly(starredAt);
    items.push(it);
  }
  return items;
}

export async function collectGithub(run: RunFn = defaultRun): Promise<CollectedItem[]> {
  const { stdout } = await run("gh", [
    "api",
    "--paginate",
    "user/starred?per_page=100",
    "-H",
    "Accept: application/vnd.github.v3.star+json",
    "--jq",
    ".[] | [.starred_at, .repo.full_name, .repo.html_url, (.repo.description // \"\"), (.repo.language // \"\"), .repo.owner.avatar_url] | @tsv",
  ]);
  return parseStarredTsv(stdout);
}
