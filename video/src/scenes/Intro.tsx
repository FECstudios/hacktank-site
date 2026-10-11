import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, b, fontFamily } from "../theme";
import { GlitchText, useShake } from "../fx";

// Sakin giriş (12 beat, drop'a kadar):
//  0-2  "the comments section"   (daktilo)
//  2-4  beyin çürüten yorumlar uçuşur
//  4-6  IS COOKED.               (çarpma)
//  6-8  "but your reposts"       (daktilo)
//  8-10 SAY / A LOT              (beat başına çarpma)
// 10-12 ABOUT YOU.               (gerilim, drop'a yaklaşırken büyür)

const COMMENTS = [
  { u: "@xx_lil_d", t: "who asked" },
  { u: "@user8812", t: "ratio" },
  { u: "@brainrot.exe", t: "skull skull skull" },
  { u: "@n0name", t: "first" },
  { u: "@sigma.grindset", t: "this is so real" },
  { u: "@kaiii", t: "L + bozo" },
  { u: "@just.vibes", t: "fr fr no cap" },
  { u: "@anon_0", t: "erm what the sigma" },
];

const Typewriter: React.FC<{ text: string; from: number; dur: number }> = ({ text, from, dur }) => {
  const frame = useCurrentFrame();
  const n = Math.floor(interpolate(frame, [from, from + dur * 0.75], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const caret = Math.floor(frame / 8) % 2 === 0 ? "▍" : " ";
  return (
    <div style={{ fontFamily, fontSize: 120, color: COLORS.white, textAlign: "center", width: "100%", letterSpacing: "0.02em" }}>
      {text.slice(0, n)}
      <span style={{ color: COLORS.thumb }}>{caret}</span>
    </div>
  );
};

const Chip: React.FC<{ i: number; at: number; fallAt: number }> = ({ i, at, fallAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = COMMENTS[i];
  const pop = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 200 } });
  const fall = Math.max(0, frame - fallAt);
  const x = 80 + random(`cx${i}`) * 520;
  const y = 260 + i * 175 + (random(`cy${i}`) - 0.5) * 60;
  const rot = (random(`cr${i}`) - 0.5) * 10;
  const drift = Math.sin((frame + i * 13) / 14) * 8;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + fall * fall * 0.9 + drift,
        transform: `rotate(${rot + fall * (i % 2 ? 2 : -2)}deg) scale(${pop})`,
        opacity: frame < at ? 0 : interpolate(fall, [0, 14], [1, 0], { extrapolateRight: "clamp" }),
        background: "#1a1a1a",
        border: "2px solid #2a2a2a",
        borderRadius: 40,
        padding: "18px 30px",
        fontFamily,
        color: COLORS.white,
        whiteSpace: "nowrap",
        boxShadow: "0 20px 60px rgba(0,0,0,.6)",
      }}
    >
      <div style={{ fontSize: 30, color: "#888" }}>{c.u}</div>
      <div style={{ fontSize: 52 }}>{c.t}</div>
    </div>
  );
};

const Slam: React.FC<{ text: string; at: number; size: number; color?: string; seed: string }> = ({ text, at, size, color = COLORS.white, seed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  const glitch = interpolate(frame - at, [0, 7], [1, 0.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ transform: `scale(${interpolate(s, [0, 1], [2.4, 1])})`, width: "100%" }}>
      <GlitchText size={size} glitch={glitch} seed={seed} color={color}>{text}</GlitchText>
    </div>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame / b(1);
  const shake = useShake([b(4), b(8), b(9), b(10)], 26, 8);

  // ABOUT YOU. drop'a doğru yavaşça büyür
  const tension = interpolate(frame, [b(10), b(12)], [1, 1.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bg = beat >= 4 && beat < 6 ? COLORS.side : COLORS.bg;

  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>
      {beat < 6 && (
        <AbsoluteFill style={{ filter: beat >= 4 ? "blur(6px)" : undefined, opacity: beat >= 4 ? 0.5 : 1 }}>
          {COMMENTS.map((_, i) => (
            <Chip key={i} i={i} at={b(2) + Math.round(i * b(0.25))} fallAt={b(4)} />
          ))}
        </AbsoluteFill>
      )}

      <div style={{ transform: shake, width: "100%" }}>
        {beat < 2 && <Typewriter text="the comments section" from={0} dur={b(2)} />}
        {beat >= 2 && beat < 4 && (
          <div style={{ position: "absolute", top: 110, left: 0, right: 0, fontFamily, fontSize: 80, color: "#ffffff66", textAlign: "center" }}>the comments section</div>
        )}
        {beat >= 4 && beat < 6 && <Slam text={"IS\nCOOKED."} at={b(4)} size={300} color={COLORS.thumb} seed="cooked" />}
        {beat >= 6 && beat < 8 && <Typewriter text="but your reposts" from={b(6)} dur={b(2)} />}
        {beat >= 8 && beat < 9 && <Slam text="SAY" at={b(8)} size={320} seed="say" />}
        {beat >= 9 && beat < 10 && <Slam text="A LOT" at={b(9)} size={320} seed="alot" />}
        {beat >= 10 && (
          <div style={{ transform: `scale(${tension})` }}>
            <Slam text={"ABOUT\nYOU."} at={b(10)} size={300} color={COLORS.white} seed="about" />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
