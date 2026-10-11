import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, b } from "../theme";
import { GlitchText, useShake } from "../fx";
import { CommentFlood } from "./Comments";

// HOOK (16 beat = 6.4 sn), video doğrudan DROP'ta başlıyor:
//  0     ilk karede ekran yorumlarla dolu + TIKTOK USERS dev gibi çarpar (fade yok)
//  4     ARE BRAINROTTED.  (kırmızı, yorumlar düşer)
//  8-10  BUT / ARE / YOU   (her beat bir kelime)
// 12     ANY DIFFERENT?    (büyüyerek bir sonraki sahneye)

const Slam: React.FC<{ text: string; at: number; size: number; color?: string; seed: string; from?: number }> = ({
  text, at, size, color = COLORS.white, seed, from = 2.6,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 240, mass: 0.55 } });
  const glitch = interpolate(frame - at, [0, 6], [1, 0.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ transform: `scale(${interpolate(s, [0, 1], [from, 1])})`, width: "100%" }}>
      <GlitchText size={size} glitch={glitch} seed={seed} color={color}>{text}</GlitchText>
    </div>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame / b(1);
  // her beat'te sarsıntı (ilk 4 beat), sonra kelime vuruşlarında
  const shake = useShake([0, b(1), b(2), b(3), b(4), b(8), b(9), b(10), b(12)], 24, 6);
  const tension = interpolate(frame, [b(12.5), b(16)], [1, 1.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bg = beat >= 4 && beat < 8 ? COLORS.side : COLORS.bg;

  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>
      {beat < 8 && (
        <div style={{ position: "absolute", inset: 0, transform: shake, filter: beat >= 4 ? "blur(5px)" : undefined }}>
          {/* ilk karede çoğu zaten görünür: appearFrom negatif */}
          <CommentFlood appearFrom={-10} stagger={1} fallAt={b(4)} beatFrames={b(1)} dim={beat >= 4 ? 0.45 : 0.9} />
        </div>
      )}

      {/* yazıyı yorumlardan ayıran koyu leke */}
      {beat < 4 && <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,.85) 25%, transparent 65%)" }} />}

      <div style={{ transform: shake, width: "100%" }}>
        {beat < 4 && <Slam text={"TIKTOK\nUSERS"} at={0} size={290} seed="users" from={1.6} />}
        {beat >= 4 && beat < 8 && <Slam text={"ARE\nBRAINROTTED."} at={b(4)} size={190} color={COLORS.thumb} seed="rot" />}
        {beat >= 8 && beat < 9 && <Slam text="BUT" at={b(8)} size={340} seed="but" />}
        {beat >= 9 && beat < 10 && <Slam text="ARE" at={b(9)} size={340} seed="are" />}
        {beat >= 10 && beat < 12 && <Slam text="YOU" at={b(10)} size={360} color={COLORS.thumb} seed="you" />}
        {beat >= 12 && (
          <div style={{ transform: `scale(${tension})` }}>
            <Slam text={"ANY\nDIFFERENT?"} at={b(12)} size={185} seed="diff" />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
