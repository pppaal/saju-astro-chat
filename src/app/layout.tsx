// app/layout.tsx
import type { Metadata } from "next";
import { Exo_2, Noto_Sans } from "next/font/google";
import "./globals.css"; // 👈 프로젝트 전체에 적용될 CSS를 여기서 불러옵니다.

// Next.js 폰트 최적화 기능 사용
const exo2 = Exo_2({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-exo2", // CSS에서 변수로 사용하기 위함
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-sans",
});

export const metadata: Metadata = {
  title: "Destiny Tracker",
  description: "Your story, written in the stars.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 폰트 변수를 body에 적용 */}
      <body className={`${exo2.variable} ${notoSans.variable}`}>{children}</body>
    </html>
  );
}