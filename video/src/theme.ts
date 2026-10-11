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
// "HUMBLE." analizi: 150 BPM (1 beat = 0.4 sn = tam 12 kare), drop 14.32. saniyede.
// Video doğrudan drop'tan başlar ve 12 ölçü (48 beat) sonra ölçü sınırında biter → kusursuz loop.
export const BPM = 150;
export const BEAT = (60 / BPM) * FPS; // 12 kare
export const b = (beats: number) => Math.round(beats * BEAT);
export const AUDIO_FILE = "humble.mp3";
export const AUDIO_START_SEC = 14.32;
