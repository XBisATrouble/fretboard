export type KeySignature = "natural" | "one-sharp" | "two-sharps";

export const KEY_SIGNATURES: Record<KeySignature, {
  label: string;
  tonalities: string;
  ariaLabel: string;
  sharps: string[];
}> = {
  natural: {
    label: "无升降号",
    tonalities: "C 大调 / a 小调",
    ariaLabel: "无升降号调号",
    sharps: [],
  },
  "one-sharp": {
    label: "1♯",
    tonalities: "G 大调 / e 小调",
    ariaLabel: "一个升号，升 F",
    sharps: ["F#"],
  },
  "two-sharps": {
    label: "2♯",
    tonalities: "D 大调 / b 小调",
    ariaLabel: "两个升号，升 F、升 C",
    sharps: ["F#", "C#"],
  },
};

export const KEY_SIGNATURE_FILTERS = (Object.entries(KEY_SIGNATURES) as [KeySignature, typeof KEY_SIGNATURES[KeySignature]][])
  .map(([id, signature]) => ({ id, ...signature }));

export function keySignatureIncludes(note: string, keySignature?: KeySignature) {
  if (!keySignature) return false;
  const pitch = note.slice(0, -1);
  return KEY_SIGNATURES[keySignature].sharps.includes(pitch);
}
