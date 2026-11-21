import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import data from "./weekly.json";

const CYAN = "#00E5FF";
const INK = "#F2FBFF";
const MUTED = "rgba(242,251,255,0.55)";

type SceneProps = Record<string, never>;

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

const Intro: React.FC<SceneProps> = () => {
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

const Stats: React.FC<SceneProps> = () => {
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

const Highlight: React.FC<{ index: number; title: string; source: string }> = ({ index, title, source }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = rise(frame, fps, 4);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", padding: 120, fontFamily: "Geist, sans-serif" }}>
      <Grid />
      <div style={{ fontFamily: "GeistMono, monospace", fontSize: 26, letterSpacing: 8, color: CYAN }}>
        {String(index + 1).padStart(2, "0")} / HIGHLIGHT · {source.toUpperCase()}
      </div>
      <div
        style={{
          opacity: p,
          translate: `0 ${interpolate(p, [0, 1], [50, 0])}px`,
          fontSize: 74,
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: -3,
          color: INK,
          marginTop: 110,
          maxWidth: 1600,
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 90, height: 3, width: interpolate(frame, [8, 60], [0, 1680], { extrapolateRight: "clamp" }), background: CYAN }} />
    </AbsoluteFill>
  );
};

const Keywords: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", padding: 120, fontFamily: "Geist, sans-serif" }}>
      <Grid />
      <div style={{ fontFamily: "GeistMono, monospace", fontSize: 26, letterSpacing: 8, color: CYAN }}>
        03 / SIGNALS
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, marginTop: 120, maxWidth: 1660 }}>
        {data.keywords.slice(0, 14).map((kw, i) => (
          <div
            key={kw.word}
            style={{
              opacity: rise(frame, fps, 5 + i * 3),
              border: "1px solid rgba(242,251,255,0.18)",
              borderLeft: `3px solid ${CYAN}`,
              padding: "22px 34px",
              fontSize: 42,
              color: INK,
            }}
          >
            {kw.word} <span style={{ color: CYAN, fontFamily: "GeistMono, monospace" }}>{kw.count}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<SceneProps> = () => {
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

export const WeeklyDigest: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <style>{fontStyle}</style>
      <Audio src={staticFile("narration.m4a")} />
      <Sequence durationInFrames={6 * fps} premountFor={1 * fps}>
        <Intro />
      </Sequence>
      <Sequence from={6 * fps} durationInFrames={8 * fps} premountFor={1 * fps}>
        <Stats />
      </Sequence>
      {data.highlights.slice(0, 3).map((post, i) => (
        <Sequence
          key={post.slug}
          from={(14 + i * 7) * fps}
          durationInFrames={7 * fps}
          premountFor={1 * fps}
        >
          <Highlight index={i} title={post.title} source={post.author} />
        </Sequence>
      ))}
      <Sequence from={35 * fps} durationInFrames={14 * fps} premountFor={1 * fps}>
        <Keywords />
      </Sequence>
      <Sequence from={49 * fps} durationInFrames={10 * fps} premountFor={1 * fps}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
