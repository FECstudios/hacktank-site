import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { COLORS, FPS, b } from "./theme";
import { Flash, Grain, Scanlines, Vignette } from "./fx";
import { Intro } from "./scenes/Intro";
import { Feed } from "./scenes/Feed";
import { IqScramble } from "./scenes/IqScramble";
import { SliderScene } from "./scenes/SliderScene";
import { Logo } from "./scenes/Logo";

// Sahne uzunlukları beat cinsinden (theme.ts'deki BPM'e göre karelere çevrilir).
export const SCENES = [
  { name: "Hook", beats: 8, C: Intro },   // DROP'ta başlar
  { name: "Feed", beats: 8, C: Feed },
  { name: "IQ", beats: 8, C: IqScramble },
  { name: "Slider", beats: 8, C: SliderScene },
  { name: "Logo", beats: 8, C: Logo },     // son 2 beat ilk kareye bağlanır (loop)
];
export const TOTAL_BEATS = SCENES.reduce((s, x) => s + x.beats, 0);

export type TeaserProps = {
  /** public/ klasöründeki ses dosyası, örn. "audio.mp3". Boşsa sessiz. */
  audio: string;
  /** Sesin kaçıncı saniyesinden başlansın (drop'a denk getirmek için). */
  audioStartSec: number;
};

export const Teaser: React.FC<TeaserProps> = ({ audio, audioStartSec }) => {
  const { durationInFrames } = useVideoConfig();
  let start = 0;
  const cuts: number[] = [];
  const seqs = SCENES.map(({ name, beats, C }) => {
    const from = b(start);
    start += beats;
    cuts.push(from);
    return (
      <Sequence key={name} name={name} from={from} durationInFrames={b(beats)}>
        <C />
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {audio ? (
        <Audio
          src={staticFile(audio)}
          startFrom={Math.round(audioStartSec * FPS)}
          // fade yok: video ölçü sınırında biter, başa sarınca ritim kopmaz (loop)
        />
      ) : null}
      {seqs}
      {cuts.slice(1).map((c) => (
        <Flash key={c} at={c} color={c === cuts[4] ? COLORS.thumb : COLORS.white} strength={0.75} />
      ))}
      <Scanlines />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
