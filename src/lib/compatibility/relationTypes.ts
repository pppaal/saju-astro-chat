// 관계(Relation) 유니언 — 궁합 도메인의 공용 타입.
// 원래 app/compatibility/lib/types.ts 에 살아 lib(counselor/relationConfig)
// 가 app 을 역참조했다. lib 로 이동하고 app 쪽은 re-export 로 호환 유지.
// CircleAddModal 의 관계 옵션·profile relationLabel 과 동기 유지할 것.
export type Relation =
  | 'lover'
  | 'crush'
  | 'spouse'
  | 'engaged'
  | 'ex'
  | 'family'
  | 'sibling'
  | 'friend'
  | 'colleague'
  | 'business'
  | 'other'
