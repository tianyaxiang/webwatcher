import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebWatcher - 智能网页变化监控",
  description: "AI驱动的网页变化监控工具，智能过滤噪音，只推送重要变化",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
