import type { Metadata } from "next";
import { FlashcardPractice } from "../../components/flashcard-practice";

export const metadata: Metadata = {
  title: "读谱训练｜谱练",
  description: "通过逐音练习建立五线谱位置与钢琴键盘之间的即时反应。",
};

export default function ReadingPage() {
  return <FlashcardPractice />;
}
