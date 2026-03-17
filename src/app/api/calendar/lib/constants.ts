/**
 * Calendar message constants
 */

import type { EventCategory } from '@/lib/destiny-map/destinyCalendar'

type CategoryMessages = Record<EventCategory | 'general', string>

export const KO_MESSAGES = {
  GRADE_0: {
    career: 'í•µì‹¬ ê³„ì•½ê³¼ ì—­í•  ì¡°ì •ì— íž˜ì´ ì‹¤ë¦¬ëŠ” ë‚ ìž…ë‹ˆë‹¤. ë‹¤ë§Œ ë§ˆì§€ë§‰ ì¡°ê±´ í™•ì¸ì€ ë‚¨ê²¨ ë‘ì„¸ìš”.',
    wealth: 'ìž¬ì • íŒë‹¨ì˜ ì£¼ë„ê¶Œì´ ì˜¬ë¼ì˜¤ëŠ” ë‚ ìž…ë‹ˆë‹¤. í™•ìž¥ë³´ë‹¤ ê¸°ì¤€ì„ ìž¡ê³  ì‹¤í–‰í•˜ëŠ” íŽ¸ì´ ì¢‹ìŠµë‹ˆë‹¤.',
    love: 'ê´€ê³„ì—ì„œ ì§„ì „ì‹œí‚¤ê¸° ì¢‹ì€ íë¦„ìž…ë‹ˆë‹¤. ì¤‘ìš”í•œ í‘œí˜„ì€ ì§§ê³  ë¶„ëª…í•˜ê²Œ ê°€ì ¸ê°€ì„¸ìš”.',
    health: 'ì—ë„ˆì§€ê°€ ì˜¬ë¼ì˜¤ëŠ” ë‚ ìž…ë‹ˆë‹¤. ë¬´ë¦¬í•œ ë„ì „ë³´ë‹¤ ë¦¬ë“¬ì„ ì‚´ë¦¬ëŠ” ì‹¤í–‰ì´ ìž˜ ë§žìŠµë‹ˆë‹¤.',
    travel: 'ì´ë™ê³¼ ë³€í™”ê°€ ìž˜ ë¶™ëŠ” ë‚ ìž…ë‹ˆë‹¤. ì¼ì •ê³¼ ì¡°ê±´ì„ ì •ë¦¬í•œ ë’¤ ì›€ì§ì´ë©´ íš¨ìœ¨ì´ ë†’ìŠµë‹ˆë‹¤.',
    study: 'ì§‘ì¤‘ë ¥ê³¼ í¡ìˆ˜ë ¥ì´ ì¢‹ì€ ë‚ ìž…ë‹ˆë‹¤. í•œ ë²ˆì— ë§Žì´ë³´ë‹¤ í•µì‹¬ í•œë‘ ê°€ì§€ë¥¼ ëë‚´ì„¸ìš”.',
    general: 'ì‹¤í–‰ ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. í•µì‹¬ 1~2ê°œë¥¼ ì•žë‹¹ê²¨ ì²˜ë¦¬í•˜ë©´ ì²´ê° ì„±ê³¼ê°€ í½ë‹ˆë‹¤.',
  } as CategoryMessages,

  GRADE_1: {
    career: 'ì»¤ë¦¬ì–´ íë¦„ì´ ì‚´ì•„ ìžˆëŠ” ë‚ ìž…ë‹ˆë‹¤. í•©ì˜ì™€ í™•ì¸ì„ ë¼ì›Œ ë„£ìœ¼ë©´ ì„±ê³¼ê°€ ì•ˆì •ë©ë‹ˆë‹¤.',
    wealth: 'ìž¬ì • íë¦„ì€ ìš°í˜¸ì ì´ì§€ë§Œ ê²€í† ë¥¼ ë³‘í–‰í• ìˆ˜ë¡ ê²°ê³¼ê°€ ì¢‹ì•„ì§‘ë‹ˆë‹¤.',
    love: 'ê´€ê³„ íë¦„ì´ ë¶€ë“œëŸ½ìŠµë‹ˆë‹¤. ëŒ€í™” í•œ ê±´ì„ ì œëŒ€ë¡œ ë§ˆë¬´ë¦¬í•˜ëŠ” ë° ìœ ë¦¬í•©ë‹ˆë‹¤.',
    health: 'í™œë™ì„±ì€ ì¢‹ì€ íŽ¸ìž…ë‹ˆë‹¤. ìƒˆ ë£¨í‹´ì€ ê°€ë³ê²Œ ì‹œìž‘í•˜ê³  ê³¼ì—´ë§Œ í”¼í•˜ì„¸ìš”.',
    travel: 'ì´ë™ì€ ë¬´ë‚œí•˜ê²Œ í’€ë¦´ ê°€ëŠ¥ì„±ì´ ë†’ìŠµë‹ˆë‹¤. ì¦‰í¥ì„±ë³´ë‹¤ ì¤€ë¹„ëœ ì´ë™ì´ ë” ë‚«ìŠµë‹ˆë‹¤.',
    study: 'í•™ìŠµê³¼ ì •ë¦¬ì— ìœ ë¦¬í•œ ë‚ ìž…ë‹ˆë‹¤. ë³µìŠµê³¼ ë§ˆê° ì •ë¦¬ë¥¼ í•¨ê»˜ ê°€ì ¸ê°€ì„¸ìš”.',
    general: 'í™œìš© ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. ê¸°íšŒë¥¼ ìž¡ë˜ ê²€ì¦ ë‹¨ê³„ë¥¼ ë¹¼ì§€ ì•ŠëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤.',
  } as CategoryMessages,

  GRADE_2_HIGH: {
    career: 'ì‹¤ë¬´í˜• ìš´ì˜ì— ì í•©í•œ ë‚ ìž…ë‹ˆë‹¤. ìƒˆ í™•ìž¥ë³´ë‹¤ í˜„ìž¬ ê³¼ì œë¥¼ ì •ë¦¬í•˜ëŠ” íŽ¸ì´ ë‚«ìŠµë‹ˆë‹¤.',
    wealth: 'ëˆ íë¦„ì€ ë¬´ë‚œí•©ë‹ˆë‹¤. í° ë² íŒ…ë³´ë‹¤ ê´€ë¦¬ì™€ ë¹„êµ ê²€í† ê°€ ìž˜ ë§žìŠµë‹ˆë‹¤.',
    love: 'ê´€ê³„ëŠ” ìž”ìž”í•œ íë¦„ìž…ë‹ˆë‹¤. ê¸°ëŒ€ì¹˜ë¥¼ ë§žì¶”ê³  ì˜¤í•´ë¥¼ ì¤„ì´ëŠ” ëŒ€í™”ê°€ ì¢‹ìŠµë‹ˆë‹¤.',
    health: 'ì»¨ë””ì…˜ì€ ë³´í†µìž…ë‹ˆë‹¤. ê°•ë„ë³´ë‹¤ íšŒë³µ ë¦¬ë“¬ì„ ì±™ê¸°ë©´ ì•ˆì •ì ìž…ë‹ˆë‹¤.',
    travel: 'ì§§ì€ ì´ë™ê³¼ ì¼ì • ì¡°ì •ì€ ê´œì°®ìŠµë‹ˆë‹¤. ë³€ìˆ˜ í™•ì¸ì„ ë¨¼ì € í•´ë‘ì„¸ìš”.',
    study: 'ê¾¸ì¤€í•¨ì´ ì´ê¸°ëŠ” ë‚ ìž…ë‹ˆë‹¤. ìµìˆ™í•œ ë£¨í‹´ì„ ìœ ì§€í•˜ëŠ” íŽ¸ì´ íš¨ìœ¨ì ìž…ë‹ˆë‹¤.',
    general: 'ìš´ì˜ ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. íë¦„ì€ ë¬´ë‚œí•˜ì§€ë§Œ ì†ë„ë³´ë‹¤ ì •ë¦¬ê°€ ë” ì¤‘ìš”í•©ë‹ˆë‹¤.',
  } as CategoryMessages,

  GRADE_2_LOW: 'ìš´ì˜ ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. í° í™•ëŒ€ë³´ë‹¤ ì²´í¬ë¦¬ìŠ¤íŠ¸ ê¸°ë°˜ìœ¼ë¡œ ì •ë¦¬í•˜ëŠ” íŽ¸ì´ ì¢‹ìŠµë‹ˆë‹¤.',

  GRADE_3: {
    career: 'ê²€í†  ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. ê²°ì •ì€ ë¶„í• í•˜ê³  ì „ë‹¬ ë‚´ìš©ì€ í•œ ë²ˆ ë” í™•ì¸í•˜ì„¸ìš”.',
    wealth: 'ê¸ˆì „ íŒë‹¨ì€ ë³´ìˆ˜ì ìœ¼ë¡œ ê°€ëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤. ì¡°ê±´ ê²€í†  ì „ ì§‘í–‰ì€ í”¼í•˜ì„¸ìš”.',
    love: 'ê´€ê³„ëŠ” ì˜ˆë¯¼í•  ìˆ˜ ìžˆìŠµë‹ˆë‹¤. ë°˜ì‘ë³´ë‹¤ í™•ì¸ì´ ë¨¼ì €ìž…ë‹ˆë‹¤.',
    health: 'íšŒë³µ ì‹ í˜¸ë¥¼ ìš°ì„  ë´ì•¼ í•©ë‹ˆë‹¤. ë¬´ë¦¬í•œ ì¼ì •ì€ ì¤„ì´ëŠ” íŽ¸ì´ ë‚«ìŠµë‹ˆë‹¤.',
    travel: 'ì´ë™ ë³€ìˆ˜ ì ê²€ì´ í•„ìš”í•œ ë‚ ìž…ë‹ˆë‹¤. ì‹œê°„ê³¼ ë™ì„ ì„ ì—¬ìœ  ìžˆê²Œ ìž¡ìœ¼ì„¸ìš”.',
    study: 'ì§‘ì¤‘ì´ í”ë“¤ë¦´ ìˆ˜ ìžˆìŠµë‹ˆë‹¤. ê¸¸ê²Œ ë²„í‹°ê¸°ë³´ë‹¤ ì§§ê²Œ ëŠì–´ ê°€ì„¸ìš”.',
    general: 'ê²€í†  ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. ì†ë„ë³´ë‹¤ ìž¬í™•ì¸ê³¼ ë¦¬ìŠ¤í¬ ê´€ë¦¬ê°€ ì¤‘ìš”í•©ë‹ˆë‹¤.',
  } as CategoryMessages,

  GRADE_4: {
    career: 'ë°©ì–´ ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. ë¹„ê°€ì—­ ê²°ì •ì€ ë¯¸ë£¨ê³  ì†ì‹¤ ë°©ì§€ë¶€í„° í•˜ì„¸ìš”.',
    wealth: 'ìž¬ì •ì€ ì§€í‚¤ëŠ” ìš´ì˜ì´ ìš°ì„ ìž…ë‹ˆë‹¤. í° ê³„ì•½ì´ë‚˜ ì§‘í–‰ì€ ë³´ë¥˜í•˜ëŠ” íŽ¸ì´ ë‚«ìŠµë‹ˆë‹¤.',
    love: 'ê°ì •ì  í™•ì •ì€ í”¼í•´ì•¼ í•˜ëŠ” ë‚ ìž…ë‹ˆë‹¤. ê±°ë¦¬ ì¡°ì ˆê³¼ ë¬¸ìž¥ í™•ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤.',
    health: 'íšŒë³µì„ ìš°ì„ ì— ë‘ì–´ì•¼ í•©ë‹ˆë‹¤. ë¬´ë¦¬í•œ ê°•í–‰ì€ í”¼í•˜ì„¸ìš”.',
    travel: 'ìž¥ê±°ë¦¬ë‚˜ ê¸‰í•œ ì´ë™ì€ ë³´ìˆ˜ì ìœ¼ë¡œ íŒë‹¨í•˜ëŠ” íŽ¸ì´ ì•ˆì „í•©ë‹ˆë‹¤.',
    study: 'ì„±ê³¼ ì••ë°•ë³´ë‹¤ ë¦¬ë“¬ íšŒë³µì´ ë¨¼ì €ìž…ë‹ˆë‹¤. ì¼ì • ì¶•ì†Œê°€ ë” ë‚˜ì€ ê²°ê³¼ë¥¼ ì¤ë‹ˆë‹¤.',
    general: 'ë°©ì–´ ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. ìƒˆë¡œ ë²Œì´ê¸°ë³´ë‹¤ ì§€í‚¤ê³  ë¯¸ë£¨ê³  ê²€í† í•˜ëŠ” íŽ¸ì´ ë§žìŠµë‹ˆë‹¤.',
  } as CategoryMessages,

  GRADE_5: {
    career: 'ë°©ì–´ ìš°ì„  êµ¬ê°„ìž…ë‹ˆë‹¤. ê³µì‹ í™•ì •ê³¼ í° ì»¤ë¦¬ì–´ ê²°ì •ì€ ë‹¤ë¥¸ ì°½ìœ¼ë¡œ ë„˜ê¸°ì„¸ìš”.',
    wealth: 'ì†ì‹¤ ë°©ì§€ê°€ ìµœìš°ì„ ìž…ë‹ˆë‹¤. íˆ¬ìžÂ·ê³„ì•½Â·í° ì§€ì¶œì€ ë³´ë¥˜í•˜ëŠ” íŽ¸ì´ ë‚«ìŠµë‹ˆë‹¤.',
    love: 'ê´€ê³„ í™•ì •ë³´ë‹¤ ê°ì • ì•ˆì •ì´ ìš°ì„ ìž…ë‹ˆë‹¤. ì˜¤í•´ê°€ ì»¤ì§€ì§€ ì•Šê²Œ ì†ë„ë¥¼ ë‚®ì¶”ì„¸ìš”.',
    health: 'ê°•í–‰ë³´ë‹¤ íœ´ì‹ê³¼ íšŒë³µì´ ìš°ì„ ìž…ë‹ˆë‹¤. ê²½ê³  ì‹ í˜¸ë¥¼ ë¬´ì‹œí•˜ì§€ ë§ˆì„¸ìš”.',
    travel: 'ì´ë™ì€ ê¼­ í•„ìš”í•œ ë²”ìœ„ë¡œ ì¤„ì´ê³  ë³€ìˆ˜ ëŒ€ì‘ì„ ë¨¼ì € ì¤€ë¹„í•˜ì„¸ìš”.',
    study: 'ë¬´ë¦¬í•œ ëª©í‘œë³´ë‹¤ ìµœì†Œ ë£¨í‹´ ìœ ì§€ê°€ ë” ì¤‘ìš”í•©ë‹ˆë‹¤.',
    general: 'ê°•í•œ ë°©ì–´ êµ¬ê°„ìž…ë‹ˆë‹¤. í™•ì •ë³´ë‹¤ ë³´ë¥˜, í™•ìž¥ë³´ë‹¤ ì •ë¹„ê°€ ë§žëŠ” ë‚ ìž…ë‹ˆë‹¤.',
  } as CategoryMessages,
} as const

export const EN_MESSAGES = {
  GRADE_0: {
    career: 'Execution window for contracts and role moves. Keep one final verification step.',
    wealth: 'Financial initiative is strong. Set criteria first, then act.',
    love: 'Relationship momentum supports progress. Keep key messages short and clear.',
    health: 'Energy is up. Favor rhythm-based action over overexertion.',
    travel: 'Movement and change are supported. Lock timing and conditions first.',
    study: 'Focus and absorption are strong. Finish one or two core items.',
    general: 'Execute-first window. Pull forward one or two priorities.',
  } as CategoryMessages,

  GRADE_1: {
    career: 'Career flow is supportive. Add checkpoints and alignment steps.',
    wealth: 'Finance is workable, but review improves outcomes.',
    love: 'Relationship flow is smoother. Good for one clear conversation.',
    health: 'Activity is supported. Start light and avoid overheating.',
    travel: 'Movement is workable. Prepared movement beats impulsive movement.',
    study: 'Good for study and cleanup. Pair review with completion.',
    general: 'Leverage-first window. Use momentum, but keep verification in place.',
  } as CategoryMessages,

  GRADE_2_HIGH: {
    career: 'A practical operating day. Prioritize completion over expansion.',
    wealth: 'Finance is neutral. Management beats risk-taking.',
    love: 'Relationship flow is steady. Align expectations first.',
    health: 'Condition is moderate. Recovery rhythm matters more than intensity.',
    travel: 'Short movement is workable. Check variables first.',
    study: 'Consistency wins today. Stay with the routine.',
    general: 'Operate-first window. Stable flow, but structure matters more than speed.',
  } as CategoryMessages,

  GRADE_2_LOW: 'Operate-first window. Use checklists and avoid over-expansion.',

  GRADE_3: {
    career: 'Review-first window. Split decisions and recheck communication.',
    wealth: 'Take a conservative financial stance. Review terms before acting.',
    love: 'Relationship flow is sensitive. Confirmation beats reaction.',
    health: 'Recovery signals matter. Reduce overload.',
    travel: 'Movement needs review. Keep time and route margins.',
    study: 'Focus may wobble. Work in shorter blocks.',
    general: 'Review-first window. Verification matters more than speed.',
  } as CategoryMessages,

  GRADE_4: {
    career: 'Protect-first window. Delay irreversible decisions and guard against loss.',
    wealth: 'Protect capital first. Large commitments should wait.',
    love: 'Avoid emotional finality. Slow the pace and verify wording.',
    health: 'Recovery comes first. Avoid forcing the schedule.',
    travel: 'Judge movement conservatively and prepare for variability.',
    study: 'Reduce pressure and keep only the minimum viable routine.',
    general: 'Protect-first window. Defer, reduce, and stabilize.',
  } as CategoryMessages,

  GRADE_5: {
    career: 'Strong protect-first window. Move formal commitments to another window.',
    wealth: 'Loss prevention is primary. Hold off on large financial action.',
    love: 'Stabilize emotions before making relational calls.',
    health: 'Rest and recovery take priority over effort.',
    travel: 'Reduce movement to essential cases and prepare contingencies.',
    study: 'Minimum routine matters more than ambitious output.',
    general: 'Strong defensive window. Stabilize before you expand.',
  } as CategoryMessages,
} as const

