"use client";

import { useMemo, useState } from "react";
import type { KeySignature } from "../lib/key-signatures";
import { TrebleStaff } from "./treble-staff";

export type PracticeAttempt = {
  target: string;
  played: string;
  correct: boolean;
};

type PracticeResultsProps = {
  attempts: PracticeAttempt[];
  onReviewWrong: () => void;
  onRestart: () => void;
  restartLabel?: string;
  keySignature?: KeySignature;
  systemLengths?: number[];
  showOnlyWrong?: boolean;
};

type IndexedAttempt = {
  attempt: PracticeAttempt;
  originalIndex: number;
};

function mostMissedNotes(attempts: PracticeAttempt[]) {
  const counts = new Map<string, number>();
  attempts.filter((attempt) => !attempt.correct).forEach((attempt) => {
    counts.set(attempt.target, (counts.get(attempt.target) ?? 0) + 1);
  });
  const highest = Math.max(0, ...counts.values());
  return [...counts.entries()].filter(([, count]) => count === highest).map(([note]) => note);
}

function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function splitBySystems(items: IndexedAttempt[], systemLengths?: number[]) {
  if (!systemLengths?.length || systemLengths.reduce((sum, length) => sum + length, 0) !== items.length) return chunk(items, 16);
  let start = 0;
  return systemLengths.map((length) => {
    const row = items.slice(start, start + length);
    start += length;
    return row;
  });
}

export function PracticeResults({ attempts, onReviewWrong, onRestart, restartLabel = "重新练习", keySignature, systemLengths, showOnlyWrong = false }: PracticeResultsProps) {
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);
  const wrong = attempts.filter((attempt) => !attempt.correct);
  const correct = attempts.length - wrong.length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const mostMissed = mostMissedNotes(attempts);
  const rows = useMemo(() => {
    const indexed = attempts.map((attempt, originalIndex) => ({ attempt, originalIndex }));
    return showOnlyWrong ? chunk(indexed.filter(({ attempt }) => !attempt.correct), 12) : splitBySystems(indexed, systemLengths);
  }, [attempts, showOnlyWrong, systemLengths]);
  const selected = selectedAttempt === null ? null : attempts[selectedAttempt];

  return <section className="practice-results score-results" aria-live="polite">
    <div className="result-summary">
      <div className="result-score"><span>本轮完成</span><strong>{accuracy}<small>%</small></strong><p>{correct} / {attempts.length} 个音正确</p></div>
      {wrong.length > 0 ? <div className="result-overview"><strong>{showOnlyWrong ? "错题五线谱" : "乐谱回顾"}</strong><p>红圈标出了本轮错音。点击音符查看实际弹奏结果。</p><span>最容易错：<b>{mostMissed.join("、")}</b></span></div> : <p className="perfect-result">全部正确，音符与琴键的对应已经很熟练了。</p>}
    </div>

    {wrong.length > 0 && <div className="result-staves">
      {rows.map((row, rowIndex) => <TrebleStaff key={rowIndex} className="result-staff" ariaLabel={`结果回顾第 ${rowIndex + 1} 行`} notes={row.map(({ attempt }) => attempt.target)} keySignature={keySignature} notePosition={(index, count) => ({ left: `${11 + index * (80 / Math.max(count - 1, 1))}%` })} noteStatus={(_, index) => row[index].attempt.correct ? "correct" : "wrong"} selectedIndex={row.findIndex(({ originalIndex }) => originalIndex === selectedAttempt)} onNoteSelect={(index) => setSelectedAttempt(row[index].originalIndex)} />)}
    </div>}

    {wrong.length > 0 && <div className={`result-note-detail ${selected ? "selected" : ""}`}>
      {selected ? <><span>目标音 <b>{selected.target}</b></span><i>→</i><span>实际弹奏 <b>{selected.played}</b></span></> : <span>点击一个红圈音符，查看这道错题。</span>}
    </div>}

    <div className="result-actions">
      {wrong.length > 0 && <button onClick={onReviewWrong}>只练错题</button>}
      <button className="secondary" onClick={onRestart}>{restartLabel}</button>
    </div>
  </section>;
}
