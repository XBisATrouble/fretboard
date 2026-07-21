import type { Metadata } from "next";
import { sitePath } from "../../lib/site-path";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "视唱练耳｜谱练",
  description: "视唱练耳能力规划：音程、三和弦、旋律听写与视唱练习。",
};

const planned = [
  { number: "01", title: "音程听辨", detail: "从旋律音程到和声音程，建立稳定的距离感。" },
  { number: "02", title: "三和弦听辨", detail: "辨认大、小、减三和弦的色彩与张力。" },
  { number: "03", title: "旋律听写", detail: "听短句，用琴键与五线谱还原音高走向。" },
  { number: "04", title: "视唱练习", detail: "看谱、获得起始音，再独立唱出旋律。" },
];

export default function EarTrainingPage() {
  return <main className="ear-page shell">
    <SiteHeader area="ear" currentHref="/ear-training/" currentLabel="视唱练耳" />
    <section className="ear-hero"><p className="eyebrow">EAR TRAINING · COMING NEXT</p><h1>先在心里，<em>听见那个音。</em></h1><p>这里将连接听觉、歌唱与乐谱。第一阶段从音程和三和弦听辨开始，再进入旋律听写与视唱。</p></section>
    <section className="ear-roadmap" aria-label="视唱练耳能力规划">{planned.map((item) => <article key={item.number}><span>{item.number}</span><div><p>PLANNED</p><h2>{item.title}</h2><small>{item.detail}</small></div></article>)}</section>
    <div className="ear-note"><strong>正在规划</strong><p>视唱练耳暂未开放练习。你可以先从 <a href={sitePath("/reading/")}>读谱训练</a> 或 <a href={sitePath("/triads/")}>三和弦练习</a> 建立视觉与和声基础。</p></div>
  </main>;
}
