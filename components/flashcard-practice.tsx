"use client";

import { instrument, type Player } from "soundfont-player";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KEY_TO_NOTE, NOTE_TO_KEY, PIANO_RANGE_LABEL, PLAYABLE_NOTES, SOUND_FONT_NOTES, WHITE_KEY_COUNT } from "../lib/piano-range";
import { usePracticeInput } from "../lib/use-practice-input";
import { MidiConnect } from "./midi-connect";
import { PracticeResults, type PracticeAttempt } from "./practice-results";
import { SiteHeader } from "./site-header";
import { TrebleStaff } from "./treble-staff";

const DECKS = {
  basic: { label: "基础八度", description: "C4–C5 · 白键", notes: ["C4","D4","E4","F4","G4","A4","B4","C5"] },
  wide: { label: "扩展音域", description: `${PIANO_RANGE_LABEL} · 白键`, notes: PLAYABLE_NOTES.filter((note) => !note.includes("#")) },
  chromatic: { label: "含升降音", description: `${PIANO_RANGE_LABEL} · 全部 32 键`, notes: PLAYABLE_NOTES },
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
  const [message, setMessage] = useState("看谱并按下对应的琴键。");
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [reviewTargets, setReviewTargets] = useState<string[] | null>(null);
  const [completed, setCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [sessionSize, setSessionSize] = useState(20);
  const { feedback, acceptInput, flashFeedback, resetFeedback } = usePracticeInput();
  const deck = DECKS[deckId];
  const sessionLength = reviewTargets?.length ?? sessionSize;

  const recordAnswer = useCallback((played: string) => {
    if (completed || !acceptInput()) return;
    const correct = played === target;
    const nextAttempts = [...attempts, { target, played, correct }];
    setAttempts(nextAttempts);
    flashFeedback(correct ? "correct" : "wrong");

    if (nextAttempts.length >= sessionLength) {
      setCompleted(true);
      setMessage("本轮完成，请查看结果。");
      return;
    }

    const nextTarget = reviewTargets?.[nextAttempts.length] ?? randomNote(DECKS[deckId].notes, target);
    setTarget(nextTarget);
    setMessage(correct ? "已记录，继续。" : "已记录，继续下一张。");
  }, [acceptInput, attempts, completed, deckId, flashFeedback, reviewTargets, sessionLength, target]);

  const answer = useCallback((note: string) => {
    if (soundEnabled) void playPianoTone(note);
    setPressed(note); window.setTimeout(() => setPressed(null), 110);
    recordAnswer(note);
  }, [recordAnswer, soundEnabled]);

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
    setDeckId(id); setTarget(randomNote(DECKS[id].notes)); setReviewTargets(null); setCompleted(false); setMessage("新牌组已载入，看谱并作答。"); setAttempts([]); resetFeedback();
  }

  function restartPractice(onlyWrong: boolean) {
    const nextTargets = onlyWrong ? attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.target) : null;
    setReviewTargets(nextTargets); setTarget(nextTargets?.[0] ?? randomNote(DECKS[deckId].notes)); setAttempts([]); setCompleted(false); resetFeedback();
    setMessage(onlyWrong ? "开始复练本轮错音。" : "新一轮开始，看谱并作答。");
  }

  const keyboardKeys = useMemo(() => PLAYABLE_NOTES.map((note) => ({ note, key: NOTE_TO_KEY[note], black: note.includes("#") })), []);
  return <main className="flashcards-page reading-page shell">
    <SiteHeader area="piano" currentHref="/reading/" currentLabel="读谱训练" actions={<><button className={`sound-button ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? "♩ 钢琴音色" : "♩ 声音关"}</button><MidiConnect onNote={answer} /></>} />
    <section className="flash-hero"><p className="eyebrow">SIGHT-READING TRAINING · NO RHYTHM YET</p><h1>看见一个音，<em>立刻找到它。</em></h1><p>没有节奏和旋律负担；只练五线谱位置与琴键之间的即时反应。</p></section>
    <section className="flash-workspace" aria-label="读谱训练">
      <aside className="flash-decks"><div className="section-heading"><span>选择训练范围</span><small>由易到难</small></div>{(Object.entries(DECKS) as [DeckId, typeof deck][]).map(([id, item], index) => <button key={id} onClick={() => chooseDeck(id)} className={`flash-deck ${id === deckId ? "selected" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}<small>{item.description}</small></strong></button>)}<div className="session-size"><span>每轮题数</span><div>{[10, 20, 30].map((size) => <button key={size} className={sessionSize === size ? "selected" : ""} onClick={() => { setSessionSize(size); setAttempts([]); setReviewTargets(null); setCompleted(false); }}>{size}</button>)}</div></div><div className="flash-tip">无论对错都会继续，完成后统一查看结果并复练错音。</div></aside>
      <div className="flash-card-area"><div className="flash-status"><span>{reviewTargets ? "错题复练" : deck.label} · {completed ? `${sessionLength} 题完成` : `第 ${attempts.length + 1} / ${sessionLength} 题`}</span><button className={`hint-toggle ${showHints ? "on" : ""}`} onClick={() => setShowHints((value) => !value)} aria-pressed={showHints}>{showHints ? "琴键提示：开" : "琴键提示：关"}</button></div>{completed ? <PracticeResults attempts={attempts} showOnlyWrong onReviewWrong={() => restartPractice(true)} onRestart={() => restartPractice(false)} restartLabel="再练一轮" /> : <><TrebleStaff className={`flash-staff ${feedback}`} ariaLabel="请辨认这个五线谱音符" notes={[target]} noteClassName="flash-note" notePosition={() => ({ left: "50%" })} noteLabel={() => showHints ? target : null} /><div className="flash-feedback"><span className={feedback === "wrong" ? "error-dot" : "good-dot"}>{feedback === "correct" ? "✓" : feedback === "wrong" ? "×" : "●"}</span><strong>{message}</strong></div><div className="flash-metrics flash-progress"><span>当前进度 <b>{attempts.length} / {sessionLength}</b></span></div></>}</div>
    </section>
    <section className="keyboard-section flash-keyboard"><div className="keyboard-caption"><span><b>电脑键盘</b>{showHints ? " · 低音：Z–M　中音：Q–U　高音：I–]" : " · 盲练模式"}</span>{!completed && <button className="skip-card" onClick={() => recordAnswer("跳过")}>跳过此题 →</button>}</div><div className={`piano ${showHints ? "" : "hints-off"}`} aria-label="32 键虚拟钢琴">{keyboardKeys.filter(({ black }) => !black).map(({note,key}) => <button key={note} className={`white-key ${pressed === note ? "pressed" : ""} ${showHints && !completed && target === note ? "target" : ""}`} onClick={() => answer(note)}><b>{note.replace("#", "")}</b><kbd>{key.toUpperCase()}</kbd></button>)}<div className="black-keys">{keyboardKeys.filter(({ black }) => black).map(({note,key}) => { const index = PLAYABLE_NOTES.indexOf(note); const whiteBefore = PLAYABLE_NOTES.slice(0,index).filter((value) => !value.includes("#")).length; return <button key={note} className={`black-key ${pressed === note ? "pressed" : ""} ${showHints && !completed && target === note ? "target" : ""}`} style={{ left:`calc(${whiteBefore * 100 / WHITE_KEY_COUNT}% - 2.55%)` }} onClick={() => answer(note)}><kbd>{key.toUpperCase()}</kbd></button>; })}</div></div></section>
  </main>;
}
