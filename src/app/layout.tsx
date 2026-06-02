import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "키즈메모 | 점보키즈 행사 리마인드",
  description: "어린이집과 유치원을 위한 행사 일정, 쿠폰 발송, AI 행사 도우미 SaaS"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
