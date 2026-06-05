'use client'

// 공용 cosmic gradient backdrop — 모든 다크 페이지가 같은 톤 위에 떠 있도록.
// AppShell 이 내부적으로 쓰고, AppShell 을 채택하지 않은 페이지(타로 sub,
// 블로그 등)도 직접 import 해서 같은 backdrop 을 깐다. 단일 source 라서
// 톤이 바뀌면 한 군데만 손대면 됨.

interface CosmicBackdropProps {
  /**
   * 컨테이너 포지셔닝 — 부모가 이미 absolute inset-0 컨테이너를 만들어 주는
   * 경우(AppShell 의 accentLayer 슬롯처럼) 'none' 으로 깔기만. 페이지가
   * 자기 wrapper 안에 직접 깔 땐 'absolute' (기본) 로 두면 inset-0 으로 자동
   * 펼침.
   */
  position?: 'absolute' | 'none'
}

export function CosmicBackdrop({ position = 'absolute' }: CosmicBackdropProps = {}) {
  return (
    <div
      className={
        position === 'absolute'
          ? 'absolute inset-0 z-0 pointer-events-none'
          : 'w-full h-full pointer-events-none'
      }
      aria-hidden
      style={{
        background:
          'radial-gradient(1200px 760px at 50% 18%, rgba(68, 95, 255, 0.2), transparent 62%),' +
          'radial-gradient(980px 680px at 50% 46%, rgba(191, 96, 255, 0.28), transparent 58%),' +
          'radial-gradient(760px 540px at 22% 22%, rgba(87, 207, 255, 0.16), transparent 60%),' +
          'radial-gradient(900px 620px at 82% 78%, rgba(117, 76, 255, 0.14), transparent 64%)',
      }}
    />
  )
}
