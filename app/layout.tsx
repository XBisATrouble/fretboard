import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "谱练｜读谱、听觉与吉他指板练习",
  description: "从钢琴读谱、视唱练耳到吉他指板与和声结构，把音乐知识练成稳定反应。",
  openGraph: { title: "谱练｜读谱、听觉与吉他指板练习", description: "看懂乐谱、听见关系、摸清指板。", images: [{ url: "/og.png", width: 1200, height: 630, alt: "谱练" }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
