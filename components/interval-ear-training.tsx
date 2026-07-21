"use client";

import { instrument, type Player } from "soundfont-player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  answerOptionsForLevel,
  cadenceMidiNotes,
  directionLabel,
  generateIntervalQuestion,
  midiToAudioNote,
  type EarTrainingLevel,
  type IntervalPresentation,
  type IntervalQuestion,
} from "../lib/ear-training";
import { SOUND_FONT_NOTES } from "../lib/piano-range";
import { IntervalStaff } from "./interval-staff";
import { SiteHeader } from "./site-header";

type TrainingMode = "listening" | "audiation";
type Phase = "setup" | "loading" | "playing" | "answering" | "audiating" | "checking" | "self-rate" | "reveal" | "complete";
type Attempt = { question: IntervalQuestion; answerId: string | null; correct: boolean; replays: number };

const ANSWER_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];
const SETTINGS_KEY = "spectrum-ear-interval-settings";
const KEY_OFFSET_STORAGE = "spectrum-ear-next-key";
let audioContext: AudioContext | null = null;
let piano: Player | null = null;
let pianoLoading: Promise<Player> | null = null;

async function ensurePiano() {
  const context = audioContext ?? new AudioContext();
  audioContext = context;
  if (context.state === "suspended") await context.resume();
  if (!pianoLoading) pianoLoading = instrument(context, "acoustic_grand_piano", { soundfont: "MusyngKite", notes: SOUND_FONT_NOTES }).then((loaded) => (piano = loaded));
  return { context, player: piano ?? await pianoLoading };
}

function playMidi(player: Player, context: AudioContext, midi: number, when: number, gain = .62, duration = .8) {
  player.play(midiToAudioNote(midi), when, { gain, attack: .01, decay: .12, sustain: .45, release: 1.2, duration });
}

async function scheduleCadence(key: IntervalQuestion["key"], offset = .08) {
  const { context, player } = await ensurePiano();
  const now = context.currentTime + offset;
  cadenceMidiNotes(key).forEach((chord, chordIndex) => chord.forEach((midi) => playMidi(player, context, midi, now + chordIndex * .48, .2, .38)));
  return 2.05;
}

async function scheduleExerciseSound(question: IntervalQuestion, includeContext: boolean, firstOnly = false) {
  const { context, player } = await ensurePiano();
  const now = context.currentTime + .08;
  let delay = 0;
  if (includeContext) {
    cadenceMidiNotes(question.key).forEach((chord, chordIndex) => chord.forEach((midi) => playMidi(player, context, midi, now + chordIndex * .48, .2, .38)));
    delay = 2.05;
  }
  if (firstOnly) {
    playMidi(player, context, question.first.midi, now + delay, .64, .9);
    return { startMs: delay * 1000, secondMs: null, endMs: delay * 1000 + 1050 };
  }
  if (question.presentation === "harmonic") {
    playMidi(player, context, question.low.midi, now + delay, .5, 1.2);
    playMidi(player, context, question.high.midi, now + delay, .5, 1.2);
    return { startMs: delay * 1000, secondMs: null, endMs: delay * 1000 + 1350 };
  }
  playMidi(player, context, question.first.midi, now + delay, .62, .72);
  playMidi(player, context, question.second.midi, now + delay + .66, .62, .86);
  return { startMs: delay * 1000, secondMs: delay * 1000 + 660, endMs: delay * 1000 + 1650 };
}

function attemptAccuracy(attempts: Attempt[]) {
  return attempts.length ? Math.round(attempts.filter((attempt) => attempt.correct).length / attempts.length * 100) : 0;
}

function intervalPerformance(attempts: Attempt[]) {
  const result = new Map<string, { label: string; correct: number; total: number }>();
  attempts.forEach((attempt) => {
    const current = result.get(attempt.question.interval.id) ?? { label: attempt.question.interval.label, correct: 0, total: 0 };
    current.total += 1;
    if (attempt.correct) current.correct += 1;
    result.set(attempt.question.interval.id, current);
  });
  return [...result.values()].sort((a, b) => a.correct / a.total - b.correct / b.total);
}

function mostCommonConfusion(attempts: Attempt[]) {
  const counts = new Map<string, number>();
  attempts.filter((attempt) => !attempt.correct && attempt.answerId).forEach((attempt) => {
    const answer = answerOptionsForLevel("chromatic").find((interval) => interval.id === attempt.answerId)?.label ?? attempt.answerId;
    const key = `${attempt.question.interval.label} → ${answer}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function IntervalResults({ attempts, mode, onRestart, onReview, onPlay }: { attempts: Attempt[]; mode: TrainingMode; onRestart: () => void; onReview: (questions: IntervalQuestion[]) => void; onPlay: (question: IntervalQuestion) => void }) {
  const wrong = attempts.filter((attempt) => !attempt.correct);
  const accuracy = attemptAccuracy(attempts);
  const performance = intervalPerformance(attempts);
  const confusion = mostCommonConfusion(attempts);
  const replays = attempts.reduce((sum, attempt) => sum + attempt.replays, 0);
  const melodic = attempts.filter((attempt) => attempt.question.direction !== "harmonic");
  const ascending = melodic.filter((attempt) => attempt.question.direction === "ascending");
  const descending = melodic.filter((attempt) => attempt.question.direction === "descending");

  return <section className="interval-results" aria-live="polite">
    <div className="interval-result-summary">
      <div><span>{mode === "listening" ? "本轮正确率" : "本轮自评吻合"}</span><strong>{accuracy}<small>%</small></strong><p>{attempts.length - wrong.length} / {attempts.length} 题</p></div>
      <div className="interval-result-insight"><p>{wrong.length ? mode === "listening" ? "需要继续建立声音与谱面的连接。" : "还没听准的音程已经整理好，可以集中复练。" : "这一轮全部听准了，可以进入更高难度。"}</p>{confusion && <span>最常混淆：<b>{confusion}</b></span>}<span>主动重听：<b>{replays} 次</b></span></div>
    </div>
    {mode === "listening" && melodic.length > 0 && <div className="interval-direction-stats"><span>上行 <b>{attemptAccuracy(ascending)}%</b></span><span>下行 <b>{attemptAccuracy(descending)}%</b></span><span>当前弱项 <b>{performance[0]?.label ?? "—"}</b></span></div>}
    {wrong.length > 0 && <div className="interval-review-grid">{wrong.map((attempt, index) => <article key={`${attempt.question.id}-${index}`}>
      <div><span>{attempt.question.key.label}</span><b>{directionLabel(attempt.question.direction)} · {attempt.question.interval.label}</b></div>
      <IntervalStaff keyInfo={attempt.question.key} notes={[attempt.question.first, attempt.question.second]} presentation={attempt.question.presentation} showLabels ariaLabel={`${attempt.question.interval.label}错题五线谱`} />
      <p>{attempt.question.first.solfege}–{attempt.question.second.solfege}<small>{attempt.question.first.name} → {attempt.question.second.name}</small></p>
      <button type="button" onClick={() => onPlay(attempt.question)}>▶ 重新试听</button>
    </article>)}</div>}
    <div className="interval-result-actions">{wrong.length > 0 && <button type="button" onClick={() => onReview(wrong.map((attempt) => attempt.question))}>只练这些题</button>}<button type="button" className="secondary" onClick={onRestart}>再练一轮</button></div>
  </section>;
}

export function IntervalEarTraining() {
  const [mode, setMode] = useState<TrainingMode>("listening");
  const [level, setLevel] = useState<EarTrainingLevel>("tonic");
  const [presentation, setPresentation] = useState<IntervalPresentation>("melodic");
  const [sessionSize, setSessionSize] = useState(20);
  const [phase, setPhase] = useState<Phase>("setup");
  const [question, setQuestion] = useState<IntervalQuestion | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<number | "both" | null>(null);
  const [message, setMessage] = useState("选择训练范围，然后开始第一轮。");
  const [replays, setReplays] = useState(0);
  const [soundStatus, setSoundStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [reviewQuestions, setReviewQuestions] = useState<IntervalQuestion[] | null>(null);
  const timers = useRef<number[]>([]);
  const reviewQueue = useRef<IntervalQuestion[] | null>(null);
  const settingsLoaded = useRef(false);
  const sessionKeyOffset = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);
  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
    return timer;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as { mode?: TrainingMode; level?: EarTrainingLevel; presentation?: IntervalPresentation; sessionSize?: number } | null;
        if (stored?.mode === "listening" || stored?.mode === "audiation") setMode(stored.mode);
        if (stored?.level && stored.level in LEVELS) setLevel(stored.level);
        if (stored?.presentation === "melodic" || stored?.presentation === "harmonic" || stored?.presentation === "mixed") setPresentation(stored.presentation);
        if ([10, 20, 30].includes(stored?.sessionSize ?? 0)) setSessionSize(stored!.sessionSize!);
      } catch { /* Local settings are optional. */ }
      settingsLoaded.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!settingsLoaded.current) return;
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ mode, level, presentation, sessionSize })); } catch { /* Local settings are optional. */ }
  }, [level, mode, presentation, sessionSize]);

  const answerOptions = useMemo(() => answerOptionsForLevel(level), [level]);
  const goal = reviewQuestions?.length ?? sessionSize;
  const locked = phase !== "setup" && phase !== "complete";

  const returnToSetup = useCallback(() => {
    clearTimers(); reviewQueue.current = null; setReviewQuestions(null); setAttempts([]); setQuestion(null); setSelectedAnswer(null); setActiveNote(null); setPhase("setup"); setMessage("选择训练范围，然后开始第一轮。");
  }, [clearTimers]);

  const highlightScheduledSound = useCallback(async (target: IntervalQuestion, includeContext: boolean, firstOnly: boolean, reveal: boolean) => {
    const timing = await scheduleExerciseSound(target, includeContext, firstOnly);
    if (reveal || firstOnly) {
      later(() => setActiveNote(target.presentation === "harmonic" && !firstOnly ? "both" : 0), timing.startMs);
      if (timing.secondMs !== null && !firstOnly) later(() => setActiveNote(1), timing.secondMs);
      later(() => setActiveNote(null), timing.endMs);
    }
    return timing;
  }, [later]);

  const presentQuestion = useCallback(async (target: IntervalQuestion, includeContext: boolean, trainingMode: TrainingMode) => {
    clearTimers();
    setQuestion(target); setSelectedAnswer(null); setActiveNote(null); setReplays(0); setPhase("playing");
    setMessage(includeContext ? `先听 ${target.key.label} 的调性感。` : trainingMode === "listening" ? "仔细听，不显示音高和方向。" : "先听起始音。" );
    try {
      const timing = await highlightScheduledSound(target, includeContext, trainingMode === "audiation", trainingMode === "audiation");
      later(() => {
        if (trainingMode === "listening") { setPhase("answering"); setMessage("请选择你听到的音程。"); }
        else { setPhase("audiating"); setMessage("先在心里听见第二个音，再尝试唱出来。"); }
      }, timing.endMs);
    } catch {
      setSoundStatus("error"); setPhase("setup"); setMessage("声音加载失败，请点击重试。");
    }
  }, [clearTimers, highlightScheduledSound, later]);

  const beginSession = useCallback(async (queue: IntervalQuestion[] | null = null) => {
    clearTimers(); reviewQueue.current = queue; setReviewQuestions(queue); setAttempts([]); setQuestion(null); setPhase("loading"); setMessage("正在准备钢琴音色…"); setSoundStatus("loading");
    try {
      await ensurePiano(); setSoundStatus("ready");
      if (!queue) {
        try { sessionKeyOffset.current = Number(window.localStorage.getItem(KEY_OFFSET_STORAGE) ?? 0) || 0; } catch { sessionKeyOffset.current = 0; }
      }
      const first = queue?.[0] ?? generateIntervalQuestion(level, sessionKeyOffset.current, presentation);
      await presentQuestion(first, true, mode);
    } catch {
      setSoundStatus("error"); setPhase("setup"); setMessage("声音加载失败，请检查网络后重试。");
    }
  }, [clearTimers, level, mode, presentation, presentQuestion]);

  const advance = useCallback((nextAttempts: Attempt[]) => {
    clearTimers();
    const targetGoal = reviewQueue.current?.length ?? sessionSize;
    if (nextAttempts.length >= targetGoal) {
      if (!reviewQueue.current) {
        const nextOffset = (sessionKeyOffset.current + Math.ceil(targetGoal / 5)) % 12;
        try { window.localStorage.setItem(KEY_OFFSET_STORAGE, String(nextOffset)); } catch { /* Local progress is optional. */ }
      }
      setPhase("complete"); setQuestion(null); setMessage("本轮完成，请查看听觉与谱面反馈。"); return;
    }
    const index = nextAttempts.length;
    const next = reviewQueue.current?.[index] ?? generateIntervalQuestion(level, sessionKeyOffset.current + Math.floor(index / 5), presentation, nextAttempts.at(-1)?.question.interval.id);
    const previous = nextAttempts.at(-1)?.question;
    void presentQuestion(next, index % 5 === 0 || previous?.key.id !== next.key.id, mode);
  }, [clearTimers, level, mode, presentation, presentQuestion, sessionSize]);

  const answer = useCallback((answerId: string) => {
    if (phase !== "answering" || !question) return;
    clearTimers(); setSelectedAnswer(answerId); setPhase("reveal");
    const correct = answerId === question.interval.id;
    const nextAttempts = [...attempts, { question, answerId, correct, replays }];
    setAttempts(nextAttempts); setMessage(correct ? "听对了。把声音、谱面和名称连在一起。" : `正确答案是${question.interval.label}，看谱再听一次。`);
    void highlightScheduledSound(question, false, false, true).then((timing) => later(() => advance(nextAttempts), Math.max(2200, timing.endMs + 450)));
  }, [advance, attempts, clearTimers, highlightScheduledSound, later, phase, question, replays]);

  const replayQuestion = useCallback(() => {
    if (!question || (phase !== "answering" && phase !== "audiating")) return;
    clearTimers(); setReplays((value) => value + 1); setPhase("playing"); setMessage(mode === "listening" ? "再听一次，仍然不会显示方向。" : "重新听起始音。");
    void highlightScheduledSound(question, false, mode === "audiation", mode === "audiation").then((timing) => later(() => {
      setPhase(mode === "listening" ? "answering" : "audiating");
      setMessage(mode === "listening" ? "请选择你听到的音程。" : "先在心里听见第二个音，再尝试唱出来。");
    }, timing.endMs));
  }, [clearTimers, highlightScheduledSound, later, mode, phase, question]);

  const checkAudiation = useCallback(() => {
    if (phase !== "audiating" || !question) return;
    clearTimers(); setPhase("checking"); setMessage("现在播放核对：先听目标音，再听完整音程。");
    void highlightScheduledSound(question, false, false, true).then((timing) => later(() => { setPhase("self-rate"); setMessage("你唱出的音与目标音吻合吗？"); }, timing.endMs + 200));
  }, [clearTimers, highlightScheduledSound, later, phase, question]);

  const rateAudiation = useCallback((correct: boolean) => {
    if (phase !== "self-rate" || !question) return;
    const nextAttempts = [...attempts, { question, answerId: correct ? "matched" : "retry", correct, replays }];
    setAttempts(nextAttempts); setMessage(correct ? "已经听见了，继续保持。" : "已记录，稍后集中复练。"); setPhase("reveal");
    later(() => advance(nextAttempts), 700);
  }, [advance, attempts, later, phase, question, replays]);

  const reaffirmKey = useCallback(() => {
    if (!question || phase === "loading" || phase === "playing") return;
    clearTimers(); setPhase("playing"); setMessage(`重新确认 ${question.key.label}。`);
    void scheduleCadence(question.key).then((duration) => later(() => {
      setPhase(mode === "listening" ? "answering" : "audiating");
      setMessage(mode === "listening" ? "调性感已确认，请重新播放题目。" : "调性感已确认，再从起始音开始预听。");
    }, duration * 1000));
  }, [clearTimers, later, mode, phase, question]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || event.repeat) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (phase === "audiating") checkAudiation(); else replayQuestion();
        return;
      }
      const index = ANSWER_KEYS.indexOf(event.key);
      if (index >= 0 && answerOptions[index]) { event.preventDefault(); answer(answerOptions[index].id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answer, answerOptions, checkAudiation, phase, replayQuestion]);

  const visibleNotes = question ? [question.first, question.second] as const : null;
  const reveal = phase === "reveal" || phase === "checking" || phase === "self-rate";

  return <main className="interval-page shell">
    <SiteHeader area="ear" currentHref="/ear-training/intervals/" currentLabel="音程听辨" actions={question && phase !== "complete" ? <button type="button" className="sound-button on" onClick={reaffirmKey} disabled={phase === "loading" || phase === "playing"}>♩ 重新确认调性</button> : undefined} />
    <section className="interval-hero"><p className="eyebrow">INTERVAL · INNER HEARING</p><h1>听见关系，<em>也看见它。</em></h1><p>在调性中听辨音程，再用标准五线谱把声音、音名与音级连接起来。</p></section>
    <section className="interval-mode-tabs" aria-label="选择训练方式">
      <button type="button" className={mode === "listening" ? "selected" : ""} disabled={locked} onClick={() => { setMode("listening"); returnToSetup(); }}><span>01</span><strong>听辨练习<small>先听后看，不提示方向</small></strong></button>
      <button type="button" className={mode === "audiation" ? "selected" : ""} disabled={locked} onClick={() => { setMode("audiation"); returnToSetup(); }}><span>02</span><strong>内听预唱<small>先看谱，在心里唱出目标音</small></strong></button>
    </section>
    <section className="interval-workspace">
      <aside className="interval-controls">
        <div className="section-heading"><span>训练范围</span><small>由易到难</small></div>
        {(Object.entries(LEVELS) as [EarTrainingLevel, typeof LEVELS[EarTrainingLevel]][]).map(([id, item], index) => <button type="button" key={id} className={`interval-level ${level === id ? "selected" : ""}`} disabled={locked} onClick={() => { setLevel(id); returnToSetup(); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}<small>{item.detail}</small></strong></button>)}
        <div className="interval-setting"><span>播放方式</span><div>{(["melodic", "harmonic", "mixed"] as const).map((id) => <button type="button" key={id} disabled={locked} className={presentation === id ? "selected" : ""} onClick={() => { setPresentation(id); returnToSetup(); }}>{id === "melodic" ? "旋律" : id === "harmonic" ? "和声" : "混合"}</button>)}</div></div>
        <div className="interval-setting"><span>每轮题数</span><div>{[10, 20, 30].map((size) => <button type="button" key={size} disabled={locked} className={sessionSize === size ? "selected" : ""} onClick={() => { setSessionSize(size); returnToSetup(); }}>{size}</button>)}</div></div>
        <p className="interval-control-note">每 5 题更换一次调性；旋律音程的方向随机，题目中不提示。</p>
      </aside>
      <div className="interval-stage">
        {phase === "complete" ? <IntervalResults attempts={attempts} mode={mode} onRestart={() => void beginSession(null)} onReview={(questions) => void beginSession(questions)} onPlay={(target) => void scheduleExerciseSound(target, false)} /> : <>
          <div className="interval-stage-status"><span>{reviewQuestions ? "错题复练" : LEVELS[level].label} · {question?.key.label ?? "按五度圈轮换调性"}</span><b>{phase === "setup" ? `准备 ${sessionSize} 题` : `第 ${Math.min(attempts.length + 1, goal)} / ${goal} 题`}</b></div>
          {question && visibleNotes ? <IntervalStaff keyInfo={question.key} notes={visibleNotes} presentation={question.presentation} hidden={mode === "listening" && !reveal} activeIndex={activeNote} showLabels={reveal} ariaLabel={mode === "listening" && !reveal ? `${question.key.label}空白五线谱，音符将在作答后显示` : `${question.key.label}音程五线谱`} /> : <div className="interval-start-card"><span aria-hidden="true">♪</span><h2>{mode === "listening" ? "先用耳朵回答" : "先在心里唱出来"}</h2><p>{mode === "listening" ? "题目不会显示上行、下行或具体音高；作答后再用五线谱核对。" : "五线谱会显示两个音，只播放第一个音；请先预听并唱出第二个音。"}</p><button type="button" onClick={() => void beginSession(null)} disabled={phase === "loading"}>{phase === "loading" ? "正在准备音色…" : soundStatus === "error" ? "重试并开始" : "开始练习"}</button></div>}
          {question && <div className={`interval-prompt phase-${phase}`}><span className={selectedAnswer === question.interval.id ? "correct" : selectedAnswer ? "wrong" : ""}>{phase === "reveal" && mode === "listening" ? selectedAnswer === question.interval.id ? "✓" : "×" : "●"}</span><strong>{message}</strong></div>}
          {question && phase === "answering" && <div className="interval-answer-grid">{answerOptions.map((option, index) => <button type="button" key={option.id} onClick={() => answer(option.id)}><kbd>{ANSWER_KEYS[index]}</kbd>{option.label}</button>)}</div>}
          {question && (phase === "answering" || phase === "audiating") && <div className="interval-listen-actions"><button type="button" onClick={replayQuestion}>↻ {mode === "listening" ? "再听一次" : "重听起始音"}<kbd>Space</kbd></button>{mode === "audiation" && <button type="button" className="primary" onClick={checkAudiation}>我已预唱，播放核对</button>}</div>}
          {question && phase === "self-rate" && <div className="interval-self-rate"><button type="button" onClick={() => rateAudiation(true)}>✓ 与我唱的吻合</button><button type="button" className="secondary" onClick={() => rateAudiation(false)}>还没听准</button></div>}
          {question && reveal && <div className="interval-reveal-detail"><span>{question.first.solfege} → {question.second.solfege}</span><b>{directionLabel(question.direction)} · {question.interval.label}</b><small>{question.first.name} → {question.second.name}</small></div>}
        </>}
      </div>
    </section>
  </main>;
}
