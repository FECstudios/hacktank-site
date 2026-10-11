import React from "react";
import { Composition } from "remotion";
import { Teaser, TOTAL_BEATS, type TeaserProps } from "./Teaser";
import { AUDIO_FILE, AUDIO_FIRST_BEAT_SEC, FPS, b } from "./theme";

export const Root: React.FC = () => (
  <Composition
    id="Teaser"
    component={Teaser}
    durationInFrames={b(TOTAL_BEATS)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ audio: AUDIO_FILE, audioStartSec: AUDIO_FIRST_BEAT_SEC } satisfies TeaserProps}
  />
);
