"use client";

import { instrument, type Player } from "soundfont-player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sitePath } from "../lib/site-path";

type Mode = "major" | "minor";
type Quality = "maj7" | "m7" | "7" | "m7b5";
type FretboardMode = "root" | "scale";
type KeyChoice = { label: string; tonic: number; mode: Mode; scale: string[] };
type Chord = { degree: number; degreeLabel: string; symbol: string; rootPc: number; quality: Quality; pitchClasses: number[]; noteNames: string[] };
type StoppableNode = { stop: (when?: number) => void };

const TUNING = [64, 59, 55, 50, 45, 40] as const;
const STRING_LABELS = ["E", "B", "G", "D", "A", "E"] as const;
const POSITION_ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"] as const;
const QUALITY_INTERVALS: Record<Quality, number[]> = {
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
};
const QUALITY_LABELS: Record<Quality, string> = { maj7: "maj7", m7: "m7", "7": "7", m7b5: "m7♭5" };
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;
const MAJOR_QUALITIES: Quality[] = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
const MINOR_QUALITIES: Quality[] = ["m7", "m7b5", "maj7", "m7", "7", "maj7", "7"];
const MAJOR_DEGREES = ["I", "ii", "iii", "IV", "V", "vi", "viiø"] as const;
const MINOR_DEGREES = ["i", "iiø", "III", "iv", "V", "VI", "VII"] as const;
const MAJOR_PROGRESSIONS = [[0, 4, 5, 3], [0, 5, 3, 4], [1, 4, 0, 5], [0, 3, 1, 4], [5, 3, 0, 4], [0, 2, 3, 4]] as const;
const MINOR_PROGRESSIONS = [[0, 5, 2, 6], [0, 3, 4, 0], [0, 6, 5, 4], [0, 2, 6, 5], [5, 6, 0, 0]] as const;
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
] as const;
const GUITAR_SAMPLE_MIDIS = Array.from({ length: 17 }, (_, index) => 40 + index * 3);
const SOUND_FONT_NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
const RAISED_NOTE_NAMES: Record<string, string> = {
  C: "C♯", D: "D♯", E: "E♯", F: "F♯", G: "G♯", A: "A♯", B: "B♯",
  "C♯": "C𝄪", "D♯": "D𝄪", "F♯": "F𝄪", "G♯": "G𝄪", "A♯": "A𝄪",
  "C♭": "C", "D♭": "D", "E♭": "E", "G♭": "G", "A♭": "A", "B♭": "B",
};

let audioContext: AudioContext | null = null;
let guitarPlayer: Player | null = null;
let guitarLoading: Promise<Player> | null = null;
let guitarMasterGain: GainNode | null = null;

function soundFontNote(midi: number) {
  return `${SOUND_FONT_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function nearestSample(midi: number) {
  return GUITAR_SAMPLE_MIDIS.reduce((closest, candidate) => Math.abs(candidate - midi) < Math.abs(closest - midi) ? candidate : closest);
}

function scheduleCountInClick(context: AudioContext, destination: AudioNode, when: number, accent: boolean, level: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(accent ? 1040 : 760, when);
  gain.gain.setValueAtTime(.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001, level * (accent ? .16 : .11)), when + .006);
  gain.gain.exponentialRampToValueAtTime(.0001, when + .07);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(when);
  oscillator.stop(when + .08);
  return oscillator;
}

async function loadGuitar() {
  const context = audioContext ?? new AudioContext();
  audioContext = context;
  if (context.state === "suspended") await context.resume();
  if (!guitarMasterGain) {
    guitarMasterGain = context.createGain();
    guitarMasterGain.gain.value = .7;
    guitarMasterGain.connect(context.destination);
  }
  if (!guitarLoading) {
    guitarLoading = instrument(context, sitePath("/audio/acoustic_guitar_nylon-mp3.js") as Parameters<typeof instrument>[1], {
      notes: GUITAR_SAMPLE_MIDIS.map(soundFontNote),
      destination: guitarMasterGain,
    }).then((player) => (guitarPlayer = player));
  }
  return { context, player: guitarPlayer ?? await guitarLoading, masterGain: guitarMasterGain };
}

function chordForDegree(key: KeyChoice, degree: number): Chord {
  const intervals = key.mode === "major" ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const qualities = key.mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
  const labels = key.mode === "major" ? MAJOR_DEGREES : MINOR_DEGREES;
  const rootPc = (key.tonic + intervals[degree]) % 12;
  const quality = qualities[degree];
  const noteNames = [0, 2, 4, 6].map((offset) => key.scale[(degree + offset) % 7]);
  if (key.mode === "minor" && degree === 4) noteNames[1] = RAISED_NOTE_NAMES[noteNames[1]] ?? noteNames[1];
  return {
    degree,
    degreeLabel: labels[degree],
    symbol: `${key.scale[degree]}${QUALITY_LABELS[quality]}`,
    rootPc,
    quality,
    pitchClasses: QUALITY_INTERVALS[quality].map((interval) => (rootPc + interval) % 12),
    noteNames,
  };
}

function makeProgression(key: KeyChoice, degrees: readonly number[]) {
  return degrees.map((degree) => chordForDegree(key, degree));
}

function randomProgression(key: KeyChoice) {
  const templates = key.mode === "major" ? MAJOR_PROGRESSIONS : MINOR_PROGRESSIONS;
  return makeProgression(key, templates[Math.floor(Math.random() * templates.length)]);
}

function chordMidiNotes(chord: Chord) {
  const root = 45 + ((chord.rootPc - 9 + 12) % 12);
  return QUALITY_INTERVALS[chord.quality].map((interval) => root + interval);
}

function FretboardDiagram({ chord, position, mode, scalePitchClasses, scaleNoteNames }: { chord: Chord; position: number | null; mode: FretboardMode; scalePitchClasses: number[]; scaleNoteNames: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const left = 64;
      const right = 26;
      const top = 38;
      const bottom = 38;
      const boardWidth = width - left - right;
      const boardHeight = height - top - bottom;
      const fretWidth = boardWidth / 16;
      const stringGap = boardHeight / 5;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#fffdf8";
      context.fillRect(0, 0, width, height);

      const paintFret = (fret: number, color: string) => {
        if (fret < 1 || fret > 16) return;
        context.fillStyle = color;
        context.fillRect(left + (fret - 1) * fretWidth, top, fretWidth, boardHeight);
      };
      if (position) {
        paintFret(position - 1, "rgba(220,149,44,.10)");
        for (let fret = position; fret <= position + 3; fret += 1) paintFret(fret, "rgba(91,126,99,.10)");
        paintFret(position + 4, "rgba(220,149,44,.10)");
        if (position === 1) {
          context.fillStyle = "rgba(220,149,44,.10)";
          context.fillRect(left - 48, top, 38, boardHeight);
        }
      }

      context.strokeStyle = "#747971";
      context.fillStyle = "#17362f";
      context.font = '11px Arial, "PingFang SC", sans-serif';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineCap = "round";
      for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
        const y = top + stringIndex * stringGap;
        context.lineWidth = 1 + (5 - stringIndex) * .3;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(left + boardWidth, y);
        context.stroke();
        context.fillText(STRING_LABELS[stringIndex], left - 30, y);
      }
      for (let fret = 0; fret <= 16; fret += 1) {
        const x = left + fret * fretWidth;
        context.lineWidth = fret === 0 ? 5 : 1.2;
        context.beginPath();
        context.moveTo(x, top);
        context.lineTo(x, top + boardHeight);
        context.stroke();
        if (fret < 16) context.fillText(String(fret + 1), x + fretWidth / 2, top + boardHeight + 22);
      }

      const minimumFret = position ? position === 1 ? 0 : position - 1 : 0;
      const maximumFret = position ? Math.min(16, position + 4) : 16;
      const visiblePitchClasses = mode === "root" ? chord.pitchClasses : [...new Set([...scalePitchClasses, ...chord.pitchClasses])];
      for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
        for (let fret = minimumFret; fret <= maximumFret; fret += 1) {
          const pitchClass = (TUNING[stringIndex] + fret) % 12;
          if (!visiblePitchClasses.includes(pitchClass)) continue;
          const x = fret === 0 ? left - 30 : left + (fret - .5) * fretWidth;
          const y = top + stringIndex * stringGap;
          const root = pitchClass === chord.rootPc;
          const chordToneIndex = chord.pitchClasses.indexOf(pitchClass);
          const chordTone = chordToneIndex >= 0;
          const scaleToneIndex = scalePitchClasses.indexOf(pitchClass);
          const radius = Math.max(12, Math.min(chordTone ? 17 : 14, fretWidth * (chordTone ? .28 : .23)));
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fillStyle = root ? "#dc952c" : mode === "scale" && chordTone ? "#dfe9d8" : "#fffdf8";
          context.strokeStyle = root ? "#a96814" : mode === "scale" && chordTone ? "#58754f" : mode === "scale" ? "#adb5ae" : "#17362f";
          context.lineWidth = chordTone ? 2 : 1.25;
          context.fill();
          context.stroke();
          context.fillStyle = chordTone ? "#17362f" : "#79847d";
          context.font = `${chordTone ? 600 : 500} ${chordTone ? 11 : 10}px Arial, "PingFang SC", sans-serif`;
          context.fillText(chordTone ? chord.noteNames[chordToneIndex] : scaleNoteNames[scaleToneIndex], x, y + .5);
        }
      }
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
  }, [chord, mode, position, scaleNoteNames, scalePitchClasses]);

  return <canvas ref={canvasRef} className="arpeggio-fretboard" aria-label={`${chord.symbol} 在${position ? `第 ${POSITION_ROMANS[position - 1]} 把位` : "全指板"}的${mode === "scale" ? "音阶与琶音" : "琶音"}音符`} />;
}

export function ArpeggioPractice() {
  const [keyIndex, setKeyIndex] = useState(0);
  const [progression, setProgression] = useState(() => makeProgression(KEYS[0], MAJOR_PROGRESSIONS[0]));
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<number | null>(null);
  const [fretboardMode, setFretboardMode] = useState<FretboardMode>("scale");
  const [bpm, setBpm] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [countingIn, setCountingIn] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [soundStatus, setSoundStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const timers = useRef<number[]>([]);
  const nodes = useRef<StoppableNode[]>([]);
  const playToken = useRef(0);
  const selectedKey = KEYS[keyIndex];
  const selectedScalePitchClasses = useMemo(() => {
    const intervals = selectedKey.mode === "major" ? MAJOR_INTERVALS : MINOR_INTERVALS;
    return intervals.map((interval) => (selectedKey.tonic + interval) % 12);
  }, [selectedKey]);
  const activeChord = progression[activeIndex] ?? progression[0];
  const nextChord = progression[(activeIndex + 1) % progression.length];
  const progressionText = useMemo(() => progression.map((chord) => chord.degreeLabel).join(" – "), [progression]);

  const stopPlayback = useCallback((reset = false) => {
    playToken.current += 1;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    nodes.current.forEach((node) => {
      try { node.stop(); } catch { /* A node may already have ended. */ }
    });
    nodes.current = [];
    setPlaying(false);
    setCountingIn(false);
    setCurrentBeat(0);
    if (reset) setActiveIndex(0);
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  useEffect(() => {
    if (!guitarMasterGain || !audioContext) return;
    const target = muted ? 0 : volume / 100;
    guitarMasterGain.gain.cancelScheduledValues(audioContext.currentTime);
    guitarMasterGain.gain.setTargetAtTime(target, audioContext.currentTime, .015);
  }, [muted, volume]);

  function chooseKey(nextIndex: number) {
    stopPlayback(true);
    const key = KEYS[nextIndex];
    setKeyIndex(nextIndex);
    setProgression(makeProgression(key, key.mode === "major" ? MAJOR_PROGRESSIONS[0] : MINOR_PROGRESSIONS[0]));
  }

  function regenerate() {
    stopPlayback(true);
    setProgression(randomProgression(selectedKey));
  }

  async function playProgression() {
    if (playing) {
      stopPlayback();
      return;
    }
    stopPlayback(true);
    const token = playToken.current;
    setSoundStatus("loading");
    try {
      const { context, player, masterGain } = await loadGuitar();
      if (token !== playToken.current) return;
      masterGain.gain.setValueAtTime(muted ? 0 : volume / 100, context.currentTime);
      setSoundStatus("ready");
      setPlaying(true);
      setCountingIn(true);
      setCurrentBeat(1);
      const beatSeconds = 60 / bpm;
      const barSeconds = beatSeconds * 4;
      const countInStart = context.currentTime + .08;
      const startAt = countInStart + barSeconds;

      for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
        const clickAt = countInStart + beatIndex * beatSeconds;
        const click = scheduleCountInClick(context, masterGain, clickAt, beatIndex === 0, 1);
        nodes.current.push(click);
        timers.current.push(window.setTimeout(() => {
          setCountingIn(true);
          setCurrentBeat(beatIndex + 1);
          setActiveIndex(0);
        }, Math.max(0, (clickAt - context.currentTime) * 1000)));
      }
      timers.current.push(window.setTimeout(() => setCountingIn(false), Math.max(0, (startAt - context.currentTime) * 1000)));

      const scheduleCycle = (cycleStart: number) => {
        if (token !== playToken.current) return;
        nodes.current = nodes.current.slice(-64);
        progression.forEach((chord, chordIndex) => {
          const chordStart = cycleStart + chordIndex * barSeconds;
          const midiNotes = chordMidiNotes(chord);
          for (const beatOffset of [0, 2]) {
            midiNotes.forEach((midi, noteIndex) => {
              const sampleMidi = nearestSample(midi);
              const options = {
                cents: (midi - sampleMidi) * 100,
                gain: noteIndex === 0 ? .28 : .21,
                attack: .008,
                decay: .28,
                sustain: .34,
                release: Math.min(1.8, beatSeconds * 1.8),
              } as Parameters<Player["play"]>[2] & { cents: number };
              const node = player.play(soundFontNote(sampleMidi), chordStart + beatOffset * beatSeconds, options);
              nodes.current.push(node as unknown as StoppableNode);
            });
          }
          for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
            const beatAt = chordStart + beatIndex * beatSeconds;
            timers.current.push(window.setTimeout(() => {
              setCountingIn(false);
              setActiveIndex(chordIndex);
              setCurrentBeat(beatIndex + 1);
            }, Math.max(0, (beatAt - context.currentTime) * 1000)));
          }
        });
        const nextCycleStart = cycleStart + progression.length * barSeconds;
        const scheduleDelay = Math.max(0, (nextCycleStart - context.currentTime - .15) * 1000);
        timers.current.push(window.setTimeout(() => scheduleCycle(nextCycleStart), scheduleDelay));
      };

      scheduleCycle(startAt);
    } catch {
      setSoundStatus("error");
      setPlaying(false);
    }
  }

  return <section className="arpeggio-lab" aria-label="琶音练习">
    <div className="arpeggio-controls">
      <label><span>调性</span><select value={keyIndex} onChange={(event) => chooseKey(Number(event.target.value))}><optgroup label="大调 · 五度圈">{KEYS.slice(0, 12).map((key, index) => <option key={key.label} value={index}>{key.label}</option>)}</optgroup><optgroup label="小调 · 五度圈">{KEYS.slice(12).map((key, index) => <option key={key.label} value={index + 12}>{key.label}</option>)}</optgroup></select></label>
      <label><span>把位</span><select value={position ?? "all"} onChange={(event) => { stopPlayback(true); setPosition(event.target.value === "all" ? null : Number(event.target.value)); }}><option value="all">全指板 · 空弦–16 品</option>{POSITION_ROMANS.map((roman, index) => <option key={roman} value={index + 1}>第 {roman} 把位 · {index === 0 ? "空弦–5 品" : `${index}–${index + 5} 品`}</option>)}</select></label>
      <label><span>指板模式</span><select value={fretboardMode} onChange={(event) => setFretboardMode(event.target.value as FretboardMode)}><option value="root">根音模式</option><option value="scale">音阶模式</option></select></label>
      <label className="tempo-control"><span>速度 <b>{bpm} BPM</b></span><input type="range" min="40" max="160" step="2" value={bpm} onChange={(event) => { stopPlayback(true); setBpm(Number(event.target.value)); }} /></label>
      <label className="volume-control"><span>伴奏音量 <b>{muted ? "静音" : `${volume}%`}</b></span><input type="range" min="0" max="100" step="5" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
      <button type="button" className={`mute-accompaniment ${muted ? "selected" : ""}`} onClick={() => setMuted((value) => !value)} aria-pressed={muted}>{muted ? "♩ 恢复" : "♩ 静音"}</button>
      <button type="button" className="generate-progression" onClick={regenerate}>↻ 随机生成</button>
      <button type="button" className={`play-progression ${playing ? "playing" : ""}`} onClick={() => void playProgression()}>{playing ? "■ 停止伴奏" : soundStatus === "loading" ? "加载音色…" : soundStatus === "error" ? "重试播放" : "▶ 播放伴奏"}</button>
    </div>

    <div className="progression-heading">
      <div><span>循环伴奏</span><strong>{selectedKey.label} · {progressionText}</strong><small>每个和弦一小节 · 每小节两次和弦伴奏</small></div>
      <div className="playback-status" aria-live="polite"><div><strong>{countingIn ? `预备拍 ${currentBeat}/4` : playing ? `第 ${currentBeat} 拍` : "等待播放"}</strong><span>{countingIn ? `即将进入 ${activeChord.symbol}` : `下一和弦 ${nextChord.symbol}`}</span></div><div className="beat-indicator" aria-label={currentBeat ? `当前第 ${currentBeat} 拍` : "尚未播放"}>{[1, 2, 3, 4].map((beat) => <i key={beat} className={currentBeat === beat && playing ? "active" : ""}>{beat}</i>)}</div></div>
    </div>
    <div className="chord-timeline" aria-label={`和弦走向：${progression.map((chord) => chord.symbol).join("，")}`}>
      {progression.map((chord, index) => <button key={`${chord.symbol}-${index}`} type="button" className={index === activeIndex ? "active" : ""} onClick={() => { stopPlayback(); setActiveIndex(index); }}>
        <span>{String(index + 1).padStart(2, "0")}</span><b>{chord.degreeLabel}</b><strong>{chord.symbol}</strong><small>{index === activeIndex ? countingIn ? "预备进入" : playing ? `第 ${currentBeat} 拍` : "当前和弦" : "一小节"}</small>
      </button>)}
    </div>

    <div className="arpeggio-board-heading"><div><span>本小节琶音目标</span><h2>{activeChord.symbol}</h2></div><p>{fretboardMode === "scale" ? "浅色为调内音 · 绿色为和弦琶音 · 橙色为和弦根音" : position ? "橙色为根音 · 绿色为核心四品 · 暖色为扩展品" : "橙色为根音 · 显示空弦到 16 品的全部和弦音"}</p></div>
    <div className="arpeggio-board-wrap"><FretboardDiagram chord={activeChord} position={position} mode={fretboardMode} scalePitchClasses={selectedScalePitchClasses} scaleNoteNames={selectedKey.scale} /></div>
    <p className="arpeggio-practice-note">伴奏循环播放和弦，不会替你演奏琶音；请跟随高亮小节，在指板上自行练习对应和弦音。小调属七和弦采用升高导音的常见写法。</p>
  </section>;
}
