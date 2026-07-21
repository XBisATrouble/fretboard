"use client";

import { instrument, type Player } from "soundfont-player";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { KEY_TO_NOTE, NOTE_TO_KEY, PIANO_RANGE_LABEL, PLAYABLE_NOTES, SOUND_FONT_NOTES, WHITE_KEY_COUNT } from "../lib/piano-range";
import { usePracticeInput } from "../lib/use-practice-input";
import { MidiConnect } from "./midi-connect";
import { PracticeResults, type PracticeAttempt } from "./practice-results";
import { SiteHeader } from "./site-header";
import { TrebleStaff } from "./treble-staff";

type CommunityScore = { id: string; title: string; composer: string; level: string; notes: string[]; shared?: boolean };

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
  if (!pianoLoading) pianoLoading = instrument(context, "acoustic_grand_piano", { soundfont: "MusyngKite", notes: SOUND_FONT_NOTES }).then((player) => (grandPiano = player));
  const player = grandPiano ?? await pianoLoading;
  player.play(note, context.currentTime, { gain: .72, attack: .01, decay: .16, sustain: .42, release: 1.3 });
}

function parseMusicXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("MusicXML 不是有效 XML。");
  const notes = Array.from(document.querySelectorAll("note")).filter((note) => !note.querySelector("rest")).map((note) => {
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
  if (!notes.length) throw new Error("没有读到可练习的音符。");
  return notes;
}

export function CommunityScores() {
  const [scores, setScores] = useState<CommunityScore[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingScores, setLoadingScores] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [reviewNotes, setReviewNotes] = useState<string[] | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [message, setMessage] = useState("选择一份公共乐谱开始练习。");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [xml, setXml] = useState("");
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [importError, setImportError] = useState("");
  const [saving, setSaving] = useState(false);
  const { feedback, acceptInput, flashFeedback, resetFeedback } = usePracticeInput();
  const selected = scores.find((score) => score.id === selectedId) ?? scores[0];
  const practiceNotes = reviewNotes ?? selected?.notes ?? [];
  const current = practiceNotes[cursor];
  const completed = Boolean(selected) && cursor >= practiceNotes.length;
  const progress = practiceNotes.length ? Math.round(cursor / practiceNotes.length * 100) : 0;

  useEffect(() => {
    fetch(SCORES_API_URL, { headers: scoresApiHeaders }).then((response) => response.ok ? response.json() : []).then((data: CommunityScore[]) => {
      if (Array.isArray(data)) { setScores(data); if (data[0]) setSelectedId(String(data[0].id)); }
    }).catch(() => undefined).finally(() => setLoadingScores(false));
  }, []);

  const playNote = useCallback((note: string) => {
    if (soundEnabled) void playPianoTone(note);
    setPressed(note); window.setTimeout(() => setPressed(null), 100);
    if (!selected || !current || completed || !acceptInput()) return;
    const correct = note === current;
    setAttempts((all) => [...all, { target: current, played: note, correct }]);
    flashFeedback(correct ? "correct" : "wrong");
    if (cursor + 1 >= practiceNotes.length) { setCursor(practiceNotes.length); setMessage("本轮完成，请查看结果。"); }
    else { setCursor((value) => value + 1); setMessage(correct ? "已记录，继续。" : "已记录，继续下一音。"); }
  }, [acceptInput, completed, current, cursor, flashFeedback, practiceNotes.length, selected, soundEnabled]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || event.repeat) return;
      const note = KEY_TO_NOTE[event.key.toLowerCase()];
      if (note) { event.preventDefault(); playNote(note); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playNote]);

  function chooseScore(id: string) {
    setSelectedId(id); setReviewNotes(null); setCursor(0); setAttempts([]); resetFeedback(); setMessage("乐谱已载入，从第一个音开始。");
  }

  function restartPractice(onlyWrong: boolean) {
    const next = onlyWrong ? attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.target) : null;
    setReviewNotes(next); setCursor(0); setAttempts([]); resetFeedback(); setMessage(onlyWrong ? "开始复练本轮错音。" : "已从第一个音重新开始。");
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setXml(await file.text());
  }

  async function importScore() {
    try {
      setSaving(true); setImportError("");
      const notes = parseMusicXml(xml);
      if (!notes.every((note) => PLAYABLE_NOTES.includes(note))) throw new Error(`这份谱含有超出 ${PIANO_RANGE_LABEL} 的音，请先移调。`);
      if (!title.trim()) throw new Error("请给谱子一个标题。");
      const response = await fetch(SCORES_API_URL, { method: "POST", headers: { ...scoresApiHeaders, "content-type": "application/json" }, body: JSON.stringify({ title, composer, level: "自定义 · 公共谱库", notes, musicXml: xml }) });
      const created = await response.json();
      if (!response.ok) throw new Error(created.error ?? "保存失败，请稍后重试。");
      setScores((all) => [created, ...all]); chooseScore(String(created.id)); setIsImporting(false); setXml(""); setTitle(""); setComposer("");
    } catch (error) { setImportError(error instanceof Error ? error.message : "导入失败。"); }
    finally { setSaving(false); }
  }

  const keyboardKeys = useMemo(() => PLAYABLE_NOTES.map((note) => ({ note, key: NOTE_TO_KEY[note], black: note.includes("#") })), []);

  return <main className="community-page shell">
    <SiteHeader area="piano" currentHref="/library/" currentLabel="公共谱库" resumeHref="/library/community/" actions={<><button className={`sound-button ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? "♩ 钢琴音色" : "♩ 声音关"}</button><MidiConnect onNote={playNote} /><button className="import-button" onClick={() => setIsImporting(true)}>＋ 导入 MusicXML</button></>} />
    <section className="community-hero"><p className="eyebrow">COMMUNITY SCORES · MUSICXML</p><h1>导入乐谱，<em>一起练习。</em></h1><p>无需账号。导入的 MusicXML 会加入公共谱库，并按 MIDIPLUS TINY 的 32 键音域进行逐音练习。</p></section>
    <section className="workspace community-workspace" aria-label="公共谱库练习区">
      <aside className="repertoire"><div className="section-heading"><span>公共谱库</span><small>{loadingScores ? "加载中" : `${scores.length} 首`}</small></div>{scores.map((score, index) => <button key={score.id} onClick={() => chooseScore(String(score.id))} className={`piece ${String(score.id) === String(selected?.id) ? "selected" : ""}`}><span className="piece-no">{String(index + 1).padStart(2, "0")}</span><span><strong>{score.title}</strong><small>{score.composer || "社区谱目"} · {score.level}</small></span>{String(score.id) === String(selected?.id) && <b>正在练习</b>}</button>)}{!loadingScores && !scores.length && <div className="community-empty">公共谱库还是空的。<button onClick={() => setIsImporting(true)}>导入第一份乐谱 →</button></div>}<div className="library-note">公共谱库 · 无需登录<br />新增后所有访客都能练习</div></aside>
      <div className="practice-card">{selected ? <><div className="practice-meta"><span>{selected.level}</span><span>{selected.composer || "社区谱目"}</span></div><h2>{selected.title}</h2>{completed ? <PracticeResults attempts={attempts} onReviewWrong={() => restartPractice(true)} onRestart={() => restartPractice(false)} restartLabel="重新练习本曲" /> : <><TrebleStaff className={feedback} ariaLabel={`当前目标音：${current}`} notes={practiceNotes} currentIndex={cursor} notePosition={(index, count) => ({ left: `${96 + index * Math.min(680 / Math.max(count - 1, 1), 48)}px` })} noteLabel={(note, index) => showHints && index === cursor ? note : null} /><div className="feedback"><span className={feedback === "wrong" ? "error-dot" : "good-dot"}>{feedback === "correct" ? "✓" : feedback === "wrong" ? "×" : "●"}</span><strong>{message}</strong><span className="next-note">下一音 <b>{current}</b></span></div><div className="progress"><i style={{ width: `${progress}%` }} /></div></>}</> : <div className="community-practice-empty"><span>PUBLIC LIBRARY</span><h2>等待第一份乐谱</h2><p>导入 MusicXML 后，这里会立即出现逐音练习。</p></div>}</div>
    </section>
    {selected && <section className="keyboard-section"><div className="keyboard-caption"><span><b>电脑键盘</b>{showHints ? " · 琴键提示已开启" : " · 盲练模式"}</span><button className={`hint-toggle ${showHints ? "on" : ""}`} onClick={() => setShowHints((value) => !value)}>{showHints ? "琴键提示：开" : "琴键提示：关"}</button></div><div className={`piano ${showHints ? "" : "hints-off"}`}>{keyboardKeys.filter(({ black }) => !black).map(({ note, key }) => <button key={note} className={`white-key ${pressed === note ? "pressed" : ""} ${showHints && current === note ? "target" : ""}`} onClick={() => playNote(note)}><b>{note.replace("#", "")}</b><kbd>{key.toUpperCase()}</kbd></button>)}<div className="black-keys">{keyboardKeys.filter(({ black }) => black).map(({ note, key }) => { const index = PLAYABLE_NOTES.indexOf(note); const whiteBefore = PLAYABLE_NOTES.slice(0, index).filter((value) => !value.includes("#")).length; return <button key={note} className={`black-key ${pressed === note ? "pressed" : ""} ${showHints && current === note ? "target" : ""}`} style={{ left: `calc(${whiteBefore * 100 / WHITE_KEY_COUNT}% - 2.55%)` }} onClick={() => playNote(note)}><kbd>{key.toUpperCase()}</kbd></button>; })}</div></div></section>}
    {isImporting && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="导入 MusicXML"><div className="import-panel"><button className="close" onClick={() => setIsImporting(false)} aria-label="关闭">×</button><p className="eyebrow">PUBLIC SCORE LIBRARY</p><h2>导入一份五线谱</h2><p>使用 MusicXML（.musicxml / .xml）。系统会提取音高，并检查是否落在 TINY 32 键范围 {PIANO_RANGE_LABEL}。</p><label>曲目名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：小星星变奏曲" /></label><label>作曲者（可选）<input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="例如：莫扎特" /></label><label className="file-label">选择 MusicXML 文件<input type="file" accept=".musicxml,.xml,text/xml,application/xml" onChange={handleFile} /></label><label>或粘贴 MusicXML<textarea value={xml} onChange={(event) => setXml(event.target.value)} placeholder={'<?xml version="1.0"?>\n<score-partwise>…'} /></label>{importError && <p className="import-error">{importError}</p>}<button className="save-score" onClick={importScore} disabled={saving}>{saving ? "正在保存…" : "保存到公共谱库"}</button></div></div>}
  </main>;
}
