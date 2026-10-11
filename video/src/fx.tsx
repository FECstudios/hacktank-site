import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { COLORS, fontFamily } from "./theme";

/** Film greni: her karede değişen gürültü. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 7;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width="100%" height="100%">
        <filter id={`n${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#n${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Kenarları karartan vinyet. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.85) 100%)",
    }}
  />
);

/** CRT tarama çizgileri. */
export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.18 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.9) 0px, rgba(0,0,0,.9) 2px, transparent 2px, transparent 6px)",
        backgroundPositionY: frame * 2,
      }}
    />
  );
};

/** Beat'te kısa beyaz/kırmızı flaş. */
export const Flash: React.FC<{ at: number; color?: string; strength?: number }> = ({ at, color = COLORS.white, strength = 0.85 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 1, at + 6], [0, strength, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: "none" }} />;
};

/** Belirli karelerde kamerayı sarsar. */
export const useShake = (hits: number[], power = 18, length = 8) => {
  const frame = useCurrentFrame();
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const t = frame - h;
    if (t >= 0 && t < length) {
      const decay = 1 - t / length;
      x += (random(`sx${h}-${t}`) - 0.5) * 2 * power * decay;
      y += (random(`sy${h}-${t}`) - 0.5) * 2 * power * decay;
    }
  }
  return `translate(${x}px, ${y}px)`;
};

/** RGB-split glitch yazı: kırmızı + beyaz katmanlar kayar. */
export const GlitchText: React.FC<{
  children: string;
  size: number;
  color?: string;
  glitch?: number; // 0..1
  seed?: string;
  style?: React.CSSProperties;
}> = ({ children, size, color = COLORS.white, glitch = 0, seed = "g", style }) => {
  const frame = useCurrentFrame();
  const jitter = (k: string) => (random(`${seed}${k}${Math.floor(frame / 2)}`) - 0.5) * 2;
  const off = glitch * 22;
  const slice = glitch > 0.3 && random(`${seed}s${frame}`) > 0.6;
  const base: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily,
    fontSize: size,
    lineHeight: 0.9,
    whiteSpace: "pre",
    textAlign: "center",
    letterSpacing: "-0.01em",
  };
  return (
    <div style={{ position: "relative", width: "100%", height: size * 1.2, ...style }}>
      <div style={{ ...base, color: COLORS.thumb, transform: `translate(${off * jitter("r")}px, ${off * 0.3 * jitter("ry")}px)`, opacity: glitch ? 0.9 : 0, mixBlendMode: "screen" }}>{children}</div>
      <div style={{ ...base, color: COLORS.pink, transform: `translate(${-off * jitter("c")}px, ${off * 0.3 * jitter("cy")}px)`, opacity: glitch ? 0.6 : 0, mixBlendMode: "screen" }}>{children}</div>
      <div
        style={{
          ...base,
          color,
          clipPath: slice ? `inset(${random(`${seed}a${frame}`) * 60}% 0 ${random(`${seed}b${frame}`) * 30}% 0)` : undefined,
          transform: slice ? `translateX(${jitter("x") * 30}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
