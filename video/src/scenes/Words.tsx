import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, b } from "../theme";
import { GlitchText, useShake } from "../fx";

// "YOUR / REPOSTS / SAY / A LOT." — her beat'te bir kelime çarpar.
const WORDS = ["YOUR", "REPOSTS", "SAY", "A LOT."];

export const Words: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = Math.min(WORDS.length - 1, Math.floor(frame / b(1)));
  const local = frame - i * b(1);
  const s = spring({ frame: local, fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [2.4, 1]);
  const glitch = interpolate(local, [0, 6], [1, 0], { extrapolateRight: "clamp" });
  const shake = useShake(WORDS.map((_, k) => k * b(1)), 26, 7);
  const bg = i % 2 === 1 ? COLORS.side : COLORS.bg;

  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `${shake} scale(${scale})`, width: "100%" }}>
        <GlitchText size={i === 1 ? 230 : 300} glitch={glitch} seed={`w${i}`} color={i === 3 ? COLORS.thumb : COLORS.white}>
          {WORDS[i]}
        </GlitchText>
      </div>
    </AbsoluteFill>
  );
};
