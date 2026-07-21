import { LibraryCatalog } from "../../components/library-catalog";
import { LIBRARY_PIECES } from "../../lib/repertoire";
import { sitePath } from "../../lib/site-path";
import { SiteHeader } from "../../components/site-header";

export default function LibraryPage() {
  return <main className="library-page shell">
    <SiteHeader area="piano" currentHref="/library/" currentLabel="曲库" />
    <section className="library-hero"><p className="eyebrow">REPERTOIRE · NO RHYTHM YET</p><h1>用经典旋律，<em>读懂每一个音。</em></h1><p>保留作品原调或传统常用调号，先专注高音谱号与右手单音；也可以按调号筛选曲目，集中熟悉升降号位置。</p></section>
    <section className="community-entry"><div><span>PUBLIC SCORE LIBRARY</span><h2>导入自己的 MusicXML</h2><p>无需账号，保存后所有访客都能在公共谱库中逐音练习。</p></div><a href={sitePath("/library/community/")}>打开公共谱库 <b>→</b></a></section>
    <LibraryCatalog pieces={LIBRARY_PIECES} />
  </main>;
}
