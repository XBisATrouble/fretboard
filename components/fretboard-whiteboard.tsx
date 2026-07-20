"use client";

import { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

type NotePreference = "sharps" | "flats";
type DisplayMode = "names" | "dots";
type Orientation = "horizontal" | "vertical";
type Tool = "note" | "arrow";

type Marker = { stringIndex: number; fret: number; root: boolean };
type GridPoint = { fret: number; string: number };
type BoardArrow = { start: GridPoint; end: GridPoint };
type BoardState = { id: number; markers: Marker[]; arrows: BoardArrow[] };

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
const INK = "#17362f";
const LINE = "#747971";
const ACCENT = "#dc952c";
const PAPER = "#fffdf8";

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
  const midi = TUNING[marker.stringIndex].midi + marker.fret;
  return (preference === "sharps" ? SHARP_NAMES : FLAT_NAMES)[midi % 12];
}

function gridToCanvas(point: GridPoint, geometry: Geometry, orientation: Orientation, startFret: number) {
  if (orientation === "horizontal") {
    return { x: geometry.left + (point.fret - startFret) * geometry.fretSize, y: geometry.top + point.string * geometry.stringSize };
  }
  return { x: geometry.left + point.string * geometry.stringSize, y: geometry.top + (point.fret - startFret) * geometry.fretSize };
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
    const markerStrings = fret % 12 === 0 ? [2.5, 3.5] : [2.5];
    for (const string of markerStrings) {
      const point = gridToCanvas({ fret: fret + 0.5, string }, geometry, orientation, startFret);
      context.beginPath();
      context.arc(point.x, point.y, 7, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  for (const marker of board.markers) {
    if (marker.fret < startFret || marker.fret > endFret) continue;
    const point = gridToCanvas({ fret: marker.fret + 0.5, string: marker.stringIndex }, geometry, orientation, startFret);
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
  onMarker: (marker: Omit<Marker, "root">, makeRoot: boolean) => void;
  onArrow: (arrow: BoardArrow) => void;
};

function BoardCanvas({ board, active, startFret, endFret, orientation, preference, displayMode, tool, onActivate, onMarker, onArrow }: BoardCanvasProps) {
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
    const fret = Math.min(endFret, Math.max(startFret, Math.floor(location.point.fret)));
    const stringIndex = Math.min(5, Math.max(0, Math.round(location.point.string)));
    return { fret, stringIndex };
  }

  function handleClick(event: ReactMouseEvent<HTMLCanvasElement>) {
    if (tool !== "note") return;
    const marker = markerAt(event);
    if (!marker) return;
    onActivate();
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

  const markerSummary = board.markers.map((marker) => `${noteName(marker, preference)}，${marker.stringIndex + 1}弦${marker.fret}品${marker.root ? "，主音" : ""}`).join("；");
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
  const [activeBoardId, setActiveBoardId] = useState(1);
  const [startFret, setStartFret] = useState(1);
  const [endFret, setEndFret] = useState(12);
  const [preference, setPreference] = useState<NotePreference>("sharps");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("names");
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [tool, setTool] = useState<Tool>("note");

  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];

  function setBoardCount(count: number) {
    const nextCount = Math.min(3, Math.max(1, count));
    setBoards((current) => {
      if (nextCount === current.length) return current;
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
    updateBoard(id, (board) => ({ ...board, arrows: [...board.arrows, arrow] }));
  }

  function undoArrow() {
    updateBoard(activeBoard.id, (board) => ({ ...board, arrows: board.arrows.slice(0, -1) }));
  }

  function clearAll() {
    if (!boards.some((board) => board.markers.length || board.arrows.length)) return;
    if (!window.confirm("清空所有指板上的音符和箭头？")) return;
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
    const next = Math.min(23, Math.max(0, value));
    setStartFret(next);
    if (next >= endFret) setEndFret(Math.min(24, next + 1));
  }

  function updateEnd(value: number) {
    const next = Math.min(24, Math.max(1, value));
    setEndFret(next);
    if (next <= startFret) setStartFret(Math.max(0, next - 1));
  }

  return <section className="fretboard-workbench" aria-label="指板白板工作区">
    <div className="fretboard-toolbar">
      <label className="fretboard-title-field"><span>图片标题</span><input value={title} maxLength={36} onChange={(event) => setTitle(event.target.value)} placeholder="例如：G 大调指型" /></label>
      <div className="fretboard-actions">
        <button className={tool === "note" ? "selected" : ""} onClick={() => setTool("note")} aria-pressed={tool === "note"}>● 音符</button>
        <button className={tool === "arrow" ? "selected" : ""} onClick={() => setTool("arrow")} aria-pressed={tool === "arrow"}>↗ 箭头</button>
        <button onClick={() => setOrientation((value) => value === "horizontal" ? "vertical" : "horizontal")}>↻ 旋转</button>
        <button onClick={downloadPng} className="primary">↓ 下载 PNG</button>
      </div>
    </div>

    <div className="fretboard-controls">
      <label><span>指板数量</span><input type="number" min="1" max="3" value={boards.length} onChange={(event) => setBoardCount(Number(event.target.value))} /></label>
      <label><span>起始品位</span><input type="number" min="0" max="23" value={startFret} onChange={(event) => updateStart(Number(event.target.value))} /></label>
      <label><span>结束品位</span><input type="number" min="1" max="24" value={endFret} onChange={(event) => updateEnd(Number(event.target.value))} /></label>
      <label><span>升降记号</span><select value={preference} onChange={(event) => setPreference(event.target.value as NotePreference)}><option value="sharps">升记号</option><option value="flats">降记号</option></select></label>
      <label><span>显示模式</span><select value={displayMode} onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}><option value="names">音名模式</option><option value="dots">纯圆点</option></select></label>
      <button onClick={undoArrow} disabled={!activeBoard.arrows.length}>撤销箭头</button>
      <button onClick={clearAll} className="danger">清空</button>
    </div>

    <div className={`fretboard-board-list ${orientation}`}>
      {boards.map((board) => <BoardCanvas key={board.id} board={board} active={board.id === activeBoardId} startFret={startFret} endFret={endFret} orientation={orientation} preference={preference} displayMode={displayMode} tool={tool} onActivate={() => setActiveBoardId(board.id)} onMarker={(marker, makeRoot) => toggleMarker(board.id, marker, makeRoot)} onArrow={(arrow) => addArrow(board.id, arrow)} />)}
    </div>
    <div className="fretboard-help"><span><b>单击</b> 添加或删除音符</span><span><b>双击</b> 切换橙色主音</span><span><b>箭头模式</b> 在指板上拖拽</span><span>标准调弦 E–A–D–G–B–E</span></div>
  </section>;
}
