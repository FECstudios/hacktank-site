import React from "react";
import { Composition } from "remotion";
import { Teaser, TOTAL_BEATS, type TeaserProps } from "./Teaser";
import { FPS, b } from "./theme";

export const Root: React.FC = () => (
  <Composition
    id="Teaser"
    component={Teaser}
    durationInFrames={b(TOTAL_BEATS)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ audio: "", audioStartSec: 0 } satisfies TeaserProps}
  />
);
