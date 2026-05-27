// 법령 동의 버전. Privacy/Terms 의 EFFECTIVE_DATE 와 같이 올린다.
// 사용자의 legalAcceptedVersion 이 이 값과 다르면 재동의 모달이 다시 뜬다.
// 사용자에게 영향이 큰 약관 변경 (위탁업체 추가·환불 조건 변경·민감정보 처리
// 등) 시에만 bump 한다. 단순 오타 수정·문구 다듬기로는 올리지 않는다.
export const LEGAL_VERSION = '2026-05-27'
