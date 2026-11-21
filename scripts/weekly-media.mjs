/**
 * Generate weekly digest video + narration with free neural TTS.
 *
 * Primary: Microsoft Edge neural TTS (@andresaya/edge-tts), keyless. Each
 * narration line is synthesized separately so its real duration drives both
 * the VTT captions and the Remotion scene boundaries — no drift.
 * Fallback: macOS `say` + `afconvert` when Edge TTS is unavailable.
 *
 * Usage: node scripts/weekly-media.mjs [2026-W47]
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EdgeTTS } from "@andresaya/edge-tts";

const ROOT = process.cwd();
const WEEK = process.argv[2] || "2026-W47";
const VIDEO = path.join(ROOT, "video");
const PUBLIC = path.join(ROOT, "website/public/weekly");
const TMP = process.env.TMPDIR || "/tmp";
const VOICE = process.env.TTS_VOICE || "zh-CN-XiaoxiaoNeural";
const FPS = 30;

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})`);
}

const digest = JSON.parse(await readFile(path.join(ROOT, "weekly", `${WEEK}.json`), "utf8"));

const lines = [
  "欢迎收看 Email Reciever 周总结。",
  `本周时间范围 ${digest.week.label}。`,
  `去重后共收录 ${digest.total} 篇文章，来自 ${digest.sources.length} 个技术订阅源。`,
  "本周要点开始。",
  ...digest.highlights.slice(0, 3).map((post, i) => `第${i + 1}条，${post.title}。`),
  `热门关键词包括：${digest.keywords
    .slice(0, 6)
    .map((kw) => kw.word)
    .join("，")}。`,
  "更多内容，请访问 Email Reciever 网站。",
];

await writeFile(path.join(VIDEO, "src/weekly.json"), JSON.stringify(digest));
await writeFile(path.join(VIDEO, "public/narration.txt"), lines.join("\n"));
await mkdir(PUBLIC, { recursive: true });

const chunks = [];
let cursor = 0;

async function synthesizeLine(text) {
  const tts = new EdgeTTS();
  const result = await tts.generate(text, VOICE);
  // Edge TTS reports duration in seconds; convert to ms for VTT + Remotion.
  const last = result.sentenceBoundaries?.at(-1);
  const fallbackSeconds = last ? (last.offset + last.duration) / 1_000_000 : 0;
  const durationMs = Math.round((result.duration ?? fallbackSeconds) * 1000);
  return { audio: Buffer.from(result.audio), durationMs };
}

try {
  for (const line of lines) {
    const { audio, durationMs } = await synthesizeLine(line);
    const segment = {
      text: line,
      start: cursor,
      end: cursor + durationMs,
      audio,
    };
    chunks.push(segment);
    cursor += durationMs;
  }
} catch (error) {
  console.warn(`Edge TTS failed (${error}) — falling back to macOS say`);
  chunks.length = 0;
  cursor = 0;
  for (const line of lines) {
    const aiff = path.join(TMP, `weekly-${WEEK}-${chunks.length}.aiff`);
    run("say", ["-v", "Tingting", "-o", aiff, line]);
    const info = spawnSync("afinfo", [aiff], { encoding: "utf8" });
    const match = /estimated duration: ([\d.]+)/.exec(info.stdout || "");
    const durationMs = Math.round((Number(match?.[1] ?? 4) - 0.2) * 1000);
    chunks.push({ text: line, start: cursor, end: cursor + durationMs, audio: null, aiff });
    cursor += durationMs;
  }
}

const totalMs = cursor;
const mp3 = Buffer.concat(chunks.map((chunk) => chunk.audio ?? Buffer.alloc(0)));
if (mp3.length) {
  await writeFile(path.join(VIDEO, "public/narration.mp3"), mp3);
  await copyFile(path.join(VIDEO, "public/narration.mp3"), path.join(PUBLIC, `${WEEK}.mp3`));
} else {
  // Fallback path: convert each AIFF and concatenate the resulting m4a data.
  const m4as = [];
  for (const [i, chunk] of chunks.entries()) {
    const out = path.join(TMP, `weekly-${WEEK}-${i}.m4a`);
    run("afconvert", ["-f", "m4af", "-d", "aac", chunk.aiff, out]);
    m4as.push(await readFile(out));
  }
  await writeFile(path.join(PUBLIC, `${WEEK}.m4a`), Buffer.concat(m4as));
}

// Cue timing comes from the synthesized durations, so captions match the audio.
const stamp = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.000`;
};
const vtt = ["WEBVTT", ""];
for (const chunk of chunks) {
  vtt.push(`${stamp(chunk.start)} --> ${stamp(chunk.end)}`, chunk.text, "");
}
await writeFile(path.join(PUBLIC, `${WEEK}.vtt`), vtt.join("\n"));

// Scene boundaries in seconds — Remotion reads this to stay in sync.
const at = (index) => (chunks[index]?.start ?? 0) / 1000;
const end = (index) => (chunks[index]?.end ?? totalMs) / 1000;
const timing = {
  durationMs: totalMs,
  fps: FPS,
  scenes: [
    { type: "intro", from: at(0), to: at(2) },
    { type: "stats", from: at(2), to: at(3) },
    { type: "highlight", index: 0, from: at(3), to: at(5) },
    { type: "highlight", index: 1, from: at(5), to: at(6) },
    { type: "highlight", index: 2, from: at(6), to: at(7) },
    { type: "keywords", from: at(7), to: at(8) },
    { type: "outro", from: at(8), to: totalMs / 1000 },
  ],
};
await writeFile(path.join(VIDEO, "src/media-timing.json"), JSON.stringify(timing, null, 2));

const renderArgs = [
  "remotion",
  "render",
  "WeeklyDigest",
  `out/weekly-${WEEK}.mp4`,
  "--concurrency=4",
];
run("npx", renderArgs, VIDEO);
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

await copyFile(path.join(VIDEO, `out/weekly-${WEEK}.mp4`), path.join(PUBLIC, `${WEEK}.mp4`));
await copyFile(path.join(VIDEO, "out/poster.png"), path.join(PUBLIC, `${WEEK}-poster.png`));
console.log(
  `media ready for ${WEEK}: ${(totalMs / 1000).toFixed(1)}s, voice ${VOICE}, captions aligned`,
);
