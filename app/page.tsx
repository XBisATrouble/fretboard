"use client";

import { instrument, type Player } from "soundfont-player";
import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MidiConnect } from "../components/midi-connect";
import { PracticeResults, type PracticeAttempt } from "../components/practice-results";
import { TrebleStaff } from "../components/treble-staff";
import type { KeySignature } from "../lib/key-signatures";
import { KEY_TO_NOTE, NOTE_TO_KEY, PIANO_RANGE_LABEL, PLAYABLE_NOTES, SOUND_FONT_NOTES, WHITE_KEY_COUNT } from "../lib/piano-range";
import { getPiece } from "../lib/repertoire";
import { sitePath } from "../lib/site-path";
import { usePracticeInput } from "../lib/use-practice-input";

type Score = {
  id: string;
  title: string;
  composer: string;
  level: string;
  notes: string[];
  keySignature?: KeySignature;
  shared?: boolean;
};

const FLAT_TO_SHARP: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", Fb: "E" };
const SCORES_API_URL = process.env.NEXT_PUBLIC_SCORES_API_URL ?? "/api/scores";
const SCORES_API_TOKEN = process.env.NEXT_PUBLIC_SCORES_API_TOKEN;
const scoresApiHeaders = SCORES_API_TOKEN ? { "OAI-Sites-Authorization": `Bearer ${SCORES_API_TOKEN}` } : {};
let audioContext: AudioContext | null = null;
let grandPiano: Player | null = null;
let pianoLoading: Promise<Player> | null = null;

async function playPianoTone(note: string) {
  const context = audioContext ?? new AudioContext();
  audioContext = context;
  if (context.state === "suspended") await context.resume();
  if (!pianoLoading) {
    pianoLoading = instrument(context, "acoustic_grand_piano", {
      soundfont: "MusyngKite",
      // MIDI.js stores the raised notes with flat names (Db, Eb, …); loading those
      // sample names ensures the player also has audio buffers for C#, D#, F#, G#, and A#.
      notes: SOUND_FONT_NOTES,
    }).then((player) => (grandPiano = player));
  }
  const player = grandPiano ?? await pianoLoading;
  player.play(note, context.currentTime, { gain: 0.72, attack: 0.01, decay: 0.16, sustain: 0.42, release: 1.3 });
}

const odeToJoy = getPiece("ode-to-joy")!;
const minuetInG = getPiece("minuet-g")!;

const FOUNDATION: Score[] = [
  { id: "ode", title: "欢乐颂 · 主题", composer: odeToJoy.composer, level: "01 · 初识音高", keySignature: odeToJoy.keySignature, notes: odeToJoy.systems[0] },
  { id: "minuet", title: "G 大调小步舞曲 · 主题", composer: minuetInG.composer, level: "02 · 连续级进", keySignature: minuetInG.keySignature, notes: minuetInG.systems[0] },
  { id: "turkish", title: "土耳其进行曲 · 主题", composer: "莫扎特", level: "03 · 半音与跨越", notes: ["B4","A4","G#4","A4","C5","D5","C5","B4","C5","E5","F5","E5","D#5","E5","B5","A5"] },
];

function parseMusicXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("MusicXML 不是有效 XML。 ");
  const notes = Array.from(document.querySelectorAll("note"))
    .filter((note) => !note.querySelector("rest"))
    .map((note) => {
      const step = note.querySelector("pitch > step")?.textContent?.trim();
      const alter = note.querySelector("pitch > alter")?.textContent?.trim();
      const octave = note.querySelector("pitch > octave")?.textContent?.trim();
      if (!step || !octave) return null;
      const accidental = alter === "1" ? "#" : alter === "-1" ? "b" : "";
      const base = `${step}${accidental}`;
      if (base === "B#") return `C${Number(octave) + 1}`;
      if (base === "E#") return `F${octave}`;
      return `${FLAT_TO_SHARP[base] ?? base}${octave}`;
    }).filter((note): note is string => Boolean(note));
  if (!notes.length) throw new Error("没有读到可练习的音符。 ");
  return notes;
}

export default function Home() {
  const [scores, setScores] = useState<Score[]>(FOUNDATION);
  const [scoreId, setScoreId] = useState("ode");
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("按下高亮音符对应的键，开始练习。 ");
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [reviewNotes, setReviewNotes] = useState<string[] | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [xml, setXml] = useState("");
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [importError, setImportError] = useState("");
  const [saving, setSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundStatus, setSoundStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [showKeyHints, setShowKeyHints] = useState(false);
  const { feedback, acceptInput, flashFeedback, resetFeedback } = usePracticeInput();
  const selected = scores.find((score) => score.id === scoreId) ?? scores[0];
  const practiceNotes = reviewNotes ?? selected.notes;
  const current = practiceNotes[cursor];
  const completed = cursor >= practiceNotes.length;
  const progress = practiceNotes.length ? Math.round((cursor / practiceNotes.length) * 100) : 0;
  const inRange = practiceNotes.every((note) => PLAYABLE_NOTES.includes(note));

  useEffect(() => {
    fetch(SCORES_API_URL, { headers: scoresApiHeaders }).then((response) => response.ok ? response.json() : []).then((data: Score[]) => {
      if (Array.isArray(data) && data.length) setScores((existing) => [...existing, ...data]);
    }).catch(() => undefined);
  }, []);

  const playNote = useCallback((note: string) => {
    if (soundEnabled) {
      if (soundStatus !== "ready") setSoundStatus("loading");
      void playPianoTone(note).then(() => setSoundStatus("ready")).catch(() => setSoundStatus("error"));
    }
    setPressed(note);
    window.setTimeout(() => setPressed(null), 100);
    if (!acceptInput()) return;
    if (!inRange) { setMessage("这首谱子包含超出 32 键范围的音，请先移调后再练习。 "); return; }
    if (completed || !current) return;

    const correct = note === current;
    setAttempts((all) => [...all, { target: current, played: note, correct }]);
    flashFeedback(correct ? "correct" : "wrong");
    if (cursor + 1 >= practiceNotes.length) {
      setCursor(practiceNotes.length);
      setMessage("本轮完成，请查看结果。 ");
    } else {
      setCursor((value) => value + 1);
      setMessage(correct ? "已记录，继续。 " : "已记录，继续下一音。 ");
    }
  }, [acceptInput, completed, current, cursor, flashFeedback, inRange, practiceNotes.length, soundEnabled, soundStatus]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
      const note = KEY_TO_NOTE[event.key.toLowerCase()];
      if (note && !event.repeat) { event.preventDefault(); playNote(note); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playNote]);

  function chooseScore(id: string) {
    setScoreId(id); setReviewNotes(null); setCursor(0); setAttempts([]); resetFeedback(); setMessage("新曲目已载入，从第一个音开始。 ");
  }

  function restartPractice(onlyWrong: boolean) {
    const nextNotes = onlyWrong ? attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.target) : null;
    setReviewNotes(nextNotes); setCursor(0); setAttempts([]); resetFeedback();
    setMessage(onlyWrong ? "开始复练本轮错音。 " : "已从第一个音重新开始。 ");
  }

  async function importScore() {
    try {
      setSaving(true); setImportError("");
      const notes = parseMusicXml(xml);
      if (!notes.every((note) => PLAYABLE_NOTES.includes(note))) throw new Error(`这份谱含有超出 ${PIANO_RANGE_LABEL} 的音。请先在制谱软件中移调后再导入。 `);
      if (!title.trim()) throw new Error("请给谱子一个标题。 ");
      const response = await fetch(SCORES_API_URL, { method: "POST", headers: { ...scoresApiHeaders, "content-type": "application/json" }, body: JSON.stringify({ title, composer, level: "自定义 · 公共谱库", notes, musicXml: xml }) });
      const created = await response.json();
      if (!response.ok) throw new Error(created.error ?? "保存失败，请稍后重试。 ");
      setScores((all) => [created, ...all]);
      setScoreId(created.id); setReviewNotes(null); setCursor(0); setAttempts([]); resetFeedback(); setIsImporting(false); setXml(""); setTitle(""); setComposer("");
      setMessage("已保存到公共谱库，现在开始练习。 ");
    } catch (error) { setImportError(error instanceof Error ? error.message : "导入失败。 "); }
    finally { setSaving(false); }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setXml(await file.text());
  }

  const keyboardKeys = useMemo(() => PLAYABLE_NOTES.map((note) => ({ note, key: NOTE_TO_KEY[note], black: note.includes("#") })), []);

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="谱练首页"><span>谱</span>练</a>
      <a className="library-link" href={sitePath("/flashcards/")}>读谱闪卡</a>
      <a className="library-link" href={sitePath("/library/")}>完整曲库</a>
      <a className="library-link" href={sitePath("/fretboard/")}>指板白板</a>
      <a className="library-link" href={sitePath("/arpeggio/")}>琶音练习</a>
      <a className="library-link" href={sitePath("/triads/")}>三和弦练习</a>
      <div className="top-note"><i />TINY 32 键音域 <b>F3 — C6</b></div>
      <button className={`sound-button ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled}>{!soundEnabled ? "♩ 声音关" : soundStatus === "loading" ? "♩ 加载钢琴…" : soundStatus === "error" ? "♩ 声音不可用" : "♩ 钢琴音色"}</button>
      <MidiConnect onNote={playNote} />
      <button className="import-button" onClick={() => setIsImporting(true)}>＋ 导入 MusicXML</button>
    </header>

    <section id="top" className="intro">
      <p className="eyebrow">SIGHT-READING STUDIO · NO RHYTHM YET</p>
      <h1>把每一个音，<em>弹得笃定。</em></h1>
      <p>看五线谱，用键盘回答。先只专注音高；可以先用 <a href={sitePath("/flashcards/")}>读谱闪卡 →</a> 建立反应，再练 <a href={sitePath("/library/")}>完整小品 →</a></p>
    </section>

    <section className="workspace" aria-label="五线谱练习区">
      <aside className="repertoire">
        <div className="section-heading"><span>练习曲目</span><small>由低到高</small></div>
        {scores.map((score, index) => <button key={score.id} onClick={() => chooseScore(score.id)} className={`piece ${score.id === selected.id ? "selected" : ""}`}>
          <span className="piece-no">{score.shared ? "＋" : String(index + 1).padStart(2, "0")}</span>
          <span><strong>{score.title}</strong><small>{score.composer} · {score.level}</small></span>
          {score.id === selected.id && <b>正在练习</b>}
        </button>)}
        <div className="library-note">公共谱库 · 无需登录<br />新增后所有访客都能练习</div>
      </aside>

      <div className="practice-card">
        <div className="practice-meta"><span>{selected.level}</span><span>{selected.composer}</span></div>
        <h2>{selected.title}</h2>
        {completed ? <PracticeResults attempts={attempts} keySignature={selected.keySignature} onReviewWrong={() => restartPractice(true)} onRestart={() => restartPractice(false)} restartLabel="重新练习本曲" /> : <>
          <TrebleStaff className={feedback} ariaLabel={`当前目标音：${current}`} notes={practiceNotes} currentIndex={cursor} keySignature={selected.keySignature} notePosition={(index, count) => ({ left: `${96 + index * Math.min(680 / Math.max(count - 1, 1), 48)}px` })} noteLabel={(note, index) => index === cursor ? note : null} />
          <div className="feedback"><span className={feedback === "wrong" ? "error-dot" : "good-dot"}>{feedback === "correct" ? "✓" : feedback === "wrong" ? "×" : "●"}</span><strong>{message}</strong><span className="next-note">下一音 <b>{current}</b></span></div>
          <div className="progress"><i style={{ width: `${progress}%` }} /></div>
          <div className="progress-label"><span>{reviewNotes ? "错题复练" : "进度"}</span><b>{progress}%</b></div>
        </>}
      </div>
    </section>

    <section className="keyboard-section">
      <div className="keyboard-caption"><span><b>电脑键盘</b>{showKeyHints ? " · 低音：Z–M　中音：Q–U　高音：I–]" : " · 盲练模式"}</span><button className={`hint-toggle ${showKeyHints ? "on" : ""}`} onClick={() => setShowKeyHints((visible) => !visible)} aria-pressed={showKeyHints}>{showKeyHints ? "琴键提示：开" : "琴键提示：关"}</button></div>
      <div className={`piano ${showKeyHints ? "" : "hints-off"}`} aria-label="32 键虚拟钢琴">
        {keyboardKeys.filter(({ black }) => !black).map(({ note, key }) => <button key={note} className={`white-key ${pressed === note ? "pressed" : ""} ${showKeyHints && current === note ? "target" : ""}`} onClick={() => playNote(note)}><b>{note.replace("#", "")}</b><kbd>{key.toUpperCase()}</kbd></button>)}
        <div className="black-keys">{keyboardKeys.filter(({ black }) => black).map(({ note, key }) => { const index = PLAYABLE_NOTES.indexOf(note); const whiteBefore = PLAYABLE_NOTES.slice(0, index).filter((value) => !value.includes("#")).length; return <button key={note} style={{ left: `calc(${whiteBefore * 100 / WHITE_KEY_COUNT}% - 2.55%)` }} className={`black-key ${pressed === note ? "pressed" : ""} ${showKeyHints && current === note ? "target" : ""}`} onClick={() => playNote(note)}><kbd>{key.toUpperCase()}</kbd></button>; })}</div>
      </div>
      <div className="range-note">练习音域按照 MIDIPLUS TINY 默认布局固定为 <b>{PIANO_RANGE_LABEL}</b>。导入的谱子建议先在 MuseScore、Dorico 或 Finale 中移调至此范围。</div>
    </section>

    {isImporting && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="导入 MusicXML"><div className="import-panel">
      <button className="close" onClick={() => setIsImporting(false)} aria-label="关闭">×</button><p className="eyebrow">PUBLIC SCORE LIBRARY</p><h2>导入一份五线谱</h2><p>使用 MusicXML（.musicxml / .xml）保存完整的五线谱信息。我们会提取音高，并检查是否落在 TINY 32 键范围 {PIANO_RANGE_LABEL}。</p>
      <label>曲目名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：小星星变奏曲" /></label>
      <label>作曲者（可选）<input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="例如：莫扎特" /></label>
      <label className="file-label">选择 MusicXML 文件<input type="file" accept=".musicxml,.xml,text/xml,application/xml" onChange={handleFile} /></label>
      <label>或粘贴 MusicXML<textarea value={xml} onChange={(event: ReactKeyboardEvent<HTMLTextAreaElement> | ChangeEvent<HTMLTextAreaElement>) => setXml((event.target as HTMLTextAreaElement).value)} placeholder={'<?xml version="1.0"?>\n<score-partwise>…'} /></label>
      {importError && <p className="import-error">{importError}</p>}<button className="save-score" onClick={importScore} disabled={saving}>{saving ? "正在保存…" : "保存到公共谱库"}</button>
    </div></div>}
  </main>;
}
