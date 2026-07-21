import { FretboardWhiteboard } from "../../components/fretboard-whiteboard";
import { sitePath } from "../../lib/site-path";

export default function FretboardPage() {
  return <main className="fretboard-page shell">
    <header className="topbar">
      <a className="brand" href={sitePath("/")}><span>谱</span>练</a>
      <a className="back-library" href={sitePath("/")}>← 返回首页体验</a>
      <a className="library-link" href={sitePath("/flashcards/")}>读谱闪卡</a>
      <a className="library-link" href={sitePath("/library/")}>完整曲库</a>
      <span className="library-link current">指板白板</span>
      <a className="library-link" href={sitePath("/arpeggio/")}>琶音练习</a>
      <a className="library-link" href={sitePath("/triads/")}>三和弦练习</a>
    </header>
    <section className="fretboard-hero">
      <p className="eyebrow">FRETBOARD CANVAS · STANDARD TUNING</p>
      <h1>把指型，<em>清楚地画出来。</em></h1>
      <p>点选音符、强调主音、画出方向，再下载成一张干净的指板图片。没有乐理限制，这里就是你的教学白板。</p>
    </section>
    <FretboardWhiteboard />
  </main>;
}
