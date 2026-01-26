"use client";

import { useEffect } from "react";
import { logger } from '@/lib/logger';


export function KakaoInit() {
  useEffect(() => {
    const initKakao = () => {
      const scriptTag = document.getElementById("kakao-init");
      const kakaoKey = scriptTag?.getAttribute("data-kakao-key");

      if (window.Kakao && !window.Kakao.isInitialized() && kakaoKey) {
        try {
          window.Kakao.init(kakaoKey);
        } catch (error) {
          logger.error("Failed to initialize Kakao SDK:", error);
        }
      }
    };

    // Kakao SDK가 로드될 때까지 대기
    if (typeof window !== "undefined") {
      if (window.Kakao) {
        initKakao();
      } else {
        window.addEventListener("load", initKakao);
        return () => window.removeEventListener("load", initKakao);
      }
    }
  }, []);

  return null;
}
