import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  return {
    title: "谱练｜看谱，按键，即时反馈",
    description: "面向电脑键盘的古典钢琴五线谱练习。逐音反馈，循序进阶。",
    openGraph: {
      title: "谱练｜看谱，按键，即时反馈",
      description: "面向电脑键盘的古典钢琴五线谱练习。",
      images: [{ url: `${baseUrl}/og.png`, width: 1200, height: 630, alt: "谱练" }],
    },
    twitter: { card: "summary_large_image", images: [`${baseUrl}/og.png`] },
  };
}

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
