import type { KeySignature } from "./key-signatures";

export type LibraryPiece = {
  id: string;
  title: string;
  composer: string;
  level: string;
  focus: string;
  key: string;
  keySignature: KeySignature;
  formLabel?: string;
  systems: string[][];
};

export const LIBRARY_PIECES: LibraryPiece[] = [
  {
    id: "mary-had-a-little-lamb",
    title: "玛丽有只小羊羔",
    composer: "美国童谣",
    level: "01 · 三音入门",
    focus: "C 大调 · 三音位置与重复音",
    key: "C 大调",
    keySignature: "natural",
    formLabel: "完整旋律",
    systems: [
      ["E4","D4","C4","D4","E4","E4","E4"],
      ["D4","D4","D4","E4","G4","G4"],
      ["E4","D4","C4","D4","E4","E4","E4","E4"],
      ["D4","D4","E4","D4","C4"],
    ],
  },
  {
    id: "frere-jacques",
    title: "两只老虎（Frère Jacques）",
    composer: "法国童谣 · Frère Jacques",
    level: "02 · 模进与低音",
    focus: "C 大调 · 重复乐句与低音加线",
    key: "C 大调",
    keySignature: "natural",
    formLabel: "完整旋律",
    systems: [
      ["C4","D4","E4","C4","C4","D4","E4","C4"],
      ["E4","F4","G4","E4","F4","G4"],
      ["G4","A4","G4","F4","E4","C4","G4","A4","G4","F4","E4","C4"],
      ["C4","G3","C4","C4","G3","C4"],
    ],
  },
  {
    id: "twinkle",
    title: "小星星",
    composer: "法国民歌 · 莫扎特变奏曲主题",
    level: "03 · 五度跳进",
    focus: "C 大调 · 莫扎特 K.265 主题原谱音区",
    key: "C 大调",
    keySignature: "natural",
    formLabel: "完整旋律",
    systems: [
      ["C5","C5","G5","G5","A5","A5","G5","F5","F5","E5","E5","D5","D5","C5"],
      ["G5","G5","F5","F5","E5","E5","D5","G5","G5","F5","F5","E5","E5","D5"],
      ["C5","C5","G5","G5","A5","A5","G5","F5","F5","E5","E5","D5","D5","C5"],
    ],
  },
  {
    id: "au-clair-de-la-lune",
    title: "月光下（Au clair de la lune）",
    composer: "法国童谣 · Au clair de la lune",
    level: "04 · 向下扩展",
    focus: "C 大调 · 读到 G3 的低音加线",
    key: "C 大调",
    keySignature: "natural",
    formLabel: "完整旋律",
    systems: [
      ["C4","C4","C4","D4","E4","D4","C4","E4","D4","D4","C4"],
      ["C4","C4","C4","D4","E4","D4","C4","E4","D4","D4","C4"],
      ["D4","D4","D4","D4","A3","A3","D4","C4","B3","A3","G3"],
      ["C4","C4","C4","D4","E4","D4","C4","E4","D4","D4","C4"],
    ],
  },
  {
    id: "ode-to-joy",
    title: "欢乐颂",
    composer: "贝多芬",
    level: "05 · 级进与回归",
    focus: "D 大调 · 原谱主题音区与两升号调号",
    key: "D 大调",
    keySignature: "two-sharps",
    formLabel: "主题旋律",
    systems: [
      ["F#5","F#5","G5","A5","A5","G5","F#5","E5","D5","D5","E5","F#5","F#5","E5","E5"],
      ["F#5","F#5","G5","A5","A5","G5","F#5","E5","D5","D5","E5","F#5","E5","D5","D5"],
      ["E5","E5","F#5","D5","E5","F#5","G5","F#5","D5","E5","F#5","G5","F#5","E5","D5","E5"],
      ["A5","A5","G5","F#5","E5","D5","E5","F#5","E5","D5","D5"],
    ],
  },
  {
    id: "minuet-g",
    title: "G 大调小步舞曲",
    composer: "克里斯蒂安·佩措尔德",
    level: "06 · 原谱右手与 F♯",
    focus: "G 大调 · 完整右手主声部（省略装饰音）",
    key: "G 大调",
    keySignature: "one-sharp",
    formLabel: "完整右手旋律",
    systems: [
      ["D5","G4","A4","B4","C5","D5","G4","G4","E5","C5","D5","E5","F#5","G5","G4","G4"],
      ["C5","D5","C5","B4","A4","B4","C5","B4","A4","G4","F#4","G4","A4","B4","G4","A4"],
      ["D5","G4","A4","B4","C5","D5","G4","G4","E5","C5","D5","E5","F#5","G5","G4","G4"],
      ["C5","D5","C5","B4","A4","B4","C5","B4","A4","G4","A4","B4","A4","G4","F#4","G4"],
      ["B5","G5","A5","B5","G5","A5","D5","E5","F#5","D5","G5","E5","F#5","G5","D5","C#5","B4","C#5","A4"],
      ["A4","B4","C#5","D5","E5","F#5","G5","F#5","E5","F#5","A4","C#5","D5"],
      ["D5","G4","F#4","G4","E5","G4","F#4","G4","D5","C5","B4","A4","G4","F#4","G4","A4"],
      ["D4","E4","F#4","G4","A4","B4","C5","B4","A4","B4","D5","G4","F#4","G4"],
    ],
  },
  {
    id: "greensleeves",
    title: "绿袖子",
    composer: "英格兰传统民谣",
    level: "07 · 小调与临时记号",
    focus: "e 小调 · 传统常用调与临时升号",
    key: "e 小调",
    keySignature: "one-sharp",
    formLabel: "完整旋律",
    systems: [
      ["E4","G4","A4","B4","C5","B4","A4","F#4","D4","E4","F#4","G4","E4","E4","D#4","E4","F#4","D#4"],
      ["B3","E4","G4","A4","B4","C5","D5","A4","F#4","D4","D4","E4","F#4","G4","F#4","E4","D#4","C#4","D#4","E4"],
      ["E4","D5","D5","C#5","B4","A4","F#4","D4","E4","F#4","G4","E4","E4","D#4","E4","F#4","D#4"],
      ["B3","D5","D5","C#5","B4","A4","F#4","D4","D4","E4","F#4","G4","F#4","E4","D#4","C#4","D#4","E4","E4"],
    ],
  },
  {
    id: "fur-elise",
    title: "致爱丽丝 · 开篇主题",
    composer: "贝多芬",
    level: "08 · 临时升降号",
    focus: "a 小调 · 原谱开篇 A 段与 D♯",
    key: "a 小调",
    keySignature: "natural",
    formLabel: "开篇 A 段",
    systems: [
      ["E5","D#5","E5","D#5","E5","B4","D5","C5","A4","C4","E4","A4","B4"],
      ["E4","G#4","B4","C5","E4","E5","D#5","E5","D#5","E5","B4","D5","C5"],
      ["A4","C4","E4","A4","B4","E4","C5","B4","A4"],
    ],
  },
  {
    id: "mozart-k545-theme",
    title: "C 大调奏鸣曲 K.545 · 第一主题",
    composer: "莫扎特",
    level: "09 · 音阶与长距离移动",
    focus: "C 大调 · 连续音阶与高音加线",
    key: "C 大调",
    keySignature: "natural",
    formLabel: "主题节选",
    systems: [
      ["C5","E5","G5","B4","C5","D5","C5","A5","G5","C6","G5","F5","E5","F5","E5"],
      ["A4","B4","C5","D5","E5","F5","G5","A5","G5","F5","E5","D5","C5","B4","A4"],
      ["G4","A4","B4","C5","D5","E5","F5","G5","F5","E5","D5","C5","B4","A4","G4"],
      ["F4","G4","A4","B4","C5","D5","E5","F5","E5","D5","C5","B4","A4","G4","F4"],
      ["E4","F4","G4","A4","B4","C5","D5","E5","D5","C5","B4","A4","G4","F4","E4"],
    ],
  },
  {
    id: "bach-c-major-prelude-pattern",
    title: "C 大调前奏曲 BWV 846 · 右手音型",
    composer: "约翰·塞巴斯蒂安·巴赫",
    level: "10 · 分解和弦音型",
    focus: "C 大调 · 和弦轮廓与重复音型",
    key: "C 大调",
    keySignature: "natural",
    formLabel: "音型节选",
    systems: [
      ["G4","C5","E5","G4","C5","E5","G4","C5","E5","G4","C5","E5"],
      ["A4","D5","F5","A4","D5","F5","A4","D5","F5","A4","D5","F5"],
      ["G4","D5","F5","G4","D5","F5","G4","D5","F5","G4","D5","F5"],
      ["G4","C5","E5","G4","C5","E5","G4","C5","E5","G4","C5","E5"],
      ["A4","E5","A5","A4","E5","A5","A4","E5","A5","A4","E5","A5"],
      ["F#4","A4","D5","F#4","A4","D5","F#4","A4","D5","F#4","A4","D5"],
      ["G4","D5","G5","G4","D5","G5","G4","D5","G5","G4","D5","G5"],
      ["E4","G4","C5","E4","G4","C5","E4","G4","C5","E4","G4","C5"],
    ],
  },
];

export function getPiece(id: string) {
  return LIBRARY_PIECES.find((piece) => piece.id === id);
}
