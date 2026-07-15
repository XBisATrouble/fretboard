import { LIBRARY_PIECES } from "../../lib/repertoire";

export default function LibraryPage() {
  return <main className="library-page shell">
    <header className="topbar"><a className="brand" href="/"><span>谱</span>练</a><a className="back-library" href="/">← 返回首页体验</a><div className="top-note">第一阶段 · <b>右手单音</b></div></header>
    <section className="library-hero"><p className="eyebrow">REPERTOIRE · NO RHYTHM YET</p><h1>用完整小品，<em>读懂每一个音。</em></h1><p>先专注高音谱号与右手单音。每首曲子按谱行推进，答对后自动进入下一行。</p></section>
    <section className="library-grid" aria-label="练习曲库">{LIBRARY_PIECES.map((piece, index) => <a className="library-card" href={`/library/${piece.id}`} key={piece.id}><span className="library-number">{String(index + 1).padStart(2, "0")}</span><div><p>{piece.level}</p><h2>{piece.title}</h2><small>{piece.composer}</small><div className="piece-tags"><span>{piece.key}</span><span>{piece.focus}</span></div></div><b>开始练习 →</b></a>)}</section>
  </main>;
}
