import { loadFont } from "@remotion/google-fonts/SquadaOne";

export const { fontFamily } = loadFont();

export const COLORS = {
  bg: "#000000",
  side: "#230000",
  btn: "#6F0000",
  btn2: "#820000",
  fill: "#B90000",
  thumb: "#D00000",
  pink: "#FF9F9F",
  white: "#FFFFFF",
};

export const FPS = 30;
// Müzik gelince sadece BPM'i değiştir: bütün kesmeler beat'e göre hesaplanıyor.
export const BPM = 120;
export const BEAT = Math.round((60 / BPM) * FPS); // 120 BPM → 15 kare
export const b = (beats: number) => Math.round(beats * BEAT);
