'use client'

import PolicyDocument, { type PolicySection } from '../_components/PolicyDocument'
import { SUPPORT_EMAIL } from '@/lib/config/contact'

const OPERATOR = 'Paul Rhee (individual)'
const EFFECTIVE_DATE = '2026-05-27'

const sections: PolicySection[] = [
  {
    id: 'agreement',
    title: '1. Agreement to Terms',
    titleKo: '1. 이용약관 동의',
    body: `Welcome to DestinyPal. These Terms of Service ("Terms") are a legally binding agreement between you ("User", "you") and Paul Rhee (individual) ("DestinyPal", "we") that governs your access to and use of our website, mobile apps, and services (the "Service").\n\nBy accessing or using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.\n\nService Operator: Paul Rhee (individual)\nEmail: ${SUPPORT_EMAIL}\nEffective Date: ${EFFECTIVE_DATE}`,
    bodyKo: `DestinyPal에 오신 것을 환영합니다. 본 이용약관("약관")은 사용자(“귀하”)와 Paul Rhee(개인)(“DestinyPal”, “당사”) 간의 법적 계약으로, 당사 웹사이트·모바일 앱·서비스(“서비스”) 이용을 규율합니다.\n\n서비스 이용 시 본 약관과 개인정보처리방침에 동의하는 것으로 간주되며, 동의하지 않는 경우 서비스를 이용할 수 없습니다.\n\n서비스 운영자: Paul Rhee (individual)\n이메일: ${SUPPORT_EMAIL}\n시행일: ${EFFECTIVE_DATE}`,
  },
  {
    id: 'definitions',
    title: '2. Definitions',
    titleKo: '2. 용어 정의',
    body: `'Service': the DestinyPal platform (web, mobile, features, content, and services)\n'User'/'Member': anyone who creates an account or uses the Service\n'Content': information, data, text, software, media, readings, interpretations, or other materials\n'User Content': Content you submit/upload/transmit via the Service\n'Paid Services': credit packs and the readings or reports unlocked by spending credits\n'Account': your registered user account on the Service`,
    bodyKo: `'서비스': DestinyPal 플랫폼(웹, 모바일, 기능, 콘텐츠, 제공 서비스 포함)\n'사용자/회원': 계정을 만들거나 서비스를 이용하는 모든 개인\n'콘텐츠': 정보, 데이터, 텍스트, 소프트웨어, 이미지/음원/영상, 리딩, 해석 등 모든 자료\n'사용자 콘텐츠': 서비스에 귀하가 제출·업로드·전송하는 콘텐츠\n'유료 서비스': 크레딧 팩 및 크레딧을 사용해 이용하는 리딩·리포트\n'계정': 서비스에 등록된 귀하의 사용자 계정`,
  },
  {
    id: 'eligibility',
    title: '3. Eligibility and Account Registration',
    titleKo: '3. 자격 요건 및 계정 생성',
    body: 'Age: you must be 14 or older (16 in the EU, or the local age of digital consent). Users under 18 require parental or guardian consent. Under Korean Civil Act §5, a purchase made by a minor without legal-guardian consent may be revoked by the guardian — please contact us with proof of guardianship and the transaction ID.\n\nAccount Creation: DestinyPal currently supports Google OAuth sign-in only. You must provide accurate, current, and complete information (account email, optional display name, and optional birth information for personalized readings).\n\nSecurity: you are responsible for protecting access to the Google account you used to sign in, for all activity on your account, for promptly reporting any unauthorized use, and for not sharing your account with others.\n\nAccuracy: please provide truthful information and keep it up to date. We may suspend or terminate accounts that contain inaccurate or misleading information.\n\nThird-party Auth: Google’s terms and privacy policy apply to the OAuth sign-in flow.',
    bodyKo:
      '연령: 만 14세 이상이어야 합니다(EU의 경우 만 16세 이상 또는 현지의 디지털 동의 연령). 만 18세 미만 이용자는 법정대리인의 동의가 필요합니다. 민법 제5조에 따라 법정대리인의 동의 없이 한 미성년자의 결제는 법정대리인이 취소할 수 있으며, 보호자 관계 증빙과 거래 ID를 함께 문의해 주세요.\n\n계정 생성: 현재 DestinyPal은 Google OAuth 로그인만 지원합니다. 정확하고 최신이며 완전한 정보를 제공해 주셔야 합니다(계정 이메일, 표시 이름(선택), 맞춤 리딩용 출생 정보(선택) 등).\n\n보안: 가입에 사용한 Google 계정의 접근 권한 보호, 계정 내 모든 활동, 무단 사용 시 즉각적인 통지, 계정 공유 금지에 대한 책임은 귀하에게 있습니다.\n\n정확성: 사실에 기반한 정보를 제공해 주시고 필요 시 업데이트해 주셔야 합니다. 허위 또는 오해의 소지가 있는 계정은 정지되거나 해지될 수 있습니다.\n\n제3자 인증: Google OAuth 로그인에는 Google의 약관 및 개인정보처리방침이 적용됩니다.',
  },
  {
    id: 'service',
    title: '4. Description of Service',
    titleKo: '4. 서비스 설명',
    body: 'DestinyPal offers AI-assisted destiny and self-reflection services, including but not limited to: Destiny Counselor, Tarot Counselor, Compatibility analysis, and the Daily/Monthly/Yearly Fortune Calendar. Feature availability may vary by plan, region, and product updates.\n\nNature of Service: Readings are AI-assisted, intended for entertainment, self-reflection, and personal growth. They are not medical, legal, financial, psychological, or therapeutic advice. Accuracy depends on the information you provide.',
    bodyKo:
      'DestinyPal은 AI 보조 기반의 운명/자기성찰 서비스를 제공합니다. 주요 서비스에는 운명 상담사, 타로 상담사, 궁합 분석, 일·월·년 운세 캘린더가 포함되며 이에 한정되지 않습니다. 제공 기능은 플랜, 지역, 제품 업데이트에 따라 달라질 수 있습니다.\n\n서비스 성격: 리딩은 AI 보조 기반이며 오락·자기성찰·개인 성장 목적입니다. 의료·법률·재무·심리·치료 자문이 아니며, 정확도는 사용자가 제공한 정보에 따라 달라질 수 있습니다.',
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable Use Policy',
    titleKo: '5. 이용 제한',
    body: "The following are prohibited: breaking the law; infringing intellectual property; harassment or abuse; impersonation; running bots or scrapers without permission; attempting unauthorized access; disrupting the Service; uploading malware; collecting data without consent; reverse engineering; commercial use without authorization; sharing or reselling readings; bypassing paywalls or rate limits.\nThird-party data: do not submit another person's birth information, photo, or personal data (for example, for compatibility, couple readings, or shared sessions) without their informed consent. You are solely responsible for obtaining such consent and remain liable for any claims arising from unauthorized submissions.\nContent: no illegal, defamatory, obscene, hateful, violent, or discriminatory material; no spam.\nViolations may lead to suspension or termination, as well as legal action.",
    bodyKo:
      '다음 행위는 금지됩니다: 법령 위반, 지식재산권 침해, 괴롭힘 및 남용, 타인 사칭, 무단 봇·크롤러 사용, 무단 접근 시도, 서비스 방해, 악성코드 업로드, 동의 없는 정보 수집, 역설계 및 분해, 무단 상업적 이용, 리딩 공유 또는 재판매, 유료 장벽 및 속도 제한 우회.\n타인 정보: 궁합·커플 리딩·공유 세션 등에서 타인의 출생 정보, 사진, 개인 정보를 본인의 명시적 동의 없이 입력해서는 안 됩니다. 동의 확보 책임은 전적으로 귀하에게 있으며, 무단 제공으로 발생하는 청구·분쟁에 대한 책임 역시 귀하가 부담합니다.\n콘텐츠 제한: 불법, 비방, 음란, 증오, 폭력, 차별, 스팸성 콘텐츠는 금지됩니다.\n위반 시 계정 정지 또는 해지, 법적 조치가 이루어질 수 있습니다.',
  },
  {
    id: 'ip',
    title: '6. Intellectual Property Rights',
    titleKo: '6. 지식재산권',
    body: 'DestinyPal Content: our software, algorithms and AI models, design, graphics and logos, templates and interpretation frameworks, educational content, and UI/UX are owned by DestinyPal or its licensors and are protected by intellectual property laws.\n\nProprietary Tech — Destiny Fusion Matrix™: a multi-layer cross-reference system (1,206 cells, scoring and weighting, fusion methods, data structures). Reverse engineering and extraction are strictly prohibited.\n\nUser Content License: you grant us a worldwide, non-exclusive, royalty-free license to use, display, store, and process your User Content solely to operate the service for you — generating readings, saving your history, and providing customer support. We do NOT use your User Content to train AI models. Aggregated, fully anonymized usage statistics may be used to monitor service health and improve UX, but they are never tied back to your identity. You retain ownership of your User Content.\n\nReading Results: provided for your personal, non-commercial use; do not redistribute, resell, or publicly share them without permission.\n\nTrademarks: “DestinyPal”, “Destiny Fusion Matrix”, and related marks belong to Paul Rhee; prior written consent is required for any use.',
    bodyKo:
      'DestinyPal 콘텐츠(소프트웨어, 알고리즘/AI 모델, 디자인·그래픽·로고, 리딩 템플릿·해석 프레임워크, 교육 자료, UI/UX 등)는 당사 또는 라이선스 보유자의 자산이며 관련 법으로 보호됩니다.\n\n독점 기술 - Destiny Fusion Matrix™: 1,206개 상호작용 셀, 점수/가중치, 융합 해석 방법론, 데이터 구조를 포함한 다층 교차참조 시스템입니다. 역설계·분석·추출·재현은 금지됩니다.\n\n사용자 콘텐츠 라이선스: 귀하는 제출한 사용자 콘텐츠에 대해 서비스 운영을 위해 필요한 범위 내에서 전 세계적·비독점적·로열티 없는 라이선스를 당사에 부여합니다. 이는 귀하를 위한 리딩 생성·기록 저장·고객 지원 응답 목적에 한정됩니다. **당사는 사용자 콘텐츠를 AI 모델 학습에 사용하지 않습니다.** 서비스 상태 모니터링 및 UX 개선을 위해 완전 익명화된 집계 통계가 활용될 수 있으나, 귀하의 신원과 연결되지 않습니다. 사용자 콘텐츠의 소유권은 귀하에게 있습니다.\n\n리딩 결과: 개인적·비상업적 용도로만 제공되며, 허가 없이 재배포/판매/공개 공유할 수 없습니다.\n\n상표: “DestinyPal”, “Destiny Fusion Matrix” 및 관련 로고는 Paul Rhee의 상표이며, 사용에는 사전 서면 동의가 필요합니다.',
  },
  {
    id: 'billing',
    title: '7. Paid Services and Billing',
    titleKo: '7. 유료 서비스 및 결제',
    body: 'Payment Processing: all payments are handled via Stripe (PCI-DSS Level 1). We do not store full card numbers.\n\nPricing: prices are displayed at checkout. We may change prices at any time; new prices apply only to purchases made after the change.\n\nNo Subscriptions: DestinyPal does not offer recurring subscriptions. All purchases are one-time credit pack purchases — there is no auto-renewal, and no recurring charges will be made to your card.\n\nRefunds (see Refund Policy):\n- Credit packs: refundable within 7 days only if zero credits have been used; partially used packs are non-refundable. Purchased credit packs are valid for 3 months from the purchase date.\n- AI readings: non-refundable once generated. Exception: if our system fails to deliver (LLM provider unavailable, generation error, empty or invalid response), the consumed credit is automatically restored to your balance — no support request is needed. For couple readings, both deducted credits are restored when both sides fail.\n- Duplicate charges, unauthorized transactions, and complete service failure follow the Refund Policy exception procedure.\n\nTaxes: you are responsible for any applicable taxes added at checkout.',
    bodyKo:
      '결제: 모든 결제는 Stripe(PCI-DSS 1레벨)를 통해 처리되며, 카드 전체 정보는 저장하지 않습니다.\n\n가격: 가격은 결제 시점에 표시됩니다. 당사는 언제든 가격을 변경할 수 있으며, 변경된 가격은 변경 이후의 구매에만 적용됩니다.\n\n구독 없음: DestinyPal은 정기 구독을 제공하지 않습니다. 모든 결제는 일회성 크레딧 팩 구매이며, 자동 갱신이나 반복 청구가 발생하지 않습니다.\n\n환불(환불 정책 준수):\n- 크레딧 팩: 구매 후 7일 이내이면서 크레딧을 하나도 사용하지 않은 경우에만 환불이 가능합니다. 하나라도 사용한 경우 환불되지 않습니다. 구매한 크레딧 팩은 구매일로부터 3개월간 유효합니다.\n- AI 리딩: 생성된 이후에는 환불되지 않습니다. 예외: 당사 시스템 장애(LLM 공급자 비가용, 생성 오류, 빈/유효하지 않은 응답 등)로 결과를 제공하지 못한 경우 차감된 크레딧이 자동으로 잔액에 복구되며, 별도 문의는 필요하지 않습니다. 커플 리딩에서 양측 모두 실패한 경우에는 차감된 두 개의 크레딧이 모두 복구됩니다.\n- 중복 결제, 무단 결제, 완전한 서비스 실패는 환불 정책의 예외 절차를 따릅니다.\n\n세금: 적용되는 세금은 결제 시점에 부과되며, 납부 책임은 이용자에게 있습니다.',
  },
  {
    id: 'disclaimer',
    title: '8. Disclaimers and Limitation of Liability',
    titleKo: '8. 면책 및 책임 제한',
    body: 'Not Professional Advice: readings are not medical, legal, financial, psychological, or therapeutic advice, nor are they guaranteed predictions.\n\nAI Limits: AI output may contain errors or be inappropriate; no accuracy guarantee is provided.\n\nNo Warranties: the Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind (merchantability, fitness for a particular purpose, non-infringement, uninterrupted or error-free operation, accuracy).\n\nLiability Limit: to the extent allowed by law, our total liability is capped at the greater of (a) what you paid in the last 3 months or (b) USD $100 / KRW 100,000. We are not liable for any indirect, incidental, consequential, punitive, or special damages; lost profits, data, goodwill, or business opportunities; or decisions you make based on the Service.\n\nForce Majeure: we are not liable for events outside our control (disasters, war, pandemics, outages, third-party failures).\n\nSome jurisdictions may not allow certain limits; where prohibited, liability is limited to the maximum extent permitted by law. This clause does not limit statutory consumer rights, including those of Korean consumers under mandatory laws.',
    bodyKo:
      '전문 자문 아님: 리딩은 의료·법률·재무·심리·치료 자문에 해당하지 않으며, 미래에 대한 보장도 제공하지 않습니다.\n\nAI 한계: AI 결과에는 오류나 부적절한 내용이 포함될 수 있으며, 정확성을 보장하지 않습니다.\n\n보증 부인: 서비스는 "있는 그대로(AS IS)" 및 "이용 가능한 범위 내(AS AVAILABLE)"에서 제공되며, 상업성, 특정 목적 적합성, 비침해, 중단 또는 오류 없는 운영, 정확성 등에 대한 어떠한 보증도 제공되지 않습니다.\n\n책임 제한: 법이 허용하는 범위 내에서 당사의 총 책임은 (a) 최근 3개월 동안 귀하가 지불한 금액 또는 (b) 미화 100달러($100) / 한화 10만원(₩100,000) 중 더 큰 금액으로 제한됩니다. 또한 당사는 간접적·우발적·결과적·징벌적·특별 손해, 이익·데이터·영업권·기회 손실, 그리고 서비스 내용에 기반한 의사결정에 대해 책임을 지지 않습니다.\n\n불가항력: 천재지변, 전쟁, 팬데믹, 통신 장애, 제3자 서비스 장애 등 당사의 통제 범위를 벗어난 사유에 대해서는 책임을 지지 않습니다.\n\n일부 지역에서는 위와 같은 제한이 허용되지 않을 수 있으며, 그러한 경우 책임은 법이 허용하는 최대 한도로만 제한됩니다. 본 조항은 대한민국 강행법규에 따른 소비자의 법정 권리(소비자기본법, 약관규제법, 전자상거래법 등)를 제한하지 않습니다.',
  },
  {
    id: 'third-party',
    title: '9. Third-party Services and Integrations',
    titleKo: '9. 제3자 서비스',
    body: 'Integrations include Stripe (payments), Google (OAuth and AdSense), Anthropic (Claude AI for readings), Neon / Vercel Postgres (database), Firebase Storage (image uploads), Sentry (error monitoring), Resend (transactional email), and Vercel (hosting). Each third party’s terms and privacy policy apply; we are not responsible for them.\n\nAds and Analytics: Google AdSense and Analytics load only after consent. You may opt out of personalized ads at https://www.google.com/settings/ads.\n\nTokens: OAuth tokens are revoked after login and are not retained (or are encrypted in transit).\n\nData Sharing: we share only the necessary data with processors as described in the Privacy Policy. We do not sell personal information.\n\nExternal Links: we are not responsible for the content or practices of external sites.',
    bodyKo:
      '연동 대상: Stripe(결제), Google(OAuth 및 AdSense), Anthropic(Claude AI 리딩 생성), Neon / Vercel Postgres(데이터베이스), Firebase Storage(이미지 업로드), Sentry(오류 모니터링), Resend(트랜잭션 이메일), Vercel(호스팅) 등이 포함됩니다. 각 서비스의 약관 및 개인정보처리방침이 적용되며, 당사는 해당 서비스 자체의 내용에 대해서는 책임을 지지 않습니다.\n\n광고 및 분석: Google AdSense와 Analytics는 동의 이후에만 로드되며, 맞춤형 광고는 https://www.google.com/settings/ads 에서 거부할 수 있습니다.\n\n토큰: OAuth 토큰은 로그인 후 폐기되며(또는 전송 시 암호화) 별도로 보관하지 않습니다.\n\n데이터 공유: 개인정보처리방침에 따라 필요한 범위 내에서만 수탁자에게 위탁하거나 공유하며, 개인 정보를 판매하지 않습니다.\n\n외부 링크: 외부 사이트의 콘텐츠 및 정책에 대해서는 책임을 지지 않습니다.',
  },
  {
    id: 'conduct',
    title: '10. User Conduct and Community Guidelines',
    titleKo: '10. 이용자 행동 및 커뮤니티 규칙',
    body: 'Be respectful in any user-facing interactions with the Service. Harassment, hate, discrimination, or bullying directed at staff or other users is prohibited.\nFeedback is welcome and may be used by us without any obligation or compensation.\nIf shared or community features (for example, couple readings or shared session links) are made available, the same rules apply: stay constructive, do not share others’ private information without consent, and follow any displayed guidelines.\nWe may remove content, or suspend or ban users, who violate these Terms or applicable standards.',
    bodyKo:
      '서비스 이용 시 상호 존중을 기반으로 행동해 주셔야 하며, 운영진이나 다른 이용자에 대한 괴롭힘, 증오, 차별, 따돌림은 금지됩니다.\n피드백은 환영하며, 별도의 보상이나 비밀유지 의무 없이 활용될 수 있습니다.\n공유·커뮤니티 기능(예: 커플 리딩, 공유 세션 링크 등)이 제공되는 경우에도 동일한 규칙이 적용됩니다. 건설적으로 참여해 주시고, 타인의 개인정보를 동의 없이 공유하지 않으며, 표시된 가이드라인을 준수해 주세요.\n위반 시 콘텐츠 삭제, 계정 정지 또는 차단 조치가 이루어질 수 있습니다.',
  },
  {
    id: 'privacy',
    title: '11. Privacy and Data Protection',
    titleKo: '11. 개인정보 보호',
    body: 'See our Privacy Policy (https://destinypal.com/policy/privacy) for details on what we collect, how we use and protect your data, your rights and choices, cookies and tracking, international transfers, and advertising practices.\nData Security: we use industry-standard safeguards but cannot guarantee absolute security. You must protect your credentials.\nBreach Notice: we will notify you of data breaches as required by law.',
    bodyKo:
      '수집 항목, 이용 및 보호 방식, 이용자 권리와 선택, 쿠키 및 추적, 국외 이전, 광고 관련 사항은 개인정보처리방침(https://destinypal.com/policy/privacy)을 참고해 주세요.\n보안: 당사는 업계 표준 보안 수단을 적용하고 있으나, 절대적인 보안을 보장할 수는 없습니다. 계정 정보는 이용자가 직접 보호해야 합니다.\n침해 통지: 법령이 요구하는 경우 개인정보 침해 사실을 통지합니다.',
  },
  {
    id: 'termination',
    title: '12. Termination and Account Deletion',
    titleKo: '12. 이용 종료 및 계정 삭제',
    body: `Your Right: you may delete your account at any time via settings or by contacting ${SUPPORT_EMAIL}.\nEffect: any unused credits are forfeited upon deletion and no refund is issued for them. Some data may be retained if required by law.\nOur Right: we may suspend or terminate your account immediately in cases of violations, fraud or abuse, legal requirements, or service discontinuation.\nNotice: we will try to provide notice when feasible. Immediate termination may occur for serious issues.\nSurvival: intellectual property, disclaimers, liability limits, and dispute resolution provisions survive termination.`,
    bodyKo: `사용자 권리: 설정에서 직접 삭제하거나 ${SUPPORT_EMAIL}로 요청하여 언제든 계정을 삭제할 수 있습니다.\n효과: 계정 삭제 시 미사용 크레딧은 소멸되며, 해당 크레딧에 대해서는 환불이 제공되지 않습니다. 법적 보존 의무가 있는 정보는 유지될 수 있습니다.\n당사 권리: 약관 위반, 사기 또는 남용, 법적 요구, 서비스 중단 등의 경우 당사는 계정을 즉시 정지하거나 해지할 수 있습니다.\n통지: 가능한 경우 사전에 통지하나, 중대한 사유가 있는 경우에는 즉시 해지될 수 있습니다.\n존속: 지식재산권, 면책, 책임 제한, 분쟁 해결 조항은 계약 종료 후에도 유효합니다.`,
  },
  {
    id: 'changes',
    title: '13. Modifications to Terms and Service',
    titleKo: '13. 약관 및 서비스 변경',
    body: 'We may modify these Terms at any time. The changes take effect immediately for new users, and after notice for existing users (7 days for minor changes, 30 days for material changes). Continued use after the effective date constitutes acceptance. If you disagree, please stop using the Service.\nWe may add, modify, or discontinue features, change pricing for new purchases, suspend the Service for maintenance, or discontinue the entire Service with at least 60 days’ prior notice. We are not obliged to maintain any specific feature.\nService Shutdown — Unused Credits: if we permanently discontinue the Service, unused (non-expired) credits in your balance as of the announced shutdown date will be refunded on a pro-rata basis to the original payment method (less non-recoverable payment-processor fees), or you may use them up to the shutdown date. Expired credits are not refunded.',
    bodyKo:
      '본 약관은 언제든 변경될 수 있습니다. 신규 이용자에게는 즉시 효력이 발생하며, 기존 이용자에게는 사소한 변경의 경우 7일, 중대한 변경의 경우 30일의 사전 통지 후 효력이 발생합니다. 시행일 이후에도 계속 이용하시는 경우 변경에 동의하신 것으로 간주됩니다. 동의하지 않으시는 경우 서비스 이용을 중단해 주셔야 합니다.\n당사는 기능을 추가·변경·중단하거나, 신규 구매에 대한 가격을 변경하거나, 점검을 위해 일시적으로 중단할 수 있으며, 60일 이상의 사전 통지를 거쳐 서비스 전체를 종료할 수도 있습니다. 또한 특정 기능을 계속 유지할 의무는 없습니다.\n서비스 영구 종료 시 미사용 크레딧 처리: 서비스가 영구 종료될 경우, 공지된 종료일 기준의 잔여 미사용(미만료) 크레딧은 원결제 수단으로 비례 환불됩니다(복구 불가능한 결제수수료는 차감). 또는 종료일까지 해당 크레딧을 사용할 수 있도록 안내드립니다. 이미 만료된 크레딧은 환불 대상이 아닙니다.',
  },
  {
    id: 'dispute',
    title: '14. Dispute Resolution and Governing Law',
    titleKo: '14. 분쟁 해결 및 준거법',
    body: `Governing Law: Laws of the Republic of Korea.\nVenue: Seoul Central District Court, unless mandatory consumer-protection laws require otherwise.\nInformal Resolution: Contact ${SUPPORT_EMAIL} first for good-faith resolution.\nClass Action Waiver: Where permitted by applicable law, disputes must be brought individually. This waiver does NOT apply to Korean consumers — Korean consumers retain the right to use consumer collective dispute resolution (소비자단체소송, 집단분쟁조정) and any other class/representative remedies provided by the Consumer Framework Act, the Act on the Regulation of Terms and Conditions, and other mandatory laws.\nKorean Consumers: You may use the Korea Consumer Agency (1372, kca.go.kr), the Consumer Dispute Mediation Committee (ccn.go.kr), or the Korea Fair Trade Commission (ftc.go.kr) as alternative dispute channels.\nConsumer Rights: Statutory consumer rights remain unaffected; EU consumers may sue in their country of residence where applicable.`,
    bodyKo: `준거법: 대한민국 법.\n관할: 강행 소비자보호법이 달리 정하지 않는 한 서울중앙지방법원 전속 관할.\n비공식 해결: 먼저 ${SUPPORT_EMAIL}로 연락해 선의로 해결을 시도합니다.\n집단소송 관련: 적용 법이 허용하는 범위에서 분쟁은 개별적으로 제기되어야 합니다. 다만 대한민국 소비자에게는 본 조항이 적용되지 않으며, 한국 소비자는 소비자기본법·약관규제법·기타 강행법규가 보장하는 소비자단체소송, 집단분쟁조정 등 모든 단체/대표 구제수단을 그대로 행사할 수 있습니다.\n대한민국 소비자 분쟁 채널: 한국소비자원 1372 (kca.go.kr), 소비자분쟁조정위원회 (ccn.go.kr), 공정거래위원회 (ftc.go.kr)를 이용할 수 있습니다.\n소비자 권리: 법정 소비자 권리는 그대로 보존되며, EU 소비자는 거주국에서 제기할 수 있습니다.`,
  },
  {
    id: 'indemnification',
    title: '15. Indemnification',
    titleKo: '15. 면책 보상',
    body: 'You will indemnify, defend, and hold harmless DestinyPal, Paul Rhee, and our affiliates, staff, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use or misuse of the Service, your violations of these Terms, your violations of third-party rights, your User Content, or any decisions you make based on readings. We may assume exclusive defense at your expense.',
    bodyKo:
      '귀하는 서비스의 이용 또는 오용, 약관 위반, 제3자 권리 침해, 사용자 콘텐츠, 리딩에 기반한 의사결정으로 인해 발생하는 청구, 손해, 책임, 비용(법률비용 포함)에 대하여 DestinyPal, Paul Rhee 및 그 임직원·대리인을 면책·방어·보상해야 합니다. 당사는 귀하의 비용으로 단독 방어를 선택할 수 있습니다.',
  },
  {
    id: 'misc',
    title: '16. Miscellaneous Provisions',
    titleKo: '16. 기타',
    body: `Entire Agreement: These Terms, Privacy Policy, and Refund Policy form the entire agreement.\nSeverability: Invalid provisions do not affect the remainder.\nWaiver: Rights not enforced are not waived.\nAssignment: You may not assign; we may assign with reasonable advance notice (or immediately if required by law or a corporate change).\nNo Agency: No partnership/joint venture/employment/agency is created.\nLanguage: The Terms are provided in multiple languages. Each user is bound by the language version displayed at the time of acceptance. For Korean consumers, the Korean version prevails in case of conflict; for users in other regions, the version the user accepted prevails, with the English version as a tie-breaker only where no acceptance-language record exists.\nHeadings: For convenience only.\nContact: ${SUPPORT_EMAIL}`,
    bodyKo: `전체 합의: 본 약관, 개인정보처리방침, 환불정책이 전체 합의를 이룹니다.\n분리가능성: 일부 조항이 무효라도 나머지는 유효합니다.\n권리 불행사: 권리 미행사는 포기로 간주되지 않습니다.\n양도: 귀하는 양도할 수 없으며, 당사는 합리적인 사전 통지 후(법령상 요구 또는 회사 구조 변경 시 즉시) 권리·의무를 양도할 수 있습니다.\n대리 관계 부인: 본 약관은 파트너십·조인트벤처·고용·대리 관계를 만들지 않습니다.\n언어: 본 약관은 다국어로 제공됩니다. 각 이용자는 본인이 동의한 시점에 표시된 언어본의 적용을 받습니다. 대한민국 소비자에 대해서는 한국어본이 우선하며, 그 외 지역 이용자는 본인이 동의한 언어본이 우선하고, 동의 언어 기록이 없는 경우에 한해 영어본을 기준으로 합니다.\n표제: 이해를 돕기 위한 것이며 해석에 영향이 없습니다.\n문의: ${SUPPORT_EMAIL}`,
  },
  {
    id: 'contact',
    title: '17. Contact Information',
    titleKo: '17. 연락처',
    body: `Business Operator Information (Korean E-Commerce Act §13)\n- Operator / Representative: ${OPERATOR}\n- Business registration number: registration in progress — to be posted here once issued\n- Mail-order business registration: registration in progress — to be posted here once issued\n- Business address: available on request to legal authorities or for substantive purchase disputes\n- Hosting service provider: Vercel Inc.\n- Email: ${SUPPORT_EMAIL}\n- Website: https://destinypal.com\n\nFor inquiries:\n- Terms: ${SUPPORT_EMAIL}\n- Privacy: ${SUPPORT_EMAIL}\n- Billing/Refund: ${SUPPORT_EMAIL}\n- Technical support: ${SUPPORT_EMAIL}\n- Abuse report: ${SUPPORT_EMAIL}\n\nResponse: within 2 business days.\nLast Updated: ${EFFECTIVE_DATE}\n\nBy using DestinyPal, you confirm you have read and agree to these Terms.`,
    bodyKo: `사업자 정보 (전자상거래법 제13조)\n- 운영자 / 대표자: ${OPERATOR}\n- 사업자등록번호: 등록 진행 중 — 발급 후 본 약관에 게시\n- 통신판매업 신고번호: 등록 진행 중 — 발급 후 본 약관에 게시\n- 사업장 주소: 법적 분쟁 시 권한 있는 기관 및 실질적 결제 분쟁 사용자에게 요청에 따라 제공\n- 호스팅 서비스 제공자: Vercel Inc.\n- 이메일: ${SUPPORT_EMAIL}\n- 웹사이트: https://destinypal.com\n\n문의처:\n- 이용약관: ${SUPPORT_EMAIL}\n- 개인정보: ${SUPPORT_EMAIL}\n- 결제/환불: ${SUPPORT_EMAIL}\n- 기술 지원: ${SUPPORT_EMAIL}\n- 악용 신고: ${SUPPORT_EMAIL}\n\n응답: 영업일 기준 2일 내 회신\n최종 업데이트: ${EFFECTIVE_DATE}\n\n서비스 이용 시 본 약관을 읽고 동의한 것으로 간주됩니다.`,
  },
]

export default function TermsPage() {
  return (
    <PolicyDocument
      titleKey="policy.terms.title"
      titleFallbackEn="Terms of Service"
      titleFallbackKo="이용약관"
      effectiveKey="policy.terms.effective"
      effectiveDate={EFFECTIVE_DATE}
      footerKey="policy.terms.footer"
      contactEmail={SUPPORT_EMAIL}
      sections={sections}
    />
  )
}
