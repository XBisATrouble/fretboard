export type EarTrainingLevel = "tonic" | "degrees" | "diatonic" | "chromatic";
export type IntervalPresentation = "melodic" | "harmonic" | "mixed";
export type IntervalDirection = "ascending" | "descending" | "harmonic";
export type Accidental = -1 | 0 | 1;

export type NotatedPitch = {
  midi: number;
  letter: string;
  accidental: Accidental;
  octave: number;
  name: string;
  solfege: string;
};

export type EarKey = {
  id: string;
  label: string;
  tonicPitchClass: number;
  signature: number;
  scale: readonly string[];
};

export type IntervalDefinition = {
  id: string;
  semitones: number;
  number: number;
  label: string;
  shortLabel: string;
};

export type IntervalQuestion = {
  id: string;
  key: EarKey;
  interval: IntervalDefinition;
  low: NotatedPitch;
  high: NotatedPitch;
  first: NotatedPitch;
  second: NotatedPitch;
  direction: IntervalDirection;
  presentation: "melodic" | "harmonic";
};

const NATURAL_PITCH_CLASSES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const SHARP_AUDIO_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SOLFEGE_BY_OFFSET = ["Do", "♯Do / ♭Re", "Re", "♯Re / ♭Mi", "Mi", "Fa", "♯Fa / ♭Sol", "Sol", "♯Sol / ♭La", "La", "♯La / ♭Ti", "Ti"];

export const EAR_KEYS: readonly EarKey[] = [
  { id: "C", label: "C 大调", tonicPitchClass: 0, signature: 0, scale: ["C", "D", "E", "F", "G", "A", "B"] },
  { id: "G", label: "G 大调", tonicPitchClass: 7, signature: 1, scale: ["G", "A", "B", "C", "D", "E", "F#"] },
  { id: "F", label: "F 大调", tonicPitchClass: 5, signature: -1, scale: ["F", "G", "A", "Bb", "C", "D", "E"] },
  { id: "D", label: "D 大调", tonicPitchClass: 2, signature: 2, scale: ["D", "E", "F#", "G", "A", "B", "C#"] },
  { id: "Bb", label: "B♭ 大调", tonicPitchClass: 10, signature: -2, scale: ["Bb", "C", "D", "Eb", "F", "G", "A"] },
  { id: "A", label: "A 大调", tonicPitchClass: 9, signature: 3, scale: ["A", "B", "C#", "D", "E", "F#", "G#"] },
  { id: "Eb", label: "E♭ 大调", tonicPitchClass: 3, signature: -3, scale: ["Eb", "F", "G", "Ab", "Bb", "C", "D"] },
  { id: "E", label: "E 大调", tonicPitchClass: 4, signature: 4, scale: ["E", "F#", "G#", "A", "B", "C#", "D#"] },
  { id: "Ab", label: "A♭ 大调", tonicPitchClass: 8, signature: -4, scale: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"] },
  { id: "B", label: "B 大调", tonicPitchClass: 11, signature: 5, scale: ["B", "C#", "D#", "E", "F#", "G#", "A#"] },
  { id: "Db", label: "D♭ 大调", tonicPitchClass: 1, signature: -5, scale: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"] },
  { id: "Fsharp", label: "F♯ 大调", tonicPitchClass: 6, signature: 6, scale: ["F#", "G#", "A#", "B", "C#", "D#", "E#"] },
] as const;

export const INTERVALS: readonly IntervalDefinition[] = [
  { id: "m2", semitones: 1, number: 2, label: "小二度", shortLabel: "小二" },
  { id: "M2", semitones: 2, number: 2, label: "大二度", shortLabel: "大二" },
  { id: "m3", semitones: 3, number: 3, label: "小三度", shortLabel: "小三" },
  { id: "M3", semitones: 4, number: 3, label: "大三度", shortLabel: "大三" },
  { id: "P4", semitones: 5, number: 4, label: "纯四度", shortLabel: "纯四" },
  { id: "TT", semitones: 6, number: 4, label: "三全音", shortLabel: "三全音" },
  { id: "P5", semitones: 7, number: 5, label: "纯五度", shortLabel: "纯五" },
  { id: "m6", semitones: 8, number: 6, label: "小六度", shortLabel: "小六" },
  { id: "M6", semitones: 9, number: 6, label: "大六度", shortLabel: "大六" },
  { id: "m7", semitones: 10, number: 7, label: "小七度", shortLabel: "小七" },
  { id: "M7", semitones: 11, number: 7, label: "大七度", shortLabel: "大七" },
  { id: "P8", semitones: 12, number: 8, label: "纯八度", shortLabel: "八度" },
] as const;

export const LEVELS: Record<EarTrainingLevel, { label: string; detail: string; intervalIds: readonly string[] }> = {
  tonic: { label: "主音关系", detail: "Do 到 Re、Mi、Sol 与上方 Do", intervalIds: ["M2", "M3", "P5", "P8"] },
  degrees: { label: "完整音级", detail: "Do 到大调内的全部音级", intervalIds: ["M2", "M3", "P4", "P5", "M6", "M7", "P8"] },
  diatonic: { label: "调内任意两音", detail: "不再总从主音出发", intervalIds: INTERVALS.map((interval) => interval.id) },
  chromatic: { label: "完整音程", detail: "加入半音变化与全部音程", intervalIds: INTERVALS.map((interval) => interval.id) },
};

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function spellingParts(spelling: string) {
  const accidental: Accidental = spelling.includes("#") ? 1 : spelling.includes("b") ? -1 : 0;
  return { letter: spelling[0], accidental };
}

function midiForSpelling(spelling: string, octave: number) {
  const { letter, accidental } = spellingParts(spelling);
  return (octave + 1) * 12 + NATURAL_PITCH_CLASSES[letter] + accidental;
}

function accidentalSymbol(accidental: Accidental) {
  return accidental === 1 ? "♯" : accidental === -1 ? "♭" : "";
}

function solfegeForPitch(key: EarKey, midi: number) {
  return SOLFEGE_BY_OFFSET[modulo(midi - key.tonicPitchClass, 12)];
}

function makePitch(key: EarKey, spelling: string, octave: number): NotatedPitch {
  const { letter, accidental } = spellingParts(spelling);
  const midi = midiForSpelling(spelling, octave);
  return { midi, letter, accidental, octave, name: `${letter}${accidentalSymbol(accidental)}${octave}`, solfege: solfegeForPitch(key, midi) };
}

function scalePitches(key: EarKey) {
  const tonicLetterIndex = LETTERS.indexOf(key.scale[0][0]);
  const tonicOctave = tonicLetterIndex >= LETTERS.indexOf("C") ? 4 : 3;
  return Array.from({ length: 15 }, (_, index) => {
    const scaleIndex = index % 7;
    const octaveLift = Math.floor((tonicLetterIndex + index) / 7);
    const octave = tonicOctave + octaveLift;
    return makePitch(key, key.scale[scaleIndex], octave);
  });
}

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function intervalBySemitones(semitones: number) {
  const interval = INTERVALS.find((item) => item.semitones === semitones);
  if (!interval) throw new Error(`Unsupported interval: ${semitones}`);
  return interval;
}

function choosePresentation(presentation: IntervalPresentation): "melodic" | "harmonic" {
  if (presentation === "mixed") return Math.random() < .25 ? "harmonic" : "melodic";
  return presentation;
}

function tonicQuestionPitches(key: EarKey, level: "tonic" | "degrees") {
  const pitches = scalePitches(key);
  const availableDegrees = level === "tonic" ? [1, 2, 4, 7] : [1, 2, 3, 4, 5, 6, 7];
  const targetIndex = randomItem(availableDegrees);
  return [pitches[0], pitches[targetIndex]] as const;
}

function diatonicQuestionPitches(key: EarKey) {
  const pitches = scalePitches(key).filter((pitch) => pitch.midi >= 53 && pitch.midi <= 84);
  const pairsByInterval = new Map<string, [NotatedPitch, NotatedPitch][]>();
  pitches.forEach((low, lowIndex) => pitches.slice(lowIndex + 1).forEach((high) => {
    const distance = high.midi - low.midi;
    if (distance < 1 || distance > 12) return;
    const intervalId = intervalBySemitones(distance).id;
    const pairs = pairsByInterval.get(intervalId) ?? [];
    pairs.push([low, high]);
    pairsByInterval.set(intervalId, pairs);
  }));
  const intervalId = randomItem([...pairsByInterval.keys()]);
  return randomItem(pairsByInterval.get(intervalId)!);
}

function chromaticQuestionPitches(key: EarKey) {
  const interval = randomItem(INTERVALS);
  const roots = scalePitches(key).filter((pitch) => pitch.midi >= 55 && pitch.midi + interval.semitones <= 84);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const low = randomItem(roots);
    const rootLetterIndex = LETTERS.indexOf(low.letter);
    const targetLetterPosition = rootLetterIndex + interval.number - 1;
    const targetLetter = LETTERS[modulo(targetLetterPosition, 7)];
    const targetOctave = low.octave + Math.floor(targetLetterPosition / 7);
    const naturalMidi = (targetOctave + 1) * 12 + NATURAL_PITCH_CLASSES[targetLetter];
    const accidental = low.midi + interval.semitones - naturalMidi;
    if (accidental < -1 || accidental > 1) continue;
    const spelling = `${targetLetter}${accidental === 1 ? "#" : accidental === -1 ? "b" : ""}`;
    return [low, makePitch(key, spelling, targetOctave)] as const;
  }
  return diatonicQuestionPitches(key);
}

export function generateIntervalQuestion(level: EarTrainingLevel, keyIndex: number, presentation: IntervalPresentation, previousIntervalId?: string): IntervalQuestion {
  const key = EAR_KEYS[keyIndex % EAR_KEYS.length];
  let low: NotatedPitch;
  let high: NotatedPitch;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    [low, high] = level === "tonic" || level === "degrees" ? tonicQuestionPitches(key, level) : level === "diatonic" ? diatonicQuestionPitches(key) : chromaticQuestionPitches(key);
    const interval = intervalBySemitones(high.midi - low.midi);
    if (interval.id !== previousIntervalId || attempt === 19) break;
  }
  const interval = intervalBySemitones(high!.midi - low!.midi);
  const actualPresentation = choosePresentation(presentation);
  const direction: IntervalDirection = actualPresentation === "harmonic" ? "harmonic" : Math.random() < .5 ? "ascending" : "descending";
  const first = direction === "descending" ? high! : low!;
  const second = direction === "descending" ? low! : high!;
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, key, interval, low: low!, high: high!, first, second, direction, presentation: actualPresentation };
}

export function answerOptionsForLevel(level: EarTrainingLevel) {
  return INTERVALS.filter((interval) => LEVELS[level].intervalIds.includes(interval.id));
}

export function midiToAudioNote(midi: number) {
  return `${SHARP_AUDIO_NAMES[modulo(midi, 12)]}${Math.floor(midi / 12) - 1}`;
}

export function keySignatureAccidental(key: EarKey, letter: string): Accidental {
  const spelling = key.scale.find((note) => note[0] === letter);
  return spelling ? spellingParts(spelling).accidental : 0;
}

export function pitchDiatonicIndex(pitch: NotatedPitch) {
  return pitch.octave * 7 + LETTERS.indexOf(pitch.letter);
}

export function directionLabel(direction: IntervalDirection) {
  return direction === "ascending" ? "上行" : direction === "descending" ? "下行" : "和声";
}

export function cadenceMidiNotes(key: EarKey) {
  const rootAtOrAbove = (pitchClass: number, minimum: number) => minimum + modulo(pitchClass - minimum, 12);
  const chord = (pitchClass: number) => {
    const root = rootAtOrAbove(pitchClass, 55);
    return [root, root + 4, root + 7];
  };
  return [chord(key.tonicPitchClass), chord(key.tonicPitchClass + 5), chord(key.tonicPitchClass + 7), chord(key.tonicPitchClass)];
}
