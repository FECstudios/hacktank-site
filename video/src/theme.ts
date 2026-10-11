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
// "HIGHS AND LOWS" analizi: ~95 BPM, ilk beat 0.035 sn, drop 12. beatte (≈7.6 sn).
export const BPM = 95;
export const BEAT = (60 / BPM) * FPS; // ≈18.95 kare (kesirli: kayma birikmesin diye)
export const b = (beats: number) => Math.round(beats * BEAT);
export const AUDIO_FILE = "highs-and-lows.mp3";
export const AUDIO_FIRST_BEAT_SEC = 0.035;
