import type { InterpretationRule } from '../types'

export const RULES_SHINSAL: InterpretationRule[] = [
  // ═══════════════════════════════════════════════════════════
  // 신살 narrative (3종 — 자주 발동)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-cheoneul',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: {
      shinsalName: ['천을귀인'],
    },
    template:
      `🌟 **도움 받기 좋은 날** — {shinsalDates} 에 자리잡고 있어요. ` +
      `어려운 부탁·결정적 조언이 필요한 일은 이 날들에 맞춰 잡으세요.`,
    templateEn:
      `🌟 **Good days for receiving help** — they fall on {shinsalDates}. ` +
      `Schedule hard asks and anything that needs decisive advice for these dates.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-yeokma',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: {
      shinsalName: ['역마'],
    },
    template:
      `✈️ **이동·환경 변화 에너지**가 강해지는 시기. ` +
      `여행·이직·이사 등 미뤄둔 이동 계획이 있다면 지금이 적기예요.`,
    templateEn:
      `✈️ **Movement and environment-change energy** is running strong. ` +
      `If you have travel, a job switch, or a move on the back burner, now is the time.`,
    themes: ['growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 신살 추가 (8종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-hwagae',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: { shinsalName: ['화개'] },
    template:
      `🕯 **예술·고독의 별** 발동 — 내면 깊어지기·예술·종교·연구에 ` +
      `우호적인 시기. 혼자만의 시간이 결과로 이어져요.`,
    templateEn:
      `🕯 **The art-and-solitude star** is active — favourable for going inward, art, faith, and research. ` +
      `Time alone turns into real results.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'shinsal-mungchang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: { shinsalName: ['문창'] },
    template:
      `📚 **학문의 별** 발동 — 학습·시험·집필·발표에 강력한 보조. ` +
      `시험 준비·논문·콘텐츠 제작 모두 지금이 좋아요.`,
    templateEn:
      `📚 **The literary star** is active — a strong boost for learning, exams, writing, and presentations. ` +
      `Exam prep, papers, and content creation all run well now.`,
    themes: ['career'],
  },
  {
    id: 'shinsal-dohwa',
    scope: 'monthly',
    section: 'shinsal',
    priority: 48,
    conditions: { shinsalName: ['도화'] },
    template:
      `🌸 **매력·끌림의 별** 발동 — 매력·끌림·인기 에너지가 강해져요. ` +
      `소개·미팅·자기 표현이 잘 통하는 시기예요.`,
    templateEn:
      `🌸 **The charm-and-attraction star** is active — charm, attraction, and popularity energy run strong. ` +
      `Introductions, meetings, and self-expression all land well.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'shinsal-yangin',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['양인'] },
    template:
      `⚔️ **강한 의지의 별** 발동 — 강력한 추진력. 단, 충돌·다툼 주의. ` +
      `결단력 필요한 일에 좋고, 인내가 필요한 일은 조심해주세요.`,
    templateEn:
      `⚔️ **The strong-will star** is active — powerful drive. Watch out for clashes and fights though. ` +
      `Good for anything that needs decisiveness; be careful with anything that needs patience.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-baekho',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['백호'] },
    template:
      `🔥 **격동·전환의 별** 발동 — 극단적 변동·사고 가능성. 운전·외출· ` +
      `위험한 작업은 신중하게 가주세요. 큰 결정은 길일로 잡아주세요.`,
    templateEn:
      `🔥 **The upheaval star** is active — extreme swings and accidents are possible. ` +
      `Take it slow with driving, going out, and risky work. Save big decisions for an auspicious day.`,
    themes: ['health'],
  },
  {
    id: 'shinsal-gongmang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 38,
    conditions: { shinsalName: ['공망'] },
    template:
      `🌫 **공망** 발동 — 결과 안 보이는 시기. 새 시작보다 ` +
      `정리·복기·내면 작업이 더 효과적이에요.`,
    templateEn:
      `🌫 **Gongmang** is active — a time when results stay hidden. Rather than starting new things, ` +
      `tidying up, reviewing, and inner work all land better.`,
    themes: ['growth', 'health'],
  },
  {
    id: 'shinsal-cheondeok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: { shinsalName: ['천덕귀인', '월덕귀인'] },
    template:
      `🛡 **천덕·월덕** 발동 — 건강·가정·정서 영역에서 보호받는 ` +
      `시기. 회복·치유에 자연스러운 흐름이에요.`,
    templateEn:
      `🛡 **Cheondeok and Woldeok** are active — you are protected in health, family, and emotional areas. ` +
      `It is a natural current for recovery and healing.`,
    themes: ['health', 'love'],
  },
  {
    id: 'shinsal-jangseong',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['장성'] },
    template:
      `🎖 **명예·자리의 별** 발동 — 리더십·명예·공적 자리. 발표·발의·` +
      `대표 역할이 들어올 수 있는 시기예요.`,
    templateEn:
      `🎖 **The honour-and-position star** is active — leadership, recognition, and public-facing roles. ` +
      `Presentations, proposals, and representative positions may land in this period.`,
    themes: ['career'],
  },

  // ═══════════════════════════════════════════════════════════
  // 신살 narrative 확장 (12종 추가)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-cheonui',
    scope: 'monthly',
    section: 'shinsal',
    priority: 48,
    conditions: { shinsalName: ['천의성'] },
    template:
      `🩺 **천의성** 발동 — 의약·치유·건강 영역에 도움이 들어오는 ` +
      `시기. 건강 점검·치료 시작에 좋아요.`,
    templateEn:
      `🩺 **Cheonuiseong** is active — help flows into medicine, healing, and health areas. ` +
      `Good for check-ups and starting treatment.`,
    themes: ['health'],
  },
  {
    id: 'shinsal-amlock',
    scope: 'monthly',
    section: 'shinsal',
    priority: 47,
    conditions: { shinsalName: ['암록'] },
    template:
      `🤝 **보이지 않는 도움의 별** 발동 — 보이지 않는 도움·뒤에서 챙겨주는 사람· ` +
      `숨은 자원이 들어오는 시기. 부탁받지 않은 도움이 와요.`,
    templateEn:
      `🤝 **A hidden-support star** is active — unseen help, people looking out for you from behind the scenes, ` +
      `and hidden resources flow in. Help arrives without you having to ask.`,
    themes: ['career', 'money'],
  },
  {
    id: 'shinsal-hakdang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 47,
    conditions: { shinsalName: ['학당귀인'] },
    template:
      `🎓 **학당귀인** 발동 — 학문·자격·시험·연구에 보호 ` +
      `들어오는 시기. 큰 시험·논문·발표에 우호적이에요.`,
    templateEn:
      `🎓 **Hakdang Guin** is active — protection flows into study, qualifications, exams, and research. ` +
      `Favourable for big exams, papers, and presentations.`,
    themes: ['career'],
  },
  {
    id: 'shinsal-geollok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: { shinsalName: ['건록'] },
    template:
      `💼 **건록** 발동 — 자기 자리·소속·기반이 단단해지는 ` +
      `시기. 자리 잡기·소속 안정에 좋아요.`,
    templateEn:
      `💼 **Geollok** is active — your position, belonging, and base get sturdier. ` +
      `Good for settling into a place and stabilising where you belong.`,
    themes: ['career', 'money'],
  },
  {
    id: 'shinsal-jewang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: { shinsalName: ['제왕'] },
    template:
      `👑 **제왕** 발동 — 절정의 에너지. 자기 표현·발의·` +
      `리더십이 잘 통하는 시기. 단, 과강은 주의해주세요.`,
    templateEn:
      `👑 **Jewang** is active — peak energy. Self-expression, proposals, and leadership ` +
      `all land well. Just watch out for overdoing it.`,
    themes: ['career'],
  },
  {
    id: 'shinsal-wonjin',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['원진'] },
    template:
      `⚡ **원진** 발동 — 가까운 사람과의 미묘한 갈등·오해 가능. ` +
      `중요한 대화는 조심스럽게 가주세요.`,
    templateEn:
      `⚡ **Wonjin** is active — subtle conflict and misunderstanding with people close to you are possible. ` +
      `Handle important conversations gently.`,
    themes: ['love', 'health'],
  },
  {
    id: 'shinsal-hyeonchim',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['현침'] },
    template:
      `📌 **현침** 발동 — 정밀·예리한 일에 좋음. 의료·기술· ` +
      `분석 영역. 단, 사람 관계는 부드럽게 가주세요.`,
    templateEn:
      `📌 **Hyeonchim** is active — good for precise, sharp work. Medical, technical, ` +
      `and analytical fields. Just go gently with people.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-gwigwan',
    scope: 'monthly',
    section: 'shinsal',
    priority: 43,
    conditions: { shinsalName: ['귀문관'] },
    template:
      `🌑 **귀문** 발동 — 정신적 예민함·직관·꿈이 켜져 있어요. ` +
      `명상·내적 작업에 좋고, 큰 결정은 신중히 가주세요.`,
    templateEn:
      `🌑 **Gwimun** is active — mental sensitivity, intuition, and dreams light up. ` +
      `Good for meditation and inner work; handle big decisions carefully.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'shinsal-tianmun',
    scope: 'monthly',
    section: 'shinsal',
    priority: 44,
    conditions: { shinsalName: ['천문성'] },
    template:
      `🔮 **하늘 지혜의 별** 발동 — 영적 통찰·깊은 학문·신비로운 ` +
      `분야에 우호적. 깊은 공부와 명상에 잘 맞는 시기예요.`,
    templateEn:
      `🔮 **The heaven-wisdom star** is active — favourable for spiritual insight, deep learning, ` +
      `and mystical fields. A fitting time for deep study and meditation.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'shinsal-geumyeo',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['금여성'] },
    template: `💎 **금여성** 발동 — 재물·결혼 운에 우호적. 안정적 ` + `풍요를 만드는 시기예요.`,
    templateEn:
      `💎 **Geumyeoseong** is active — favourable for wealth and marriage luck. ` +
      `A time that builds steady abundance.`,
    themes: ['money', 'love'],
  },
  {
    id: 'shinsal-mungok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['문곡'] },
    template:
      `📖 **문곡** 발동 — 학문·문장·창작에 강한 보조. ` + `글·작품·발표가 잘 풀리는 시기예요.`,
    templateEn:
      `📖 **Mungok** is active — a strong boost for study, writing, and creation. ` +
      `Articles, work, and presentations all click.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'shinsal-taegeuk',
    scope: 'monthly',
    section: 'shinsal',
    priority: 49,
    conditions: { shinsalName: ['태극귀인'] },
    template:
      `☯️ **행운의 도움 별** 발동 — 영성·종교·깨달음 영역에서 ` +
      `보호받는 시기. 내적 균형이 잡혀요.`,
    templateEn:
      `☯️ **A guiding star** is active — you are protected in spirituality, religion, ` +
      `and realisation. Inner balance comes into place.`,
    themes: ['growth'],
  },

]
