"use client";

import type { CSSProperties } from "react";

type KeySignature = "G" | undefined;

type TrebleStaffProps = {
  ariaLabel: string;
  className?: string;
  notes: string[];
  currentIndex?: number;
  completed?: boolean;
  keySignature?: KeySignature;
  notePosition: (index: number, count: number) => CSSProperties;
  noteClassName?: string;
  noteLabel?: (note: string, index: number) => string | null;
};

const steps: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const E4 = 4 * 7 + steps.E;
const B4 = 4 * 7 + steps.B;

function diatonicPosition(note: string) {
  return Number(note.at(-1)) * 7 + steps[note[0]];
}

function pitchToY(note: string) {
  // E4 is the bottom line of a treble staff. Every diatonic step is half a staff gap.
  return 103.5 - (diatonicPosition(note) - E4) * 7;
}

function ledgerLines(note: string) {
  const distanceFromE4 = diatonicPosition(note) - E4;
  if (distanceFromE4 > -2) return [];
  return Array.from({ length: Math.floor(-distanceFromE4 / 2) }, (_, index) => 126 + index * 14);
}

function hasWrittenAccidental(note: string, keySignature: KeySignature) {
  // G major carries F♯ in its key signature, so those notes do not repeat a sharp sign.
  return note.includes("#") && !(keySignature === "G" && note.startsWith("F#"));
}

export function TrebleStaff({ ariaLabel, className = "", notes, currentIndex, completed = false, keySignature, notePosition, noteClassName = "", noteLabel }: TrebleStaffProps) {
  const hasLowLedger = notes.some((note) => Number(note.at(-1)) <= 3);

  return <div className={`staff ${className} ${hasLowLedger ? "has-low-ledger" : ""}`} aria-label={ariaLabel}>
    <div className="clef" aria-hidden="true">𝄞</div>
    {keySignature === "G" && <span className="key-signature key-g-major" aria-label="G 大调，F 升"><b>♯</b></span>}
    {[0, 1, 2, 3, 4].map((line) => <i key={line} className="staff-line" style={{ top: 56 + line * 14 }} />)}
    <div className="notes-row">
      {notes.map((note, index) => {
        const stemDown = diatonicPosition(note) >= B4;
        const label = noteLabel?.(note, index);
        return <span key={`${note}-${index}`} className={`written-note ${noteClassName} ${stemDown ? "stem-down" : "stem-up"} ${index === currentIndex && !completed ? "current" : ""} ${index < (currentIndex ?? -1) || completed ? "done" : ""}`} style={{ ...notePosition(index, notes.length), top: pitchToY(note) }}>
          {ledgerLines(note).map((top, ledgerIndex) => <em key={ledgerIndex} className="ledger-line" style={{ top: `${top - pitchToY(note)}px` }} />)}
          {hasWrittenAccidental(note, keySignature) && <b className="accidental">♯</b>}
          <i className="notehead" /><u className="stem" />
          {label && <small>{label}</small>}
        </span>;
      })}
    </div>
  </div>;
}
