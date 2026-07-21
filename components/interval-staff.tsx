"use client";

import { keySignatureAccidental, pitchDiatonicIndex, type EarKey, type NotatedPitch } from "../lib/ear-training";

const G_CLEF = "\uE050";
const WHOLE_NOTE = "\uE0A2";
const SHARP = "\uE262";
const FLAT = "\uE260";
const NATURAL = "\uE261";
const E4_INDEX = 4 * 7 + 2;
const F5_INDEX = 5 * 7 + 3;

const SHARP_SIGNATURE_POSITIONS = [
  { letter: "F", y: 68 }, { letter: "C", y: 89 }, { letter: "G", y: 61 },
  { letter: "D", y: 82 }, { letter: "A", y: 103 }, { letter: "E", y: 75 }, { letter: "B", y: 96 },
];
const FLAT_SIGNATURE_POSITIONS = [
  { letter: "B", y: 96 }, { letter: "E", y: 75 }, { letter: "A", y: 103 },
  { letter: "D", y: 82 }, { letter: "G", y: 110 }, { letter: "C", y: 89 }, { letter: "F", y: 117 },
];

function pitchToY(pitch: NotatedPitch) {
  return 124 - (pitchDiatonicIndex(pitch) - E4_INDEX) * 7;
}

function ledgerLineYs(pitch: NotatedPitch) {
  const position = pitchDiatonicIndex(pitch);
  const lines: number[] = [];
  if (position <= E4_INDEX - 2) {
    for (let ledger = E4_INDEX - 2; ledger >= position - (position % 2 === E4_INDEX % 2 ? 0 : 1); ledger -= 2) lines.push(124 + (E4_INDEX - ledger) * 7);
  }
  if (position >= F5_INDEX + 2) {
    for (let ledger = F5_INDEX + 2; ledger <= position + (position % 2 === F5_INDEX % 2 ? 0 : 1); ledger += 2) lines.push(68 - (ledger - F5_INDEX) * 7);
  }
  return lines;
}

function writtenAccidental(pitch: NotatedPitch, key: EarKey) {
  const signatureAccidental = keySignatureAccidental(key, pitch.letter);
  if (pitch.accidental === signatureAccidental) return null;
  if (pitch.accidental === 0) return NATURAL;
  return pitch.accidental === 1 ? SHARP : FLAT;
}

function melodicX(index: number) {
  return index === 0 ? 43 : 68;
}

export function IntervalStaff({ keyInfo, notes, presentation, hidden = false, activeIndex = null, showLabels = false, ariaLabel }: {
  keyInfo: EarKey;
  notes: readonly [NotatedPitch, NotatedPitch];
  presentation: "melodic" | "harmonic";
  hidden?: boolean;
  activeIndex?: number | "both" | null;
  showLabels?: boolean;
  ariaLabel: string;
}) {
  const signaturePositions = keyInfo.signature >= 0 ? SHARP_SIGNATURE_POSITIONS : FLAT_SIGNATURE_POSITIONS;
  const signatureGlyph = keyInfo.signature >= 0 ? SHARP : FLAT;
  const signatureCount = Math.abs(keyInfo.signature);
  const adjacent = Math.abs(pitchDiatonicIndex(notes[0]) - pitchDiatonicIndex(notes[1])) === 1;

  return <div className={`interval-staff ${hidden ? "notes-hidden" : ""}`} role="img" aria-label={ariaLabel}>
    <span className="interval-clef" aria-hidden="true">{G_CLEF}</span>
    <span className="interval-signature" aria-label={`${keyInfo.label}调号`}>
      {signaturePositions.slice(0, signatureCount).map((position, index) => <b key={`${position.letter}-${index}`} style={{ left: `${index * 15}px`, top: `${position.y}px` }}>{signatureGlyph}</b>)}
    </span>
    {[0, 1, 2, 3, 4].map((line) => <i key={line} className="interval-staff-line" style={{ top: `${68 + line * 14}px` }} />)}
    {!hidden && notes.map((pitch, index) => {
      const baseX = presentation === "harmonic" ? 58 : melodicX(index);
      const noteOffset = presentation === "harmonic" && adjacent && pitchDiatonicIndex(pitch) === Math.max(...notes.map(pitchDiatonicIndex)) ? 2.6 : 0;
      const active = activeIndex === "both" || activeIndex === index;
      const accidental = writtenAccidental(pitch, keyInfo);
      return <span key={`${pitch.name}-${index}`} className={`interval-written-note ${active ? "active" : ""}`} style={{ left: `${baseX + noteOffset}%`, top: `${pitchToY(pitch)}px` }}>
        {ledgerLineYs(pitch).map((lineY) => <i key={lineY} className="interval-ledger" style={{ top: `${lineY - pitchToY(pitch)}px` }} />)}
        {accidental && <b className="interval-accidental" style={{ right: presentation === "harmonic" && adjacent && pitchDiatonicIndex(pitch) === Math.max(...notes.map(pitchDiatonicIndex)) ? "34px" : "21px" }}>{accidental}</b>}
        <span className="interval-notehead" aria-hidden="true">{WHOLE_NOTE}</span>
        {showLabels && <small>{pitch.name}</small>}
      </span>;
    })}
    {hidden && <span className="interval-listen-mark" aria-hidden="true">♪</span>}
  </div>;
}
