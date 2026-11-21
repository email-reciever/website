import { Composition } from "remotion";
import timing from "./media-timing.json";
import { WeeklyDigest } from "./WeeklyDigest";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WeeklyDigest"
      component={WeeklyDigest}
      durationInFrames={Math.ceil((timing.durationMs / 1000) * timing.fps)}
      fps={timing.fps}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};
