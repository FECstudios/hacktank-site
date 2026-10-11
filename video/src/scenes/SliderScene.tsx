import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, b, fontFamily } from "../theme";
import { GlitchText, useShake } from "../fx";

// Uygulamadaki tahmin slider'ı: "GUESS / THEIRS." ve 0→167'ye kayan tutamak.
const TRACK_W = 900;
const TRACK_H = 110;

export const SliderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const word2 = b(2);
  const shake = useShake([0, word2], 22, 7);

  const s1 = spring({ frame, fps, config: { damping: 12, stiffness: 220 } });
  const s2 = spring({ frame: frame - word2, fps, config: { damping: 12, stiffness: 220 } });
  const g1 = interpolate(frame, [0, 6], [1, 0], { extrapolateRight: "clamp" });
  const g2 = interpolate(frame - word2, [0, 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // tutamak: kararsız gidip gelir, sonra 167'ye oturur
  const p = interpolate(frame, [b(2.5), b(3.5), b(4.5), b(5.5), b(7)], [0.5, 0.2, 0.9, 0.78, 0.835], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const value = Math.round(p * 200);
  const trackIn = spring({ frame: frame - b(2), fps, config: { damping: 14 } });
  const thumbX = p * (TRACK_W - TRACK_H);
  const settle = spring({ frame: frame - b(7), fps, config: { damping: 8, stiffness: 300 } });
  const thumbScale = frame >= b(7) ? interpolate(settle, [0, 1], [1.35, 1]) : 1;

  return (
    <AbsoluteFill style={{ background: COLORS.bg, alignItems: "center", justifyContent: "center", gap: 0 }}>
      <div style={{ transform: shake, width: "100%", marginTop: -200 }}>
        <div style={{ transform: `scale(${interpolate(s1, [0, 1], [2.2, 1])})` }}>
          <GlitchText size={260} glitch={g1} seed="guess">GUESS</GlitchText>
        </div>
        <div style={{ transform: `scale(${interpolate(s2, [0, 1], [2.2, 1])})`, opacity: frame >= word2 ? 1 : 0 }}>
          <GlitchText size={260} glitch={g2} seed="theirs" color={COLORS.thumb}>THEIRS.</GlitchText>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1320,
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: 200,
          background: COLORS.btn,
          overflow: "visible",
          opacity: trackIn,
          transform: `translateY(${(1 - trackIn) * 120}px)`,
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: thumbX + TRACK_H / 2, borderRadius: 200, background: COLORS.fill }} />
        <div
          style={{
            position: "absolute",
            left: thumbX,
            top: 0,
            width: TRACK_H,
            height: TRACK_H,
            borderRadius: "50%",
            background: COLORS.thumb,
            boxShadow: `0 0 60px ${COLORS.thumb}`,
            display: "grid",
            placeItems: "center",
            fontFamily,
            fontSize: 52,
            color: COLORS.white,
            transform: `scale(${thumbScale})`,
          }}
        >
          {value}
        </div>
        <div style={{ position: "absolute", top: TRACK_H + 16, left: 30, fontFamily, fontSize: 44, color: "#ffffffaa" }}>0</div>
        <div style={{ position: "absolute", top: TRACK_H + 16, right: 30, fontFamily, fontSize: 44, color: "#ffffffaa" }}>200</div>
      </div>
    </AbsoluteFill>
  );
};
