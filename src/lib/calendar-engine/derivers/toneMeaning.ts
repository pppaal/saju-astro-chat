/**
 * 큰 날 톤 문구 — 좋음/주의/중립 톤별 일상어 한 줄.
 *
 * convergence(엔진)와 MonthTier(클라)가 *같은 풀*을 쓰게 분리한 SSOT.
 * 분리 이유: 달력 셀 색은 일진 등급으로 칠하는데 리스트 의미는 수렴 톤으로 뽑아
 * 같은 날인데 "좋음 문구 + 주의 색"으로 어긋났다. 이제 MonthTier 가 셀 판정으로
 * 톤을 정해 이 풀에서 문구를 뽑으면 색과 글이 항상 일치한다.
 *
 * 카피 원칙(경쟁 벤치마크 리서치 — Co-Star/The Pattern vs 점신/포스텔러):
 *   · 단정문 — 헤지("~일 수도") 금지. 시적 상태 묘사("햇살이 드는 날") 대신
 *     결과를 콕 집는다("밀어붙이면 뚫리는 날").
 *   · 생활 고유명사 — 별·기운 대신 메일·계약서·장바구니·답장·술자리.
 *   · 마이크로 액션 — 예측이 아니라 지시("그 메일, 12시간 묵혔다 보내는 날").
 *     유저가 실행→결과 확인 루프를 돌며 적중 경험이 쌓인다.
 *   · 금지선 — 인신공격·숙명론·건강 공포 금지. 경고는 구체적이되 처방으로 닫는다.
 *     ("직설적이되 내 편" — Co-Star 식 조롱은 한국 정서 역풍 사례 다수.)
 *
 * 풀 길이는 톤별 31 — 큰 날 간격이 흔히 짝수(12일 등)라 짧은 풀이면 같은 문구가
 * 도배됐다(예: 6·18·30일이 전부 같은 줄). 또 풀이 31 미만이면 한 달(≤31일) 안에서
 * 같은 톤 두 날이 풀 길이만큼 떨어지면 같은 문구로 별칭돼 "이달의 큰 날" 리스트에
 * 중복이 생긴다. 개인 시드로 회전해 사람마다 다른 문구가 나온다.
 */

import { pickBySeed } from './personSeed'

export type MeaningTone = 'positive' | 'negative' | 'neutral'

const TONE_POOL_KO: Record<MeaningTone, string[]> = {
  positive: [
    '먼저 움직이면 이기는 날',
    '밀어붙이면 뚫리는 날',
    '미뤄둔 부탁이 통하는 날',
    '계약·결재 도장 찍기 좋은 날',
    '운이 먼저 손 내미는 날',
    '시작 버튼 누르는 날',
    '결과가 눈에 보이기 시작하는 날',
    '먼저 연락하면 풀리는 날',
    '제안서 내밀면 받아주는 날',
    '막힌 결재가 뚫리는 날',
    '같이 하자는 말이 통하는 날',
    '한 단계 올라서는 날',
    '닫혀 있던 문이 열리는 날',
    '흐름에 올라타면 멀리 가는 날',
    '사람들이 내 편에 서는 날',
    '질러도 후회 없는 날',
    '돈 이야기 꺼내기 좋은 날',
    '속도 붙는 날 — 브레이크 밟지 마세요',
    '소개·만남이 다음으로 이어지는 날',
    '아껴둔 카드 꺼내는 날',
    '도와달라는 말이 먹히는 날',
    '기다리던 답장이 오는 날',
    '기다리던 소식이 도착하는 날',
    '어깨 펴고 요구해도 되는 날',
    '실력 보여줄 판이 깔리는 날',
    '귀인이 움직이는 날',
    '용기가 제값 하는 날',
    '몸이 가볍고 판단이 빠른 날',
    '믿고 맡기면 두 배로 돌아오는 날',
    '오래 공들인 게 피는 날',
    '기운이 차서 넘치는 날',
  ],
  negative: [
    '큰 결정은 내일로 미는 날',
    '그 메일, 12시간 묵혔다 보내는 날',
    '무리하면 꼭 티가 나는 날',
    '감정이 앞서기 쉬운 날 — 답장은 천천히',
    '결정 버튼에서 손 떼는 날',
    '부딪히기 쉬운 날 — 말수를 줄이세요',
    '쉬어가야 멀리 가는 날',
    '말 한마디가 오해로 크는 날',
    '서두른 만큼 되돌아오는 날',
    '한 발 물러서면 지키는 날',
    '욕심이 판단을 흐리는 날',
    '장바구니 결제는 미루는 날',
    '문자보다 통화가 안전한 날',
    '체력을 아껴야 버티는 날',
    '돌다리도 두드리고 건너는 날',
    '약속은 골라서 받는 날',
    '마음이 쉽게 지치는 날 — 일정을 비우세요',
    '판단은 내일의 나에게 맡기는 날',
    '한 템포 늦춰야 안 꼬이는 날',
    '말싸움은 져주는 게 이기는 날',
    '몸이 보내는 신호를 무시하면 안 되는 날',
    '이사·이동·큰 지출은 미루는 날',
    '계약서는 세 번 읽는 날',
    '나부터 챙겨야 하는 날',
    '늦은 술자리는 사리는 날',
    '한숨 돌리고 가야 안 놓치는 날',
    '잔실수가 큰일 되기 쉬운 날 — 더블체크',
    '욱하면 지는 날',
    '속도를 줄이면 탈이 없는 날',
    '몸이 하는 말을 듣는 날',
    '듣는 사람이 이기는 날',
  ],
  neutral: [
    '판이 새로 짜이는 날',
    '방향을 다시 잡는 날',
    '변화가 시작되는 날 — 짐부터 정리',
    '기울었던 저울이 돌아오는 날',
    '한 장 넘기는 날',
    '갈림길에 서는 날 — 급히 고르지 않아도 됩니다',
    '판을 다시 읽는 날',
    '하고 싶은 마음과 망설임이 반반인 날 — 그 망설임도 정보입니다',
    '시야가 한 뼘 넓어지는 날',
    '리듬이 바뀌는 날 — 몸이 먼저 압니다',
    '문턱 하나 넘는 날',
    '계절이 도는 날',
    '국면이 바뀌는 날',
    '선택지가 갈라지는 날',
    '어제와 결이 달라지는 날',
    '한 막이 내리는 날',
    '새 장을 여는 날',
    '바람 방향이 도는 날',
    '저울이 움직이기 시작하는 날',
    '매듭 하나 정리되는 날',
    '고르게 숨 고르는 날',
    '돛을 다듬고 항로는 지키는 날',
    '멈춰야 보이는 날',
    '한 챕터 정리하는 날',
    '물결이 잦아드는 날',
    '기준을 다시 세우는 날',
    '제자리를 찾아가는 날',
    '템포를 맞추는 날',
    '급할 것 하나 없는 날',
    '잔잔해서 오래 남는 날',
    '다음 수를 준비하는 날',
  ],
}

const TONE_POOL_EN: Record<MeaningTone, string[]> = {
  positive: [
    'move first and you win',
    'push and it gives',
    'the ask you shelved lands today',
    'a day to sign and seal',
    'luck reaches out first',
    'hit the start button',
    'results start to show',
    'text first — it untangles',
    'pitch it — they take it',
    'the stuck approval clears',
    "'let's do it together' works today",
    'you climb one clear step',
    'a closed door opens',
    'ride the current — it carries far',
    'people take your side',
    'go for it — no regrets today',
    'a good day to talk money',
    "speed builds — don't brake",
    'introductions turn into something',
    'play the card you kept back',
    'asking for help works',
    'the reply you waited for comes',
    'the news you waited for arrives',
    'ask big, shoulders back',
    'the stage is set — show your work',
    'your backer makes a move',
    'courage pays out today',
    'light body, quick judgment',
    'trust it out — it returns doubled',
    'long effort finally blooms',
    'energy runs over the brim',
  ],
  negative: [
    'push the big call to tomorrow',
    'sit on that email for 12 hours',
    'overreach shows today',
    'feelings move first — reply slowly',
    'hands off the decide button',
    'friction day — spend fewer words',
    'rest now to go far',
    'one word can snowball today',
    'haste comes straight back at you',
    'step back and you keep it',
    'wanting more clouds the call',
    'leave the cart unpaid today',
    'a call is safer than a text',
    'save your stamina',
    'tap the bridge before crossing',
    'accept invitations selectively',
    'your heart tires fast — clear the slate',
    'let tomorrow-you decide',
    'slow one beat to stay untangled',
    'lose the argument, win the day',
    "don't ignore your body's signal",
    'delay the move and the big spend',
    'read the contract three times',
    'put yourself first today',
    'skip the late round tonight',
    'pause so you miss nothing',
    'small slips grow — double-check',
    'snap and you lose',
    'ease the speed, spare the dent',
    'listen to what your body says',
    'the listener wins today',
  ],
  neutral: [
    'the board is reset',
    'reset your direction',
    'change begins — pack light',
    'the scales swing back',
    'a page turns',
    'a fork appears — no need to choose fast',
    'reread the board',
    'half eager, half hesitant — the hesitation is data',
    'your view widens an inch',
    'the rhythm shifts — your body knows first',
    'one threshold to cross',
    'the season turns',
    'the phase changes',
    'the options split',
    'today runs on a different grain',
    'one act closes',
    'a new scene opens',
    'the wind changes course',
    'the scales start to move',
    'one knot gets tied off',
    'an even, breathing day',
    'trim the sails, keep the course',
    'stop, and it becomes visible',
    'a chapter gets filed away',
    'the ripples settle',
    'reset your yardstick',
    'things find their place',
    "match the tempo, don't force it",
    'nothing needs to be rushed',
    'quiet, but it stays with you',
    'set up your next move',
  ],
}

/**
 * 톤 + 날짜(일) + 개인 시드 → 그 톤 풀에서 한 줄.
 * seed(본명 고정)를 함께 회전 키로 써서 **같은 날·같은 톤이라도 사람마다 다른 문구**
 * 가 나온다(seed 0/미지정이면 날짜만으로 회전).
 */
export function toneMeaningFor(
  tone: MeaningTone,
  dayNum: number,
  lang: 'ko' | 'en' = 'ko',
  seed = 0
): string {
  const pool = lang === 'en' ? TONE_POOL_EN : TONE_POOL_KO
  return pickBySeed(pool[tone], seed, Number.isFinite(dayNum) ? dayNum : 0)
}
