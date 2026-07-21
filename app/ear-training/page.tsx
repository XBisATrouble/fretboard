import type { Metadata } from "next";
import { sitePath } from "../../lib/site-path";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "视唱练耳｜谱练",
  description: "视唱练耳能力规划：音程、三和弦、旋律听写与视唱练习。",
};

const planned = [
  { number: "01", title: "音程听辨", detail: "已开放：在调性中连接声音、内听与标准五线谱。", href: "/ear-training/intervals/", status: "AVAILABLE" },
  { number: "02", title: "三和弦听辨", detail: "辨认大、小、减三和弦的色彩与张力。" },
  { number: "03", title: "旋律听写", detail: "听短句，用琴键与五线谱还原音高走向。" },
  { number: "04", title: "视唱练习", detail: "看谱、获得起始音，再独立唱出旋律。" },
];

export default function EarTrainingPage() {
  return <main className="ear-page shell">
    <SiteHeader area="ear" currentHref="/ear-training/" />
    <section className="ear-hero"><p className="eyebrow">EAR TRAINING · INNER HEARING</p><h1>先在心里，<em>听见那个音。</em></h1><p>连接听觉、歌唱与乐谱。第一阶段从音程听辨与内听预唱开始，再进入和弦、旋律听写与视唱。</p><a className="ear-primary-link" href={sitePath("/ear-training/intervals/")}>开始音程听辨 <span>→</span></a></section>
    <section className="ear-roadmap" aria-label="视唱练耳能力规划">{planned.map((item) => <article key={item.number} className={item.href ? "available" : ""}><span>{item.number}</span><div><p>{item.status ?? "PLANNED"}</p><h2>{item.title}</h2><small>{item.detail}</small>{item.href && <a href={sitePath(item.href)}>进入练习 →</a>}</div></article>)}</section>
    <div className="ear-note"><strong>学习路线</strong><p>先从调性中的音程关系开始；如果五线谱位置还不熟，可以配合 <a href={sitePath("/reading/")}>读谱训练</a> 建立视觉基础。</p></div>
  </main>;
}
