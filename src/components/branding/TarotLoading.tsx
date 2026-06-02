/**
 * 타로 라우트 전용 "보이지 않는" 로더. 타로 페이지 배경(#07091a)과 같은 색의
 * 빈 화면이라, 메인/상담사에서 타로로 넘어갈 때 별도 로딩 화면이 번쩍이지 않고
 * View Transition 크로스페이드 + 타로 화면 자체의 framer 인트로로 자연스럽게
 * 이어진다. (이전엔 BrandSplash 우주 스플래시가 "로딩 사인"처럼 끼어들었음.)
 */
export default function TarotLoading() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100svh',
        background: '#07091a',
        zIndex: 50,
      }}
    />
  )
}
