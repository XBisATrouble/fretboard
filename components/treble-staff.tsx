"use client";

import type { CSSProperties } from "react";
import { KEY_SIGNATURES, keySignatureIncludes, type KeySignature } from "../lib/key-signatures";

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
  noteStatus?: (note: string, index: number) => "correct" | "wrong" | null;
  selectedIndex?: number;
  onNoteSelect?: (index: number) => void;
};

const steps: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const E4 = 4 * 7 + steps.E;
const B4 = 4 * 7 + steps.B;
const F5 = 5 * 7 + steps.F;
const SHARP_GLYPH = "\uE262";
const KEY_SIGNATURE_Y: Record<"F#" | "C#", number> = {
  "F#": 56,
  "C#": 77,
};

function diatonicPosition(note: string) {
  return Number(note.at(-1)) * 7 + steps[note[0]];
}

function pitchToY(note: string) {
  // E4 is the bottom line of a treble staff. Every diatonic step is half a staff gap.
  return 103.5 - (diatonicPosition(note) - E4) * 7;
}

function ledgerLines(note: string) {
  const distanceFromE4 = diatonicPosition(note) - E4;
  if (distanceFromE4 <= -2) {
    return Array.from({ length: Math.floor(-distanceFromE4 / 2) }, (_, index) => 126 + index * 14);
  }
  const distanceFromF5 = diatonicPosition(note) - F5;
  if (distanceFromF5 < 2) return [];
  return Array.from({ length: Math.floor(distanceFromF5 / 2) }, (_, index) => 42 - index * 14);
}

function hasWrittenAccidental(note: string, keySignature?: KeySignature) {
  return note.includes("#") && !keySignatureIncludes(note, keySignature);
}

export function TrebleStaff({ ariaLabel, className = "", notes, currentIndex, completed = false, keySignature, notePosition, noteClassName = "", noteLabel, noteStatus, selectedIndex, onNoteSelect }: TrebleStaffProps) {
  const hasLowLedger = notes.some((note) => Number(note.at(-1)) <= 3);
  const signature = keySignature ? KEY_SIGNATURES[keySignature] : KEY_SIGNATURES.natural;

  return <div className={`staff ${className} ${hasLowLedger ? "has-low-ledger" : ""}`} aria-label={ariaLabel}>
    {/* Bravura's SMuFL gClef glyph is positioned to wrap the second staff line (G4). */}
    <div className="clef" aria-hidden="true">{"\uE050"}</div>
    {signature.sharps.length > 0 && <span className="key-signature" aria-label={signature.ariaLabel}>{signature.sharps.map((sharp, index) => <b key={sharp} style={{ left: `${index * 15}px`, top: `${KEY_SIGNATURE_Y[sharp]}px` }}>{SHARP_GLYPH}</b>)}</span>}
    {[0, 1, 2, 3, 4].map((line) => <i key={line} className="staff-line" style={{ top: 56 + line * 14 }} />)}
    <div className="notes-row" style={{ left: `${signature.sharps.length * 15}px` }}>
      {notes.map((note, index) => {
        const stemDown = diatonicPosition(note) >= B4;
        const label = noteLabel?.(note, index);
        const status = noteStatus?.(note, index);
        const selectable = Boolean(onNoteSelect && status === "wrong");
        return <span key={`${note}-${index}`} className={`written-note ${noteClassName} ${stemDown ? "stem-down" : "stem-up"} ${index === currentIndex && !completed ? "current" : ""} ${index < (currentIndex ?? -1) || completed ? "done" : ""} ${status ? `result-${status}` : ""} ${index === selectedIndex ? "result-selected" : ""}`} style={{ ...notePosition(index, notes.length), top: pitchToY(note) }} role={selectable ? "button" : undefined} tabIndex={selectable ? 0 : undefined} aria-label={selectable ? `查看错音 ${note}` : undefined} onClick={selectable ? () => onNoteSelect(index) : undefined} onKeyDown={selectable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onNoteSelect(index); } } : undefined}>
          {ledgerLines(note).map((top, ledgerIndex) => <em key={ledgerIndex} className="ledger-line" style={{ top: `${top - pitchToY(note)}px` }} />)}
          {hasWrittenAccidental(note, keySignature) && <b className="accidental">{SHARP_GLYPH}</b>}
          <i className="notehead" /><u className="stem" />
          {label && <small>{label}</small>}
        </span>;
      })}
    </div>
  </div>;
}
