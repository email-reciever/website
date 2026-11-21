/**
 * Generate the weekly digest video + narration audio for a saved weekly JSON.
 *
 * Requires macOS (`say` + `afconvert`) and the Remotion project in ./video.
 * Usage: node scripts/weekly-media.mjs [2026-W47]
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const WEEK = process.argv[2] || "2026-W47";
const VIDEO = path.join(ROOT, "video");
const PUBLIC = path.join(ROOT, "website/public/weekly");
const TMP = process.env.TMPDIR || "/tmp";

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})`);
}

const digest = JSON.parse(await readFile(path.join(ROOT, "weekly", `${WEEK}.json`), "utf8"));

const narration = [
  "欢迎收看 Email Reciever 周总结。",
  `本周时间范围 ${digest.week.label}。`,
  `去重后共收录 ${digest.total} 篇文章，来自 ${digest.sources.length} 个技术订阅源。`,
  "本周要点：",
  ...digest.highlights.slice(0, 3).map((post, i) => `第${i + 1}，${post.title}。`),
  `热门关键词包括：${digest.keywords
    .slice(0, 6)
    .map((kw) => kw.word)
    .join("，")}。`,
  "更多内容，请访问 Email Reciever 网站。",
].join("\n");

await writeFile(path.join(VIDEO, "src/weekly.json"), JSON.stringify(digest));
await writeFile(path.join(VIDEO, "public/narration.txt"), narration);

await mkdir(PUBLIC, { recursive: true });

// Caption track shared by the video and audio elements.
const lines = narration.split("\n");
const step = 58 / lines.length;
const stamp = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.000`;
};
const vtt = ["WEBVTT", ""];
lines.forEach((line, i) => {
  vtt.push(`${stamp(i * step)} --> ${stamp((i + 1) * step)}`, line, "");
});
await writeFile(path.join(PUBLIC, `${WEEK}.vtt`), vtt.join("\n"));

const aiff = path.join(TMP, `weekly-${WEEK}.aiff`);
const m4a = path.join(VIDEO, "public/narration.m4a");
run("say", ["-v", "Tingting", "-f", path.join(VIDEO, "public/narration.txt"), "-o", aiff]);
run("afconvert", ["-f", "m4af", "-d", "aac", aiff, m4a]);

run(
  "npx",
  ["remotion", "render", "WeeklyDigest", `out/weekly-${WEEK}.mp4`, "--concurrency=4"],
  VIDEO,
);
run(
  "npx",
  [
    "remotion",
    "still",
    "WeeklyDigest",
    "out/poster.png",
    "--frame=240",
    "--license-key=free-license",
  ],
  VIDEO,
);

await mkdir(PUBLIC, { recursive: true });
await copyFile(path.join(VIDEO, `out/weekly-${WEEK}.mp4`), path.join(PUBLIC, `${WEEK}.mp4`));
await copyFile(m4a, path.join(PUBLIC, `${WEEK}.m4a`));
await copyFile(path.join(VIDEO, "out/poster.png"), path.join(PUBLIC, `${WEEK}-poster.png`));
console.log(`media ready for ${WEEK}: video + audio + poster in website/public/weekly/`);
