"use client";

import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "../policy.module.css";

type Section = { title: string; titleKo: string; body: string; bodyKo: string };

const CONTACT_EMAIL = "rheeco88@gmail.com";
const OPERATOR = "Operator: Paul Rhee (individual)";
const EFFECTIVE_DATE = "2026-01-25";

const sections: Section[] = [
  {
    title: "1. Agreement to Terms",
    titleKo: "1. 이용약관 동의",
    body: `Welcome to DestinyPal. These Terms of Service ("Terms") are a legally binding agreement between you ("User", "you") and Paul Rhee (individual) ("DestinyPal", "we") that governs your access to and use of our website, mobile apps, and services (the "Service").\n\nBy accessing or using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.\n\nService Operator: Paul Rhee (individual)\nEmail: ${CONTACT_EMAIL}\nEffective Date: ${EFFECTIVE_DATE}`,
    bodyKo: `DestinyPal에 오신 것을 환영합니다. 본 이용약관("약관")은 사용자(“귀하”)와 Paul Rhee(개인)(“DestinyPal”, “당사”) 간의 법적 계약으로, 당사 웹사이트·모바일 앱·서비스(“서비스”) 이용을 규율합니다.\n\n서비스 이용 시 본 약관과 개인정보처리방침에 동의하는 것으로 간주되며, 동의하지 않는 경우 서비스를 이용할 수 없습니다.\n\n서비스 운영자: Paul Rhee (individual)\n이메일: ${CONTACT_EMAIL}\n시행일: ${EFFECTIVE_DATE}`,
  },
  {
    title: "2. Definitions",
    titleKo: "2. 용어 정의",
    body: `'Service': the DestinyPal platform (web, mobile, features, content, and services)\n'User'/'Member': anyone who creates an account or uses the Service\n'Content': information, data, text, software, media, readings, interpretations, or other materials\n'User Content': Content you submit/upload/transmit via the Service\n'Paid Services': premium features, subscriptions, individual readings, or other paid items\n'Account': your registered user account on the Service`,
    bodyKo: `'서비스': DestinyPal 플랫폼(웹, 모바일, 기능, 콘텐츠, 제공 서비스 포함)\n'사용자/회원': 계정을 만들거나 서비스를 이용하는 모든 개인\n'콘텐츠': 정보, 데이터, 텍스트, 소프트웨어, 이미지/음원/영상, 리딩, 해석 등 모든 자료\n'사용자 콘텐츠': 서비스에 귀하가 제출·업로드·전송하는 콘텐츠\n'유료 서비스': 프리미엄 기능, 구독, 개별 리딩 등 결제가 필요한 항목\n'계정': 서비스에 등록된 귀하의 사용자 계정`,
  },
  {
    title: "3. Eligibility and Account Registration",
    titleKo: "3. 자격 요건 및 계정 생성",
    body: "Age: You must be 14+ (16 in EU or local age of consent). If under 18, you confirm parental/guardian consent.\n\nAccount Creation: Provide accurate, current, complete info (email, password, display name; optional birth info for personalized readings).\n\nSecurity: You are responsible for credential confidentiality, all activity on your account, prompt notice of unauthorized use, and not sharing accounts.\n\nAccuracy: Provide truthful info and keep it updated. We may suspend/terminate inaccurate or misleading accounts.\n\n3rd-party Auth: You may register with Google OAuth or other providers; their terms and privacy apply.",
    bodyKo: "연령: 만 14세 이상(유럽은 만 16세 이상 또는 현지 동의 연령). 18세 미만은 보호자 동의를 확인해야 합니다.\n\n계정 생성: 정확·최신·완전한 정보를 제공해야 합니다(이메일, 비밀번호, 표시 이름, 맞춤 리딩용 선택적 출생 정보 등).\n\n보안: 로그인 정보 보호, 계정 내 모든 활동, 무단 사용 즉시 통지, 계정 공유 금지 책임이 귀하에게 있습니다.\n\n정확성: 사실 정보를 제공하고 필요 시 업데이트해야 합니다. 허위·오해소지가 있는 계정은 중단/해지될 수 있습니다.\n\n제3자 인증: Google OAuth 등으로 가입 가능하며, 해당 서비스의 약관·개인정보정책이 적용됩니다.",
  },
  {
    title: "4. Description of Service",
    titleKo: "4. 서비스 설명",
    body: "DestinyPal offers AI-powered divination/self-reflection services:\n- Astrology: birth charts, transits, compatibility\n- Saju (Four Pillars)\n- Tarot\n- Destiny Map (multi-system fusion)\n- Dream interpretation\n- Numerology\n- Compatibility analysis\n- I Ching\n- Life Prediction\n- Personality analysis\n- ICP (Personality Type)\n- Past Life analysis\n- AI Premium Reports\n- Destiny Calendar\n\nNature of Service: Readings are AI-assisted, for entertainment/self-reflection/personal growth; not professional advice. Accuracy depends on the info you provide.",
    bodyKo: "DestinyPal은 AI 기반 운세/자기 성찰 서비스를 제공합니다:\n- 서양 점성술: 출생 차트, 행성 이동, 궁합 등\n- 사주(명리)\n- 타로\n- Destiny Map(다중 시스템 통합)\n- 꿈 해몽\n- 수비학\n- 궁합/호환성 분석\n- 주역 해석\n- 운세 예측\n- 성격 분석\n- ICP (성격 유형)\n- 전생 분석\n- AI 프리미엄 리포트\n- 운세 달력\n\n서비스 성격: AI가 보조하며 오락·자기 성찰·개인 성장 목적입니다. 의료·법률·재무·심리 상담이 아니며, 정확도는 입력 정보에 좌우됩니다.",
  },
  {
    title: "5. Acceptable Use Policy",
    titleKo: "5. 이용 제한",
    body: "Do NOT: break laws; infringe IP; harass/abuse; impersonate; run bots/scrapers without permission; gain unauthorized access; disrupt the Service; upload malware; collect data without consent; reverse engineer; use commercially without authorization; share/resell readings; bypass paywalls/rate limits.\nContent: no illegal, defamatory, obscene, hateful, violent, or discriminatory material; no spam.\nViolations may lead to suspension/termination and legal action.",
    bodyKo: "다음 행위는 금지됩니다: 법령 위반, 지식재산권 침해, 괴롭힘/남용, 사칭, 무단 봇·크롤러 사용, 무단 접근 시도, 서비스 방해, 악성코드 업로드, 동의 없는 정보 수집, 역설계/분해, 무단 상업 이용, 리딩 공유·재판매, 유료 장벽·속도 제한 우회.\n콘텐츠 제한: 불법/비방/음란/증오/폭력/차별/스팸 금지.\n위반 시 계정 정지·해지 및 법적 조치가 가능합니다.",
  },
  {
    title: "6. Intellectual Property Rights",
    titleKo: "6. 지식재산권",
    body: "DestinyPal Content: software, algorithms/AI models, design/graphics/logos, templates/interpretation frameworks, educational content, UI/UX are owned by DestinyPal or licensors and protected by IP laws.\n\nProprietary Tech - Destiny Fusion Matrix™: multi-layer cross-reference system (1,206 cells, scoring/weights, fusion methods, data structures). Reverse engineering or extraction is strictly prohibited.\n\nUser Content License: You grant us a worldwide, non-exclusive, royalty-free, perpetual license to use/display/distribute/modify/adapt your User Content, create derivatives, improve services/AI, and use anonymized data for analytics/research. You retain ownership and warrant you have rights to grant this license.\n\nReading Results: for your personal, non-commercial use; do not redistribute/resell/publicly share without permission.\n\nTrademarks: “DestinyPal”, “Destiny Fusion Matrix”, and related marks belong to Paul Rhee; prior written consent required for use.",
    bodyKo: "DestinyPal 콘텐츠(소프트웨어, 알고리즘/AI 모델, 디자인·그래픽·로고, 리딩 템플릿·해석 프레임워크, 교육 자료, UI/UX 등)는 당사 또는 라이선스 보유자의 자산이며 관련 법으로 보호됩니다.\n\n독점 기술 - Destiny Fusion Matrix™: 1,206개 상호작용 셀, 점수/가중치, 융합 해석 방법론, 데이터 구조를 포함한 다층 교차참조 시스템입니다. 역설계·분석·추출·재현은 금지됩니다.\n\n사용자 콘텐츠 라이선스: 귀하는 제출한 사용자 콘텐츠에 대해 전 세계적·비독점적·로열티 없는 영구 라이선스를 당사에 부여하며, 당사는 이용/전시/배포/수정/적용, 서비스 개선 및 AI 학습, 익명화 데이터 분석·연구에 활용할 수 있습니다. 소유권은 귀하에게 있으며, 권한 보유를 보증합니다.\n\n리딩 결과: 개인적·비상업적 용도로만 제공되며, 허가 없이 재배포/판매/공개 공유할 수 없습니다.\n\n상표: “DestinyPal”, “Destiny Fusion Matrix” 및 관련 로고는 Paul Rhee의 상표이며, 사용에는 사전 서면 동의가 필요합니다.",
  },
  {
    title: "7. Paid Services and Billing",
    titleKo: "7. 유료 서비스 및 결제",
    body: "Payment Processing: All payments are handled via Stripe (PCI-DSS Level 1). We do not store full card numbers.\n\nPricing: Displayed at checkout; may change with 30 days’ notice to existing subscribers.\n\nSubscriptions: Monthly/annual plans auto-renew until canceled. Cancel at least 24 hours before renewal in account settings.\n\nRefunds (see Refund Policy):\n- Credit packs: refundable within 7 days only if 0 credits used; partially used packs are non-refundable.\n- Subscriptions: first-time subscribers have a 7-day guarantee (used monthly credits deducted at Mini-pack rate); renewals are non-refundable.\n- AI readings: non-refundable once generated.\n- Duplicates/unauthorized/complete service failure follow Refund Policy exceptions.\n\nFree Trials: Trials auto-convert unless canceled before expiry.\n\nPayment Failures: Failed renewals may suspend access; repeated failures may cancel the account.\n\nTaxes: You are responsible for applicable taxes added at checkout.",
    bodyKo: "결제: 모든 결제는 Stripe(PCI-DSS 1레벨)로 처리되며, 카드 전체 정보는 저장하지 않습니다.\n\n가격: 결제 시 표시되며 기존 구독자는 30일 전에 변경을 안내할 수 있습니다.\n\n구독: 월간/연간 구독은 해지 전까지 자동 갱신되며, 갱신 24시간 전까지 계정 설정에서 취소해야 합니다.\n\n환불(환불 정책 준수):\n- 크레딧 팩: 구매 후 7일 이내, 0크레딧 사용 시에만 환불 가능. 일부라도 사용하면 환불 불가.\n- 구독: 최초 가입자에게 7일 보장(사용한 월간 크레딧은 Mini 팩 단가로 차감). 갱신분은 환불되지 않습니다.\n- AI 리딩: 생성 즉시 환불 불가.\n- 중복 결제/무단 결제/완전한 서비스 실패는 환불 정책 예외 절차를 따릅니다.\n\n무료 체험: 기간 만료 전 취소하지 않으면 자동 유료 전환됩니다.\n\n결제 실패: 갱신 실패 시 유료 기능이 중단될 수 있으며, 반복 실패 시 계정이 취소될 수 있습니다.\n\n세금: 적용 세금은 결제 시 부과되며, 납부 책임은 사용자에게 있습니다.",
  },
  {
    title: "8. Disclaimers and Limitation of Liability",
    titleKo: "8. 면책 및 책임 제한",
    body: "Not Professional Advice: Readings are not medical, legal, financial, psychological, or therapeutic advice, nor guaranteed predictions.\n\nAI Limits: AI output may contain errors or be inappropriate; no accuracy guarantee.\n\nNo Warranties: Service is provided “AS IS”/“AS AVAILABLE” without warranties (merchantability, fitness, non-infringement, uninterrupted/error-free, accuracy).\n\nLiability Limit: To the extent allowed by law, our total liability is capped at the greater of what you paid in the last 3 months or $100; no indirect/incidental/consequential/punitive/special damages; no liability for lost profits/data/goodwill/opportunities or decisions you make based on the Service.\n\nForce Majeure: Not liable for events outside our control (disasters, war, pandemics, outages, third-party failures).\n\nSome jurisdictions may not allow certain limits; where prohibited, liability is limited to the maximum extent permitted.",
    bodyKo: "전문 자문 아님: 리딩은 의료·법률·재무·심리·치료 자문이나 미래 보장을 제공하지 않습니다.\n\nAI 한계: AI 결과는 오류나 부적절한 내용이 있을 수 있으며 정확성을 보장하지 않습니다.\n\n보증 부인: 서비스는 “있는 그대로” 및 “제공 가능한 범위”로 제공되며, 상업성·특정 목적 적합성·비침해·중단/오류 없음·정확성 등에 대한 보증이 없습니다.\n\n책임 제한: 법이 허용하는 범위 내에서 최근 3개월 동안 귀하가 지불한 금액 또는 $100 중 더 큰 금액으로 총 책임이 제한되며, 간접·우발·결과·징벌·특수 손해, 이익/데이터/영업 기회 손실, 서비스 내용을 기반으로 한 결정에 대한 책임을 지지 않습니다.\n\n불가항력: 천재지변, 전쟁, 팬데믹, 통신 장애, 제3자 서비스 장애 등 당사 통제 밖의 사유에 대해서는 책임을 지지 않습니다.\n\n일부 지역에서는 제한이 허용되지 않을 수 있으며, 그 경우 법이 허용하는 최대 한도로만 책임이 제한됩니다.",
  },
  {
    title: "9. Third-party Services and Integrations",
    titleKo: "9. 제3자 서비스",
    body: "Integrations include Stripe (payments), Google (OAuth/AdSense), OpenAI (readings), Supabase (backend). Third-party terms/privacy apply; we are not responsible for them.\n\nAds/Analytics: Google AdSense/Analytics load only after consent; you may opt out of personalized ads at https://www.google.com/settings/ads.\n\nTokens: OAuth tokens are revoked after login and not retained (or are encrypted in transit).\n\nData Sharing: We share necessary data with processors as in the Privacy Policy; we do not sell personal info.\n\nExternal Links: We are not responsible for external sites’ content or practices.",
    bodyKo: "연동 대상: Stripe(결제), Google(OAuth/AdSense), OpenAI(리딩 생성), Supabase(백엔드) 등. 각 서비스의 약관·개인정보정책이 적용되며, 해당 서비스 내용에 대한 책임은 지지 않습니다.\n\n광고/분석: Google AdSense·Analytics는 동의 후에만 로드되며, 맞춤형 광고는 https://www.google.com/settings/ads 에서 거부할 수 있습니다.\n\n토큰: OAuth 토큰은 로그인 후 폐기되며(또는 전송 시 암호화) 보관하지 않습니다.\n\n데이터 공유: 개인정보처리방침에 따라 필요한 범위 내에서만 위탁/공유하며, 개인 정보를 판매하지 않습니다.\n\n외부 링크: 외부 사이트의 콘텐츠·정책에 대해 책임지지 않습니다.",
  },
  {
    title: "10. User Conduct and Community Guidelines",
    titleKo: "10. 이용자 행동 및 커뮤니티 규칙",
    body: "Be respectful; no harassment/hate/discrimination/bullying.\nIf using community features: stay relevant/constructive, do not share others’ private info, report issues, follow moderators.\nFeedback is welcome and may be used without obligation/compensation.\nWe may remove content or suspend/ban users who violate these Terms or standards.",
    bodyKo: "존중을 기반으로 이용해야 하며, 괴롭힘·증오·차별·따돌림을 금지합니다.\n커뮤니티 기능 사용 시: 주제에 맞게 건설적으로 참여하고, 타인의 개인정보를 공유하지 말며, 부적절한 내용은 신고하고 운영자 지침을 따르십시오.\n피드백은 환영하며 보상·비밀유지 의무 없이 활용될 수 있습니다.\n위반 시 콘텐츠 삭제, 계정 정지·차단이 이루어질 수 있습니다.",
  },
  {
    title: "11. Privacy and Data Protection",
    titleKo: "11. 개인정보 보호",
    body: "See our Privacy Policy (https://destinypal.com/policy/privacy) for what we collect, how we use/protect data, your rights/choices, cookies/tracking, international transfers, and advertising practices.\nData Security: We use industry-standard safeguards but cannot guarantee absolute security. You must protect your credentials.\nBreach Notice: We will notify you of data breaches as required by law.",
    bodyKo: "수집 항목, 이용/보호 방식, 이용자 권리와 선택, 쿠키/추적, 국외 이전, 광고 관련 사항은 개인정보처리방침(https://destinypal.com/policy/privacy)을 참고하세요.\n보안: 업계 표준 보안 수단을 적용하지만 절대적 보안을 보장할 수 없습니다. 계정 정보는 직접 보호해야 합니다.\n침해 통지: 법령이 요구하는 경우 개인정보 침해 사실을 통지합니다.",
  },
  {
    title: "12. Termination and Account Deletion",
    titleKo: "12. 이용 종료 및 계정 삭제",
    body: `Your Right: Delete your account anytime via settings or by contacting ${CONTACT_EMAIL}.\nEffect: Paid access ends immediately; no refunds for the current billing period; some data may be retained if required by law.\nOur Right: We may suspend/terminate immediately for violations, fraud/abuse, legal requirements, or service discontinuation.\nNotice: We will try to give notice when feasible; immediate termination may occur for serious issues.\nSurvival: IP, disclaimers, liability limits, and dispute resolution survive termination.`,
    bodyKo: `사용자 권리: 설정 또는 ${CONTACT_EMAIL}로 요청해 언제든 계정을 삭제할 수 있습니다.\n효과: 유료 이용은 즉시 종료되며, 현재 청구 기간에 대한 환불은 없습니다. 법적 보존 의무가 있는 정보는 유지될 수 있습니다.\n당사 권리: 약관 위반, 사기/남용, 법적 요구, 서비스 중단 시 즉시 정지·해지할 수 있습니다.\n통지: 가능하면 사전 통지하나, 중대한 위반 시 즉시 해지될 수 있습니다.\n존속: 지식재산, 면책, 책임 제한, 분쟁 해결 조항은 종료 후에도 유효합니다.`,
  },
  {
    title: "13. Modifications to Terms and Service",
    titleKo: "13. 약관 및 서비스 변경",
    body: "We may modify Terms at any time. Effective: immediately for new users; after notice for existing users (7 days minor, 30 days material). Continued use after effective date = acceptance. If you disagree, stop using the Service.\nWe may add/modify/discontinue features, change pricing for new purchases, suspend for maintenance, or discontinue service with 60 days’ notice. We are not obliged to maintain specific features.",
    bodyKo: "약관은 언제든 변경될 수 있습니다. 신규 이용자에게는 즉시, 기존 이용자에게는 사소 변경 7일/중대한 변경 30일 사전 통지 후 효력이 발생합니다. 시행 이후 계속 이용하면 변경에 동의한 것으로 간주됩니다. 동의하지 않으면 이용을 중단해야 합니다.\n당사는 기능 추가·변경·중단, 신규 구매 가격 변경, 점검을 위한 일시 중단, 60일 사전 통지 후 서비스 종료를 할 수 있으며, 특정 기능을 유지할 의무는 없습니다.",
  },
  {
    title: "14. Dispute Resolution and Governing Law",
    titleKo: "14. 분쟁 해결 및 준거법",
    body: `Governing Law: Laws of the Republic of Korea.\nVenue: Seoul Central District Court, unless mandatory consumer laws require otherwise.\nInformal Resolution: Contact ${CONTACT_EMAIL} first for good-faith resolution.\nClass Action Waiver: Disputes must be brought individually where permitted by law.\nConsumer Rights: Statutory consumer rights remain; EU consumers may sue in their country of residence where applicable.`,
    bodyKo: `준거법: 대한민국 법.\n관할: 소비자 보호법이 달리 정하지 않는 한 서울중앙지방법원 전속 관할.\n비공식 해결: 먼저 ${CONTACT_EMAIL}로 연락해 선의로 해결을 시도합니다.\n집단소송 포기: 법이 허용하는 범위에서 개별적으로 제기해야 하며 집단/대표 소송은 허용되지 않습니다.\n소비자 권리: 법정 소비자 권리는 그대로 보존되며, EU 소비자는 거주국에서 제기할 수 있습니다.`,
  },
  {
    title: "15. Indemnification",
    titleKo: "15. 면책 보상",
    body: "You will indemnify/defend/hold harmless DestinyPal, Paul Rhee, and affiliates/staff/agents from claims, damages, losses, liabilities, and expenses (including legal fees) arising from your Service use/misuse, Terms violations, third-party rights violations, User Content, or decisions based on readings. We may assume exclusive defense at your expense.",
    bodyKo: "귀하는 서비스 이용/오용, 약관 위반, 제3자 권리 침해, 사용자 콘텐츠, 리딩 기반 의사결정으로 발생하는 청구·손해·책임·비용(법률비용 포함)에 대해 DestinyPal, Paul Rhee 및 임직원/대리인을 면책·방어·보상해야 합니다. 당사는 귀하 비용으로 단독 방어를 선택할 수 있습니다.",
  },
  {
    title: "16. Miscellaneous Provisions",
    titleKo: "16. 기타",
    body: `Entire Agreement: These Terms, Privacy Policy, and Refund Policy form the entire agreement.\nSeverability: Invalid provisions do not affect the remainder.\nWaiver: Rights not enforced are not waived.\nAssignment: You may not assign; we may assign without notice.\nNo Agency: No partnership/joint venture/employment/agency is created.\nLanguage: Provided in multiple languages; English prevails if conflicts arise.\nHeadings: For convenience only.\nContact: ${CONTACT_EMAIL}`,
    bodyKo: `전체 합의: 본 약관, 개인정보처리방침, 환불정책이 전체 합의를 이룹니다.\n분리가능성: 일부 조항이 무효라도 나머지는 유효합니다.\n권리 불행사: 권리 미행사는 포기로 간주되지 않습니다.\n양도: 귀하는 양도할 수 없으며, 당사는 통지 없이 권리·의무를 양도할 수 있습니다.\n대리 관계 부인: 본 약관은 파트너십·조인트벤처·고용·대리 관계를 만들지 않습니다.\n언어: 편의를 위해 다국어로 제공되며, 충돌 시 영어본이 우선합니다.\n표제: 이해를 돕기 위한 것이며 해석에 영향이 없습니다.\n문의: ${CONTACT_EMAIL}`,
  },
  {
    title: "17. Contact Information",
    titleKo: "17. 연락처",
    body: `Service Operator: ${OPERATOR}\nEmail: ${CONTACT_EMAIL}\nWebsite: https://destinypal.com\n\nFor inquiries:\n- Terms: ${CONTACT_EMAIL}\n- Privacy: ${CONTACT_EMAIL}\n- Billing/Refund: ${CONTACT_EMAIL}\n- Technical support: ${CONTACT_EMAIL}\n- Abuse report: ${CONTACT_EMAIL}\n\nResponse: within 48 business hours.\nMailing address: available on request for legal purposes.\nLast Updated: ${EFFECTIVE_DATE}\n\nBy using DestinyPal, you confirm you have read and agree to these Terms.`,
    bodyKo: `서비스 운영자: ${OPERATOR}\n이메일: ${CONTACT_EMAIL}\n웹사이트: https://destinypal.com\n\n문의처:\n- 이용약관: ${CONTACT_EMAIL}\n- 개인정보: ${CONTACT_EMAIL}\n- 결제/환불: ${CONTACT_EMAIL}\n- 기술 지원: ${CONTACT_EMAIL}\n- 악용 신고: ${CONTACT_EMAIL}\n\n응답: 영업일 기준 48시간 내 회신\n우편 주소: 법적 필요 시 요청에 따라 제공\n최종 업데이트: ${EFFECTIVE_DATE}\n\n서비스 이용 시 본 약관을 읽고 동의한 것으로 간주됩니다.`,
  },
];

function SectionView({ s, isKo }: { s: Section; isKo: boolean }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{isKo ? s.titleKo : s.title}</h2>
      <pre className={styles.sectionBody}>{isKo ? s.bodyKo : s.body}</pre>
    </section>
  );
}

export default function TermsPage() {
  const { t, locale } = useI18n();
  const isKo = locale === "ko";

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t("policy.terms.title", "Terms of Service")}</h1>
            <p className={styles.effectiveDate}>
              {t("policy.terms.effective", "Effective date")}: {EFFECTIVE_DATE}
            </p>
          </div>
          <div className={styles.content}>
            {sections.map((s: Section, i: number) => (
              <SectionView key={`${s.title}-${i}`} s={s} isKo={isKo} />
            ))}
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {t("policy.terms.footer", "Addendum")}: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>
      </div>
      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </div>
  );
}
