import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fontFamily } from "../theme";

// Beyin çürüten yorum balonları. Hem açılışta hem loop için finalde kullanılıyor.
export const COMMENTS = [
  { u: "@xx_lil_d", t: "who asked" },
  { u: "@user8812", t: "ratio" },
  { u: "@brainrot.exe", t: "skull skull skull" },
  { u: "@n0name", t: "first" },
  { u: "@sigma.grindset", t: "this is so real" },
  { u: "@kaiii", t: "L + bozo" },
  { u: "@just.vibes", t: "fr fr no cap" },
  { u: "@anon_0", t: "erm what the sigma" },
  { u: "@mewing.king", t: "mogged" },
  { u: "@ohio.final.boss", t: "only in ohio" },
  { u: "@gyattt", t: "rizzler" },
  { u: "@npc_404", t: "real" },
  { u: "@delulu", t: "its giving" },
  { u: "@zzz", t: "bro thinks hes him" },
];

// Ekranı dolduran sabit "rastgele" yerleşim (her seferinde aynı → loop'ta ilk ve son kare eşleşir)
const pos = (i: number) => ({
  x: 40 + random(`px${i}`) * 560,
  y: 80 + ((i * 131) % 1700) + (random(`py${i}`) - 0.5) * 80,
  rot: (random(`pr${i}`) - 0.5) * 14,
  scale: 0.85 + random(`ps${i}`) * 0.5,
});

export const CommentFlood: React.FC<{
  /** balonların belirmeye başladığı kare (negatif = ilk karede zaten görünür) */
  appearFrom: number;
  /** balonlar arası gecikme (kare) */
  stagger?: number;
  /** bu kareden sonra balonlar dağılıp düşer */
  fallAt?: number;
  /** beat başına "nabız" */
  beatFrames?: number;
  dim?: number;
}> = ({ appearFrom, stagger = 1, fallAt = Infinity, beatFrames = 12, dim = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = 1 + 0.06 * Math.max(0, 1 - (frame % beatFrames) / 5);
  return (
    <AbsoluteFill style={{ opacity: dim }}>
      {COMMENTS.map((c, i) => {
        const p = pos(i);
        const at = appearFrom + i * stagger;
        const pop = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 260 } });
        const fall = Math.max(0, frame - fallAt - (i % 4));
        const drift = Math.sin((frame + i * 17) / 9) * 10;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y + fall * fall * 1.4 + drift,
              transform: `rotate(${p.rot + fall * (i % 2 ? 3 : -3)}deg) scale(${pop * p.scale * pulse})`,
              opacity: frame < at ? 0 : interpolate(fall, [0, 10], [1, 0], { extrapolateRight: "clamp" }),
              background: "#151515",
              border: `2px solid ${i % 5 === 0 ? COLORS.btn : "#2a2a2a"}`,
              borderRadius: 40,
              padding: "16px 28px",
              fontFamily,
              color: COLORS.white,
              whiteSpace: "nowrap",
              boxShadow: "0 20px 60px rgba(0,0,0,.7)",
            }}
          >
            <div style={{ fontSize: 28, color: "#888" }}>{c.u}</div>
            <div style={{ fontSize: 50 }}>{c.t}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
