"use client";

import { instrument, type Player } from "soundfont-player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sitePath } from "../lib/site-path";

type Mode = "major" | "minor";
type Quality = "major" | "minor" | "diminished";
type ViewMode = "single" | "all";
type LabelMode = "interval" | "note";
type Inversion = "root" | "first" | "second";
type KeyChoice = { label: string; tonic: number; mode: Mode; scale: string[] };
type Triad = { degree: number; degreeLabel: string; symbol: string; quality: Quality; rootPc: number; pitchClasses: number[]; noteNames: string[]; roles: string[] };
type ShapeNote = { stringIndex: number; fret: number; midi: number; pitchClass: number; role: string; noteName: string };
type TriadShape = { notes: ShapeNote[]; inversion: Inversion; minimumFret: number; maximumFret: number };
type MarkerPoint = ShapeNote & { x: number; y: number };

const TUNING = [64, 59, 55, 50, 45, 40] as const;
const STRING_LABELS = ["1 · E", "2 · B", "3 · G", "4 · D", "5 · A", "6 · E"] as const;
const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
const QUALITY_NAMES: Record<Quality, string> = { major: "大三和弦", minor: "小三和弦", diminished: "减三和弦" };
const QUALITY_SUFFIXES: Record<Quality, string> = { major: "", minor: "m", diminished: "°" };
const QUALITY_ROLES: Record<Quality, string[]> = { major: ["R", "3", "5"], minor: ["R", "♭3", "5"], diminished: ["R", "♭3", "♭5"] };
const INVERSION_NAMES: Record<Inversion, string> = { root: "原位", first: "第一转位", second: "第二转位" };
const STRING_SETS = [
  { label: "1–2–3 弦", detail: "高音弦组" },
  { label: "2–3–4 弦", detail: "中高音弦组" },
  { label: "3–4–5 弦", detail: "中低音弦组" },
  { label: "4–5–6 弦", detail: "低音弦组" },
] as const;
const KEYS: KeyChoice[] = [
  { label: "C 大调", tonic: 0, mode: "major", scale: ["C", "D", "E", "F", "G", "A", "B"] },
  { label: "G 大调", tonic: 7, mode: "major", scale: ["G", "A", "B", "C", "D", "E", "F♯"] },
  { label: "D 大调", tonic: 2, mode: "major", scale: ["D", "E", "F♯", "G", "A", "B", "C♯"] },
  { label: "A 大调", tonic: 9, mode: "major", scale: ["A", "B", "C♯", "D", "E", "F♯", "G♯"] },
  { label: "E 大调", tonic: 4, mode: "major", scale: ["E", "F♯", "G♯", "A", "B", "C♯", "D♯"] },
  { label: "B 大调", tonic: 11, mode: "major", scale: ["B", "C♯", "D♯", "E", "F♯", "G♯", "A♯"] },
  { label: "G♭ 大调", tonic: 6, mode: "major", scale: ["G♭", "A♭", "B♭", "C♭", "D♭", "E♭", "F"] },
  { label: "D♭ 大调", tonic: 1, mode: "major", scale: ["D♭", "E♭", "F", "G♭", "A♭", "B♭", "C"] },
  { label: "A♭ 大调", tonic: 8, mode: "major", scale: ["A♭", "B♭", "C", "D♭", "E♭", "F", "G"] },
  { label: "E♭ 大调", tonic: 3, mode: "major", scale: ["E♭", "F", "G", "A♭", "B♭", "C", "D"] },
  { label: "B♭ 大调", tonic: 10, mode: "major", scale: ["B♭", "C", "D", "E♭", "F", "G", "A"] },
  { label: "F 大调", tonic: 5, mode: "major", scale: ["F", "G", "A", "B♭", "C", "D", "E"] },
  { label: "A 小调", tonic: 9, mode: "minor", scale: ["A", "B", "C", "D", "E", "F", "G"] },
  { label: "E 小调", tonic: 4, mode: "minor", scale: ["E", "F♯", "G", "A", "B", "C", "D"] },
  { label: "B 小调", tonic: 11, mode: "minor", scale: ["B", "C♯", "D", "E", "F♯", "G", "A"] },
  { label: "F♯ 小调", tonic: 6, mode: "minor", scale: ["F♯", "G♯", "A", "B", "C♯", "D", "E"] },
  { label: "C♯ 小调", tonic: 1, mode: "minor", scale: ["C♯", "D♯", "E", "F♯", "G♯", "A", "B"] },
  { label: "G♯ 小调", tonic: 8, mode: "minor", scale: ["G♯", "A♯", "B", "C♯", "D♯", "E", "F♯"] },
  { label: "D♯ 小调", tonic: 3, mode: "minor", scale: ["D♯", "E♯", "F♯", "G♯", "A♯", "B", "C♯"] },
  { label: "B♭ 小调", tonic: 10, mode: "minor", scale: ["B♭", "C", "D♭", "E♭", "F", "G♭", "A♭"] },
  { label: "F 小调", tonic: 5, mode: "minor", scale: ["F", "G", "A♭", "B♭", "C", "D♭", "E♭"] },
  { label: "C 小调", tonic: 0, mode: "minor", scale: ["C", "D", "E♭", "F", "G", "A♭", "B♭"] },
  { label: "G 小调", tonic: 7, mode: "minor", scale: ["G", "A", "B♭", "C", "D", "E♭", "F"] },
  { label: "D 小调", tonic: 2, mode: "minor", scale: ["D", "E", "F", "G", "A", "B♭", "C"] },
];
const GUITAR_SAMPLE_MIDIS = Array.from({ length: 17 }, (_, index) => 40 + index * 3);
const SOUND_FONT_NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

let audioContext: AudioContext | null = null;
let guitarPlayer: Player | null = null;
let guitarLoading: Promise<Player> | null = null;

function pitchClass(note: string) {
  const bases: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let value = bases[note[0]];
  for (const accidental of note.slice(1)) value += accidental === "♯" || accidental === "#" ? 1 : accidental === "♭" || accidental === "b" ? -1 : 0;
  return (value + 120) % 12;
}

function makeTriad(key: KeyChoice, degree: number): Triad {
  const noteNames = [key.scale[degree], key.scale[(degree + 2) % 7], key.scale[(degree + 4) % 7]];
  const pitchClasses = noteNames.map(pitchClass);
  const third = (pitchClasses[1] - pitchClasses[0] + 12) % 12;
  const fifth = (pitchClasses[2] - pitchClasses[0] + 12) % 12;
  const quality: Quality = third === 4 && fifth === 7 ? "major" : third === 3 && fifth === 6 ? "diminished" : "minor";
  const degreeLabel = `${quality === "major" ? ROMANS[degree] : ROMANS[degree].toLowerCase()}${quality === "diminished" ? "°" : ""}`;
  return { degree, degreeLabel, symbol: `${noteNames[0]}${QUALITY_SUFFIXES[quality]}`, quality, rootPc: pitchClasses[0], pitchClasses, noteNames, roles: QUALITY_ROLES[quality] };
}

function findTriadShapes(triad: Triad, stringStart: number): TriadShape[] {
  const candidates = [stringStart, stringStart + 1, stringStart + 2].map((stringIndex) =>
    Array.from({ length: 17 }, (_, fret) => {
      const midi = TUNING[stringIndex] + fret;
      const toneIndex = triad.pitchClasses.indexOf(midi % 12);
      return toneIndex < 0 ? null : { stringIndex, fret, midi, pitchClass: midi % 12, role: triad.roles[toneIndex], noteName: triad.noteNames[toneIndex] };
    }).filter((note): note is ShapeNote => note !== null),
  );
  const shapes: TriadShape[] = [];
  for (const high of candidates[0]) for (const middle of candidates[1]) for (const low of candidates[2]) {
    const notes = [high, middle, low];
    if (new Set(notes.map((note) => note.pitchClass)).size !== 3) continue;
    if (!(high.midi > middle.midi && middle.midi > low.midi)) continue;
    if (high.midi - low.midi > 12) continue;
    const frets = notes.map((note) => note.fret);
    const minimumFret = Math.min(...frets);
    const maximumFret = Math.max(...frets);
    if (maximumFret - minimumFret > 5) continue;
    const lowestToneIndex = triad.pitchClasses.indexOf(low.pitchClass);
    const inversion: Inversion = lowestToneIndex === 0 ? "root" : lowestToneIndex === 1 ? "first" : "second";
    shapes.push({ notes, inversion, minimumFret, maximumFret });
  }
  return shapes.sort((a, b) => {
    const aCenter = a.notes.reduce((sum, note) => sum + note.fret, 0) / 3;
    const bCenter = b.notes.reduce((sum, note) => sum + note.fret, 0) / 3;
    return aCenter - bCenter || a.notes[2].midi - b.notes[2].midi;
  });
}

function soundFontNote(midi: number) {
  return `${SOUND_FONT_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function nearestSample(midi: number) {
  return GUITAR_SAMPLE_MIDIS.reduce((closest, candidate) => Math.abs(candidate - midi) < Math.abs(closest - midi) ? candidate : closest);
}

async function loadGuitar() {
  const context = audioContext ?? new AudioContext();
  audioContext = context;
  if (context.state === "suspended") await context.resume();
  if (!guitarLoading) {
    guitarLoading = instrument(context, sitePath("/audio/acoustic_guitar_nylon-mp3.js") as Parameters<typeof instrument>[1], {
      notes: GUITAR_SAMPLE_MIDIS.map(soundFontNote),
    }).then((player) => (guitarPlayer = player));
  }
  return { context, player: guitarPlayer ?? await guitarLoading };
}

async function playMidiNotes(midis: number[]) {
  const { context, player } = await loadGuitar();
  const when = context.currentTime + .02;
  midis.forEach((midi) => {
    const sample = nearestSample(midi);
    const options = { cents: (midi - sample) * 100, gain: .66, attack: .005, decay: .22, sustain: .34, release: 1.6 } as Parameters<Player["play"]>[2] & { cents: number };
    player.play(soundFontNote(sample), when, options);
  });
}

function fretRangeLabel(shape: TriadShape) {
  if (shape.minimumFret === shape.maximumFret) return shape.minimumFret === 0 ? "空弦" : `${shape.minimumFret} 品`;
  return `${shape.minimumFret === 0 ? "空弦" : `${shape.minimumFret} 品`}–${shape.maximumFret} 品`;
}

function TriadFretboard({ shapes, activeIndex, stringStart, viewMode, labelMode, onPlayNote }: { shapes: TriadShape[]; activeIndex: number; stringStart: number; viewMode: ViewMode; labelMode: LabelMode; onPlayNote: (midi: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<MarkerPoint[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => {
      const rectangle = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rectangle.width * ratio);
      canvas.height = Math.round(rectangle.height * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const width = rectangle.width;
      const height = rectangle.height;
      const openX = 72;
      const nutX = 116;
      const right = 28;
      const top = 38;
      const bottom = 42;
      const boardWidth = width - nutX - right;
      const boardHeight = height - top - bottom;
      const fretWidth = boardWidth / 16;
      const stringGap = boardHeight / 5;
      const activeStrings = new Set([stringStart, stringStart + 1, stringStart + 2]);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#fffdf8";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(219,231,211,.34)";
      context.fillRect(openX - 23, top - 18, boardWidth + nutX - openX + 23, boardHeight + 36);
      context.fillStyle = "#fffdf8";
      for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) if (!activeStrings.has(stringIndex)) {
        const y = top + stringIndex * stringGap;
        context.fillRect(openX - 23, y - stringGap * .42, boardWidth + nutX - openX + 23, stringGap * .84);
      }

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineCap = "round";
      context.font = '10px Arial, "PingFang SC", sans-serif';
      for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
        const y = top + stringIndex * stringGap;
        const active = activeStrings.has(stringIndex);
        context.strokeStyle = active ? "#59655e" : "#c5c4bc";
        context.lineWidth = active ? 1.3 + stringIndex * .22 : .8;
        context.beginPath();
        context.moveTo(openX, y);
        context.lineTo(nutX + boardWidth, y);
        context.stroke();
        context.fillStyle = active ? "#17362f" : "#aaa9a2";
        context.textAlign = "right";
        context.fillText(STRING_LABELS[stringIndex], openX - 12, y);
      }
      context.textAlign = "center";
      context.strokeStyle = "#777c75";
      for (let fret = 0; fret <= 16; fret += 1) {
        const x = nutX + fret * fretWidth;
        context.lineWidth = fret === 0 ? 5 : 1;
        context.beginPath();
        context.moveTo(x, top);
        context.lineTo(x, top + boardHeight);
        context.stroke();
        if (fret < 16) {
          context.fillStyle = "#65726c";
          context.font = '9px Georgia, "Times New Roman", serif';
          context.fillText(String(fret + 1), x + fretWidth / 2, top + boardHeight + 23);
        }
      }
      const dotFrets = [3, 5, 7, 9, 12, 15];
      for (const fret of dotFrets) {
        const x = nutX + (fret - .5) * fretWidth;
        context.strokeStyle = "#c8c9c2";
        context.lineWidth = 1;
        const dotYs = fret === 12 ? [top + boardHeight * .43, top + boardHeight * .57] : [top + boardHeight / 2];
        for (const y of dotYs) { context.beginPath(); context.arc(x, y, 5, 0, Math.PI * 2); context.stroke(); }
      }

      const visibleShapes = viewMode === "all" ? shapes : shapes[activeIndex] ? [shapes[activeIndex]] : [];
      context.lineWidth = 1;
      for (const shape of visibleShapes) {
        context.strokeStyle = viewMode === "all" ? "rgba(111,137,101,.22)" : "rgba(111,137,101,.42)";
        context.setLineDash([3, 4]);
        context.beginPath();
        shape.notes.forEach((note, index) => {
          const x = note.fret === 0 ? openX : nutX + (note.fret - .5) * fretWidth;
          const y = top + note.stringIndex * stringGap;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
      }
      context.setLineDash([]);

      const unique = new Map<string, ShapeNote>();
      for (const shape of visibleShapes) for (const note of shape.notes) unique.set(`${note.stringIndex}-${note.fret}`, note);
      const nextPoints: MarkerPoint[] = [];
      for (const note of unique.values()) {
        const x = note.fret === 0 ? openX : nutX + (note.fret - .5) * fretWidth;
        const y = top + note.stringIndex * stringGap;
        const root = note.role === "R";
        const radius = viewMode === "all" ? 14 : 18;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = root ? "#dc952c" : note.role === "♭5" ? "#edf0e8" : "#dfe9d8";
        context.strokeStyle = root ? "#a96814" : "#4f715d";
        context.lineWidth = viewMode === "all" ? 1.5 : 2;
        context.fill();
        context.stroke();
        context.fillStyle = root ? "#fffdf8" : "#17362f";
        context.font = `700 ${viewMode === "all" ? 9 : 11}px Arial, "PingFang SC", sans-serif`;
        context.fillText(labelMode === "interval" ? note.role : note.noteName, x, y + .5);
        nextPoints.push({ ...note, x, y });
      }
      points.current = nextPoints;
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
  }, [activeIndex, labelMode, shapes, stringStart, viewMode]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rectangle.left;
    const y = event.clientY - rectangle.top;
    const target = points.current.find((point) => Math.hypot(point.x - x, point.y - y) <= 23);
    if (target) onPlayNote(target.midi);
  };

  return <canvas ref={canvasRef} className="triad-fretboard" onClick={handleClick} aria-label={`标准调弦指板，显示${STRING_SETS[stringStart].label}的${viewMode === "all" ? "全部三和弦形状" : "当前三和弦形状"}；点击音符可以试听`} />;
}

export function TriadPractice() {
  const [keyIndex, setKeyIndex] = useState(0);
  const [degree, setDegree] = useState(0);
  const [stringStart, setStringStart] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [labelMode, setLabelMode] = useState<LabelMode>("interval");
  const [shapeIndex, setShapeIndex] = useState(0);
  const [soundStatus, setSoundStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const selectedKey = KEYS[keyIndex];
  const triads = useMemo(() => Array.from({ length: 7 }, (_, index) => makeTriad(selectedKey, index)), [selectedKey]);
  const selectedTriad = triads[degree];
  const shapes = useMemo(() => findTriadShapes(selectedTriad, stringStart), [selectedTriad, stringStart]);
  const activeShape = shapes[Math.min(shapeIndex, Math.max(0, shapes.length - 1))];

  const playNotes = useCallback(async (midis: number[]) => {
    setSoundStatus("loading");
    try { await playMidiNotes(midis); setSoundStatus("ready"); } catch { setSoundStatus("error"); }
  }, []);

  const playShape = useCallback((shape?: TriadShape) => {
    if (viewMode === "single" && shape) void playNotes(shape.notes.map((note) => note.midi));
  }, [playNotes, viewMode]);

  const stepShape = useCallback((direction: -1 | 1) => {
    if (!shapes.length) return;
    const nextIndex = (shapeIndex + direction + shapes.length) % shapes.length;
    setShapeIndex(nextIndex);
    playShape(shapes[nextIndex]);
  }, [playShape, shapeIndex, shapes]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (viewMode !== "single" || target.tagName === "INPUT" || target.tagName === "SELECT") return;
      if (event.key === "ArrowLeft") { event.preventDefault(); stepShape(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); stepShape(1); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stepShape, viewMode]);

  const chooseKey = (nextIndex: number) => {
    const nextTriad = makeTriad(KEYS[nextIndex], 0);
    const nextShapes = findTriadShapes(nextTriad, stringStart);
    setKeyIndex(nextIndex);
    setDegree(0);
    setShapeIndex(0);
    playShape(nextShapes[0]);
  };

  const chooseStringSet = (nextStringStart: number) => {
    const nextShapes = findTriadShapes(selectedTriad, nextStringStart);
    setStringStart(nextStringStart);
    setShapeIndex(0);
    playShape(nextShapes[0]);
  };

  const chooseDegree = (nextDegree: number) => {
    const nextShapes = findTriadShapes(triads[nextDegree], stringStart);
    setDegree(nextDegree);
    setShapeIndex(0);
    playShape(nextShapes[0]);
  };

  return <section className="triad-lab" aria-label="三和弦练习">
    <div className="triad-controls">
      <label><span>调性</span><select value={keyIndex} onChange={(event) => chooseKey(Number(event.target.value))}><optgroup label="大调 · 五度圈">{KEYS.slice(0, 12).map((key, index) => <option key={key.label} value={index}>{key.label}</option>)}</optgroup><optgroup label="小调 · 五度圈">{KEYS.slice(12).map((key, index) => <option key={key.label} value={index + 12}>{key.label}</option>)}</optgroup></select></label>
      <label><span>弦组</span><select value={stringStart} onChange={(event) => chooseStringSet(Number(event.target.value))}>{STRING_SETS.map((set, index) => <option key={set.label} value={index}>{set.label} · {set.detail}</option>)}</select></label>
      <div className="triad-control-group"><span>显示方式</span><div><button type="button" className={viewMode === "single" ? "selected" : ""} onClick={() => { setViewMode("single"); if (activeShape) void playNotes(activeShape.notes.map((note) => note.midi)); }}>逐个形状</button><button type="button" className={viewMode === "all" ? "selected" : ""} onClick={() => setViewMode("all")}>全部形状</button></div></div>
      <div className="triad-control-group"><span>标记内容</span><div><button type="button" className={labelMode === "interval" ? "selected" : ""} onClick={() => setLabelMode("interval")}>音程</button><button type="button" className={labelMode === "note" ? "selected" : ""} onClick={() => setLabelMode("note")}>音名</button></div></div>
      <button type="button" className="triad-listen" disabled={!activeShape} onClick={() => activeShape && void playNotes(activeShape.notes.map((note) => note.midi))}>{soundStatus === "loading" ? "加载音色…" : soundStatus === "error" ? "↻ 重试试听" : "▶ 试听三和弦"}</button>
    </div>

    <div className="triad-degree-heading"><div><span>选择调内级数</span><strong>{selectedKey.label} · 大、小、减三和弦</strong></div><small>从音阶的第 1、3、5 音构成每一级三和弦</small></div>
    <div className="triad-degrees" role="tablist" aria-label={`${selectedKey.label}的七个级数`}>
      {triads.map((triad, index) => <button key={`${triad.symbol}-${index}`} type="button" role="tab" aria-selected={degree === index} className={degree === index ? "selected" : ""} onClick={() => chooseDegree(index)}><span>{triad.degreeLabel}</span><strong>{triad.symbol}</strong><small>{QUALITY_NAMES[triad.quality]}</small></button>)}
    </div>

    <div className="triad-focus">
      <div><span>当前练习</span><h2>{selectedTriad.symbol} <small>{QUALITY_NAMES[selectedTriad.quality]}</small></h2><p>{selectedTriad.noteNames.map((note, index) => `${selectedTriad.roles[index]} = ${note}`).join("　")}</p></div>
      {viewMode === "single" && activeShape ? <div className="triad-shape-nav"><button type="button" onClick={() => stepShape(-1)} aria-label="上一个三和弦形状">← 上一个</button><div><strong>{String(shapeIndex + 1).padStart(2, "0")} / {String(shapes.length).padStart(2, "0")}</strong><span>{INVERSION_NAMES[activeShape.inversion]} · {fretRangeLabel(activeShape)}</span></div><button type="button" onClick={() => stepShape(1)} aria-label="下一个三和弦形状">下一个 →</button></div> : <div className="triad-all-summary"><strong>{shapes.length}</strong><span>个密集排列形状</span></div>}
    </div>

    <div className="triad-board-wrap"><TriadFretboard shapes={shapes} activeIndex={shapeIndex} stringStart={stringStart} viewMode={viewMode} labelMode={labelMode} onPlayNote={(midi) => void playNotes([midi])} /></div>
    <div className="triad-legend"><span><i className="root" />根音</span><span><i className="chord" />三音与五音</span><span><b>点击圆点</b>试听单音</span><span><b>← / →</b>切换形状</span><span>标准调弦 E–A–D–G–B–E · 空弦–16 品</span></div>
  </section>;
}
