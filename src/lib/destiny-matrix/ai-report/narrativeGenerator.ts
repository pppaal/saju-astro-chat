import type { MatrixCalculationInput } from '../types'
import type { AIPremiumReport } from './reportTypes'
import type {
  NormalizedSignal,
  SignalDomain,
  SignalSynthesisResult,
  SynthesizedClaim,
} from './signalSynthesizer'

interface NarrativeInput {
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  synthesis: SignalSynthesisResult
}

const SECTION_DOMAINS: Record<keyof AIPremiumReport['sections'], SignalDomain[]> = {
  introduction: ['personality', 'timing'],
  personalityDeep: ['personality'],
  careerPath: ['career', 'wealth'],
  relationshipDynamics: ['relationship'],
  wealthPotential: ['wealth', 'career'],
  healthGuidance: ['health'],
  lifeMission: ['spirituality', 'personality'],
  timingAdvice: ['timing', 'career', 'relationship'],
  actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
  conclusion: ['personality', 'timing'],
}

const SECTION_TITLE_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: 'í•µì‹¬ íë¦„',
  personalityDeep: 'ì„±í–¥ ì‹¬ì¸µ',
  careerPath: 'ì»¤ë¦¬ì–´',
  relationshipDynamics: 'ê´€ê³„',
  wealthPotential: 'ìž¬ì •',
  healthGuidance: 'ê±´ê°•',
  lifeMission: 'ìž¥ê¸° ë°©í–¥',
  timingAdvice: 'ì‹œê¸° ì „ëžµ',
  actionPlan: 'ì‹¤í–‰ ê³„íš',
  conclusion: 'ë§ˆë¬´ë¦¬',
}

const SECTION_LEAD_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: 'ì§€ê¸ˆ êµ¬ê°„ì˜ í•µì‹¬ì€',
  personalityDeep: 'ë‹¹ì‹ ì˜ ê¸°ë³¸ íŒ¨í„´ì€',
  careerPath: 'ì»¤ë¦¬ì–´ì—ì„œëŠ”',
  relationshipDynamics: 'ê´€ê³„ì—ì„œëŠ”',
  wealthPotential: 'ìž¬ì • ìš´ì˜ì—ì„œëŠ”',
  healthGuidance: 'ê±´ê°• ë¦¬ë“¬ì€',
  lifeMission: 'ìž¥ê¸° ë°©í–¥ì—ì„œëŠ”',
  timingAdvice: 'íƒ€ì´ë° ê´€ì ì—ì„œëŠ”',
  actionPlan: 'ì‹¤í–‰ ì„¤ê³„ì—ì„œëŠ”',
  conclusion: 'ìµœì¢… ìš”ì•½ì€',
}

const SECTION_SUPPORT_PREFIX_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: 'ë³´ì™„ ê´€ì ì—ì„œëŠ”',
  personalityDeep: 'ë‚´ë©´ ì¶•ì—ì„œëŠ”',
  careerPath: 'ì‹¤í–‰ ì¶•ì—ì„œëŠ”',
  relationshipDynamics: 'ì¡°ìœ¨ ì¶•ì—ì„œëŠ”',
  wealthPotential: 'ë¦¬ìŠ¤í¬ ì¶•ì—ì„œëŠ”',
  healthGuidance: 'íšŒë³µ ì¶•ì—ì„œëŠ”',
  lifeMission: 'ìž¥ê¸° ì¶•ì—ì„œëŠ”',
  timingAdvice: 'ìš´ì˜ ì¶•ì—ì„œëŠ”',
  actionPlan: 'ì‹¤ë¬´ ì¶•ì—ì„œëŠ”',
  conclusion: 'ì •ë¦¬ ì¶•ì—ì„œëŠ”',
}

const SECTION_ACTION_HINT_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'ì˜¤ëŠ˜ì€ ìš°ì„ ìˆœìœ„ 1ê°œë§Œ í™•ì •í•˜ê³  ë‚˜ë¨¸ì§€ëŠ” ìž¬í™•ì¸ ìŠ¬ë¡¯ìœ¼ë¡œ ë¶„ë¦¬í•˜ì„¸ìš”.',
  personalityDeep:
    'ë§íˆ¬ì™€ ê²°ì • ì†ë„ë¥¼ í•œ ë‹¨ê³„ ëŠ¦ì¶”ë©´ ë¶ˆí•„ìš”í•œ ì¶©ëŒ ë¹„ìš©ì´ í¬ê²Œ ì¤„ì–´ë“­ë‹ˆë‹¤.',
  careerPath: 'ì„±ê³¼ëŠ” ë²”ìœ„ë¥¼ ì¤„ì—¬ ì™„ê²°ë¥ ì„ ë†’ì¼ ë•Œ ë” ë¹ ë¥´ê²Œ ëˆ„ì ë©ë‹ˆë‹¤.',
  relationshipDynamics:
    'ì¤‘ìš” ëŒ€í™”ëŠ” ìš”ì•½ í•œ ì¤„ì„ ë¨¼ì € í™•ì¸ë°›ëŠ” ë°©ì‹ì´ ì•ˆì •ì ìž…ë‹ˆë‹¤.',
  wealthPotential:
    'ê¸ˆì•¡Â·ê¸°í•œÂ·ì·¨ì†Œ ì¡°ê±´ 3ê°€ì§€ëŠ” ë‹¹ì¼ í™•ì • ì „ì— ë°˜ë“œì‹œ ìž¬í™•ì¸í•˜ì„¸ìš”.',
  healthGuidance:
    'ì§‘ì¤‘ ìž‘ì—… ì „í›„ë¡œ íšŒë³µ ë£¨í‹´ì„ ê³ ì •í•˜ë©´ í¼í¬ë¨¼ìŠ¤ íŽ¸ì°¨ë¥¼ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  lifeMission:
    'ì£¼ê°„ ê¸°ë¡ê³¼ ë³µê¸° ë£¨í‹´ì´ ìž¥ê¸° ë°©í–¥ì„ í˜„ì‹¤ ì„±ê³¼ë¡œ ì—°ê²°í•´ ì¤ë‹ˆë‹¤.',
  timingAdvice:
    'ê²°ì •ê³¼ ì‹¤í–‰ ë‚ ì§œë¥¼ ë¶„ë¦¬í•˜ë©´ íƒ€ì´ë° ë¦¬ìŠ¤í¬ë¥¼ ì²´ê³„ì ìœ¼ë¡œ ë‚®ì¶œ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  actionPlan:
    'ì‹¤í–‰ì€ ì°©ìˆ˜ë³´ë‹¤ ë§ˆê° ê¸°ì¤€ì„ ë¨¼ì € ê³ ì •í•  ë•Œ ìž¬í˜„ì„±ì´ ì˜¬ë¼ê°‘ë‹ˆë‹¤.',
  conclusion:
    'í•µì‹¬ì€ ì†ë„ë³´ë‹¤ ì •í™•í•œ ìˆœì„œì´ë©°, ê·¸ ìˆœì„œê°€ ê²°ê³¼ ë³€ë™ì„ ì¤„ìž…ë‹ˆë‹¤.',
}

const SECTION_DEPTH_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'ì˜¤ëŠ˜ì€ ê°•ì  ì‹ í˜¸ë¥¼ ì‹¤í–‰ìœ¼ë¡œ ì—°ê²°í•˜ë˜, í™•ì • ë‹¨ê³„ëŠ” ë¶„ë¦¬í•´ ìš´ì˜í•´ì•¼ ê²°ê³¼ íŽ¸ì°¨ë¥¼ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤. íŠ¹ížˆ ë¬¸ì„œÂ·í•©ì˜Â·ëŒ€ì™¸ ì „ë‹¬ì€ ì²´í¬ë¦¬ìŠ¤íŠ¸ë¥¼ í†µê³¼í•œ ë’¤ ì§„í–‰í•˜ëŠ” íŽ¸ì´ ì•ˆì „í•©ë‹ˆë‹¤.',
  personalityDeep:
    'ìžê¸° ë¦¬ë“¬ì´ í”ë“¤ë¦¬ëŠ” ë‚ ì—ëŠ” ì¦‰í¥ ë°˜ì‘ë³´ë‹¤ ê¸°ë¡ ê¸°ë°˜ íŒë‹¨ì´ ìœ ë¦¬í•©ë‹ˆë‹¤. íŒë‹¨ ê¸°ì¤€ì„ í•œ ì¤„ë¡œ ë¨¼ì € ì ì–´ë‘ë©´ ê°ì • íŽ¸ì°¨ê°€ ì»¤ì ¸ë„ ì‹¤í–‰ í’ˆì§ˆì„ ì§€í‚¬ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  careerPath:
    'ì»¤ë¦¬ì–´ëŠ” í™•ìž¥ ìžì²´ë³´ë‹¤ ì™„ê²°ë¥ ì´ ì„±ê³¼ë¥¼ ë§Œë“­ë‹ˆë‹¤. ì˜¤ëŠ˜ ì²˜ë¦¬í•  í•µì‹¬ ê³¼ì—…ì„ ì œí•œí•˜ê³ , í˜‘ì—… í•­ëª©ì€ ì—­í• Â·ê¸°í•œÂ·ì±…ìž„ì´ ì •ë¦¬ëœ ë’¤ì—ë§Œ í™•ì •í•˜ëŠ” ë°©ì‹ì´ íš¨ìœ¨ì ìž…ë‹ˆë‹¤.',
  relationshipDynamics:
    'ê´€ê³„ëŠ” ì˜ë„ë³´ë‹¤ ì „ë‹¬ êµ¬ì¡°ê°€ ì¤‘ìš”í•©ë‹ˆë‹¤. ì¤‘ìš”í•œ ëŒ€í™”ì—ì„œëŠ” ìƒëŒ€ì˜ ì´í•´ë¥¼ í•œ ë¬¸ìž¥ìœ¼ë¡œ í™•ì¸í•˜ê³ , í•©ì˜ëŠ” ì†ë„ë³´ë‹¤ ì •í™•ì„±ì„ ê¸°ì¤€ìœ¼ë¡œ ìž¡ì•„ì•¼ ì¶©ëŒ ë¹„ìš©ì´ ë‚®ì•„ì§‘ë‹ˆë‹¤.',
  wealthPotential:
    'ìž¬ì •ì€ ìˆ˜ìµ ê¸°ëŒ€ë³´ë‹¤ ì†ì‹¤ í†µì œê°€ ìš°ì„ ìž…ë‹ˆë‹¤. ê¸ˆì•¡Â·ê¸°í•œÂ·ì·¨ì†Œ ì¡°ê±´ì„ ë¶„ë¦¬í•´ ê²€í† í•˜ê³ , ë‹¹ì¼ í™•ì •ì´ ì•„ë‹ˆë¼ ê²€í†  ì°½ì„ ë‘ë©´ ëˆ„ë½ ë¦¬ìŠ¤í¬ë¥¼ í¬ê²Œ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  healthGuidance:
    'ê±´ê°• êµ¬ê°„ì€ ê³¼ë¶€í•˜ë¥¼ ì¤„ì´ëŠ” ì„¤ê³„ê°€ í•µì‹¬ìž…ë‹ˆë‹¤. ìˆ˜ë©´Â·ìˆ˜ë¶„Â·íšŒë³µ ë£¨í‹´ì„ ë¨¼ì € ë°°ì¹˜í•˜ê³ , ë¬´ë¦¬í•œ ê°•ë„ë³´ë‹¤ëŠ” ì¼ê´€ëœ ë¦¬ë“¬ìœ¼ë¡œ ëˆ„ì  í”¼ë¡œë¥¼ ê´€ë¦¬í•˜ì„¸ìš”.',
  lifeMission:
    'ìž¥ê¸° ë°©í–¥ì€ í•œ ë²ˆì˜ í° ê²°ì •ë³´ë‹¤ ë°˜ë³µ ê°€ëŠ¥í•œ ê¸°ì¤€ì—ì„œ ë§Œë“¤ì–´ì§‘ë‹ˆë‹¤. ì£¼ê°„ ë³µê¸°ì™€ ì‹¤í–‰ ê¸°ë¡ì„ ìœ ì§€í•˜ë©´ ì„ íƒì˜ ì§ˆì´ ì˜¬ë¼ê°€ê³  í”ë“¤ë¦¼ì´ ì¤„ì–´ë“­ë‹ˆë‹¤.',
  timingAdvice:
    'íƒ€ì´ë° ì „ëžµì€ ì°©ìˆ˜ì™€ í™•ì •ì„ ë¶„ë¦¬í•  ë•Œ ì•ˆì •ì„±ì´ ë†’ì•„ì§‘ë‹ˆë‹¤. ì˜¤ëŠ˜ì€ ì´ˆì•ˆê³¼ ì •ë¦¬, ë‚´ì¼ì€ ìž¬í™•ì¸ê³¼ í™•ì •ìœ¼ë¡œ ë‹¨ê³„í™”í•˜ë©´ ì‹¤ìˆ˜ ë¹„ìš©ì„ í†µì œí•˜ê¸° ì‰½ìŠµë‹ˆë‹¤.',
  actionPlan:
    'ì‹¤í–‰ ê³„íšì€ ë‹¨ìˆœí• ìˆ˜ë¡ ê°•í•©ë‹ˆë‹¤. í•µì‹¬ 1ê±´ ì™„ë£Œ, ì™¸ë¶€ ì „ë‹¬ ì „ ìž¬í™•ì¸, ë³´ë¥˜ í•­ëª© ë¶„ë¦¬ì˜ ë£¨í”„ë¥¼ ìœ ì§€í•˜ë©´ ì¼ê´€ëœ ê²°ê³¼ë¥¼ ë§Œë“œëŠ” ë° ìœ ë¦¬í•©ë‹ˆë‹¤.',
  conclusion:
    'ë§ˆë¬´ë¦¬ ì›ì¹™ì€ ë™ì¼í•©ë‹ˆë‹¤. ë¹ ë¥¸ ê²°ë¡ ë³´ë‹¤ ì •í™•í•œ í™•ì •ì´ ì¤‘ìš”í•˜ë©°, ê°™ì€ ìš´ì˜ ê·œì¹™ì„ ë©°ì¹ ë§Œ ìœ ì§€í•´ë„ ì²´ê° ì„±ê³¼ì™€ ì‹ ë¢°ë„ê°€ í•¨ê»˜ ì˜¬ë¼ê°‘ë‹ˆë‹¤.',
}

const SECTION_DEPTH_EN: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'Translate upside into execution, but keep commitment as a separate gate. For documents, agreements, and external communication, pass checklist verification before finalization.',
  personalityDeep:
    'When rhythm is unstable, record-first judgment works better than impulse-first reaction. A one-line decision rule stabilizes output quality under emotional variance.',
  careerPath:
    'Career gains come more from completion rate than from scope growth. Limit active priorities and commit collaboration items only after role/deadline/ownership are explicit.',
  relationshipDynamics:
    'In relationships, delivery structure matters more than intention. Confirm the other side understanding in one line before agreement to reduce conflict costs.',
  wealthPotential:
    'For money, downside control should precede upside pursuit. Separate amount/deadline/cancellation review and keep a recheck window before same-day commitments.',
  healthGuidance:
    'Health performance is protected by load design. Lock sleep/hydration/recovery first, then scale intensity gradually to avoid accumulated fatigue.',
  lifeMission:
    'Long-term direction comes from repeatable standards, not one large decision. Weekly review and execution logs improve decision quality and reduce drift.',
  timingAdvice:
    'Timing stability improves when start and commit are split. Draft and organize today, then verify and finalize in a separate window.',
  actionPlan:
    'Execution plans work best when simple and repeatable. Keep one must-finish output, pre-send verification, and deferred-item separation as a fixed loop.',
  conclusion:
    'Final rule stays the same: accurate commitment beats fast commitment. Keep the same operating rule for several days to improve consistency and trust.',
}

const SECTION_EXECUTION_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'ìš´ì˜ íŒìœ¼ë¡œëŠ” ì˜¤ì „ì— í•µì‹¬ 1ê±´ì„ ëë‚´ê³ , ì˜¤í›„ì—ëŠ” ìž¬í™•ì¸/ì •ë¦¬ ì—…ë¬´ë¥¼ ë°°ì¹˜í•˜ëŠ” ë°©ì‹ì´ ì•ˆì •ì ìž…ë‹ˆë‹¤. ê°™ì€ ë£¨í‹´ì„ ë©°ì¹  ìœ ì§€í•˜ë©´ ë³€ë™ì„±ë³´ë‹¤ ëˆ„ì  ì„±ê³¼ê°€ ë¨¼ì € ë³´ì´ê¸° ì‹œìž‘í•©ë‹ˆë‹¤.',
  personalityDeep:
    'ì‹¤í–‰ íŒì€ ê°„ë‹¨í•©ë‹ˆë‹¤. ê²°ì • ì „ì— ì²´í¬ë¦¬ìŠ¤íŠ¸ 3í•­(ëª©í‘œÂ·ê¸°í•œÂ·ì±…ìž„)ì„ í™•ì¸í•˜ê³ , ëŒ€í™” í›„ì—ëŠ” í•©ì˜ ë‚´ìš©ì„ í•œ ì¤„ë¡œ ë‚¨ê¸°ì„¸ìš”. ì´ ìŠµê´€ë§Œìœ¼ë¡œë„ ë¶ˆí•„ìš”í•œ ì¶©ëŒì„ ìƒë‹¹ížˆ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  careerPath:
    'ì—…ë¬´ ë°°ì¹˜ëŠ” ìƒˆ ì¼ ì¶”ê°€ë³´ë‹¤ ì§„í–‰ ì¤‘ì¸ ì¼ì˜ ì™„ê²°ì„ ìš°ì„ í•˜ì„¸ìš”. íŠ¹ížˆ ì™¸ë¶€ í˜‘ì—…ì€ ë²”ìœ„ì™€ ë§ˆê°ì´ ê³ ì •ëœ ê³¼ì œë¶€í„° ë‹«ì•„ì•¼ ë‹¤ìŒ í™•ìž¥ì´ ì•ˆì •ì ìœ¼ë¡œ ì—´ë¦½ë‹ˆë‹¤.',
  relationshipDynamics:
    'ëŒ€í™” ì‹¤í–‰ì€ ì§ˆë¬¸ 1ê°œì™€ ìš”ì•½ 1ë¬¸ìž¥ì„ ê¸°ë³¸ ê·œì¹™ìœ¼ë¡œ ë‘ëŠ” ê²ƒì´ ì¢‹ìŠµë‹ˆë‹¤. ê°ì •ì´ ì»¤ì§€ëŠ” êµ¬ê°„ì—ì„œëŠ” ê²°ë¡ ì„ ë¯¸ë£¨ê³  ë§¥ë½ë¶€í„° ë§žì¶”ëŠ” íŽ¸ì´ ê´€ê³„ ì†ì‹¤ì„ ë§‰ì•„ì¤ë‹ˆë‹¤.',
  wealthPotential:
    'ê¸ˆì „ ì‹¤í–‰ì€ ì†Œì•¡ ì ê²€ í›„ í™•ìž¥, ë‹¹ì¼ í™•ì • ëŒ€ì‹  ìž¬ê²€í†  ì°½ í™•ë³´ê°€ í•µì‹¬ìž…ë‹ˆë‹¤. ë‹¨ê¸° ì´ìµë³´ë‹¤ ì¡°ê±´ ëˆ„ë½ ë°©ì§€ê°€ ìž¥ê¸° ëˆ„ì  ì„±ê³¼ë¥¼ ì§€ì¼œì¤ë‹ˆë‹¤.',
  healthGuidance:
    'ê±´ê°• ì‹¤í–‰ì€ ê°•ë„ ìƒìŠ¹ë³´ë‹¤ íšŒë³µ ë£¨í‹´ ì„ ë°°ì¹˜ê°€ ìš°ì„ ìž…ë‹ˆë‹¤. ì¼ì •ì´ ê³¼ë°€í• ìˆ˜ë¡ ìš´ë™/ì—…ë¬´/ìˆ˜ë©´ ì¤‘ í•˜ë‚˜ë¥¼ ì¤„ì—¬ í”¼ë¡œ ëˆ„ì ì„ ì°¨ë‹¨í•˜ëŠ” ë°©ì‹ì´ í•„ìš”í•©ë‹ˆë‹¤.',
  lifeMission:
    'ìž¥ê¸° ì‹¤í–‰ì€ ê±°ì°½í•œ ê³„íšë³´ë‹¤ ë°˜ë³µ ê°€ëŠ¥í•œ ê·œì¹™ 2~3ê°œë¥¼ ê³ ì •í•˜ëŠ” ê²ƒì´ íš¨ê³¼ì ìž…ë‹ˆë‹¤. ì£¼ê°„ ë‹¨ìœ„ë¡œ ì ê²€í•˜ê³  ìˆ˜ì •í•˜ë©´ ë°©í–¥ì„±ì€ ìœ ì§€ë˜ë©´ì„œë„ í˜„ì‹¤ ì ì‘ë ¥ì´ ì»¤ì§‘ë‹ˆë‹¤.',
  timingAdvice:
    'íƒ€ì´ë° ì‹¤í–‰ì€ ì°©ìˆ˜-ìž¬í™•ì¸-í™•ì •ì˜ 3ë‹¨ê³„ë¥¼ ë¶„ë¦¬í•´ ë‘ëŠ” ê²ƒì´ í•µì‹¬ìž…ë‹ˆë‹¤. íŠ¹ížˆ ì»¤ë®¤ë‹ˆì¼€ì´ì…˜/ë¬¸ì„œ/ê³„ì•½ ì„±ê²©ì˜ í•­ëª©ì€ ìž¬í™•ì¸ ë‹¨ê³„ë¥¼ ìƒëžµí•˜ì§€ ì•Šì•„ì•¼ ë¦¬ìŠ¤í¬ê°€ ë‚®ì•„ì§‘ë‹ˆë‹¤.',
  actionPlan:
    'ê³„íš ì‹¤í–‰ì€ â€œì˜¤ëŠ˜ ì™„ë£Œ 1ê±´, ë³´ë¥˜ 1ê±´, ìž¬í™•ì¸ 1ê±´â€ì˜ ì¼ì¼ ë£¨í‹´ìœ¼ë¡œ ë‹¨ìˆœí™”í•˜ì„¸ìš”. ë³µìž¡ë„ë¥¼ ì¤„ì—¬ì•¼ ì‹¤ì œ í–‰ë™ ì „í™˜ì´ ë¹¨ë¼ì§€ê³  ëˆ„ë½ì´ ì¤„ì–´ë“­ë‹ˆë‹¤.',
  conclusion:
    'ê²°ê³¼ë¥¼ ë°”ê¾¸ëŠ” ê²ƒì€ ìƒˆë¡œìš´ ì •ë³´ë³´ë‹¤ ìš´ì˜ ìŠµê´€ìž…ë‹ˆë‹¤. ê°™ì€ ê·œì¹™ì„ ì¼ì • ê¸°ê°„ ìœ ì§€í•˜ë©° ê¸°ë¡ê¹Œì§€ ë‚¨ê¸°ë©´ ì„±ê³¼ì˜ ì§ˆê³¼ ì¼ê´€ì„±ì´ í•¨ê»˜ ê°œì„ ë©ë‹ˆë‹¤.',
}

const SECTION_EXECUTION_EN: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'A stable pattern is to finish one core task in the morning and schedule review/recheck work in the afternoon. Repeat this routine for several days to reduce variance and improve compounding output.',
  personalityDeep:
    'Use a simple execution rule: verify goal/deadline/ownership before decisions, then keep one-line logs after major conversations. This alone removes a large share of avoidable friction.',
  careerPath:
    'Prioritize completion over new intake. In external collaboration, close items with fixed scope and deadlines first, then open expansion lanes.',
  relationshipDynamics:
    'Keep one question plus one summary sentence as a default communication protocol. When emotional intensity rises, delay conclusions and align context first.',
  wealthPotential:
    'Use small-scale validation before scaling and keep a recheck window before same-day commitment. Protecting terms matters more than chasing short-term upside.',
  healthGuidance:
    'Recovery-first scheduling should precede intensity increases. In overloaded weeks, reduce one major load source to prevent fatigue compounding.',
  lifeMission:
    'Long-term execution improves when 2-3 repeatable rules are fixed and reviewed weekly. This keeps direction stable while allowing practical adaptation.',
  timingAdvice:
    'Split start-verify-commit into distinct stages. For communication/document/contract items, never skip the verify gate.',
  actionPlan:
    'Simplify daily execution to one completion, one defer, and one recheck item. Lower complexity increases action conversion and reduces omission.',
  conclusion:
    'Sustained outcomes come more from operating habits than from new information. Keep your rule set stable and logged over time.',
}

const SECTION_MIN_FILL_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'ì‹¤í–‰ ì‹œì—ëŠ” ìš°ì„ ìˆœìœ„ê°€ ì•„ë‹Œ í•­ëª©ì„ ê³¼ê°ížˆ ë³´ë¥˜í•´ ì§‘ì¤‘ë„ë¥¼ ìœ ì§€í•˜ì„¸ìš”. í•µì‹¬ í•œ ê±´ì˜ ì™„ì„±ë„ê°€ ì „ì²´ íë¦„ì„ ì•ˆì •ì‹œí‚¤ëŠ” ì¶œë°œì ì´ ë©ë‹ˆë‹¤.',
  personalityDeep:
    'ìžê¸° ë¦¬ë“¬ì„ ì§€í‚¤ê¸° ìœ„í•´ í•˜ë£¨ ì¢…ë£Œ ì „ì— ê²°ì • ë¡œê·¸ë¥¼ 3ì¤„ë¡œ ì •ë¦¬í•˜ì„¸ìš”. ì´ ê¸°ë¡ì´ ë‹¤ìŒ ì„ íƒì˜ í’ˆì§ˆì„ ë†’ì´ëŠ” ê¸°ì¤€ì ì´ ë©ë‹ˆë‹¤.',
  careerPath:
    'ì˜¤ëŠ˜ì€ ìƒˆ ì¼ ì°©ìˆ˜ë³´ë‹¤ ì§„í–‰ ì¤‘ ê³¼ì—…ì˜ ë‹«íž˜ì„ ìš°ì„ í•˜ì„¸ìš”. ì™„ê²°ëœ ê²°ê³¼ë¬¼ì´ ìŒ“ì¼ìˆ˜ë¡ ë‹¤ìŒ ê¸°íšŒì˜ ì‹ ë¢°ë„ì™€ í˜‘ìƒë ¥ì´ í•¨ê»˜ ì˜¬ë¼ê°‘ë‹ˆë‹¤.',
  relationshipDynamics:
    'ê´€ê³„ì—ì„œëŠ” ë§žëŠ” ë§ë³´ë‹¤ ë§žëŠ” ìˆœì„œê°€ ì¤‘ìš”í•©ë‹ˆë‹¤. ë¨¼ì € ìƒëŒ€ ë§¥ë½ì„ í™•ì¸í•˜ê³  ê·¸ ë‹¤ìŒì— ìš”ì²­ì„ ì œì‹œí•˜ë©´ ì˜¤í•´ë¥¼ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  wealthPotential:
    'ìž¬ì • ê²°ì •ì€ ë‹¹ì¼ í™•ì •ë³´ë‹¤ ê²€í†  ì°½ì„ ë‘ëŠ” ìª½ì´ ìœ ë¦¬í•©ë‹ˆë‹¤. ì§€ì¶œ ì „ ì²´í¬ë¦¬ìŠ¤íŠ¸ë¥¼ ê³ ì •í•˜ë©´ ì†ì‹¤ ê°€ëŠ¥ì„±ì„ êµ¬ì¡°ì ìœ¼ë¡œ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  healthGuidance:
    'íšŒë³µ ë£¨í‹´ì€ ì˜ì§€ê°€ ì•„ë‹ˆë¼ ì‹œê°„í‘œì— ë„£ì–´ì•¼ ì§€ì†ë©ë‹ˆë‹¤. ê¸°ë³¸ ë¦¬ë“¬ì´ ì•ˆì •ë˜ë©´ ê°™ì€ ì—…ë¬´ëŸ‰ì—ì„œë„ ì²´ê° í”¼ë¡œê°€ í¬ê²Œ ë‚®ì•„ì§‘ë‹ˆë‹¤.',
  lifeMission:
    'ìž¥ê¸° ëª©í‘œëŠ” í¬ê¸°ë³´ë‹¤ ì§€ì†ì„±ì´ ì¤‘ìš”í•©ë‹ˆë‹¤. ìž‘ì€ ì‹¤í–‰ì„ ë°˜ë³µ ê°€ëŠ¥í•œ í˜•íƒœë¡œ ë‚¨ê¸°ëŠ” ê²ƒì´ ë°©í–¥ì„±ê³¼ ì„±ê³¼ë¥¼ ë™ì‹œì— ì§€ì¼œì¤ë‹ˆë‹¤.',
  timingAdvice:
    'íƒ€ì´ë°ì´ ì• ë§¤í• ìˆ˜ë¡ í™•ì • ë‹¨ê³„ë¥¼ ë’¤ë¡œ ë¯¸ë£¨ê³  ìž¬í™•ì¸ì„ ì•žë‹¹ê¸°ì„¸ìš”. ì´ ì›ì¹™ë§Œ ì§€ì¼œë„ ì‹¤ìˆ˜ í™•ë¥ ì„ ì²´ê°í•  ë§Œí¼ ë‚®ì¶œ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
  actionPlan:
    'ì‹¤í–‰ì•ˆì€ ë³µìž¡í•˜ê²Œ ë§Œë“¤ì§€ ë§ê³  ì˜¤ëŠ˜ ë°”ë¡œ í–‰ë™ ê°€ëŠ¥í•œ ìˆ˜ì¤€ìœ¼ë¡œ ê³ ì •í•˜ì„¸ìš”. ì™„ë£Œ í™•ì¸ ê¸°ì¤€ì„ ë¯¸ë¦¬ ì •í•˜ë©´ í”ë“¤ë¦¼ì´ ì¤„ì–´ë“­ë‹ˆë‹¤.',
  conclusion:
    'ê²°ë¡ ì€ ë‹¨ìˆœí•©ë‹ˆë‹¤. ê¸°ì¤€ì„ ì§€í‚¤ëŠ” ì‹¤í–‰ì´ ëˆ„ì  ì„±ê³¼ë¥¼ ë§Œë“­ë‹ˆë‹¤. ê°™ì€ ì›ì¹™ì„ ë°˜ë³µí• ìˆ˜ë¡ ê²°ê³¼ëŠ” ë” ì„ ëª…í•´ì§‘ë‹ˆë‹¤.',
}

const SECTION_MIN_FILL_EN: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'Keep non-priority items deferred to protect focus. One high-quality completion stabilizes the whole daily trajectory.',
  personalityDeep:
    'End each day with a short decision log. This creates a practical reference point for better next-step choices.',
  careerPath:
    'Prioritize closure of in-flight tasks over starting new work. Completed outputs increase trust and negotiation leverage.',
  relationshipDynamics:
    'In relationships, order often matters more than correctness. Confirm context first, then present your request.',
  wealthPotential:
    'Use a review window before same-day commitment. A fixed checklist structurally reduces downside mistakes.',
  healthGuidance:
    'Recovery routines must be scheduled, not improvised. Stable rhythm reduces perceived fatigue at the same workload.',
  lifeMission:
    'Long-term direction depends on repeatability, not scale. Small consistent actions preserve both purpose and outcomes.',
  timingAdvice:
    'When timing is mixed, delay commitment and advance verification. This single rule can cut avoidable errors significantly.',
  actionPlan:
    'Keep plans simple and immediately executable. Predefined completion criteria reduce drift during execution.',
  conclusion:
    'Final principle is simple: consistent standards create compounding outcomes. Repetition makes results more predictable.',
}

function buildLowSignalFallbackSection(
  section: keyof AIPremiumReport['sections'],
  title: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const dayMaster = input.dayMasterElement || 'core'
  const daeun = input.currentDaeunElement || ''
  const seun = input.currentSaeunElement || ''

  if (lang === 'ko') {
    const bySection: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: `${title} ì˜ì—­ì€ í˜„ìž¬ ì§ì ‘ ì‹ í˜¸ê°€ ì ì–´ ë³´ìˆ˜ ìš´ì˜ ê·œì¹™ìœ¼ë¡œ ì •ë¦¬í•©ë‹ˆë‹¤. ì¼ê°„ ${dayMaster} ê¸°ì¤€ìœ¼ë¡œ ì˜¤ëŠ˜ì€ ê²°ë¡ ë³´ë‹¤ ìˆœì„œ ì„¤ê³„ê°€ ì„±ê³¼ë¥¼ ì§€í‚¤ëŠ” ë‚ ìž…ë‹ˆë‹¤. í•´ì•¼ í•  ì¼ì€ í•˜ë‚˜ë¡œ ì¢ížˆê³ , ë‚˜ë¨¸ì§€ëŠ” ìž¬í™•ì¸ ìŠ¬ë¡¯ìœ¼ë¡œ ë¶„ë¦¬í•˜ì„¸ìš”. ì™¸ë¶€ í™•ì • ì „ì—ëŠ” ì¼ì •Â·ì¡°ê±´Â·ì±…ìž„ 3í•­ì„ ë¨¼ì € ë§žì¶”ëŠ” ë°©ì‹ì´ ì•ˆì „í•©ë‹ˆë‹¤.`,
      personalityDeep: `${title} ì˜ì—­ì€ ì €ì‹ í˜¸ êµ¬ê°„ì´ë¯€ë¡œ ê¸°ë³¸ ì„±í–¥ ê´€ë¦¬ì— ì§‘ì¤‘í•˜ì„¸ìš”. íŒë‹¨ ì†ë„ë¥¼ í•œ ë‹¨ê³„ ë‚®ì¶”ê³ , ë§ë³´ë‹¤ ê¸°ë¡ì„ ë¨¼ì € ë‚¨ê¸°ë©´ ì˜¤í•´ ë¹„ìš©ì´ ì¤„ì–´ë“­ë‹ˆë‹¤. ì¦‰í¥ ê²°ì •ë³´ë‹¤ ì²´í¬ë¦¬ìŠ¤íŠ¸ ê¸°ë°˜ ê²°ì •ì„ ì‚¬ìš©í•˜ë©´ ì‹¤ìˆ˜ íŽ¸ì°¨ê°€ ìž‘ì•„ì§‘ë‹ˆë‹¤. ì˜¤ëŠ˜ì€ ê°ì • ë°˜ì‘ë³´ë‹¤ ì‹¤í–‰ ìˆœì„œë¥¼ ë¨¼ì € ì •í•˜ëŠ” ìª½ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.`,
      careerPath: `${title} ì˜ì—­ì€ ì§ì ‘ ì‹ í˜¸ê°€ ì•½í•´ í™•ìž¥ë³´ë‹¤ ì™„ê²° ìš°ì„  ì „ëžµì´ ë§žìŠµë‹ˆë‹¤. ìƒˆë¡œìš´ ì‹œë„ëŠ” í•œ ë²ˆì— ë„“ížˆì§€ ë§ê³  í•µì‹¬ ê³¼ì œ 1~2ê°œë¥¼ ë¨¼ì € ëë‚´ì„¸ìš”. ì—­í• Â·ë²”ìœ„Â·ë§ˆê°ì„ ë¬¸ì„œ í•œ ì¤„ë¡œ ê³ ì •í•˜ë©´ ì¼ì • í”ë“¤ë¦¼ì´ í¬ê²Œ ì¤„ì–´ë“­ë‹ˆë‹¤. ë‹¹ì¼ í™•ì •ì´ í•„ìš”í•œ ì•ˆê±´ë§Œ ì²˜ë¦¬í•˜ê³  ë‚˜ë¨¸ì§€ëŠ” ë‹¤ìŒ í™•ì¸ ì°½ìœ¼ë¡œ ë„˜ê¸°ì„¸ìš”.`,
      relationshipDynamics: `${title} ì˜ì—­ì€ ê°•í•œ ë°©í–¥ ì‹ í˜¸ë³´ë‹¤ í•´ì„ ì˜¤ì°¨ ê´€ë¦¬ê°€ í•µì‹¬ìž…ë‹ˆë‹¤. ì¤‘ìš”í•œ ëŒ€í™”ëŠ” ê²°ë¡ ë¶€í„° ë§í•˜ì§€ ë§ê³  ë¨¼ì € ìƒëŒ€ ì´í•´ë¥¼ í•œ ì¤„ë¡œ í™•ì¸í•˜ì„¸ìš”. ê°ì •ì´ ì˜¬ë¼ì˜¤ëŠ” êµ¬ê°„ì—ì„œëŠ” ì¦‰ì‹œ í™•ì •ë³´ë‹¤ ì‹œê°„ì°¨ ì‘ë‹µì´ ê´€ê³„ ë¹„ìš©ì„ ì¤„ìž…ë‹ˆë‹¤. ì˜¤ëŠ˜ì€ ìŠ¹ë¶€í˜• ëŒ€í™”ë³´ë‹¤ ì¡°ìœ¨í˜• ëŒ€í™”ê°€ ê²°ê³¼ê°€ ì¢‹ìŠµë‹ˆë‹¤.`,
      wealthPotential: `${title} ì˜ì—­ì€ ìˆ˜ìµ í™•ëŒ€ë³´ë‹¤ ì†ì‹¤ ì–µì œ ìš°ì„ ìœ¼ë¡œ ìš´ì˜í•˜ì„¸ìš”. ê¸ˆì•¡Â·ê¸°í•œÂ·ì·¨ì†Œì¡°ê±´ì„ ë”°ë¡œ ë¶„ë¦¬í•´ í™•ì¸í•˜ë©´ ë¶ˆí•„ìš”í•œ ì§€ì¶œì„ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤. í° ì§€ì¶œì´ë‚˜ ê³„ì•½ì€ ë‹¹ì¼ í™•ì •ë³´ë‹¤ í•˜ë£¨ ìž¬í™•ì¸ í›„ ì²˜ë¦¬í•˜ëŠ” íŽ¸ì´ ì•ˆì •ì ìž…ë‹ˆë‹¤. í˜„ê¸ˆíë¦„ í‘œë¥¼ ì§§ê²Œë¼ë„ ì—…ë°ì´íŠ¸í•˜ë©´ íŒë‹¨ í’ˆì§ˆì´ ì˜¬ë¼ê°‘ë‹ˆë‹¤.`,
      healthGuidance: `${title} ì˜ì—­ì€ í¼í¬ë¨¼ìŠ¤ë³´ë‹¤ íšŒë³µ ë¦¬ë“¬ì„ ë¨¼ì € ìž¡ëŠ” êµ¬ê°„ìž…ë‹ˆë‹¤. ìˆ˜ë©´Â·ìˆ˜ë¶„Â·íœ´ì‹ ë¸”ë¡ì„ ì¼ì •ì— ë¨¼ì € ê³ ì •í•˜ë©´ ì§‘ì¤‘ë ¥ íŽ¸ì°¨ê°€ ì¤„ì–´ë“­ë‹ˆë‹¤. ë¬´ë¦¬í•œ í™•ìž¥ë³´ë‹¤ ê°•ë„ ì¡°ì ˆì´ ê²°ê³¼ì ìœ¼ë¡œ ìƒì‚°ì„±ì„ ì§€ì¼œì¤ë‹ˆë‹¤. ì˜¤ëŠ˜ì€ ê³¼ì†ë³´ë‹¤ ëˆ„ë½ ì—†ëŠ” ë§ˆë¬´ë¦¬ë¥¼ ìš°ì„ í•˜ì„¸ìš”.`,
      lifeMission: `${title} ì˜ì—­ì€ ë‹¨ê¸° ì„±ê³¼ë³´ë‹¤ ìž¥ê¸° ì¼ê´€ì„±ì— ì´ˆì ì„ ë§žì¶°ì•¼ í•©ë‹ˆë‹¤. í° ì„ ì–¸ë³´ë‹¤ ìž‘ì€ ì‹¤í–‰ì„ ë°˜ë³µí•´ì„œ ê¸°ë¡í•˜ëŠ” ë°©ì‹ì´ ë°©í–¥ì„±ì„ ë§Œë“­ë‹ˆë‹¤. ê¸°ì¤€ì´ í”ë“¤ë¦´ ë•ŒëŠ” ì„ íƒ í­ì„ ì¤„ì´ê³  ìš°ì„ ìˆœìœ„ í•œ ê°€ì§€ë§Œ ì§€í‚¤ì„¸ìš”. ì´ë²ˆ ì£¼ëŠ” ì™„ë²½ë³´ë‹¤ ì§€ì† ê°€ëŠ¥í•œ ë£¨í‹´ì„ ë§Œë“œëŠ” ë° ì˜ë¯¸ê°€ ìžˆìŠµë‹ˆë‹¤.`,
      timingAdvice: `${title} ì˜ì—­ì€ íƒ€ì´ë° ì‹ í˜¸ê°€ ì•½í•´ ê²°ì •ë³´ë‹¤ ë¶„ë¦¬ ìš´ì˜ì´ ì•ˆì „í•©ë‹ˆë‹¤. ëŒ€ìš´ ${daeun || 'ë¯¸í™•ì¸'}${seun ? ` / ì„¸ìš´ ${seun}` : ''} ê¸°ì¤€ìœ¼ë¡œ ê²°ë¡  ì‹œì ê³¼ ì‹¤í–‰ ì‹œì ì„ ë‚˜ëˆ  ê´€ë¦¬í•˜ì„¸ìš”. ì¤‘ìš”í•œ í™•ì •ì€ ìµœì†Œ í•œ ë²ˆì˜ ìž¬í™•ì¸ ë‹¨ê³„ë¥¼ ë„£ì–´ì•¼ í”ë“¤ë¦¼ì´ ì¤„ì–´ë“­ë‹ˆë‹¤. ì˜¤ëŠ˜ì€ ë¹ ë¥¸ ì°©ìˆ˜ë³´ë‹¤ ì •í™•í•œ ìˆœì„œê°€ ë” ë†’ì€ íš¨ìœ¨ì„ ëƒ…ë‹ˆë‹¤.`,
      actionPlan: `${title} ì˜ì—­ì€ 3ë‹¨ê³„ ì‹¤í–‰ìœ¼ë¡œ ì •ë¦¬í•˜ëŠ” ê²ƒì´ ê°€ìž¥ ì•ˆì •ì ìž…ë‹ˆë‹¤. ì²«ì§¸, ì˜¤ëŠ˜ ë°˜ë“œì‹œ ëë‚¼ ê²°ê³¼ë¬¼ 1ê°œë¥¼ ì •í•©ë‹ˆë‹¤. ë‘˜ì§¸, ì™¸ë¶€ ê³µìœ  ì „ ì¡°ê±´Â·ê¸°í•œÂ·ì±…ìž„ì„ í•œ ì¤„ë¡œ í™•ì¸í•©ë‹ˆë‹¤. ì…‹ì§¸, ë‹¹ì¼ í™•ì • í•­ëª©ê³¼ ë³´ë¥˜ í•­ëª©ì„ ë¶„ë¦¬í•´ ë¦¬ìŠ¤í¬ë¥¼ í†µì œí•˜ì„¸ìš”.`,
      conclusion: `${title} ì˜ì—­ì˜ ê²°ë¡ ì€ ì†ë„ë³´ë‹¤ ìˆœì„œ, í™•ì •ë³´ë‹¤ ìž¬í™•ì¸ìž…ë‹ˆë‹¤. ì§ì ‘ ì‹ í˜¸ê°€ ì ì€ ë‚ ì—ëŠ” ê³¼ê°í•œ í™•ìž¥ë³´ë‹¤ ëˆ„ë½ ë°©ì§€ê°€ ì„±ê³¼ë¥¼ ì§€í‚µë‹ˆë‹¤. ì˜¤ëŠ˜ì€ ì™„ì„±ë„ ë†’ì€ í•œ ê±´ì„ ë§Œë“œëŠ” ë° ì§‘ì¤‘í•˜ë©´ ì²´ê° ê²°ê³¼ê°€ ë¶„ëª…í•´ì§‘ë‹ˆë‹¤. ê°™ì€ ê·œì¹™ì„ ë©°ì¹ ë§Œ ìœ ì§€í•´ë„ ë³€ë™ì„±ì´ ì¤„ì–´ë“­ë‹ˆë‹¤.`,
    }
    const base = bySection[section]
    if (base.length < 260) {
      return `${base} ${SECTION_MIN_FILL_KO[section]}`.replace(/\s{2,}/g, ' ').trim()
    }
    return base
  }

  const bySectionEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: `${title} is currently in low-signal mode, so a conservative operating rule is used. With day-master ${dayMaster}, sequence quality matters more than raw speed today. Narrow work to one must-finish item and move everything else to a recheck slot. Before external commitment, align scope, terms, and ownership first.`,
    personalityDeep: `${title} should focus on baseline behavior control under low-signal conditions. Slow decision speed by one step and log key points before speaking. Checklist-based choices reduce variance more than instinct-only choices in this window. Prioritize execution order over emotional reaction.`,
    careerPath: `${title} currently favors completion over expansion. Do not widen scope at once; close one or two core deliverables first. Lock role, scope, and deadline in one written line before execution. Commit only what must close today and move the rest to a next review slot.`,
    relationshipDynamics: `${title} is less about momentum and more about interpretation control. In key conversations, confirm the other side's understanding in one line before concluding. When emotion rises, delayed responses are safer than immediate commitment. Coordination-first dialogue outperforms confrontation today.`,
    wealthPotential: `${title} should be run with downside control first. Split and confirm amount, deadline, and cancellation terms before any commitment. For large spending or contracts, a 24-hour recheck is safer than same-day finalization. A short cashflow update improves judgment quality immediately.`,
    healthGuidance: `${title} should prioritize recovery rhythm before performance push. Fix sleep, hydration, and recovery blocks in your schedule first. Intensity control protects output quality better than overspeed in this phase. Choose error-free completion over aggressive volume today.`,
    lifeMission: `${title} should prioritize long-term consistency over short spikes. Repeat small executable actions and keep simple logs. When criteria feel unstable, narrow choice width and protect one top priority. This week, sustainable routine matters more than perfection.`,
    timingAdvice: `${title} is in low-signal timing mode, so split decision timing from execution timing. With Daeun ${daeun || 'unknown'}${seun ? ` / Seun ${seun}` : ''}, insert at least one recheck gate before commitment. Accuracy of order matters more than speed of start. Use staged execution windows.`,
    actionPlan: `${title} is best managed as a 3-step loop. First, define one must-finish deliverable. Second, verify terms, deadline, and ownership in one line before sharing. Third, separate same-day commitment items from deferred items to control risk.`,
    conclusion: `${title} concludes with a simple rule: sequence over speed, recheck over impulse. On low-signal days, preventing omission protects outcomes better than aggressive expansion. Focus on one high-quality completion today. Repeat this rule for several days to reduce volatility.`,
  }
  const baseEn = bySectionEn[section]
  if (baseEn.length < 220) {
    return `${baseEn} ${SECTION_MIN_FILL_EN[section]}`.replace(/\s{2,}/g, ' ').trim()
  }
  return baseEn
}

function fallbackTitle(section: keyof AIPremiumReport['sections'], lang: 'ko' | 'en'): string {
  if (lang === 'ko') return SECTION_TITLE_KO[section]
  const en: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: 'Core Direction',
    personalityDeep: 'Personality Deep Dive',
    careerPath: 'Career Trajectory',
    relationshipDynamics: 'Relationship Dynamics',
    wealthPotential: 'Financial Operation',
    healthGuidance: 'Health Rhythm',
    lifeMission: 'Long-term Direction',
    timingAdvice: 'Timing Strategy',
    actionPlan: 'Execution Plan',
    conclusion: 'Conclusion',
  }
  return en[section]
}

function sortClaimsForSection(
  claims: SynthesizedClaim[],
  section: keyof AIPremiumReport['sections']
): SynthesizedClaim[] {
  const domains = SECTION_DOMAINS[section]
  const direct = claims.filter((claim) => domains.includes(claim.domain))
  if (direct.length === 0) return []
  return direct
}

function pickSupportClaim(
  leadClaim: SynthesizedClaim,
  orderedClaims: SynthesizedClaim[],
  preferredDomains: SignalDomain[],
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): SynthesizedClaim | undefined {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .trim()
  return orderedClaims.find(
    (claim) =>
      claim.claimId !== leadClaim.claimId &&
      !usedClaimIds.has(claim.claimId) &&
      preferredDomains.includes(claim.domain) &&
      claim.thesis !== leadClaim.thesis &&
      !usedTheses.has(normalize(claim.thesis))
  )
}

function normalizeTextKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()
}

function pickLeadClaim(
  orderedClaims: SynthesizedClaim[],
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): SynthesizedClaim | undefined {
  const fresh = orderedClaims.find(
    (claim) => !usedClaimIds.has(claim.claimId) && !usedTheses.has(normalizeTextKey(claim.thesis))
  )
  if (fresh) return fresh
  return undefined
}

function sanitizeEvidenceBasis(value: string | undefined, lang: 'ko' | 'en'): string {
  if (!value) return lang === 'ko' ? 'ê·¼ê±° ë³´ì™„ í•„ìš”' : 'pending evidence'
  const cleaned = value
    .replace(/\b(?:pair|angle|orb|allowed|policy)\s*=\s*[^,\s)]+/gi, '')
    .replace(/\s*[\/\-â€“â€”]\s*(?:conjunction|opposition|square|trine|sextile)\b/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/^\s*[\/\-â€“â€”]\s*/, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (/^(?:conjunction|opposition|square|trine|sextile)$/i.test(cleaned)) {
    return lang === 'ko' ? 'ì ì„± ì‹ í˜¸' : 'astrology signal'
  }
  if (!cleaned || cleaned === '-') {
    return lang === 'ko' ? 'ê·¼ê±° ë³´ì™„ í•„ìš”' : 'pending evidence'
  }
  if (lang === 'ko') {
    return cleaned
      .replace(/\bTrue Node\b/gi, 'ë¶ë…¸ë“œ')
      .replace(/\bNorth Node\b/gi, 'ë¶ë…¸ë“œ')
      .replace(/\bSouth Node\b/gi, 'ë‚¨ë…¸ë“œ')
      .replace(/\bSun\b/gi, 'íƒœì–‘')
      .replace(/\bMoon\b/gi, 'ë‹¬')
      .replace(/\bMercury\b/gi, 'ìˆ˜ì„±')
      .replace(/\bVenus\b/gi, 'ê¸ˆì„±')
      .replace(/\bMars\b/gi, 'í™”ì„±')
      .replace(/\bJupiter\b/gi, 'ëª©ì„±')
      .replace(/\bSaturn\b/gi, 'í† ì„±')
      .replace(/\bUranus\b/gi, 'ì²œì™•ì„±')
      .replace(/\bNeptune\b/gi, 'í•´ì™•ì„±')
      .replace(/\bPluto\b/gi, 'ëª…ì™•ì„±')
      .replace(/\bconjunction\b/gi, 'í•©')
      .replace(/\bopposition\b/gi, 'ëŒ€ë¦½')
      .replace(/\bsquare\b/gi, 'ì‚¬ê°')
      .replace(/\btrine\b/gi, 'ì‚¼ë¶„')
      .replace(/\bsextile\b/gi, 'ìœ¡ë¶„')
      .replace(/\bin\s+H(\d{1,2})\b/gi, '$1í•˜ìš°ìŠ¤')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }
  return cleaned
}

function formatEvidenceSentence(
  synthesis: SignalSynthesisResult,
  claims: SynthesizedClaim[],
  lang: 'ko' | 'en'
): string {
  const withTopicParticle = (value: string): string => {
    const text = (value || '').trim()
    if (!text) return 'í•µì‹¬ ì‹ í˜¸ëŠ”'
    const last = text[text.length - 1]
    const code = last.charCodeAt(0)
    const isHangul = code >= 0xac00 && code <= 0xd7a3
    if (!isHangul) return `${text}ëŠ”`
    const hasBatchim = (code - 0xac00) % 28 !== 0
    return `${text}${hasBatchim ? 'ì€' : 'ëŠ”'}`
  }
  const joinWithWaGwa = (left: string, right: string): string => {
    const l = (left || '').trim()
    const r = (right || '').trim()
    if (!l) return r
    if (!r) return l
    let hangulCode = 0
    for (let idx = l.length - 1; idx >= 0; idx -= 1) {
      const code = l.charCodeAt(idx)
      if (code >= 0xac00 && code <= 0xd7a3) {
        hangulCode = code
        break
      }
    }
    if (!hangulCode) return `${l}ì™€ ${r}`
    const hasBatchim = (hangulCode - 0xac00) % 28 !== 0
    return `${l}${hasBatchim ? 'ê³¼' : 'ì™€'} ${r}`
  }

  const isDomainKeywordMismatch = (signal: NormalizedSignal, domain: SignalDomain): boolean => {
    const raw =
      `${signal.keyword || ''} ${signal.rowKey || ''} ${signal.colKey || ''} ${signal.sajuBasis || ''} ${signal.astroBasis || ''}`.toLowerCase()
    if (
      domain === 'relationship' &&
      /(ì»¤ë¦¬ì–´|ì§ì—…|ì—…ë¬´|career|work|job|h10|mc|promotion)/.test(raw)
    ) {
      return true
    }
    if (domain === 'career' && /(ì—°ì• |ê´€ê³„|partner|romance|relationship|h7|venus)/.test(raw)) {
      return true
    }
    if (domain === 'wealth' && /(ì—°ì• |ê´€ê³„|romance|relationship)/.test(raw)) {
      return true
    }
    return false
  }

  const inferEffectivePolarity = (signal: NormalizedSignal): 'strength' | 'balance' | 'caution' => {
    const raw =
      `${signal.keyword || ''} ${signal.rowKey || ''} ${signal.colKey || ''}`.toLowerCase()
    if (
      /ì¶©ëŒ|ê¸´ìž¥|ë¦¬ìŠ¤í¬|ì£¼ì˜|ì¢Œì ˆ|íŒŒê´´|ë¶„ì—´|ë¶ˆì•ˆ|risk|caution|conflict|tension|volatile/.test(
        raw
      )
    ) {
      return 'caution'
    }
    if (/ê· í˜•|ì•ˆì •|ì¡°ìœ¨|ìœ ì§€|balance|stable|stability/.test(raw)) {
      return 'balance'
    }
    if (/ì •ì |ìƒìŠ¹|ê¸°íšŒ|í™•ìž¥|ì„±ìž¥|peak|growth|expansion|opportunity/.test(raw)) {
      return 'strength'
    }
    return signal.polarity
  }

  const evidenceSignals = claims
    .flatMap((claim) => {
      const rawSignals = claim.evidence.map((id) => synthesis.signalsById[id]).filter(Boolean)
      const scopedSignals = rawSignals.filter((signal) =>
        (signal.domainHints || []).includes(claim.domain)
      )
      const domainPreferred = scopedSignals.length > 0 ? scopedSignals : rawSignals
      const withoutMismatch = domainPreferred.filter(
        (signal) => !isDomainKeywordMismatch(signal, claim.domain)
      )
      const pickedSignals = (withoutMismatch.length > 0 ? withoutMismatch : domainPreferred).slice(
        0,
        3
      )
      return pickedSignals.map((signal) => ({ signal, domain: claim.domain }))
    })
    .slice(0, 4)

  if (evidenceSignals.length === 0) {
    return lang === 'ko'
      ? 'ê·¼ê±° ì‹ í˜¸ ë°€ë„ê°€ ë‚®ìœ¼ë¯€ë¡œ í™•ì • ì „ ì²´í¬ë¦¬ìŠ¤íŠ¸ë¥¼ ë¨¼ì € ì ìš©í•˜ì„¸ìš”.'
      : 'Evidence density is low, so apply a checklist before commitment.'
  }

  if (lang === 'ko') {
    const effectByDomain: Record<
      SignalDomain,
      Record<'strength' | 'balance' | 'caution', string>
    > = {
      career: {
        strength: 'ì„±ê³¼ë¥¼ í™•ìž¥í•  ì—¬ì§€ê°€ í½ë‹ˆë‹¤',
        balance: 'ì—…ë¬´ íë¦„ì„ ì•ˆì •ì ìœ¼ë¡œ ìœ ì§€í•˜ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        caution: 'ì—­í• Â·ì±…ìž„ ê²½ê³„ê°€ íë ¤ì§€ë©´ ë¹„ìš©ì´ ì»¤ì§‘ë‹ˆë‹¤',
      },
      relationship: {
        strength: 'ê´€ê³„ íšŒë³µê³¼ ì—°ê²° ê°•í™”ì— ìœ ë¦¬í•©ë‹ˆë‹¤',
        balance: 'ëŒ€í™” ë¦¬ë“¬ì„ ì•ˆì •ì ìœ¼ë¡œ ë§žì¶”ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        caution: 'ë§ì˜ ì†ë„ê°€ ì•žì„œë©´ ì˜¤í•´ê°€ ì»¤ì§ˆ ìˆ˜ ìžˆìŠµë‹ˆë‹¤',
      },
      wealth: {
        strength: 'ìˆ˜ìµ ê¸°íšŒë¥¼ í¬ì°©í•˜ê¸° ìœ ë¦¬í•©ë‹ˆë‹¤',
        balance: 'í˜„ê¸ˆ íë¦„ì„ ì•ˆì •ì ìœ¼ë¡œ ê´€ë¦¬í•˜ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        caution: 'ì¡°ê±´ ëˆ„ë½ ì‹œ ì†ì‹¤ ë¦¬ìŠ¤í¬ê°€ ì»¤ì§‘ë‹ˆë‹¤',
      },
      health: {
        strength: 'ì»¨ë””ì…˜ íšŒë³µê³¼ ì²´ë ¥ ê´€ë¦¬ê°€ ë¹ ë¥´ê²Œ ë¶™ìŠµë‹ˆë‹¤',
        balance: 'ë£¨í‹´ì„ ìœ ì§€í•˜ë©´ í”¼ë¡œ íŽ¸ì°¨ë¥¼ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤',
        caution: 'ê³¼ì†í•˜ë©´ íšŒë³µì´ ëŠ¦ì–´ì§ˆ ìˆ˜ ìžˆìŠµë‹ˆë‹¤',
      },
      timing: {
        strength: 'ì°©ìˆ˜ ì†ë„ë¥¼ ë†’ì´ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        balance: 'ìˆœì„œë¥¼ ì§€í‚¤ë©´ ì‹œí–‰ì°©ì˜¤ë¥¼ ì¤„ì´ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        caution: 'ë‹¹ì¼ í™•ì •ì€ ìž¬í™•ì¸ ì ˆì°¨ê°€ í•„ìš”í•©ë‹ˆë‹¤',
      },
      personality: {
        strength: 'ê²°ì •ë ¥ì´ ì˜¬ë¼ê°€ ì‹¤í–‰ ì „í™˜ì´ ë¹ ë¦…ë‹ˆë‹¤',
        balance: 'íŒë‹¨ì˜ ì¼ê´€ì„±ì„ ìœ ì§€í•˜ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        caution: 'ì¦‰í¥ ë°˜ì‘ì´ ëˆ„ì ë˜ë©´ ì˜¤íŒ ê°€ëŠ¥ì„±ì´ ì»¤ì§‘ë‹ˆë‹¤',
      },
      spirituality: {
        strength: 'ìž¥ê¸° ë°©í–¥ì„ ì„ ëª…í•˜ê²Œ ìž¡ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        balance: 'ê¸°ì¤€ì„ ìœ ì§€í•˜ë©´ ë°©í–¥ì„±ì´ í”ë“¤ë¦¬ì§€ ì•ŠìŠµë‹ˆë‹¤',
        caution: 'ìš°ì„ ìˆœìœ„ê°€ ë¶„ì‚°ë˜ë©´ ì§‘ì¤‘ë ¥ì´ ë–¨ì–´ì§ˆ ìˆ˜ ìžˆìŠµë‹ˆë‹¤',
      },
      move: {
        strength: 'ë³€í™” ì‹œë„ë¥¼ ì‹œìž‘í•˜ê¸° ì¢‹ìŠµë‹ˆë‹¤',
        balance: 'ë‹¨ê³„ë³„ ì¡°ì •ì´ ìž˜ ë¨¹ížˆëŠ” êµ¬ê°„ìž…ë‹ˆë‹¤',
        caution: 'í•œ ë²ˆì— í¬ê²Œ ì›€ì§ì´ë©´ ë³€ë™ì„±ì´ ì»¤ì§‘ë‹ˆë‹¤',
      },
    }

    return evidenceSignals
      .map(({ signal, domain }) => {
        const key = signal.keyword || signal.rowKey || 'í•µì‹¬'
        const saju = sanitizeEvidenceBasis(signal.sajuBasis || 'ì‚¬ì£¼ ê·¼ê±° ë³´ì™„ í•„ìš”', lang)
        const astro = sanitizeEvidenceBasis(signal.astroBasis || 'ì ì„± ê·¼ê±° ë³´ì™„ í•„ìš”', lang)
        const effectivePolarity = inferEffectivePolarity(signal)
        const effect =
          effectByDomain[domain]?.[effectivePolarity] ||
          effectByDomain.personality[effectivePolarity] ||
          'ìš´ì˜ ë°©ì‹ ì¡°ì •ì´ í•„ìš”í•©ë‹ˆë‹¤'
        return `${withTopicParticle(key)} ${joinWithWaGwa(saju, astro)}ê°€ ê²¹ì³ ${effect}`
      })
      .join('. ')
      .concat('.')
  }

  return evidenceSignals
    .map(({ signal, domain }) => {
      const effectByDomain: Record<
        SignalDomain,
        Record<'strength' | 'balance' | 'caution', string>
      > = {
        career: {
          strength: 'execution leverage is high',
          balance: 'stability can be maintained with routine discipline',
          caution: 'unclear ownership can increase friction cost',
        },
        relationship: {
          strength: 'connection momentum is available',
          balance: 'communication rhythm can stay stable',
          caution: 'pace mismatch can create misunderstandings',
        },
        wealth: {
          strength: 'upside opportunities can be captured',
          balance: 'cashflow can stay stable',
          caution: 'term omissions can raise downside risk',
        },
        health: {
          strength: 'recovery momentum is available',
          balance: 'routine can reduce fatigue variance',
          caution: 'overspeed can delay recovery',
        },
        timing: {
          strength: 'start momentum is available',
          balance: 'sequence discipline reduces errors',
          caution: 'same-day finalization needs a verify gate',
        },
        personality: {
          strength: 'decision throughput increases',
          balance: 'judgment consistency is easier to maintain',
          caution: 'impulse reactions can increase noise',
        },
        spirituality: {
          strength: 'long-term direction gets clearer',
          balance: 'priority stability improves',
          caution: 'priority diffusion can reduce focus',
        },
        move: {
          strength: 'change momentum is available',
          balance: 'staged execution works well',
          caution: 'one-shot moves increase volatility',
        },
      }
      const key = signal.keyword || signal.rowKey || 'core'
      const saju = sanitizeEvidenceBasis(signal.sajuBasis || 'pending saju basis', lang)
      const astro = sanitizeEvidenceBasis(signal.astroBasis || 'pending astrology basis', lang)
      const effectivePolarity = inferEffectivePolarity(signal)
      const effect =
        effectByDomain[domain]?.[effectivePolarity] ||
        effectByDomain.personality[effectivePolarity] ||
        'operating adjustment is needed'
      return `${key} is grounded by ${saju} and ${astro}, so ${effect}`
    })
    .join('. ')
    .concat('.')
}

function gatherClaimSignals(
  synthesis: SignalSynthesisResult,
  claims: SynthesizedClaim[]
): NormalizedSignal[] {
  return claims
    .flatMap((claim) => claim.evidence.map((id) => synthesis.signalsById[id]).filter(Boolean))
    .filter((signal, index, arr) => arr.findIndex((item) => item.id === signal.id) === index)
}

function buildSectionInsightSentence(
  section: keyof AIPremiumReport['sections'],
  signals: NormalizedSignal[],
  lang: 'ko' | 'en'
): string {
  const hasStrength = signals.some((signal) => signal.polarity === 'strength')
  const hasCaution = signals.some((signal) => signal.polarity === 'caution')
  const hasBalance = signals.some((signal) => signal.polarity === 'balance')

  if (lang === 'ko') {
    if (hasStrength && hasCaution) {
      return section === 'careerPath'
        ? 'ìƒìŠ¹ ë™ë ¥ê³¼ ë³€ë™ ì‹ í˜¸ê°€ ë™ì‹œì— ë³´ì´ë¯€ë¡œ, í™•ìž¥ ìžì²´ë³´ë‹¤ ë²”ìœ„Â·ì±…ìž„Â·ê¸°í•œì„ ë¨¼ì € ê³ ì •í•  ë•Œ ì„±ê³¼ê°€ ë‚¨ìŠµë‹ˆë‹¤.'
        : 'ìƒìŠ¹ ì‹ í˜¸ì™€ ì£¼ì˜ ì‹ í˜¸ê°€ í•¨ê»˜ ë³´ì´ë¯€ë¡œ, ì°©ìˆ˜ì™€ í™•ì •ì„ ë¶„ë¦¬í•´ì•¼ ì„±ê³¼ë¥¼ ì§€í‚¤ë©´ì„œ ë¦¬ìŠ¤í¬ë¥¼ ë‚®ì¶œ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.'
    }
    if (hasStrength) {
      return 'ìƒìŠ¹ ì‹ í˜¸ê°€ ìš°ì„¸í•˜ë¯€ë¡œ ì‹¤í–‰ ì „í™˜ ì†ë„ë¥¼ ë†’ì´ë˜, ê²°ê³¼ë¬¼ ì™„ê²° ê¸°ì¤€ì„ ë¨¼ì € ì •í•˜ë©´ ëˆ„ì  ì„±ê³¼ê°€ ì»¤ì§‘ë‹ˆë‹¤.'
    }
    if (hasCaution) {
      return 'ì£¼ì˜ ì‹ í˜¸ê°€ ì„ í–‰í•˜ë¯€ë¡œ í° ê²°ì •ë³´ë‹¤ ìž¬í™•ì¸ ë£¨í‹´ì„ ë¨¼ì € ë‘ëŠ” íŽ¸ì´ ì†ì‹¤ì„ ì¤„ì´ëŠ” ë° ìœ ë¦¬í•©ë‹ˆë‹¤.'
    }
    if (hasBalance) {
      return 'ê· í˜• ì‹ í˜¸ê°€ ì¤‘ì‹¬ì´ë¼ ìƒˆ ì‹œë„ë³´ë‹¤ ë£¨í‹´ ìœ ì§€ì™€ ë§ˆê° í’ˆì§ˆ ê°œì„ ì— ì§‘ì¤‘í• ìˆ˜ë¡ ì²´ê°ì´ ì¢‹ì•„ì§‘ë‹ˆë‹¤.'
    }
    return 'ì§ì ‘ ì‹ í˜¸ê°€ ì•½í•œ êµ¬ê°„ì´ë¯€ë¡œ, ìš°ì„ ìˆœìœ„ë¥¼ ì¢ížˆê³  í™•ì¸ ì ˆì°¨ë¥¼ ê³ ì •í•˜ëŠ” ë³´ìˆ˜ ìš´ì˜ì´ ì í•©í•©ë‹ˆë‹¤.'
  }

  if (hasStrength && hasCaution) {
    return 'Growth and caution are both active, so separate start from commitment to keep upside while controlling downside.'
  }
  if (hasStrength) {
    return 'Expansion signals dominate, so accelerate execution but lock completion criteria first.'
  }
  if (hasCaution) {
    return 'Caution signals lead this section, so verification routines should precede major decisions.'
  }
  if (hasBalance) {
    return 'Balance signals are central, so steady routines outperform aggressive changes.'
  }
  return 'Direct signals are thin, so conservative sequencing and verification are the safer default.'
}

function buildSectionExecutionSentence(
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const lines: Record<keyof AIPremiumReport['sections'], string> = {
      introduction:
        'ì‹¤í–‰ì€ ì˜¤ëŠ˜ ëë‚¼ 1ê±´ì„ ë¨¼ì € ê³ ì •í•˜ê³ , ëŒ€ì™¸ í™•ì •ì´ í•„ìš”í•œ ì•ˆê±´ì€ ìµœì†Œ í•œ ë²ˆì˜ ìž¬ê²€í†  ìŠ¬ë¡¯ì„ ê±°ì¹œ ë’¤ ì²˜ë¦¬í•˜ì„¸ìš”.',
      personalityDeep:
        'ì˜ì‚¬ê²°ì •ì€ ì¦‰ë‹µë³´ë‹¤ ìš”ì•½ ê¸°ë¡ì„ ë¨¼ì € ë‚¨ê¸°ê³ , ê°ì •ì´ ì˜¬ë¼ì˜¤ëŠ” ëŒ€í™”ëŠ” í…œí¬ë¥¼ í•œ ë‹¨ê³„ ëŠ¦ì¶”ëŠ” ê²ƒì´ ì†ì‹¤ì„ ì¤„ìž…ë‹ˆë‹¤.',
      careerPath:
        'ì—…ë¬´ì—ì„œëŠ” ìƒˆ ì°©ìˆ˜ë³´ë‹¤ ì§„í–‰ ì¤‘ ê³¼ì œì˜ ì™„ê²°ë¥ ì„ ì˜¬ë¦¬ê³ , í˜‘ì—… ê±´ì€ ì—­í• Â·ë§ˆê°Â·ì±…ìž„ 3í•­ëª©ì´ í•©ì˜ëœ ë’¤ í™•ì •í•˜ì„¸ìš”.',
      relationshipDynamics:
        'ê´€ê³„ì—ì„œëŠ” ê²°ë¡ ì„ ë¨¼ì € ë§í•˜ê¸°ë³´ë‹¤ ìƒëŒ€ì˜ ì´í•´ë¥¼ í•œ ì¤„ë¡œ í™•ì¸í•œ ë’¤ ìš”ì²­ì„ ì œì‹œí•˜ë©´ ì¶©ëŒ ë¹„ìš©ì´ í¬ê²Œ ì¤„ì–´ë“­ë‹ˆë‹¤.',
      wealthPotential:
        'ìž¬ì •ì€ ê¸ˆì•¡Â·ê¸°í•œÂ·ì·¨ì†Œ ì¡°ê±´ì„ ë¶„ë¦¬ ì ê²€í•˜ê³ , ë‹¹ì¼ í™•ì • ëŒ€ì‹  24ì‹œê°„ ìž¬í™•ì¸ ì°½ì„ ë‘ëŠ” ë°©ì‹ì´ ì•ˆì •ì ìž…ë‹ˆë‹¤.',
      healthGuidance:
        'ê±´ê°•ì€ ê°•ë„ë³´ë‹¤ íšŒë³µ ë¸”ë¡ì„ ë¨¼ì € ë°°ì¹˜í•˜ì„¸ìš”. ìˆ˜ë©´Â·ìˆ˜ë¶„Â·íœ´ì‹ ì‹œê°„ì„ ê³ ì •í•˜ë©´ í”¼ë¡œ íŽ¸ì°¨ë¥¼ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
      lifeMission:
        'ìž¥ê¸° ë°©í–¥ì€ í° ì„ ì–¸ë³´ë‹¤ ì£¼ê°„ ê¸°ë¡ê³¼ ë³µê¸° ë£¨í‹´ìœ¼ë¡œ ê³ ì •í•  ë•Œ ë” ì˜¤ëž˜ ìœ ì§€ë˜ê³  ì‹¤ì œ ì„±ê³¼ë¡œ ì—°ê²°ë©ë‹ˆë‹¤.',
      timingAdvice:
        'íƒ€ì´ë°ì€ ì°©ìˆ˜-ê²€í† -í™•ì •ì„ ë¶„ë¦¬í•´ ìš´ì˜í•˜ì„¸ìš”. íŠ¹ížˆ ë¬¸ì„œÂ·ê³„ì•½ ì„±ê²©ì˜ ì¼ì€ ê²€í†  ë‹¨ê³„ë¥¼ ìƒëžµí•˜ì§€ ì•ŠëŠ” ê²ƒì´ í•µì‹¬ìž…ë‹ˆë‹¤.',
      actionPlan:
        '2ì£¼ ê³„íšì€ ì™„ë£Œ 1ê±´, ìž¬í™•ì¸ 1ê±´, ë³´ë¥˜ 1ê±´ì˜ êµ¬ì¡°ë¡œ ë‹¨ìˆœí™”í•˜ë©´ ì‹¤í–‰ ì „í™˜ìœ¨ì´ ë†’ê³  ëˆ„ë½ì´ ì¤„ì–´ë“­ë‹ˆë‹¤.',
      conclusion:
        'ê²°ë¡ ì ìœ¼ë¡œ ì†ë„ë³´ë‹¤ ìˆœì„œë¥¼ ì§€í‚¤ëŠ” ìš´ì˜ì´ ìœ ë¦¬í•©ë‹ˆë‹¤. ê°™ì€ ê·œì¹™ì„ ë©°ì¹  ìœ ì§€í•˜ë©´ ë³€ë™ì„±ì´ ë¹ ë¥´ê²Œ ì¤„ì–´ë“­ë‹ˆë‹¤.',
    }
    return lines[section]
  }

  const linesEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction:
      'Lock one must-finish item first, and route externally committing items through at least one recheck slot.',
    personalityDeep:
      'Use summary-first logging before fast replies, and slow conversation tempo when emotional intensity rises.',
    careerPath:
      'Prioritize completion rate over new intake, and commit collaboration only after role-deadline-ownership are explicit.',
    relationshipDynamics:
      'In relationships, confirm understanding in one sentence before proposing requests to reduce friction.',
    wealthPotential:
      'For money matters, review amount/deadline/cancellation separately and use a 24-hour verify window before commitment.',
    healthGuidance:
      'For health, schedule recovery blocks before intensity; fixed sleep-hydration-rest reduces fatigue variance.',
    lifeMission:
      'Long-term direction is sustained through weekly logs and review loops rather than one-time declarations.',
    timingAdvice:
      'Split start-review-commit stages, and do not skip the review gate for contract-like decisions.',
    actionPlan:
      'A two-week plan works best with one completion, one recheck, and one deferred item per cycle.',
    conclusion:
      'In summary, sequence discipline beats speed, and repeated operating rules reduce volatility.',
  }
  return linesEn[section]
}

function getSectionMinChars(section: keyof AIPremiumReport['sections'], lang: 'ko' | 'en'): number {
  if (lang === 'ko') {
    const map: Record<keyof AIPremiumReport['sections'], number> = {
      introduction: 620,
      personalityDeep: 560,
      careerPath: 680,
      relationshipDynamics: 640,
      wealthPotential: 620,
      healthGuidance: 560,
      lifeMission: 620,
      timingAdvice: 600,
      actionPlan: 520,
      conclusion: 500,
    }
    return map[section]
  }
  const mapEn: Record<keyof AIPremiumReport['sections'], number> = {
    introduction: 520,
    personalityDeep: 500,
    careerPath: 560,
    relationshipDynamics: 540,
    wealthPotential: 520,
    healthGuidance: 500,
    lifeMission: 520,
    timingAdvice: 520,
    actionPlan: 480,
    conclusion: 440,
  }
  return mapEn[section]
}

function buildSectionBridgeSentence(
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const map: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: '결론보다 실행 순서를 먼저 고정하면 하루 품질이 안정됩니다.',
      personalityDeep: '자기 리듬을 지키는 작은 기준이 장기 성과를 만듭니다.',
      careerPath: '커리어는 확장보다 완결률을 올릴 때 체감 성과가 빨라집니다.',
      relationshipDynamics: '관계는 감정보다 해석 정렬이 먼저일 때 충돌이 줄어듭니다.',
      wealthPotential: '재정은 수익 확대보다 손실 통제를 먼저 두는 편이 유리합니다.',
      healthGuidance: '건강은 강도보다 회복 리듬을 먼저 고정할 때 유지됩니다.',
      lifeMission: '장기 방향은 반복 가능한 기준을 만들 때 현실 성과로 연결됩니다.',
      timingAdvice: '타이밍은 착수와 확정을 분리할수록 실수 비용이 줄어듭니다.',
      actionPlan: '실행 계획은 단순할수록 실제 이행률이 높아집니다.',
      conclusion: '핵심은 속도보다 일관된 기준을 유지하는 운영 습관입니다.',
    }
    return map[section]
  }

  const mapEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: 'Lock sequence before speed to stabilize daily output quality.',
    personalityDeep: 'Small personal standards compound into long-term consistency.',
    careerPath: 'Career outcomes improve faster through completion rate than scope inflation.',
    relationshipDynamics:
      'Relationship stability improves when interpretation aligns before conclusions.',
    wealthPotential: 'For money, downside control should come before upside pursuit.',
    healthGuidance: 'Health performance is sustained by recovery rhythm before intensity.',
    lifeMission: 'Long-term mission becomes real when converted into repeatable standards.',
    timingAdvice: 'Timing quality improves when start and commitment are separated.',
    actionPlan: 'Plans work when simple enough to execute under real constraints.',
    conclusion: 'Consistency of standards outperforms short bursts of speed.',
  }
  return mapEn[section]
}

function uniqueLines(lines: Array<string | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of lines) {
    const value = String(raw || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function expandToMinChars(
  base: string,
  minChars: number,
  fillers: string[],
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  let out = base.replace(/\s{2,}/g, ' ').trim()
  const cleanFillers = [...new Set(fillers.map((f) => f.trim()).filter(Boolean))]
  if (cleanFillers.length === 0) return out
  for (const filler of cleanFillers) {
    if (out.length >= minChars) break
    if (out.includes(filler)) continue
    out = `${out} ${filler}`.replace(/\s{2,}/g, ' ').trim()
  }
  if (out.length < minChars) {
    const bridge = buildSectionBridgeSentence(section, lang)
    if (!out.includes(bridge)) {
      out = `${out} ${bridge}`.replace(/\s{2,}/g, ' ').trim()
    }
  }
  return out
}

function inferAgeFromInput(input: MatrixCalculationInput): number | null {
  const birthDate = input.profileContext?.birthDate
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const base = input.currentDateIso ? new Date(input.currentDateIso) : new Date()
  if (Number.isNaN(base.getTime())) return null
  let age = base.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = base.getUTCMonth() - birth.getUTCMonth()
  const dayDiff = base.getUTCDate() - birth.getUTCDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1
  return Math.max(0, age)
}

function clipSentence(value: string, max = 58): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function buildLifeJourneyNarrative(
  input: NarrativeInput,
  section: keyof AIPremiumReport['sections']
): string {
  if (!['introduction', 'lifeMission', 'conclusion'].includes(section)) return ''
  const topDomainSignals = (domain: SignalDomain, limit = 2): string[] => {
    const rows = (input.synthesis.normalizedSignals || [])
      .filter((signal) => (signal.domainHints || []).includes(domain))
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit)
      .map((signal) => signal.keyword || signal.rowKey)
      .filter(Boolean)
    return [...new Set(rows)]
  }
  const personality = topDomainSignals('personality').join('Â·')
  const career = topDomainSignals('career').join('Â·')
  const wealth = topDomainSignals('wealth').join('Â·')
  const relation = topDomainSignals('relationship').join('Â·')
  const age = inferAgeFromInput(input.matrixInput)
  const daeun = input.matrixInput.currentDaeunElement || 'ë¯¸í™•ì¸'
  const saeun = input.matrixInput.currentSaeunElement || 'ë¯¸í™•ì¸'

  if (input.lang === 'ko') {
    const ageLine =
      age === null
        ? 'í˜„ìž¬ ë‚˜ì´ ì •ë³´ê°€ ì—†ì–´ ì¼ë°˜ ìƒì•  êµ¬ê°„ ê¸°ì¤€ìœ¼ë¡œ ì •ë¦¬í•©ë‹ˆë‹¤.'
        : `í˜„ìž¬ ë‚˜ì´ ${age}ì„¸ ê¸°ì¤€ìœ¼ë¡œ ìƒì•  êµ¬ê°„ì„ ìž¬ë°°ì¹˜í•´ í•´ì„í•©ë‹ˆë‹¤.`
    const early = personality
      ? `ì´ˆë…„ê¸°(0~19ì„¸): ${personality} í‚¤ì›Œë“œê°€ ì„±í–¥ì˜ ê¸°ë³¸ í”„ë ˆìž„ì„ ë§Œë“¤ê³ , ìžê¸° ê¸°ì¤€ì„ ì„¸ìš°ëŠ” ë°©ì‹ì´ ì´í›„ ì„ íƒ ìŠµê´€ì„ ê²°ì •í•©ë‹ˆë‹¤.`
      : 'ì´ˆë…„ê¸°(0~19ì„¸): ì„±í–¥ì˜ ë¿Œë¦¬ë¥¼ ë§Œë“œëŠ” ì‹œê¸°ë¼ ë¦¬ë“¬ê³¼ ê¸°ì¤€ì„ ë¨¼ì € ë°°ìš°ëŠ” ê²ƒì´ ì¤‘ìš”í•©ë‹ˆë‹¤.'
    const young = career
      ? `ì²­ë…„ê¸°(20~34ì„¸): ${career} ì‹ í˜¸ê°€ ì»¤ë¦¬ì–´ ì¶•ì„ ë°€ì–´ ì˜¬ë¦¬ë©°, ë¹ ë¥¸ ì°©ìˆ˜ë³´ë‹¤ ì™„ê²°ë¥  ì¤‘ì‹¬ ìš´ì˜ì´ ì„±ê³¼ ê²©ì°¨ë¥¼ ë§Œë“­ë‹ˆë‹¤.`
      : 'ì²­ë…„ê¸°(20~34ì„¸): ì§„ìž…ê³¼ ì „í™˜ì´ ë¹ ë¥¸ ì‹œê¸°ë¼ ì™„ê²°ë¥  ì¤‘ì‹¬ì˜ ì„ íƒì´ ì„±ê³¼ë¥¼ ì¢Œìš°í•©ë‹ˆë‹¤.'
    const mid =
      wealth || relation
        ? `ìž¥ë…„ê¸°(35~49ì„¸): ${wealth || relation} ì¶•ì´ ëˆÂ·ê´€ê³„Â·ì±…ìž„ì˜ êµ¬ì¡°ë¥¼ ìž¬ì •ë ¬í•˜ë¯€ë¡œ, ìˆ˜ìµ í™•ëŒ€ì™€ ë¦¬ìŠ¤í¬ í†µì œë¥¼ ë™ì‹œì— ì„¤ê³„í•´ì•¼ ì•ˆì •ì ìœ¼ë¡œ ì„±ìž¥í•©ë‹ˆë‹¤.`
        : 'ìž¥ë…„ê¸°(35~49ì„¸): ëˆê³¼ ê´€ê³„ì˜ êµ¬ì¡°ë¥¼ ë‹¤ì‹œ ì§œëŠ” êµ¬ê°„ì´ë¼ ë¶„ë°°Â·í˜‘ì—… ê·œì¹™ì´ ì¤‘ìš”í•©ë‹ˆë‹¤.'
    const later = `í›„ë°˜ê¸°(50ì„¸+): ì¶•ì ëœ ê¸°ì¤€ì„ ì˜í–¥ë ¥ìœ¼ë¡œ ë°”ê¾¸ëŠ” ì‹œê¸°ì´ë©°, ëŒ€ìš´(${daeun})Â·ì„¸ìš´(${saeun}) íë¦„ì— ë§žì¶˜ ì„ íƒ ë¶„í• ì´ ë³€ë™ì„±ì„ ì¤„ì´ê³  ëˆ„ì  ì‹ ë¢°ë¥¼ í‚¤ì›ë‹ˆë‹¤.`

    if (section === 'conclusion') {
      return `${ageLine} ìƒì•  ì „ì²´ì˜ ê²°ë¡ ì€ ë™ì¼í•©ë‹ˆë‹¤. ì´ˆë…„ì˜ ì„±í–¥ í”„ë ˆìž„, ì²­ë…„ì˜ í™•ìž¥ ì‹¤í—˜, ìž¥ë…„ì˜ êµ¬ì¡°í™”, í›„ë°˜ì˜ ì˜í–¥ë ¥ ì „í™˜ì„ í•˜ë‚˜ì˜ ìš´ì˜ ì›ì¹™ìœ¼ë¡œ ì—°ê²°í•  ë•Œ ì¸ìƒì´ìš´ì´ ê°€ìž¥ ì•ˆì •ì ìœ¼ë¡œ ì˜¬ë¼ê°‘ë‹ˆë‹¤.`
    }
    return `${ageLine} ${early} ${young} ${mid} ${later}`
  }

  const ageLineEn =
    age === null
      ? 'Age context is missing, so this follows standard life-stage framing.'
      : `Age ${age} context is applied for life-stage framing.`
  const earlyEn = personality
    ? `Early stage (0-19): ${personality} builds the personality baseline and decision habit.`
    : 'Early stage (0-19): baseline rhythm and standards are built first.'
  const youngEn = career
    ? `Young stage (20-34): ${career} drives career expansion, while completion-rate discipline separates outcomes.`
    : 'Young stage (20-34): completion-rate decisions matter more than expansion speed.'
  const midEn =
    wealth || relation
      ? `Mid stage (35-49): ${wealth || relation} restructures money, relationships, and responsibility together.`
      : 'Mid stage (35-49): money/relationship structure redesign becomes central.'
  const laterEn = `Later stage (50+): accumulated standards convert into leverage, and staged decisions aligned to Daeun(${daeun})/Seun(${saeun}) reduce volatility.`
  if (section === 'conclusion') {
    return `${ageLineEn} The life-course conclusion is consistent: connect early identity framing, young-stage expansion, mid-stage structural redesign, and later-stage leverage into one operating rule.`
  }
  return `${ageLineEn} ${earlyEn} ${youngEn} ${midEn} ${laterEn}`
}

function signalLabel(signal: NormalizedSignal, lang: 'ko' | 'en'): string {
  if (lang === 'ko') return signal.keyword || signal.rowKey || 'í•µì‹¬ ì‹ í˜¸'
  return signal.keyword || signal.rowKey || 'core signal'
}

function buildSectionDeepDiveSentence(
  section: keyof AIPremiumReport['sections'],
  signals: NormalizedSignal[],
  lang: 'ko' | 'en'
): string {
  const strengths = signals.filter((signal) => signal.polarity === 'strength').slice(0, 2)
  const cautions = signals.filter((signal) => signal.polarity === 'caution').slice(0, 2)
  const balances = signals.filter((signal) => signal.polarity === 'balance').slice(0, 1)

  const sText = strengths.map((signal) => signalLabel(signal, lang)).join(', ')
  const cText = cautions.map((signal) => signalLabel(signal, lang)).join(', ')
  const bText = balances.map((signal) => signalLabel(signal, lang)).join(', ')

  if (lang === 'ko') {
    const domainName: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: 'ì „ì²´ íë¦„',
      personalityDeep: 'ì„±í–¥',
      careerPath: 'ì»¤ë¦¬ì–´',
      relationshipDynamics: 'ê´€ê³„',
      wealthPotential: 'ìž¬ì •',
      healthGuidance: 'ê±´ê°•',
      lifeMission: 'ìž¥ê¸° ë°©í–¥',
      timingAdvice: 'íƒ€ì´ë°',
      actionPlan: 'ì‹¤í–‰ ê³„íš',
      conclusion: 'ìµœì¢… ìš´ì˜',
    }
    const title = domainName[section]
    const strengthLine = sText
      ? `${title}ì—ì„œëŠ” ${sText} ì‹ í˜¸ê°€ ì¶”ì§„ë ¥ì„ ë‹´ë‹¹í•˜ê³ ,`
      : `${title}ì—ì„œëŠ” ëšœë ·í•œ ì¶”ì§„ ì‹ í˜¸ë³´ë‹¤ ìš´ì˜ ê·œì¹™ì˜ ì¼ê´€ì„±ì´ ë” ì¤‘ìš”í•˜ê³ ,`
    const cautionLine = cText
      ? `${cText} ì‹ í˜¸ê°€ ë¹„ìš©ì´ ì»¤ì§€ëŠ” ì§€ì ì„ ì•Œë ¤ ì¤ë‹ˆë‹¤.`
      : 'ë¦¬ìŠ¤í¬ëŠ” ì£¼ë¡œ í™•ì¸ ì ˆì°¨ ëˆ„ë½ì—ì„œ ë°œìƒí•˜ê¸° ì‰½ìŠµë‹ˆë‹¤.'
    const balanceLine = bText
      ? `${bText} ì‹ í˜¸ê°€ ì™„ì¶© ì—­í• ì„ í•˜ë¯€ë¡œ, ì†ë„ì™€ ê²€ì¦ì˜ ê· í˜•ì„ ë§žì¶”ë©´ ì²´ê° ê²°ê³¼ê°€ ë¹ ë¥´ê²Œ ì•ˆì •ë©ë‹ˆë‹¤.`
      : 'ì™„ì¶© ì‹ í˜¸ê°€ ìž‘ë”ë¼ë„ ì°©ìˆ˜ì™€ í™•ì •ì„ ë¶„ë¦¬í•˜ë©´ ë³€ë™ í­ì„ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.'
    return `${strengthLine} ${cautionLine} ${balanceLine}`
  }

  const strengthLine = sText
    ? `${sText} drive momentum,`
    : 'Momentum is less about aggressive expansion,'
  const cautionLine = cText
    ? `while ${cText} mark cost-amplification points.`
    : 'while verification gaps remain the main risk source.'
  const balanceLine = bText
    ? `${bText} provide damping, so balancing speed with verification stabilizes outcomes.`
    : 'Even with weak damping signals, separating start from commitment reduces volatility.'
  return `${strengthLine} ${cautionLine} ${balanceLine}`
}

function buildSectionProtocolSentence(
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const lines: Record<keyof AIPremiumReport['sections'], string> = {
      introduction:
        'ì‹¤ë¬´ í”„ë¡œí† ì½œì€ ë‹¨ìˆœí•´ì•¼ ìž‘ë™í•©ë‹ˆë‹¤. ì˜¤ëŠ˜ ë°”ë¡œ ëë‚¼ í•µì‹¬ 1ê±´ì„ ë¨¼ì € ì •í•˜ê³ , ì™¸ë¶€ í™•ì •ì´ í•„ìš”í•œ ì¼ì€ ë°˜ë“œì‹œ ê²€í†  ìŠ¬ë¡¯ì„ ê±°ì³ ë‚´ë³´ë‚´ì„¸ìš”.',
      personalityDeep:
        'ì˜ì‚¬ê²°ì • í”„ë¡œí† ì½œì€ ê¸°ë¡ ì„ í–‰ìž…ë‹ˆë‹¤. ì¤‘ìš”í•œ ëŒ€í™” ë’¤ì—ëŠ” ìƒëŒ€ì™€ í•©ì˜í•œ í•µì‹¬ ì¡°ê±´ì„ í•œ ì¤„ë¡œ ë‚¨ê¸°ê³ , ë‹¤ìŒ ê²°ì •ì—ì„œ ê·¸ëŒ€ë¡œ ìž¬ì‚¬ìš©í•˜ì„¸ìš”.',
      careerPath:
        'ì»¤ë¦¬ì–´ í”„ë¡œí† ì½œì€ ì™„ê²°ë¥  ì¤‘ì‹¬ìž…ë‹ˆë‹¤. ì‹ ê·œ ì°©ìˆ˜ëŠ” ì œí•œí•˜ê³ , ì§„í–‰ ì¤‘ ê³¼ì œì˜ ì™„ë£Œ ê¸°ì¤€ì„ ëª…ì‹œí•œ ë’¤ ë‹«ì•„ì•¼ ë‹¤ìŒ ê¸°íšŒì˜ í˜‘ìƒë ¥ì´ ì˜¬ë¼ê°‘ë‹ˆë‹¤.',
      relationshipDynamics:
        'ê´€ê³„ í”„ë¡œí† ì½œì€ í•´ì„ ì¼ì¹˜ìž…ë‹ˆë‹¤. ê²°ë¡ ì„ ì œì‹œí•˜ê¸° ì „ì— ìƒëŒ€ê°€ ì´í•´í•œ ë‚´ìš©ê³¼ ë³¸ì¸ì´ ì˜ë„í•œ ë‚´ìš©ì„ í•œ ë²ˆ ë§žì¶”ë©´ ì¶©ëŒ ë¹„ìš©ì´ ê¸‰ê²©ížˆ ì¤„ì–´ë“­ë‹ˆë‹¤.',
      wealthPotential:
        'ìž¬ì • í”„ë¡œí† ì½œì€ ì¡°ê±´ ë¶„ë¦¬ ê²€í† ìž…ë‹ˆë‹¤. ê¸ˆì•¡, ê¸°í•œ, ì·¨ì†Œ ì¡°í•­ì„ ë¶„ë¦¬í•´ ì ê²€í•˜ê³  ë‹¹ì¼ í™•ì •ì„ ì¤„ì´ë©´ ì†ì‹¤ íšŒí”¼ìœ¨ì´ ë†’ì•„ì§‘ë‹ˆë‹¤.',
      healthGuidance:
        'ê±´ê°• í”„ë¡œí† ì½œì€ íšŒë³µ ì„ ë°°ì¹˜ìž…ë‹ˆë‹¤. ì—…ë¬´ëŸ‰ì„ ëŠ˜ë¦¬ê¸° ì „ì— ìˆ˜ë©´ê³¼ íšŒë³µ ì‹œê°„ì„ ë¨¼ì € ê³ ì •í•˜ë©´ ì²´ë ¥ íŽ¸ì°¨ê°€ ì¤„ê³  ì§‘ì¤‘ ì§€ì† ì‹œê°„ì´ ëŠ˜ì–´ë‚©ë‹ˆë‹¤.',
      lifeMission:
        'ìž¥ê¸° í”„ë¡œí† ì½œì€ ì£¼ê°„ ë³µê¸°ìž…ë‹ˆë‹¤. í•œ ì£¼ì˜ ì„ íƒì„ ì§§ê²Œ ê¸°ë¡í•˜ê³  ì›ì¸-ê²°ê³¼ë¥¼ ì—°ê²°í•´ ë³´ë©´, ë‹¤ìŒ ì„ íƒì˜ ì •ë°€ë„ê°€ í™•ì‹¤ížˆ ë†’ì•„ì§‘ë‹ˆë‹¤.',
      timingAdvice:
        'íƒ€ì´ë° í”„ë¡œí† ì½œì€ ë‹¨ê³„ ë¶„ë¦¬ìž…ë‹ˆë‹¤. ì°©ìˆ˜, ê²€í† , í™•ì •ì„ ê°™ì€ ë‚ ì— ëª°ì§€ ë§ê³  ë¶„ë¦¬í•˜ë©´ ìž‘ì€ ì˜¤ì°¨ê°€ í° ì†ì‹¤ë¡œ ë²ˆì§€ëŠ” ê²ƒì„ ë§‰ì„ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
      actionPlan:
        '2ì£¼ ì‹¤í–‰ í”„ë¡œí† ì½œì€ ì™„ë£Œ 1ê±´, ê²€í†  1ê±´, ë³´ë¥˜ 1ê±´ì˜ ë°˜ë³µìž…ë‹ˆë‹¤. ì´ êµ¬ì¡°ë¥¼ ìœ ì§€í•˜ë©´ ì‹¤í–‰ í”¼ë¡œë¥¼ ì¤„ì´ë©´ì„œë„ ëˆ„ì  ì„±ê³¼ë¥¼ ì•ˆì •ì ìœ¼ë¡œ ì˜¬ë¦´ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.',
      conclusion:
        'ë§ˆì§€ë§‰ í”„ë¡œí† ì½œì€ ë™ì¼í•©ë‹ˆë‹¤. ë¹ ë¥¸ ê²°ë¡ ë³´ë‹¤ ê²€ì¦ëœ ê²°ë¡ ì„ ì„ íƒí•˜ê³ , ê°™ì€ ìš´ì˜ ê·œì¹™ì„ ë°˜ë³µí•´ ê²°ê³¼ì˜ ìž¬í˜„ì„±ì„ ë†’ì´ì„¸ìš”.',
    }
    return lines[section]
  }

  const linesEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction:
      'Keep the protocol simple: lock one must-finish item first, then route externally committing items through a review slot.',
    personalityDeep:
      'Use a record-first protocol: after key conversations, store one-line agreement terms and reuse them in the next decision.',
    careerPath:
      'Use completion-first protocol: limit new intake, define done-criteria, then close in-flight work before expansion.',
    relationshipDynamics:
      'Use alignment-first protocol: synchronize interpretation before conclusions to cut conflict costs.',
    wealthPotential:
      'Use term-split protocol: validate amount, deadline, and cancellation separately before commitment.',
    healthGuidance:
      'Use recovery-first protocol: lock sleep and recovery blocks before scaling workload.',
    lifeMission:
      'Use weekly review protocol: map choice-cause-result to improve precision of next steps.',
    timingAdvice:
      'Use stage-separation protocol: avoid collapsing start, review, and commitment into one window.',
    actionPlan:
      'Use a two-week loop of one completion, one review, and one defer item to keep execution sustainable.',
    conclusion:
      'Final protocol is unchanged: verified commitments outperform fast commitments over time.',
  }
  return linesEn[section]
}

function formatActionSentence(claims: SynthesizedClaim[], lang: 'ko' | 'en'): string {
  const controls = claims
    .map((claim) => claim.riskControl)
    .filter(Boolean)
    .slice(0, 3)
  const actions = claims
    .flatMap((claim) => claim.actions || [])
    .filter(Boolean)
    .slice(0, 3)
  const plan = [...new Set([...controls, ...actions])].slice(0, 3).join(' ')

  if (lang === 'ko') {
    return (
      plan ||
      'ê²°ì •ê³¼ ì‹¤í–‰ ì‹œì ì„ ë¶„ë¦¬í•˜ê³  ì™¸ë¶€ í™•ì • ì „ì— ìž¬í™•ì¸ ë‹¨ê³„ë¥¼ ê³ ì •í•˜ì„¸ìš”.'
    )
  }
  return plan || 'Split decision and execution timing, then lock a recheck step before commitment.'
}

function formatTimingGrounding(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const daeun = input.currentDaeunElement
  const saeun = input.currentSaeunElement
  if (lang === 'ko') {
    if (daeun || saeun) {
      return `í˜„ìž¬ ëŒ€ìš´ ${daeun || 'ë¯¸í™•ì¸'}ê³¼ ì„¸ìš´ ${saeun || 'ë¯¸í™•ì¸'} ê¸°ì¤€ìœ¼ë¡œ, ê²°ë¡ ê³¼ ì‹¤í–‰ ì‹œì ì„ ë¶„ë¦¬í•´ ìš´ì˜í•˜ëŠ” ë°©ì‹ì´ ì•ˆì •ì ìž…ë‹ˆë‹¤.`
    }
    return 'ëŒ€ìš´Â·ì„¸ìš´ ì •ë³´ê°€ ì œí•œì ì´ë¯€ë¡œ ë‹¹ì¼ í™•ì •ë³´ë‹¤ 24ì‹œê°„ ìž¬í™•ì¸ ì°½ì„ ë‘ëŠ” ë³´ìˆ˜ ìš´ì˜ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.'
  }
  if (daeun || saeun) {
    return `With Daeun ${daeun || 'unknown'} and Seun ${saeun || 'unknown'}, separate decision timing from execution timing.`
  }
  return 'With limited Daeun/Seun coverage, use a conservative 24-hour recheck before commitment.'
}

function sectionLeadSentence(
  section: keyof AIPremiumReport['sections'],
  leadClaim: SynthesizedClaim,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const dedupedThesis = leadClaim.thesis.replace(
      /^(ì„±í–¥|ì»¤ë¦¬ì–´|ê´€ê³„|ìž¬ì •|ê±´ê°•|ìž¥ê¸° ë°©í–¥|íƒ€ì´ë°|ì‹¤í–‰ ì„¤ê³„|ìµœì¢… ìš”ì•½|ê´€ê³„ ì˜ì—­|ì»¤ë¦¬ì–´ ì˜ì—­|ìž¬ì • ì˜ì—­|í˜„ìž¬ êµ¬ê°„ì˜ í•µì‹¬)\s*(ì—ì„œëŠ”|ì€|ëŠ”)\s*/u,
      ''
    )
    return `${SECTION_LEAD_KO[section]} ${dedupedThesis}`.trim()
  }
  return `${fallbackTitle(section, lang)}: ${leadClaim.thesis}`
}

function sectionSupportSentence(
  leadClaim: SynthesizedClaim,
  section: keyof AIPremiumReport['sections'],
  supportClaim: SynthesizedClaim | undefined,
  lang: 'ko' | 'en'
): string {
  if (!supportClaim || supportClaim.thesis === leadClaim.thesis) return ''
  if (lang === 'ko') {
    return `${SECTION_SUPPORT_PREFIX_KO[section]} ${supportClaim.thesis}`
  }
  return `Secondary track: ${supportClaim.thesis}`
}

function renderSection(
  section: keyof AIPremiumReport['sections'],
  input: NarrativeInput,
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): string {
  const orderedClaims = sortClaimsForSection(input.synthesis.claims, section)
  const domains = SECTION_DOMAINS[section]
  const leadClaim = pickLeadClaim(orderedClaims, usedClaimIds, usedTheses)
  const supportClaim = leadClaim
    ? pickSupportClaim(leadClaim, orderedClaims, domains, usedClaimIds, usedTheses)
    : undefined
  const title = fallbackTitle(section, input.lang)
  const lifeJourneyLine = buildLifeJourneyNarrative(input, section)

  const minChars = getSectionMinChars(section, input.lang)
  const sectionPad =
    input.lang === 'ko' ? SECTION_MIN_FILL_KO[section] : SECTION_MIN_FILL_EN[section]

  if (!leadClaim) {
    const lowSignal = buildLowSignalFallbackSection(section, title, input.matrixInput, input.lang)
    if (lowSignal.length >= minChars) return lowSignal
    return expandToMinChars(
      lowSignal,
      minChars,
      uniqueLines([
        lifeJourneyLine,
        sectionPad,
        buildSectionExecutionSentence(section, input.lang),
        buildSectionProtocolSentence(section, input.lang),
      ]),
      section,
      input.lang
    )
  }

  usedClaimIds.add(leadClaim.claimId)
  usedTheses.add(normalizeTextKey(leadClaim.thesis))
  if (supportClaim) {
    usedClaimIds.add(supportClaim.claimId)
    usedTheses.add(normalizeTextKey(supportClaim.thesis))
  }

  const thesisLine = sectionLeadSentence(section, leadClaim, input.lang)
  const supportLine = sectionSupportSentence(leadClaim, section, supportClaim, input.lang)
  const evidenceLine = formatEvidenceSentence(
    input.synthesis,
    [leadClaim, ...(supportClaim ? [supportClaim] : [])],
    input.lang
  )
  const claimSignals = gatherClaimSignals(input.synthesis, [
    leadClaim,
    ...(supportClaim ? [supportClaim] : []),
  ])
  const insightLine = buildSectionInsightSentence(section, claimSignals, input.lang)
  const deepDiveLine = buildSectionDeepDiveSentence(section, claimSignals, input.lang)
  const actionLine = formatActionSentence(
    [leadClaim, ...(supportClaim ? [supportClaim] : [])],
    input.lang
  )
  const protocolLine = buildSectionProtocolSentence(section, input.lang)
  const executionLine = buildSectionExecutionSentence(section, input.lang)
  const timingLine =
    section === 'timingAdvice' ? formatTimingGrounding(input.matrixInput, input.lang) : ''

  const bySectionOrder: Record<keyof AIPremiumReport['sections'], string[]> = {
    introduction: uniqueLines([
      thesisLine,
      evidenceLine,
      insightLine,
      lifeJourneyLine,
      actionLine,
      executionLine,
    ]),
    personalityDeep: uniqueLines([
      thesisLine,
      supportLine,
      evidenceLine,
      deepDiveLine,
      actionLine,
      executionLine,
    ]),
    careerPath: uniqueLines([
      thesisLine,
      supportLine,
      evidenceLine,
      insightLine,
      deepDiveLine,
      actionLine,
      protocolLine,
    ]),
    relationshipDynamics: uniqueLines([
      thesisLine,
      supportLine,
      evidenceLine,
      deepDiveLine,
      actionLine,
      protocolLine,
    ]),
    wealthPotential: uniqueLines([
      thesisLine,
      evidenceLine,
      insightLine,
      deepDiveLine,
      actionLine,
      protocolLine,
    ]),
    healthGuidance: uniqueLines([
      thesisLine,
      evidenceLine,
      deepDiveLine,
      actionLine,
      executionLine,
    ]),
    lifeMission: uniqueLines([thesisLine, evidenceLine, lifeJourneyLine, deepDiveLine, actionLine]),
    timingAdvice: uniqueLines([
      thesisLine,
      evidenceLine,
      timingLine,
      insightLine,
      actionLine,
      protocolLine,
    ]),
    actionPlan: uniqueLines([thesisLine, evidenceLine, actionLine, protocolLine, executionLine]),
    conclusion: uniqueLines([thesisLine, evidenceLine, lifeJourneyLine, actionLine, executionLine]),
  }

  const merged = bySectionOrder[section]
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (merged.length >= minChars) return merged

  return expandToMinChars(
    merged,
    minChars,
    uniqueLines([sectionPad, deepDiveLine, lifeJourneyLine, protocolLine, executionLine]),
    section,
    input.lang
  )
}
export function generateNarrativeSectionsFromSynthesis(
  input: NarrativeInput
): AIPremiumReport['sections'] {
  const usedClaimIds = new Set<string>()
  const usedTheses = new Set<string>()

  return {
    introduction: renderSection('introduction', input, usedClaimIds, usedTheses),
    personalityDeep: renderSection('personalityDeep', input, usedClaimIds, usedTheses),
    careerPath: renderSection('careerPath', input, usedClaimIds, usedTheses),
    relationshipDynamics: renderSection('relationshipDynamics', input, usedClaimIds, usedTheses),
    wealthPotential: renderSection('wealthPotential', input, usedClaimIds, usedTheses),
    healthGuidance: renderSection('healthGuidance', input, usedClaimIds, usedTheses),
    lifeMission: renderSection('lifeMission', input, usedClaimIds, usedTheses),
    timingAdvice: renderSection('timingAdvice', input, usedClaimIds, usedTheses),
    actionPlan: renderSection('actionPlan', input, usedClaimIds, usedTheses),
    conclusion: renderSection('conclusion', input, usedClaimIds, usedTheses),
  }
}
