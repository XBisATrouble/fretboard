"use client";

import { useMemo, useState } from "react";
import { KEY_SIGNATURE_FILTERS, KEY_SIGNATURES, type KeySignature } from "../lib/key-signatures";
import type { LibraryPiece } from "../lib/repertoire";
import { sitePath } from "../lib/site-path";

type FilterId = "all" | KeySignature;

export function LibraryCatalog({ pieces }: { pieces: LibraryPiece[] }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const filtered = useMemo(
    () => filter === "all" ? pieces : pieces.filter((piece) => piece.keySignature === filter),
    [filter, pieces],
  );

  return <section className="library-browser" aria-label="按调号检索曲库">
    <div className="signature-filter-heading"><div><span>按调号筛选</span><small>大调与其关系小调共用同一个调号</small></div><b>{filtered.length} 首</b></div>
    <div className="signature-filters" role="group" aria-label="选择调号">
      <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")} aria-pressed={filter === "all"}><strong>全部</strong><small>所有调号</small><i>{pieces.length}</i></button>
      {KEY_SIGNATURE_FILTERS.map((signature) => {
        const count = pieces.filter((piece) => piece.keySignature === signature.id).length;
        return <button key={signature.id} className={filter === signature.id ? "selected" : ""} onClick={() => setFilter(signature.id)} aria-pressed={filter === signature.id}><strong>{signature.label}</strong><small>{signature.tonalities}</small><i>{count}</i></button>;
      })}
    </div>
    <div className="library-grid">
      {filtered.map((piece) => {
        const index = pieces.findIndex((candidate) => candidate.id === piece.id);
        const signature = KEY_SIGNATURES[piece.keySignature];
        return <a className="library-card" href={sitePath(`/library/${piece.id}/`)} key={piece.id}><span className="library-number">{String(index + 1).padStart(2, "0")}</span><div><p>{piece.level}</p><h2>{piece.title}</h2><small>{piece.composer}</small><div className="piece-tags"><span>{piece.key}</span><span>{signature.label} 调号</span>{piece.formLabel && <span>{piece.formLabel}</span>}<span>{piece.focus}</span></div></div><b>开始练习 →</b></a>;
      })}
    </div>
  </section>;
}
