'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 페이지 이동 시 스크롤을 맨 위로 이동시키는 컴포넌트
 * layout.tsx에 추가하여 모든 페이지에서 작동하도록 합니다.
 */
export default function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    // 페이지 경로가 변경될 때마다 스크롤을 맨 위로 이동
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
