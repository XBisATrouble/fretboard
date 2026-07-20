"use client";

import { instrument, type Player } from "soundfont-player";
import { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sitePath } from "../lib/site-path";

type NotePreference = "sharps" | "flats";
type DisplayMode = "names" | "dots";
type Orientation = "horizontal" | "vertical";
type Tool = "note" | "arrow";
type SoundStatus = "idle" | "loading" | "ready" | "error";
type QuickMarkMode = "scale" | "arpeggio";
type KeyMode = "major" | "minor";

type Marker = { stringIndex: number; fret: number; root: boolean; label?: string };
type GridPoint = { fret: number; string: number };
type BoardArrow = { start: GridPoint; end: GridPoint };
type BoardState = { id: number; markers: Marker[]; arrows: BoardArrow[] };
type WorkbenchSnapshot = { title: string; activeBoardId: number; boards: BoardState[] };

type Geometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  fretSize: number;
  stringSize: number;
};

const TUNING = [
  { label: "E", midi: 64 },
  { label: "B", midi: 59 },
  { label: "G", midi: 55 },
  { label: "D", midi: 50 },
  { label: "A", midi: 45 },
  { label: "E", midi: 40 },
] as const;
const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;
const MAJOR_DEGREES = ["I", "ii", "iii", "IV", "V", "vi", "viiø"] as const;
const MINOR_DEGREES = ["i", "iiø", "III", "iv", "v", "VI", "VII"] as const;
const MAJOR_SEVENTH_QUALITIES = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7♭5"] as const;
const MINOR_SEVENTH_QUALITIES = ["m7", "m7♭5", "maj7", "m7", "m7", "maj7", "7"] as const;
const G_FLAT_MAJOR_NOTES = ["G♭", "A♭", "B♭", "C♭", "D♭", "E♭", "F"] as const;
const CIRCLE_KEYS = [
  { major: "C", majorPc: 0, minor: "Am", minorPc: 9, notes: ["C", "D", "E", "F", "G", "A", "B"] },
  { major: "G", majorPc: 7, minor: "Em", minorPc: 4, notes: ["G", "A", "B", "C", "D", "E", "F♯"] },
  { major: "D", majorPc: 2, minor: "Bm", minorPc: 11, notes: ["D", "E", "F♯", "G", "A", "B", "C♯"] },
  { major: "A", majorPc: 9, minor: "F♯m", minorPc: 6, notes: ["A", "B", "C♯", "D", "E", "F♯", "G♯"] },
  { major: "E", majorPc: 4, minor: "C♯m", minorPc: 1, notes: ["E", "F♯", "G♯", "A", "B", "C♯", "D♯"] },
  { major: "B", majorPc: 11, minor: "G♯m", minorPc: 8, notes: ["B", "C♯", "D♯", "E", "F♯", "G♯", "A♯"] },
  { major: "F♯ / G♭", majorPc: 6, minor: "D♯m / E♭m", minorPc: 3, notes: ["F♯", "G♯", "A♯", "B", "C♯", "D♯", "E♯"] },
  { major: "D♭", majorPc: 1, minor: "B♭m", minorPc: 10, notes: ["D♭", "E♭", "F", "G♭", "A♭", "B♭", "C"] },
  { major: "A♭", majorPc: 8, minor: "Fm", minorPc: 5, notes: ["A♭", "B♭", "C", "D♭", "E♭", "F", "G"] },
  { major: "E♭", majorPc: 3, minor: "Cm", minorPc: 0, notes: ["E♭", "F", "G", "A♭", "B♭", "C", "D"] },
  { major: "B♭", majorPc: 10, minor: "Gm", minorPc: 7, notes: ["B♭", "C", "D", "E♭", "F", "G", "A"] },
  { major: "F", majorPc: 5, minor: "Dm", minorPc: 2, notes: ["F", "G", "A", "B♭", "C", "D", "E"] },
] as const;
const INK = "#17362f";
const LINE = "#747971";
const ACCENT = "#dc952c";
const PAPER = "#fffdf8";
const GUITAR_SOUND_ENABLED_KEY = "fretboard-guitar-sound-enabled";
const GUITAR_SOUND_CHANGED_EVENT = "fretboard-guitar-sound-changed";
const GUITAR_SAMPLE_MIDIS = Array.from({ length: 17 }, (_, index) => 40 + index * 3);
const SOUND_FONT_NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
let guitarAudioContext: AudioContext | null = null;
let nylonGuitar: Player | null = null;
let guitarLoading: Promise<Player> | null = null;
let fallbackSoundPreference = true;

function subscribeToGuitarSound(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(GUITAR_SOUND_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(GUITAR_SOUND_CHANGED_EVENT, callback);
  };
}

function guitarSoundSnapshot() {
  try {
    return window.localStorage.getItem(GUITAR_SOUND_ENABLED_KEY) !== "false";
  } catch {
    return fallbackSoundPreference;
  }
}

function soundFontNote(midi: number) {
  return `${SOUND_FONT_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function nearestGuitarSample(midi: number) {
  return GUITAR_SAMPLE_MIDIS.reduce((closest, candidate) => Math.abs(candidate - midi) < Math.abs(closest - midi) ? candidate : closest);
}

function unlockGuitarAudio() {
  const context = guitarAudioContext ?? new AudioContext();
  guitarAudioContext = context;
  if (context.state === "suspended") void context.resume();
}

async function playGuitarTone(midi: number) {
  const context = guitarAudioContext ?? new AudioContext();
  guitarAudioContext = context;
  if (context.state === "suspended") await context.resume();
  if (!guitarLoading) {
    guitarLoading = instrument(context, sitePath("/audio/acoustic_guitar_nylon-mp3.js") as Parameters<typeof instrument>[1], {
      notes: GUITAR_SAMPLE_MIDIS.map(soundFontNote),
    }).then((player) => {
      nylonGuitar = player;
      return player;
    }).catch((error) => {
      guitarLoading = null;
      throw error;
    });
  }
  const player = nylonGuitar ?? await guitarLoading;
  const sampleMidi = nearestGuitarSample(midi);
  const playbackOptions = {
    cents: (midi - sampleMidi) * 100,
    gain: 0.78,
    attack: 0.005,
    decay: 0.22,
    sustain: 0.3,
    release: 1.5,
  } as Parameters<Player["play"]>[2] & { cents: number };
  player.play(soundFontNote(sampleMidi), context.currentTime, playbackOptions);
}

function geometryFor(width: number, height: number, orientation: Orientation, fretCount: number): Geometry {
  if (orientation === "horizontal") {
    const left = 64;
    const top = 42;
    const right = 28;
    const bottom = 40;
    return { left, top, width: width - left - right, height: height - top - bottom, fretSize: (width - left - right) / fretCount, stringSize: (height - top - bottom) / 5 };
  }
  const left = 48;
  const top = 56;
  const right = 48;
  const bottom = 38;
  return { left, top, width: width - left - right, height: height - top - bottom, fretSize: (height - top - bottom) / fretCount, stringSize: (width - left - right) / 5 };
}

function noteName(marker: Marker, preference: NotePreference) {
  if (marker.label) return marker.label;
  const midi = TUNING[marker.stringIndex].midi + marker.fret;
  return (preference === "sharps" ? SHARP_NAMES : FLAT_NAMES)[midi % 12];
}

function circlePosition(index: number, radius: number): CSSProperties {
  const angle = index * 30 * Math.PI / 180;
  return {
    left: `${50 + Math.sin(angle) * radius}%`,
    top: `${50 - Math.cos(angle) * radius}%`,
  };
}

function keyNoteNames(index: number, mode: KeyMode, preference: NotePreference) {
  const key = CIRCLE_KEYS[index];
  const majorNotes = index === 6 && preference === "flats" ? [...G_FLAT_MAJOR_NOTES] : [...key.notes];
  return mode === "major" ? majorNotes : [...majorNotes.slice(5), ...majorNotes.slice(0, 5)];
}

function keyTonicName(index: number, mode: KeyMode, preference: NotePreference) {
  const names = keyNoteNames(index, mode, preference);
  return names[0];
}

function keyPitchClasses(index: number, mode: KeyMode) {
  const key = CIRCLE_KEYS[index];
  const tonic = mode === "major" ? key.majorPc : key.minorPc;
  const intervals = mode === "major" ? MAJOR_INTERVALS : MINOR_INTERVALS;
  return intervals.map((interval) => (tonic + interval) % 12);
}

function generatedMarkers(startFret: number, endFret: number, pitchClasses: number[], noteNames: string[], rootPc: number) {
  const labels = new Map(pitchClasses.map((pitchClass, index) => [pitchClass, noteNames[index]]));
  const markers: Marker[] = [];
  TUNING.forEach((string, stringIndex) => {
    for (let fret = startFret === 1 ? 0 : startFret; fret <= endFret; fret += 1) {
      const pitchClass = (string.midi + fret) % 12;
      const label = labels.get(pitchClass);
      if (label) markers.push({ stringIndex, fret, root: pitchClass === rootPc, label });
    }
  });
  return markers;
}

function gridToCanvas(point: GridPoint, geometry: Geometry, orientation: Orientation, startFret: number) {
  if (orientation === "horizontal") {
    return { x: geometry.left + (point.fret - startFret) * geometry.fretSize, y: geometry.top + point.string * geometry.stringSize };
  }
  return { x: geometry.left + point.string * geometry.stringSize, y: geometry.top + (point.fret - startFret) * geometry.fretSize };
}

function openStringToCanvas(stringIndex: number, geometry: Geometry, orientation: Orientation) {
  if (orientation === "horizontal") return { x: geometry.left - 30, y: geometry.top + stringIndex * geometry.stringSize };
  return { x: geometry.left + stringIndex * geometry.stringSize, y: geometry.top - 25 };
}

function canvasToGrid(x: number, y: number, geometry: Geometry, orientation: Orientation, startFret: number, endFret: number): GridPoint {
  if (orientation === "horizontal") {
    return {
      fret: Math.min(endFret + 1, Math.max(startFret, startFret + (x - geometry.left) / geometry.fretSize)),
      string: Math.min(5, Math.max(0, (y - geometry.top) / geometry.stringSize)),
    };
  }
  return {
    fret: Math.min(endFret + 1, Math.max(startFret, startFret + (y - geometry.top) / geometry.fretSize)),
    string: Math.min(5, Math.max(0, (x - geometry.left) / geometry.stringSize)),
  };
}

function drawArrow(context: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = 17;
  context.save();
  context.strokeStyle = ACCENT;
  context.fillStyle = ACCENT;
  context.lineWidth = 5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
  context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.lineWidth = 2;
  for (const point of [start, end]) {
    context.beginPath();
    context.arc(point.x, point.y, 7, 0, Math.PI * 2);
    context.fillStyle = PAPER;
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawBoard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  board: BoardState,
  startFret: number,
  endFret: number,
  orientation: Orientation,
  preference: NotePreference,
  displayMode: DisplayMode,
  preview?: BoardArrow | null,
) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);
  const fretCount = endFret - startFret + 1;
  const geometry = geometryFor(width, height, orientation, fretCount);
  context.strokeStyle = LINE;
  context.fillStyle = INK;
  context.lineCap = "round";
  context.font = '12px Arial, "PingFang SC", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
    const lineWidth = 1 + (5 - stringIndex) * 0.34;
    context.lineWidth = lineWidth;
    context.beginPath();
    if (orientation === "horizontal") {
      const y = geometry.top + stringIndex * geometry.stringSize;
      context.moveTo(geometry.left, y);
      context.lineTo(geometry.left + geometry.width, y);
      context.fillText(TUNING[stringIndex].label, geometry.left - 30, y);
    } else {
      const x = geometry.left + stringIndex * geometry.stringSize;
      context.moveTo(x, geometry.top);
      context.lineTo(x, geometry.top + geometry.height);
      context.fillText(TUNING[stringIndex].label, x, geometry.top - 25);
    }
    context.stroke();
  }

  for (let index = 0; index <= fretCount; index += 1) {
    const fret = startFret + index;
    const isNut = index === 0 && startFret <= 1;
    context.lineWidth = isNut ? 5 : 1.35;
    context.beginPath();
    if (orientation === "horizontal") {
      const x = geometry.left + index * geometry.fretSize;
      context.moveTo(x, geometry.top);
      context.lineTo(x, geometry.top + geometry.height);
      if (index < fretCount) context.fillText(String(fret), x + geometry.fretSize / 2, geometry.top + geometry.height + 22);
    } else {
      const y = geometry.top + index * geometry.fretSize;
      context.moveTo(geometry.left, y);
      context.lineTo(geometry.left + geometry.width, y);
      if (index < fretCount) context.fillText(String(fret), geometry.left - 24, y + geometry.fretSize / 2);
    }
    context.stroke();
  }

  const markerFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
  for (const fret of markerFrets) {
    if (fret < startFret || fret > endFret) continue;
    context.save();
    context.strokeStyle = "rgba(77,83,78,.34)";
    context.lineWidth = 1.5;
    const markerStrings = fret % 12 === 0 ? [1.5, 3.5] : [2.5];
    for (const string of markerStrings) {
      const point = gridToCanvas({ fret: fret + 0.5, string }, geometry, orientation, startFret);
      context.beginPath();
      context.arc(point.x, point.y, 7, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  for (const marker of board.markers) {
    const isOpenString = marker.fret === 0 && startFret === 1;
    if (!isOpenString && (marker.fret < startFret || marker.fret > endFret)) continue;
    const point = isOpenString
      ? openStringToCanvas(marker.stringIndex, geometry, orientation)
      : gridToCanvas({ fret: marker.fret + 0.5, string: marker.stringIndex }, geometry, orientation, startFret);
    const radius = Math.max(13, Math.min(19, Math.min(geometry.fretSize * 0.25, geometry.stringSize * 0.32)));
    context.save();
    context.fillStyle = marker.root ? ACCENT : PAPER;
    context.strokeStyle = marker.root ? "#a96814" : INK;
    context.lineWidth = 2.25;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    if (displayMode === "names") {
      context.fillStyle = INK;
      context.font = `600 ${Math.max(10, Math.min(14, radius * 0.72))}px Arial, "PingFang SC", sans-serif`;
      context.fillText(noteName(marker, preference), point.x, point.y + 0.5);
    }
    context.restore();
  }

  for (const arrow of [...board.arrows, ...(preview ? [preview] : [])]) {
    drawArrow(context, gridToCanvas(arrow.start, geometry, orientation, startFret), gridToCanvas(arrow.end, geometry, orientation, startFret));
  }
}

type BoardCanvasProps = {
  board: BoardState;
  active: boolean;
  startFret: number;
  endFret: number;
  orientation: Orientation;
  preference: NotePreference;
  displayMode: DisplayMode;
  tool: Tool;
  onActivate: () => void;
  onSoundUnlock: () => void;
  onMarker: (marker: Omit<Marker, "root">, makeRoot: boolean) => void;
  onArrow: (arrow: BoardArrow) => void;
};

function BoardCanvas({ board, active, startFret, endFret, orientation, preference, displayMode, tool, onActivate, onSoundUnlock, onMarker, onArrow }: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clickTimer = useRef<number | null>(null);
  const arrowStart = useRef<GridPoint | null>(null);
  const [preview, setPreview] = useState<BoardArrow | null>(null);

  useEffect(() => () => {
    if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
  }, []);

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
      drawBoard(context, rectangle.width, rectangle.height, board, startFret, endFret, orientation, preference, displayMode, preview);
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
  }, [board, displayMode, endFret, orientation, preference, preview, startFret]);

  function eventPoint(event: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rectangle = canvas.getBoundingClientRect();
    const geometry = geometryFor(rectangle.width, rectangle.height, orientation, endFret - startFret + 1);
    const x = event.clientX - rectangle.left;
    const y = event.clientY - rectangle.top;
    return { point: canvasToGrid(x, y, geometry, orientation, startFret, endFret), geometry, x, y };
  }

  function markerAt(event: ReactMouseEvent<HTMLCanvasElement>) {
    const location = eventPoint(event);
    if (!location) return null;
    const stringIndex = Math.min(5, Math.max(0, Math.round(location.point.string)));
    if (startFret === 1) {
      const openPoint = openStringToCanvas(stringIndex, location.geometry, orientation);
      const beforeNut = orientation === "horizontal" ? location.x < location.geometry.left : location.y < location.geometry.top;
      if (beforeNut) {
        const distance = Math.hypot(location.x - openPoint.x, location.y - openPoint.y);
        return distance <= 23 ? { fret: 0, stringIndex } : null;
      }
    }
    const fret = Math.min(endFret, Math.max(startFret, Math.floor(location.point.fret)));
    return { fret, stringIndex };
  }

  function handleClick(event: ReactMouseEvent<HTMLCanvasElement>) {
    if (tool !== "note") return;
    const marker = markerAt(event);
    if (!marker) return;
    onActivate();
    onSoundUnlock();
    if (event.detail >= 2) {
      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onMarker(marker, true);
      return;
    }
    clickTimer.current = window.setTimeout(() => {
      onMarker(marker, false);
      clickTimer.current = null;
    }, 220);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    onActivate();
    if (tool !== "arrow") return;
    const location = eventPoint(event);
    if (!location) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    arrowStart.current = location.point;
    setPreview({ start: location.point, end: location.point });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool !== "arrow" || !arrowStart.current) return;
    const location = eventPoint(event);
    if (location) setPreview({ start: arrowStart.current, end: location.point });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool !== "arrow" || !arrowStart.current) return;
    const location = eventPoint(event);
    const start = arrowStart.current;
    arrowStart.current = null;
    setPreview(null);
    if (!location) return;
    const distance = Math.hypot(location.point.fret - start.fret, location.point.string - start.string);
    if (distance > 0.25) onArrow({ start, end: location.point });
  }

  const markerSummary = board.markers.map((marker) => `${noteName(marker, preference)}，${marker.stringIndex + 1}弦${marker.fret === 0 ? "空弦" : `${marker.fret}品`}${marker.root ? "，主音" : ""}`).join("；");
  return <article className={`fretboard-board ${active ? "active" : ""} ${orientation}`}>
    <div className="fretboard-board-label"><span>指板 {board.id}</span><small>{active ? "正在编辑" : "点击切换"}</small></div>
    <div className="fretboard-scroll">
      <canvas ref={canvasRef} className="fretboard-canvas" aria-label={`指板 ${board.id}${markerSummary ? `：${markerSummary}` : "，暂无标记"}`} onClick={handleClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={() => { arrowStart.current = null; setPreview(null); }} />
    </div>
  </article>;
}

let nextBoardId = 2;

export function FretboardWhiteboard() {
  const [title, setTitle] = useState("吉他指板练习");
  const [boards, setBoards] = useState<BoardState[]>([{ id: 1, markers: [], arrows: [] }]);
  const [history, setHistory] = useState<WorkbenchSnapshot[]>([]);
  const [activeBoardId, setActiveBoardId] = useState(1);
  const [startFret, setStartFret] = useState(1);
  const [endFret, setEndFret] = useState(15);
  const [preference, setPreference] = useState<NotePreference>("sharps");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("names");
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [tool, setTool] = useState<Tool>("note");
  const [quickMarkMode, setQuickMarkMode] = useState<QuickMarkMode>("scale");
  const [circleKeyIndex, setCircleKeyIndex] = useState(0);
  const [keyMode, setKeyMode] = useState<KeyMode>("major");
  const [degree, setDegree] = useState(0);
  const [soundStatus, setSoundStatus] = useState<SoundStatus>("idle");
  const soundEnabled = useSyncExternalStore(subscribeToGuitarSound, guitarSoundSnapshot, () => true);

  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];
  const selectedScalePitchClasses = keyPitchClasses(circleKeyIndex, keyMode);
  const selectedScaleNoteNames = keyNoteNames(circleKeyIndex, keyMode, preference);
  const selectedTonic = keyTonicName(circleKeyIndex, keyMode, preference);
  const selectedKeyTitle = `${selectedTonic} ${keyMode === "major" ? "大调" : "自然小调"}`;
  const degreeLabels = keyMode === "major" ? MAJOR_DEGREES : MINOR_DEGREES;
  const seventhQualities = keyMode === "major" ? MAJOR_SEVENTH_QUALITIES : MINOR_SEVENTH_QUALITIES;
  const chordScaleIndexes = [degree, degree + 2, degree + 4, degree + 6].map((index) => index % 7);
  const selectedChordPitchClasses = chordScaleIndexes.map((index) => selectedScalePitchClasses[index]);
  const selectedChordNoteNames = chordScaleIndexes.map((index) => selectedScaleNoteNames[index]);
  const selectedChordName = `${selectedChordNoteNames[0]}${seventhQualities[degree]}`;

  function rememberWorkbench() {
    const snapshot: WorkbenchSnapshot = {
      title,
      activeBoardId,
      boards: boards.map((board) => ({
        ...board,
        markers: board.markers.map((marker) => ({ ...marker })),
        arrows: board.arrows.map((arrow) => ({ start: { ...arrow.start }, end: { ...arrow.end } })),
      })),
    };
    setHistory((current) => [...current, snapshot].slice(-50));
  }

  const undoLastChange = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setTitle(previous.title);
    setBoards(previous.boards);
    setActiveBoardId(previous.activeBoardId);
    setHistory((current) => current.slice(0, -1));
  }, [history]);

  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z" || event.shiftKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      event.preventDefault();
      undoLastChange();
    };
    window.addEventListener("keydown", handleUndoShortcut);
    return () => window.removeEventListener("keydown", handleUndoShortcut);
  }, [undoLastChange]);

  function setBoardCount(count: number) {
    const nextCount = Math.min(3, Math.max(1, count));
    if (nextCount === boards.length) return;
    rememberWorkbench();
    setBoards((current) => {
      if (nextCount < current.length) {
        const next = current.slice(0, nextCount);
        if (!next.some((board) => board.id === activeBoardId)) setActiveBoardId(next[next.length - 1].id);
        return next;
      }
      const additions = Array.from({ length: nextCount - current.length }, () => ({ id: nextBoardId++, markers: [], arrows: [] }));
      return [...current, ...additions];
    });
  }

  function updateBoard(id: number, update: (board: BoardState) => BoardState) {
    setBoards((current) => current.map((board) => board.id === id ? update(board) : board));
  }

  function toggleMarker(id: number, marker: Omit<Marker, "root">, makeRoot: boolean) {
    const board = boards.find((item) => item.id === id);
    const markerExists = board?.markers.some((item) => item.fret === marker.fret && item.stringIndex === marker.stringIndex) ?? false;
    if (soundEnabled && (makeRoot || !markerExists)) {
      setSoundStatus("loading");
      const midi = TUNING[marker.stringIndex].midi + marker.fret;
      void playGuitarTone(midi).then(() => setSoundStatus("ready")).catch(() => setSoundStatus("error"));
    }
    rememberWorkbench();
    updateBoard(id, (board) => {
      const index = board.markers.findIndex((item) => item.fret === marker.fret && item.stringIndex === marker.stringIndex);
      if (makeRoot) {
        if (index < 0) return { ...board, markers: [...board.markers, { ...marker, root: true }] };
        return { ...board, markers: board.markers.map((item, itemIndex) => itemIndex === index ? { ...item, root: !item.root } : item) };
      }
      if (index >= 0) return { ...board, markers: board.markers.filter((_, itemIndex) => itemIndex !== index) };
      return { ...board, markers: [...board.markers, { ...marker, root: false }] };
    });
  }

  function addArrow(id: number, arrow: BoardArrow) {
    rememberWorkbench();
    updateBoard(id, (board) => ({ ...board, arrows: [...board.arrows, arrow] }));
  }

  function clearAll() {
    if (!boards.some((board) => board.markers.length || board.arrows.length)) return;
    if (!window.confirm("清空所有指板上的音符和箭头？")) return;
    rememberWorkbench();
    setBoards((current) => current.map((board) => ({ ...board, markers: [], arrows: [] })));
  }

  function downloadPng() {
    const boardWidth = orientation === "horizontal" ? 1600 : 820;
    const boardHeight = orientation === "horizontal" ? 430 : 1120;
    const headerHeight = title.trim() ? 150 : 72;
    const gap = 34;
    const footerHeight = 76;
    const canvas = document.createElement("canvas");
    canvas.width = boardWidth;
    canvas.height = headerHeight + boards.length * boardHeight + Math.max(0, boards.length - 1) * gap + footerHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = PAPER;
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (title.trim()) {
      context.fillStyle = INK;
      context.font = '500 50px Georgia, "Songti SC", serif';
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(title.trim(), 64, 76);
      context.strokeStyle = "#e0d5c3";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(64, 124);
      context.lineTo(boardWidth - 64, 124);
      context.stroke();
    }
    boards.forEach((board, index) => {
      context.save();
      context.translate(0, headerHeight + index * (boardHeight + gap));
      drawBoard(context, boardWidth, boardHeight, board, startFret, endFret, orientation, preference, displayMode);
      context.restore();
    });
    context.fillStyle = "#8a918a";
    context.font = '22px Arial, "PingFang SC", sans-serif';
    context.textAlign = "right";
    context.fillText("谱练 · 指板白板", boardWidth - 64, canvas.height - 30);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${title.trim().replace(/[\\/:*?\"<>|]/g, "-") || "指板白板"}.png`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function updateStart(value: number) {
    const next = Math.min(23, Math.max(1, value));
    setStartFret(next);
    if (next >= endFret) setEndFret(Math.min(24, next + 1));
  }

  function updateEnd(value: number) {
    const next = Math.min(24, Math.max(1, value));
    setEndFret(next);
    if (next <= startFret) setStartFret(Math.max(1, next - 1));
  }

  function toggleSound() {
    const next = !soundEnabled;
    fallbackSoundPreference = next;
    try {
      window.localStorage.setItem(GUITAR_SOUND_ENABLED_KEY, String(next));
    } catch {
      // The in-memory preference still works when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(GUITAR_SOUND_CHANGED_EVENT));
  }

  function selectCircleKey(index: number, mode: KeyMode) {
    setCircleKeyIndex(index);
    setKeyMode(mode);
    if (index > 0 && index < 6) setPreference("sharps");
    if (index > 6) setPreference("flats");
  }

  function applyQuickMark() {
    const isScale = quickMarkMode === "scale";
    const pitchClasses = isScale ? selectedScalePitchClasses : selectedChordPitchClasses;
    const noteNames = isScale ? selectedScaleNoteNames : selectedChordNoteNames;
    const rootPc = isScale ? selectedScalePitchClasses[0] : selectedChordPitchClasses[0];
    const markers = generatedMarkers(startFret, endFret, pitchClasses, noteNames, rootPc);
    rememberWorkbench();
    updateBoard(activeBoard.id, (board) => ({ ...board, markers }));
    setTitle(isScale
      ? `${selectedKeyTitle}音阶`
      : `${selectedKeyTitle} · ${degreeLabels[degree]} 级 ${selectedChordName} 七和弦琶音`);
  }

  return <section className="fretboard-workbench" aria-label="指板白板工作区">
    <div className="fretboard-toolbar">
      <label className="fretboard-title-field"><span>图片标题</span><input value={title} maxLength={36} onChange={(event) => setTitle(event.target.value)} placeholder="例如：G 大调指型" /></label>
      <div className="fretboard-actions">
        <button className={tool === "note" ? "selected" : ""} onClick={() => setTool("note")} aria-pressed={tool === "note"}>● 音符</button>
        <button className={tool === "arrow" ? "selected" : ""} onClick={() => setTool("arrow")} aria-pressed={tool === "arrow"}>↗ 箭头</button>
        <button className={`fretboard-sound-toggle ${soundEnabled ? "on" : ""}`} onClick={toggleSound} aria-pressed={soundEnabled}>{!soundEnabled ? "♩ 声音关" : soundStatus === "loading" ? "♩ 加载吉他…" : soundStatus === "error" ? "♩ 音源不可用" : "♩ 吉他音色"}</button>
        <button onClick={() => setOrientation((value) => value === "horizontal" ? "vertical" : "horizontal")}>↻ 旋转</button>
        <button onClick={downloadPng} className="primary">↓ 下载 PNG</button>
      </div>
    </div>

    <section className="quick-mark-panel" aria-labelledby="quick-mark-title">
      <header className="quick-mark-heading">
        <div><span>QUICK MARK</span><h2 id="quick-mark-title">快速标记</h2></div>
        <p>从五度圈选择调，在当前指板上一键展开全部位置。</p>
      </header>
      <div className="quick-mark-body">
        <div className="circle-wrap">
          <div className="circle-caption"><span>外圈 · 大调</span><span>内圈 · 自然小调</span></div>
          <div className="circle-of-fifths" aria-label="五度圈调性选择器">
            <div className="circle-ring outer-ring" />
            <div className="circle-ring inner-ring" />
            {CIRCLE_KEYS.map((key, index) => <button
              key={`major-${key.major}`}
              type="button"
              className={`circle-key outer-key ${circleKeyIndex === index && keyMode === "major" ? "selected" : ""}`}
              style={circlePosition(index, 43)}
              onClick={() => selectCircleKey(index, "major")}
              aria-pressed={circleKeyIndex === index && keyMode === "major"}
              aria-label={`${key.major} 大调`}
              title={`${key.major} 大调`}
            >{key.major.replace(" / ", "/")}</button>)}
            {CIRCLE_KEYS.map((key, index) => <button
              key={`minor-${key.minor}`}
              type="button"
              className={`circle-key inner-key ${circleKeyIndex === index && keyMode === "minor" ? "selected" : ""}`}
              style={circlePosition(index, 28)}
              onClick={() => selectCircleKey(index, "minor")}
              aria-pressed={circleKeyIndex === index && keyMode === "minor"}
              aria-label={`${key.minor} 自然小调`}
              title={`${key.minor} 自然小调`}
            >{key.minor.replace(" / ", "/")}</button>)}
            <div className="circle-center"><strong>{selectedTonic}</strong><span>{keyMode === "major" ? "大调" : "自然小调"}</span></div>
          </div>
        </div>

        <div className="quick-mark-config">
          <div className="quick-mark-tabs" role="tablist" aria-label="快速标记类型">
            <button type="button" role="tab" aria-selected={quickMarkMode === "scale"} className={quickMarkMode === "scale" ? "selected" : ""} onClick={() => setQuickMarkMode("scale")}>音阶</button>
            <button type="button" role="tab" aria-selected={quickMarkMode === "arpeggio"} className={quickMarkMode === "arpeggio" ? "selected" : ""} onClick={() => setQuickMarkMode("arpeggio")}>级数七和弦</button>
          </div>
          <div className="quick-mark-selection">
            <span>当前选择</span>
            <h3>{quickMarkMode === "scale" ? `${selectedKeyTitle}音阶` : `${selectedKeyTitle} · ${degreeLabels[degree]} 级 ${selectedChordName}`}</h3>
            <p>{(quickMarkMode === "scale" ? selectedScaleNoteNames : selectedChordNoteNames).join("　")}</p>
          </div>
          {quickMarkMode === "arpeggio" && <div className="degree-picker" aria-label="选择级数">
            <span>选择级数</span>
            <div>{degreeLabels.map((label, index) => <button key={`${label}-${index}`} type="button" className={degree === index ? "selected" : ""} onClick={() => setDegree(index)} aria-pressed={degree === index}>
              <b>{label}</b><small>{selectedScaleNoteNames[index]}{seventhQualities[index]}</small>
            </button>)}</div>
          </div>}
          <div className="quick-mark-submit">
            <button type="button" onClick={applyQuickMark}>标记到指板 {activeBoard.id}</button>
            <small>替换当前指板的音符，保留已经画好的箭头</small>
          </div>
        </div>
      </div>
    </section>

    <div className="fretboard-controls">
      <label><span>指板数量</span><input type="number" min="1" max="3" value={boards.length} onChange={(event) => setBoardCount(Number(event.target.value))} /></label>
      <label><span>起始品位</span><input type="number" min="1" max="23" value={startFret} onChange={(event) => updateStart(Number(event.target.value))} /></label>
      <label><span>结束品位</span><input type="number" min="1" max="24" value={endFret} onChange={(event) => updateEnd(Number(event.target.value))} /></label>
      <label><span>升降记号</span><select value={preference} onChange={(event) => setPreference(event.target.value as NotePreference)}><option value="sharps">升记号</option><option value="flats">降记号</option></select></label>
      <label><span>显示模式</span><select value={displayMode} onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}><option value="names">音名模式</option><option value="dots">纯圆点</option></select></label>
      <button onClick={undoLastChange} disabled={!history.length} title="撤回上一步（⌘/Ctrl + Z）">↶ 撤回</button>
      <button onClick={clearAll} className="danger">清空</button>
    </div>

    <div className={`fretboard-board-list ${orientation}`}>
      {boards.map((board) => <BoardCanvas key={board.id} board={board} active={board.id === activeBoardId} startFret={startFret} endFret={endFret} orientation={orientation} preference={preference} displayMode={displayMode} tool={tool} onActivate={() => setActiveBoardId(board.id)} onSoundUnlock={() => { if (soundEnabled) unlockGuitarAudio(); }} onMarker={(marker, makeRoot) => toggleMarker(board.id, marker, makeRoot)} onArrow={(arrow) => addArrow(board.id, arrow)} />)}
    </div>
    <div className="fretboard-help"><span><b>空弦音</b> 点击上弦枕外侧的音名</span><span><b>撤回</b> 支持 ⌘/Ctrl + Z</span><span><b>快速标记</b> 替换当前指板音符</span><span><b>单击</b> 添加或删除音符</span><span><b>双击</b> 切换橙色主音</span><span><b>箭头模式</b> 在指板上拖拽</span><span>标准调弦 E–A–D–G–B–E</span><a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer">吉他音源 FluidR3_GM · CC BY 3.0</a></div>
  </section>;
}
