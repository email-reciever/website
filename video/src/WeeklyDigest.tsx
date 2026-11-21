import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import data from "./weekly.json";
import timing from "./media-timing.json";
import highlightImages from "./highlight-images.json";

const CYAN = "#00E5FF";
const INK = "#F2FBFF";
const MUTED = "rgba(242,251,255,0.55)";

const fontStyle = `
@font-face{font-family:Geist;src:url(${staticFile("fonts/geist.woff2")}) format("woff2");font-weight:100 900}
@font-face{font-family:GeistMono;src:url(${staticFile("fonts/geist-mono.woff2")}) format("woff2");font-weight:100 900}
`;

const rise = (frame: number, fps: number, delay = 0) =>
  interpolate(frame - delay, [0, 0.7 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const Grid: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(rgba(0,229,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.045) 1px, transparent 1px)",
      backgroundSize: "60px 60px",
      opacity: 0.8,
    }}
  />
);

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = rise(frame, fps, 4);
  const b = rise(frame, fps, 18);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", padding: 120, fontFamily: "Geist, sans-serif" }}>
      <Grid />
      <div style={{ opacity: b, fontFamily: "GeistMono, monospace", fontSize: 26, letterSpacing: 8, color: CYAN }}>
        EMAIL RECIEVER / WEEKLY SIGNAL
      </div>
      <div
        style={{
          opacity: a,
          translate: `0 ${interpolate(a, [0, 1], [60, 0])}px`,
          fontSize: 190,
          fontWeight: 800,
          letterSpacing: -12,
          lineHeight: 0.88,
          color: INK,
          marginTop: 90,
        }}
      >
        WEEKLY
        <br />
        <span style={{ color: CYAN }}>DIGEST.</span>
      </div>
      <div
        style={{
          opacity: interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" }),
          marginTop: 60,
          width: interpolate(frame, [30, 75], [0, 760], {
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          height: 3,
          background: CYAN,
        }}
      />
      <div style={{ opacity: b, marginTop: 40, fontSize: 34, color: MUTED }}>{data.week.label}</div>
    </AbsoluteFill>
  );
};

const Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", padding: 120, fontFamily: "Geist, sans-serif" }}>
      <Grid />
      <div style={{ fontFamily: "GeistMono, monospace", fontSize: 26, letterSpacing: 8, color: CYAN }}>
        01 / THIS WEEK
      </div>
      <div style={{ display: "flex", gap: 140, marginTop: 140 }}>
        <div style={{ opacity: rise(frame, fps, 5) }}>
          <div style={{ fontSize: 260, fontWeight: 800, color: INK, lineHeight: 1 }}>{data.total}</div>
          <div style={{ fontFamily: "GeistMono, monospace", fontSize: 30, color: MUTED, letterSpacing: 5 }}>
            POSTS AFTER DEDUPE
          </div>
        </div>
        <div style={{ opacity: rise(frame, fps, 18) }}>
          <div style={{ fontSize: 260, fontWeight: 800, color: CYAN, lineHeight: 1 }}>{data.sources.length}</div>
          <div style={{ fontFamily: "GeistMono, monospace", fontSize: 30, color: MUTED, letterSpacing: 5 }}>
            ACTIVE SOURCES
          </div>
        </div>
      </div>
      <div style={{ marginTop: 80, display: "flex", gap: 24 }}>
        {data.sources.slice(0, 8).map((s, i) => (
          <div
            key={s.author}
            style={{
              opacity: rise(frame, fps, 30 + i * 4),
              border: `1px solid ${CYAN}55`,
              padding: "18px 26px",
              color: INK,
              fontFamily: "GeistMono, monospace",
              fontSize: 28,
            }}
          >
            {s.author} <span style={{ color: CYAN }}>{s.count}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        padding: 120,
        fontFamily: "Geist, sans-serif",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Grid />
      <div
        style={{
          opacity: rise(frame, fps, 5),
          fontSize: 130,
          fontWeight: 800,
          letterSpacing: -8,
          color: INK,
          textAlign: "center",
        }}
      >
        READ THE <span style={{ color: CYAN }}>SIGNAL.</span>
      </div>
      <div
        style={{
          opacity: rise(frame, fps, 20),
          fontFamily: "GeistMono, monospace",
          fontSize: 30,
          letterSpacing: 6,
          color: MUTED,
          marginTop: 50,
        }}
      >
        email-reciever-website.workers.dev/weekly
      </div>
    </AbsoluteFill>
  );
};

/** One scene per section of the editorial summary, so the video carries the
 * same conclusions as the written digest. */
const SectionScene: React.FC<{
  index: number;
  heading: string;
  body: string;
  image?: string;
}> = ({ index, heading, body, image }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = rise(frame, fps, 4);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", padding: 120, fontFamily: "Geist, sans-serif" }}>
      <Grid />
      <div style={{ fontFamily: "GeistMono, monospace", fontSize: 26, letterSpacing: 8, color: CYAN }}>
        {String(index + 1).padStart(2, "0")} / WEEKLY SIGNAL
      </div>
      <div style={{ display: "flex", gap: 70, marginTop: 80, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              opacity: p,
              translate: `0 ${interpolate(p, [0, 1], [50, 0])}px`,
              fontSize: heading.length > 16 ? 54 : heading.length > 11 ? 64 : 76,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.15,
              color: INK,
            }}
          >
            {heading}
          </div>
          <div
            style={{
              opacity: rise(frame, fps, 16),
              marginTop: 50,
              fontSize: 38,
              lineHeight: 1.5,
              color: MUTED,
              maxWidth: 1000,
            }}
          >
            {body}
          </div>
        </div>
        {image ? (
          <div
            style={{
              opacity: rise(frame, fps, 12),
              width: 560,
              height: 360,
              border: `2px solid ${CYAN}`,
              padding: 10,
              background: "rgba(0,229,255,0.05)",
              flexShrink: 0,
            }}
          >
            <CanvasImage
              src={staticFile(image)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 60,
          height: 3,
          width: interpolate(frame, [8, 60], [0, 1680], { extrapolateRight: "clamp" }),
          background: CYAN,
        }}
      />
    </AbsoluteFill>
  );
};

// Scene boundaries come from the actual TTS durations, so video + captions
// stay locked to the narration.
const frames = (seconds: number) => Math.round(seconds * timing.fps);

export const WeeklyDigest: React.FC = () => {
  const scene = (name: string) => timing.scenes.find((item) => item.type === name);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <style>{fontStyle}</style>
      <Audio src={staticFile("narration.mp3")} />
      <Sequence
        from={frames(scene("intro")?.from ?? 0)}
        durationInFrames={frames((scene("intro")?.to ?? 0) - (scene("intro")?.from ?? 0))}
      >
        <Intro />
      </Sequence>
      <Sequence
        from={frames(scene("stats")?.from ?? 0)}
        durationInFrames={frames((scene("stats")?.to ?? 0) - (scene("stats")?.from ?? 0))}
      >
        <Stats />
      </Sequence>
      {timing.scenes
        .filter((item) => item.type === "section")
        .map((item, index) => (
          <Sequence
            key={`${item.type}-${index}`}
            from={frames(item.from)}
            durationInFrames={frames(item.to - item.from)}
          >
            <SectionScene
              index={item.index ?? index}
              heading={item.heading ?? ""}
              body={item.body ?? ""}
              image={highlightImages[item.index ?? index]}
            />
          </Sequence>
        ))}
      <Sequence
        from={frames(scene("outro")?.from ?? 0)}
        durationInFrames={frames((scene("outro")?.to ?? 0) - (scene("outro")?.from ?? 0))}
      >
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
