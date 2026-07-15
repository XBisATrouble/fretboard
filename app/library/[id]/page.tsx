import { LibraryPractice } from "../../../components/library-practice";
import { getPiece, LIBRARY_PIECES } from "../../../lib/repertoire";

export function generateStaticParams() {
  return LIBRARY_PIECES.map(({ id }) => ({ id }));
}

export default async function PiecePage({ params }: { params: Promise<{ id: string }> }) {
  const piece = getPiece((await params).id);
  if (!piece) return <main className="not-found shell"><h1>这首曲子还不在曲库中。</h1><a href="/library">返回曲库</a></main>;
  return <LibraryPractice piece={piece} />;
}
