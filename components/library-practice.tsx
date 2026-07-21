"use client";

import { instrument, type Player } from "soundfont-player";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LibraryPiece } from "../lib/repertoire";
import { KEY_TO_NOTE, NOTE_TO_KEY, PLAYABLE_NOTES, SOUND_FONT_NOTES, WHITE_KEY_COUNT } from "../lib/piano-range";
import { usePracticeInput } from "../lib/use-practice-input";
import { MidiConnect } from "./midi-connect";
import { PracticeResults, type PracticeAttempt } from "./practice-results";
import { SiteHeader } from "./site-header";
import { TrebleStaff } from "./treble-staff";

let audioContext: AudioContext | null = null;
let grandPiano: Player | null = null;
let pianoLoading: Promise<Player> | null = null;

async function playPianoTone(note: string) {
  const context = audioContext ?? new AudioContext();
  audioContext = context;
  if (context.state === "suspended") await context.resume();
  if (!pianoLoading) pianoLoading = instrument(context, "acoustic_grand_piano", { soundfont: "MusyngKite", notes: SOUND_FONT_NOTES }).then((player) => (grandPiano = player));
  const player = grandPiano ?? await pianoLoading;
  player.play(note, context.currentTime, { gain: 0.72, attack: 0.01, decay: 0.16, sustain: 0.42, release: 1.3 });
}

function chunkNotes(notes: string[], size = 16) {
  return Array.from({ length: Math.ceil(notes.length / size) }, (_, index) => notes.slice(index * size, (index + 1) * size));
}

export function LibraryPractice({ piece }: { piece: LibraryPiece }) {
  const [systemIndex, setSystemIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("从这一行的第一个音开始。 ");
  const [pressed, setPressed] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [reviewSystems, setReviewSystems] = useState<string[][] | null>(null);
  const [completed, setCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showKeyHints, setShowKeyHints] = useState(false);
  const { feedback, acceptInput, flashFeedback, resetFeedback } = usePracticeInput();
  const systems = reviewSystems ?? piece.systems;
  const notes = systems[systemIndex];
  const current = notes[cursor];
  const playedBefore = systems.slice(0, systemIndex).flat().length + cursor;
  const totalNotes = systems.flat().length;
  const progress = completed ? 100 : Math.round((playedBefore / totalNotes) * 100);
  const formLabel = piece.formLabel ?? "完整小品";

  const playNote = useCallback((note: string) => {
    if (soundEnabled) void playPianoTone(note);
    setPressed(note); window.setTimeout(() => setPressed(null), 100);
    if (!acceptInput() || completed) return;

    const correct = note === current;
    setAttempts((all) => [...all, { target: current, played: note, correct }]);
    flashFeedback(correct ? "correct" : "wrong");
    if (cursor + 1 < notes.length) {
      setCursor((value) => value + 1);
      setMessage(correct ? "已记录，继续。 " : "已记录，继续下一音。 ");
      return;
    }
    if (systemIndex + 1 < systems.length) {
      setSystemIndex((value) => value + 1); setCursor(0);
      setMessage(`这一行完成，进入第 ${systemIndex + 2} 行。 `);
      return;
    }
    setCompleted(true); setMessage("本轮完成，请查看结果。 ");
  }, [acceptInput, completed, current, cursor, flashFeedback, notes.length, soundEnabled, systemIndex, systems.length]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const note = KEY_TO_NOTE[event.key.toLowerCase()];
      if (note && !event.repeat) { event.preventDefault(); playNote(note); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playNote]);

  function restartPractice(onlyWrong: boolean) {
    const nextSystems = onlyWrong ? chunkNotes(attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.target)) : null;
    setReviewSystems(nextSystems); setSystemIndex(0); setCursor(0); setAttempts([]); setCompleted(false); resetFeedback();
    setMessage(onlyWrong ? "开始复练本轮错音。 " : "已从第一行重新开始。 ");
  }

  const keyboardKeys = useMemo(() => PLAYABLE_NOTES.map((note) => ({ note, key: NOTE_TO_KEY[note], black: note.includes("#") })), []);
  return <main className="library-practice shell">
    <SiteHeader area="piano" currentHref="/library/" currentLabel={piece.title} resumeHref={`/library/${piece.id}/`} actions={<><span className="top-note">右手单音 · <b>{piece.key}</b></span><button className={`sound-button ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? "♩ 钢琴音色" : "♩ 声音关"}</button><MidiConnect onNote={playNote} /></>} />
    <section className="piece-hero"><p className="eyebrow">{formLabel} · RIGHT HAND ONLY</p><h1>{piece.title}</h1><p>{piece.composer}　·　{piece.level}　·　{piece.focus}</p></section>
    <section className="line-practice" aria-label="逐行读谱练习">
      <div className="line-status"><span>{reviewSystems ? "错题复练" : formLabel} · 第 <b>{systemIndex + 1}</b> / {systems.length} 行</span><span>{completed ? "已完成" : `当前音 ${current}`}</span></div>
      {completed ? <PracticeResults attempts={attempts} keySignature={piece.keySignature} systemLengths={systems.map((system) => system.length)} onReviewWrong={() => restartPractice(true)} onRestart={() => restartPractice(false)} restartLabel="重新练习本曲" /> : <><TrebleStaff className={`full-line ${feedback}`} ariaLabel={`当前目标音：${current}`} notes={notes} currentIndex={cursor} keySignature={piece.keySignature} notePosition={(index, count) => ({ left: `${94 + index * Math.min(48, 720 / Math.max(count - 1, 1))}px` })} noteLabel={(note, index) => showKeyHints && index === cursor ? note : null} /><div className="feedback"><span className={feedback === "wrong" ? "error-dot" : "good-dot"}>{feedback === "correct" ? "✓" : feedback === "wrong" ? "×" : "●"}</span><strong>{message}</strong><span className="next-note">练习进度 <b>{progress}%</b></span></div><div className="progress"><i style={{ width: `${progress}%` }} /></div></>}
      <div className="keyboard-caption"><span><b>电脑键盘</b>{showKeyHints ? " · 低音：Z–M　中音：Q–U　高音：I–]" : " · 盲练模式"}</span><button className={`hint-toggle ${showKeyHints ? "on" : ""}`} onClick={() => setShowKeyHints((value) => !value)}>{showKeyHints ? "琴键提示：开" : "琴键提示：关"}</button></div>
      <div className={`piano ${showKeyHints ? "" : "hints-off"}`}>{keyboardKeys.filter(({ black }) => !black).map(({ note, key }) => <button key={note} className={`white-key ${pressed === note ? "pressed" : ""} ${showKeyHints && current === note && !completed ? "target" : ""}`} onClick={() => playNote(note)}><b>{note}</b><kbd>{key.toUpperCase()}</kbd></button>)}<div className="black-keys">{keyboardKeys.filter(({ black }) => black).map(({ note, key }) => { const index = PLAYABLE_NOTES.indexOf(note); const whiteBefore = PLAYABLE_NOTES.slice(0, index).filter((value) => !value.includes("#")).length; return <button key={note} className={`black-key ${pressed === note ? "pressed" : ""} ${showKeyHints && current === note && !completed ? "target" : ""}`} style={{ left: `calc(${whiteBefore * 100 / WHITE_KEY_COUNT}% - 2.55%)` }} onClick={() => playNote(note)}><kbd>{key.toUpperCase()}</kbd></button>; })}</div></div>
    </section>
  </main>;
}
