import type {
  EngineLanguage,
  QuestionSubject,
  QuestionTimeframe,
  QuestionTone,
  TarotQuestionIntent,
} from './questionEngineV2Support'
import { repairMojibakeText } from '@/lib/text/mojibake'

function normalizeHeuristicText(text: string) {
  return repairMojibakeText(text).toLowerCase()
}
export function hasPattern(text: string, patterns: RegExp[]) {
  const normalized = normalizeHeuristicText(text)
  return patterns.some((pattern) => pattern.test(text) || pattern.test(normalized))
}

export function hasRelationshipSignal(questionVariants: string[]) {
  const joined = normalizeHeuristicText(questionVariants.join(' '))
  return /(우리\s*관계|결국\s*우리는|우리는\s*어떻게|관계|사이|연애|결혼|사귀|만나는\s*사람|썸|애인|남자친구|여자친구|남친|여친|배우자|소개팅|헤어진\s*사람|전\s*연인|전남친|전여친|커플|부부|인연|새\s*사람|싱글\s*탈출|팔로우|언팔로우|프로필|스토리|relationship|dating|marriage|partner)/.test(
    joined
  )
}

export function hasSelfDecisionSignal(questionVariants: string[]) {
  const joined = normalizeHeuristicText(questionVariants.join(' '))
  return /(내가.*(해야|해도|하면|움직이면|연락하면|사과하면|고백하면|선택하면|기다리면)|(하는\s*게|하는게|해도|가도|믿어도|사인해도|이어가도|그만둬도|쉬는\s*게|참고\s*기다리면)\s*(맞아|맞을까|나아|괜찮을까|될까)|먼저\s*연락|할지\s*말지|해야\s*할까|해야\s*돼|should i|shall i|can i|may i|not sure if i should)/.test(
    joined
  )
}

export function isCareerQuestion(text: string) {
  const normalized = normalizeHeuristicText(text)
  return /(\uC9C1\uC7A5|\uC774\uC9C1|\uD1F4\uC0AC|\uD68C\uC0AC|\uCEE4\uB9AC\uC5B4|\uCDE8\uC5C5|\uBA74\uC811|\uC2DC\uD5D8|\uD569\uACA9|\uD504\uB85C\uC81D\uD2B8|\uD68C\uC758|\uD611\uC5C5|\uBC1C\uD45C|job|career|work|interview|exam|project|meeting)/i.test(
    normalized
  )
}

export function isMoneyQuestion(text: string) {
  const normalized = normalizeHeuristicText(text)
  return /(\uB3C8|\uC7AC\uC815|\uAE08\uC804|\uB9E4\uCD9C|\uC218\uC785|\uC9C0\uCD9C|\uD22C\uC790|\uACC4\uC57D|\uAC70\uB798|\uC0AC\uC5C5|\uC7AC\uBB3C|finance|money|investment|contract|deal|business|sales)/i.test(
    normalized
  )
}

export function isHealthQuestion(text: string) {
  const normalized = normalizeHeuristicText(text)
  return /(\uAC74\uAC15|\uBAB8|\uCEE8\uB514\uC158|\uD68C\uBCF5|\uC5D0\uB108\uC9C0|\uC2A4\uD2B8\uB808\uC2A4|\uBC88\uC544\uC6C3|\uC2EC\uC2E0|\uC6F0\uBE59|health|body|condition|energy|burnout|well-being|wellbeing)/i.test(
    normalized
  )
}

export function detectQuestionIntent(questionVariants: string[]): TarotQuestionIntent {
  const joined = questionVariants
    .map((variant) => normalizeHeuristicText(variant).replace(/\s+/g, ' ').trim())
    .join(' || ')

  const reconciliationPatterns = [
    /\uC7AC\uD68C/,
    /\uB2E4\uC2DC\s*\uB9CC\uB098/,
    /\uB2E4\uC2DC\s*\uC774\uC5B4\uC9C8/,
    /\uC7AC\uC811\uCD09/,
    /\uB3CC\uC544\uC624/,
    /\uBCF5\uD569/,
    /\uD5E4\uC5B4\uC84C/,
    /\uD5E4\uC5B4\uC9C4/,
    /get back together/,
    /reconcil/,
    /come back/,
    /ex\b/,
  ]
  if (hasPattern(joined, reconciliationPatterns)) {
    return 'reconciliation'
  }

  const innerFeelingPatterns = [
    /속마음/,
    /그 사람 마음/,
    /상대(방)? 마음/,
    /어떻게 생각/,
    /좋아하/,
    /관심 있/,
    /미련 남/,
    /마음 정리했/,
    /날 어떻게 보/,
    /눈에 내가 어때/,
    /의식해/,
    /관심 있는 사람/,
    /관심 있어할까/,
    /간보는 걸까/,
    /재고 있는 걸까/,
    /어장관리하는 걸까/,
    /혼자 착각하는 걸까/,
    /\uBBF8\uB828 \uC788/,
    /\uC228\uAE30\uB294 \uAC10\uC815/,
    /\uC2DD\uC740 \uAC78\uAE4C/,
    /\uB098\uB97C \uC5B4\uB5BB\uAC8C \uBCF4/,
    /\uC65C .*?\uAC70\uB9AC \uB450/,
    /\uC65C .*?\uC77D\uC539/,
    /feelings?/,
    /feel about me/,
    /think of me/,
    /into me/,
  ]
  if (hasPattern(joined, innerFeelingPatterns)) {
    return 'inner_feelings'
  }

  if (
    /(\uC0DD\uAC01\uD574\??|\uAC70\uB9AC\s*\uB450\uB294\uC9C0|\uBBF8\uB828\s*\uC788\uC5B4\??|\uC228\uAE30\uB294\s*\uAC10\uC815|\uB9C8\uC74C\uC774\s*\uC2DD\uC740\s*\uAC78\uAE4C)/.test(
      joined
    )
  ) {
    return 'inner_feelings'
  }
  if (
    hasStrongOtherSubjectSignal(questionVariants) &&
    /(\uC88B\uC544\uD574\??|\uC88B\uC544\uD568\??|\uBBF8\uB828\s*\uB0A8|\uB0A0\s*\uC5B4\uB5BB\uAC8C\s*\uBCF4)/.test(
      joined
    )
  ) {
    return 'inner_feelings'
  }

  const timingPatterns = [
    /언제/,
    /시기/,
    /타이밍/,
    /몇 월/,
    /\bwhen\b/,
    /\btiming\b/,
    /what time/,
    /right moment/,
    /best time/,
  ]
  if (hasPattern(joined, timingPatterns)) {
    return 'timing'
  }
  if (
    /(\uB2E4\uC2DC\s*\uB9CC\uB0A0|\uB2E4\uC2DC\s*\uC62C\uAE4C|\uC7AC\uD68C|\uB3CC\uC544\uC62C|\uC7AC\uC811\uCD09)/.test(joined) &&
    /(\uADF8\s*\uC0AC\uB78C|\uC0C1\uB300|\uD5E4\uC5B4\uC9C4\s*\uC0AC\uB78C|\uC804\s*\uC5F0\uC778|\uC804\uB0A8\uCE5C|\uC804\uC5EC\uCE5C|partner|ex)/.test(joined)
  ) {
    return 'reconciliation'
  }
  if (/(\uCC28\uB2E8\s*\uD480\uB9AC\uBA74.*\uB2E4\uC2DC\s*\uC62C\uAE4C)/.test(joined)) {
    return 'reconciliation'
  }
  if (/(\uC6B0\uB9AC\s*\uB2E4\uC2DC\s*\uB420\uAE4C|\uC6B0\uB9AC\s*\uB2E4\uC2DC\s*\uB418\uB0D0)/.test(joined)) {
    return 'reconciliation'
  }
  if (
    /(\uC378.*\uB2E4\uC2DC\s*\uBD99\uC744\uAE4C|\uC378\uC774\s*\uB05D\uB09C\s*\uC0C1\uD0DC.*\uB2E4\uC2DC\s*\uBD99\uC744\uAE4C|\uC77D\uC539.*\uB2E4\uC2DC\s*\uC62C\uAE4C|\uC77D\uACE0\s*\uB2F5\uC7A5\uD558\uC9C0\s*\uC54A\uC74C.*\uB2E4\uC2DC\s*\uC62C\uAE4C)/.test(
      joined
    )
  ) {
    return 'reconciliation'
  }


  const otherSubjectPatterns = [
    /그 사람|그사람|상대(방)?|그분|그녀|그가|걔|얘|전남친|전여친/,
    /\bthey\b|\bhe\b|\bshe\b|\bpartner\b|\bex\b/,
  ]
  const namedOtherSubjectPatterns = [
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)를/,
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)에게/,
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)한테/,
    /[가-힣]{2,4}(이|가)\s*(내일|오늘|이번|곧)/,
    /[가-힣]{2,4}(이|가)\s*(연락|답장|만나|올|답할|말할|뭐라|무슨 말)/,
  ]
  const hasOtherSubject =
    hasPattern(joined, otherSubjectPatterns) || hasPattern(joined, namedOtherSubjectPatterns)
  const implicitCounterpartyResponseCuePatterns = [
    /(반응이\s*어떨까|반응은\s*어떨까|반응\s*어때|받아줄까|어떻게\s*받아들일까|차단\s*풀릴까)/,
    /(무슨\s*말|뭐라(고)?\s*할까|어떻게\s*말할까|먼저\s*말할까|생각\s*바꿀까)/,
    /(신경\s*쓸까|부담스러워할까|차단할까)/,
    /(다시\s*찾아올|다시\s*올까|돌아올)/,
    /what will .* say|how will .* react|take me back|come back/,
  ]
  const implicitCounterpartyTriggerPatterns = [/(사과하면|고백하면|내가\s*움직이면|내가\s*먼저)/]
  const expandedCounterpartyTriggerPatterns = [
    /(사과하면|고백하면|호감표시하면|내가\s*움직이면|내가\s*먼저|연락하면|다가가면|내가\s*찾아가면|팔로우\s*끊으면|맞팔로우\s*끊으면|스토리\s*숨기면|프로필\s*바꾸면)/,
  ]

  const meetingLikelihoodPatterns = [
    /만날까|만날 수|만날 가능/,
    /성사될까|가능성/,
    /연락 올까|답장 올까|연락할까|답장할까/,
    /(\uC5F0\uB77D\uD560\s*\uD655\uB960|\uB2F5\uC7A5\uD560\s*\uD655\uB960|\uC5F0\uB77D\s*\uAC00\uB2A5\uC131|\uB2F5\uC7A5\s*\uAC00\uB2A5\uC131)/,
    /\bmeet\b|\bmeeting\b|\bshow up\b/,
    /\breply\b|\brespond\b/,
  ]
  if (hasOtherSubject && hasPattern(joined, meetingLikelihoodPatterns)) {
    return 'meeting_likelihood'
  }

  if (/(\uC5F0\uB77D\s*\uC62C\uAE4C|\uC911\uC694\uD55C\s*\uC5F0\uB77D|\uC560\ud504\ud130\s*\uC62C\uAE4C)/.test(joined)) {
    return 'meeting_likelihood'
  }
  if (/(\uCC28\uB2E8\s*\uD480\uB9AC\uBA74.*\uC5F0\uB77D\ud560\uAE4C)/.test(joined)) {
    return 'meeting_likelihood'
  }

  const otherResponsePatterns = [
    /해줄까|올까|볼까|답할까|받아줄까|반응|말할까|무슨 말|뭐라(고)? 할까|어떻게 말할까/,
    /(\uBC18\uC751\uC774\s*\uC5B4\uB5A8\uAE4C|\uB2E4\uC2DC\s*\uC0DD\uAC01\s*\uBC14\uAFC0\uAE4C)/,
    /will (they|he|she)/,
    /would (they|he|she)/,
    /do (they|he|she)/,
    /what will (they|he|she) say/,
  ]
  if (
    (hasRelationshipSignal(questionVariants) &&
      hasPattern(joined, implicitCounterpartyResponseCuePatterns)) ||
    (hasPattern(joined, expandedCounterpartyTriggerPatterns) &&
      hasPattern(joined, implicitCounterpartyResponseCuePatterns))
  ) {
    return 'other_person_response'
  }
  if (
    /(\uC0AC\uACFC\uD558\uBA74.*\uBC18\uC751\uC774\s*\uC5B4\uB5A8\uAE4C|\uACE0\uBC31\uD558\uBA74.*\uBC1B\uC544\uC904\uAE4C|\uB0B4\uAC00\s*\uBA3C\uC800.*\uBC18\uC751\uC774\s*\uC5B4\uB5A8\uAE4C)/.test(
      joined
    )
  ) {
    return 'other_person_response'
  }
  if (/(\uB0B4\uAC00\s*\uCC3E\uC544\uAC00\uBA74.*\uBC18\uC751\s*\uC5B4\uB5A8\uAE4C)/.test(joined)) {
    return 'other_person_response'
  }
  if (hasOtherSubject && hasPattern(joined, otherResponsePatterns)) {
    return 'other_person_response'
  }
  if (
    hasOtherSubject &&
    /(\uC5F0\uB77D\s*\uC62C\uAE4C|\uC5F0\uB77D\ud574\s*\uC62C\uAE4C|\uC560\ud504\ud130\s*\uC62C\uAE4C)/.test(
      joined
    )
  ) {
    return 'meeting_likelihood'
  }
  if (
    hasOtherSubject &&
    /(\uD504\uB85C\uD544\s*\uBCFC\uAE4C|\uC2A4\uD1A0\uB9AC\s*\uBCFC\uAE4C|\uCC28\uB2E8\s*\uD480\uB9B4\uAE4C|\uB2E4\uC2DC\s*\uB9D0\ud560\uAE4C)/.test(
      joined
    )
  ) {
    return 'other_person_response'
  }
  if (
    /(\uC2A4\uD1A0\uB9AC\s*\uC62C\uB9AC\uBA74\s*\uBCFC\uAE4C|\uB0B4\uAC00\s*\uD504\uB85C\uD544\s*\uBC14\uAFB8\uBA74\s*\uBCFC\uAE4C|\uB0B4\s*\uD504\uB85C\uD544\s*\uBCFC\uAE4C)/.test(
      joined
    )
  ) {
    return 'other_person_response'
  }
  if (
    /(\uC5B8\uD314\uB85C\uC6B0.*\uBCFC\uAE4C|\uD314\uB85C\uC6B0\s*\uB04A\uC73C\uBA74.*\uBC18\uC751\s*(\uC5B4\uB5A8\uAE4C|\uC5B4\uB54C)|\uC2A4\uD1A0\uB9AC.*(\uC5FC\uD0D0|\uBAB0\uB798\s*\uBCFC\uAE4C))/.test(
      joined
    )
  ) {
    return 'other_person_response'
  }
  if (
    /(\uC5B8\uD314\uB85C\uC6B0.*\uC2E0\uACBD\s*\uC4F8\uAE4C|\uB9DE\uD314\uB85C\uC6B0\s*\uB04A\uC73C\uBA74.*\uBC18\uC751\s*(\uC5B4\uB5A8\uAE4C|\uC5B4\uB54C)|\uD504\uB85C\uD544\s*\uBC14\uAFB8\uBA74.*\uC2E0\uACBD\s*\uC4F8\uAE4C|\uC2A4\uD1A0\uB9AC\s*\uC228\uAE30\uBA74.*\uBC18\uC751\ud560\uAE4C|\uADF8\s*\uC0AC\uB78C\s*\uB098\s*\uCC28\uB2E8\ud560\uAE4C|\uD638\uAC10\uD45C\uC2DC\ud558\uBA74.*\uBD80\uB2F4\uC2A4\uB7EC\uC6CC\ud560\uAE4C)/.test(
      joined
    )
  ) {
    return 'other_person_response'
  }
  if (
    hasOtherSubject &&
    /(\uC0DD\uAC01\ud574\??|\uB9C8\uC74C\s*\uC788\uC5B4\??|\uC0DD\uAC01\s*\uC5C6\uC5B4\??)/.test(
      joined
    )
  ) {
    return 'inner_feelings'
  }
  if (/(\uBA54\uC2DC\uC9C0.*\uBCF4\uBA74.*\uBB50\uB77C\s*\uC0DD\uAC01\ud560\uAE4C)/.test(joined)) {
    return 'inner_feelings'
  }
  if (
    /(\uAD00\uC2EC\s*\uC788\uB294\s*\uC0AC\uB78C\s*\uC788\uC5B4\??|\uAD00\uC2EC\s*\uC788\uC5B4\ud560\uae4c|\uB208\uC5D0\s*\uB0B4\uAC00\s*\uC5B4\uB54C|\uC758\uC2DD\ud574\??)/.test(
      joined
    )
  ) {
    return 'inner_feelings'
  }
  if (/(\uC5B4\uC7A5\s*\uB2F9\uD558\uB294\s*\uC911\uC77C\uAE4C|\uC5B4\uC7A5\s*\uB2F9\uD558\uB294\uC911\uC784)/.test(joined)) {
    return 'inner_feelings'
  }

  const selfDecisionPatterns = [
    /할까|해야 할까|해도 될까|할지 말지|가도 될까|보내도 될까/,
    /\bshould i\b|\bshall i\b|\bcan i\b|\bmay i\b/,
    /thinking about/,
    /not sure if i should/,
  ]
  if (
    /(\uBA74\uC811.*\uB9DD\ud560\uAE4C|\uC2DC\uD5D8.*\uB9DD\ud560\uAE4C|\uD569\uACA9.*\uB5A8\uC5B4\uC9C8\uAE4C)/.test(
      joined
    )
  ) {
    return 'near_term_outcome'
  }
  if (
    /(연애\s*시작할까|연애\s*시작될까)/.test(joined) &&
    !/(내가|내\s*쪽|고백|움직이|시작해도|해볼까)/.test(joined)
  ) {
    return 'near_term_outcome'
  }
  if (hasSelfDecisionSignal(questionVariants) || hasPattern(joined, selfDecisionPatterns)) {
    return 'self_decision'
  }
  if (
    /((집|이사|연애|공부|관계|회사|직장)?\s*사는\s*게\s*맞아|(집|이사|연애|공부|관계|회사|직장)?\s*사는\s*게\s*맞을까|기다리는\s*게\s*맞을까|공부\s*방향\s*맞아|연애\s*시작할까|시작해도\s*될까)/.test(
      joined
    )
  ) {
    return 'self_decision'
  }
  if (
    /(\uB2E4\uB140\uB3C4\s*\uB420\uAE4C|\uC9D1\s*\uC0AC\uB3C4\s*\uB420\uAE4C|\uAE30\uB2E4\uB9AC\uBA74\s*\uB420\uAE4C)/.test(
      joined
    )
  ) {
    return 'self_decision'
  }

  if (
    /(\uB2E4\uC74C\s*\uD55C\s*\uC218|\uBC29\uD5A5\s*\uB9DE\uC544|\uBB50\uC5EC\uC57C\s*\uD574|\uC870\uC5B8\uC740|\uB193\uCE58\uACE0\s*\uC788\uB294\s*\uAC74\s*\uBB50)/.test(
      joined
    )
  ) {
    return 'self_decision'
  }
  if (/(\uACE0\uBC31\s*\uD574\uB3C4\s*\uB420\uAE4C|\uACE0\uBC31\s*\uBC15\uC544\uB3C4\s*\uB420\uAE4C)/.test(joined)) {
    return 'self_decision'
  }
  if (
    /(\uC9C1\uC7A5\s*\uC62E\uAE30\uBA74|\uC774\uC9C1\uD574\uB3C4|\uC62E\uAE30\uBA74\s*\uB098\uC744\uAE4C)/.test(
      joined
    )
  ) {
    return 'self_decision'
  }
  if (
    /(\uD1F4\uC0AC(\s|\S)*\uB420\uAE4C|\uD1F4\uC0AC\s*\uD574\uB3C4\s*\uB420\uAE4C|\uD1F4\uC0AC\s*\uC7AC\uB3C4\s*\uB420\uAE4C)/.test(
      joined
    )
  ) {
    return 'self_decision'
  }

  const nearTermOutcomePatterns = [
    /결과|성공|실패|붙을까|합격|될까/,
    /가능성|확률|전망/,
    /(\uC798\s*\uB05D\uB0A0\uAE4C|\uC624\uB798\uAC08\uAE4C|\uB05D\uB09C\s*\uAC78\uAE4C|\uAD1C\uCC2E\uC744\uAE4C|\uC5B4\uB5BB\uAC8C\s*\uB420\uAE4C|\uBD84\uC704\uAE30\s*\uC5B4\uB54C|\uBD84\uC704\uAE30\s*\uC5B4\uB5A8\uAE4C)/,
    /\boutcome\b|\bchance\b|\blikely\b|\bprobability\b/,
    /\bwill it\b/,
  ]
  if (hasPattern(joined, nearTermOutcomePatterns)) {
    return 'near_term_outcome'
  }
  if (/(\uC6B0\uB9AC\s*\uB2E4\uC2DC\s*\uB418\uB0D0|\uC6B0\uB9AC\s*\uB2E4\uC2DC\s*\uB420\uAE4C)/.test(joined)) {
    return 'reconciliation'
  }

  const broadFlowPatterns = [
    /(\uD750\uB984|\uC804\uCCB4\s*\uD750\uB984|\uD070\s*\uD750\uB984|\uAD6D\uBA74|\uBC29\uD5A5)/,
    /(\uC6B4\s*\uC5B4\uB54C|\uCCB4\uD06C\uD574\uC918|\uAD81\uAE08\uD574|\uC54C\uACE0\s*\uC2F6\uC5B4)/,
    /(\uBC30\uC6CC\uC57C\s*\uD560\s*\uAC74|\uC65C\s*\uC790\uAFB8\s*\uAF2C\uC774\uB294\uC9C0)/,
    /overall flow|big picture|current flow|direction/,
  ]
  if (hasPattern(joined, broadFlowPatterns)) {
    return 'unknown'
  }
  if (
    /(\uB204\uAC00\s*\uB0B4\uAC8C\s*\uC62C\uAE4C|\uB0B4\uAC8C\s*\uB204\uAC00\s*\uB4E4\uC5B4\uC62C\uAE4C|\uC0C8\s*\uC0AC\uB78C\s*\uB4E4\uC5B4\uC62C\uAE4C|\uB0B4\s*\uC778\uC5F0\s*\uC5B4\uB290\s*\uCABD\uC5D0\uC11C\s*\uC62C\uAE4C)/.test(
      joined
    )
  ) {
    return 'unknown'
  }

  return 'unknown'
}

export function hasStrongOtherSubjectSignal(questionVariants: string[]) {
  const joined = normalizeHeuristicText(questionVariants.join(' '))
  return /([가-힣]{2,4}(이|가).*(나|내|저|제))|(그 사람|그사람|상대|전남친|전여친|partner|ex|they|he|she)/.test(
    joined
  )
}

export function hasStrongFlowSignal(questionVariants: string[]) {
  const joined = normalizeHeuristicText(questionVariants.join(' '))
  return /(전체 흐름|흐름은|국면|방향|phase|overall flow|big picture|current flow|direction)/.test(
    joined
  )
}

export function hasStrongTimingSignal(questionVariants: string[]) {
  const joined = normalizeHeuristicText(questionVariants.join(' '))
  return /(언제|시기|타이밍|몇 월|when|timing|what time|right moment|best time)/.test(joined)
}

export function detectQuestionSubject(
  questionVariants: string[],
  intent: TarotQuestionIntent
): QuestionSubject {
  if (intent === 'other_person_response' || intent === 'meeting_likelihood') {
    return 'other_person'
  }
  if (intent === 'reconciliation' || intent === 'inner_feelings') {
    return 'relationship'
  }
  if (intent === 'unknown') {
    const joinedUnknown = normalizeHeuristicText(questionVariants.join(' '))
    if (hasRelationshipSignal(questionVariants)) {
      return 'relationship'
    }
    if (/(감정|기분|컨디션|상태|feel|emotion|마음)/.test(joinedUnknown)) {
      return 'self'
    }
    if (
      /(회의|미팅|프로젝트|직장|회사|면접|시험|계약|투자|사업|job|career|exam|interview)/.test(
        joinedUnknown
      )
    ) {
      return 'external_situation'
    }
    return 'overall_flow'
  }

  const joined = normalizeHeuristicText(questionVariants.join(' '))
  if (hasRelationshipSignal(questionVariants)) {
    return 'relationship'
  }
  if (/(그 사람|상대|전남친|전여친|partner|ex|they|he|she)/.test(joined)) {
    return 'other_person'
  }
  if (/(회사|직장|면접|시험|계약|투자|사업|job|career|exam|interview)/.test(joined)) {
    return 'external_situation'
  }
  if (/(회의|미팅|프로젝트|발표|프레젠테이션)/.test(joined)) {
    return 'external_situation'
  }
  return 'self'
}

export function detectQuestionTimeframe(questionVariants: string[]): QuestionTimeframe {
  const joined = normalizeHeuristicText(questionVariants.join(' '))
  if (/(오늘|지금|당장|today|right now|immediately|now)/.test(joined)) {
    return 'immediate'
  }
  if (/(내일|이번 주|곧|soon|tomorrow|this week|next few days)/.test(joined)) {
    return 'near_term'
  }
  if (/(지금.*흐름|현재.*국면|overall flow|current phase|current situation)/.test(joined)) {
    return 'current_phase'
  }
  if (/(이번 달|올해|3개월|6개월|month|year|quarter)/.test(joined)) {
    return 'mid_term'
  }
  return 'open'
}

export function detectQuestionTone(intent: TarotQuestionIntent, questionVariants: string[]): QuestionTone {
  const joined = normalizeHeuristicText(questionVariants.join(' '))
  if (intent === 'inner_feelings') {
    return 'emotion'
  }
  if (intent === 'unknown' || /(흐름|국면|overall flow|direction|phase)/.test(joined)) {
    return 'flow'
  }
  if (intent === 'self_decision' || /(어떻게|해야|조언|what should i|advice)/.test(joined)) {
    return 'advice'
  }
  return 'prediction'
}

export function normalizeQuestionType(
  value: string | undefined,
  fallback: TarotQuestionIntent
): TarotQuestionIntent {
  const allowed: TarotQuestionIntent[] = [
    'self_decision',
    'other_person_response',
    'meeting_likelihood',
    'near_term_outcome',
    'timing',
    'reconciliation',
    'inner_feelings',
    'unknown',
  ]
  return value && allowed.includes(value as TarotQuestionIntent)
    ? (value as TarotQuestionIntent)
    : fallback
}

export function normalizeSubject(value: string | undefined, fallback: QuestionSubject): QuestionSubject {
  const allowed: QuestionSubject[] = [
    'self',
    'other_person',
    'relationship',
    'overall_flow',
    'external_situation',
  ]
  return value && allowed.includes(value as QuestionSubject) ? (value as QuestionSubject) : fallback
}

export function normalizeTimeframe(
  value: string | undefined,
  fallback: QuestionTimeframe
): QuestionTimeframe {
  const allowed: QuestionTimeframe[] = [
    'immediate',
    'near_term',
    'current_phase',
    'mid_term',
    'open',
  ]
  return value && allowed.includes(value as QuestionTimeframe)
    ? (value as QuestionTimeframe)
    : fallback
}

export function normalizeTone(value: string | undefined, fallback: QuestionTone): QuestionTone {
  const allowed: QuestionTone[] = ['prediction', 'advice', 'emotion', 'flow']
  return value && allowed.includes(value as QuestionTone) ? (value as QuestionTone) : fallback
}

export function getIntentLabel(intent: TarotQuestionIntent, language: EngineLanguage): string {
  const koLabels: Record<TarotQuestionIntent, string> = {
    self_decision: '내 선택과 행동을 묻는 질문',
    other_person_response: '상대의 반응이나 행동을 묻는 질문',
    meeting_likelihood: '연락 또는 만남 가능성을 묻는 질문',
    near_term_outcome: '가까운 결과를 확인하는 질문',
    timing: '시기를 확인하는 질문',
    reconciliation: '재회 또는 관계 회복 질문',
    inner_feelings: '상대의 속마음을 묻는 질문',
    unknown: '전체 흐름을 살피는 질문',
  }

  const enLabels: Record<TarotQuestionIntent, string> = {
    self_decision: 'A question about your own decision',
    other_person_response: "A question about the other person's response",
    meeting_likelihood: 'A question about contact or meeting likelihood',
    near_term_outcome: 'A question about a near-term outcome',
    timing: 'A timing question',
    reconciliation: 'A reconciliation question',
    inner_feelings: "A question about the other person's feelings",
    unknown: 'A question about the overall flow',
  }

  return language === 'ko' ? koLabels[intent] : enLabels[intent]
}

export function getSubjectLabel(subject: QuestionSubject, language: EngineLanguage): string {
  const koLabels: Record<QuestionSubject, string> = {
    self: '나 자신이 주체인 질문',
    other_person: '상대방이 주체인 질문',
    relationship: '관계 자체를 보는 질문',
    overall_flow: '전체 흐름을 보는 질문',
    external_situation: '외부 상황을 보는 질문',
  }
  const enLabels: Record<QuestionSubject, string> = {
    self: 'The subject is you',
    other_person: 'The subject is the other person',
    relationship: 'The subject is the relationship itself',
    overall_flow: 'The subject is the overall flow',
    external_situation: 'The subject is the external situation',
  }
  return language === 'ko' ? koLabels[subject] : enLabels[subject]
}

export function getFocusLabel(intent: TarotQuestionIntent, language: EngineLanguage): string {
  const koLabels: Record<TarotQuestionIntent, string> = {
    self_decision: '내 선택과 행동 방향',
    other_person_response: '상대의 반응과 다음 행동',
    meeting_likelihood: '연락 또는 만남 성사 가능성',
    near_term_outcome: '가까운 결과와 전개',
    timing: '적절한 시기와 타이밍',
    reconciliation: '재회 가능성과 관계 회복 조건',
    inner_feelings: '겉으로 보이지 않는 속마음',
    unknown: '현재 국면과 전체 흐름',
  }
  const enLabels: Record<TarotQuestionIntent, string> = {
    self_decision: 'Your decision and next move',
    other_person_response: "The other person's response and next action",
    meeting_likelihood: 'Likelihood of contact or meeting',
    near_term_outcome: 'Near-term outcome and direction',
    timing: 'Timing and right moment',
    reconciliation: 'Reconciliation potential and conditions',
    inner_feelings: 'Hidden feelings beneath the surface',
    unknown: 'Current phase and overall flow',
  }
  return language === 'ko' ? koLabels[intent] : enLabels[intent]
}

export function getTimeframeLabel(timeframe: QuestionTimeframe, language: EngineLanguage): string {
  const koLabels: Record<QuestionTimeframe, string> = {
    immediate: '아주 단기',
    near_term: '단기',
    current_phase: '현재 국면',
    mid_term: '중기',
    open: '시간축이 열려 있음',
  }
  const enLabels: Record<QuestionTimeframe, string> = {
    immediate: 'Immediate',
    near_term: 'Near term',
    current_phase: 'Current phase',
    mid_term: 'Mid term',
    open: 'Open-ended timeframe',
  }
  return language === 'ko' ? koLabels[timeframe] : enLabels[timeframe]
}

export function getToneLabel(tone: QuestionTone, language: EngineLanguage): string {
  const koLabels: Record<QuestionTone, string> = {
    prediction: '예측 중심',
    advice: '조언 중심',
    emotion: '감정 해석 중심',
    flow: '흐름 해석 중심',
  }
  const enLabels: Record<QuestionTone, string> = {
    prediction: 'Prediction-focused',
    advice: 'Advice-focused',
    emotion: 'Emotion-focused',
    flow: 'Flow-focused',
  }
  return language === 'ko' ? koLabels[tone] : enLabels[tone]
}
