import type { Metadata } from "next";
import { TriadPractice } from "../../components/triad-practice";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "三和弦练习｜谱练",
  description: "按调性、级数与相邻弦组练习吉他大三和弦、小三和弦和减三和弦的原位与转位。",
};

export default function TriadsPage() {
  return <main className="triad-page shell">
    <SiteHeader area="guitar" currentHref="/triads/" currentLabel="三和弦练习" />
    <section className="triad-hero">
      <p className="eyebrow">TRIAD LAB · CLOSE VOICING</p>
      <h1>三根弦，<em>看清和声骨架。</em></h1>
      <p>选择调性与级数，在四组相邻三弦上练习大、小、减三和弦。沿指板依次掌握原位、第一转位与第二转位。</p>
    </section>
    <TriadPractice />
  </main>;
}
