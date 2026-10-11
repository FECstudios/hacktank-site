import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, b, fontFamily } from "../theme";
import { GlitchText, useShake } from "../fx";

// "tiq." logosu ekrana çarpar, sonra "soon." ve HackTank kartı.
export const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 9, stiffness: 180, mass: 0.9 } });
  const scale = interpolate(slam, [0, 1], [4, 1]);
  const glitch = interpolate(frame, [0, 14, b(2), b(2) + 2, b(2) + 8], [1, 0.08, 0.08, 0.9, 0.05], { extrapolateRight: "clamp" });
  const shake = useShake([0, b(2)], 34, 10);

  const tagAt = b(3);
  const tag = interpolate(frame, [tagAt, tagAt + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const soonAt = b(5);
  const soon = spring({ frame: frame - soonAt, fps, config: { damping: 14 } });
  const footer = interpolate(frame, [b(6), b(6.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoUp = interpolate(tag, [0, 1], [0, -260]);

  // arkadaki nabız gibi atan kırmızı ışık
  const pulse = interpolate(frame % b(1), [0, b(1)], [1, 0.35]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 48%, ${COLORS.btn} 0%, ${COLORS.side} 35%, #000 70%)`,
          opacity: 0.6 + 0.4 * pulse,
        }}
      />
      <div style={{ transform: `${shake} translateY(${logoUp}px) scale(${scale})`, width: "100%" }}>
        <GlitchText size={560} glitch={glitch} seed="logo" color={COLORS.thumb}>tiq.</GlitchText>
      </div>

      <div
        style={{
          position: "absolute",
          top: 980,
          width: "100%",
          textAlign: "center",
          fontFamily,
          fontSize: 70,
          lineHeight: 1.15,
          color: "#ffffffcc",
          opacity: tag,
          transform: `translateY(${(1 - tag) * 40}px)`,
          whiteSpace: "pre",
        }}
      >
        {"separating the good apples\nfrom the bad ones."}
      </div>

      <div
        style={{
          position: "absolute",
          top: 1260,
          width: "100%",
          textAlign: "center",
          fontFamily,
          fontSize: 150,
          color: COLORS.white,
          opacity: soon,
          transform: `translateY(${(1 - soon) * 60}px)`,
          letterSpacing: "0.05em",
        }}
      >
        soon.
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          textAlign: "center",
          fontFamily,
          fontSize: 44,
          color: COLORS.pink,
          opacity: footer * 0.85,
          letterSpacing: "0.12em",
        }}
      >
        built for HackTank · a Hack Club program
      </div>
    </AbsoluteFill>
  );
};
