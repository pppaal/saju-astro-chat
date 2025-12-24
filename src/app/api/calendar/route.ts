/**
 * Destiny Calendar API
 * Saju + Astrology fused yearly important dates
 * AI-assisted calculations (optional backend)
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateYearlyImportantDates,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
  getYearGanzhi,
  getMonthGanzhi,
  getGanzhiForDate,
  type EventCategory,
  type ImportanceGrade,
  type ImportantDate,
} from "@/lib/destiny-map/destinyCalendar";
import koTranslations from "@/i18n/locales/ko.json";
import enTranslations from "@/i18n/locales/en.json";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.AI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_AI_BACKEND ||
  "http://localhost:5000";

type TranslationData = Record<string, unknown>;

// Translation helper

function validateBackendUrl(url: string) {
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[Calendar API] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[Calendar API] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
}

// 번역 헬퍼
function getTranslation(key: string, translations: TranslationData): string {
  const keys = key.split(".");
  let result: unknown = translations;
  for (const k of keys) {
    result = (result as Record<string, unknown>)?.[k];
    if (result === undefined) return key;
  }
  return typeof result === "string" ? result : key;
}

// 사주 분석 요소 번역 - 쉬운 말로 상세하게 설명
// Saju factor translations - plain language with detailed explanations
const SAJU_FACTOR_TRANSLATIONS: Record<string, { ko: string; en: string }> = {
  stemBijeon: {
    ko: "오늘 회의나 미팅에서 평소보다 자신감 있게 말할 수 있어요. 다만 같은 포지션 동료랑 의견 충돌이 생길 수 있으니 너무 밀어붙이진 마세요.",
    en: "You can speak more confidently in meetings today. But avoid pushing too hard as you might clash with colleagues in similar positions."
  },
  stemInseong: {
    ko: "오늘 선배나 상사한테 물어보면 좋은 답을 들을 수 있어요. 막혔던 업무가 조언 한마디로 해결될 수 있습니다. 물어보는 게 이득!",
    en: "Ask seniors or supervisors today - you'll get good answers. A single piece of advice could solve your stuck work. Asking pays off!"
  },
  stemJaeseong: {
    ko: "쇼핑하면 좋은 딜을 건질 수 있는 날이에요. 할인 품목 체크해보세요. 미뤄뒀던 재테크 결정도 오늘 하면 괜찮아요.",
    en: "Good day for finding deals while shopping. Check discounted items. Making that postponed financial decision today is also fine."
  },
  stemSiksang: {
    ko: "아이디어가 잘 떠오르는 날이에요. 기획서 작성, 프레젠테이션 준비하기 딱 좋아요. 평소에 말 못 했던 제안도 오늘 해보세요.",
    en: "Ideas come easily today. Perfect for writing proposals or preparing presentations. Try making that suggestion you've been holding back."
  },
  stemGwansal: {
    ko: "상사 눈치가 보이는 날이에요. 큰 실수만 안 하면 됩니다. 티 나는 행동은 피하고 맡은 일 묵묵히 하세요.",
    en: "A day to be aware of your boss's mood. Just avoid big mistakes. Keep a low profile and quietly do your assigned work."
  },
  branchSamhap: {
    ko: "1년에 몇 번 없는 좋은 날이에요. 계약서 사인, 이직 면접, 중요한 미팅 잡기 딱 좋아요. 오늘 시작하면 일이 잘 풀려요.",
    en: "One of the few great days this year. Perfect for signing contracts, job interviews, scheduling important meetings. Things started today go well."
  },
  branchSamhapNegative: {
    ko: "오늘 새로 시작하는 건 나중에 꼬일 수 있어요. 급한 게 아니면 내일이나 모레로 미루세요. 기존 업무 마무리에 집중하세요.",
    en: "Things started today might get tangled later. If not urgent, postpone to tomorrow or the day after. Focus on finishing existing work."
  },
  branchYukhap: {
    ko: "소개팅이나 새로운 사람 만나기 좋은 날이에요. 네트워킹 모임, 동창 모임 가면 좋은 인연 생길 수 있어요.",
    en: "Good day for blind dates or meeting new people. Networking events or alumni gatherings could bring good connections."
  },
  branchChung: {
    ko: "가족이나 가까운 사람이랑 말다툼하기 쉬운 날이에요. 예민한 주제는 피하고, 운전할 때 평소보다 조심하세요.",
    en: "Easy to argue with family or close ones today. Avoid sensitive topics and drive more carefully than usual."
  },
  branchXing: {
    ko: "서류 실수, 오타 나기 쉬운 날이에요. 보내기 전에 한 번 더 확인하세요. 계약서는 꼼꼼히 읽어보세요.",
    en: "Easy day for document mistakes and typos. Double-check before sending. Read contracts thoroughly."
  },
  branchHai: {
    ko: "오늘 한 얘기가 나중에 문제될 수 있어요. 험담이나 비밀 얘기는 피하세요. SNS 올리기 전에 한 번 더 생각하세요.",
    en: "What you say today might cause problems later. Avoid gossip or secrets. Think twice before posting on social media."
  },
  // 천을귀인(天乙貴人) - 가장 좋은 귀인
  cheoneulGwiin: {
    ko: "⭐ 1년에 몇 번 없는 대길일! 면접, 계약, 프로포즈, 사업 시작 다 좋아요. 중요한 일정은 오늘로 잡으세요. 누군가의 도움으로 일이 술술 풀릴 거예요.",
    en: "⭐ One of the luckiest days this year! Good for interviews, contracts, proposals, starting business. Schedule important things today. Someone's help will make things go smoothly."
  },
  // 지장간(支藏干) - 숨은 기운
  hiddenStemSupport: {
    ko: "오랫동안 연락 안 하던 사람한테서 연락이 올 수 있어요. 포기했던 프로젝트가 다시 살아날 수도 있고요. 예상치 못한 곳에서 도움이 와요.",
    en: "You might hear from someone you haven't contacted in a while. A project you gave up might revive. Help comes from unexpected places."
  },
  hiddenStemConflict: {
    ko: "너무 좋아 보이는 제안은 한 번 더 의심하세요. 중고거래, 투자 제안 등 조건 꼼꼼히 따져보세요. 급하게 결정하면 후회해요.",
    en: "Be suspicious of offers that look too good. Check conditions carefully for secondhand deals or investment proposals. Rushing decisions leads to regret."
  },
  // === 손없는 날 (擇日) ===
  sonEomneunDay: {
    ko: "🏠 이사, 가구 배치 바꾸기, 새 가전 들이기 좋은 날이에요. 집 관련 큰 결정 오늘 해도 괜찮아요. 개업이나 인테리어 시작도 좋아요.",
    en: "🏠 Good day for moving, rearranging furniture, or getting new appliances. House-related big decisions are fine today. Starting a business or renovation is also good."
  },
  // === 건록(建祿) ===
  geonrokDay: {
    ko: "📈 승진 면담, 연봉 협상, 취업 면접에 유리한 날이에요. 인정받고 싶은 일은 오늘 어필하세요. 좋은 소식 들을 가능성 높아요.",
    en: "📈 Favorable day for promotion talks, salary negotiations, job interviews. Appeal for things you want recognition for today. High chance of hearing good news."
  },
  // === 삼재(三災) ===
  samjaeYear: {
    ko: "⚠️ 올해는 무리한 투자나 이직보다 현상유지가 안전해요. 건강검진 꼭 받으시고, 큰 변화는 내년으로 미루세요.",
    en: "⚠️ This year, maintaining status quo is safer than risky investments or job changes. Get health checkups and postpone big changes to next year."
  },
  // === 역마살(驛馬殺) ===
  yeokmaDay: {
    ko: "🐎 여행 가면 좋은 일 생길 수 있어요. 출장, 외근 기회가 오면 잡으세요. 이직이나 이사 고민 중이라면 오늘 알아보세요.",
    en: "🐎 Good things may happen if you travel. Grab business trip or outside work opportunities. If considering job change or moving, look into it today."
  },
  // === 도화살(桃花殺) ===
  dohwaDay: {
    ko: "🌸 오늘 외모에 신경 쓰면 좋은 만남이 있을 수 있어요. 소개팅, 미팅, 모임에서 눈에 띌 수 있는 날이에요. 연애운 UP!",
    en: "🌸 Pay attention to your appearance today for good encounters. A day to stand out at blind dates, meetings, or gatherings. Romance luck UP!"
  },
  // === 십신(十神) 추가 분석 ===
  "sipsin_정재": {
    ko: "💵 안정적인 재물운이 좋아요! 월급, 저축, 정기 수입에 유리한 날이에요. 큰 투기보다는 안정적인 재테크에 집중하세요. 가족과의 관계도 좋아요.",
    en: "💵 Stable financial luck is good! Favorable for salary, savings, and regular income. Focus on stable investments rather than speculation. Family relationships are also good."
  },
  "sipsin_편재": {
    ko: "💰 뜻밖의 재물 기회가 올 수 있어요! 부업, 투자, 복권 등 정규 수입 외의 재물에 유리해요. 다만 리스크 관리도 중요해요. 돈이 들어오기도 쉽지만 나가기도 쉬운 날!",
    en: "💰 Unexpected financial opportunities may come! Favorable for side jobs, investments, and lottery. However, risk management is important. Money comes easily but also goes easily!"
  },
  "sipsin_정인": {
    ko: "📚 학습과 도움의 에너지가 넘쳐요! 시험, 자격증, 학업에 유리한 날이에요. 선생님이나 선배의 도움을 받기 좋고, 중요한 서류 처리에도 좋은 날이에요.",
    en: "📚 Learning and support energy overflows! Favorable for exams, certifications, and studies. Good for receiving help from teachers or seniors, and good for handling important documents."
  },
  "sipsin_편인": {
    ko: "🔮 직관과 영감이 빛나는 날이에요! 예술, 철학, 창작 활동에 유리해요. 독특한 아이디어가 떠오르기 쉽고, 창의적인 작업에 좋아요. 다만 현실적인 일보다 상상에 빠지기 쉬워요.",
    en: "🔮 Intuition and inspiration shine! Favorable for art, philosophy, and creative activities. Unique ideas come easily, good for creative work. However, you may get lost in imagination rather than practical matters."
  },
  "sipsin_겁재": {
    ko: "⚔️ 경쟁자가 나타나거나 재물 손실에 주의하세요! 동업, 공동 투자는 피하는 게 좋고, 보증이나 빌려주는 것도 삼가세요. 내 것을 지키는 데 집중하세요.",
    en: "⚔️ Watch for competitors or financial loss! Avoid partnerships or joint investments, and refrain from guarantees or lending. Focus on protecting what's yours."
  },
  "sipsin_비견": {
    ko: "👥 친구, 동료와의 협력이 강해지는 날이에요! 팀 프로젝트, 동업 논의에 좋아요. 하지만 경쟁 심리도 올라가니 독단적인 결정은 피하세요. 함께하면 더 좋은 결과를 얻을 수 있어요!",
    en: "👥 Cooperation with friends and colleagues strengthens! Good for team projects and partnership discussions. However, competitive feelings may rise, so avoid unilateral decisions. Working together brings better results!"
  },
  "sipsin_식신": {
    ko: "🍽️ 창의력과 표현력이 풍부해지는 날이에요! 요리, 글쓰기, 예술 활동에 딱 좋아요. 여유롭고 편안한 에너지라서 휴식이나 맛집 탐방도 좋아요. 건강과 복을 상징하는 좋은 기운!",
    en: "🍽️ Creativity and expression flourish! Perfect for cooking, writing, and artistic activities. It's relaxed and comfortable energy, so rest or food exploration is also great. Good energy symbolizing health and blessings!"
  },
  "sipsin_상관": {
    ko: "🎭 창의적 표현력이 극대화되지만 말조심하세요! 예술, 공연, 콘텐츠 제작에 유리해요. 다만 상사나 권위자와 충돌하기 쉬우니 언행을 조절하세요. 재능은 빛나지만 관계에 주의!",
    en: "🎭 Creative expression maximizes but watch your words! Favorable for art, performance, and content creation. However, you may clash with bosses or authority figures, so moderate your behavior. Your talent shines, but be careful with relationships!"
  },
  "sipsin_정관": {
    ko: "👔 직장운과 명예운이 좋아요! 승진, 인정, 공식적인 자리에 유리한 날이에요. 책임감 있게 행동하면 좋은 평가를 받을 수 있어요. 결혼이나 공식적인 약속에도 좋은 날!",
    en: "👔 Career and honor luck is good! Favorable for promotions, recognition, and official occasions. Acting responsibly brings good evaluations. Also a good day for marriage or official commitments!"
  },
  "sipsin_편관": {
    ko: "⚡ 도전과 경쟁에 강해지는 날이에요! 스포츠, 경쟁 프레젠테이션, 협상에 유리해요. 다만 스트레스와 압박감도 커지니 건강 관리하세요. 승부욕이 강해지는 날!",
    en: "⚡ You become stronger in challenges and competition! Favorable for sports, competitive presentations, and negotiations. However, stress and pressure also increase, so manage your health. A day when competitive spirit rises!"
  },
};

// 점성술 분석 요소 번역 - 쉬운 말로 상세하게 설명
// Astrology factor translations - plain language with detailed explanations
const ASTRO_FACTOR_TRANSLATIONS: Record<string, { ko: string; en: string }> = {
  sameElement: {
    ko: "오늘 컨디션이 좋고 일이 잘 풀릴 거예요. 평소에 하고 싶었던 일 시작하기 좋은 타이밍이에요. 감으로 결정해도 괜찮아요.",
    en: "You'll feel good today and things will go smoothly. Good timing to start something you've wanted to do. Going with your gut is fine."
  },
  supportElement: {
    ko: "미뤄뒀던 일 시작하기 좋은 날이에요. 운동 시작, 다이어트, 새 프로젝트 등 첫걸음 떼기 딱 좋아요.",
    en: "Good day to start things you've postponed. Perfect for first steps like starting exercise, diet, or new projects."
  },
  givingElement: {
    ko: "후배나 동생 도와주면 나중에 좋은 일로 돌아와요. 재능기부, 멘토링, 지식 공유하기 좋은 날이에요.",
    en: "Helping juniors or younger people will come back as good things later. Good day for talent donation, mentoring, or knowledge sharing."
  },
  controlElement: {
    ko: "오늘 결단력이 좋아요. 미루던 결정 내리기, 안 좋은 습관 끊기, 정리정돈하기 좋은 날이에요.",
    en: "Good decisiveness today. Good day for making postponed decisions, breaking bad habits, or organizing."
  },
  conflictElement: {
    ko: "오늘은 무리하지 마세요. 계획대로 안 될 수 있어요. 기존 일 마무리에 집중하고 새로운 건 내일로 미루세요.",
    en: "Don't push too hard today. Things might not go as planned. Focus on finishing existing tasks and postpone new things to tomorrow."
  },
  crossVerified: {
    ko: "★ 동서양 운세가 같이 좋다고 하는 날이에요! 중요한 약속, 계약, 면접은 오늘 잡으세요. 1년에 몇 번 없는 날이에요.",
    en: "★ A day when both Eastern and Western fortune say it's good! Schedule important appointments, contracts, or interviews today. One of the few such days in a year."
  },
  crossNegative: {
    ko: "⚠ 동서양 운세 모두 조심하라는 날이에요. 중요한 결정은 미루고, 조용히 지내세요. 괜히 나서지 마세요.",
    en: "⚠ A day when both Eastern and Western fortune say be careful. Postpone important decisions and stay quiet. Don't stick your neck out."
  },
  alignedElement: {
    ko: "오늘 시작하는 일은 순조롭게 진행될 거예요. 새 프로젝트, 새 운동루틴, 새 습관 시작하기 좋아요.",
    en: "Things you start today will proceed smoothly. Good for starting new projects, new exercise routines, or new habits."
  },
  mixedSignals: {
    ko: "좋은 점도 있고 안 좋은 점도 있는 날이에요. 신중하게 판단하되 너무 걱정하진 마세요.",
    en: "A day with both good and not-so-good points. Judge carefully but don't worry too much."
  },
  // 달 위상 (실제 계산 기반)
  lunarNewMoon: {
    ko: "🌑 새로운 시작하기 좋은 때예요. 다이어트, 금연, 새 프로젝트, 새 습관 시작하면 잘 이어가기 쉬워요.",
    en: "🌑 Good time for new beginnings. Starting a diet, quitting smoking, new projects, or new habits will be easier to maintain."
  },
  lunarFullMoon: {
    ko: "🌕 진행하던 일 마무리하기 좋은 때예요. 밀린 업무 정리, 프로젝트 완료, 결론 내리기 좋아요. 감정이 예민해질 수 있으니 다툼 조심!",
    en: "🌕 Good time to finish ongoing tasks. Good for clearing backlogs, completing projects, or reaching conclusions. Emotions may be sensitive, so watch out for arguments!"
  },
  lunarFirstQuarter: {
    ko: "🌓 시작한 일에 첫 번째 고비가 올 수 있어요. 여기서 포기하면 아까우니 조금만 더 힘내세요!",
    en: "🌓 First challenges may come to things you've started. It would be a waste to give up here, so hang in there a bit more!"
  },
  lunarLastQuarter: {
    ko: "🌗 안 쓰는 물건 정리, 불필요한 구독 해지, 관계 정리하기 좋은 때예요. 비워야 새로운 게 들어와요.",
    en: "🌗 Good time for decluttering, canceling unnecessary subscriptions, or organizing relationships. You need to empty to make room for new things."
  },
  // (기존 간단 버전 호환)
  lunarPeak: {
    ko: "마무리나 새로운 시작하기 좋은 때예요. 결과물 발표, 고백, 중요한 결정 내리기 좋아요.",
    en: "Good time for finishing or new beginnings. Good for presenting results, confessions, or making important decisions."
  },
  lunarQuarter: {
    ko: "감정 기복이 있을 수 있어요. 말다툼 조심하고, 중요한 결정은 며칠 뒤로 미루세요.",
    en: "Emotional fluctuations may occur. Watch out for arguments and postpone important decisions by a few days."
  },
  // 세운(歲運) - 연간 운세 영향
  seunBijeon: {
    ko: "📅 올해는 당신의 기본 에너지가 강화되는 해예요. 자신감이 넘치고 추진력이 생기는 해이지만, 경쟁자도 많아질 수 있어요. 협력과 경쟁의 균형을 잘 잡으세요.",
    en: "📅 This year strengthens your core energy. A year of overflowing confidence and drive, but competitors may also increase. Balance cooperation and competition well."
  },
  seunInseong: {
    ko: "📅 올해는 도움을 받기 좋은 해예요. 멘토, 선배, 부모님 등 조력자의 도움이 많아요. 배움과 성장의 기회가 넘치니, 새로운 공부나 자격증 취득에 도전해보세요!",
    en: "📅 This year is good for receiving support. Lots of help from mentors, seniors, parents. Opportunities for learning and growth abound, so try new studies or certifications!"
  },
  seunJaeseong: {
    ko: "📅 올해는 재물운이 좋은 해예요. 수입이 늘어나거나 재테크에 유리한 기회가 찾아올 수 있어요. 돈과 관련된 중요한 결정을 하기에 좋은 해입니다.",
    en: "📅 This year has good wealth fortune. Income may increase or favorable investment opportunities may arise. A good year for important money-related decisions."
  },
  seunSiksang: {
    ko: "📅 올해는 창의력과 표현력이 빛나는 해예요. 예술, 창작, 연애에 유리해요. 자신의 재능을 세상에 알리기 좋은 해이니, 적극적으로 자신을 표현하세요!",
    en: "📅 This year your creativity and expression shine. Favorable for art, creation, romance. A good year to show your talents to the world, so express yourself actively!"
  },
  seunGwansal: {
    ko: "📅 올해는 외부 압박이 있는 해예요. 직장에서의 스트레스, 권위자와의 갈등이 생길 수 있어요. 겸손하게 대처하고, 건강 관리에 특히 신경 쓰세요.",
    en: "📅 This year has external pressure. Stress at work or conflicts with authority figures may arise. Handle with humility and pay special attention to health management."
  },
  seunSamhap: {
    ko: "📅 올해는 세 가지 좋은 기운이 모이는 특별한 해예요! 큰 기회가 찾아올 수 있으니, 적극적으로 도전하세요. 인생의 전환점이 될 수 있는 해입니다.",
    en: "📅 This is a special year when three good energies unite! Big opportunities may come, so take on challenges actively. This could be a turning point in your life."
  },
  seunSamhapNegative: {
    ko: "📅 올해 에너지 흐름이 불리해요. 큰 모험이나 도박 같은 행동은 자제하고, 안정을 추구하는 것이 현명해요. 기존에 하던 일을 꾸준히 유지하는 데 집중하세요.",
    en: "📅 This year's energy flow is unfavorable. Refrain from big adventures or gambles; seeking stability is wise. Focus on steadily maintaining existing work."
  },
  seunYukhap: {
    ko: "📅 올해는 인연이 좋은 해예요. 좋은 사람을 만나거나, 귀인의 도움을 받을 수 있어요. 결혼, 파트너십, 협력 관계에 유리한 해입니다.",
    en: "📅 This year has good relationship fortune. You may meet good people or receive help from benefactors. Favorable for marriage, partnerships, and cooperative relationships."
  },
  seunChung: {
    ko: "📅 올해는 변화가 많은 해예요. 이사, 이직, 인간관계 변화 등 크고 작은 변화가 예상돼요. 변화를 두려워하지 말고 유연하게 대처하면 오히려 기회가 될 수 있어요.",
    en: "📅 This year has many changes. Big and small changes like moving, job changes, relationship changes are expected. Don't fear change; handling it flexibly can become an opportunity."
  },
  // 월운(月運) - 월간 운세 영향
  wolunBijeon: {
    ko: "📆 이번 달은 에너지가 충전되는 달이에요. 자신감이 높아지고 추진력이 생겨요. 새로운 시작이나 도전에 적합한 달이에요.",
    en: "📆 This month recharges your energy. Confidence rises and you gain drive. A suitable month for new beginnings or challenges."
  },
  wolunInseong: {
    ko: "📆 이번 달은 도움을 받기 좋은 달이에요. 선배나 멘토의 조언이 큰 도움이 되고, 공부나 학습에 집중하기 좋아요.",
    en: "📆 This month is good for receiving help. Advice from seniors or mentors will be very helpful, and it's good for studying or learning."
  },
  wolunJaeseong: {
    ko: "📆 이번 달은 재물운이 좋은 달이에요. 수입 증가, 좋은 쇼핑 기회, 재테크에 유리해요. 돈과 관련된 결정을 하기 좋아요.",
    en: "📆 This month has good wealth fortune. Favorable for income increase, good shopping opportunities, and investments. Good for money-related decisions."
  },
  wolunSiksang: {
    ko: "📆 이번 달은 창의력이 빛나는 달이에요. 예술 활동, 창작, 연애에 유리해요. 자신을 표현하는 모든 활동에 좋은 달이에요.",
    en: "📆 This month your creativity shines. Favorable for artistic activities, creation, and romance. A good month for all forms of self-expression."
  },
  wolunGwansal: {
    ko: "📆 이번 달은 직장이나 외부에서 압박이 있을 수 있어요. 스트레스 관리에 신경 쓰고, 윗사람과의 관계에 조심하세요.",
    en: "📆 This month may have work or external pressure. Pay attention to stress management and be careful in relationships with superiors."
  },
  wolunSamhap: {
    ko: "📆 이번 달은 세 가지 좋은 기운이 모이는 특별한 달이에요! 중요한 결정, 계약, 새로운 시작에 좋은 기회가 있어요.",
    en: "📆 This is a special month when three good energies unite! Good opportunities for important decisions, contracts, and new starts."
  },
  wolunYukhap: {
    ko: "📆 이번 달은 인연이 좋은 달이에요. 새로운 만남, 소개팅, 인맥 확장에 유리해요. 좋은 사람을 통해 기회가 올 수 있어요.",
    en: "📆 This month has good relationship fortune. Favorable for new meetings, blind dates, and expanding connections. Opportunities may come through good people."
  },
  wolunChung: {
    ko: "📆 이번 달은 변화가 많아요. 예상치 못한 변화에 당황하지 말고, 안정보다 유연하게 대처하세요. 변화 속에서 기회를 찾으세요.",
    en: "📆 This month has many changes. Don't be flustered by unexpected changes; stay flexible rather than stable. Find opportunities within change."
  },
  // 일진(日辰) - 당일 운세 (가장 중요!)
  iljinBijeon: {
    ko: "🌅 오늘은 에너지가 강해지는 날이에요. 자신감이 넘치고 추진력이 생기지만, 경쟁심도 올라갈 수 있어요. 협력과 경쟁의 균형을 잡으세요.",
    en: "🌅 Today your energy strengthens. Confidence and drive increase, but competitiveness may also rise. Balance cooperation and competition."
  },
  iljinInseong: {
    ko: "🌅 오늘은 배움과 도움을 받기 좋은 날이에요. 선배나 멘토의 조언이 도움이 되고, 공부나 자격증 준비에도 좋아요. 지혜를 얻는 하루!",
    en: "🌅 Great day for learning and receiving help. Advice from seniors or mentors will be valuable, good for studying or certification prep. A day of gaining wisdom!"
  },
  iljinJaeseong: {
    ko: "🌅 오늘은 재물운이 좋은 날이에요. 쇼핑, 투자 결정, 금전 거래에 유리해요. 돈과 관련된 중요한 결정을 하기 좋은 타이밍!",
    en: "🌅 Financial luck is good today. Favorable for shopping, investment decisions, and monetary transactions. Good timing for important financial decisions!"
  },
  iljinSiksang: {
    ko: "🌅 오늘은 창의력과 표현력이 빛나는 날이에요. 글쓰기, 예술, 프레젠테이션에 좋아요. 당신의 아이디어를 자신 있게 표현하세요!",
    en: "🌅 Creativity and expression shine today. Good for writing, art, and presentations. Express your ideas confidently!"
  },
  iljinGwansal: {
    ko: "🌅 오늘은 외부 압박이나 스트레스가 있을 수 있어요. 상사, 윗사람과의 관계에서 조심하고, 겸손하게 대처하세요. 무리한 도전은 피하세요.",
    en: "🌅 External pressure or stress may occur today. Be careful in relationships with bosses and superiors, stay humble. Avoid reckless challenges."
  },
  iljinSamhap: {
    ko: "🌅 오늘은 세 가지 좋은 기운이 모이는 최고의 날이에요! 중요한 계약, 결혼, 사업 시작에 완벽한 타이밍! 오랫동안 미뤄왔던 일을 오늘 하세요!",
    en: "🌅 Three positive energies unite today - the best day! Perfect timing for important contracts, marriage, or starting a business. Do what you've been postponing!"
  },
  iljinSamhapNegative: {
    ko: "🌅 오늘은 에너지가 어긋나고 계획이 틀어질 수 있어요. 중요한 일은 다른 날로 미루고, 기존 일을 마무리하는 데 집중하세요.",
    en: "🌅 Energy may be off and plans may go awry today. Postpone important matters and focus on finishing existing tasks."
  },
  iljinYukhap: {
    ko: "🌅 오늘은 인연과 화합의 기운이 강해요! 새로운 만남, 소개팅, 면접, 비즈니스 미팅에 최적! 사람을 통해 좋은 기회가 올 수 있어요.",
    en: "🌅 Energy of connection and harmony is strong today! Optimal for new meetings, dates, interviews, and business meetings! Good opportunities may come through people."
  },
  iljinChung: {
    ko: "🌅 오늘은 변화와 충돌의 기운이 있어요. 여행, 이사, 차량 구입은 가능하면 피하세요. 가까운 사람과 다툼이 생기기 쉬우니 감정 조절에 주의하세요.",
    en: "🌅 Energy of change and conflict is present today. Avoid travel, moving, or vehicle purchases if possible. Arguments with close ones come easily, so manage emotions carefully."
  },
  iljinXing: {
    ko: "🌅 오늘은 예상치 못한 장애물이 나타날 수 있어요. 건강, 법적 문제, 서류 실수에 특히 주의하세요. 중요한 결정은 신중하게!",
    en: "🌅 Unexpected obstacles may appear today. Be especially careful with health, legal issues, and document mistakes. Make important decisions carefully!"
  },
  iljinHai: {
    ko: "🌅 오늘은 오해와 방해가 생기기 쉬운 날이에요. 말조심하고, 비밀 이야기는 나누지 마세요. 새로운 사람을 쉽게 믿지 않는 게 좋아요.",
    en: "🌅 Misunderstandings and interference come easily today. Watch your words and don't share secrets. It's better not to easily trust new people."
  },
  // 대운(大運) - 10년 주기 대운세 영향
  daeunBijeon: {
    ko: "🔮 현재 대운이 당신의 기본 에너지를 강화하는 시기예요. 향후 10년간 자신감과 추진력이 넘쳐요. 독립, 창업, 리더십 발휘에 좋은 시기입니다. 자신감을 갖고 적극적으로 도전하세요!",
    en: "🔮 Your current major cycle strengthens your core energy. For the next 10 years, confidence and drive will overflow. Good time for independence, starting a business, or showing leadership. Be confident and take on challenges!"
  },
  daeunInseong: {
    ko: "🔮 현재 대운이 도움과 지원의 시기예요. 향후 10년간 좋은 멘토, 스승, 조력자를 만나기 쉬워요. 배움과 성장에 최적의 시기이니, 새로운 공부, 자격증 취득, 진학에 도전해보세요!",
    en: "🔮 Your current major cycle is a time of help and support. For the next 10 years, you'll easily meet good mentors, teachers, and helpers. Optimal time for learning and growth, so try new studies, certifications, or further education!"
  },
  daeunJaeseong: {
    ko: "🔮 현재 대운이 재물운의 시기예요. 향후 10년간 재정적으로 유리한 기회가 많아요. 사업, 투자, 부동산 등 돈과 관련된 큰 결정을 하기에 좋은 시기입니다.",
    en: "🔮 Your current major cycle is a time of wealth fortune. For the next 10 years, there will be many financially favorable opportunities. Good time for big decisions related to business, investment, or real estate."
  },
  daeunSiksang: {
    ko: "🔮 현재 대운이 창조와 표현의 시기예요. 향후 10년간 창의력과 표현력이 빛나요. 예술, 창작, 연예, 마케팅 등 자신을 표현하는 분야에서 성공할 수 있는 시기입니다. 재능을 적극적으로 펼치세요!",
    en: "🔮 Your current major cycle is a time of creation and expression. For the next 10 years, creativity and expression shine. A time when you can succeed in fields that express yourself like art, creation, entertainment, or marketing. Show your talents actively!"
  },
  daeunGwansal: {
    ko: "🔮 현재 대운에 외부 압박이 있는 시기예요. 향후 10년간 직장, 사회, 권위자로부터 스트레스를 받기 쉬워요. 인내와 겸손이 필요한 시기이니, 무리하지 말고 건강 관리에 특히 신경 쓰세요.",
    en: "🔮 Your current major cycle has external pressure. For the next 10 years, you may easily experience stress from work, society, or authority figures. A time requiring patience and humility, so don't overexert and pay special attention to health."
  },
  daeunSamhap: {
    ko: "🔮 향후 10년간 세 가지 좋은 기운이 함께 해요! 인생의 큰 기회가 열려있는 황금기입니다. 결혼, 사업, 투자, 이민 등 큰 결정을 하기에 최적의 시기예요. 적극적으로 도전하세요!",
    en: "🔮 For the next 10 years, three good energies accompany you! A golden period with big life opportunities open. Optimal time for big decisions like marriage, business, investment, or immigration. Take on challenges actively!"
  },
  daeunSamhapNegative: {
    ko: "🔮 대운의 에너지 흐름이 불리한 시기예요. 향후 10년간 큰 모험이나 도박은 피하고, 안정을 추구하는 것이 현명해요. 기존에 하던 일을 꾸준히 유지하고, 무리한 확장은 자제하세요.",
    en: "🔮 Major cycle energy flow is unfavorable. For the next 10 years, avoid big adventures or gambles; seeking stability is wise. Steadily maintain existing work and refrain from excessive expansion."
  },
  daeunYukhap: {
    ko: "🔮 향후 10년간 좋은 인연과 파트너십이 기대돼요! 결혼, 동업, 협력 관계에 유리한 시기예요. 좋은 사람을 통해 큰 기회가 올 수 있으니, 인간관계에 적극적으로 투자하세요.",
    en: "🔮 Good relationships and partnerships expected for the next 10 years! Favorable for marriage, business partnerships, and cooperative relationships. Big opportunities may come through good people, so invest actively in relationships."
  },
  daeunChung: {
    ko: "🔮 향후 10년간 변화가 많을 수 있어요. 이사, 이직, 인간관계 변화 등이 예상돼요. 변화를 두려워하지 말고 유연하게 적응하면, 오히려 성장의 기회가 될 수 있어요.",
    en: "🔮 Many changes possible over the next 10 years. Moving, job changes, relationship changes are expected. Don't fear change; adapting flexibly can become a growth opportunity."
  },
  // 대운 십신 분석
  daeunSibsinInseong: {
    ko: "🔮 지금 시기에 학습과 성장을 돕는 에너지가 있어요. 새로운 것을 배우고 자격을 취득하기에 좋은 시기예요. 멘토나 스승의 도움을 적극적으로 받으세요.",
    en: "🔮 This period has energy that helps learning and growth. Good time to learn new things and get certifications. Actively receive help from mentors or teachers."
  },
  daeunSibsinJaeseong: {
    ko: "🔮 지금 시기에 재물 기회를 가져오는 에너지가 있어요. 수입 증가, 사업 확장, 투자 수익 등 재정적으로 유리한 시기예요. 돈 관련 결정에 자신감을 가지세요.",
    en: "🔮 This period has energy that brings financial opportunities. Favorable period for income increase, business expansion, and investment returns. Be confident in money-related decisions."
  },
  daeunSibsinJeonggwan: {
    ko: "🔮 지금 시기에 승진과 사회적 인정을 가져오는 에너지가 있어요. 직장에서의 성공, 지위 상승, 명예 획득에 유리한 시기예요. 책임감 있게 행동하면 좋은 결과가 따라와요.",
    en: "🔮 This period has energy that brings promotion and social recognition. Favorable for career success, status elevation, and gaining honor. Acting responsibly will bring good results."
  },
  daeunSibsinPyeongwan: {
    ko: "🔮 지금 시기에 도전과 경쟁이 많아요. 외부에서 압박이 올 수 있지만, 이를 잘 극복하면 크게 성장할 수 있어요. 인내심을 갖고 꾸준히 노력하세요.",
    en: "🔮 This period has lots of challenges and competition. External pressure may come, but overcoming it well can lead to great growth. Be patient and keep working hard."
  },
  daeunSibsinSanggwan: {
    ko: "🔮 지금 시기에 창의적 에너지가 있지만 갈등에 주의하세요. 자기표현과 창작에 유리하지만, 말이 너무 많아지거나 권위자와 충돌할 수 있어요. 표현은 하되, 배려도 잊지 마세요.",
    en: "🔮 This period has creative energy, but watch for conflicts. Favorable for self-expression and creation, but you may talk too much or clash with authority figures. Express yourself, but don't forget consideration."
  },
  // 행성 트랜짓 (수성, 금성, 화성)
  mercuryConjunct: {
    ko: "☿ 수성이 당신의 별자리에 들어왔어요! 의사소통, 글쓰기, 계약, 협상에 최고의 날이에요. 중요한 이메일, 프레젠테이션, 미팅이 있다면 오늘이 좋아요. 머리가 맑아지고 표현력이 좋아지는 날이에요.",
    en: "☿ Mercury has entered your sign! Best day for communication, writing, contracts, and negotiations. Great if you have important emails, presentations, or meetings. Your mind is clear and expression is good."
  },
  mercuryHarmony: {
    ko: "☿ 수성 에너지가 당신과 조화를 이루고 있어요. 대화와 협상이 잘 풀리고, 아이디어가 잘 떠올라요. 공부, 독서, 정보 수집에도 좋은 날이에요.",
    en: "☿ Mercury energy harmonizes with you. Conversations and negotiations flow well, and ideas come easily. Good day for studying, reading, and gathering information."
  },
  mercuryTension: {
    ko: "☿ 수성 에너지가 긴장 상태예요. 의사소통에 오해가 생기거나, 중요한 서류에 실수가 있을 수 있어요. 중요한 계약이나 발표는 가능하면 다른 날로 미루고, 말과 글을 신중하게 하세요.",
    en: "☿ Mercury energy is tense. Misunderstandings in communication or mistakes in important documents may occur. If possible, postpone important contracts or presentations, and be careful with words and writing."
  },
  venusConjunct: {
    ko: "♀ 금성이 당신의 별자리에 들어왔어요! 사랑, 아름다움, 재물의 에너지가 빛나는 날이에요. 데이트, 미팅, 쇼핑에 최고의 날이고, 외모에 신경 쓰면 좋은 일이 생길 수 있어요. 매력이 빛나는 날!",
    en: "♀ Venus has entered your sign! A day when love, beauty, and wealth energy shine. Best for dates, meetings, and shopping. Taking care of your appearance may bring good things. A day your charm shines!"
  },
  venusHarmony: {
    ko: "♀ 금성 에너지가 당신과 조화를 이루고 있어요. 인간관계가 좋아지고, 예술적 감각이 빛나요. 연애, 쇼핑, 미용에 좋은 날이에요. 주변 사람들에게 친절하게 대하면 좋은 일이 돌아와요.",
    en: "♀ Venus energy harmonizes with you. Relationships improve and artistic sense shines. Good day for romance, shopping, and beauty. Being kind to people around you will bring good things back."
  },
  venusSupport: {
    ko: "♀ 금성이 당신을 지원하고 있어요. 예술과 미적 감각이 빛나고, 주변 사람들에게 호감을 얻기 쉬워요. 디자인, 미술, 음악 등 창작 활동에 유리해요.",
    en: "♀ Venus supports you. Art and aesthetic sense shine, and you easily gain favor from people around you. Favorable for creative activities like design, art, and music."
  },
  marsConjunct: {
    ko: "♂ 화성이 당신의 별자리에 들어왔어요! 에너지와 행동력이 최고조에 달해요. 운동, 경쟁, 도전에 좋은 날이에요. 다만 화가 나기 쉽고 다툼이 생길 수 있으니, 감정 조절에 주의하세요.",
    en: "♂ Mars has entered your sign! Energy and action are at peak. Good day for exercise, competition, and challenges. However, you may get angry easily and arguments may arise, so be careful with emotional control."
  },
  marsHarmony: {
    ko: "♂ 화성 에너지가 당신과 조화를 이루고 있어요. 운동, 경쟁, 적극적인 활동에 유리해요. 추진력이 생기고 목표를 향해 나아가기 좋은 날이에요.",
    en: "♂ Mars energy harmonizes with you. Favorable for exercise, competition, and active pursuits. You gain drive and it's a good day to move toward your goals."
  },
  marsConflict: {
    ko: "♂ 화성 에너지가 당신과 충돌하고 있어요. 다툼, 사고, 부상의 위험이 평소보다 높아요. 격한 운동이나 위험한 활동은 피하고, 화가 나도 참고 넘어가세요. 안전이 최우선이에요.",
    en: "♂ Mars energy conflicts with you. Risk of arguments, accidents, and injuries is higher than usual. Avoid intense exercise or dangerous activities, and let anger pass. Safety is the priority."
  },
  marsVictory: {
    ko: "♂ 화성 에너지를 지배하고 있어요. 도전과 경쟁에서 승리할 수 있는 날이에요. 스포츠, 경쟁, 협상에서 유리해요. 자신감을 갖고 적극적으로 밀고 나가세요!",
    en: "♂ You dominate Mars energy. A day when you can win in challenges and competition. Favorable for sports, competition, and negotiations. Be confident and push forward actively!"
  },
  // ============================================================
  // 목성(Jupiter) 트랜짓 - 확장, 행운, 년운
  // ============================================================
  jupiterConjunct: {
    ko: "♃ 목성이 당신의 별자리에 들어왔어요! 12년에 한 번 오는 최대 행운기입니다! 확장, 성장, 기회의 에너지가 넘쳐요. 새로운 사업, 해외 진출, 학업, 큰 투자에 최적의 시기예요. 이 황금기를 놓치지 마세요!",
    en: "♃ Jupiter has entered your sign! This is a once-in-12-years peak luck period! Energy of expansion, growth, and opportunity overflows. Optimal time for new business, overseas ventures, studies, or big investments. Don't miss this golden period!"
  },
  jupiterHarmony: {
    ko: "♃ 목성 에너지가 당신과 조화를 이루고 있어요. 전반적인 행운이 좋고, 기회가 자연스럽게 찾아와요. 낙관적인 마음으로 도전하면 좋은 결과를 얻을 수 있어요.",
    en: "♃ Jupiter energy harmonizes with you. Overall luck is good and opportunities come naturally. Approaching challenges with optimism will bring good results."
  },
  jupiterGrowth: {
    ko: "♃ 목성이 당신의 성장을 도와주고 있어요. 배움, 여행, 철학적 탐구에 유리해요. 새로운 경험과 넓은 시야가 인생을 풍요롭게 만들어요.",
    en: "♃ Jupiter supports your growth. Favorable for learning, travel, and philosophical exploration. New experiences and broader perspectives enrich your life."
  },
  jupiterExcess: {
    ko: "♃ 목성의 과잉 에너지에 주의하세요. 너무 큰 욕심이나 과도한 확장은 위험할 수 있어요. 적당한 선에서 멈추는 지혜가 필요해요. 욕심보다 절제가 필요한 시기예요.",
    en: "♃ Be careful of Jupiter's excess energy. Too much ambition or excessive expansion can be risky. You need the wisdom to stop at the right point. A time requiring moderation over greed."
  },
  jupiterTrine: {
    ko: "♃ 목성 트라인! 행운과 기회가 자연스럽게 흘러와요. 모든 일이 순조롭게 풀리는 날이에요. 큰 결정, 투자, 새로운 시작에 최고의 타이밍!",
    en: "♃ Jupiter trine! Luck and opportunities flow naturally. Everything goes smoothly today. Perfect timing for big decisions, investments, or new beginnings!"
  },
  jupiterSextile: {
    ko: "♃ 목성 섹스타일! 작은 기회들이 주어지는 날이에요. 적극적으로 움직이면 좋은 결과를 얻을 수 있어요. 인맥 확장, 학습, 여행에 유리해요.",
    en: "♃ Jupiter sextile! Small opportunities are given today. Active movement brings good results. Favorable for networking, learning, and travel."
  },
  jupiterSquare: {
    ko: "♃ 목성 스퀘어! 과욕이나 과잉 자신감에 주의하세요. 좋은 기회처럼 보이지만 위험이 숨어있을 수 있어요. 신중하게 판단하세요.",
    en: "♃ Jupiter square! Watch for overconfidence or excessive ambition. What looks like a good opportunity may hide risks. Judge carefully."
  },
  jupiterOpposition: {
    ko: "♃ 목성 오포지션! 외부에서 기회가 오지만 부담도 함께 와요. 다른 사람의 기대나 압박에 휘둘리지 말고, 당신에게 진정 맞는 것이 무엇인지 생각하세요.",
    en: "♃ Jupiter opposition! Opportunities come from outside but with pressure too. Don't be swayed by others' expectations; think about what truly suits you."
  },
  // ============================================================
  // 토성(Saturn) 트랜짓 - 시련, 교훈, 책임
  // ============================================================
  saturnConjunct: {
    ko: "♄ 토성이 당신의 별자리에 들어왔어요. 인생의 전환점이 될 수 있는 시기예요. 책임감, 인내심이 요구되고 시련이 있지만, 이를 통해 단단하게 성장해요. Saturn Return 시기라면 더욱 중요한 때입니다.",
    en: "♄ Saturn has entered your sign. This could be a life turning point. Responsibility and patience are required with challenges, but you'll grow stronger through them. Especially important if this is your Saturn Return."
  },
  saturnDiscipline: {
    ko: "♄ 토성의 절제 에너지가 흐르고 있어요. 재미보다는 책임, 즐거움보다는 의무가 앞서는 날이에요. 지루하지만 꾸준히 해야 할 일에 집중하세요.",
    en: "♄ Saturn's disciplined energy flows. Responsibility comes before fun, duty before pleasure. Focus on mundane but necessary tasks with persistence."
  },
  saturnOvercome: {
    ko: "♄ 토성의 시련을 극복할 수 있는 날이에요! 오랫동안 힘들었던 문제가 해결되기 시작해요. 인내와 노력이 보상받는 시기입니다.",
    en: "♄ A day when you can overcome Saturn's challenges! Long-standing difficult problems begin to resolve. A time when patience and effort are rewarded."
  },
  saturnLesson: {
    ko: "♄ 토성이 피할 수 없는 교훈을 가르치는 날이에요. 힘들고 무거운 에너지가 있지만, 이 시련을 통해 진정한 성장을 이룰 수 있어요. 피하지 말고 정면으로 마주하세요.",
    en: "♄ Saturn teaches an unavoidable lesson today. There's heavy energy and difficulty, but true growth comes through this challenge. Don't avoid it; face it head-on."
  },
  saturnStructure: {
    ko: "♄ 토성이 당신의 삶에 구조와 안정을 가져다 줘요. 장기 계획을 세우거나, 기초를 다지기에 좋은 날이에요. 인내심을 갖고 천천히 쌓아가세요.",
    en: "♄ Saturn brings structure and stability to your life. Good day for long-term planning or building foundations. Be patient and build slowly."
  },
  saturnTrine: {
    ko: "♄ 토성 트라인! 오랜 노력이 결실을 맺는 날이에요. 책임감 있는 행동이 인정받고, 안정적인 성과를 얻어요. 꾸준함이 빛나는 날!",
    en: "♄ Saturn trine! Long efforts bear fruit today. Responsible actions are recognized and stable results come. A day when consistency shines!"
  },
  saturnSextile: {
    ko: "♄ 토성 섹스타일! 규율과 노력이 보상받는 작은 기회가 와요. 진지하게 접근하면 좋은 결과를 얻을 수 있어요.",
    en: "♄ Saturn sextile! Small opportunities come when discipline and effort are rewarded. Serious approach brings good results."
  },
  saturnSquare: {
    ko: "♄ 토성 스퀘어! 외부에서 장애물과 제한이 와요. 좌절감을 느끼기 쉽지만, 이 시련을 통해 더 강해질 수 있어요. 포기하지 마세요.",
    en: "♄ Saturn square! External obstacles and limitations come. Frustration is easy, but you can become stronger through this trial. Don't give up."
  },
  saturnOpposition: {
    ko: "♄ 토성 오포지션! 다른 사람이나 상황이 당신을 막는 듯 느껴져요. 책임과 의무 사이에서 갈등이 생길 수 있어요. 균형을 찾으세요.",
    en: "♄ Saturn opposition! Others or situations seem to block you. Conflicts may arise between responsibilities and duties. Find balance."
  },
  // ============================================================
  // 태양(Sun) 트랜짓
  // ============================================================
  solarReturn: {
    ko: "☀️ 태양이 당신의 생일 별자리로 돌아왔어요! Solar Return - 새로운 1년이 시작되는 가장 중요한 시기예요. 이때 세운 목표와 의도가 다음 생일까지 영향을 미쳐요. 소원을 빌고, 새해 계획을 세우세요!",
    en: "☀️ The Sun has returned to your birth sign! Solar Return - the most important time when a new year begins. Goals and intentions set now influence until your next birthday. Make wishes and set New Year plans!"
  },
  sunHarmony: {
    ko: "☀️ 태양 에너지가 당신과 조화를 이루고 있어요. 활력이 넘치고, 자아 표현이 자연스러워요. 리더십을 발휘하거나 중요한 자리에 서기 좋은 날이에요.",
    en: "☀️ Sun energy harmonizes with you. Vitality overflows and self-expression comes naturally. Good day to show leadership or take center stage."
  },
  sunEnergize: {
    ko: "☀️ 태양이 당신에게 에너지를 충전해줘요! 창의력과 활력이 넘치고, 새로운 시작에 최적의 날이에요. 자신감을 갖고 빛나세요!",
    en: "☀️ The Sun energizes you! Creativity and vitality overflow, an optimal day for new beginnings. Be confident and shine!"
  },
  sunChallenge: {
    ko: "☀️ 태양 에너지와 갈등이 있어요. 에고 충돌이나 자존심 문제가 생길 수 있어요. 겸손하게 처신하고, 다른 사람의 빛도 인정하세요.",
    en: "☀️ Conflict with Sun energy. Ego clashes or pride issues may arise. Stay humble and acknowledge others' shine too."
  },
  // ============================================================
  // 달(Moon) 트랜짓
  // ============================================================
  moonConjunct: {
    ko: "🌙 달이 당신의 별자리에 들어왔어요! 감정이 민감해지고 직관이 강해지는 날이에요. 내면의 목소리에 귀 기울이고, 감정에 충실하게 하루를 보내세요.",
    en: "🌙 The Moon has entered your sign! A day when emotions become sensitive and intuition strengthens. Listen to your inner voice and spend the day true to your feelings."
  },
  moonHarmony: {
    ko: "🌙 달 에너지가 당신과 조화를 이루고 있어요. 정서적으로 안정되고, 주변 사람들과의 관계도 좋아요. 가족, 집과 관련된 일에 유리해요.",
    en: "🌙 Moon energy harmonizes with you. Emotionally stable and relationships with people around you improve. Favorable for family and home-related matters."
  },
  moonNurture: {
    ko: "🌙 달이 당신을 돌봐주는 에너지예요. 휴식, 자기 돌봄, 가족과의 시간에 좋은 날이에요. 따뜻한 음식과 편안한 시간을 즐기세요.",
    en: "🌙 Moon energy nurtures you. Good day for rest, self-care, and family time. Enjoy warm food and comfortable moments."
  },
  moonEmotional: {
    ko: "🌙 달 에너지가 감정적인 변화를 일으켜요. 예민해지거나 감정 기복이 있을 수 있어요. 중요한 결정은 감정이 안정된 후에 하세요.",
    en: "🌙 Moon energy causes emotional changes. You may become sensitive or have mood swings. Make important decisions after emotions stabilize."
  },
  // ============================================================
  // 달 위상 (신월, 만월, 상현, 하현)
  // ============================================================
  newMoon: {
    ko: "🌑 신월(新月)! 새로운 시작의 에너지가 충만한 날이에요. 목표를 세우고, 의도를 심는 최적의 날! 씨앗을 뿌리듯 새로운 프로젝트를 시작하세요.",
    en: "🌑 New Moon! A day full of new beginning energy. Optimal day to set goals and plant intentions! Start new projects like sowing seeds."
  },
  fullMoon: {
    ko: "🌕 보름달! 달의 에너지가 최고조에 달하는 완성과 성취의 날이에요. 진행 중이던 일을 마무리하고, 성과를 축하하세요. 감정이 고조되기 쉬우니 차분하게!",
    en: "🌕 Full Moon! A day of completion and achievement when moon energy peaks. Finish ongoing work and celebrate achievements. Emotions run high, so stay calm!"
  },
  quarterMoon: {
    ko: "🌓 상현/하현달! 도전과 결정이 필요한 전환점이에요. 장애물을 만나지만 극복할 힘도 주어져요. 포기하지 말고 밀고 나가세요!",
    en: "🌓 Quarter Moon! A turning point requiring challenges and decisions. You meet obstacles but are also given strength to overcome. Push through without giving up!"
  },
  // ============================================================
  // 행성 간 어스펙트 (목성-금성, 토성-화성 등)
  // ============================================================
  jupiterVenusConjunct: {
    ko: "♃♀ 목성-금성 합! 최고의 대길 상이에요! 사랑, 재물, 행운이 모두 빛나는 날이에요. 연애, 결혼, 계약, 투자에 최고의 날! 이런 날은 1년에 몇 번 없어요!",
    en: "♃♀ Jupiter-Venus conjunction! The best auspicious sign! Love, wealth, and luck all shine. Best day for romance, marriage, contracts, or investments! Days like this only come a few times a year!"
  },
  jupiterVenusTrine: {
    ko: "♃♀ 목성-금성 트라인! 행운과 사랑이 조화롭게 흘러요. 로맨틱한 만남, 재물 기회, 예술적 영감이 넘쳐요. 아름답고 풍요로운 날!",
    en: "♃♀ Jupiter-Venus trine! Luck and love flow harmoniously. Romantic encounters, wealth opportunities, and artistic inspiration abound. A beautiful and abundant day!"
  },
  saturnMarsConjunct: {
    ko: "♄♂ 토성-화성 합. 조심해야 할 날이에요. 갈등, 좌절, 장애물이 동시에 오는 어려운 에너지예요. 큰 결정이나 위험한 활동은 피하고, 안전에 집중하세요.",
    en: "♄♂ Saturn-Mars conjunction. A day to be careful. Difficult energy with conflicts, frustrations, and obstacles coming together. Avoid big decisions or dangerous activities; focus on safety."
  },
  saturnMarsSquare: {
    ko: "♄♂ 토성-화성 스퀘어. 긴장과 갈등의 에너지가 강해요. 쉽게 화가 나고, 외부에서 방해가 와요. 인내심을 갖고 감정을 조절하세요.",
    en: "♄♂ Saturn-Mars square. Tension and conflict energy is strong. Anger comes easily and external interference occurs. Be patient and control emotions."
  },
  // ============================================================
  // 화성/금성 어스펙트 추가
  // ============================================================
  marsTrine: {
    ko: "♂ 화성 트라인! 에너지가 자연스럽게 흘러요. 운동, 경쟁, 적극적인 활동에 좋은 날이에요. 행동력이 빛나요!",
    en: "♂ Mars trine! Energy flows naturally. Good day for exercise, competition, and active pursuits. Your action power shines!"
  },
  marsSextile: {
    ko: "♂ 화성 섹스타일! 작은 도전에서 성공할 수 있어요. 적극적으로 움직이면 좋은 결과를 얻어요.",
    en: "♂ Mars sextile! You can succeed in small challenges. Active movement brings good results."
  },
  marsSquare: {
    ko: "♂ 화성 스퀘어! 갈등과 충돌에 주의하세요. 화가 나기 쉽고 다툼이 생길 수 있어요. 감정 조절이 중요해요.",
    en: "♂ Mars square! Watch for conflicts and clashes. Anger comes easily and arguments may arise. Emotional control is important."
  },
  marsOpposition: {
    ko: "♂ 화성 오포지션! 다른 사람과 에너지 충돌이 있어요. 경쟁이나 갈등 상황이 생길 수 있으니, 상대방의 입장도 이해하려 하세요.",
    en: "♂ Mars opposition! Energy clash with others. Competition or conflict situations may arise, so try to understand the other side too."
  },
  venusTrine: {
    ko: "♀ 금성 트라인! 사랑과 아름다움이 자연스럽게 흘러와요. 연애, 예술, 인간관계 모두 좋아요. 매력이 빛나는 날!",
    en: "♀ Venus trine! Love and beauty flow naturally. Romance, art, and relationships are all good. A day your charm shines!"
  },
  venusSextile: {
    ko: "♀ 금성 섹스타일! 작은 즐거움과 기쁨이 찾아오는 날이에요. 주변 사람들과 좋은 시간을 보내기 좋아요.",
    en: "♀ Venus sextile! Small pleasures and joys come today. Good for spending quality time with people around you."
  },
  venusSquare: {
    ko: "♀ 금성 스퀘어! 사랑이나 돈 문제에서 작은 갈등이 있을 수 있어요. 사치나 충동구매를 조심하세요.",
    en: "♀ Venus square! Small conflicts in love or money matters may occur. Be careful of luxury or impulse buying."
  },
  venusOpposition: {
    ko: "♀ 금성 오포지션! 로맨틱한 긴장감이 있어요. 밀고 당기기의 에너지로, 연애에선 오히려 설렘이 될 수 있어요!",
    en: "♀ Venus opposition! There's romantic tension. Push and pull energy, which can actually create excitement in romance!"
  },
  // ============================================================
  // 고급 점성학: 달 위상 (8단계)
  // ============================================================
  moonPhaseNew: {
    ko: "🌑 삭(새달)의 날! 새로운 시작의 에너지가 충만해요. 목표를 세우고 씨앗을 뿌리는 최적의 시기예요. 새 프로젝트, 새로운 습관, 새 인연을 시작하기에 좋아요!",
    en: "🌑 New Moon day! Full of new beginning energy. Optimal time to set goals and plant seeds. Great for starting new projects, habits, or relationships!"
  },
  moonPhaseWaxingCrescent: {
    ko: "🌒 초승달의 날! 성장과 발전의 에너지가 넘쳐요. 신월에 심은 씨앗이 싹트기 시작하는 시기예요. 새로운 시도, 학습, 성장에 최고의 날!",
    en: "🌒 Waxing Crescent day! Overflowing with growth energy. Seeds planted at New Moon begin sprouting. Best day for new attempts, learning, and growth!"
  },
  moonPhaseFirstQuarter: {
    ko: "🌓 상현달의 날! 도전과 결정이 필요한 시기예요. 장애물을 만날 수 있지만, 이를 극복할 힘도 함께 주어져요. 결단력을 발휘하세요!",
    en: "🌓 First Quarter day! A time requiring challenges and decisions. You may meet obstacles, but strength to overcome is also given. Show your determination!"
  },
  moonPhaseWaxingGibbous: {
    ko: "🌔 차오르는 달의 날! 완성을 향해 정제하는 시기예요. 세부 사항을 다듬고, 마무리를 준비하세요. 분석과 개선에 좋은 날이에요.",
    en: "🌔 Waxing Gibbous day! A time to refine toward completion. Polish details and prepare for finishing. Good day for analysis and improvement."
  },
  moonPhaseFull: {
    ko: "🌕 보름달의 날! 에너지가 최고조에 달하는 완성과 결실의 날이에요. 성과를 축하하고, 감사를 표현하세요. 감정이 고조될 수 있으니 차분하게!",
    en: "🌕 Full Moon day! Peak energy day of completion and harvest. Celebrate achievements and express gratitude. Emotions may run high, so stay calm!"
  },
  moonPhaseWaningGibbous: {
    ko: "🌖 기우는 달의 날! 나눔과 감사의 시기예요. 배운 것을 다른 사람과 공유하고, 받은 것에 감사하세요. 지혜를 나누기에 좋은 날!",
    en: "🌖 Waning Gibbous day! A time for sharing and gratitude. Share what you've learned and be thankful for what you've received. Good day for sharing wisdom!"
  },
  moonPhaseLastQuarter: {
    ko: "🌗 하현달의 날! 정리와 반성의 시기예요. 불필요한 것을 버리고, 다음 사이클을 위해 준비하세요. 끝내지 못한 일을 마무리하기 좋아요.",
    en: "🌗 Last Quarter day! A time for organization and reflection. Let go of what's unnecessary and prepare for the next cycle. Good for finishing unfinished tasks."
  },
  moonPhaseWaningCrescent: {
    ko: "🌘 그믐달의 날! 휴식과 내면 성찰의 시기예요. 에너지가 낮을 수 있으니 무리하지 말고 쉬세요. 명상, 휴식, 다음 신월을 위한 준비에 좋아요.",
    en: "🌘 Waning Crescent day! A time for rest and inner reflection. Energy may be low, so don't overexert and rest. Good for meditation, rest, and preparing for next New Moon."
  },
  // ============================================================
  // 고급 점성학: 역행 (Retrograde)
  // ============================================================
  retrogradeMercury: {
    ko: "☿️⟲ 수성 역행 중! 커뮤니케이션, 계약, 전자기기에 문제가 생기기 쉬워요. 중요한 계약이나 새로운 시작은 피하고, 과거 일을 마무리하거나 재검토하기에 좋아요. 말과 글을 신중하게!",
    en: "☿️⟲ Mercury Retrograde! Communication, contracts, and electronics may have issues. Avoid important contracts or new starts; good for finishing or reviewing past matters. Be careful with words and writing!"
  },
  retrogradeVenus: {
    ko: "♀️⟲ 금성 역행 중! 사랑과 재물 문제에 재검토가 필요한 시기예요. 새 연애를 시작하거나 큰 쇼핑은 피하세요. 과거 관계를 돌아보거나 가치관을 재정립하기에 좋아요.",
    en: "♀️⟲ Venus Retrograde! Time to review love and financial matters. Avoid starting new romances or big purchases. Good for reflecting on past relationships or redefining values."
  },
  retrogradeMars: {
    ko: "♂️⟲ 화성 역행 중! 에너지가 내면으로 향하는 시기예요. 새 프로젝트보다 기존 일을 마무리하세요. 분노 조절에 주의하고, 과격한 운동이나 모험은 삼가세요.",
    en: "♂️⟲ Mars Retrograde! Energy turns inward. Focus on finishing existing work rather than new projects. Watch anger management and avoid extreme exercise or adventures."
  },
  retrogradeJupiter: {
    ko: "♃⟲ 목성 역행 중! 외적 확장보다 내면의 성장에 집중하는 시기예요. 큰 투자나 확장 계획은 재검토하세요. 철학적 성찰과 지혜 축적에 좋아요.",
    en: "♃⟲ Jupiter Retrograde! Focus on inner growth rather than external expansion. Review big investments or expansion plans. Good for philosophical reflection and accumulating wisdom."
  },
  retrogradeSaturn: {
    ko: "♄⟲ 토성 역행 중! 책임과 구조를 재검토하는 시기예요. 과거의 교훈을 돌아보고, 장기 계획을 점검하세요. 내면의 규율을 세우기에 좋은 때예요.",
    en: "♄⟲ Saturn Retrograde! Time to review responsibilities and structures. Look back on past lessons and check long-term plans. Good time to establish inner discipline."
  },
  // ============================================================
  // 고급 점성학: Void of Course Moon (공허한 달)
  // ============================================================
  voidOfCourse: {
    ko: "🌙⚠️ 달이 공전 중(Void of Course)이에요! 새로운 시작에 매우 불리한 시간이에요. 오늘 시작한 일은 결과를 맺지 못할 수 있어요. 중요한 결정, 계약, 새 프로젝트는 반드시 피하세요. 기존 일 마무리나 휴식에 집중하세요.",
    en: "🌙⚠️ Moon is Void of Course! Very unfavorable for new beginnings. Things started now may not come to fruition. Definitely avoid important decisions, contracts, or new projects. Focus on finishing existing work or resting."
  },
  // ============================================================
  // 고급 점성학: 일/월식 (Eclipse)
  // ============================================================
  solarEclipsestrong: {
    ko: "🌑☀️ 일식의 날! 인생의 큰 전환점이 될 수 있는 강력한 에너지예요. 새로운 시작의 씨앗이 뿌려지지만, 결과는 6개월 후에 나타나요. 오늘은 관찰하고 받아들이세요.",
    en: "🌑☀️ Solar Eclipse day! Powerful energy that could be a major life turning point. Seeds of new beginnings are sown, but results appear 6 months later. Today, observe and accept."
  },
  solarEclipsemedium: {
    ko: "🌑☀️ 일식 영향권! 변화의 에너지가 강하게 느껴지는 시기예요. 큰 결정은 피하고, 우주가 보내는 신호에 주목하세요.",
    en: "🌑☀️ Solar Eclipse influence zone! Change energy is strongly felt. Avoid big decisions and pay attention to signals the universe is sending."
  },
  solarEclipseweak: {
    ko: "🌑☀️ 일식 여파! 일식의 잔여 에너지가 남아있어요. 새로운 통찰이 떠오를 수 있으니 열린 마음을 가지세요.",
    en: "🌑☀️ Solar Eclipse aftermath! Residual eclipse energy remains. New insights may arise, so keep an open mind."
  },
  lunarEclipsestrong: {
    ko: "🌕🌑 월식의 날! 감정적인 해방과 완료의 강력한 에너지예요. 오래된 감정 패턴이나 관계가 끝날 수 있어요. 흘려보내고 새로운 것을 받아들일 준비를 하세요.",
    en: "🌕🌑 Lunar Eclipse day! Powerful energy of emotional release and completion. Old emotional patterns or relationships may end. Let go and prepare to receive the new."
  },
  lunarEclipsemedium: {
    ko: "🌕🌑 월식 영향권! 감정이 고조되고 숨겨진 것이 드러나는 시기예요. 감정을 관찰하고, 필요한 것은 놓아주세요.",
    en: "🌕🌑 Lunar Eclipse influence zone! Emotions run high and hidden things are revealed. Observe your feelings and let go of what's needed."
  },
  lunarEclipseweak: {
    ko: "🌕🌑 월식 여파! 월식의 잔여 에너지가 남아있어요. 감정적 정리를 마무리하고, 새로운 감정 사이클을 준비하세요.",
    en: "🌕🌑 Lunar Eclipse aftermath! Residual eclipse energy remains. Finish emotional processing and prepare for a new emotional cycle."
  },
  // ============================================================
  // 고급 점성학: 요일 지배 행성 (Day Rulers)
  // ============================================================
  dayRulerSun: {
    ko: "☀️ 일요일 - 태양의 날! 자아 표현, 리더십, 창의력에 유리한 날이에요. 자신감을 갖고 빛나세요! 중요한 발표나 자기 PR에 좋아요.",
    en: "☀️ Sunday - Sun's day! Favorable for self-expression, leadership, and creativity. Be confident and shine! Good for important presentations or self-promotion."
  },
  dayRulerMoon: {
    ko: "🌙 월요일 - 달의 날! 가정, 감정, 직관에 관련된 일에 유리해요. 가족과 시간을 보내거나, 내면의 목소리에 귀 기울이세요.",
    en: "🌙 Monday - Moon's day! Favorable for home, emotions, and intuition matters. Spend time with family or listen to your inner voice."
  },
  dayRulerMars: {
    ko: "♂️ 화요일 - 화성의 날! 행동, 경쟁, 용기에 유리한 날이에요. 운동, 도전, 경쟁에 좋아요. 다만 갈등에 주의하세요.",
    en: "♂️ Tuesday - Mars' day! Favorable for action, competition, and courage. Good for exercise, challenges, and competition. But watch for conflicts."
  },
  dayRulerMercury: {
    ko: "☿️ 수요일 - 수성의 날! 커뮤니케이션, 학습, 거래에 최고의 날이에요. 중요한 미팅, 계약, 발표에 유리해요.",
    en: "☿️ Wednesday - Mercury's day! Best day for communication, learning, and transactions. Favorable for important meetings, contracts, and presentations."
  },
  dayRulerJupiter: {
    ko: "♃ 목요일 - 목성의 날! 확장, 행운, 교육에 최고의 날이에요. 새로운 기회를 잡고, 큰 그림을 그리세요. 법률, 해외, 철학에도 좋아요.",
    en: "♃ Thursday - Jupiter's day! Best day for expansion, luck, and education. Seize new opportunities and think big picture. Good for law, overseas, and philosophy too."
  },
  dayRulerVenus: {
    ko: "♀️ 금요일 - 금성의 날! 사랑, 아름다움, 재물에 최고의 날이에요. 데이트, 쇼핑, 예술 활동에 완벽해요. 인간관계도 좋아져요!",
    en: "♀️ Friday - Venus' day! Best day for love, beauty, and wealth. Perfect for dates, shopping, and art activities. Relationships improve too!"
  },
  dayRulerSaturn: {
    ko: "♄ 토요일 - 토성의 날! 책임, 구조화, 장기 계획에 유리한 날이에요. 재미보다 의무에 집중하고, 기초를 다지세요. 부동산, 노인과 관련된 일에도 좋아요.",
    en: "♄ Saturday - Saturn's day! Favorable for responsibility, structuring, and long-term planning. Focus on duty over fun and build foundations. Good for real estate and matters related to elders."
  },
};

// ==== Date helpers ====
const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 천간의 음양
const STEM_YIN_YANG: Record<string, "양" | "음"> = {
  "甲": "양", "乙": "음", "丙": "양", "丁": "음", "戊": "양",
  "己": "음", "庚": "양", "辛": "음", "壬": "양", "癸": "음",
};

/**
 * 간단한 대운 추정 계산 (완전 정확하진 않지만 근사치)
 * 정확한 대운은 절기 계산이 필요하지만, 여기서는 간단히 추정
 */
function estimateDaeunCycles(
  birthDate: Date,
  gender: "male" | "female",
  yearStem: string,
  monthStem: string,
  monthBranch: string
): { daeunsu: number; cycles: Array<{ age: number; heavenlyStem: string; earthlyBranch: string }> } {
  // 순행/역행 결정: 연간 양+남 또는 음+여 → 순행, 그 외 역행
  const yearYinYang = STEM_YIN_YANG[yearStem] || "양";
  const isForward = (yearYinYang === "양" && gender === "male") || (yearYinYang === "음" && gender === "female");

  // 대운수 추정 (평균적으로 3~8세 사이, 간단히 5로 추정)
  // 정확한 계산은 생일과 절기 사이 일수/3 이지만 여기서는 간단히
  const birthMonth = birthDate.getMonth() + 1;
  const birthDay = birthDate.getDate();
  // 절기 중간값 15일 기준 거리로 추정
  const daysFromMid = Math.abs(birthDay - 15);
  const estimatedDaeunsu = Math.max(1, Math.min(10, Math.round(daysFromMid / 3)));

  // 월주 인덱스
  const monthStemIdx = HEAVENLY_STEMS.indexOf(monthStem);
  const monthBranchIdx = EARTHLY_BRANCHES.indexOf(monthBranch);

  if (monthStemIdx === -1 || monthBranchIdx === -1) {
    return { daeunsu: 0, cycles: [] };
  }

  // 대운 10주기 생성
  const cycles: Array<{ age: number; heavenlyStem: string; earthlyBranch: string }> = [];
  for (let i = 1; i <= 10; i++) {
    const age = estimatedDaeunsu + (i - 1) * 10;
    let stemIdx: number, branchIdx: number;
    if (isForward) {
      stemIdx = (monthStemIdx + i) % 10;
      branchIdx = (monthBranchIdx + i) % 12;
    } else {
      stemIdx = (monthStemIdx - i % 10 + 10) % 10;
      branchIdx = (monthBranchIdx - i % 12 + 12) % 12;
    }
    cycles.push({
      age,
      heavenlyStem: HEAVENLY_STEMS[stemIdx],
      earthlyBranch: EARTHLY_BRANCHES[branchIdx],
    });
  }

  return { daeunsu: estimatedDaeunsu, cycles };
}

function parseBirthDate(birthDateParam: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateParam);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function getHourBranchIndex(hour: number): number {
  // 子시: 23-00, 丑: 01-02 ... 亥: 21-22
  return Math.floor(((hour + 1) % 24) / 2);
}

function getHourStem(dayStem: string, hourBranchIdx: number): string {
  const dayStemIndex = HEAVENLY_STEMS.indexOf(dayStem);
  if (dayStemIndex === -1) return "";
  const baseIndex = (dayStemIndex % 5) * 2; // 甲/己→甲, 乙/庚→丙, 丙/辛→戊, 丁/壬→庚, 戊/癸→壬
  return HEAVENLY_STEMS[(baseIndex + hourBranchIdx) % 10] || "";
}

function buildPillars(birthDate: Date, birthTime: string) {
  const yearGanzhi = getYearGanzhi(birthDate.getFullYear());
  const monthGanzhi = getMonthGanzhi(birthDate.getFullYear(), birthDate.getMonth() + 1);
  const dayGanzhi = getGanzhiForDate(birthDate);

  let hourStem = "";
  let hourBranch = "";
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(birthTime);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    if (hour >= 0 && hour <= 23) {
      const branchIdx = getHourBranchIndex(hour);
      hourBranch = EARTHLY_BRANCHES[branchIdx] || "";
      hourStem = getHourStem(dayGanzhi.stem, branchIdx);
    }
  }

  return {
    year: { stem: yearGanzhi.stem, branch: yearGanzhi.branch },
    month: { stem: monthGanzhi.stem, branch: monthGanzhi.branch },
    day: { stem: dayGanzhi.stem, branch: dayGanzhi.branch },
    hour: { stem: hourStem, branch: hourBranch },
  };
}

// 날짜 데이터 변환
// Formatted response shape
interface FormattedDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  summary: string; // 한줄 요약
  bestTimes: string[]; // 추천 시간대
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
}

// 한줄 요약 생성
function generateSummary(
  grade: ImportanceGrade,
  categories: EventCategory[],
  score: number,
  lang: "ko" | "en"
): string {
  const cat = categories[0] || "general";

  if (lang === "ko") {
    if (grade === 0) {
      // 천운의 날 - 최상의 메시지
      const messages: Record<string, string> = {
        career: "🌟 인생을 바꿀 계약, 사업 시작에 완벽한 날!",
        wealth: "💎 대박 재물운! 중요한 투자/계약 강력 추천!",
        love: "💍 프로포즈, 결혼 결정에 최고의 날!",
        health: "✨ 에너지 폭발! 새로운 도전을 시작하세요!",
        travel: "🌈 인생 여행 떠나기 완벽한 날!",
        study: "🏆 합격운 최고! 시험, 면접에 행운이!",
        general: "✨ 천운이 함께하는 특별한 날!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 1) {
      const messages: Record<string, string> = {
        career: "💼 계약, 협상, 중요한 결정에 최적의 날!",
        wealth: "💰 재물운 최고! 투자, 쇼핑에 좋아요!",
        love: "💕 연애운 폭발! 고백, 데이트 적극 추천!",
        health: "💪 활력 넘치는 날! 새 운동 시작해보세요!",
        travel: "✈️ 여행운 최고! 출발하기 좋은 날!",
        study: "📚 집중력 UP! 시험, 공부에 유리해요!",
        general: "⭐ 모든 일이 잘 풀리는 최고의 날!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 2 && score >= 60) {
      const messages: Record<string, string> = {
        career: "📋 업무가 순조롭게 진행되는 날",
        wealth: "💵 작은 행운이 찾아올 수 있어요",
        love: "☕ 편안한 만남에 좋은 날",
        health: "🌿 가벼운 산책이나 휴식 추천",
        travel: "🚶 가까운 곳 나들이에 좋아요",
        study: "📖 꾸준한 학습이 성과를 내요",
        general: "🌤️ 평온하게 흘러가는 괜찮은 날"
      };
      return messages[cat] || messages.general;
    } else if (grade === 2) {
      return "🌥️ 평범한 하루, 무리하지 마세요";
    } else if (grade === 3) {
      // 보통 날 - 중립적 메시지
      const messages: Record<string, string> = {
        career: "📝 일상 업무에 집중하세요",
        wealth: "💵 큰 거래보다 평소대로 관리하세요",
        love: "☕ 가벼운 대화가 좋아요",
        health: "🚶 무리하지 않는 게 좋아요",
        travel: "🏠 가까운 곳 위주가 좋아요",
        study: "📖 복습 위주로 하세요",
        general: "🌤️ 평범한 하루, 편안하게 보내세요"
      };
      return messages[cat] || messages.general;
    } else {
      // Grade 4 - 나쁜 날
      const messages: Record<string, string> = {
        career: "⚠️ 중요한 결정은 미루세요",
        wealth: "💸 큰 지출/투자는 피하세요",
        love: "💔 오해가 생기기 쉬워요, 조심!",
        health: "🏥 무리한 활동은 삼가세요",
        travel: "🚫 이동 시 각별히 주의하세요",
        study: "😵 집중이 안 될 수 있어요",
        general: "🌧️ 조용히 지내는 게 좋은 날"
      };
      return messages[cat] || messages.general;
    }
  } else {
    // English
    if (grade === 0) {
      // Celestial Day - best messages
      const messages: Record<string, string> = {
        career: "🌟 Perfect day for life-changing contracts!",
        wealth: "💎 Amazing fortune! Big investments highly recommended!",
        love: "💍 Best day for proposals and wedding decisions!",
        health: "✨ Energy explosion! Start new challenges!",
        travel: "🌈 Perfect day for a journey of a lifetime!",
        study: "🏆 Best luck for exams and interviews!",
        general: "✨ A special day blessed by heaven!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 1) {
      const messages: Record<string, string> = {
        career: "💼 Best day for contracts and decisions!",
        wealth: "💰 Great wealth luck! Good for investments!",
        love: "💕 Romance luck high! Perfect for dates!",
        health: "💪 Full of energy! Start something new!",
        travel: "✈️ Excellent travel luck! Go for it!",
        study: "📚 Focus is sharp! Great for exams!",
        general: "⭐ Everything flows smoothly today!"
      };
      return messages[cat] || messages.general;
    } else if (grade === 2 && score >= 60) {
      return "🌤️ A good day with positive energy";
    } else if (grade === 2) {
      return "🌥️ An ordinary day, take it easy";
    } else if (grade === 3) {
      return "🌤️ A normal day, take it easy";
    } else {
      return "🌧️ Be cautious and avoid big decisions";
    }
  }
}

// 추천 시간대 생성
function generateBestTimes(
  grade: ImportanceGrade,
  categories: EventCategory[],
  lang: "ko" | "en"
): string[] {
  // Grade 3(보통), Grade 4(나쁜 날)는 시간 추천 없음
  if (grade >= 3) return [];

  const cat = categories[0] || "general";

  if (lang === "ko") {
    const times: Record<string, string[]> = {
      career: ["🌅 오전 10-12시: 미팅/협상 최적", "🌆 오후 2-4시: 서류/계약 유리"],
      wealth: ["💰 오전 9-11시: 금융 거래 유리", "📈 오후 1-3시: 투자 결정 적합"],
      love: ["☕ 오후 3-5시: 데이트 최적", "🌙 저녁 7-9시: 로맨틱한 시간"],
      health: ["🌄 오전 6-8시: 운동 효과 UP", "🧘 저녁 6-8시: 휴식/명상 추천"],
      study: ["📚 오전 9-12시: 집중력 최고", "🌙 저녁 8-10시: 암기력 UP"],
      travel: ["✈️ 오전 8-10시: 출발 추천", "🚗 오후 2-4시: 이동 안전"],
      general: ["🌅 오전 10-12시: 중요한 일 처리", "🌆 오후 3-5시: 미팅/약속"]
    };
    return times[cat] || times.general;
  } else {
    const times: Record<string, string[]> = {
      career: ["🌅 10am-12pm: Best for meetings", "🌆 2-4pm: Good for documents"],
      wealth: ["💰 9-11am: Financial deals", "📈 1-3pm: Investment decisions"],
      love: ["☕ 3-5pm: Perfect for dates", "🌙 7-9pm: Romantic time"],
      health: ["🌄 6-8am: Exercise boost", "🧘 6-8pm: Rest & meditation"],
      study: ["📚 9am-12pm: Peak focus", "🌙 8-10pm: Memory boost"],
      travel: ["✈️ 8-10am: Best departure", "🚗 2-4pm: Safe travel"],
      general: ["🌅 10am-12pm: Important tasks", "🌆 3-5pm: Meetings"]
    };
    return times[cat] || times.general;
  }
}

// 통합 번역 조회 - SAJU와 ASTRO 번역 모두에서 찾음
function getFactorTranslation(key: string, lang: "ko" | "en"): string | null {
  return SAJU_FACTOR_TRANSLATIONS[key]?.[lang]
    || ASTRO_FACTOR_TRANSLATIONS[key]?.[lang]
    || null;
}

function formatDateForResponse(date: ImportantDate, locale: string): FormattedDate {
  const translations = locale === "ko" ? koTranslations : enTranslations;
  const lang = locale === "ko" ? "ko" : "en";

  // 중복 카테고리 제거
  const uniqueCategories = [...new Set(date.categories)];

  // 번역된 요소만 포함 (번역 없으면 제외)
  const translatedSajuFactors = date.sajuFactorKeys
    .map(key => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null);

  const translatedAstroFactors = date.astroFactorKeys
    .map(key => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null);

  return {
    date: date.date,
    grade: date.grade,
    score: date.score,
    categories: uniqueCategories,
    title: getTranslation(date.titleKey, translations as TranslationData),
    description: getTranslation(date.descKey, translations as TranslationData),
    summary: generateSummary(date.grade, uniqueCategories, date.score, lang),
    bestTimes: generateBestTimes(date.grade, uniqueCategories, lang),
    sajuFactors: translatedSajuFactors,
    astroFactors: translatedAstroFactors,
    recommendations: date.recommendationKeys.map(key =>
      getTranslation(`calendar.recommendations.${key}`, translations as TranslationData)
    ),
    warnings: date.warningKeys.map(key =>
      getTranslation(`calendar.warnings.${key}`, translations as TranslationData)
    ),
  };
}

// AI 백엔드에서 추가 날짜 정보 가져오기
async function fetchAIDates(sajuData: Record<string, unknown>, astroData: Record<string, unknown>, theme: string = "overall"): Promise<{
  auspicious: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
  caution: Array<{ date?: string; description?: string; is_auspicious?: boolean }>;
} | null> {
  try {
    validateBackendUrl(BACKEND_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${BACKEND_URL}/api/theme/important-dates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        theme,
        saju: sajuData,
        astro: astroData,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        auspicious: data.auspicious_dates || [],
        caution: data.caution_dates || [],
      };
    }
  } catch (error) {
    console.warn("[Calendar] AI backend not available, using local calculation:", error);
  }
  return null;
}

// 위치 좌표
const LOCATION_COORDS: Record<string, { lat: number; lng: number; tz: string }> = {
  Seoul: { lat: 37.5665, lng: 126.9780, tz: "Asia/Seoul" },
  "Seoul, KR": { lat: 37.5665, lng: 126.9780, tz: "Asia/Seoul" },
  Busan: { lat: 35.1796, lng: 129.0756, tz: "Asia/Seoul" },
  "Busan, KR": { lat: 35.1796, lng: 129.0756, tz: "Asia/Seoul" },
  Tokyo: { lat: 35.6762, lng: 139.6503, tz: "Asia/Tokyo" },
  "Tokyo, JP": { lat: 35.6762, lng: 139.6503, tz: "Asia/Tokyo" },
  "New York": { lat: 40.7128, lng: -74.0060, tz: "America/New_York" },
  "New York, US": { lat: 40.7128, lng: -74.0060, tz: "America/New_York" },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, tz: "America/Los_Angeles" },
  "Los Angeles, US": { lat: 34.0522, lng: -118.2437, tz: "America/Los_Angeles" },
  London: { lat: 51.5074, lng: -0.1278, tz: "Europe/London" },
  "London, GB": { lat: 51.5074, lng: -0.1278, tz: "Europe/London" },
  Paris: { lat: 48.8566, lng: 2.3522, tz: "Europe/Paris" },
  "Paris, FR": { lat: 48.8566, lng: 2.3522, tz: "Europe/Paris" },
  Beijing: { lat: 39.9042, lng: 116.4074, tz: "Asia/Shanghai" },
  "Beijing, CN": { lat: 39.9042, lng: 116.4074, tz: "Asia/Shanghai" },
  Shanghai: { lat: 31.2304, lng: 121.4737, tz: "Asia/Shanghai" },
  "Shanghai, CN": { lat: 31.2304, lng: 121.4737, tz: "Asia/Shanghai" },
};

const VALID_CALENDAR_LOCALES = new Set(["ko", "en"]);
const VALID_CALENDAR_GENDERS = new Set(["male", "female"]);
const VALID_CALENDAR_CATEGORIES: readonly EventCategory[] = [
  "wealth",
  "career",
  "love",
  "health",
  "travel",
  "study",
  "general",
];
const VALID_CALENDAR_PLACES = new Set(Object.keys(LOCATION_COORDS));
const CALENDAR_TIME_RE = /^\d{2}:\d{2}$/;
const CALENDAR_YEAR_RE = /^\d{4}$/;
const MAX_PLACE_LEN = 64;

/**
 * GET /api/calendar
 * 중요 날짜 조회 (인증 불필요)
 *
 * Query params:
 * - birthDate: 생년월일 (YYYY-MM-DD) - 필수
 * - birthTime: 출생시간 (HH:MM) - 선택
 * - birthPlace: 출생장소 - 선택
 * - year: 연도 (기본: 현재년도)
 * - category: 카테고리 필터
 * - locale: 언어 (ko, en)
 */
export async function GET(request: NextRequest) {
  let limitHeaders: Headers | undefined;
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`calendar:${ip}`, { limit: 30, windowSeconds: 60 });
    limitHeaders = limit.headers;
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: limit.reset },
        { status: 429, headers: limit.headers }
      );
    }
    if (!requirePublicToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const { searchParams } = new URL(request.url);
    const birthDateParam = searchParams.get("birthDate")?.trim().slice(0, 10);

    if (!birthDateParam) {
      return NextResponse.json(
        { error: "Birth date required", message: "생년월일을 입력해주세요." },
        { status: 400, headers: limit.headers }
      );
    }

    // 생년월일 파싱 (UTC 오프셋 영향 없이 고정)
    const birthDate = parseBirthDate(birthDateParam);
    if (!birthDate) {
      return NextResponse.json({ error: "Invalid birth date" }, { status: 400, headers: limit.headers });
    }

    const birthTimeParam = (searchParams.get("birthTime") || "12:00").trim().slice(0, 5);
    const birthPlaceParam = (searchParams.get("birthPlace") || "Seoul").trim();
    const birthPlace =
      birthPlaceParam.length <= MAX_PLACE_LEN && VALID_CALENDAR_PLACES.has(birthPlaceParam) ? birthPlaceParam : null;
    const yearParam = searchParams.get("year")?.trim();
    const year = parseInt(yearParam || String(new Date().getFullYear()), 10);

    // Gender 파라미터 (대운 계산에 필요)
    const genderParam = searchParams.get("gender")?.toLowerCase().trim();
    const gender: "male" | "female" = VALID_CALENDAR_GENDERS.has(genderParam as string)
      ? (genderParam as "male" | "female")
      : "male";

    // Locale 유효성 검사
    const localeParam = searchParams.get("locale")?.toLowerCase().trim() || "ko";
    const locale = VALID_CALENDAR_LOCALES.has(localeParam) ? localeParam : "ko";

    // Category 유효성 검사
    const categoryParam = searchParams.get("category");
    const category: EventCategory | null = categoryParam && VALID_CALENDAR_CATEGORIES.includes(categoryParam as EventCategory)
      ? categoryParam as EventCategory
      : null;

    if (!CALENDAR_TIME_RE.test(birthTimeParam)) {
      return NextResponse.json({ error: "Invalid birth time" }, { status: 400, headers: limit.headers });
    }
    if ((yearParam && !CALENDAR_YEAR_RE.test(yearParam)) || !Number.isFinite(year) || year < 1900 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400, headers: limit.headers });
    }
    if (!birthPlace) {
      return NextResponse.json({ error: "Invalid birth place" }, { status: 400, headers: limit.headers });
    }

    // 사주 프로필 계산
    const baseSajuProfile = calculateSajuProfileFromBirthDate(birthDate);
    const astroProfile = calculateAstroProfileFromBirthDate(birthDate);
    const pillars = buildPillars(birthDate, birthTimeParam);

    // 대운 계산 및 sajuProfile에 추가
    const daeunData = estimateDaeunCycles(
      birthDate,
      gender,
      pillars.year.stem,
      pillars.month.stem,
      pillars.month.branch
    );

    // 연지(年支) 추출 - 삼재/역마/도화 계산에 필요
    const yearBranch = pillars.year.branch;

    const sajuProfile = {
      ...baseSajuProfile,
      birthYear: birthDate.getFullYear(),
      yearBranch,
      daeunCycles: daeunData.cycles,
      daeunsu: daeunData.daeunsu,
    };

    // 로컬 계산으로 중요 날짜 가져오기 (모든 등급 포함)
    const localDates = calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
      minGrade: 4,  // grade 4 (나쁜 날)까지 포함
    });

    // 카테고리 필터링
    let filteredDates = localDates;
    if (category) {
      filteredDates = localDates.filter(d => d.categories.includes(category));
    }

    // AI 백엔드에서 추가 정보 시도
    const coords = LOCATION_COORDS[birthPlace] || LOCATION_COORDS["Seoul"];

    const sajuData = {
      birth_date: birthDateParam,
      birth_time: birthTimeParam,
      gender: "unknown",
      day_master: pillars.day.stem,
      pillars,
      elements: sajuProfile,
    };

    const astroData = {
      birth_date: birthDateParam,
      birth_time: birthTimeParam,
      latitude: coords.lat,
      longitude: coords.lng,
      timezone: coords.tz,
      sun_sign: astroProfile.sunSign,
      planets: {
        sun: { sign: astroProfile.sunSign, degree: 15 },
        moon: { sign: astroProfile.sunSign, degree: 15 },
      },
    };

    // AI 백엔드 호출 시도
    const aiDates = await fetchAIDates(sajuData, astroData, category || "overall");

    // 5등급별 그룹화
    const grade0 = filteredDates.filter(d => d.grade === 0); // 천운의 날
    const grade1 = filteredDates.filter(d => d.grade === 1); // 아주 좋은 날
    const grade2 = filteredDates.filter(d => d.grade === 2); // 좋은 날
    const grade3 = filteredDates.filter(d => d.grade === 3); // 보통 날
    const grade4 = filteredDates.filter(d => d.grade === 4); // 나쁜 날

    // AI 날짜 병합
    let aiEnhanced = false;
    if (aiDates) {
      aiEnhanced = true;
      // AI 날짜를 기존 날짜에 병합 가능
    }

    const res = NextResponse.json({
      success: true,
      type: "yearly",
      year,
      aiEnhanced,
      birthInfo: {
        date: birthDateParam,
        time: birthTimeParam,
        place: birthPlace,
      },
      summary: {
        total: filteredDates.length,
        grade0: grade0.length, // 천운의 날
        grade1: grade1.length, // 아주 좋은 날
        grade2: grade2.length, // 좋은 날
        grade3: grade3.length, // 보통 날
        grade4: grade4.length, // 나쁜 날
      },
      topDates: (() => {
        // grade0 + grade1 + grade2가 부족하면 grade3 중 높은 점수 날짜도 포함
        const topCandidates = [...grade0, ...grade1, ...grade2];
        if (topCandidates.length < 5) {
          const topGrade3 = grade3
            .sort((a, b) => b.score - a.score)
            .slice(0, 5 - topCandidates.length);
          topCandidates.push(...topGrade3);
        }
        return topCandidates.slice(0, 10).map(d => formatDateForResponse(d, locale));
      })(),
      goodDates: [...grade1, ...grade2].slice(0, 20).map(d => formatDateForResponse(d, locale)),
      badDates: grade4.slice(0, 10).map(d => formatDateForResponse(d, locale)),
      allDates: filteredDates.map(d => formatDateForResponse(d, locale)),
      ...(aiDates && {
        aiInsights: {
          auspicious: aiDates.auspicious,
          caution: aiDates.caution,
        },
      }),
    });

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: limitHeaders }
    );
  }
}
