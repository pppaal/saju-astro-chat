/**
 * dayTierEnMaps — DayTier '자세히 보기' 전문가 섹션의 KO→EN 치환 맵.
 *
 * EN 로케일에서 격국 성패 단어·신살 이름·12운성 단계가 한국어로 새던 것을
 * 영문화한다(엔진/공유데이터 무수정 — 컴포넌트 렌더 직전 best-effort 치환).
 * 영문값은 src/lib/saju/data/interpretations.json 의 name_en 들과 일치시켰다.
 * 미상 키는 호출부에서 KO 로 폴백 → KO 로케일·미상 라벨엔 영향 없음.
 */

/** 격국 성패 단어 — 성격/파격/반성반파. */
export const GEOKGUK_STATUS_EN: Record<string, string> = {
  성격: 'Formed',
  파격: 'Broken',
  반성반파: 'Mixed',
}

/** 12운성 단계 KO→EN. interpretations.json twelveStages 와 동일 12단계 + 별칭. */
export const TWELVE_STAGE_EN: Record<string, string> = {
  장생: 'Birth',
  목욕: 'Bath',
  관대: 'Coming-of-age',
  건록: 'Prime',
  임관: 'Prime',
  제왕: 'Peak',
  왕지: 'Peak',
  쇠: 'Decline',
  병: 'Illness',
  사: 'Death',
  묘: 'Tomb',
  절: 'Void',
  태: 'Conception',
  양: 'Nurture',
}

/**
 * 신살 KO→EN. interpretations.json shinsal 의 name_en 을 기준으로 흔한 것들을
 * 담았다(별칭 ~살 포함). 미상은 호출부에서 KO 폴백.
 */
export const SHINSAL_EN: Record<string, string> = {
  겁살: 'Robbery Star',
  도화: 'Peach Blossom',
  역마: 'Traveling Horse',
  화개: 'Floral Canopy',
  천을귀인: 'Heavenly Noble',
  양인: 'Yang Blade',
  백호: 'White Tiger',
  백호살: 'White Tiger',
  괴강: 'Gwae-gang',
  괴강살: 'Gwae-gang',
  문창: 'Academic',
  문창귀인: 'Academic',
  문곡: 'Literary Arts',
  천덕: 'Heavenly Virtue',
  천덕귀인: 'Heavenly Virtue',
  월덕: 'Monthly Virtue',
  월덕귀인: 'Monthly Virtue',
  학당귀인: "Scholar's Hall",
  장성: 'General Star',
  금여: 'Golden Carriage',
  금여성: 'Golden Carriage',
  공망: 'Voidness',
  망신: 'Disgrace Star',
  망신살: 'Disgrace Star',
  원진: 'Resentment Star',
  원진살: 'Resentment Star',
  천라지망: 'Heaven-Earth Net',
  태극귀인: 'Grand Polarity Star',
  복성귀인: 'Fortune Star',
  천의성: 'Healer Star',
  암록: 'Hidden Stipend',
  홍염살: 'Red Charm Star',
  귀문관: 'Spirit Gate',
  현침: 'Hanging Needle Star',
  고신: 'Solitary Star',
  재살: 'Disaster Star',
  천살: 'Heavenly Disaster Star',
  월살: 'Withering Star',
  년살: 'Year Star',
  지살: 'Earth Star',
  육해: 'Six Harms Star',
  반안: 'Saddle Star',
  삼재: 'Three Calamities',
  // 12운성 강왕 단계가 신살 목록에 함께 잡히는 경우(interpretations.json name_en 일치).
  제왕: 'Peak Star',
  건록: 'Prime Star',
}

/** 신살 EN 치환 — strip 트레일링 '살' 후 재시도, 미상은 KO 그대로. */
export function shinsalEn(name: string): string {
  return SHINSAL_EN[name] ?? SHINSAL_EN[name.replace(/살$/, '')] ?? name
}

/** 12운성 EN 치환 — 미상은 KO 그대로. */
export function twelveStageEn(stage: string): string {
  return TWELVE_STAGE_EN[stage] ?? stage
}

/** 격국 성패 단어 EN 치환 — 미상은 KO 그대로. */
export function geokgukStatusEn(status: string): string {
  return GEOKGUK_STATUS_EN[status] ?? status
}
