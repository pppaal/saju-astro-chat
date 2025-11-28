//src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import StarrySky from "@/components/ui/StarrySky";
import BackButton from "@/components/ui/BackButton";
import { I18nProvider } from "@/i18n/I18nProvider";

// 버튼 표시를 경로로 제어하는 작은 클라이언트 컴포넌트
function BackButtonInLayout() {
"use client";
const { usePathname } = require("next/navigation");
const pathname = usePathname?.() ?? "/";

// 메인(/)에서는 숨김. i18n 루트가 있으면 "/ko", "/en" 등도 추가.
if (pathname === "/") return null;

return <BackButton />;
}

export const metadata: Metadata = {
title: "Destiny Tracker",
description: "Chart the cosmos, navigate your destiny.",
};

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (
<html>
<head>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Uncial+Antiqua&family=Montserrat:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet" />
</head>
<body>
<I18nProvider>
<StarrySky />
{/* 메인(/)이면 자동 숨김 */}
<BackButtonInLayout />
<main>{children}</main>
</I18nProvider>
</body>
</html>
);
}