"use client";

import { instrument, type Player } from "soundfont-player";
import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";

type Score = {
  id: string;
  title: string;
  composer: string;
  level: string;
  notes: string[];
  shared?: boolean;
};

const PLAYABLE_NOTES = [
  "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
  "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5",
];
const KEY_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "a", "s", "d", "f", "g", "h", "j", "k"];
const KEY_TO_NOTE = Object.fromEntries(KEY_LABELS.map((key, index) => [key, PLAYABLE_NOTES[index]]));
const FLAT_TO_SHARP: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", Fb: "E" };
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
      notes: PLAYABLE_NOTES,
    }).then((player) => (grandPiano = player));
  }
  const player = grandPiano ?? await pianoLoading;
  player.play(note, context.currentTime, { gain: 0.72, attack: 0.01, decay: 0.16, sustain: 0.42, release: 1.3 });
}

const FOUNDATION: Score[] = [
  { id: "ode", title: "欢乐颂 · 主题", composer: "贝多芬", level: "01 · 初识音高", notes: ["E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","E4","D4","D4"] },
  { id: "minuet", title: "G 大调小步舞曲 · 主题", composer: "巴赫（归属存疑）", level: "02 · 连续级进", notes: ["D4","G4","A4","B4","C5","D5","D5","D5","E5","D5","C5","B4","A4","G4","G4","G4"] },
  { id: "turkish", title: "土耳其进行曲 · 主题", composer: "莫扎特", level: "03 · 跨越与回归", notes: ["A4","G#4","A4","G#4","A4","E5","D5","C5","B4","A4","G#4","A4","B4","C5","D5","E5"] },
];

function pitchToY(note: string) {
  const natural = note[0];
  const octave = Number(note.at(-1));
  const steps: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const diatonic = octave * 7 + steps[natural];
  const e4 = 4 * 7 + 2;
  // E4 is the bottom treble-staff line at y=122px; every diatonic step is half a staff-line gap.
  return 112 - (diatonic - e4) * 10;
}

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
  const [isWrong, setIsWrong] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [xml, setXml] = useState("");
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [importError, setImportError] = useState("");
  const [saving, setSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundStatus, setSoundStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const selected = scores.find((score) => score.id === scoreId) ?? scores[0];
  const current = selected.notes[cursor];
  const progress = selected.notes.length ? Math.round((cursor / selected.notes.length) * 100) : 0;
  const inRange = selected.notes.every((note) => PLAYABLE_NOTES.includes(note));

  useEffect(() => {
    fetch("/api/scores").then((response) => response.ok ? response.json() : []).then((data: Score[]) => {
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
    if (!inRange) { setMessage("这首谱子包含超出 32 键范围的音，请先移调后再练习。 "); return; }
    if (note === current) {
      if (cursor + 1 >= selected.notes.length) {
        setCursor(selected.notes.length);
        setMessage("完成！再弹任意琴键可从头练习。 ");
      } else {
        setCursor((value) => value + 1);
        setMessage("正确，继续。 ");
      }
    } else if (cursor >= selected.notes.length) {
      setCursor(0); setMessage("已从头开始。 ");
    } else {
      setIsWrong(true); setMessage(`再试一次：目标音是 ${current}。`);
      window.setTimeout(() => setIsWrong(false), 360);
    }
  }, [current, cursor, inRange, selected.notes.length, soundEnabled, soundStatus]);

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
    setScoreId(id); setCursor(0); setMessage("新曲目已载入，从第一个音开始。 ");
  }

  async function importScore() {
    try {
      setSaving(true); setImportError("");
      const notes = parseMusicXml(xml);
      if (!notes.every((note) => PLAYABLE_NOTES.includes(note))) throw new Error("这份谱含有超出 C3–G5 的音。请先在制谱软件中移调后再导入。 ");
      if (!title.trim()) throw new Error("请给谱子一个标题。 ");
      const response = await fetch("/api/scores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, composer, level: "自定义 · 公共谱库", notes, musicXml: xml }) });
      const created = await response.json();
      if (!response.ok) throw new Error(created.error ?? "保存失败，请稍后重试。 ");
      setScores((all) => [created, ...all]);
      setScoreId(created.id); setCursor(0); setIsImporting(false); setXml(""); setTitle(""); setComposer("");
      setMessage("已保存到公共谱库，现在开始练习。 ");
    } catch (error) { setImportError(error instanceof Error ? error.message : "导入失败。 "); }
    finally { setSaving(false); }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setXml(await file.text());
  }

  const keyboardKeys = useMemo(() => PLAYABLE_NOTES.map((note, index) => ({ note, key: KEY_LABELS[index], black: note.includes("#") })), []);

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="谱练首页"><span>谱</span>练</a>
      <div className="top-note"><i />32 键练习音域 <b>C3 — G5</b></div>
      <button className={`sound-button ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled}>{!soundEnabled ? "♩ 声音关" : soundStatus === "loading" ? "♩ 加载钢琴…" : soundStatus === "error" ? "♩ 声音不可用" : "♩ 钢琴音色"}</button>
      <button className="import-button" onClick={() => setIsImporting(true)}>＋ 导入 MusicXML</button>
    </header>

    <section id="top" className="intro">
      <p className="eyebrow">SIGHT-READING STUDIO · NO RHYTHM YET</p>
      <h1>把每一个音，<em>弹得笃定。</em></h1>
      <p>看五线谱，用键盘回答。先只专注音高，再一步步走向真正的钢琴谱。</p>
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
        <div className={`staff ${isWrong ? "wrong" : ""}`} aria-label={`当前目标音：${current ?? "已完成"}`}>
          <div className="clef">𝄞</div>{[0, 1, 2, 3, 4].map((line) => <i key={line} className="staff-line" style={{ top: 42 + line * 20 }} />)}
          <div className="notes-row">{selected.notes.map((note, index) => <span key={`${note}-${index}`} className={`written-note ${index === cursor ? "current" : ""} ${index < cursor ? "done" : ""}`} style={{ left: `${96 + index * (Math.min(680 / Math.max(selected.notes.length - 1, 1), 48))}px`, top: pitchToY(note) }}><b>{note.includes("#") ? "♯" : ""}</b><i /><small>{index === cursor ? note : ""}</small></span>)}</div>
        </div>
        <div className="feedback"><span className={isWrong ? "error-dot" : "good-dot"}>{cursor >= selected.notes.length ? "✓" : isWrong ? "×" : "●"}</span><strong>{message}</strong><span className="next-note">下一音 <b>{current ?? "完成"}</b></span></div>
        <div className="progress"><i style={{ width: `${progress}%` }} /></div>
        <div className="progress-label"><span>进度</span><b>{progress}%</b></div>
      </div>
    </section>

    <section className="keyboard-section">
      <div className="keyboard-caption"><span><b>电脑键盘</b> · 数字行 → QWERTY → ASDFGHJK</span><span>点击琴键也可练习</span></div>
      <div className="piano" aria-label="32 键虚拟钢琴">
        {keyboardKeys.filter(({ black }) => !black).map(({ note, key }) => <button key={note} className={`white-key ${pressed === note ? "pressed" : ""} ${current === note ? "target" : ""}`} onClick={() => playNote(note)}><b>{note.replace("#", "")}</b><kbd>{key}</kbd></button>)}
        <div className="black-keys">{keyboardKeys.filter(({ black }) => black).map(({ note, key }) => { const index = PLAYABLE_NOTES.indexOf(note); const whiteBefore = PLAYABLE_NOTES.slice(0, index).filter((value) => !value.includes("#")).length; return <button key={note} style={{ left: `calc(${whiteBefore * 100 / 19}% - 2.55%)` }} className={`black-key ${pressed === note ? "pressed" : ""} ${current === note ? "target" : ""}`} onClick={() => playNote(note)}><kbd>{key}</kbd></button>; })}</div>
      </div>
      <div className="range-note">练习音域固定为 <b>C3–G5</b>。导入的谱子建议先在 MuseScore、Dorico 或 Finale 中移调至此范围。</div>
    </section>

    {isImporting && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="导入 MusicXML"><div className="import-panel">
      <button className="close" onClick={() => setIsImporting(false)} aria-label="关闭">×</button><p className="eyebrow">PUBLIC SCORE LIBRARY</p><h2>导入一份五线谱</h2><p>使用 MusicXML（.musicxml / .xml）保存完整的五线谱信息。我们会提取音高，并检查是否落在 32 键范围 C3–G5。</p>
      <label>曲目名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：小星星变奏曲" /></label>
      <label>作曲者（可选）<input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="例如：莫扎特" /></label>
      <label className="file-label">选择 MusicXML 文件<input type="file" accept=".musicxml,.xml,text/xml,application/xml" onChange={handleFile} /></label>
      <label>或粘贴 MusicXML<textarea value={xml} onChange={(event: ReactKeyboardEvent<HTMLTextAreaElement> | ChangeEvent<HTMLTextAreaElement>) => setXml((event.target as HTMLTextAreaElement).value)} placeholder={'<?xml version="1.0"?>\n<score-partwise>…'} /></label>
      {importError && <p className="import-error">{importError}</p>}<button className="save-score" onClick={importScore} disabled={saving}>{saving ? "正在保存…" : "保存到公共谱库"}</button>
    </div></div>}
  </main>;
}
