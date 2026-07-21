import type { Metadata } from "next";
import { ArpeggioPractice } from "../../components/arpeggio-practice";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "琶音练习｜谱练",
  description: "用循环和弦伴奏练习吉他琶音，在全指板或局部把位中看清当前和弦音。",
};

export default function ArpeggioPage() {
  return <main className="arpeggio-page shell">
    <SiteHeader area="guitar" currentHref="/arpeggio/" currentLabel="琶音练习" />
    <section className="arpeggio-hero">
      <p className="eyebrow">ARPEGGIO LAB · CHORD PROGRESSION</p>
      <h1>听见和声，<em>看见琶音。</em></h1>
      <p>随机生成一段循环和弦伴奏，让指板随小节切换练习目标。伴奏负责和声，琶音由你亲自弹奏。</p>
    </section>
    <ArpeggioPractice />
  </main>;
}
