// FAQ 단일 진실원천 — /faq 페이지(클라이언트 UI)와 /faq 레이아웃(FAQPage JSON-LD)이
// 같은 목록을 읽는다. 예전엔 레이아웃이 4개짜리 축약 사본을 따로 들고 있어
// 화면 FAQ 와 구조화 데이터가 어긋났다(구글은 "보이는 내용 = 스키마"를 요구).
// 이 파일은 데이터만 — React/서버 전용 import 금지(양쪽에서 import 되므로).

export type FaqCategory = 'general' | 'payment' | 'account' | 'technical' | 'services'

export interface FaqItem {
  q: string
  qKo: string
  a: string
  aKo: string
  icon: string
  category: FaqCategory
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  // General
  {
    category: 'general',
    icon: '🎯',
    q: 'How accurate is DestinyPal?',
    qKo: 'DestinyPal은 얼마나 정확한가요?',
    a: 'We combine Saju (Four Pillars), Western Astrology, Tarot, and advanced AI to provide integrated readings, cross-referencing Eastern and Western systems for deeper insights. Remember, this is guidance for self-reflection—not a substitute for professional advice.',
    aKo: '사주, 서양 점성술, 타로, 그리고 고급 AI를 결합하여 통합 리딩을 제공하며, 동서양 체계를 교차 참조하여 더 깊은 통찰을 드립니다. 이는 자기 성찰을 위한 가이드이며, 전문적인 조언을 대체하지 않습니다.',
  },
  {
    category: 'general',
    icon: '⚙️',
    q: 'Is this computed or AI-generated?',
    qKo: '계산된 결과인가요, AI가 만든 글인가요?',
    a: 'Both, in a fixed order. The chart, the scores and the dates are computed first by a deterministic engine in code: planetary positions come from the Swiss Ephemeris, and the Korean Four Pillars are derived from the same birth instant. Only after that does the AI (Claude) turn those computed factors into readable prose. It is not allowed to decide the chart, change a score or pick a date. Our free daily horoscope, zodiac and sign-compatibility pages use no AI at all—their text is assembled from fixed templates. The How it works page walks through every step.',
    aKo: '둘 다지만 순서가 정해져 있습니다. 차트·점수·날짜는 먼저 코드로 된 결정론 엔진이 계산합니다. 행성 위치는 스위스 천체력(Swiss Ephemeris)에서, 사주 네 기둥은 같은 출생 시점에서 산출됩니다. 그 다음에야 AI(Claude)가 계산된 요소를 읽기 쉬운 문장으로 옮깁니다. AI는 차트를 정하거나 점수를 바꾸거나 날짜를 고를 수 없습니다. 무료 오늘의 운세·띠별 운세·별자리 궁합 페이지는 AI를 전혀 쓰지 않고 고정 템플릿으로 문장을 조립합니다. 자세한 단계는 "How it works" 페이지에 있습니다.',
  },
  {
    category: 'general',
    icon: '🔁',
    q: 'Will I get the same reading twice?',
    qKo: '같은 리딩을 두 번 받으면 결과가 같나요?',
    a: 'The facts, yes. The same birth date, time and place always produce the same chart, the same Four Pillars and the same list of factors, and a daily page shows the same result to everyone on the same date. The one thing that can vary is wording: in the AI counselor chats the model writes fresh prose each time, so two answers may be phrased differently, but they are written from the same computed facts.',
    aKo: '사실 부분은 같습니다. 같은 생년월일·시간·장소는 언제나 같은 차트, 같은 사주 네 기둥, 같은 요소 목록을 만들고, 데일리 페이지는 같은 날짜에 모든 사람에게 같은 결과를 보여줍니다. 달라질 수 있는 것은 표현만입니다. AI 상담 대화에서는 모델이 매번 새 문장을 쓰기 때문에 두 답변의 말투가 다를 수 있지만, 그 밑에 있는 계산된 사실은 같습니다.',
  },
  {
    category: 'general',
    icon: '🕉️',
    q: 'Do you support Vedic astrology?',
    qKo: '베다 점성술(인도 점성술)을 지원하나요?',
    a: 'Not yet. DestinyPal currently computes Western astrology in the tropical zodiac with Placidus houses (Whole Sign at polar latitudes), so there is no sidereal zodiac, ayanamsa, nakshatra or dasha system today. A sidereal option is on our roadmap, but we have not set a date. If you follow Vedic astrology, treat our sign-based pages as tropical readings.',
    aKo: '아직 지원하지 않습니다. 현재 DestinyPal의 서양 점성술은 회귀 황도대(tropical)와 플라시두스 하우스(극지방에서는 홀사인)로 계산되며, 항성 황도대(sidereal)·아야남사·낙샤트라·다샤는 제공하지 않습니다. 항성 황도대 옵션은 로드맵에 있지만 날짜는 정해지지 않았습니다. 베다 점성술을 따르시는 분은 별자리 기반 페이지를 회귀 황도대 리딩으로 읽어 주세요.',
  },
  {
    category: 'general',
    icon: '🔮',
    q: 'How often should I get a reading?',
    qKo: '리딩은 얼마나 자주 받는 게 좋나요?',
    a: 'It depends on your needs! Daily readings work well for general guidance. For deeper questions about life changes, career, or relationships, weekly or monthly consultations may be more meaningful. Trust your intuition.',
    aKo: '필요에 따라 다릅니다! 일상적인 가이드로는 매일 리딩이 좋습니다. 인생 변화, 커리어, 관계에 대한 깊은 질문은 주간 또는 월간 상담이 더 의미 있을 수 있습니다. 직감을 믿으세요.',
  },
  {
    category: 'general',
    icon: '🌍',
    q: 'Is DestinyPal available in my language?',
    qKo: 'DestinyPal은 어떤 언어를 지원하나요?',
    a: "Currently we fully support English and Korean. AI responses can understand and respond in many languages. We're continuously expanding language support.",
    aKo: '현재 영어와 한국어를 완벽히 지원합니다. AI 응답은 다양한 언어를 이해하고 답변할 수 있습니다. 지속적으로 언어 지원을 확대하고 있습니다.',
  },
  {
    category: 'general',
    icon: '⏰',
    q: 'What is the best time to do a tarot reading?',
    qKo: '타로 리딩은 언제 하는 게 가장 좋나요?',
    a: 'Any time that feels right to you! Many people prefer mornings for daily guidance or evenings for reflection. The most important factor is your mental state—be calm, focused, and open to insights.',
    aKo: '본인에게 맞다고 느껴지는 시간이 가장 좋습니다! 많은 분들이 일일 가이드를 위해 아침을, 성찰을 위해 저녁을 선호합니다. 가장 중요한 것은 정신 상태입니다. 차분하고 집중하며 통찰에 열린 마음을 가지세요.',
  },
  // Services
  {
    category: 'services',
    icon: '🗺️',
    q: 'What is the Destiny Counselor?',
    qKo: '운명 상담사가 무엇인가요?',
    a: 'The Destiny Counselor is our signature AI counseling feature. It reads your Saju (Four Pillars) chart together with your astrological birth chart, then chats with you to give practical guidance on timing, strengths, and key decisions.',
    aKo: '운명 상담사는 당사의 핵심 AI 상담 기능입니다. 사주(사주팔자)와 점성술 출생 차트를 함께 읽고, 대화를 통해 타이밍·강점·중요한 결정에 대한 실용적인 가이드를 제공합니다.',
  },
  {
    category: 'services',
    icon: '🃏',
    q: 'How does tarot reading work in DestinyPal?',
    qKo: 'DestinyPal의 타로 리딩은 어떻게 작동하나요?',
    a: 'Choose a spread (1, 2, 3, 5, or 7 cards), set your intention, then draw. Couple readings use the 3-, 5-, or 7-card spreads through a relationship lens. Our AI interprets each card in context — considering its position, neighboring cards, your Saju/astrology profile, and the question you asked. You can ask follow-up questions on the same reading to deepen the interpretation without redrawing.',
    aKo: '스프레드를 선택하고(1·2·3·5·7장) 의도를 설정한 뒤 카드를 뽑습니다. 커플 리딩은 3·5·7장 스프레드를 관계의 관점에서 풀어냅니다. AI 가 각 카드를 위치·인접 카드·귀하의 사주/점성 프로필·질문 맥락에 따라 해석합니다. 같은 리딩에 대해 후속 질문을 이어가며 해석을 더 깊이 파고들 수 있고, 다시 뽑지 않아도 됩니다.',
  },
  // 커플 타로 비활성화 — 기능이 꺼져 있어 FAQ 항목도 숨김. 재활성화 시 복원.
  /*
  {
    category: 'services',
    icon: '👫',
    q: 'What is a couple tarot reading?',
    qKo: '커플 타로 리딩이 무엇인가요?',
    a: "A couple reading interprets the cards through the lens of a specific relationship — drawing from both partners' charts and the dynamic between them. You and your matched partner each draw, and the AI integrates both perspectives into one shared interpretation. Both partners need an active connection on DestinyPal; if a partner has disconnected or blocked the connection, the couple reading is no longer available.",
    aKo: '커플 리딩은 특정 관계의 관점에서 카드를 해석합니다. 두 사람의 차트와 관계 역학을 함께 반영하며, 매칭된 상대와 각자 카드를 뽑으면 AI 가 두 시점을 하나의 공유 해석으로 통합합니다. DestinyPal 내에서 연결된 상태여야 하며, 상대가 연결을 해제하거나 차단한 경우 커플 리딩은 더 이상 이용할 수 없습니다.',
  },
  */
  {
    category: 'services',
    icon: '💕',
    q: 'How does compatibility analysis work?',
    qKo: '궁합 분석은 어떻게 작동하나요?',
    a: "We analyze both people's Saju charts and astrological birth charts to evaluate harmony in elements, planetary aspects, and energetic compatibility. You'll receive detailed insights on communication, emotional connection, values alignment, and growth potential together.",
    aKo: '두 사람의 사주 차트와 점성술 출생 차트를 분석하여 오행 조화, 행성 관계, 에너지 궁합을 평가합니다. 의사소통, 감정적 연결, 가치관 일치, 함께하는 성장 잠재력에 대한 상세한 통찰을 제공합니다.',
  },
  {
    category: 'services',
    icon: '📅',
    q: 'What makes the Calendar special?',
    qKo: '캘린더의 특별한 점은 무엇인가요?',
    a: 'Our Calendar combines daily energy forecasts based on your personal Saju, planetary transits, moon phases, and auspicious/inauspicious dates. It helps you plan important events, avoid challenging days, and maximize favorable cosmic timing.',
    aKo: '캘린더는 개인 사주, 행성 이동, 달의 위상, 길흉일을 기반으로 한 일일 에너지 예측을 결합합니다. 중요한 이벤트 계획, 어려운 날 회피, 유리한 우주적 타이밍 극대화를 도와줍니다.',
  },
  // Account
  {
    category: 'account',
    icon: '📚',
    q: 'Can I access my previous readings?',
    qKo: '이전 리딩을 다시 볼 수 있나요?',
    a: 'Yes! Log in and open the history within each service — for example, your past tarot readings are saved under Tarot History. Saved readings stay tied to your account.',
    aKo: '네! 로그인한 뒤 각 서비스의 기록에서 확인할 수 있어요. 예를 들어 지난 타로 리딩은 타로 기록(History)에 저장됩니다. 저장된 리딩은 계정에 계속 보관됩니다.',
  },
  {
    category: 'account',
    icon: '👤',
    q: 'Can I use DestinyPal without creating an account?',
    qKo: '계정 생성 없이 사용할 수 있나요?',
    a: 'You can explore some features without an account, but creating a free account unlocks personalized readings, history tracking, and the ability to save your birth chart and preferences for faster access.',
    aKo: '계정 없이도 일부 기능을 탐색할 수 있지만, 무료 계정을 만들면 개인화된 리딩, 기록 추적, 출생 차트 및 환경설정 저장 기능이 잠금 해제되어 더 빠르게 접근할 수 있습니다.',
  },
  {
    category: 'account',
    icon: '🔑',
    q: 'How do I reset my password?',
    qKo: '비밀번호를 재설정하려면 어떻게 하나요?',
    a: "Click 'Forgot Password' on the login page, enter your email, and we'll send you a secure reset link. If you don't receive it within a few minutes, check your spam folder or contact support.",
    aKo: "로그인 페이지에서 '비밀번호 찾기'를 클릭하고 이메일을 입력하면 안전한 재설정 링크를 보내드립니다. 몇 분 내에 받지 못하면 스팸 폴더를 확인하거나 지원팀에 문의하세요.",
  },
  {
    category: 'account',
    icon: '🗑️',
    q: 'How do I delete my account?',
    qKo: '계정을 삭제하려면 어떻게 하나요?',
    a: "Open your Profile page and use Delete Account. You'll be asked to confirm. Note that this action is permanent and will erase all your data, readings, and history. Any remaining credits are forfeited and cannot be refunded.",
    aKo: '프로필 페이지에서 계정 삭제를 진행하세요. 확인이 요청됩니다. 이 작업은 영구적이며 모든 데이터, 리딩, 기록이 삭제됩니다. 남은 크레딧은 소멸되며 환불되지 않습니다.',
  },
  // Payment
  {
    category: 'payment',
    icon: '💳',
    q: 'What payment methods are accepted?',
    qKo: '어떤 결제 방법을 지원하나요?',
    a: 'We accept major credit/debit cards (Visa, Mastercard, AMEX) through Stripe. Local payment methods may be available depending on your region. Transactions are protected with industry-standard safeguards where supported.',
    aKo: 'Stripe를 통해 모든 주요 신용/체크카드(Visa, Mastercard, AMEX)를 지원합니다. 지역에 따라 현지 결제 방법도 사용 가능할 수 있습니다. 모든 거래는 안전하게 암호화됩니다.',
  },
  {
    category: 'payment',
    icon: '🔄',
    q: 'Can I get a refund?',
    qKo: '환불받을 수 있나요?',
    a: 'Credit packs are fully refundable within 7 days only if 0 credits have been used. Once any credit is consumed, the pack is non-refundable. AI readings are non-refundable once generated. See our Refund Policy for details.',
    aKo: '크레딧 팩은 0크레딧 사용 상태로 구매 후 7일 이내에만 전액 환불 가능합니다. 1크레딧이라도 사용하면 환불 불가입니다. AI 리딩은 생성 후 환불 불가입니다. 자세한 내용은 환불 정책을 참조하세요.',
  },
  {
    category: 'payment',
    icon: '↩️',
    q: 'What happens to my credit if a reading fails?',
    qKo: '리딩이 실패하면 크레딧은 어떻게 되나요?',
    a: 'If a reading fails because of a system issue on our end — the AI provider is temporarily unavailable, the generation errors out, or the response comes back empty/invalid — the consumed credit is automatically restored to your balance. For couple readings, if both sides fail, both credits are returned. You do not need to contact support; just refresh and try again.',
    aKo: '당사 시스템 측 문제로 리딩이 실패한 경우(AI 공급자 일시 비가용, 생성 오류, 빈/유효하지 않은 응답 반환 등) 차감된 크레딧이 자동으로 잔액에 복구됩니다. 커플 리딩에서 양측 모두 실패하면 두 크레딧 모두 환불됩니다. 별도 문의는 불필요하며, 새로고침 후 다시 시도하시면 됩니다.',
  },
  {
    category: 'payment',
    icon: '🌟',
    q: 'What can I use without paying?',
    qKo: '무료로 사용할 수 있는 기능은 무엇인가요?',
    a: "Signup includes free credits to try basic readings (fortune, tarot, compatibility), and this month's Fortune Calendar is free. Paid AI features — Destiny Counselor, Tarot Counselor, Compatibility Counselor, and the extended Yearly/Monthly/Daily Fortune Calendar — cost credits, sold as one-time packs.",
    aKo: '회원가입 시 무료 크레딧이 지급되어 기본 리딩(운세·타로·궁합)을 시작할 수 있고, 이번 달 운세 캘린더는 무료입니다. 유료 AI 기능 — 운명 상담사, 타로 상담사, 궁합 상담사, 확장된 일·월·년 운세 — 은 크레딧을 소모하며, 일회성 팩으로 구매합니다.',
  },
  {
    category: 'payment',
    icon: '💎',
    q: 'How do credits work?',
    qKo: '크레딧은 어떻게 작동하나요?',
    a: 'Buy a credit pack once — no subscription, no auto-renewal. Each service shows its credit cost before use. Purchased credits are valid for 3 months from the purchase date.',
    aKo: '크레딧 팩을 한 번 구매하시면 됩니다 — 구독 없음, 자동 결제 없음. 각 서비스는 이용 전에 소모 크레딧을 표시합니다. 구매한 크레딧은 구매일로부터 3개월간 유효합니다.',
  },
  {
    category: 'payment',
    icon: '🔁',
    q: 'Will I be charged automatically?',
    qKo: '자동으로 결제가 되나요?',
    a: 'No. DestinyPal does not offer recurring subscriptions. Every purchase is a one-time credit pack — your card is charged only when you actively buy more credits. There is no auto-renewal.',
    aKo: '아닙니다. DestinyPal은 정기 구독을 제공하지 않습니다. 모든 결제는 일회성 크레딧 팩 구매이며, 사용자가 직접 추가 구매할 때만 결제됩니다. 자동 갱신은 없습니다.',
  },
  // Technical
  {
    category: 'technical',
    icon: '🔒',
    q: 'Is my data secure?',
    qKo: '제 데이터는 안전한가요?',
    a: 'We apply industry-standard safeguards to protect account and payment data where supported and as applicable. Payment processing is handled by Stripe (PCI-DSS Level 1 certified). Please review our Privacy Policy for details.',
    aKo: '당사는 지원되는 범위 및 적용되는 경우에 한해 업계 표준 보안 조치를 적용하여 계정 및 결제 데이터를 보호합니다. 결제 처리는 Stripe(PCI-DSS Level 1 인증)를 통해 이루어집니다. 자세한 내용은 개인정보처리방침을 확인해 주세요.',
  },
  {
    category: 'technical',
    icon: '📱',
    q: 'Is there a mobile app?',
    qKo: '모바일 앱이 있나요?',
    a: "DestinyPal is a progressive web app (PWA), which means you can install it on your phone for an app-like experience directly from your browser. Just tap 'Add to Home Screen' in your browser menu. Native iOS and Android apps are in development.",
    aKo: "DestinyPal은 프로그레시브 웹 앱(PWA)으로, 브라우저에서 직접 앱과 같은 경험을 위해 휴대폰에 설치할 수 있습니다. 브라우저 메뉴에서 '홈 화면에 추가'를 탭하세요. 네이티브 iOS 및 Android 앱은 개발 중입니다.",
  },
  {
    category: 'technical',
    icon: '⚡',
    q: 'Why is my reading taking long to generate?',
    qKo: '리딩 생성이 오래 걸리는 이유는 무엇인가요?',
    a: 'AI readings typically take 10-30 seconds. During peak hours, it may take slightly longer. Detailed analyses such as full-year fortune calendars or in-depth compatibility readings require more processing time. If it takes over 2 minutes, please refresh and try again.',
    aKo: 'AI 리딩은 일반적으로 10-30초가 걸립니다. 피크 시간대에는 약간 더 걸릴 수 있습니다. 연간 운세 캘린더나 상세 궁합 같은 깊은 분석은 더 많은 처리 시간이 필요합니다. 2분 이상 걸리면 새로고침 후 다시 시도하세요.',
  },
  {
    category: 'technical',
    icon: '🌐',
    q: 'Which browsers are supported?',
    qKo: '어떤 브라우저를 지원하나요?',
    a: 'DestinyPal works best on modern browsers: Chrome, Safari, Firefox, Edge (latest versions). For the best experience, keep your browser updated and enable JavaScript.',
    aKo: 'DestinyPal은 최신 브라우저에서 가장 잘 작동합니다: Chrome, Safari, Firefox, Edge(최신 버전). 최상의 경험을 위해 브라우저를 최신 상태로 유지하고 JavaScript를 활성화하세요.',
  },
]

/**
 * FAQPage JSON-LD 용 {question, answer} 목록 — 화면에 렌더되는 FAQ_ITEMS 와
 * 항목·순서·언어가 1:1 로 같아야 한다(구조화 데이터 = 보이는 내용).
 */
export function faqItemsForJsonLd(
  locale: 'ko' | 'en'
): Array<{ question: string; answer: string }> {
  return FAQ_ITEMS.map((item) =>
    locale === 'ko'
      ? { question: item.qKo, answer: item.aKo }
      : { question: item.q, answer: item.a }
  )
}
