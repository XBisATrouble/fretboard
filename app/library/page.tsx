import { LibraryCatalog } from "../../components/library-catalog";
import { LIBRARY_PIECES } from "../../lib/repertoire";
import { sitePath } from "../../lib/site-path";

export default function LibraryPage() {
  return <main className="library-page shell">
    <header className="topbar"><a className="brand" href={sitePath("/")}><span>谱</span>练</a><a className="back-library" href={sitePath("/")}>← 返回首页体验</a><div className="top-note">第一阶段 · <b>右手单音</b></div></header>
    <section className="library-hero"><p className="eyebrow">REPERTOIRE · NO RHYTHM YET</p><h1>用经典旋律，<em>读懂每一个音。</em></h1><p>保留作品原调或传统常用调号，先专注高音谱号与右手单音；也可以按调号筛选曲目，集中熟悉升降号位置。</p></section>
    <LibraryCatalog pieces={LIBRARY_PIECES} />
  </main>;
}
