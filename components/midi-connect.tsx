"use client";

import { useMidiInput } from "../lib/use-midi-input";

export function MidiConnect({ onNote }: { onNote: (note: string) => void }) {
  const { state, deviceNames, connect } = useMidiInput(onNote);
  const labels = {
    connecting: "🎹 MIDI 连接中…",
    connected: `🎹 MIDI 已连接${deviceNames.length > 1 ? ` · ${deviceNames.length} 台` : ""}`,
    waiting: "🎹 连接 MIDI 键盘",
    unsupported: "🎹 浏览器不支持 MIDI",
    denied: "🎹 点击允许 MIDI",
  };
  const detail = deviceNames.length ? deviceNames.join("、") : undefined;

  return <button className={`midi-button ${state === "connected" ? "connected" : ""}`} onClick={() => void connect()} title={detail} aria-label={detail ? `已连接 MIDI 键盘：${detail}` : labels[state]}>
    {labels[state]}
  </button>;
}
