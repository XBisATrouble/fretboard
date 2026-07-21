import assert from "node:assert/strict";
import test from "node:test";
import { answerOptionsForLevel, generateIntervalQuestion } from "../lib/ear-training.ts";

for (const level of ["tonic", "degrees", "diatonic", "chromatic"]) {
  test(`${level} questions stay playable and answerable`, () => {
    const options = new Set(answerOptionsForLevel(level).map((interval) => interval.id));
    const counts = new Map();
    for (let index = 0; index < 1200; index += 1) {
      const question = generateIntervalQuestion(level, Math.floor(index / 5), "mixed");
      assert.ok(question.low.midi >= 53 && question.high.midi <= 84);
      assert.equal(question.high.midi - question.low.midi, question.interval.semitones);
      assert.ok(options.has(question.interval.id));
      assert.ok(Math.abs(question.low.accidental) <= 1 && Math.abs(question.high.accidental) <= 1);
      if (question.direction === "ascending") assert.ok(question.first.midi < question.second.midi);
      if (question.direction === "descending") assert.ok(question.first.midi > question.second.midi);
      counts.set(question.interval.id, (counts.get(question.interval.id) ?? 0) + 1);
    }
    if (level === "diatonic" || level === "chromatic") assert.equal(counts.size, 12);
  });
}
