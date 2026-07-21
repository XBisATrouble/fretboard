import type { Metadata } from "next";
import { IntervalEarTraining } from "../../../components/interval-ear-training";

export const metadata: Metadata = {
  title: "音程听辨｜谱练",
  description: "在调性中听辨与预唱音程，用标准五线谱连接声音、音级和音名。",
};

export default function IntervalEarTrainingPage() {
  return <IntervalEarTraining />;
}
