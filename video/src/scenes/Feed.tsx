import React from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { COLORS, b, fontFamily } from "../theme";
import { GlitchText, useShake } from "../fx";

// Hızla yukarı akan soyut "video kartları": içerik yok, sadece feed hissi.
const CARD_W = 780;
const CARD_H = 1380;
const GAP = 60;

const Card: React.FC<{ i: number }> = ({ i }) => {
  const hue = random(`h${i}`);
  const top = `hsl(${350 + hue * 15}, 90%, ${10 + hue * 12}%)`;
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 48,
        background: `linear-gradient(160deg, ${top}, #0a0000 70%)`,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 40px 120px rgba(0,0,0,.6)",
      }}
    >
      {/* bulanık "silüet" lekeleri */}
      <div style={{ position: "absolute", left: 120 + random(`x${i}`) * 300, top: 260 + random(`y${i}`) * 400, width: 420, height: 420, borderRadius: "50%", background: COLORS.fill, filter: "blur(90px)", opacity: 0.55 }} />
      <div style={{ position: "absolute", left: 60, top: 900 + random(`z${i}`) * 120, width: 380, height: 28, borderRadius: 14, background: "#ffffff22" }} />
      <div style={{ position: "absolute", left: 60, top: 950 + random(`z${i}`) * 120, width: 240, height: 28, borderRadius: 14, background: "#ffffff16" }} />
      {/* uygulamadaki gibi sağdaki kare butonlar */}
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ position: "absolute", right: 36, bottom: 60 + k * 120, width: 96, height: 96, borderRadius: 26, background: COLORS.btn, opacity: 0.9 }} />
      ))}
    </div>
  );
};

export const Feed: React.FC = () => {
  const frame = useCurrentFrame();
  const total = b(8);
  // yavaş başla, hızlan, ortada "ABOUT YOU." için yavaşla, sonra tekrar fırla
  const progress = interpolate(frame, [0, b(2), b(5), total], [0, 1.4, 1.7, 4.6], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const y = -progress * (CARD_H + GAP);
  const speed = Math.abs(interpolate(frame + 1, [0, b(2), b(5), total], [0, 1.4, 1.7, 4.6], { extrapolateRight: "clamp" }) - progress);
  const blur = Math.min(18, speed * 260);

  const textIn = b(2);
  const textGlitch = interpolate(frame, [textIn, textIn + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [textIn - 1, textIn, b(6.5), b(7)], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = useShake([textIn], 22, 8);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, alignItems: "center" }}>
      <div style={{ transform: `translateY(${y + 270}px) ${shake}`, filter: `blur(${blur}px)`, display: "grid", gap: GAP, paddingTop: 0 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} i={i} />
        ))}
      </div>
      <AbsoluteFill style={{ justifyContent: "center", opacity: textOpacity, background: `rgba(0,0,0,${0.45 * textOpacity})` }}>
        <div style={{ transform: shake }}>
          <GlitchText size={250} glitch={textGlitch} seed="judge">
            {"LET THEM\nJUDGE?"}
          </GlitchText>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 70, width: "100%", textAlign: "center", fontFamily, fontSize: 40, color: "#ffffff88", letterSpacing: "0.3em" }}>
        FOR YOU
      </div>
    </AbsoluteFill>
  );
};
