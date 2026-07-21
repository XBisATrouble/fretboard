"use client";

import { type ReactNode, useEffect } from "react";
import { sitePath } from "../lib/site-path";

export type LearningArea = "home" | "piano" | "ear" | "guitar";

const AREA_LINKS = [
  { id: "piano", label: "钢琴读谱", href: "/reading/" },
  { id: "ear", label: "视唱练耳", href: "/ear-training/" },
  { id: "guitar", label: "吉他指板", href: "/fretboard/" },
] as const;

const MODULE_LINKS = {
  piano: [
    { label: "读谱训练", href: "/reading/" },
    { label: "曲库", href: "/library/" },
  ],
  ear: [{ label: "能力规划", href: "/ear-training/" }],
  guitar: [
    { label: "指板白板", href: "/fretboard/" },
    { label: "琶音练习", href: "/arpeggio/" },
    { label: "三和弦练习", href: "/triads/" },
  ],
} as const;

export function SiteHeader({ area, currentHref, currentLabel, resumeHref, actions }: { area: LearningArea; currentHref?: string; currentLabel?: string; resumeHref?: string; actions?: ReactNode }) {
  useEffect(() => {
    if (!currentHref || !currentLabel || area === "home" || area === "ear") return;
    try { window.localStorage.setItem("spectrum-last-practice", JSON.stringify({ href: resumeHref ?? currentHref, label: currentLabel, area })); } catch { /* Local preferences are optional. */ }
  }, [area, currentHref, currentLabel, resumeHref]);

  const modules = area === "home" ? [] : MODULE_LINKS[area];
  return <header className={`learning-header area-${area}`}>
    <a className="brand" href={sitePath("/")} aria-label="谱练学习首页"><span>谱</span>练</a>
    <nav className="learning-areas" aria-label="学习方向">
      {AREA_LINKS.map((item) => <a key={item.id} className={area === item.id ? "active" : ""} href={sitePath(item.href)}>{item.label}{item.id === "ear" && <small>规划中</small>}</a>)}
    </nav>
    {modules.length > 0 && <nav className="module-nav" aria-label={`${AREA_LINKS.find((item) => item.id === area)?.label ?? "学习"}模块`}>
      {modules.map((item) => <a key={item.href} className={currentHref === item.href ? "current" : ""} href={sitePath(item.href)}>{item.label}</a>)}
    </nav>}
    {actions && <div className="learning-header-actions">{actions}</div>}
  </header>;
}
