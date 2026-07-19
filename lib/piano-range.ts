export const PIANO_RANGE_LABEL = "F3–C6";
export const LOWEST_MIDI_NOTE = 53; // F3
export const HIGHEST_MIDI_NOTE = 84; // C6

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const COMPUTER_KEYS = [
  "z", "s", "x", "d", "c", "v", "g", "b", "h", "n", "j", "m",
  "q", "2", "w", "3", "e", "r", "5", "t", "6", "y", "7", "u",
  "i", "9", "o", "0", "p", "[", "=", "]",
];

export function midiNumberToNote(number: number) {
  if (number < LOWEST_MIDI_NOTE || number > HIGHEST_MIDI_NOTE) return null;
  return `${NOTE_NAMES[number % 12]}${Math.floor(number / 12) - 1}`;
}

export const PLAYABLE_NOTES = Array.from(
  { length: HIGHEST_MIDI_NOTE - LOWEST_MIDI_NOTE + 1 },
  (_, index) => midiNumberToNote(LOWEST_MIDI_NOTE + index) as string,
);

export const PLAYABLE_NOTE_SET = new Set(PLAYABLE_NOTES);
export const KEY_TO_NOTE: Record<string, string> = Object.fromEntries(
  COMPUTER_KEYS.map((key, index) => [key, PLAYABLE_NOTES[index]]),
);
export const NOTE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_NOTE).map(([key, note]) => [note, key]),
);
export const WHITE_KEY_COUNT = PLAYABLE_NOTES.filter((note) => !note.includes("#")).length;

export const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

export const SOUND_FONT_NOTES = PLAYABLE_NOTES.map((note) => {
  const pitch = note.slice(0, -1);
  return `${SHARP_TO_FLAT[pitch] ?? pitch}${note.at(-1)}`;
});
