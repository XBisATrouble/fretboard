"use client";

import { useParams } from "next/navigation";
import { LibraryPractice } from "../../../components/library-practice";
import { getPiece } from "../../../lib/repertoire";

export default function PiecePage() {
  const params = useParams<{ id: string }>();
  const piece = getPiece(params.id);
  if (!piece) return <main className="not-found shell"><h1>这首曲子还不在曲库中。</h1><a href="/library">返回曲库</a></main>;
  return <LibraryPractice piece={piece} />;
}
