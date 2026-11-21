import { Composition } from "remotion";
import { WeeklyDigest } from "./WeeklyDigest";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WeeklyDigest"
        component={WeeklyDigest}
        durationInFrames={59 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
