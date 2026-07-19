"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnswerFeedback = "idle" | "correct" | "wrong";

export function usePracticeInput() {
  const [feedback, setFeedback] = useState<AnswerFeedback>("idle");
  const lastInputAt = useRef(-Infinity);
  const feedbackTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  const acceptInput = useCallback(() => {
    const now = performance.now();
    if (now - lastInputAt.current < 150) return false;
    lastInputAt.current = now;
    return true;
  }, []);

  const flashFeedback = useCallback((next: Exclude<AnswerFeedback, "idle">) => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    setFeedback(next);
    feedbackTimer.current = window.setTimeout(() => setFeedback("idle"), 260);
  }, []);

  const resetFeedback = useCallback(() => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
    lastInputAt.current = -Infinity;
    setFeedback("idle");
  }, []);

  return { feedback, acceptInput, flashFeedback, resetFeedback };
}
