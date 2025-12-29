import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stock AI Analyzer - 股市AI分析系统',
  description: '基于DeepSeek的智能股市分析系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
