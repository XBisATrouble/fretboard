import { FretboardWhiteboard } from "../../components/fretboard-whiteboard";
import { SiteHeader } from "../../components/site-header";

export default function FretboardPage() {
  return <main className="fretboard-page shell">
    <SiteHeader area="guitar" currentHref="/fretboard/" currentLabel="指板白板" />
    <section className="fretboard-hero">
      <p className="eyebrow">FRETBOARD CANVAS · STANDARD TUNING</p>
      <h1>把指型，<em>清楚地画出来。</em></h1>
      <p>点选音符、强调主音、画出方向，再下载成一张干净的指板图片。没有乐理限制，这里就是你的教学白板。</p>
    </section>
    <FretboardWhiteboard />
  </main>;
}
