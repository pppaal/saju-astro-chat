/**
 * @file Major Arcana cards (0-21)
 */

import type { RawCard } from './tarot-types';

// Major Arcana cards (The Fool through The World)
export const majorArcanaCards: RawCard[] = [
  {
    id: 0,
    name: 'The Fool',
    nameKo: '바보',
    arcana: 'major',
    suit: 'major',
    image: '/cards/0.jpg',
    upright: {
      keywords: ['Beginnings', 'Innocence', 'Spontaneity', 'A free spirit', 'Adventure'],
      keywordsKo: ['새로운 시작', '순수함', '자유로운 영혼', '모험', '무한한 가능성'],
      meaning: 'The Fool signals the start of a brand-new adventure. Like stepping off a cliff into the unknown, you are being called to take a leap of faith. Trust in the universe and your own inner guidance. This card carries the energy of pure potential—nothing has been written yet, and you are the author of your own story. Embrace spontaneity, release your fears, and allow yourself to be surprised by life. In love, this may indicate a fresh romance or rekindling of passion. In career, it suggests an exciting new venture or complete change of direction. The universe supports those who dare to begin.',
      meaningKo: '바보 카드는 완전히 새로운 모험의 시작을 알립니다. 마치 절벽 끝에서 미지의 세계로 발을 내딛는 것처럼, 당신은 믿음의 도약을 하도록 부름받고 있습니다. 우주와 당신 내면의 안내를 신뢰하세요. 이 카드는 순수한 가능성의 에너지를 담고 있습니다—아직 아무것도 쓰이지 않았고, 당신이 바로 자신의 이야기를 쓰는 작가입니다. 자발성을 포용하고, 두려움을 내려놓고, 삶이 주는 놀라움을 허용하세요. 사랑에서는 새로운 로맨스나 열정의 재점화를 의미할 수 있습니다. 직업에서는 흥미진진한 새 사업이나 완전한 방향 전환을 암시합니다. 우주는 시작할 용기를 가진 자를 지지합니다.',
      advice: 'Take a leap of faith. Trust the universe and embrace new beginnings with an open heart.',
      adviceKo: '믿음의 도약을 하세요. 우주를 믿고 열린 마음으로 새로운 시작을 받아들이세요.'
    },
    reversed: {
      keywords: ['Recklessness', 'Folly', 'Being taken advantage of', 'Inconsideration', 'Risk-taking'],
      keywordsKo: ['무모함', '어리석음', '경솔함', '준비 부족', '현실 회피'],
      meaning: 'The reversed Fool warns of reckless behavior and poor judgment. You may be rushing into something without proper planning, ignoring red flags, or living in a fantasy world that disconnects you from reality. This card asks you to pause and reassess—are you taking a calculated risk or simply being naive? Someone may be taking advantage of your innocence or good nature. In relationships, this could indicate impulsive decisions that you might regret. In career matters, it suggests the need for more research before making a major change. Ground yourself, seek advice from trusted mentors, and make sure your foundations are solid before leaping.',
      meaningKo: '역방향 바보 카드는 무모한 행동과 판단력 부족에 대해 경고합니다. 적절한 계획 없이 무언가에 뛰어들거나, 위험 신호를 무시하거나, 현실과 단절된 환상의 세계에 살고 있을 수 있습니다. 이 카드는 잠시 멈추고 재평가하라고 요청합니다—계산된 위험을 감수하는 것인가, 아니면 단순히 순진한 것인가? 누군가가 당신의 순진함이나 선한 본성을 이용하고 있을 수 있습니다. 관계에서는 후회할 수 있는 충동적인 결정을 나타낼 수 있습니다. 직업 문제에서는 큰 변화를 하기 전에 더 많은 조사가 필요함을 암시합니다. 자신을 안정시키고, 신뢰할 수 있는 멘토의 조언을 구하고, 도약하기 전에 기초가 단단한지 확인하세요.',
      advice: 'Slow down and think things through. Ground your dreams in practical planning.',
      adviceKo: '속도를 늦추고 신중하게 생각하세요. 꿈을 실제적인 계획으로 뒷받침하세요.'
    }
  },
  {
    id: 1,
    name: 'The Magician',
    nameKo: '마법사',
    arcana: 'major',
    suit: 'major',
    image: '/cards/1.jpg',
    upright: {
      keywords: ['Manifestation', 'Resourcefulness', 'Power', 'Inspired action', 'Skill'],
      keywordsKo: ['현실화', '재능 발휘', '창조력', '영감받은 행동', '숙련'],
      meaning: 'The Magician stands as a powerful reminder that you possess all the tools necessary to manifest your desires. With one hand pointing to the heavens and the other to the earth, you are the conduit between spiritual vision and material reality. Now is the time for focused action—your skills, talents, and resources are aligned perfectly. The four elements on your table (cups, wands, swords, pentacles) represent complete mastery over emotions, passion, intellect, and the material world. In love, this card suggests the power to create the relationship you desire through clear communication and intention. In career, it signals a time of great productivity and the ability to turn ideas into profitable ventures. Trust your abilities and take inspired action.',
      meaningKo: '마법사 카드는 당신이 원하는 것을 현실화하는 데 필요한 모든 도구를 가지고 있다는 강력한 메시지입니다. 한 손은 하늘을, 다른 손은 땅을 가리키며, 당신은 영적 비전과 물질적 현실 사이의 통로입니다. 지금은 집중된 행동의 시간입니다—당신의 기술, 재능, 자원이 완벽하게 정렬되어 있습니다. 테이블 위의 네 가지 원소(컵, 완드, 소드, 펜타클)는 감정, 열정, 지성, 물질 세계에 대한 완전한 지배력을 나타냅니다. 사랑에서 이 카드는 명확한 소통과 의도를 통해 원하는 관계를 창조할 수 있는 힘을 암시합니다. 직업에서는 높은 생산성과 아이디어를 수익성 있는 사업으로 바꿀 수 있는 능력의 시기를 나타냅니다. 당신의 능력을 믿고 영감받은 행동을 취하세요.',
      advice: 'You have all the tools you need. Take action and manifest your vision now.',
      adviceKo: '필요한 모든 도구를 가지고 있습니다. 지금 행동하고 비전을 현실화하세요.'
    },
    reversed: {
      keywords: ['Manipulation', 'Poor planning', 'Untapped talents', 'Deception', 'Lack of confidence'],
      keywordsKo: ['조종', '계획 부족', '숨겨진 재능', '기만', '자신감 결여'],
      meaning: 'The reversed Magician warns of misused power and deceptive practices. You may be manipulating situations or people to get what you want, or someone may be doing this to you. Alternatively, this card can indicate untapped potential—you have incredible abilities that remain dormant due to self-doubt or fear of failure. Are you playing small when you could be playing big? In relationships, watch for dishonesty or hidden agendas, either from yourself or your partner. In career, this may suggest that your talents are not being recognized or properly utilized. It is time to realign your intentions with integrity and rediscover your authentic power.',
      meaningKo: '역방향 마법사 카드는 오용된 힘과 기만적인 행위에 대해 경고합니다. 원하는 것을 얻기 위해 상황이나 사람을 조종하고 있거나, 누군가가 당신에게 이렇게 하고 있을 수 있습니다. 또한 이 카드는 활용되지 않은 잠재력을 나타낼 수 있습니다—자기 의심이나 실패에 대한 두려움 때문에 놀라운 능력이 잠들어 있습니다. 크게 활약할 수 있는데 작게 행동하고 있지는 않은가요? 관계에서는 자신이든 파트너든 불정직함이나 숨겨진 의도를 주의하세요. 직업에서는 재능이 인정받지 못하거나 제대로 활용되지 않음을 암시할 수 있습니다. 진정성과 함께 의도를 재정렬하고 진정한 힘을 재발견할 때입니다.',
      advice: 'Realign with integrity. Unlock your dormant potential.',
      adviceKo: '진정성과 재정렬하세요. 잠든 잠재력을 깨우세요.'
    }
  },
  {
    id: 2,
    name: 'The High Priestess',
    nameKo: '여사제',
    arcana: 'major',
    suit: 'major',
    image: '/cards/2.jpg',
    upright: {
      keywords: ['Intuition', 'Sacred knowledge', 'Divine feminine', 'The subconscious mind', 'Mystery'],
      keywordsKo: ['직관', '신성한 지혜', '신비', '잠재의식', '내면의 앎'],
      meaning: 'The High Priestess guards the veil between the seen and unseen worlds, inviting you to look beyond surface appearances. She represents the voice of your inner wisdom—that quiet knowing that transcends logic and reason. This is a time to pause, reflect, and trust what your intuition is telling you. Not everything needs to be understood right now; some mysteries will reveal themselves in divine timing. In matters of love, this card suggests depth and emotional complexity—look beneath the surface of your connection. For career questions, it advises patience and gathering more information before making decisions. Dreams, synchronicities, and quiet meditation will bring you the answers you seek. Honor the wisdom that comes from stillness.',
      meaningKo: '여사제는 보이는 세계와 보이지 않는 세계 사이의 베일을 지키며, 표면적인 것 너머를 보도록 초대합니다. 그녀는 내면 지혜의 목소리를 나타냅니다—논리와 이성을 초월하는 그 조용한 앎. 지금은 멈추고, 성찰하고, 직관이 말하는 것을 믿어야 할 때입니다. 모든 것이 지금 당장 이해될 필요는 없습니다. 어떤 신비는 신성한 타이밍에 스스로 드러날 것입니다. 사랑 문제에서 이 카드는 깊이와 감정적 복잡성을 암시합니다—연결의 표면 아래를 살펴보세요. 직업 질문에서는 결정을 내리기 전에 인내하고 더 많은 정보를 수집하라고 조언합니다. 꿈, 동시성, 조용한 명상이 찾는 답을 가져다줄 것입니다. 고요함에서 오는 지혜를 존중하세요.',
      advice: 'Trust your intuition. The answers lie within. Seek wisdom in stillness.',
      adviceKo: '직관을 믿으세요. 답은 내면에 있습니다. 고요함에서 지혜를 찾으세요.'
    },
    reversed: {
      keywords: ['Secrets', 'Disconnected from intuition', 'Withdrawal', 'Hidden agendas', 'Superficiality'],
      keywordsKo: ['비밀', '직관 단절', '은둔', '숨겨진 의도', '피상적임'],
      meaning: 'The reversed High Priestess indicates a disconnection from your inner voice. You may be ignoring your gut feelings, drowning out intuition with external noise, or refusing to acknowledge what you already know to be true. Alternatively, someone around you may be keeping secrets or withholding important information. In relationships, this suggests a lack of emotional depth or someone not being fully honest about their feelings. In career, you might be making decisions based purely on logic while ignoring subtle warning signs. This card calls you to reconnect with your intuitive self—spend time in quiet reflection, trust your dreams, and allow your inner priestess to speak.',
      meaningKo: '역방향 여사제는 내면의 목소리와의 단절을 나타냅니다. 본능적 느낌을 무시하거나, 외부의 소음으로 직관을 묻어버리거나, 이미 진실임을 알고 있는 것을 인정하기를 거부하고 있을 수 있습니다. 또한 주변 누군가가 비밀을 숨기거나 중요한 정보를 숨기고 있을 수 있습니다. 관계에서 이것은 감정적 깊이의 부족이나 누군가가 자신의 감정에 대해 완전히 정직하지 않음을 암시합니다. 직업에서는 미묘한 경고 신호를 무시하면서 순전히 논리에 기반한 결정을 내리고 있을 수 있습니다. 이 카드는 직관적 자아와 다시 연결하라고 부릅니다—조용한 성찰의 시간을 보내고, 꿈을 믿고, 내면의 여사제가 말하도록 허용하세요.',
      advice: 'Reconnect with your inner voice. Look beneath the surface for hidden truths.',
      adviceKo: '내면의 목소리와 다시 연결하세요. 숨겨진 진실을 찾아 표면 아래를 살펴보세요.'
    }
  },
  {
    id: 3,
    name: 'The Empress',
    nameKo: '여황제',
    arcana: 'major',
    suit: 'major',
    image: '/cards/3.jpg',
    upright: {
      keywords: ['Femininity', 'Beauty', 'Nature', 'Nurturing', 'Abundance'],
      keywordsKo: ['풍요', '모성', '창조성', '양육', '아름다움'],
      meaning: 'The Empress embodies the fertile, life-giving force of Mother Nature herself. She represents abundance in all forms—creative inspiration flowing freely, relationships deepening, and material prosperity growing. This is a time of nurturing and being nurtured, of creating beauty and allowing yourself to receive pleasure. If you have been working hard, the Empress invites you to pause and enjoy the fruits of your labor. In matters of love, this card signals deep emotional connection, fertility, and the potential for pregnancy or birth of new creative projects. For career, it suggests that creative endeavors will flourish and abundance is on its way. Connect with nature, indulge your senses, and trust in the generosity of the universe.',
      meaningKo: '여황제는 대지의 어머니 자연 자체의 비옥하고 생명을 주는 힘을 구현합니다. 그녀는 모든 형태의 풍요를 나타냅니다—자유롭게 흐르는 창조적 영감, 깊어지는 관계, 그리고 성장하는 물질적 번영. 지금은 양육하고 양육받는 시간, 아름다움을 창조하고 기쁨을 받아들이는 시간입니다. 열심히 일해왔다면, 여황제는 잠시 멈추고 노력의 결실을 즐기라고 초대합니다. 사랑 문제에서 이 카드는 깊은 감정적 연결, 다산, 그리고 임신이나 새로운 창조적 프로젝트의 탄생 가능성을 나타냅니다. 직업에서는 창조적 노력이 번창하고 풍요가 다가오고 있음을 암시합니다. 자연과 연결하고, 감각을 즐기고, 우주의 관대함을 믿으세요.',
      advice: 'Embrace abundance and creativity. Nurture yourself and others.',
      adviceKo: '풍요와 창조성을 받아들이세요. 자신과 타인을 돌보세요.'
    },
    reversed: {
      keywords: ['Creative block', 'Dependence on others', 'Smothering', 'Emptiness', 'Neglect'],
      keywordsKo: ['창작 정체', '의존성', '과보호', '공허함', '자기 방치'],
      meaning: 'The reversed Empress indicates a disconnection from your creative and nurturing energies. You may be experiencing creative blocks, feeling uninspired, or neglecting your own needs while caring for others. Alternatively, there might be an imbalance in giving and receiving—are you smothering loved ones or being overly dependent? This card can also point to issues with fertility, body image, or feeling disconnected from nature and your feminine essence. In relationships, examine whether you are giving too much or too little. In career, you may be forcing creativity rather than allowing it to flow naturally. Take time for self-care, reconnect with nature, and remember that you cannot pour from an empty cup.',
      meaningKo: '역방향 여황제는 창조적이고 양육하는 에너지와의 단절을 나타냅니다. 창작 정체를 경험하거나, 영감이 없거나, 다른 사람을 돌보면서 자신의 필요를 방치하고 있을 수 있습니다. 또한 주고받음의 불균형이 있을 수 있습니다—사랑하는 사람을 과보호하거나 지나치게 의존하고 있나요? 이 카드는 다산, 신체 이미지 문제, 또는 자연과 여성적 본질과의 단절을 가리킬 수도 있습니다. 관계에서 너무 많이 또는 너무 적게 주고 있는지 살펴보세요. 직업에서는 창의성을 자연스럽게 흐르도록 하기보다 억지로 끌어내고 있을 수 있습니다. 자기 돌봄의 시간을 갖고, 자연과 다시 연결하고, 빈 컵에서는 부을 수 없다는 것을 기억하세요.',
      advice: 'Prioritize self-care. Reconnect with your creative energy.',
      adviceKo: '자기 돌봄을 우선시하세요. 창조적 에너지와 다시 연결하세요.'
    }
  },
  {
    id: 4,
    name: 'The Emperor',
    nameKo: '황제',
    arcana: 'major',
    suit: 'major',
    image: '/cards/4.jpg',
    upright: {
      keywords: ['Authority', 'Establishment', 'Structure', 'Father figure', 'Leadership'],
      keywordsKo: ['권위', '체계', '안정', '리더십', '책임'],
      meaning: 'The Emperor represents the masculine principle of structure, authority, and strategic thinking. He has built his empire through discipline, clear boundaries, and unwavering focus. This card calls you to step into your own power and take charge of your life with confidence and clarity. It is time to create order from chaos, establish solid foundations, and lead with both strength and wisdom. In matters of love, this may indicate a need for stability, commitment, or setting healthy boundaries. For career, the Emperor promises success through methodical planning and disciplined execution. You have the power to build lasting structures—use it wisely. Father figures or authority figures may play an important role now.',
      meaningKo: '황제는 체계, 권위, 전략적 사고의 남성적 원리를 나타냅니다. 그는 규율, 명확한 경계, 흔들림 없는 집중을 통해 제국을 건설했습니다. 이 카드는 자신의 힘에 들어서서 자신감과 명확함으로 삶을 책임지라고 부릅니다. 지금은 혼돈에서 질서를 만들고, 견고한 기반을 세우고, 힘과 지혜 모두로 이끌어야 할 때입니다. 사랑 문제에서 이것은 안정, 헌신, 또는 건강한 경계 설정의 필요성을 나타낼 수 있습니다. 직업에서 황제는 체계적인 계획과 규율 있는 실행을 통한 성공을 약속합니다. 당신에게는 지속적인 구조를 건설할 힘이 있습니다—현명하게 사용하세요. 아버지 같은 인물이나 권위 있는 인물이 지금 중요한 역할을 할 수 있습니다.',
      advice: 'Take charge with confidence. Build solid foundations through discipline.',
      adviceKo: '자신감 있게 책임지세요. 규율을 통해 견고한 기반을 세우세요.'
    },
    reversed: {
      keywords: ['Domination', 'Excessive control', 'Lack of discipline', 'Rigidity', 'Abuse of power'],
      keywordsKo: ['지배욕', '과도한 통제', '규율 부족', '경직', '권력 남용'],
      meaning: 'The reversed Emperor warns of an imbalance in how power is wielded. You may be dealing with a tyrannical figure who uses control and domination rather than fair leadership. Alternatively, you yourself might be either too rigid and controlling, or conversely, lacking the discipline and structure needed to achieve your goals. This card asks you to examine your relationship with authority—are you giving away your power or misusing it? In relationships, watch for controlling behaviors or power struggles. In career, there may be issues with management or a lack of clear direction. Find the balance between strength and flexibility, between leading and allowing.',
      meaningKo: '역방향 황제는 권력이 휘두르는 방식의 불균형에 대해 경고합니다. 공정한 리더십 대신 통제와 지배를 사용하는 폭군적인 인물을 대하고 있을 수 있습니다. 또는 당신 자신이 너무 경직되고 통제적이거나, 반대로 목표 달성에 필요한 규율과 구조가 부족할 수 있습니다. 이 카드는 권위와의 관계를 살펴보라고 요청합니다—힘을 포기하고 있나요, 아니면 오용하고 있나요? 관계에서 통제적 행동이나 권력 다툼을 주의하세요. 직업에서는 경영 문제나 명확한 방향 부족이 있을 수 있습니다. 강함과 유연함 사이, 이끔과 허용함 사이의 균형을 찾으세요.',
      advice: 'Balance control with flexibility. Examine your relationship with power.',
      adviceKo: '통제와 유연함의 균형을 맞추세요. 권력과의 관계를 살펴보세요.'
    }
  },
  {
    id: 5,
    name: 'The Hierophant',
    nameKo: '교황',
    arcana: 'major',
    suit: 'major',
    image: '/cards/5.jpg',
    upright: {
      keywords: ['Spiritual wisdom', 'Religious beliefs', 'Tradition', 'Conformity', 'Mentorship'],
      keywordsKo: ['영적 지혜', '전통', '가르침', '신념 체계', '멘토'],
      meaning: 'The Hierophant represents the bridge between the earthly and the divine, offering sacred teachings and traditional wisdom. This card speaks of learning from established systems, seeking guidance from teachers or mentors, and finding meaning through shared beliefs and rituals. Sometimes the conventional path is exactly what is needed—there is wisdom in traditions that have stood the test of time. In love, this may indicate a desire for commitment, marriage, or a relationship built on shared values. For career, it suggests working within established structures, pursuing formal education, or finding a mentor who can guide your professional growth. Honor the teachers in your life and the teachings that resonate with your soul.',
      meaningKo: '교황은 지상과 신성 사이의 다리를 나타내며, 신성한 가르침과 전통적 지혜를 제공합니다. 이 카드는 확립된 체계에서 배우고, 스승이나 멘토에게 인도를 구하고, 공유된 신념과 의식을 통해 의미를 찾는 것을 말합니다. 때로는 전통적인 길이 정확히 필요한 것입니다—시간의 시험을 견딘 전통에는 지혜가 있습니다. 사랑에서 이것은 헌신, 결혼, 또는 공유된 가치관 위에 세워진 관계에 대한 욕구를 나타낼 수 있습니다. 직업에서는 확립된 구조 내에서 일하거나, 정규 교육을 추구하거나, 전문적 성장을 안내할 멘토를 찾는 것을 암시합니다. 삶의 스승들과 영혼에 공명하는 가르침을 존중하세요.',
      advice: 'Seek guidance from tradition and mentors. Learn from established wisdom.',
      adviceKo: '전통과 멘토에게서 지도를 구하세요. 확립된 지혜에서 배우세요.'
    },
    reversed: {
      keywords: ['Personal beliefs', 'Freedom', 'Challenging status quo', 'Non-conformity', 'New methods'],
      keywordsKo: ['개인 신념', '자유', '관습 타파', '비순응', '새로운 방식'],
      meaning: 'The reversed Hierophant calls you to question the rules and traditions you have always followed. Are these beliefs truly yours, or have you simply inherited them without examination? This is a time for spiritual rebellion, for finding your own path rather than following the crowd. You may feel restricted by conventional expectations or outdated institutions. In relationships, you might be ready for something unconventional or need to break free from traditional expectations. In career, this could indicate a desire to work independently or challenge established practices. Trust your own inner guidance over external authorities—your spiritual truth is unique to you.',
      meaningKo: '역방향 교황은 항상 따라왔던 규칙과 전통에 의문을 제기하라고 부릅니다. 이 신념들이 정말 당신의 것인가요, 아니면 검토 없이 물려받은 것인가요? 이것은 영적 반항의 시간, 군중을 따르기보다 자신만의 길을 찾는 시간입니다. 전통적 기대나 구식 제도에 제한받는다고 느낄 수 있습니다. 관계에서 비전통적인 것을 원하거나 전통적 기대에서 벗어나야 할 수 있습니다. 직업에서는 독립적으로 일하거나 확립된 관행에 도전하려는 욕구를 나타낼 수 있습니다. 외부 권위보다 자신의 내면 안내를 믿으세요—당신의 영적 진실은 당신에게 고유합니다.',
      advice: 'Question traditions. Find your own spiritual path.',
      adviceKo: '전통에 의문을 제기하세요. 자신만의 영적 길을 찾으세요.'
    }
  },
  {
    id: 6,
    name: 'The Lovers',
    nameKo: '연인',
    arcana: 'major',
    suit: 'major',
    image: '/cards/6.jpg',
    upright: {
      keywords: ['Love', 'Harmony', 'Relationships', 'Values alignment', 'Meaningful choices'],
      keywordsKo: ['사랑', '조화', '진정한 연결', '가치관 일치', '중요한 선택'],
      meaning: 'The Lovers represents one of the most powerful and complex cards in the tarot. Beyond romantic love, it speaks to the choices we make that define who we are. When this card appears, a significant decision awaits—one that requires you to align with your deepest values and highest self. In matters of the heart, the Lovers promises a soulful connection, mutual attraction, and the potential for a deeply fulfilling partnership. This relationship mirrors back your own growth and challenges you to become your best self. For other areas of life, this card indicates a crossroads where you must choose authentically. Trust your heart, align your actions with your values, and know that love—in all its forms—is guiding you forward.',
      meaningKo: '연인 카드는 타로에서 가장 강력하고 복잡한 카드 중 하나입니다. 로맨틱한 사랑을 넘어, 우리가 누구인지를 정의하는 선택들에 대해 말합니다. 이 카드가 나타나면, 중요한 결정이 기다리고 있습니다—가장 깊은 가치와 최고의 자아와 일치해야 하는 결정. 마음의 문제에서 연인 카드는 영혼의 연결, 상호 끌림, 그리고 깊이 충족되는 파트너십의 가능성을 약속합니다. 이 관계는 당신의 성장을 반영하고 최고의 자아가 되도록 도전합니다. 삶의 다른 영역에서 이 카드는 진정성 있게 선택해야 하는 갈림길을 나타냅니다. 마음을 믿고, 행동을 가치와 일치시키고, 모든 형태의 사랑이 앞으로 인도하고 있음을 알아주세요.',
      advice: 'Choose with your heart. Align your actions with your deepest values.',
      adviceKo: '마음으로 선택하세요. 행동을 가장 깊은 가치와 일치시키세요.'
    },
    reversed: {
      keywords: ['Disharmony', 'Imbalance', 'Misaligned values', 'Difficult choices', 'Self-love needed'],
      keywordsKo: ['불화', '불균형', '가치관 불일치', '어려운 선택', '자기 사랑 필요'],
      meaning: 'The reversed Lovers points to disharmony in relationships or an internal conflict about an important choice. You may be facing a decision where your heart pulls one way and logic another. There could be a values mismatch in a relationship, making it difficult to find common ground. Sometimes this card indicates the need to choose yourself first—self-love must come before you can truly love another. In matters of the heart, examine whether you are settling for less than you deserve or staying in a situation that no longer serves your growth. The reversed Lovers asks: Are you being true to yourself? Realign with your authentic values before making any major decisions.',
      meaningKo: '역방향 연인은 관계의 불화나 중요한 선택에 대한 내적 갈등을 가리킵니다. 마음은 한 방향으로, 논리는 다른 방향으로 끌리는 결정에 직면해 있을 수 있습니다. 관계에서 가치관 불일치가 있어 공통점을 찾기 어려울 수 있습니다. 때때로 이 카드는 먼저 자신을 선택해야 함을 나타냅니다—다른 사람을 진정으로 사랑하기 전에 자기 사랑이 먼저여야 합니다. 마음의 문제에서 자격이 되는 것보다 덜한 것에 만족하고 있거나 성장에 더 이상 도움이 되지 않는 상황에 머물고 있는지 살펴보세요. 역방향 연인은 묻습니다: 자신에게 진실한가요? 중요한 결정을 내리기 전에 진정한 가치와 재정렬하세요.',
      advice: 'Prioritize self-love. Realign with your authentic values.',
      adviceKo: '자기 사랑을 우선시하세요. 진정한 가치와 재정렬하세요.'
    }
  },
  {
    id: 7,
    name: 'The Chariot',
    nameKo: '전차',
    arcana: 'major',
    suit: 'major',
    image: '/cards/7.jpg',
    upright: {
      keywords: ['Control', 'Willpower', 'Victory', 'Assertion', 'Determination'],
      keywordsKo: ['승리', '의지력', '통제', '결단력', '전진'],
      meaning: 'The Chariot charges forward with unstoppable momentum—victory is within your grasp. This card represents the triumph of will over obstacles, the focused drive that turns dreams into reality. You are in the driver\'s seat of your destiny, steering opposing forces toward a unified goal. The black and white sphinxes represent the balance of opposing energies that you have learned to harness. In career, expect significant progress, promotions, or successful project completions. In love, this may indicate moving a relationship forward—perhaps moving in together or making a commitment. The Chariot reminds you that success requires not just passion, but discipline and direction. Stay the course; the finish line is closer than you think.',
      meaningKo: '전차는 멈출 수 없는 추진력으로 돌진합니다—승리가 손에 닿을 곳에 있습니다. 이 카드는 장애물에 대한 의지의 승리, 꿈을 현실로 바꾸는 집중된 추진력을 나타냅니다. 당신은 운명의 운전석에 앉아 대립하는 힘들을 하나의 목표로 조종하고 있습니다. 흑백의 스핑크스는 당신이 조화시키는 법을 배운 대립 에너지의 균형을 상징합니다. 직업에서는 상당한 진전, 승진, 또는 성공적인 프로젝트 완료를 기대하세요. 사랑에서는 관계를 진전시키는 것—아마도 동거나 약속을 하는 것—을 의미할 수 있습니다. 전차는 성공에는 열정뿐 아니라 규율과 방향이 필요함을 상기시킵니다. 방향을 유지하세요; 결승선은 생각보다 가깝습니다.',
      advice: 'Charge forward with determination. Victory is within reach.',
      adviceKo: '결단력 있게 전진하세요. 승리가 손에 닿을 곳에 있습니다.'
    },
    reversed: {
      keywords: ['Lack of control', 'Lack of direction', 'Aggression', 'Obstacles', 'Self-discipline'],
      keywordsKo: ['통제력 상실', '방향 상실', '공격성', '장애물', '자기 규율 부족'],
      meaning: 'The reversed Chariot suggests you may have lost control of the reins. Internal conflicts are pulling you in different directions, making forward progress impossible. Perhaps aggression has replaced assertiveness, or you\'re trying to force outcomes that need a gentler approach. In career, projects may stall due to scattered energy or power struggles. In relationships, one partner may be trying to dominate the other, or you\'re both heading in incompatible directions. This card asks you to pause and regain your center before charging ahead. Sometimes the bravest thing is to stop, reassess, and realign. True strength isn\'t about forcing your way—it\'s about knowing when to push and when to yield.',
      meaningKo: '역방향 전차는 고삐의 통제력을 잃었음을 암시합니다. 내적 갈등이 당신을 다른 방향으로 끌어당겨 전진을 불가능하게 합니다. 아마도 공격성이 단호함을 대체했거나, 더 부드러운 접근이 필요한 결과를 억지로 만들려 하고 있을 수 있습니다. 직업에서는 분산된 에너지나 권력 다툼으로 프로젝트가 정체될 수 있습니다. 관계에서는 한 파트너가 상대를 지배하려 하거나, 둘 다 양립할 수 없는 방향으로 가고 있을 수 있습니다. 이 카드는 돌진하기 전에 멈추고 중심을 되찾으라고 요청합니다. 때로는 멈추고, 재평가하고, 재정렬하는 것이 가장 용감한 일입니다. 진정한 힘은 억지로 길을 만드는 것이 아니라—언제 밀고 언제 양보할지 아는 것입니다.',
      advice: 'Regain control and focus. Pause to realign your direction.',
      adviceKo: '통제력과 집중력을 되찾으세요. 방향을 재정렬하기 위해 잠시 멈추세요.'
    }
  },
  {
    id: 8,
    name: 'Strength',
    nameKo: '힘',
    arcana: 'major',
    suit: 'major',
    image: '/cards/8.jpg',
    upright: {
      keywords: ['Strength', 'Courage', 'Patience', 'Control', 'Compassion'],
      keywordsKo: ['내면의 힘', '용기', '인내', '자제력', '연민'],
      meaning: 'The Strength card reveals that true power lies not in force, but in the quiet confidence of a lion tamed by gentle hands. The woman calmly closing the lion\'s mouth shows that you can overcome any wild impulse or fierce challenge through patience, love, and inner resolve. This is the strength that comes from knowing yourself deeply—your shadows, your fears, your passions—and embracing all of it. In love, this card indicates a relationship built on mutual respect and emotional maturity, where both partners bring out the best in each other. In career, your calm demeanor and emotional intelligence will help you navigate difficult situations. Trust that you have an infinite well of courage within you. Approach challenges with compassion, including compassion for yourself.',
      meaningKo: '힘 카드는 진정한 힘이 무력이 아닌, 부드러운 손에 길들여진 사자의 조용한 자신감에 있음을 보여줍니다. 사자의 입을 차분히 닫는 여성은 인내, 사랑, 내면의 결의로 어떤 야생 충동이나 거친 도전도 극복할 수 있음을 보여줍니다. 이것은 자신을 깊이 아는 데서 오는 힘입니다—그림자, 두려움, 열정 모두를 받아들이는 것. 사랑에서 이 카드는 상호 존중과 정서적 성숙함 위에 세워진 관계, 두 파트너가 서로의 최선을 이끌어내는 관계를 나타냅니다. 직업에서는 당신의 차분한 태도와 감성 지능이 어려운 상황을 헤쳐나가는 데 도움이 될 것입니다. 당신 안에 무한한 용기의 샘이 있음을 믿으세요. 자신에 대한 연민을 포함해 연민으로 도전에 접근하세요.',
      advice: 'Face challenges with gentle courage. Your inner strength is limitless.',
      adviceKo: '부드러운 용기로 도전에 맞서세요. 내면의 힘은 무한합니다.'
    },
    reversed: {
      keywords: ['Inner turmoil', 'Weakness', 'Self-doubt', 'Lack of self-control', 'Insecurity'],
      keywordsKo: ['내적 혼란', '나약함', '자기 의심', '자제력 부족', '불안감'],
      meaning: 'The reversed Strength card suggests an inner battle you may be losing. Self-doubt whispers that you\'re not enough, that the challenges before you are too great. Perhaps you\'ve been suppressing your emotions so long that they\'re now erupting in unhealthy ways—or conversely, you\'ve let your impulses run wild without any restraint. In relationships, there may be power imbalances or a loss of self in trying to please others. In career, you might feel like an impostor, doubting your abilities despite evidence of competence. This card gently reminds you that strength isn\'t about being perfect or invulnerable. It\'s about the courage to face your weaknesses. Seek support if you need it—asking for help is also a form of strength.',
      meaningKo: '역방향 힘 카드는 지고 있을 수 있는 내면의 전투를 암시합니다. 자기 의심이 당신이 충분하지 않다고, 앞에 놓인 도전이 너무 크다고 속삭입니다. 아마도 감정을 너무 오래 억눌러서 이제 건강하지 않은 방식으로 폭발하고 있거나—반대로 충동을 아무 제약 없이 풀어놓았을 수 있습니다. 관계에서는 힘의 불균형이 있거나 다른 사람을 기쁘게 하려다 자신을 잃었을 수 있습니다. 직업에서는 능력의 증거에도 불구하고 자신의 능력을 의심하며 사기꾼처럼 느낄 수 있습니다. 이 카드는 힘이 완벽하거나 무적이 되는 것이 아님을 부드럽게 상기시킵니다. 약점을 마주할 용기에 관한 것입니다. 필요하다면 도움을 구하세요—도움을 요청하는 것도 힘의 한 형태입니다.',
      advice: 'Believe in yourself. Asking for help is also strength.',
      adviceKo: '자신을 믿으세요. 도움을 요청하는 것도 힘입니다.'
    }
  },
  {
    id: 9,
    name: 'The Hermit',
    nameKo: '은둔자',
    arcana: 'major',
    suit: 'major',
    image: '/cards/9.jpg',
    upright: {
      keywords: ['Soul-searching', 'Introspection', 'Being alone', 'Inner guidance', 'Wisdom'],
      keywordsKo: ['성찰', '고독', '내면의 지혜', '탐구', '명상'],
      meaning: 'The Hermit stands alone on the mountain peak, his lantern illuminating the path for those who will follow. This card calls you to a sacred period of solitude and soul-searching. Step away from the noise of daily life to listen to your inner voice—the answers you seek are already within you, waiting to be discovered. This is not about loneliness, but about purposeful withdrawal to gain wisdom and clarity. In career, you may need to take time to reassess your direction before making major decisions. In relationships, this could indicate a need for personal space or time apart to understand what you truly want. The Hermit reminds us that the deepest truths are found in silence. Trust your inner guidance; it has never led you astray.',
      meaningKo: '은둔자는 산꼭대기에 홀로 서서, 그의 등불로 따라올 자들의 길을 비춥니다. 이 카드는 당신을 고독과 영혼 탐구의 신성한 시간으로 부릅니다. 일상의 소음에서 벗어나 내면의 목소리에 귀 기울이세요—찾는 답은 이미 당신 안에 있으며, 발견되기를 기다리고 있습니다. 이것은 외로움이 아니라, 지혜와 명료함을 얻기 위한 목적 있는 물러남입니다. 직업에서는 중요한 결정을 내리기 전에 방향을 재평가할 시간이 필요할 수 있습니다. 관계에서는 진정으로 원하는 것을 이해하기 위해 개인 공간이나 떨어진 시간이 필요함을 나타낼 수 있습니다. 은둔자는 가장 깊은 진실이 침묵 속에서 발견됨을 상기시킵니다. 내면의 안내를 믿으세요; 그것은 당신을 잘못된 길로 이끈 적이 없습니다.',
      advice: 'Seek wisdom in solitude. The answers lie within you.',
      adviceKo: '고독 속에서 지혜를 찾으세요. 답은 당신 안에 있습니다.'
    },
    reversed: {
      keywords: ['Isolation', 'Loneliness', 'Withdrawal', 'Paranoia', 'Being anti-social'],
      keywordsKo: ['고립', '외로움', '은둔', '편집증', '사회 회피'],
      meaning: 'The reversed Hermit warns that solitude has become isolation, and introspection has turned into rumination. You may be withdrawing from the world not for wisdom, but from fear, shame, or depression. The healthy need for alone time has morphed into avoidance of life itself. Perhaps you\'re so lost in your own thoughts that you\'ve lost touch with reality, or you\'re rejecting help and connection when you need it most. In relationships, this card may indicate emotional unavailability or pushing loved ones away. In career, excessive isolation may be limiting your opportunities and growth. The reversed Hermit asks: Are you seeking wisdom, or hiding from the world? It\'s time to emerge from your cave and reconnect with life.',
      meaningKo: '역방향 은둔자는 고독이 고립이 되었고, 성찰이 곱씹기로 변했음을 경고합니다. 지혜가 아닌 두려움, 수치심, 또는 우울에서 세상으로부터 물러나고 있을 수 있습니다. 혼자만의 시간에 대한 건강한 필요가 삶 자체의 회피로 변형되었습니다. 아마도 자신의 생각에 너무 빠져 현실과 접촉을 잃었거나, 가장 필요할 때 도움과 연결을 거부하고 있을 수 있습니다. 관계에서 이 카드는 정서적 거리두기나 사랑하는 사람들을 밀어내는 것을 나타낼 수 있습니다. 직업에서 과도한 고립은 기회와 성장을 제한할 수 있습니다. 역방향 은둔자는 묻습니다: 지혜를 찾고 있나요, 아니면 세상에서 숨고 있나요? 동굴에서 나와 삶과 다시 연결할 때입니다.',
      advice: 'Emerge from isolation. Reconnect with the world.',
      adviceKo: '고립에서 나오세요. 세상과 다시 연결하세요.'
    }
  },
  {
    id: 10,
    name: 'Wheel of Fortune',
    nameKo: '운명의 수레바퀴',
    arcana: 'major',
    suit: 'major',
    image: '/cards/10.jpg',
    upright: {
      keywords: ['Good luck', 'Karma', 'Life cycles', 'Destiny', 'A turning point'],
      keywordsKo: ['행운', '운명', '전환점', '순환', '카르마'],
      meaning: 'The great Wheel of Fortune spins, bringing a pivotal change in your destiny. What was down is now rising up; luck is shifting in your favor. This card represents the natural cycles of life—nothing remains static, and right now, the universe is moving things in a positive direction for you. Karmic forces are at play; the good you have put into the world is returning to you. In career, expect unexpected opportunities, promotions, or fortunate connections. In love, fate may be bringing someone special into your life or strengthening an existing bond. The Wheel reminds us that life is constantly in motion. Embrace this moment of positive change, but also remember—stay humble, for the wheel will turn again. Make the most of this fortunate time.',
      meaningKo: '거대한 운명의 수레바퀴가 돌며 당신의 운명에 중대한 변화를 가져옵니다. 내려갔던 것이 이제 올라가고 있습니다; 행운이 당신에게 유리하게 바뀌고 있습니다. 이 카드는 삶의 자연스러운 순환을 나타냅니다—아무것도 정적으로 남지 않으며, 지금 우주는 당신에게 긍정적인 방향으로 움직이고 있습니다. 카르마의 힘이 작용하고 있습니다; 당신이 세상에 뿌린 좋은 것이 돌아오고 있습니다. 직업에서는 예상치 못한 기회, 승진, 또는 행운의 인연을 기대하세요. 사랑에서는 운명이 특별한 누군가를 당신의 삶으로 데려오거나 기존의 유대를 강화할 수 있습니다. 수레바퀴는 삶이 끊임없이 움직인다는 것을 상기시킵니다. 이 긍정적 변화의 순간을 받아들이되, 바퀴는 다시 돌 것이므로 겸손하게 남으세요. 이 행운의 시간을 최대한 활용하세요.',
      advice: 'Embrace the turning tide. Fortune favors you now.',
      adviceKo: '변화의 물결을 받아들이세요. 지금 행운이 당신에게 유리합니다.'
    },
    reversed: {
      keywords: ['Bad luck', 'Resistance to change', 'Breaking cycles', 'Negative external forces'],
      keywordsKo: ['불운', '변화 저항', '악순환', '외부 역풍'],
      meaning: 'The reversed Wheel of Fortune indicates a downturn in luck or being caught in an unfavorable cycle. External forces seem to be working against you, and no matter what you do, the results aren\'t what you hoped for. You may be resisting the natural flow of life, trying to hold onto something that is meant to change. Perhaps you\'re repeating the same mistakes, caught in a karmic loop that you haven\'t yet learned to break. In career, setbacks and obstacles may feel relentless. In relationships, patterns of dysfunction may be repeating. Yet within this challenge lies an invitation: the reversed Wheel asks you to examine what cycles you need to break. This difficult period is temporary. Use it to learn and grow, and the wheel will turn in your favor once more.',
      meaningKo: '역방향 운명의 수레바퀴는 운의 하락이나 불리한 순환에 갇혀 있음을 나타냅니다. 외부 세력이 당신에게 불리하게 작용하는 것처럼 보이고, 무엇을 해도 원하는 결과가 나오지 않습니다. 삶의 자연스러운 흐름에 저항하며 변해야 할 것을 붙잡고 있을 수 있습니다. 아마도 같은 실수를 반복하며, 아직 깨는 법을 배우지 못한 카르마의 고리에 갇혀 있을 수 있습니다. 직업에서는 좌절과 장애물이 끊임없이 느껴질 수 있습니다. 관계에서는 역기능의 패턴이 반복될 수 있습니다. 그러나 이 도전 안에 초대가 있습니다: 역방향 수레바퀴는 어떤 순환을 끊어야 하는지 살펴보라고 요청합니다. 이 어려운 시기는 일시적입니다. 배우고 성장하는 데 사용하면, 바퀴는 다시 한번 당신에게 유리하게 돌아갈 것입니다.',
      advice: 'This too shall pass. Trust in the cycles of life.',
      adviceKo: '이것도 지나갈 것입니다. 삶의 순환을 믿으세요.'
    }
  },
  {
    id: 11,
    name: 'Justice',
    nameKo: '정의',
    arcana: 'major',
    suit: 'major',
    image: '/cards/11.jpg',
    upright: {
      keywords: ['Justice', 'Fairness', 'Truth', 'Cause and effect', 'Law'],
      keywordsKo: ['정의', '공정', '진실', '인과응보', '균형'],
      meaning: 'Justice sits upon her throne, scales balanced, sword ready—the universe is calling for truth and accountability. This card represents the law of cause and effect in action. Every choice you have made has led to this moment, and a fair outcome is now being delivered. If you have acted with integrity, you will be rewarded. If there are legal matters pending, expect a just resolution. Justice asks you to be honest with yourself and others, to take responsibility for your actions, and to make decisions based on logic and fairness rather than emotion. In relationships, this card may indicate the need for honest communication and equal give-and-take. In career, ethical behavior and fair dealing will lead to success. The sword of truth cuts both ways—embrace it with courage.',
      meaningKo: '정의는 저울을 균형 잡고, 검을 준비한 채 왕좌에 앉아 있습니다—우주가 진실과 책임을 요청하고 있습니다. 이 카드는 작용하는 원인과 결과의 법칙을 나타냅니다. 당신이 내린 모든 선택이 이 순간으로 이끌었고, 공정한 결과가 전달되고 있습니다. 정직하게 행동했다면 보상받을 것입니다. 법적 문제가 있다면 정당한 해결을 기대하세요. 정의는 자신과 타인에게 정직하고, 행동에 책임을 지며, 감정보다 논리와 공정함에 기반해 결정을 내리라고 요청합니다. 관계에서 이 카드는 정직한 소통과 동등한 주고받음의 필요성을 나타낼 수 있습니다. 직업에서는 윤리적 행동과 공정한 거래가 성공으로 이끌 것입니다. 진실의 검은 양날입니다—용기를 가지고 받아들이세요.',
      advice: 'Act with integrity. The truth will prevail. Take responsibility.',
      adviceKo: '진실성으로 행동하세요. 진실이 승리할 것입니다. 책임을 지세요.'
    },
    reversed: {
      keywords: ['Unfairness', 'Lack of accountability', 'Dishonesty', 'Injustice', 'Legal disputes'],
      keywordsKo: ['불공정', '책임 회피', '부정직', '불의', '법적 분쟁'],
      meaning: 'The reversed Justice card warns of imbalance and unfairness in your current situation. Someone may not be telling the whole truth, or a decision is being made based on biased information. You may be avoiding accountability for your own actions, pointing fingers at others instead of looking inward. Perhaps you\'re experiencing the consequences of past dishonesty, or you\'re being treated unfairly by external forces. In legal matters, this card can indicate complications or unjust outcomes. In relationships, there may be a lack of equality or hidden resentments. In career, unethical shortcuts may seem tempting but will backfire. The reversed Justice asks you to restore balance by first being honest with yourself. Own your part in the situation, and work toward fairness even when others don\'t.',
      meaningKo: '역방향 정의 카드는 현재 상황의 불균형과 불공정을 경고합니다. 누군가 전체 진실을 말하지 않거나, 편향된 정보에 기반해 결정이 내려지고 있을 수 있습니다. 자신의 행동에 대한 책임을 회피하며 내면을 보는 대신 다른 사람을 탓하고 있을 수 있습니다. 아마도 과거 부정직의 결과를 경험하고 있거나, 외부 세력에 의해 불공정한 대우를 받고 있을 수 있습니다. 법적 문제에서 이 카드는 복잡함이나 부당한 결과를 나타낼 수 있습니다. 관계에서는 평등 부재나 숨겨진 원망이 있을 수 있습니다. 직업에서 비윤리적 지름길은 유혹적으로 보일 수 있지만 역효과를 낼 것입니다. 역방향 정의는 먼저 자신에게 정직해짐으로써 균형을 회복하라고 요청합니다. 상황에서 당신의 역할을 인정하고, 다른 사람들이 그렇지 않을 때도 공정함을 향해 노력하세요.',
      advice: 'Face the consequences honestly. Seek fairness and take accountability.',
      adviceKo: '결과를 정직하게 마주하세요. 공정함을 추구하고 책임을 지세요.'
    }
  },
  {
    id: 12,
    name: 'The Hanged Man',
    nameKo: '매달린 사람',
    arcana: 'major',
    suit: 'major',
    image: '/cards/12.jpg',
    upright: {
      keywords: ['Pause', 'Surrender', 'Letting go', 'New perspectives', 'Sacrifice'],
      keywordsKo: ['멈춤', '항복', '내려놓음', '새로운 관점', '희생'],
      meaning: 'The Hanged Man hangs suspended between heaven and earth, not in suffering but in peaceful contemplation. This card invites you to see the world from a completely different angle. Sometimes the greatest action is non-action—a willing surrender to circumstances beyond your control. What feels like a pause or delay is actually a profound opportunity for spiritual growth and new understanding. Perhaps you need to sacrifice something now to gain something greater later. In career, this may mean stepping back from ambition to reassess your true calling. In love, it could indicate the need to release expectations and simply be present. The Hanged Man reminds you that not every problem needs to be solved immediately. Let go, surrender, and allow wisdom to come to you in the stillness.',
      meaningKo: '매달린 사람은 하늘과 땅 사이에 매달려 있습니다—고통이 아닌 평화로운 명상 속에서. 이 카드는 완전히 다른 각도에서 세상을 보도록 초대합니다. 때때로 가장 위대한 행동은 비행동입니다—통제할 수 없는 상황에 기꺼이 항복하는 것. 멈춤이나 지연처럼 느껴지는 것이 실제로는 영적 성장과 새로운 이해를 위한 심오한 기회입니다. 아마도 나중에 더 큰 것을 얻기 위해 지금 무언가를 희생해야 할 수도 있습니다. 직업에서는 진정한 소명을 재평가하기 위해 야망에서 한 발 물러서는 것을 의미할 수 있습니다. 사랑에서는 기대를 내려놓고 단순히 현재에 존재해야 함을 나타낼 수 있습니다. 매달린 사람은 모든 문제가 즉시 해결될 필요가 없음을 상기시킵니다. 내려놓고, 항복하고, 고요함 속에서 지혜가 당신에게 오도록 허용하세요.',
      advice: 'Surrender and trust the process. A new perspective awaits.',
      adviceKo: '내맡기고 과정을 믿으세요. 새로운 관점이 기다리고 있습니다.'
    },
    reversed: {
      keywords: ['Delays', 'Resistance', 'Stalling', 'Indecision', 'Martyrdom'],
      keywordsKo: ['지연', '저항', '정체', '우유부단', '희생자 역할'],
      meaning: 'The reversed Hanged Man indicates you are resisting a necessary period of pause, and this resistance is causing frustration and stagnation. You may be struggling against circumstances that require surrender, wasting energy fighting the inevitable. Perhaps you\'re making sacrifices that aren\'t truly necessary, playing the martyr to avoid facing deeper issues. There\'s a difference between purposeful surrender and giving up—make sure you know which you\'re doing. In career, you may be stuck in indecision, neither moving forward nor allowing yourself to rest. In relationships, an inability to see your partner\'s perspective may be creating distance. The reversed Hanged Man asks: What are you so afraid of letting go? Sometimes we must fall to fly. Release your grip and trust the process.',
      meaningKo: '역방향 매달린 사람은 필요한 멈춤의 시기에 저항하고 있으며, 이 저항이 좌절과 정체를 일으키고 있음을 나타냅니다. 항복이 필요한 상황에 맞서 싸우며, 불가피한 것과 싸우느라 에너지를 낭비하고 있을 수 있습니다. 아마도 정말 필요하지 않은 희생을 하며, 더 깊은 문제를 마주하는 것을 피하기 위해 순교자 역할을 하고 있을 수 있습니다. 목적 있는 항복과 포기 사이에는 차이가 있습니다—어느 것을 하고 있는지 확인하세요. 직업에서는 앞으로 나아가지도, 스스로 쉬도록 허용하지도 않으며 우유부단에 갇혀 있을 수 있습니다. 관계에서 파트너의 관점을 보지 못하는 것이 거리를 만들고 있을 수 있습니다. 역방향 매달린 사람은 묻습니다: 무엇을 내려놓는 것이 그렇게 두렵나요? 때때로 날기 위해 떨어져야 합니다. 붙잡은 것을 놓고 과정을 신뢰하세요.',
      advice: 'Stop resisting the pause. Release the need for control.',
      adviceKo: '멈춤에 저항하지 마세요. 통제에 대한 필요를 놓으세요.'
    }
  },
  {
    id: 13,
    name: 'Death',
    nameKo: '죽음',
    arcana: 'major',
    suit: 'major',
    image: '/cards/13.jpg',
    upright: {
      keywords: ['Endings', 'Change', 'Transformation', 'Transition', 'Letting go'],
      keywordsKo: ['끝', '변화', '변신', '전환', '내려놓음'],
      meaning: 'Despite its fearsome imagery, the Death card rarely means physical death. Instead, it heralds profound transformation—the end of one chapter and the birth of another. Like the phoenix rising from ashes, you are being called to release what no longer serves you to make room for something new and beautiful. This could be the end of a relationship, a career, an old identity, or deeply held beliefs. Though endings can be painful, they are necessary for growth. In love, an old pattern may be dying to make way for healthier connections. In career, a door closes so a better one can open. The Death card promises that on the other side of this transformation lies renewal. Trust the cycle of life. What falls away was never truly yours to keep; what remains is your authentic path forward.',
      meaningKo: '무서운 이미지에도 불구하고, 죽음 카드는 물리적 죽음을 의미하는 경우가 드뭅니다. 대신 심오한 변화를 예고합니다—한 장의 끝과 다른 장의 탄생. 재에서 떠오르는 불사조처럼, 새롭고 아름다운 것을 위한 공간을 만들기 위해 더 이상 도움이 되지 않는 것을 놓으라는 부름을 받고 있습니다. 이것은 관계, 직업, 오래된 정체성, 또는 깊이 간직한 신념의 끝일 수 있습니다. 끝맺음은 고통스러울 수 있지만, 성장에 필요합니다. 사랑에서는 더 건강한 연결을 위해 오래된 패턴이 죽어가고 있을 수 있습니다. 직업에서는 더 나은 문이 열리도록 한 문이 닫힙니다. 죽음 카드는 이 변화의 반대편에 갱신이 있음을 약속합니다. 삶의 순환을 신뢰하세요. 떨어져 나가는 것은 진정으로 당신이 간직할 것이 아니었습니다; 남는 것이 당신의 진정한 앞으로의 길입니다.',
      advice: 'Let go of what no longer serves you. Transformation brings rebirth.',
      adviceKo: '더 이상 도움이 되지 않는 것을 놓으세요. 변화는 재탄생을 가져옵니다.'
    },
    reversed: {
      keywords: ['Resistance to change', 'Holding on', 'Stagnation', 'Fear of change', 'Decay'],
      keywordsKo: ['변화 저항', '집착', '정체', '변화 두려움', '쇠퇴'],
      meaning: 'The reversed Death card suggests you are clinging to something that needs to end. Fear of the unknown is keeping you trapped in a situation that has run its course, and this resistance is causing stagnation, decay, and suffering. Perhaps you\'re staying in a dead-end relationship out of fear of being alone, or remaining in an unfulfilling job because change feels too risky. You may be holding onto an old version of yourself that no longer fits who you\'re becoming. In career, refusing to adapt may lead to being left behind. In relationships, avoiding necessary endings only prolongs pain for everyone. The reversed Death asks you to examine what you\'re so afraid of losing. True death is not transformation—it\'s the refusal to transform. Have courage. Let go. Something better awaits.',
      meaningKo: '역방향 죽음 카드는 끝나야 할 무언가에 집착하고 있음을 암시합니다. 미지에 대한 두려움이 수명을 다한 상황에 갇히게 하고, 이 저항이 정체, 쇠퇴, 고통을 일으키고 있습니다. 아마도 혼자가 되는 것이 두려워 막다른 관계에 머물거나, 변화가 너무 위험하게 느껴져 불만족스러운 직업에 남아 있을 수 있습니다. 더 이상 되어가는 자신에게 맞지 않는 자신의 오래된 버전을 붙잡고 있을 수 있습니다. 직업에서 적응을 거부하면 뒤처지게 될 수 있습니다. 관계에서 필요한 끝맺음을 피하는 것은 모든 사람의 고통을 연장할 뿐입니다. 역방향 죽음은 무엇을 잃는 것이 그렇게 두려운지 살펴보라고 요청합니다. 진정한 죽음은 변화가 아닙니다—변화를 거부하는 것입니다. 용기를 가지세요. 놓으세요. 더 나은 무언가가 기다리고 있습니다.',
      advice: 'Release your fear of change. Holding on only prolongs suffering.',
      adviceKo: '변화에 대한 두려움을 놓으세요. 붙잡으면 고통만 길어집니다.'
    }
  },
  {
    id: 14,
    name: 'Temperance',
    nameKo: '절제',
    arcana: 'major',
    suit: 'major',
    image: '/cards/14.jpg',
    upright: {
      keywords: ['Balance', 'Moderation', 'Patience', 'Purpose', 'Harmony'],
      keywordsKo: ['균형', '절제', '인내', '목적', '조화'],
      meaning: 'The angel of Temperance pours water between two cups in a continuous, balanced flow—teaching us the art of harmony and moderation. This card calls you to find the middle path, blending opposing forces into a unified whole. Whether it\'s balancing work and rest, logic and emotion, or giving and receiving, the key to your current situation lies in integration. Patience is essential; lasting solutions take time to develop. In relationships, Temperance suggests finding compromise and understanding, creating a peaceful partnership where both can thrive. In career, measured and steady progress will take you further than impulsive action. This is also a card of healing—emotional, physical, or spiritual. Trust the process of gradual restoration. The angel has one foot in water (emotion) and one on land (material world), showing that you can bridge these realms successfully.',
      meaningKo: '절제의 천사가 두 잔 사이로 물을 연속적이고 균형 잡힌 흐름으로 부으며—조화와 절제의 예술을 가르칩니다. 이 카드는 중간 길을 찾아 대립하는 힘을 통합된 전체로 조화시키라고 요청합니다. 일과 휴식, 논리와 감정, 주고받음의 균형이든, 현재 상황의 열쇠는 통합에 있습니다. 인내가 필수입니다; 지속적인 해결책은 발전하는 데 시간이 걸립니다. 관계에서 절제는 타협과 이해를 찾아 둘 다 번영할 수 있는 평화로운 파트너십을 만들 것을 제안합니다. 직업에서는 신중하고 꾸준한 진전이 충동적인 행동보다 더 멀리 데려갈 것입니다. 이것은 또한 치유의 카드입니다—정서적, 신체적, 또는 영적으로. 점진적 회복의 과정을 신뢰하세요. 천사는 한 발은 물(감정)에, 한 발은 땅(물질 세계)에 두고 있으며, 이 영역들을 성공적으로 연결할 수 있음을 보여줍니다.',
      advice: 'Find balance and moderation. Patience will bring harmony.',
      adviceKo: '균형과 절제를 찾으세요. 인내가 조화를 가져올 것입니다.'
    },
    reversed: {
      keywords: ['Imbalance', 'Extremes', 'Excess', 'Lack of harmony', 'Recklessness'],
      keywordsKo: ['불균형', '극단', '과잉', '부조화', '무모함'],
      meaning: 'The reversed Temperance warns of imbalance throwing your life into disarray. You may be swinging between extremes—overworking then burning out, overindulging then restricting, giving everything then resentfully withdrawing. This lack of moderation creates conflict both within yourself and with others. Perhaps you\'re being impatient, wanting immediate results and cutting corners that will cost you later. In relationships, there may be a lack of give-and-take, with one person doing all the compromising. In career, excessive ambition or recklessness may be leading to mistakes. The reversed Temperance asks: Where in your life are you out of balance? What opposing forces within you need reconciliation? Slow down, find your center, and remember that sustainable progress requires patience and moderation.',
      meaningKo: '역방향 절제는 불균형이 삶을 혼란에 빠뜨리고 있음을 경고합니다. 극단 사이를 오가고 있을 수 있습니다—과로 후 번아웃, 과식 후 제한, 모든 것을 주고 나서 원망하며 철수. 이 절제 부족이 자신 안에서 그리고 타인과 갈등을 만듭니다. 아마도 조급하여 즉각적인 결과를 원하고 나중에 대가를 치르게 될 지름길을 택하고 있을 수 있습니다. 관계에서는 주고받음이 부족하고, 한 사람이 모든 타협을 하고 있을 수 있습니다. 직업에서 과도한 야망이나 무모함이 실수로 이어질 수 있습니다. 역방향 절제는 묻습니다: 삶의 어디서 균형을 잃었나요? 당신 안의 어떤 대립하는 힘들이 화해가 필요한가요? 속도를 늦추고, 중심을 찾고, 지속 가능한 진전에는 인내와 절제가 필요함을 기억하세요.',
      advice: 'Restore balance. Avoid extremes and practice moderation.',
      adviceKo: '균형을 회복하세요. 극단을 피하고 절제를 실천하세요.'
    }
  },
  {
    id: 15,
    name: 'The Devil',
    nameKo: '악마',
    arcana: 'major',
    suit: 'major',
    image: '/cards/15.jpg',
    upright: {
      keywords: ['Addiction', 'Bondage', 'Materialism', 'Ignorance', 'Negative patterns'],
      keywordsKo: ['중독', '속박', '물질주의', '무지', '부정적 패턴'],
      meaning: 'The Devil card shines a harsh light on the chains that bind you—but look closely: the chains around the figures\' necks are loose enough to remove. This card reveals the illusion of bondage. You may be trapped by addiction, unhealthy relationships, negative thought patterns, or materialistic pursuits that you believe you cannot escape. Yet the truth is, you have given your power to these things; you can reclaim it. The Devil asks you to face your shadow self honestly, to acknowledge the parts of yourself you\'d rather not see. In relationships, this may indicate toxic dynamics or obsessive attachment. In career, it could point to feeling enslaved by work or compromising your values for money. Recognition is the first step to freedom. What chains have you convinced yourself you cannot break? The key to your liberation lies in your own hands.',
      meaningKo: '악마 카드는 당신을 묶는 사슬에 가혹한 빛을 비춥니다—하지만 자세히 보세요: 인물들의 목에 걸린 사슬은 벗을 수 있을 만큼 느슨합니다. 이 카드는 속박의 환상을 드러냅니다. 중독, 건강하지 않은 관계, 부정적 사고 패턴, 또는 벗어날 수 없다고 믿는 물질주의적 추구에 갇혀 있을 수 있습니다. 그러나 진실은, 당신이 이것들에 힘을 주었다는 것입니다; 되찾을 수 있습니다. 악마는 그림자 자아를 정직하게 마주하고, 보고 싶지 않은 자신의 부분을 인정하라고 요청합니다. 관계에서 이것은 독성 역학이나 집착적 애착을 나타낼 수 있습니다. 직업에서는 일에 노예처럼 느끼거나 돈을 위해 가치를 타협하는 것을 가리킬 수 있습니다. 인식이 자유의 첫 걸음입니다. 스스로 깰 수 없다고 확신한 어떤 사슬이 있나요? 해방의 열쇠는 당신 자신의 손에 있습니다.',
      advice: 'Recognize what binds you. You have the power to break free.',
      adviceKo: '무엇이 당신을 묶는지 인식하세요. 벗어날 힘이 있습니다.'
    },
    reversed: {
      keywords: ['Breaking free', 'Detachment', 'Releasing limiting beliefs', 'Reclaiming power'],
      keywordsKo: ['해방', '초연함', '제한적 믿음 해제', '힘 되찾기'],
      meaning: 'The reversed Devil heralds a powerful moment of liberation. You are finally seeing the chains that bound you for what they are—illusions of your own making—and you are ready to break free. An addiction may be losing its grip, a toxic relationship may be ending, or limiting beliefs are crumbling away to reveal your true potential. This card celebrates the courage it takes to face your demons and reclaim your power. In relationships, you may be establishing healthier boundaries or walking away from what doesn\'t serve you. In career, you might be refusing to compromise your integrity any longer. The reversed Devil reminds you that true freedom comes from within. You are not a victim of your circumstances; you are the author of your liberation. Continue on this path of self-empowerment.',
      meaningKo: '역방향 악마는 해방의 강력한 순간을 예고합니다. 마침내 당신을 묶었던 사슬을 있는 그대로—자신이 만든 환상으로—보고 있으며, 벗어날 준비가 되었습니다. 중독이 그 힘을 잃어가고 있거나, 독성 관계가 끝나가거나, 제한적 신념이 무너져 진정한 잠재력이 드러나고 있습니다. 이 카드는 악마와 마주하고 힘을 되찾는 데 필요한 용기를 축하합니다. 관계에서 더 건강한 경계를 세우거나 도움이 되지 않는 것에서 떠나고 있을 수 있습니다. 직업에서 더 이상 정직함을 타협하지 않으려 할 수 있습니다. 역방향 악마는 진정한 자유가 내면에서 온다는 것을 상기시킵니다. 당신은 상황의 희생자가 아닙니다; 해방의 저자입니다. 자기 권한 부여의 이 길을 계속하세요.',
      advice: 'Celebrate your freedom from old patterns. Keep releasing.',
      adviceKo: '오래된 패턴에서 벗어난 자유를 축하하세요. 계속 놓으세요.'
    }
  },
  {
    id: 16,
    name: 'The Tower',
    nameKo: '탑',
    arcana: 'major',
    suit: 'major',
    image: '/cards/16.jpg',
    upright: {
      keywords: ['Sudden change', 'Upheaval', 'Chaos', 'Revelation', 'Awakening'],
      keywordsKo: ['급변', '격변', '혼돈', '깨달음', '각성'],
      meaning: 'Lightning strikes the Tower, shattering structures built on false foundations. The Tower card signals sudden, dramatic upheaval—the kind of change that shakes you to your core. This may feel like destruction, but it is actually liberation. The universe is removing what was never meant to last: relationships built on pretense, careers that betrayed your calling, beliefs that limited your growth. Though the moment of collapse is terrifying, it creates space for something authentic to emerge. In love, a sudden revelation may change everything—but the truth, however painful, is ultimately freeing. In career, unexpected disruption may redirect you toward your true path. The Tower reminds us that sometimes things must fall apart so that something better can come together. After the storm comes clarity. Trust that this destruction serves a higher purpose.',
      meaningKo: '번개가 탑을 치며, 거짓 기반 위에 세워진 구조물을 산산조각냅니다. 탑 카드는 갑작스럽고 극적인 격변—당신을 핵심까지 흔드는 종류의 변화를 신호합니다. 이것은 파괴처럼 느껴질 수 있지만, 실제로는 해방입니다. 우주는 결코 지속되도록 의도되지 않았던 것을 제거하고 있습니다: 가식 위에 세워진 관계, 소명을 배신한 직업, 성장을 제한한 신념. 붕괴의 순간은 무섭지만, 진정한 무언가가 나타날 공간을 만듭니다. 사랑에서 갑작스러운 폭로가 모든 것을 바꿀 수 있습니다—하지만 아무리 고통스러워도 진실은 궁극적으로 자유롭게 합니다. 직업에서 예상치 못한 혼란이 당신을 진정한 길로 방향을 바꿀 수 있습니다. 탑은 때때로 더 나은 것이 함께 올 수 있도록 것들이 무너져야 함을 상기시킵니다. 폭풍 뒤에 명료함이 옵니다. 이 파괴가 더 높은 목적을 위한 것임을 신뢰하세요.',
      advice: 'Embrace the upheaval. What falls away needed to go.',
      adviceKo: '격변을 받아들이세요. 무너지는 것은 가야 할 것이었습니다.'
    },
    reversed: {
      keywords: ['Fear of change', 'Avoiding disaster', 'Delaying the inevitable', 'Resisting destruction'],
      keywordsKo: ['변화 두려움', '재난 회피', '불가피함 지연', '파괴 저항'],
      meaning: 'The reversed Tower suggests you may be clinging to a structure that desperately needs to fall. You can feel the cracks forming, sense the foundation shifting—yet fear of the unknown keeps you inside a crumbling tower. By resisting the inevitable destruction, you are prolonging your own suffering and preventing the liberation that awaits on the other side. Perhaps you\'ve survived a near-disaster and think you\'ve escaped the worst—but the underlying issues remain unaddressed. In relationships, you may be maintaining an illusion of stability that serves no one. In career, you might be ignoring clear warning signs. The reversed Tower asks: What are you so afraid of losing that you\'d rather suffer in a broken structure? Sometimes the bravest thing is to let the tower fall and build something new from the rubble.',
      meaningKo: '역방향 탑은 절박하게 무너져야 하는 구조물에 매달리고 있을 수 있음을 암시합니다. 금이 가는 것을 느끼고, 기반이 흔들리는 것을 감지할 수 있습니다—그러나 미지에 대한 두려움이 무너지는 탑 안에 당신을 가둡니다. 불가피한 파괴에 저항함으로써 자신의 고통을 연장하고 반대편에서 기다리는 해방을 막고 있습니다. 아마도 거의 재앙을 피했고 최악을 모면했다고 생각할 수 있습니다—하지만 근본적인 문제는 다뤄지지 않은 채 남아 있습니다. 관계에서 아무에게도 도움이 되지 않는 안정의 환상을 유지하고 있을 수 있습니다. 직업에서 명확한 경고 신호를 무시하고 있을 수 있습니다. 역방향 탑은 묻습니다: 무엇을 잃는 것이 그렇게 두려워 부서진 구조물에서 고통받는 것을 택하나요? 때로는 탑을 무너뜨리고 잔해에서 새로운 것을 짓는 것이 가장 용감한 일입니다.',
      advice: 'Stop avoiding the inevitable. Face necessary changes head-on.',
      adviceKo: '불가피한 것을 피하지 마세요. 필요한 변화를 정면으로 마주하세요.'
    }
  },
  {
    id: 17,
    name: 'The Star',
    nameKo: '별',
    arcana: 'major',
    suit: 'major',
    image: '/cards/17.jpg',
    upright: {
      keywords: ['Hope', 'Faith', 'Purpose', 'Renewal', 'Spirituality'],
      keywordsKo: ['희망', '믿음', '목적', '회복', '영성'],
      meaning: 'After the storm of the Tower comes the Star—a gentle light of hope and renewal illuminating the darkness. The naked woman pours water onto land and sea, representing the healing flow between conscious and unconscious, material and spiritual realms. This card brings profound peace, inspiration, and the sense that everything will be okay. You are exactly where you need to be. The Star speaks of faith—not blind faith, but the quiet knowing that comes from having survived darkness and seeing the light return. In love, this card promises healing and authentic connection. In career, inspiration and creative flow are available to you. Spiritually, you are being guided by forces greater than yourself. Make a wish upon this star; the universe is listening. Allow hope to fill the spaces that pain once occupied.',
      meaningKo: '탑의 폭풍 후에 별이 옵니다—어둠을 비추는 희망과 갱신의 부드러운 빛. 벌거벗은 여성이 땅과 바다에 물을 부으며, 의식과 무의식, 물질과 영적 영역 사이의 치유의 흐름을 나타냅니다. 이 카드는 깊은 평화, 영감, 그리고 모든 것이 괜찮을 것이라는 감각을 가져옵니다. 당신은 정확히 있어야 할 곳에 있습니다. 별은 믿음에 대해 말합니다—맹목적 믿음이 아니라, 어둠을 견뎌내고 빛이 돌아오는 것을 본 데서 오는 조용한 앎. 사랑에서 이 카드는 치유와 진정한 연결을 약속합니다. 직업에서 영감과 창의적 흐름이 당신에게 열려 있습니다. 영적으로 당신은 자신보다 더 큰 힘에 이끌리고 있습니다. 이 별에 소원을 빌어보세요; 우주가 듣고 있습니다. 고통이 한때 차지했던 공간을 희망이 채우도록 허용하세요.',
      advice: 'Keep faith alive. Healing and hope are coming your way.',
      adviceKo: '믿음을 유지하세요. 치유와 희망이 다가오고 있습니다.'
    },
    reversed: {
      keywords: ['Lack of faith', 'Despair', 'Discouragement', 'Disconnection', 'Insecurity'],
      keywordsKo: ['믿음 부족', '절망', '낙담', '단절', '불안감'],
      meaning: 'The reversed Star suggests you have lost touch with hope and faith. The light that once guided you seems distant or extinguished, leaving you feeling discouraged and disconnected from your purpose. Perhaps past disappointments have made you cynical, or you\'re struggling to see any reason for optimism. You may be blocking your own healing by refusing to believe things can get better. In relationships, insecurity may be preventing genuine intimacy. In career, creative inspiration feels inaccessible, and doubt clouds your vision. Yet even a reversed star contains light—it simply cannot be seen right now. The reversed Star asks you to look for small glimmers of hope, to tend the faintest sparks of faith. Healing begins with believing it\'s possible. The stars haven\'t abandoned you; perhaps you\'ve just looked away.',
      meaningKo: '역방향 별은 희망과 믿음과의 접촉을 잃었음을 암시합니다. 한때 당신을 인도했던 빛이 멀거나 꺼진 것처럼 보여, 낙담하고 목적에서 단절된 느낌을 줍니다. 아마도 과거의 실망이 당신을 냉소적으로 만들었거나, 낙관할 이유를 찾기 어려워하고 있을 수 있습니다. 상황이 나아질 수 있다고 믿기를 거부함으로써 자신의 치유를 막고 있을 수 있습니다. 관계에서 불안감이 진정한 친밀함을 막고 있을 수 있습니다. 직업에서 창의적 영감은 접근하기 어렵고, 의심이 비전을 흐리게 합니다. 그러나 역방향 별조차도 빛을 담고 있습니다—단지 지금은 보이지 않을 뿐. 역방향 별은 희망의 작은 빛줄기를 찾고, 가장 희미한 믿음의 불꽃을 돌보라고 요청합니다. 치유는 그것이 가능하다고 믿는 것에서 시작됩니다. 별들이 당신을 버린 것이 아닙니다; 아마도 당신이 시선을 돌렸을 뿐입니다.',
      advice: 'Don\'t lose hope. Reconnect with your inner light and purpose.',
      adviceKo: '희망을 잃지 마세요. 내면의 빛과 목적과 다시 연결하세요.'
    }
  },
  {
    id: 18,
    name: 'The Moon',
    nameKo: '달',
    arcana: 'major',
    suit: 'major',
    image: '/cards/18.jpg',
    upright: {
      keywords: ['Illusion', 'Fear', 'Anxiety', 'Subconscious', 'Intuition'],
      keywordsKo: ['환상', '두려움', '불안', '잠재의식', '직관'],
      meaning: 'The Moon rises over a mysterious landscape where nothing is quite what it seems. This card speaks of illusion, the unconscious mind, and the fears that lurk in shadow. You may be experiencing confusion, anxiety, or deception—either from others or from your own mind\'s projections. The path ahead is unclear, illuminated only by moonlight that can be as deceptive as it is beautiful. Dreams, intuitions, and deep emotions are heightened now. Pay attention to what your subconscious is trying to tell you through symbols, dreams, and gut feelings. In relationships, there may be hidden truths or miscommunications. In career, not all information has been revealed. The Moon asks you to navigate carefully through this uncertain time, trusting your intuition while remaining aware that fear can distort perception. What you fear in the darkness may be less threatening in daylight.',
      meaningKo: '달이 아무것도 보이는 그대로가 아닌 신비로운 풍경 위로 뜹니다. 이 카드는 환상, 무의식, 그리고 그림자 속에 숨어 있는 두려움에 대해 말합니다. 혼란, 불안, 또는 속임—타인에게서든 자신의 마음의 투사에서든—을 경험하고 있을 수 있습니다. 앞의 길은 불분명하며, 아름다우면서도 기만적일 수 있는 달빛으로만 비춰집니다. 꿈, 직관, 깊은 감정이 지금 고조되어 있습니다. 잠재의식이 상징, 꿈, 직감을 통해 무엇을 말하려 하는지 주의를 기울이세요. 관계에서 숨겨진 진실이나 오해가 있을 수 있습니다. 직업에서 모든 정보가 드러나지 않았습니다. 달은 두려움이 인식을 왜곡할 수 있음을 인식하면서도 직관을 믿고 이 불확실한 시간을 조심스럽게 헤쳐나가라고 요청합니다. 어둠 속에서 두려워하는 것이 대낮에는 덜 위협적일 수 있습니다.',
      advice: 'Trust your intuition through uncertainty. Not everything is as it seems.',
      adviceKo: '불확실함 속에서 직관을 믿으세요. 모든 것이 보이는 대로가 아닙니다.'
    },
    reversed: {
      keywords: ['Release of fear', 'Repressed emotion', 'Inner confusion', 'Truth revealed'],
      keywordsKo: ['두려움 해소', '억압된 감정', '내적 혼란', '진실 드러남'],
      meaning: 'The reversed Moon signals that illusions are beginning to clear and truth is emerging from the shadows. Fears that once paralyzed you are losing their power as you begin to see them for what they really are—often much smaller than they seemed in the dark. Repressed emotions are rising to the surface, seeking acknowledgment and healing. This can be uncomfortable but ultimately liberating. Deceptions may be revealed; secrets come to light. In relationships, honest conversations can finally happen. In career, clarity is returning after a period of confusion. The reversed Moon suggests that your intuition is becoming more reliable as you clear away the fog of anxiety. Trust that the truth, even if painful, is preferable to living in illusion. The night is ending; dawn approaches.',
      meaningKo: '역방향 달은 환상이 걷히기 시작하고 진실이 그림자에서 나오고 있음을 신호합니다. 한때 당신을 마비시켰던 두려움이 실제로 무엇인지—종종 어둠 속에서 보였던 것보다 훨씬 작은—보기 시작하면서 힘을 잃고 있습니다. 억압된 감정이 인정과 치유를 구하며 표면으로 떠오르고 있습니다. 이것은 불편할 수 있지만 궁극적으로 해방적입니다. 속임이 드러날 수 있습니다; 비밀이 밝혀집니다. 관계에서 마침내 정직한 대화가 일어날 수 있습니다. 직업에서 혼란의 시기 후에 명료함이 돌아오고 있습니다. 역방향 달은 불안의 안개를 걷어내면서 직관이 더 신뢰할 수 있게 되고 있음을 암시합니다. 아무리 고통스러워도 진실이 환상 속에 사는 것보다 낫다는 것을 믿으세요. 밤이 끝나가고 있습니다; 새벽이 다가옵니다.',
      advice: 'Face your fears. The truth is emerging from the shadows.',
      adviceKo: '두려움에 맞서세요. 진실이 그림자에서 드러나고 있습니다.'
    }
  },
  {
    id: 19,
    name: 'The Sun',
    nameKo: '태양',
    arcana: 'major',
    suit: 'major',
    image: '/cards/19.jpg',
    upright: {
      keywords: ['Positivity', 'Fun', 'Warmth', 'Success', 'Vitality'],
      keywordsKo: ['긍정', '기쁨', '따뜻함', '성공', '활력'],
      meaning: 'The Sun bursts forth with radiant, life-giving energy—this is one of the most positive cards in the entire deck. After the uncertain darkness of the Moon, the Sun brings clarity, joy, and undeniable success. A child rides joyfully on a white horse, symbolizing the pure innocence and freedom that comes when we live authentically. This card says YES to your questions, promising good outcomes and genuine happiness. In love, the Sun brings warmth, playfulness, and deep connection. In career, success is assured; your efforts will be recognized and rewarded. Health and vitality are strong. The Sun reminds you to embrace your inner child, to find joy in simple pleasures, and to let your true self shine without apology. This is your moment to thrive. Bask in the light you have earned.',
      meaningKo: '태양이 빛나는 생명력 넘치는 에너지로 터져 나옵니다—이것은 전체 덱에서 가장 긍정적인 카드 중 하나입니다. 달의 불확실한 어둠 후에, 태양은 명료함, 기쁨, 그리고 부정할 수 없는 성공을 가져옵니다. 아이가 흰 말 위에서 즐겁게 타고 있으며, 진정성 있게 살 때 오는 순수한 순수함과 자유를 상징합니다. 이 카드는 당신의 질문에 예라고 말하며, 좋은 결과와 진정한 행복을 약속합니다. 사랑에서 태양은 따뜻함, 장난기, 깊은 연결을 가져옵니다. 직업에서 성공이 보장됩니다; 당신의 노력이 인정받고 보상받을 것입니다. 건강과 활력이 강합니다. 태양은 내면 아이를 받아들이고, 단순한 즐거움에서 기쁨을 찾고, 사과 없이 진정한 자신을 빛내라고 상기시킵니다. 이것은 번영할 당신의 순간입니다. 당신이 얻은 빛 속에서 누리세요.',
      advice: 'Celebrate life! Joy, success, and vitality are yours.',
      adviceKo: '삶을 축하하세요! 기쁨, 성공, 활력이 당신의 것입니다.'
    },
    reversed: {
      keywords: ['Inner child', 'Feeling down', 'Overly optimistic', 'Lack of success', 'Pessimism'],
      keywordsKo: ['내면 아이', '우울함', '과한 낙관', '성공 부재', '비관'],
      meaning: 'The reversed Sun suggests a temporary dimming of your inner light. Perhaps clouds of pessimism are blocking your view of the bright side, or disappointments have made it hard to feel optimistic. You may be taking yourself too seriously, forgetting how to play and find joy in simple things. Alternatively, you might be suffering from unrealistic optimism—expecting sunshine without acknowledging the clouds, which sets you up for disappointment. Your inner child may feel wounded or neglected. In relationships, there might be a lack of warmth or playfulness. In career, success may feel elusive despite your efforts. The reversed Sun reminds you that even when blocked, the sun still shines behind the clouds. This dimness is temporary. Reconnect with what brings you genuine joy, tend to your inner child, and trust that the light will return in full force.',
      meaningKo: '역방향 태양은 내면의 빛이 일시적으로 흐려졌음을 암시합니다. 아마도 비관의 구름이 밝은 면을 보는 시야를 막고 있거나, 실망이 낙관하기 어렵게 만들었을 수 있습니다. 자신을 너무 진지하게 여기며, 놀고 단순한 것에서 기쁨을 찾는 법을 잊었을 수 있습니다. 또는 비현실적 낙관주의로 고통받고 있을 수 있습니다—구름을 인정하지 않고 햇빛을 기대하여, 실망에 빠지게 됩니다. 내면 아이가 상처받거나 방치된 느낌일 수 있습니다. 관계에서 따뜻함이나 장난기가 부족할 수 있습니다. 직업에서 노력에도 불구하고 성공이 손에 잡히지 않을 수 있습니다. 역방향 태양은 막혀 있어도 태양은 여전히 구름 뒤에서 빛나고 있음을 상기시킵니다. 이 흐림은 일시적입니다. 진정한 기쁨을 주는 것과 다시 연결하고, 내면 아이를 돌보고, 빛이 완전한 힘으로 돌아올 것을 믿으세요.',
      advice: 'Reconnect with your inner joy. This setback is temporary.',
      adviceKo: '내면의 기쁨과 다시 연결하세요. 이 좌절은 일시적입니다.'
    }
  },
  {
    id: 20,
    name: 'Judgement',
    nameKo: '심판',
    arcana: 'major',
    suit: 'major',
    image: '/cards/20.jpg',
    upright: {
      keywords: ['Judgement', 'Rebirth', 'Inner calling', 'Absolution', 'Awakening'],
      keywordsKo: ['심판', '부활', '내면의 부름', '용서', '각성'],
      meaning: 'The angel\'s trumpet sounds, calling the dead to rise—and so you too are being called to a profound awakening and rebirth. Judgement asks you to take an honest accounting of your life, to evaluate your past actions, and to release yourself from guilt and regret through genuine self-reflection. This is a moment of resurrection: leaving behind an old version of yourself to embrace a higher calling. You may be facing a significant decision that will affect the course of your life. Listen to the trumpet\'s call—your soul knows what it\'s being summoned toward. In love, this could mean reconciliation, closure, or evolving to a deeper level of partnership. In career, a calling to more meaningful work may be impossible to ignore. Judgement promises that through honest self-assessment and forgiveness, you can rise renewed.',
      meaningKo: '천사의 나팔 소리가 죽은 자들을 일으키라고 부릅니다—그래서 당신도 심오한 각성과 부활로 부름받고 있습니다. 심판은 삶을 정직하게 계산하고, 과거 행동을 평가하고, 진정한 자기 성찰을 통해 죄책감과 후회에서 자신을 풀어주라고 요청합니다. 이것은 부활의 순간입니다: 자신의 오래된 버전을 뒤로하고 더 높은 부름을 받아들이는 것. 삶의 방향에 영향을 미칠 중요한 결정에 직면해 있을 수 있습니다. 나팔의 부름에 귀 기울이세요—당신의 영혼은 무엇을 향해 소환되고 있는지 압니다. 사랑에서 이것은 화해, 마무리, 또는 더 깊은 수준의 파트너십으로 발전하는 것을 의미할 수 있습니다. 직업에서 더 의미 있는 일에 대한 부름을 무시하기 어려울 수 있습니다. 심판은 정직한 자기 평가와 용서를 통해 새롭게 일어날 수 있음을 약속합니다.',
      advice: 'Answer your calling. This is a time for rebirth and awakening.',
      adviceKo: '부름에 응답하세요. 재탄생과 각성의 시간입니다.'
    },
    reversed: {
      keywords: ['Self-doubt', 'Inner critic', 'Ignoring the call', 'Indecisiveness', 'Guilt'],
      keywordsKo: ['자기 의심', '내면의 비판', '부름 무시', '우유부단', '죄책감'],
      meaning: 'The reversed Judgement suggests you are ignoring an important inner calling, perhaps due to self-doubt, fear, or guilt that keeps you stuck in the past. The trumpet sounds, but you cover your ears, unwilling or unable to face the transformation being asked of you. Your inner critic may be harsh, telling you that you don\'t deserve forgiveness or that change is impossible for someone like you. Perhaps you\'re avoiding the self-reflection necessary for growth, or you\'re paralyzed by indecision at a crucial crossroads. In relationships, unprocessed guilt may be blocking healing. In career, fear of judgment (from yourself or others) may be holding you back from your true calling. The reversed Judgement asks: What calling are you refusing to answer? What past mistakes are you clinging to instead of releasing? The trumpet will keep sounding until you respond.',
      meaningKo: '역방향 심판은 자기 의심, 두려움, 또는 과거에 갇히게 하는 죄책감으로 인해 중요한 내면의 부름을 무시하고 있음을 암시합니다. 나팔이 울리지만, 당신은 귀를 막고 요청받는 변화를 마주하기를 꺼리거나 할 수 없습니다. 내면의 비판자가 가혹하여, 용서받을 자격이 없다거나 당신 같은 사람에게는 변화가 불가능하다고 말할 수 있습니다. 아마도 성장에 필요한 자기 성찰을 피하고 있거나, 중요한 갈림길에서 우유부단에 마비되어 있을 수 있습니다. 관계에서 처리되지 않은 죄책감이 치유를 막고 있을 수 있습니다. 직업에서 (자신이나 타인의) 심판에 대한 두려움이 진정한 소명에서 당신을 막고 있을 수 있습니다. 역방향 심판은 묻습니다: 어떤 부름에 응답하기를 거부하고 있나요? 놓아주는 대신 어떤 과거 실수에 매달리고 있나요? 나팔은 당신이 응답할 때까지 계속 울릴 것입니다.',
      advice: 'Silence your inner critic. Don\'t ignore your higher calling.',
      adviceKo: '내면의 비평가를 잠재우세요. 더 높은 부름을 무시하지 마세요.'
    }
  },
  {
    id: 21,
    name: 'The World',
    nameKo: '세계',
    arcana: 'major',
    suit: 'major',
    image: '/cards/21.jpg',
    upright: {
      keywords: ['Completion', 'Integration', 'Accomplishment', 'Travel', 'Fulfillment'],
      keywordsKo: ['완성', '통합', '성취', '여행', '충만'],
      meaning: 'The World represents the triumphant completion of a journey—the final card of the Major Arcana, where all lessons have been learned and integrated. The dancing figure within the laurel wreath celebrates wholeness, accomplishment, and the harmonious union of all aspects of self. A major life cycle is concluding: goals achieved, dreams realized, and wisdom gained through experience. This card brings profound fulfillment and a sense of cosmic alignment. In love, this may represent a relationship that feels complete and balanced, or the culmination of personal growth that makes you ready for deep partnership. In career, a significant project or phase reaches successful completion; recognition and rewards are yours. The World also speaks of travel and expansion—the whole world is open to you. Celebrate this achievement, and know that as one door closes, another opens. The cycle will begin anew, but you enter it transformed.',
      meaningKo: '세계는 여정의 승리적 완성을 나타냅니다—Major Arcana의 마지막 카드로, 모든 교훈이 배워지고 통합되었습니다. 월계관 안에서 춤추는 인물은 전체성, 성취, 그리고 자아의 모든 측면의 조화로운 결합을 축하합니다. 주요 삶의 순환이 마무리되고 있습니다: 목표 달성, 꿈 실현, 경험을 통해 얻은 지혜. 이 카드는 깊은 충만함과 우주적 정렬의 감각을 가져옵니다. 사랑에서 이것은 완전하고 균형 잡힌 느낌의 관계, 또는 깊은 파트너십을 위해 준비되게 하는 개인적 성장의 정점을 나타낼 수 있습니다. 직업에서 중요한 프로젝트나 단계가 성공적으로 완료됩니다; 인정과 보상이 당신의 것입니다. 세계는 또한 여행과 확장에 대해 말합니다—온 세상이 당신에게 열려 있습니다. 이 성취를 축하하고, 한 문이 닫히면 다른 문이 열린다는 것을 알아두세요. 순환은 새롭게 시작되지만, 당신은 변화된 모습으로 들어갑니다.',
      advice: 'Celebrate your achievements! A cycle is complete. Wholeness is yours.',
      adviceKo: '성취를 축하하세요! 한 주기가 완성되었습니다. 온전함이 당신의 것입니다.'
    },
    reversed: {
      keywords: ['Lack of completion', 'Lack of closure', 'Shortcuts', 'Emptiness', 'Unfinished business'],
      keywordsKo: ['미완성', '마무리 부재', '지름길', '공허', '미완의 일'],
      meaning: 'The reversed World suggests that you\'re close to completion but something remains unfinished. Perhaps you\'ve taken shortcuts that left lessons unlearned, or you\'re rushing to the finish line without properly integrating the journey. There may be a nagging sense of incompleteness, as if success achieved doesn\'t quite satisfy because something essential was missed. In relationships, there might be unresolved issues preventing the sense of wholeness you seek. In career, a project may be stalling just before completion, or achievements feel hollow. The reversed World can also indicate feeling stuck or limited, as if the whole world is closed to you rather than open. It asks: What unfinished business needs attention before you can truly move on? What shortcuts need to be addressed? Sometimes we must circle back to complete what we started before we can celebrate genuine fulfillment.',
      meaningKo: '역방향 세계는 완성에 가깝지만 무언가가 미완으로 남아 있음을 암시합니다. 아마도 교훈을 배우지 않은 채 지름길을 택했거나, 여정을 제대로 통합하지 않고 결승선으로 서두르고 있을 수 있습니다. 필수적인 무언가를 놓쳤기 때문에 성취한 성공이 만족스럽지 않은 것처럼 미완의 느낌이 계속될 수 있습니다. 관계에서 찾는 전체성의 감각을 막는 해결되지 않은 문제가 있을 수 있습니다. 직업에서 프로젝트가 완료 직전에 멈추거나, 성취가 공허하게 느껴질 수 있습니다. 역방향 세계는 또한 온 세상이 열려 있기보다 닫혀 있는 것처럼 갇히거나 제한된 느낌을 나타낼 수 있습니다. 묻습니다: 진정으로 나아가기 전에 어떤 미완의 일이 주의를 기울여야 하나요? 어떤 지름길을 다뤄야 하나요? 때때로 진정한 충만함을 축하하기 전에 시작한 것을 완료하기 위해 돌아가야 합니다.',
      advice: 'Complete what you\'ve started. Avoid shortcuts. Seek proper closure.',
      adviceKo: '시작한 것을 완료하세요. 지름길을 피하세요. 적절한 마무리를 찾으세요.'
    }
  },
  
];
