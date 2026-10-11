import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, b } from "../theme";
import { GlitchText, useShake } from "../fx";
import { CommentFlood } from "./Comments";

// HOOK (8 beat = 3.2 sn), video doğrudan DROP'ta başlıyor; mesaj ilk 0.4 saniyede tamamlanır:
//  0    ekran yorumlarla dolu + TIKTOK USERS (fade yok)
//  1    ARE BRAINROTTED. hemen altına çarpar (0.4 sn)
//  3-5  BUT / ARE / YOU   (her beat bir kelime)
//  6    ANY DIFFERENT?    (büyüyerek bir sonraki sahneye)

const Slam: React.FC<{ text: string; at: number; size: number; color?: string; seed: string; from?: number }> = ({
  text, at, size, color = COLORS.white, seed, from = 2.6,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 260, mass: 0.5 } });
  const glitch = interpolate(frame - at, [0, 6], [1, 0.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < at) return null;
  return (
    <div style={{ transform: `scale(${interpolate(s, [0, 1], [from, 1])})`, width: "100%" }}>
      <GlitchText size={size} glitch={glitch} seed={seed} color={color}>{text}</GlitchText>
    </div>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame / b(1);
  const shake = useShake([0, b(1), b(2), b(3), b(4), b(5), b(6)], 24, 6);
  const tension = interpolate(frame, [b(6.5), b(8)], [1, 1.18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bg = beat >= 1 && beat < 3 ? COLORS.side : COLORS.bg;

  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>
      {beat < 3 && (
        <div style={{ position: "absolute", inset: 0, transform: shake }}>
          {/* ilk karede çoğu zaten görünür: appearFrom negatif */}
          <CommentFlood appearFrom={-10} stagger={1} fallAt={b(2)} beatFrames={b(1)} dim={0.85} />
        </div>
      )}

      {beat < 3 && <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,.88) 30%, transparent 70%)" }} />}

      <div style={{ transform: shake, width: "100%" }}>
        {beat < 3 && (
          <>
            <Slam text="TIKTOK USERS" at={0} size={170} seed="users" from={1.6} />
            <Slam text={"ARE\nBRAINROTTED."} at={b(1)} size={170} color={COLORS.thumb} seed="rot" from={1.5} />
          </>
        )}
        {beat >= 3 && beat < 4 && <Slam text="BUT" at={b(3)} size={340} seed="but" />}
        {beat >= 4 && beat < 5 && <Slam text="ARE" at={b(4)} size={340} seed="are" />}
        {beat >= 5 && beat < 6 && <Slam text="YOU" at={b(5)} size={360} color={COLORS.thumb} seed="you" />}
        {beat >= 6 && (
          <div style={{ transform: `scale(${tension})` }}>
            <Slam text={"ANY\nDIFFERENT?"} at={b(6)} size={185} seed="diff" />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
