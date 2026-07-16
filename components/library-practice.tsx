"use client";

import { instrument, type Player } from "soundfont-player";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LibraryPiece } from "../lib/repertoire";
import { sitePath } from "../lib/site-path";
import { MidiConnect } from "./midi-connect";
import { TrebleStaff } from "./treble-staff";

const PLAYABLE_NOTES = ["C3","C#3","D3","D#3","E3","F3","F#3","G3","G#3","A3","A#3","B3","C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4","A4","A#4","B4","C5","C#5","D5","D#5","E5","F5","F#5","G5"];
const KEY_TO_NOTE: Record<string, string> = { z:"C3", s:"C#3", x:"D3", d:"D#3", c:"E3", v:"F3", g:"F#3", b:"G3", h:"G#3", n:"A3", j:"A#3", m:"B3", q:"C4", "2":"C#4", w:"D4", "3":"D#4", e:"E4", r:"F4", "5":"F#4", t:"G4", "6":"G#4", y:"A4", "7":"A#4", u:"B4", i:"C5", "9":"C#5", o:"D5", "0":"D#5", p:"E5", "[":"F5", "=":"F#5", "]":"G5" };
const NOTE_TO_KEY = Object.fromEntries(Object.entries(KEY_TO_NOTE).map(([key, note]) => [note, key]));
const SHARP_TO_FLAT: Record<string, string> = { "C#":"Db", "D#":"Eb", "F#":"Gb", "G#":"Ab", "A#":"Bb" };
const SOUND_FONT_NOTES = PLAYABLE_NOTES.map((note) => `${SHARP_TO_FLAT[note.slice(0, -1)] ?? note.slice(0, -1)}${note.at(-1)}`);
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

export function LibraryPractice({ piece }: { piece: LibraryPiece }) {
  const [systemIndex, setSystemIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("从这一行的第一个音开始。 ");
  const [pressed, setPressed] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showKeyHints, setShowKeyHints] = useState(true);
  const notes = piece.systems[systemIndex];
  const current = notes[cursor];
  const playedBefore = piece.systems.slice(0, systemIndex).flat().length + cursor;
  const totalNotes = piece.systems.flat().length;
  const progress = completed ? 100 : Math.round((playedBefore / totalNotes) * 100);

  const playNote = useCallback((note: string) => {
    if (soundEnabled) void playPianoTone(note);
    setPressed(note); window.setTimeout(() => setPressed(null), 100);
    if (completed) { setSystemIndex(0); setCursor(0); setCompleted(false); setMessage("已从第一行重新开始。 "); return; }
    if (note !== current) { setWrong(true); setMessage(`再试一次：目标音是 ${current}。`); window.setTimeout(() => setWrong(false), 360); return; }
    if (cursor + 1 < notes.length) { setCursor((value) => value + 1); setMessage("正确，继续。 "); return; }
    if (systemIndex + 1 < piece.systems.length) { setSystemIndex((value) => value + 1); setCursor(0); setMessage(`这一行完成，进入第 ${systemIndex + 2} 行。 `); return; }
    setCompleted(true); setMessage("整首小品完成！再弹任意琴键可从头练习。 ");
  }, [completed, current, cursor, notes.length, piece.systems.length, soundEnabled, systemIndex]);

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

  const keyboardKeys = useMemo(() => PLAYABLE_NOTES.map((note) => ({ note, key: NOTE_TO_KEY[note], black: note.includes("#") })), []);
  return <main className="library-practice shell">
    <header className="topbar"><a className="brand" href={sitePath("/")}><span>谱</span>练</a><a className="back-library" href={sitePath("/library/")}>← 返回曲库</a><div className="top-note">右手单音 · <b>{piece.key}</b></div><button className={`sound-button ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? "♩ 钢琴音色" : "♩ 声音关"}</button><MidiConnect onNote={playNote} /></header>
    <section className="piece-hero"><p className="eyebrow">完整小品 · RIGHT HAND ONLY</p><h1>{piece.title}</h1><p>{piece.composer}　·　{piece.level}　·　{piece.focus}</p></section>
    <section className="line-practice" aria-label="逐行读谱练习">
      <div className="line-status"><span>第 <b>{systemIndex + 1}</b> / {piece.systems.length} 行</span><span>{completed ? "已完成" : `当前音 ${current}`}</span></div>
      <TrebleStaff className={`full-line ${wrong ? "wrong" : ""}`} ariaLabel={`当前目标音：${current ?? "已完成"}`} notes={notes} currentIndex={cursor} completed={completed} keySignature={piece.keySignature} notePosition={(index, count) => ({ left: `${94 + index * Math.min(48, 720 / Math.max(count - 1, 1))}px` })} noteLabel={(note, index) => showKeyHints && index === cursor && !completed ? note : null} />
      <div className="feedback"><span className={wrong ? "error-dot" : "good-dot"}>{completed ? "✓" : wrong ? "×" : "●"}</span><strong>{message}</strong><span className="next-note">整曲进度 <b>{progress}%</b></span></div><div className="progress"><i style={{ width: `${progress}%` }} /></div>
      <div className="keyboard-caption"><span><b>电脑键盘</b>{showKeyHints ? " · 低音：Z–M　中音：Q–U　高音：I–]" : " · 盲练模式"}</span><button className={`hint-toggle ${showKeyHints ? "on" : ""}`} onClick={() => setShowKeyHints((value) => !value)}>{showKeyHints ? "琴键提示：开" : "琴键提示：关"}</button></div>
      <div className={`piano ${showKeyHints ? "" : "hints-off"}`}>{keyboardKeys.filter(({ black }) => !black).map(({ note, key }) => <button key={note} className={`white-key ${pressed === note ? "pressed" : ""} ${showKeyHints && current === note && !completed ? "target" : ""}`} onClick={() => playNote(note)}><b>{note}</b><kbd>{key.toUpperCase()}</kbd></button>)}<div className="black-keys">{keyboardKeys.filter(({ black }) => black).map(({ note, key }) => { const index = PLAYABLE_NOTES.indexOf(note); const whiteBefore = PLAYABLE_NOTES.slice(0, index).filter((value) => !value.includes("#")).length; return <button key={note} className={`black-key ${pressed === note ? "pressed" : ""} ${showKeyHints && current === note && !completed ? "target" : ""}`} style={{ left: `calc(${whiteBefore * 100 / 19}% - 2.55%)` }} onClick={() => playNote(note)}><kbd>{key.toUpperCase()}</kbd></button>; })}</div></div>
    </section>
  </main>;
}
