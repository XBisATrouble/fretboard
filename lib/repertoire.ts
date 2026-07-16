export type LibraryPiece = {
  id: string;
  title: string;
  composer: string;
  level: string;
  focus: string;
  key: string;
  keySignature?: "G";
  systems: string[][];
};

export const LIBRARY_PIECES: LibraryPiece[] = [
  {
    id: "twinkle",
    title: "小星星",
    composer: "法国民歌 · 莫扎特变奏曲主题",
    level: "01 · 级进与重复音",
    focus: "C 大调 · 只用高音谱号",
    key: "C 大调",
    systems: [
      ["C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4"],
      ["G4","G4","F4","F4","E4","E4","D4","G4","G4","F4","F4","E4","E4","D4"],
      ["C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4"],
    ],
  },
  {
    id: "ode-to-joy",
    title: "欢乐颂",
    composer: "贝多芬",
    level: "02 · 级进与回归",
    focus: "C 大调 · 读谱中的方向感",
    key: "C 大调",
    systems: [
      ["E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","E4","D4","D4"],
      ["E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","D4","C4","C4"],
      ["D4","D4","E4","C4","D4","E4","F4","E4","C4","D4","E4","F4","E4","D4","C4","D4"],
      ["G4","G4","F4","E4","D4","C4","D4","E4","D4","C4","C4"],
    ],
  },
  {
    id: "minuet-g",
    title: "G 大调小步舞曲",
    composer: "巴赫（归属存疑）",
    level: "03 · 跳进与 F♯",
    focus: "G 大调 · 第一处调号体验",
    key: "G 大调",
    keySignature: "G",
    systems: [
      ["D4","G4","A4","B4","C5","D5","D5","D5","E5","D5","C5","B4","A4","G4","G4","G4"],
      ["C5","B4","A4","G4","F#4","G4","A4","B4","A4","G4","G4","G4","D5","C5","B4","A4"],
      ["B4","C5","D5","C5","B4","A4","G4","F#4","G4","A4","B4","A4","G4","F#4","E4","D4"],
      ["D4","G4","A4","B4","C5","D5","D5","D5","E5","D5","C5","B4","A4","G4","G4","G4"],
    ],
  },
  {
    id: "fur-elise",
    title: "致爱丽丝 · 开篇主题",
    composer: "贝多芬",
    level: "04 · 临时升降号",
    focus: "a 小调 · 辨认 D♯ 与跳进",
    key: "a 小调",
    systems: [
      ["E5","D#5","E5","D#5","E5","B4","D5","C5","A4","C4","E4","A4","B4"],
      ["E4","G#4","B4","C5","E4","E5","D#5","E5","D#5","E5","B4","D5","C5"],
      ["A4","C4","E4","A4","B4","E4","C5","B4","A4","E4","G#4","A4","B4","C5"],
      ["D5","E5","F5","E5","D5","C5","B4","A4","G#4","E5","D#5","E5","D#5","E5"],
    ],
  },
];

export function getPiece(id: string) {
  return LIBRARY_PIECES.find((piece) => piece.id === id);
}
