import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, b, fontFamily } from "../theme";
import { GlitchText, useShake } from "../fx";

// Dev bir IQ sayısı çılgınca döner, sonra "???" olarak kilitlenir.
export const IqScramble: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lockAt = b(4.5);
  const locked = frame >= lockAt;
  const n = Math.floor(random(`iq${Math.floor(frame / 2)}`) * 200);
  const hits = [0, b(1), b(2), b(3), lockAt];
  const shake = useShake(hits, 20, 7);

  const beatLocal = frame % b(1);
  const pulse = interpolate(beatLocal, [0, 6], [1.12, 1], { extrapolateRight: "clamp" });
  const lockSpring = spring({ frame: frame - lockAt, fps, config: { damping: 10, stiffness: 260 } });
  const scale = locked ? interpolate(lockSpring, [0, 1], [1.8, 1]) : pulse;
  const glitch = locked ? interpolate(frame - lockAt, [0, 10], [1, 0.05], { extrapolateRight: "clamp" }) : 0.25;

  const labelIn = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ background: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
      {/* arkada dönen dev halka */}
      <div
        style={{
          position: "absolute",
          width: 1300,
          height: 1300,
          borderRadius: "50%",
          border: `40px solid ${COLORS.side}`,
          borderTopColor: COLORS.btn,
          transform: `rotate(${frame * 6}deg) scale(${locked ? 1.15 : 1})`,
        }}
      />
      <div style={{ transform: shake, width: "100%" }}>
        <div style={{ textAlign: "center", fontFamily, fontSize: 90, color: COLORS.pink, letterSpacing: "0.4em", marginBottom: 20, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 40}px)` }}>
          IQ
        </div>
        <div style={{ transform: `scale(${scale})` }}>
          <GlitchText size={520} glitch={glitch} seed="iq" color={locked ? COLORS.thumb : COLORS.white}>
            {locked ? "???" : String(n).padStart(3, "0")}
          </GlitchText>
        </div>
      </div>
    </AbsoluteFill>
  );
};
