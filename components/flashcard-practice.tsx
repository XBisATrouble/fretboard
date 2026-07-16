"use client";

import { instrument, type Player } from "soundfont-player";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sitePath } from "../lib/site-path";
import { MidiConnect } from "./midi-connect";

const PLAYABLE_NOTES = ["C3","C#3","D3","D#3","E3","F3","F#3","G3","G#3","A3","A#3","B3","C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4","A4","A#4","B4","C5","C#5","D5","D#5","E5","F5","F#5","G5"];
const KEY_TO_NOTE: Record<string, string> = { z:"C3", s:"C#3", x:"D3", d:"D#3", c:"E3", v:"F3", g:"F#3", b:"G3", h:"G#3", n:"A3", j:"A#3", m:"B3", q:"C4", "2":"C#4", w:"D4", "3":"D#4", e:"E4", r:"F4", "5":"F#4", t:"G4", "6":"G#4", y:"A4", "7":"A#4", u:"B4", i:"C5", "9":"C#5", o:"D5", "0":"D#5", p:"E5", "[":"F5", "=":"F#5", "]":"G5" };
const NOTE_TO_KEY = Object.fromEntries(Object.entries(KEY_TO_NOTE).map(([key, note]) => [note, key]));
const SHARP_TO_FLAT: Record<string, string> = { "C#":"Db", "D#":"Eb", "F#":"Gb", "G#":"Ab", "A#":"Bb" };
const SOUND_FONT_NOTES = PLAYABLE_NOTES.map((note) => `${SHARP_TO_FLAT[note.slice(0, -1)] ?? note.slice(0, -1)}${note.at(-1)}`);
const DECKS = {
  basic: { label: "基础八度", description: "C4–C5 · 白键", notes: ["C4","D4","E4","F4","G4","A4","B4","C5"] },
  wide: { label: "扩展音域", description: "C3–G5 · 白键", notes: PLAYABLE_NOTES.filter((note) => !note.includes("#")) },
  chromatic: { label: "含升降音", description: "C3–G5 · 全部 32 键", notes: PLAYABLE_NOTES },
} as const;
type DeckId = keyof typeof DECKS;
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

function pitchToY(note: string) {
  const steps: Record<string, number> = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
  return 103.5 - ((Number(note.at(-1)) * 7 + steps[note[0]]) - (4 * 7 + 2)) * 7;
}

function ledgerLines(note: string) {
  const steps: Record<string, number> = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
  const distance = (Number(note.at(-1)) * 7 + steps[note[0]]) - (4 * 7 + 2);
  return distance > -2 ? [] : Array.from({ length: Math.floor(-distance / 2) }, (_, index) => 126 + index * 14);
}

function randomNote(deck: readonly string[], previous?: string) {
  if (deck.length === 1) return deck[0];
  let next = previous;
  while (next === previous) next = deck[Math.floor(Math.random() * deck.length)];
  return next ?? deck[0];
}

export function FlashcardPractice() {
  const [deckId, setDeckId] = useState<DeckId>("basic");
  const [target, setTarget] = useState("E4");
  const [pressed, setPressed] = useState<string | null>(null);
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [message, setMessage] = useState("看谱并按下对应的琴键。");
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const deck = DECKS[deckId];
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 100;

  const nextCard = useCallback(() => {
    setTarget((previous) => randomNote(DECKS[deckId].notes, previous));
    setResult("idle");
    setMessage("看谱并按下对应的琴键。");
  }, [deckId]);

  const answer = useCallback((note: string) => {
    if (soundEnabled) void playPianoTone(note);
    setPressed(note); window.setTimeout(() => setPressed(null), 110);
    setAttempts((value) => value + 1);
    if (note !== target) {
      setResult("wrong"); setStreak(0);
      setMessage(showHints ? `再试一次：这是 ${target}。` : "还差一点，再看一眼谱面。");
      return;
    }
    setResult("correct"); setCorrect((value) => value + 1); setStreak((value) => value + 1);
    setMessage("正确！下一张马上出现。");
    window.setTimeout(nextCard, 520);
  }, [nextCard, showHints, soundEnabled, target]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || event.repeat) return;
      const note = KEY_TO_NOTE[event.key.toLowerCase()];
      if (note) { event.preventDefault(); answer(note); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answer]);

  function chooseDeck(id: DeckId) {
    setDeckId(id); setTarget(randomNote(DECKS[id].notes)); setResult("idle"); setMessage("新牌组已载入，看谱并作答。"); setAttempts(0); setCorrect(0); setStreak(0);
  }

  const keyboardKeys = useMemo(() => PLAYABLE_NOTES.map((note) => ({ note, key: NOTE_TO_KEY[note], black: note.includes("#") })), []);
  return <main className="flashcards-page shell">
    <header className="topbar"><a className="brand" href={sitePath("/")}><span>谱</span>练</a><a className="back-library" href={sitePath("/")}>← 返回首页体验</a><a className="library-link" href={sitePath("/library/")}>完整曲库</a><button className={`sound-button ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? "♩ 钢琴音色" : "♩ 声音关"}</button><MidiConnect onNote={answer} /></header>
    <section className="flash-hero"><p className="eyebrow">SIGHT-READING FLASHCARDS · NO RHYTHM YET</p><h1>看见一个音，<em>立刻找到它。</em></h1><p>没有节奏、没有旋律负担；只练五线谱位置与琴键之间的即时反应。</p></section>
    <section className="flash-workspace" aria-label="读谱闪卡练习">
      <aside className="flash-decks"><div className="section-heading"><span>选择牌组</span><small>由易到难</small></div>{(Object.entries(DECKS) as [DeckId, typeof deck][]).map(([id, item], index) => <button key={id} onClick={() => chooseDeck(id)} className={`flash-deck ${id === deckId ? "selected" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}<small>{item.description}</small></strong></button>)}<div className="flash-tip">每答对一张，自动换下一张。按错不会跳过。</div></aside>
      <div className="flash-card-area"><div className="flash-status"><span>{deck.label} · 第 {attempts + 1} 题</span><button className={`hint-toggle ${showHints ? "on" : ""}`} onClick={() => setShowHints((value) => !value)} aria-pressed={showHints}>{showHints ? "琴键提示：开" : "琴键提示：关"}</button></div><div className={`staff flash-staff ${result === "wrong" ? "wrong" : ""} ${result === "correct" ? "correct" : ""}`} aria-label="请辨认这个五线谱音符"><div className="clef">𝄞</div>{[0,1,2,3,4].map((line) => <i key={line} className="staff-line" style={{ top:56 + line * 14 }} />)}<span className="written-note flash-note" style={{ left:"50%", top:pitchToY(target) }}>{ledgerLines(target).map((top, index) => <em key={index} className="ledger-line" style={{ top:`${top - pitchToY(target)}px` }} />)}<b>{target.includes("#") ? "♯" : ""}</b><i /><small>{showHints ? target : ""}</small></span></div><div className="flash-feedback"><span className={result === "wrong" ? "error-dot" : "good-dot"}>{result === "correct" ? "✓" : result === "wrong" ? "×" : "●"}</span><strong>{message}</strong></div><div className="flash-metrics"><span>正确 <b>{correct}</b></span><span>连对 <b>{streak}</b></span><span>正确率 <b>{accuracy}%</b></span></div></div>
    </section>
    <section className="keyboard-section flash-keyboard"><div className="keyboard-caption"><span><b>电脑键盘</b>{showHints ? " · 低音：Z–M　中音：Q–U　高音：I–]" : " · 盲练模式"}</span><button className="skip-card" onClick={nextCard}>换一张 →</button></div><div className={`piano ${showHints ? "" : "hints-off"}`} aria-label="32 键虚拟钢琴">{keyboardKeys.filter(({ black }) => !black).map(({note,key}) => <button key={note} className={`white-key ${pressed === note ? "pressed" : ""} ${showHints && target === note ? "target" : ""}`} onClick={() => answer(note)}><b>{note.replace("#", "")}</b><kbd>{key.toUpperCase()}</kbd></button>)}<div className="black-keys">{keyboardKeys.filter(({ black }) => black).map(({note,key}) => { const index = PLAYABLE_NOTES.indexOf(note); const whiteBefore = PLAYABLE_NOTES.slice(0,index).filter((value) => !value.includes("#")).length; return <button key={note} className={`black-key ${pressed === note ? "pressed" : ""} ${showHints && target === note ? "target" : ""}`} style={{ left:`calc(${whiteBefore * 100 / 19}% - 2.55%)` }} onClick={() => answer(note)}><kbd>{key.toUpperCase()}</kbd></button>; })}</div></div></section>
  </main>;
}
