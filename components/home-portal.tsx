"use client";

import { useMemo, useSyncExternalStore } from "react";
import { sitePath } from "../lib/site-path";
import { SiteHeader } from "./site-header";

type LastPractice = { href: string; label: string; area: string };

const PATHS = [
  {
    id: "piano",
    number: "01",
    eyebrow: "PIANO · SIGHT READING",
    title: "钢琴读谱",
    description: "从一个音的即时识别，走进完整旋律与经典曲目。",
    links: [{ label: "读谱训练", href: "/reading/" }, { label: "进入曲库", href: "/library/" }],
  },
  {
    id: "ear",
    number: "02",
    eyebrow: "EAR · SINGING",
    title: "视唱练耳",
    description: "建立声音、音程、和声与乐谱之间的内在联系。",
    links: [{ label: "查看能力规划", href: "/ear-training/" }],
  },
  {
    id: "guitar",
    number: "03",
    eyebrow: "GUITAR · FRETBOARD",
    title: "吉他指板",
    description: "把音位、和弦结构与琶音连接清楚地放到指板上。",
    links: [{ label: "指板白板", href: "/fretboard/" }, { label: "琶音练习", href: "/arpeggio/" }, { label: "三和弦练习", href: "/triads/" }],
  },
] as const;

export function HomePortal() {
  const savedPractice = useSyncExternalStore(
    (notify) => { window.addEventListener("storage", notify); return () => window.removeEventListener("storage", notify); },
    () => { try { return window.localStorage.getItem("spectrum-last-practice"); } catch { return null; } },
    () => null,
  );
  const lastPractice = useMemo(() => { try { return savedPractice ? JSON.parse(savedPractice) as LastPractice : null; } catch { return null; } }, [savedPractice]);

  return <main className="home-portal shell">
    <SiteHeader area="home" />
    <section className="portal-hero">
      <p className="eyebrow">MUSIC PRACTICE · THREE PATHS</p>
      <h1>今天，想从哪里<em>听懂音乐？</em></h1>
      <p>看懂乐谱、听见关系、摸清指板。选择一个方向，把抽象的音乐知识变成稳定的反应。</p>
      <a className="continue-practice" href={sitePath(lastPractice?.href ?? "/reading/")}><span>继续练习</span><strong>{lastPractice?.label ?? "从读谱训练开始"}</strong><b>→</b></a>
    </section>
    <section className="learning-path-grid" aria-label="选择学习方向">
      {PATHS.map((path) => <article key={path.id} className={`learning-path-card ${path.id}`}>
        <span className="path-number">{path.number}</span><p>{path.eyebrow}</p><h2>{path.title}{path.id === "ear" && <small>规划中</small>}</h2><div className="path-motif" aria-hidden="true"><i /><i /><i /><i /><i /></div><p className="path-description">{path.description}</p><div className="path-links">{path.links.map((link, index) => <a key={link.href} className={index === 0 ? "primary" : ""} href={sitePath(link.href)}>{link.label} <span>→</span></a>)}</div>
      </article>)}
    </section>
  </main>;
}
