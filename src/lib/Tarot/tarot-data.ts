/**
 * @file This file contains the complete data for a 78-card Rider-Waite tarot deck.
 * Each card includes its name, image path, and interpretations for both upright and reversed positions.
 */

import { getCardImagePath, Arcana, Suit } from './tarot.types';

// Defines the structure for a single tarot card object.
export interface Card {
  id: number;
  name: string;
  nameKo: string;
  arcana: Arcana;
  suit: Suit;
  image: string; // Generated from getCardImagePath
  upright: {
    keywords: string[];
    keywordsKo: string[];
    meaning: string;
    meaningKo: string;
    advice: string;
    adviceKo: string;
  };
  reversed: {
    keywords: string[];
    keywordsKo: string[];
    meaning: string;
    meaningKo: string;
    advice: string;
    adviceKo: string;
  };
}

// Array containing all 78 tarot cards.
export const tarotDeck = [
  // Major Arcana
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
  
  // Suit of Wands
  {
    id: 22,
    name: 'Ace of Wands',
    nameKo: '완드 에이스',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/22.jpg',
    upright: {
      keywords: ['Inspiration', 'New opportunities', 'Growth', 'Potential', 'Creation'],
      keywordsKo: ['영감', '새 기회', '성장', '잠재력', '창조'],
      meaning: 'The Ace of Wands bursts forth like a bolt of lightning—pure creative fire igniting a new beginning. A divine spark of inspiration has entered your life, bringing with it incredible potential for growth, passion, and creative expression. This is the seed of a new venture, idea, or chapter waiting to be born. The hand emerging from the cloud offers you this wand—will you take it? In career, expect exciting new projects or entrepreneurial opportunities that set your soul on fire. In love, passion reignites or a thrilling new attraction appears. Creatively, you are tapped into source energy; ideas flow easily. The Ace of Wands says: Act on this inspiration now, while the fire is hot. This is not a time for hesitation—your enthusiasm will carry you forward.',
      meaningKo: '완드 에이스가 번개처럼 터져 나옵니다—순수한 창조의 불이 새로운 시작을 점화합니다. 신성한 영감의 불꽃이 당신의 삶에 들어왔고, 성장, 열정, 창조적 표현을 위한 놀라운 잠재력을 가져옵니다. 이것은 태어나기를 기다리는 새로운 사업, 아이디어, 또는 장의 씨앗입니다. 구름에서 나온 손이 이 완드를 제공합니다—받으시겠습니까? 직업에서는 영혼에 불을 붙이는 흥미진진한 새 프로젝트나 사업 기회를 기대하세요. 사랑에서는 열정이 다시 점화되거나 스릴 있는 새 끌림이 나타납니다. 창조적으로, 당신은 근원 에너지에 연결되어 있습니다; 아이디어가 쉽게 흐릅니다. 완드 에이스는 말합니다: 불이 뜨거울 때 이 영감에 따라 지금 행동하세요. 망설일 때가 아닙니다—열정이 당신을 앞으로 나아가게 할 것입니다.',
      advice: 'Act on your inspiration now. This is the seed of something great.',
      adviceKo: '영감에 지금 행동하세요. 위대한 것의 씨앗입니다.'
    },
    reversed: {
      keywords: ['Lack of energy', 'Lack of passion', 'Delays', 'Creative blocks', 'Missed opportunity'],
      keywordsKo: ['에너지 부족', '열정 부족', '지연', '창작 정체', '놓친 기회'],
      meaning: 'The reversed Ace of Wands suggests the creative spark is struggling to ignite. You may feel uninspired, blocked, or disconnected from your passion. Opportunities may be presenting themselves, but you lack the energy or enthusiasm to pursue them. Perhaps fear of failure is dampening your fire, or past disappointments have made you hesitant to try again. Creative projects stall before they start; ideas seem to lead nowhere. In career, promising opportunities may slip away due to inaction. In love, the spark may be missing, or you\'re not ready for new romance. The reversed Ace asks: What is blocking your creative fire? Is it external circumstances or internal resistance? Sometimes we must clear away the ashes of old disappointments before new flames can catch.',
      meaningKo: '역방향 완드 에이스는 창조적 불꽃이 점화하기 위해 애쓰고 있음을 암시합니다. 영감이 없거나, 막혀 있거나, 열정과 단절된 느낌일 수 있습니다. 기회가 제시되고 있지만, 추구할 에너지나 열정이 부족합니다. 아마도 실패에 대한 두려움이 불을 꺼뜨리고 있거나, 과거 실망이 다시 시도하는 것을 망설이게 만들었을 수 있습니다. 창작 프로젝트가 시작 전에 정체됩니다; 아이디어가 아무 데도 이끌지 않는 것 같습니다. 직업에서 유망한 기회가 무행동으로 인해 미끄러져 지나갈 수 있습니다. 사랑에서 불꽃이 없거나, 새로운 로맨스를 위한 준비가 되지 않았습니다. 역방향 에이스는 묻습니다: 무엇이 창조적 불을 막고 있나요? 외부 상황인가요 내부 저항인가요? 때로는 새 불꽃이 붙기 전에 오래된 실망의 재를 치워야 합니다.',
      advice: "Find what reignites your passion. Don't let opportunities pass.",
      adviceKo: '열정을 다시 불태울 것을 찾으세요. 기회를 놓치지 마세요.'
    }
  },
  {
    id: 23,
    name: 'Two of Wands',
    nameKo: '완드 2',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/23.jpg',
    upright: {
      keywords: ['Future planning', 'Making decisions', 'Leaving home', 'Partnership', 'Progress'],
      keywordsKo: ['미래 계획', '결정', '출발', '파트너십', '진전'],
      meaning: 'The Two of Wands shows a figure holding the world in their hands, gazing out at vast possibilities from the safety of castle walls. You stand at a crossroads of choice: the familiar comfort behind you, and uncharted territories ahead calling your name. This card represents the planning stage of a new venture—the exciting moment when dreams begin to take practical shape. It\'s time to think bigger, to expand your horizons beyond what you\'ve known. In career, consider partnerships or opportunities that take you beyond your current scope. In love, you may be deciding whether to take a relationship to the next level. The Two of Wands encourages bold vision and strategic planning. The whole world is available to you—but you must choose to step beyond the walls.',
      meaningKo: '완드 2는 성벽의 안전에서 광대한 가능성을 바라보며 세계를 손에 든 인물을 보여줍니다. 선택의 갈림길에 서 있습니다: 뒤에는 익숙한 편안함, 앞에는 당신의 이름을 부르는 미지의 영역. 이 카드는 새로운 사업의 계획 단계—꿈이 실질적인 형태를 갖추기 시작하는 흥분되는 순간을 나타냅니다. 더 크게 생각하고, 알던 것 너머로 시야를 넓힐 때입니다. 직업에서 현재 범위를 넘어서는 파트너십이나 기회를 고려하세요. 사랑에서 관계를 다음 단계로 발전시킬지 결정하고 있을 수 있습니다. 완드 2는 대담한 비전과 전략적 계획을 권장합니다. 온 세상이 당신에게 열려 있습니다—하지만 벽을 넘어서는 것을 선택해야 합니다.',
      advice: 'Plan boldly. Step outside your comfort zone.',
      adviceKo: '대담하게 계획하세요. 안전지대를 벗어나세요.'
    },
    reversed: {
      keywords: ['Fear of change', 'Playing it safe', 'Lack of planning', 'Indecision', 'Cancelled plans'],
      keywordsKo: ['변화 두려움', '안전 추구', '계획 부족', '우유부단', '취소된 계획'],
      meaning: 'The reversed Two of Wands indicates you\'re staying within the safety of your walls when the world awaits outside. Fear of the unknown keeps you stuck in planning mode, never quite ready to take the leap. Perhaps you\'re overwhelmed by too many options, leading to analysis paralysis. Or maybe past disappointments have made you gun-shy about new ventures. In career, excellent opportunities may be passing you by while you hesitate. In relationships, fear of commitment or change prevents deepening. Travel or expansion plans may be cancelled or indefinitely delayed. The reversed Two asks: Is your caution wisdom or fear? Sometimes the biggest risk is not taking one. The globe you hold represents your potential—don\'t let it gather dust.',
      meaningKo: '역방향 완드 2는 세상이 바깥에서 기다리는데 벽의 안전 안에 머물고 있음을 나타냅니다. 미지에 대한 두려움이 계획 모드에 갇히게 하여, 도약할 준비가 결코 되지 않습니다. 아마도 너무 많은 선택지에 압도되어 분석 마비에 빠졌을 수 있습니다. 또는 과거 실망이 새로운 사업에 대해 소극적으로 만들었을 수 있습니다. 직업에서 훌륭한 기회가 망설이는 동안 지나가고 있을 수 있습니다. 관계에서 헌신이나 변화에 대한 두려움이 깊어지는 것을 막습니다. 여행이나 확장 계획이 취소되거나 무기한 지연될 수 있습니다. 역방향 2는 묻습니다: 당신의 조심성은 지혜인가요 두려움인가요? 때로는 가장 큰 위험은 아무것도 하지 않는 것입니다. 당신이 든 지구본은 잠재력을 나타냅니다—먼지가 쌓이게 두지 마세요.',
      advice: 'Overcome your fear of the unknown. Make a plan and commit.',
      adviceKo: '미지에 대한 두려움을 극복하세요. 계획을 세우고 실행하세요.'
    }
  },
  {
    id: 24,
    name: 'Three of Wands',
    nameKo: '완드 3',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/24.jpg',
    upright: {
      keywords: ['Expansion', 'Foresight', 'Overseas opportunities', 'Growth', 'Adventure'],
      keywordsKo: ['확장', '선견지명', '해외 기회', '성장', '모험'],
      meaning: 'The Three of Wands shows a figure who has stepped beyond the walls—ships sail toward distant horizons carrying your hopes and ambitions. What you set in motion is now taking shape in the world, and the first results are beginning to return. This is the card of expansion, overseas opportunities, and the confidence that comes from knowing your vision is manifesting. You have planted seeds; now watch them grow. In career, expect your reach to extend—international projects, global partnerships, or recognition from distant places. In love, long-distance connections may flourish, or travel brings romantic opportunities. The Three of Wands celebrates the entrepreneur in you—the one who dares to send ships to unknown seas. Your foresight is paying off. Continue looking toward the horizon with confidence.',
      meaningKo: '완드 3은 벽을 넘어선 인물을 보여줍니다—배들이 당신의 희망과 야망을 싣고 먼 수평선을 향해 항해합니다. 움직이기 시작한 것이 이제 세상에서 형태를 갖추고 있고, 첫 결과가 돌아오기 시작합니다. 이것은 확장, 해외 기회, 비전이 현실화되고 있다는 확신의 카드입니다. 씨앗을 심었습니다; 이제 자라는 것을 지켜보세요. 직업에서 손길이 뻗어나가길 기대하세요—국제 프로젝트, 글로벌 파트너십, 또는 먼 곳에서의 인정. 사랑에서 장거리 연결이 번성하거나, 여행이 로맨틱한 기회를 가져올 수 있습니다. 완드 3은 당신 안의 사업가를 축하합니다—알려지지 않은 바다로 배를 보내는 용기를 가진 자. 선견지명이 결실을 맺고 있습니다. 자신감을 가지고 수평선을 계속 바라보세요.',
      advice: 'Expand your horizons. Your efforts are paying off.',
      adviceKo: '시야를 넓히세요. 노력이 결실을 맺고 있습니다.'
    },
    reversed: {
      keywords: ['Delays', 'Obstacles', 'Lack of foresight', 'Frustration', 'Disappointment'],
      keywordsKo: ['지연', '장애물', '선견지명 부족', '좌절', '실망'],
      meaning: 'The reversed Three of Wands indicates your ships have hit rough waters. Plans that seemed promising are facing unexpected delays, obstacles, or disappointments. Perhaps you didn\'t plan thoroughly enough for potential challenges, or circumstances beyond your control are blocking your expansion. Results you were expecting have not materialized, leading to frustration and doubt. In career, overseas deals may fall through, or growth stalls. In relationships, distance—physical or emotional—creates challenges rather than opportunities. The reversed Three asks you to reassess your strategy rather than give up entirely. Sometimes ships are delayed but still arrive. Review your plans, address weak points, and maintain your vision even through setbacks.',
      meaningKo: '역방향 완드 3은 당신의 배가 거친 물결을 만났음을 나타냅니다. 유망해 보였던 계획이 예상치 못한 지연, 장애물, 또는 실망에 직면하고 있습니다. 아마도 잠재적 도전에 대해 충분히 계획하지 않았거나, 통제 밖의 상황이 확장을 막고 있을 수 있습니다. 기대했던 결과가 실현되지 않아 좌절과 의심으로 이어집니다. 직업에서 해외 거래가 무산되거나 성장이 정체될 수 있습니다. 관계에서 물리적이든 정서적이든 거리가 기회가 아닌 도전을 만듭니다. 역방향 3은 완전히 포기하기보다 전략을 재평가하라고 요청합니다. 때때로 배는 지연되지만 여전히 도착합니다. 계획을 검토하고, 약점을 해결하고, 좌절을 통해서도 비전을 유지하세요.',
      advice: 'Reassess your plans. Learn from delays and adjust.',
      adviceKo: '계획을 재평가하세요. 지연에서 배우고 조정하세요.'
    }
  },
  {
    id: 25,
    name: 'Four of Wands',
    nameKo: '완드 4',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/25.jpg',
    upright: {
      keywords: ['Celebration', 'Harmony', 'Marriage', 'Home', 'Community'],
      keywordsKo: ['축하', '조화', '결혼', '가정', '공동체'],
      meaning: 'The Four of Wands is one of the most joyful cards in the deck—a celebration of love, community, and the stability that comes from belonging. Four wands draped with garlands create a welcoming gateway, while figures dance in celebration. This card represents milestones worth celebrating: weddings, graduations, homecomings, successful completions. There is harmony in your home and a sense of belonging within your community. In love, this often indicates engagement, marriage, or a deepening of commitment that brings genuine happiness. In career, celebrate your achievements with those who helped you get there. The Four of Wands reminds you that success is sweeter when shared. Take time to honor what you\'ve built and the people who make your life feel like home.',
      meaningKo: '완드 4는 덱에서 가장 기쁜 카드 중 하나입니다—사랑, 공동체, 그리고 소속감에서 오는 안정에 대한 축하. 화환으로 장식된 네 개의 완드가 환영하는 관문을 만들고, 인물들이 축하하며 춤춥니다. 이 카드는 축하할 가치가 있는 이정표를 나타냅니다: 결혼, 졸업, 귀향, 성공적인 완료. 가정에 조화가 있고 공동체 내에서 소속감이 있습니다. 사랑에서 이것은 종종 약혼, 결혼, 또는 진정한 행복을 가져오는 헌신의 깊어짐을 나타냅니다. 직업에서 그곳에 도달하도록 도와준 사람들과 성취를 축하하세요. 완드 4는 성공이 나눌 때 더 달콤하다는 것을 상기시킵니다. 당신이 쌓아온 것과 삶을 집처럼 느끼게 하는 사람들을 기리는 시간을 가지세요.',
      advice: 'Celebrate your achievements. Create a harmonious home.',
      adviceKo: '성취를 축하하세요. 조화로운 가정을 만드세요.'
    },
    reversed: {
      keywords: ['Lack of support', 'Instability', 'Feeling unwelcome', 'Family issues', 'Disharmony'],
      keywordsKo: ['지원 부족', '불안정', '환영받지 못함', '가족 문제', '불화'],
      meaning: 'The reversed Four of Wands suggests that the foundation you thought was solid may be shaking. There could be tension in the home, discord within the family, or a sense of not belonging in your community. Perhaps a celebration has been cancelled or postponed, or what should be a happy occasion is marred by conflict. You may feel unwelcome or unsupported by those you expected to stand by you. In love, relationship milestones may be delayed or disappointing. In career, team harmony may be lacking, affecting productivity and morale. The reversed Four asks you to examine the foundations of your sense of home and belonging. What repairs need to be made? Sometimes we must address conflict directly before we can celebrate together.',
      meaningKo: '역방향 완드 4는 견고하다고 생각했던 기반이 흔들릴 수 있음을 암시합니다. 가정에 긴장, 가족 내 불화, 또는 공동체에 소속되지 않는 느낌이 있을 수 있습니다. 아마도 축하 행사가 취소되거나 연기되었거나, 행복해야 할 행사가 갈등으로 얼룩졌을 수 있습니다. 옆에 설 것으로 기대했던 사람들에게 환영받지 못하거나 지지받지 못한다고 느낄 수 있습니다. 사랑에서 관계 이정표가 지연되거나 실망스러울 수 있습니다. 직업에서 팀 조화가 부족하여 생산성과 사기에 영향을 미칠 수 있습니다. 역방향 4는 집과 소속감의 기반을 살펴보라고 요청합니다. 어떤 수리가 필요한가요? 때로는 함께 축하하기 전에 갈등을 직접 해결해야 합니다.',
      advice: 'Work to restore harmony. Address family tensions.',
      adviceKo: '조화를 회복하도록 노력하세요. 가족 갈등을 해결하세요.'
    }
  },
  {
    id: 26,
    name: 'Five of Wands',
    nameKo: '완드 5',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/26.jpg',
    upright: {
      keywords: ['Conflict', 'Competition', 'Disagreements', 'Tension', 'Rivalry'],
      keywordsKo: ['갈등', '경쟁', '의견 충돌', '긴장', '라이벌'],
      meaning: 'The Five of Wands shows five figures in apparent battle, wands clashing in all directions. Yet look closer—no one is being hurt. This is the healthy conflict of competition, the friction that sparks innovation, the debate that strengthens ideas. You are in a competitive environment where multiple voices vie for attention and everyone has their own agenda. While tension exists, this struggle can be productive if approached with the right mindset. In career, expect competition for resources, positions, or recognition—rise to the challenge. In love, minor conflicts may arise as two strong personalities navigate their differences. The Five of Wands reminds you that not all conflict is destructive. Sometimes we must clash with others to refine our own ideas and prove our strength.',
      meaningKo: '완드 5는 명백한 전투 중인 다섯 인물을 보여주며, 완드가 모든 방향으로 부딪힙니다. 그러나 자세히 보세요—아무도 다치지 않습니다. 이것은 경쟁의 건강한 갈등, 혁신을 일으키는 마찰, 아이디어를 강화하는 토론입니다. 여러 목소리가 관심을 끌기 위해 경쟁하고 모두가 자신의 의제가 있는 경쟁 환경에 있습니다. 긴장이 존재하지만, 올바른 마음가짐으로 접근하면 이 투쟁은 생산적일 수 있습니다. 직업에서 자원, 직위, 또는 인정을 위한 경쟁을 예상하세요—도전에 응하세요. 사랑에서 두 강한 성격이 차이를 탐색하면서 사소한 갈등이 생길 수 있습니다. 완드 5는 모든 갈등이 파괴적인 것은 아님을 상기시킵니다. 때때로 자신의 아이디어를 정제하고 힘을 증명하기 위해 다른 사람들과 부딪쳐야 합니다.',
      advice: 'Embrace healthy competition. Channel conflict productively.',
      adviceKo: '건강한 경쟁을 받아들이세요. 갈등을 생산적으로 활용하세요.'
    },
    reversed: {
      keywords: ['Avoiding conflict', 'Internal conflict', 'Finding common ground', 'Peace', 'Resolution'],
      keywordsKo: ['갈등 회피', '내적 갈등', '공통점 찾기', '평화', '해결'],
      meaning: 'The reversed Five of Wands has dual meanings. Positively, it may indicate that conflicts are resolving—competitors are finding common ground, debates are reaching consensus, and peace is replacing tension. The battle is ending, and collaboration is emerging. However, it can also suggest that you are avoiding necessary conflict, suppressing disagreements that need to be aired, or turning the battle inward against yourself. Internal conflict and self-criticism may be more draining than external competition. In career, you may be stepping back from competition when you should be engaging. In relationships, avoiding difficult conversations only delays resolution. The reversed Five asks: Are you finding peace, or just avoiding confrontation? Sometimes the conflict we avoid grows larger in the shadows.',
      meaningKo: '역방향 완드 5는 이중 의미를 가집니다. 긍정적으로, 갈등이 해결되고 있음을 나타낼 수 있습니다—경쟁자들이 공통점을 찾고, 토론이 합의에 도달하고, 평화가 긴장을 대체합니다. 전투가 끝나가고 협력이 나타납니다. 그러나 필요한 갈등을 피하거나, 드러내야 할 의견 충돌을 억누르거나, 전투를 자신에게로 돌리고 있음을 암시할 수도 있습니다. 내적 갈등과 자기 비판이 외부 경쟁보다 더 소모적일 수 있습니다. 직업에서 참여해야 할 때 경쟁에서 물러나고 있을 수 있습니다. 관계에서 어려운 대화를 피하는 것은 해결을 지연시킬 뿐입니다. 역방향 5는 묻습니다: 평화를 찾고 있나요, 아니면 그저 대면을 피하고 있나요? 때로는 피하는 갈등이 그림자 속에서 더 커집니다.',
      advice: 'Seek resolution. Find common ground with others.',
      adviceKo: '해결책을 찾으세요. 타인과 공통점을 찾으세요.'
    }
  },
  {
    id: 27,
    name: 'Six of Wands',
    nameKo: '완드 6',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/27.jpg',
    upright: {
      keywords: ['Success', 'Public recognition', 'Victory', 'Praise', 'Confidence'],
      keywordsKo: ['성공', '공적 인정', '승리', '칭찬', '자신감'],
      meaning: 'The Six of Wands shows a victorious figure riding through crowds who cheer and celebrate their triumph. This is your moment of glory—a public recognition of your achievements, a victory after struggle, the sweet taste of success. The battles you fought are over, and you have emerged victorious. Others see and acknowledge your accomplishments; your confidence is well-earned. In career, expect promotions, awards, public praise, or recognition from peers and superiors. In love, your relationship may become "official" or receive approval from important people. The Six of Wands reminds you to savor this moment—you worked hard for it. Let yourself be celebrated. Your success inspires others to believe in their own potential.',
      meaningKo: '완드 6은 환호하고 승리를 축하하는 군중 사이를 지나가는 승리한 인물을 보여줍니다. 이것은 영광의 순간입니다—성취에 대한 공적 인정, 투쟁 후의 승리, 성공의 달콤한 맛. 싸웠던 전투가 끝났고, 승리자로 나왔습니다. 다른 사람들이 당신의 업적을 보고 인정합니다; 자신감은 합당하게 얻은 것입니다. 직업에서 승진, 상, 공개 칭찬, 또는 동료와 상사의 인정을 기대하세요. 사랑에서 관계가 "공식적"이 되거나 중요한 사람들의 승인을 받을 수 있습니다. 완드 6은 이 순간을 음미하라고 상기시킵니다—이를 위해 열심히 일했습니다. 축하받도록 하세요. 당신의 성공은 다른 사람들이 자신의 잠재력을 믿도록 영감을 줍니다.',
      advice: "Accept recognition gracefully. You've earned this success.",
      adviceKo: '인정을 겸손히 받으세요. 이 성공을 얻을 자격이 있습니다.'
    },
    reversed: {
      keywords: ['Egotism', 'Lack of recognition', 'Failure', 'Disappointment', 'Arrogance'],
      keywordsKo: ['자만심', '인정 부족', '실패', '실망', '오만'],
      meaning: 'The reversed Six of Wands warns of victory\'s shadow side. Perhaps success has made you arrogant, and pride is threatening to bring you down. Or perhaps the recognition you expected hasn\'t come—your achievements go unnoticed, leaving you feeling undervalued and disappointed. You may be too focused on external validation, measuring your worth by others\' applause. In career, a setback after success can feel especially bitter, or success may have come at the cost of relationships. In love, showing off or needing constant praise creates distance. The reversed Six asks: Do you need external recognition to feel valuable? True confidence comes from within. Examine whether you\'re seeking victory for the right reasons, and remember that lasting success requires humility.',
      meaningKo: '역방향 완드 6은 승리의 그림자 측면을 경고합니다. 아마도 성공이 당신을 오만하게 만들었고, 자만이 당신을 무너뜨리려 위협하고 있습니다. 또는 기대했던 인정이 오지 않았을 수 있습니다—업적이 눈에 띄지 않아 저평가되고 실망한 느낌을 줍니다. 외부 인정에 너무 집중하여 다른 사람들의 박수로 가치를 측정하고 있을 수 있습니다. 직업에서 성공 후 좌절은 특히 쓰라리게 느껴질 수 있고, 성공이 관계를 희생해서 왔을 수 있습니다. 사랑에서 과시하거나 끊임없는 칭찬이 필요하면 거리가 생깁니다. 역방향 6은 묻습니다: 가치 있다고 느끼려면 외부 인정이 필요한가요? 진정한 자신감은 내면에서 옵니다. 올바른 이유로 승리를 추구하고 있는지 살펴보고, 지속적인 성공에는 겸손이 필요함을 기억하세요.',
      advice: "Stay humble. Don't let ego overshadow your achievements.",
      adviceKo: '겸손하세요. 자만심이 성취를 가리지 않게 하세요.'
    }
  },
  {
    id: 28,
    name: 'Seven of Wands',
    nameKo: '완드 7',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/28.jpg',
    upright: {
      keywords: ['Challenge', 'Competition', 'Perseverance', 'Defensiveness', 'Standing your ground'],
      keywordsKo: ['도전', '경쟁', '인내', '방어', '입장 고수'],
      meaning: 'The Seven of Wands shows a figure on higher ground, defending their position against multiple challengers. You have achieved something of value, and now others want what you have. This card calls for courage and determination—you must stand your ground against competition, criticism, or those who would undermine your success. The advantage is yours; you hold the higher position. But maintaining success requires ongoing effort and the willingness to defend your territory. In career, expect challenges to your authority or competition for your position—meet them with confidence. In love, you may need to fight for your relationship against outside interference. The Seven of Wands reminds you that what is worth having is worth defending. Don\'t back down; you are stronger than those who challenge you.',
      meaningKo: '완드 7은 여러 도전자들에 맞서 위치를 방어하는 높은 곳의 인물을 보여줍니다. 가치 있는 것을 성취했고, 이제 다른 사람들이 당신이 가진 것을 원합니다. 이 카드는 용기와 결단력을 요구합니다—경쟁, 비판, 또는 성공을 약화시키려는 자들에 맞서 입장을 고수해야 합니다. 이점은 당신에게 있습니다; 더 높은 위치를 차지하고 있습니다. 하지만 성공을 유지하려면 지속적인 노력과 영역을 지키려는 의지가 필요합니다. 직업에서 권위에 대한 도전이나 직위를 위한 경쟁을 예상하세요—자신감으로 맞서세요. 사랑에서 외부 간섭에 맞서 관계를 위해 싸워야 할 수 있습니다. 완드 7은 가질 가치가 있는 것은 지킬 가치가 있음을 상기시킵니다. 물러서지 마세요; 당신은 도전하는 자들보다 강합니다.',
      advice: 'Stand firm. Defend your position with confidence.',
      adviceKo: '굳건히 서세요. 자신감 있게 입장을 지키세요.'
    },
    reversed: {
      keywords: ['Giving up', 'Overwhelmed', 'Exhaustion', 'Being attacked', 'Losing ground'],
      keywordsKo: ['포기', '압도당함', '피로', '공격받음', '밀림'],
      meaning: 'The reversed Seven of Wands reveals exhaustion from constant battle. You\'ve been defending your position for so long that fatigue has set in, and you\'re wondering if it\'s worth the fight. Challengers seem to be gaining ground, and your confidence is wavering. Perhaps you\'ve spread yourself too thin, defending too many fronts at once. Or maybe the position you\'re defending isn\'t worth the energy it costs to hold it. In career, you may be losing a competitive edge or feeling overwhelmed by opposition. In relationships, constant conflict is draining your energy. The reversed Seven asks: Is this battle worth fighting, or is it time to strategically retreat? Sometimes wisdom lies in knowing when to hold on and when to let go.',
      meaningKo: '역방향 완드 7은 끊임없는 전투로 인한 피로를 드러냅니다. 너무 오래 위치를 방어해서 피로가 쌓였고, 싸울 가치가 있는지 의문을 품고 있습니다. 도전자들이 영토를 얻는 것처럼 보이고, 자신감이 흔들리고 있습니다. 아마도 너무 많은 전선을 한꺼번에 방어하며 너무 얇게 퍼졌을 수 있습니다. 또는 방어하는 위치가 지키는 데 드는 에너지만큼의 가치가 없을 수 있습니다. 직업에서 경쟁 우위를 잃거나 반대에 압도당하는 느낌일 수 있습니다. 관계에서 끊임없는 갈등이 에너지를 소모하고 있습니다. 역방향 7은 묻습니다: 이 전투는 싸울 가치가 있나요, 아니면 전략적으로 후퇴할 때인가요? 때로는 지혜는 언제 붙잡고 언제 놓아야 할지 아는 데 있습니다.',
      advice: 'Reassess if this battle is worth fighting. Restore your energy.',
      adviceKo: '이 싸움이 가치 있는지 재평가하세요. 에너지를 회복하세요.'
    }
  },
  {
    id: 29,
    name: 'Eight of Wands',
    nameKo: '완드 8',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/29.jpg',
    upright: {
      keywords: ['Speed', 'Action', 'Air travel', 'Movement', 'Swift change'],
      keywordsKo: ['속도', '행동', '여행', '움직임', '빠른 변화'],
      meaning: 'The Eight of Wands flies through the air with incredible speed—eight wands soaring toward their destination without obstacles. This is the card of swift action, rapid progress, and things finally moving forward at full speed. Whatever has been stalled is now accelerating. Messages arrive quickly, decisions are made fast, and events unfold with surprising momentum. In career, projects that seemed stuck suddenly progress rapidly. In love, a relationship may develop quickly or important communications arrive without delay. Travel—especially by air—is highly favored. The Eight of Wands urges you to strike while the iron is hot. Don\'t overthink; act. The universe is removing obstacles and creating clear paths. Seize this moment of momentum before it passes.',
      meaningKo: '완드 8이 놀라운 속도로 공중을 날아갑니다—여덟 개의 완드가 장애물 없이 목적지를 향해 치솟습니다. 이것은 빠른 행동, 급속한 진전, 그리고 마침내 전속력으로 나아가는 것의 카드입니다. 정체되었던 것이 이제 가속되고 있습니다. 메시지가 빠르게 도착하고, 결정이 빠르게 내려지고, 사건이 놀라운 추진력으로 전개됩니다. 직업에서 막혀 있던 것처럼 보였던 프로젝트가 갑자기 빠르게 진행됩니다. 사랑에서 관계가 빠르게 발전하거나 중요한 소통이 지체 없이 도착할 수 있습니다. 여행—특히 항공—이 매우 유리합니다. 완드 8은 쇠가 뜨거울 때 치라고 촉구합니다. 너무 생각하지 말고 행동하세요. 우주가 장애물을 제거하고 명확한 길을 만들고 있습니다. 지나가기 전에 이 추진력의 순간을 잡으세요.',
      advice: 'Ride the momentum. Act quickly while energy is high.',
      adviceKo: '추진력을 타세요. 에너지가 높을 때 빠르게 행동하세요.'
    },
    reversed: {
      keywords: ['Delays', 'Frustration', 'Slowing down', 'Miscommunication', 'Resisting change'],
      keywordsKo: ['지연', '좌절', '속도 저하', '소통 오류', '변화 저항'],
      meaning: 'The reversed Eight of Wands indicates the wands have hit turbulence—momentum has stalled, and frustrating delays are blocking your progress. Communications are delayed or misconstrued; messages don\'t arrive when expected, or arrive with the wrong meaning. Travel plans may face cancellations or complications. You may be resisting necessary change, preferring to wait rather than act even when the moment calls for speed. In career, projects hit unexpected snags, and deadlines are pushed back. In love, communications misfire, or a relationship that should be progressing feels stuck. The reversed Eight asks: What is blocking your momentum? Is it external circumstances, or your own resistance to moving forward? Sometimes we must clear internal blocks before external paths can open.',
      meaningKo: '역방향 완드 8은 완드가 난기류를 만났음을 나타냅니다—추진력이 멈췄고, 답답한 지연이 진행을 막고 있습니다. 소통이 지연되거나 오해됩니다; 메시지가 예상대로 도착하지 않거나, 잘못된 의미로 도착합니다. 여행 계획이 취소나 복잡함에 직면할 수 있습니다. 순간이 속도를 요구할 때도 행동보다 기다리기를 선호하며 필요한 변화에 저항하고 있을 수 있습니다. 직업에서 프로젝트가 예상치 못한 걸림돌에 부딪히고, 마감이 미뤄집니다. 사랑에서 소통이 빗나가거나, 진행되어야 할 관계가 멈춘 느낌입니다. 역방향 8은 묻습니다: 무엇이 추진력을 막고 있나요? 외부 상황인가요, 아니면 앞으로 나아가는 것에 대한 자신의 저항인가요? 때로는 외부 길이 열리기 전에 내부 블록을 치워야 합니다.',
      advice: 'Be patient with delays. Clear up miscommunications.',
      adviceKo: '지연에 인내하세요. 오해를 해소하세요.'
    }
  },
  {
    id: 30,
    name: 'Nine of Wands',
    nameKo: '완드 9',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/30.jpg',
    upright: {
      keywords: ['Resilience', 'Courage', 'Persistence', 'Last stand', 'Boundaries'],
      keywordsKo: ['회복력', '용기', '끈기', '최후의 저항', '경계'],
      meaning: 'The Nine of Wands shows a battle-worn figure leaning on their wand, wounds visible but spirit unbroken. You have been through tremendous challenges, and the scars show—but you are still standing. This card honors your resilience, your persistence, and your courage to keep going when others would have given up. You are close to the finish line; don\'t stop now. One final push is needed. In career, despite setbacks and obstacles, you\'re approaching completion of a difficult project. In love, a relationship that has weathered storms proves its strength. The Nine of Wands also speaks of healthy boundaries—knowing what you can and cannot accept. You\'ve learned from past battles. Use that wisdom now as you face the last challenge. Victory belongs to those who persevere.',
      meaningKo: '완드 9는 완드에 기대어 있는 전투로 지친 인물을 보여줍니다—상처가 보이지만 정신은 꺾이지 않았습니다. 엄청난 도전을 겪었고, 흉터가 보이지만—여전히 서 있습니다. 이 카드는 당신의 회복력, 끈기, 그리고 다른 사람들이 포기했을 때 계속 갈 용기를 기립니다. 결승선에 가깝습니다; 지금 멈추지 마세요. 마지막 한 번의 밀어붙임이 필요합니다. 직업에서 좌절과 장애물에도 불구하고 어려운 프로젝트의 완료에 다가가고 있습니다. 사랑에서 폭풍을 견뎌낸 관계가 그 힘을 증명합니다. 완드 9는 또한 건강한 경계에 대해 말합니다—받아들일 수 있는 것과 없는 것을 아는 것. 과거 전투에서 배웠습니다. 마지막 도전에 직면할 때 그 지혜를 사용하세요. 승리는 인내하는 자의 것입니다.',
      advice: "Push through. You're almost there. Stay resilient.",
      adviceKo: '밀고 나가세요. 거의 다 왔습니다. 회복력을 유지하세요.'
    },
    reversed: {
      keywords: ['Paranoia', 'Giving up', 'Fatigue', 'Defensiveness', 'Lack of boundaries'],
      keywordsKo: ['편집증', '포기', '피로', '방어적', '경계 부족'],
      meaning: 'The reversed Nine of Wands reveals you\'ve reached your breaking point. The battles have taken their toll, and exhaustion is overwhelming your ability to continue. You may be so defensive from past wounds that you see threats everywhere, pushing away even those who want to help. Paranoia replaces wisdom; stubbornness replaces strength. Perhaps you\'re ready to give up just when victory is within reach—or perhaps continuing is genuinely no longer healthy. In career, burnout threatens your ability to finish what you started. In love, past hurts make you unable to trust or open up. The reversed Nine asks: Is this vigilance protecting you, or imprisoning you? Sometimes the bravest act is to ask for help or to recognize when a battle is no longer worth fighting. Rest does not equal surrender.',
      meaningKo: '역방향 완드 9는 한계점에 도달했음을 드러냅니다. 전투가 대가를 치르게 했고, 피로가 계속할 능력을 압도하고 있습니다. 과거 상처로 너무 방어적이어서 도움을 주려는 사람들마저 밀어내며 어디에나 위협을 봅니다. 편집증이 지혜를 대체하고; 고집이 힘을 대체합니다. 아마도 승리가 손에 닿을 때 포기할 준비가 되었거나—아마도 계속하는 것이 진정으로 더 이상 건강하지 않을 수 있습니다. 직업에서 번아웃이 시작한 것을 끝낼 능력을 위협합니다. 사랑에서 과거 상처가 신뢰하거나 마음을 열지 못하게 합니다. 역방향 9는 묻습니다: 이 경계심이 당신을 보호하고 있나요, 아니면 가두고 있나요? 때로는 가장 용감한 행동은 도움을 요청하거나 전투가 더 이상 싸울 가치가 없을 때 인식하는 것입니다. 휴식은 항복과 같지 않습니다.',
      advice: 'Rest before you break. Set healthy boundaries.',
      adviceKo: '무너지기 전에 쉬세요. 건강한 경계를 설정하세요.'
    }
  },
  {
    id: 31,
    name: 'Ten of Wands',
    nameKo: '완드 10',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/31.jpg',
    upright: {
      keywords: ['Burden', 'Responsibility', 'Hard work', 'Stress', 'Overwhelmed'],
      keywordsKo: ['짐', '책임', '고된 일', '스트레스', '압도'],
      meaning: 'The Ten of Wands shows a figure struggling under the weight of ten heavy wands, barely able to see the path ahead. You have taken on too much—responsibilities, commitments, expectations—and the burden is becoming overwhelming. Perhaps your initial success has led to more demands than you can handle, or you\'ve said yes to everything without considering the cumulative weight. The destination is in sight, but reaching it requires carrying a load that is testing your limits. In career, overwork threatens to crush your passion; you\'re doing the job of several people. In love, you may be carrying the relationship alone or bearing the weight of a partner\'s problems. The Ten of Wands asks: Is this burden truly yours to carry? Can any of it be delegated, released, or renegotiated? You are strong, but even strength has limits.',
      meaningKo: '완드 10은 열 개의 무거운 완드 아래서 힘겹게 나아가며 앞길을 거의 볼 수 없는 인물을 보여줍니다. 너무 많은 것을 짊어졌습니다—책임, 약속, 기대—그리고 짐이 압도적이 되어가고 있습니다. 아마도 초기 성공이 감당할 수 있는 것보다 더 많은 요구로 이어졌거나, 누적되는 무게를 고려하지 않고 모든 것에 예라고 했을 수 있습니다. 목적지가 보이지만, 도달하려면 한계를 시험하는 짐을 져야 합니다. 직업에서 과로가 열정을 짓누르려 위협합니다; 여러 사람의 일을 하고 있습니다. 사랑에서 혼자 관계를 이끌거나 파트너의 문제의 무게를 지고 있을 수 있습니다. 완드 10은 묻습니다: 이 짐이 정말 당신이 져야 할 것인가요? 그중 어떤 것을 위임하거나, 내려놓거나, 재협상할 수 있나요? 당신은 강하지만, 힘에도 한계가 있습니다.',
      advice: "Delegate some responsibilities. You don't have to carry everything.",
      adviceKo: '책임 일부를 위임하세요. 모든 것을 짊어질 필요 없습니다.'
    },
    reversed: {
      keywords: ['Letting go', 'Delegating', 'Release', 'Sharing the burden', 'Avoiding responsibility'],
      keywordsKo: ['내려놓음', '위임', '해방', '짐 나누기', '책임 회피'],
      meaning: 'The reversed Ten of Wands brings relief—the heavy load is being set down. Positively, you are learning to delegate, to say no, to share burdens that were never meant for one person alone. You\'re recognizing that martyrdom isn\'t strength, and that asking for help is wisdom. Weight lifts from your shoulders as you release what isn\'t truly yours to carry. However, the reversal can also indicate dropping responsibilities you shouldn\'t—avoiding necessary work or passing your burdens unfairly to others. In career, you may be burning out and need to restructure your workload, or you may be shirking duties. In love, balance of effort needs examination. The reversed Ten asks: Are you wisely releasing, or irresponsibly abandoning? Find the middle path between carrying too much and carrying too little.',
      meaningKo: '역방향 완드 10은 안도를 가져옵니다—무거운 짐이 내려지고 있습니다. 긍정적으로, 위임하고, 거절하고, 혼자 지기 위한 것이 아니었던 짐을 나누는 법을 배우고 있습니다. 순교가 힘이 아니며, 도움을 요청하는 것이 지혜임을 인식하고 있습니다. 진정으로 져야 할 것이 아닌 것을 놓으면서 어깨에서 무게가 걷힙니다. 그러나 역방향은 내려놓지 말아야 할 책임을 내려놓는 것을 나타낼 수도 있습니다—필요한 일을 피하거나 짐을 불공정하게 다른 사람에게 넘기는 것. 직업에서 번아웃되어 업무량을 재구성해야 하거나, 의무를 회피하고 있을 수 있습니다. 사랑에서 노력의 균형을 살펴볼 필요가 있습니다. 역방향 10은 묻습니다: 현명하게 놓고 있나요, 아니면 무책임하게 버리고 있나요? 너무 많이 지는 것과 너무 적게 지는 것 사이의 중간 길을 찾으세요.',
      advice: "Share your load wisely. Don't avoid all responsibility.",
      adviceKo: '짐을 현명하게 나누세요. 모든 책임을 회피하지 마세요.'
    }
  },
  {
    id: 32,
    name: 'Page of Wands',
    nameKo: '완드 시종',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/32.jpg',
    upright: {
      keywords: ['Enthusiasm', 'Exploration', 'Discovery', 'Free spirit', 'New ideas'],
      keywordsKo: ['열정', '탐험', '발견', '자유로운 영혼', '새 아이디어'],
      meaning: 'The Page of Wands embodies youthful enthusiasm, creative spark, and the excited energy of new beginnings. This messenger arrives with exciting news or opportunities—perhaps an invitation to adventure, a new creative project, or an inspiring idea that sets your imagination on fire. The Page has the courage to explore the unknown, unafraid of failure because every experience is a learning opportunity. In career, expect inspiring messages, new project opportunities, or the arrival of a young, creative colleague. In love, this could indicate a new romance full of passion and excitement, or playful energy returning to an existing relationship. The Page of Wands encourages you to embrace your inner child—curious, fearless, and ready to discover what life has to offer.',
      meaningKo: '완드 시종은 젊은 열정, 창조적 불꽃, 그리고 새로운 시작의 흥분된 에너지를 구현합니다. 이 메신저가 흥미로운 소식이나 기회를 가지고 옵니다—아마도 모험으로의 초대, 새로운 창조적 프로젝트, 또는 상상력에 불을 붙이는 영감 주는 아이디어. 시종은 모든 경험이 배움의 기회이기 때문에 실패를 두려워하지 않고 미지를 탐험할 용기가 있습니다. 직업에서 영감을 주는 메시지, 새로운 프로젝트 기회, 또는 젊고 창의적인 동료의 도착을 기대하세요. 사랑에서 열정과 흥분으로 가득한 새로운 로맨스, 또는 기존 관계로 돌아오는 장난기 있는 에너지를 나타낼 수 있습니다. 완드 시종은 내면 아이를 받아들이라고 권장합니다—호기심 있고, 두려움 없고, 삶이 제공하는 것을 발견할 준비가 된.',
      advice: 'Explore with enthusiasm. Follow your creative spark.',
      adviceKo: '열정으로 탐험하세요. 창의적 영감을 따르세요.'
    },
    reversed: {
      keywords: ['Creative blocks', 'Lack of direction', 'Haste', 'Feeling uninspired', 'Boredom'],
      keywordsKo: ['창작 정체', '방향 부재', '성급함', '영감 없음', '지루함'],
      meaning: 'The reversed Page of Wands indicates that the creative spark is struggling to ignite. You may feel uninspired, bored, or lacking direction for your enthusiasm. Perhaps you\'re starting too many projects without finishing any, or making hasty decisions that lead nowhere. The excitement has faded, leaving restlessness in its wake. There may be delayed or disappointing news regarding something you were excited about. In career, creative blocks may be frustrating you, or opportunities aren\'t developing as hoped. In love, initial excitement may be fading, or a new connection isn\'t living up to expectations. The reversed Page asks: What is dampening your creative fire? Are you scattered in too many directions, or stuck without any direction at all? Reconnect with what genuinely excites you.',
      meaningKo: '역방향 완드 시종은 창조적 불꽃이 점화되기 어려움을 나타냅니다. 영감이 없거나, 지루하거나, 열정에 대한 방향이 부족할 수 있습니다. 아마도 하나도 완료하지 않고 너무 많은 프로젝트를 시작하거나, 아무 데도 이끌지 않는 성급한 결정을 내리고 있을 수 있습니다. 흥분이 사라지고 불안만 남습니다. 흥분했던 것에 대해 지연되거나 실망스러운 소식이 있을 수 있습니다. 직업에서 창작 정체가 답답하거나, 기회가 희망대로 발전하지 않습니다. 사랑에서 초기 흥분이 사라지거나, 새로운 연결이 기대에 미치지 못합니다. 역방향 시종은 묻습니다: 무엇이 창조적 불을 꺼뜨리고 있나요? 너무 많은 방향으로 분산되어 있나요, 아니면 아무 방향도 없이 갇혀 있나요? 진정으로 흥분시키는 것과 다시 연결하세요.',
      advice: 'Reconnect with your passion. Find what excites you again.',
      adviceKo: '열정과 다시 연결하세요. 다시 흥분시키는 것을 찾으세요.'
    }
  },
  {
    id: 33,
    name: 'Knight of Wands',
    nameKo: '완드 기사',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/33.jpg',
    upright: {
      keywords: ['Energy', 'Passion', 'Adventure', 'Impulsiveness', 'Action'],
      keywordsKo: ['에너지', '열정', '모험', '충동', '행동'],
      meaning: 'The Knight of Wands charges forward on his fiery horse, unstoppable in his pursuit of passion and adventure. This is the card of bold action, fearless exploration, and the courage to chase your desires without hesitation. Energy and enthusiasm are at peak levels—you feel ready to conquer the world. This Knight doesn\'t wait for permission; he acts on inspiration the moment it strikes. In career, expect rapid progress, travel for work, or the energy to push through obstacles. In love, passion ignites quickly—a whirlwind romance or exciting adventure with a partner. But be mindful: the Knight can be impulsive, acting before thinking. The Knight of Wands encourages you to embrace your boldest self while remembering that fire, uncontrolled, can burn. Channel your passion with purpose.',
      meaningKo: '완드 기사가 불 같은 말을 타고 돌진합니다, 열정과 모험의 추구에서 멈출 수 없습니다. 이것은 대담한 행동, 두려움 없는 탐험, 그리고 망설임 없이 욕구를 쫓을 용기의 카드입니다. 에너지와 열정이 최고조에 달합니다—세상을 정복할 준비가 된 느낌입니다. 이 기사는 허락을 기다리지 않습니다; 영감이 오는 순간 행동합니다. 직업에서 빠른 진전, 출장, 또는 장애물을 돌파할 에너지를 기대하세요. 사랑에서 열정이 빠르게 점화됩니다—회오리 로맨스나 파트너와의 흥미진진한 모험. 하지만 주의하세요: 기사는 생각하기 전에 행동하며 충동적일 수 있습니다. 완드 기사는 가장 대담한 자신을 받아들이되, 통제되지 않은 불은 태울 수 있음을 기억하라고 권장합니다. 열정을 목적을 가지고 방향 지으세요.',
      advice: 'Channel your passion into action. Adventure awaits!',
      adviceKo: '열정을 행동으로 옮기세요. 모험이 기다립니다!'
    },
    reversed: {
      keywords: ['Recklessness', 'Delays', 'Frustration', 'Lack of energy', 'Haste'],
      keywordsKo: ['무모함', '지연', '좌절', '에너지 부족', '성급함'],
      meaning: 'The reversed Knight of Wands shows fire burning out of control—or worse, struggling to ignite at all. On one side, you may be acting with dangerous recklessness, making hasty decisions that have consequences, rushing into situations without proper thought. The impulsiveness becomes destructive rather than adventurous. On the other side, you may feel your fire has dimmed—delays frustrate you, energy is lacking, and the passion that once drove you seems to have disappeared. In career, projects may be stalled by your own impatience or lack of follow-through. In love, the flames are either burning too hot (creating drama) or too cold (losing passion). The reversed Knight asks: Are you charging without direction, or standing still when you should be moving? Find balance between recklessness and paralysis.',
      meaningKo: '역방향 완드 기사는 통제 불능으로 타는 불—또는 더 나쁘게, 전혀 점화하기 어려운 것을 보여줍니다. 한편으로, 위험한 무모함으로 행동하여 결과가 있는 성급한 결정을 내리고, 충분한 생각 없이 상황에 돌진하고 있을 수 있습니다. 충동성이 모험적이기보다 파괴적이 됩니다. 다른 한편으로, 불이 꺼진 느낌일 수 있습니다—지연이 좌절시키고, 에너지가 부족하며, 한때 움직이게 했던 열정이 사라진 것 같습니다. 직업에서 자신의 조급함이나 마무리 부족으로 프로젝트가 정체될 수 있습니다. 사랑에서 불꽃이 너무 뜨겁거나(드라마를 만들거나) 너무 차갑습니다(열정을 잃는). 역방향 기사는 묻습니다: 방향 없이 돌진하고 있나요, 아니면 움직여야 할 때 가만히 서 있나요? 무모함과 마비 사이의 균형을 찾으세요.',
      advice: 'Slow down before acting. Recklessness leads to mistakes.',
      adviceKo: '행동 전에 속도를 늦추세요. 무모함은 실수를 부릅니다.'
    }
  },
  {
    id: 34,
    name: 'Queen of Wands',
    nameKo: '완드 여왕',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/34.jpg',
    upright: {
      keywords: ['Courage', 'Confidence', 'Independence', 'Social butterfly', 'Determination'],
      keywordsKo: ['용기', '자신감', '독립', '사교적', '결단력'],
      meaning: 'The Queen of Wands sits on her throne with a sunflower in hand and a black cat at her feet—she embodies confidence, courage, and the warmth that draws others to her light. This Queen knows her worth and isn\'t afraid to shine. She is socially magnetic, creatively vibrant, and fiercely independent. When this card appears, it calls you to embody these qualities: believe in yourself, express your creativity boldly, and lead with warmth rather than force. In career, you command respect and attract opportunities through your confidence and charisma. In love, you are desirable, passionate, and bring excitement to relationships. The Queen of Wands may also represent a person in your life who embodies these qualities—warm, supportive, and encouraging of your growth. Let your inner fire illuminate the world around you.',
      meaningKo: '완드 여왕은 손에 해바라기를 들고 발치에 검은 고양이와 함께 왕좌에 앉아 있습니다—자신감, 용기, 그리고 다른 사람을 그녀의 빛으로 끌어당기는 따뜻함을 구현합니다. 이 여왕은 자신의 가치를 알고 빛나는 것을 두려워하지 않습니다. 사교적으로 자기적이고, 창조적으로 생생하며, 맹렬하게 독립적입니다. 이 카드가 나타나면 이러한 자질을 구현하라고 부릅니다: 자신을 믿고, 창의성을 대담하게 표현하고, 힘보다 따뜻함으로 이끄세요. 직업에서 자신감과 카리스마를 통해 존경을 받고 기회를 끌어당깁니다. 사랑에서 바람직하고, 열정적이며, 관계에 흥분을 가져옵니다. 완드 여왕은 또한 이러한 자질을 구현하는 삶의 사람을 나타낼 수 있습니다—따뜻하고, 지지하며, 성장을 격려하는. 내면의 불이 주변 세상을 밝히게 하세요.',
      advice: 'Lead with confidence. Your charisma draws others to you.',
      adviceKo: '자신감 있게 이끄세요. 카리스마가 다른 이들을 끌어당깁니다.'
    },
    reversed: {
      keywords: ['Selfishness', 'Jealousy', 'Insecurity', 'Demanding', 'Lack of confidence'],
      keywordsKo: ['이기심', '질투', '불안감', '요구적', '자신감 부족'],
      meaning: 'The reversed Queen of Wands reveals the shadow side of fire: confidence that has turned to arrogance, or worse, confidence that has collapsed into insecurity. You may be feeling less than yourself, struggling with self-doubt, or losing touch with your personal power. Alternatively, you may be wielding your fire destructively—demanding, jealous, or self-centered, burning those who come too close. In career, your insecurity may be making you defensive or aggressive toward colleagues. In love, jealousy or possessiveness may be damaging the relationship, or you may be giving away your power to please someone else. The reversed Queen asks: What has dimmed your flame? Are you hiding your light out of fear, or burning others with it out of pain? Reconnect with genuine confidence—the kind that lifts others rather than demanding they kneel.',
      meaningKo: '역방향 완드 여왕은 불의 그림자 측면을 드러냅니다: 오만함으로 변한 자신감, 또는 더 나쁘게, 불안감으로 무너진 자신감. 자신보다 못한 느낌, 자기 의심으로 고군분투하거나, 개인적인 힘과 접촉을 잃고 있을 수 있습니다. 또는 불을 파괴적으로 휘두르고 있을 수 있습니다—요구적이고, 질투하거나, 자기중심적으로, 너무 가까이 오는 사람을 태우는. 직업에서 불안감이 동료에게 방어적이거나 공격적으로 만들 수 있습니다. 사랑에서 질투나 소유욕이 관계를 손상시키거나, 다른 사람을 기쁘게 하려고 힘을 넘겨주고 있을 수 있습니다. 역방향 여왕은 묻습니다: 무엇이 불꽃을 흐리게 했나요? 두려움에서 빛을 숨기고 있나요, 아니면 고통에서 다른 사람을 태우고 있나요? 진정한 자신감과 다시 연결하세요—무릎 꿇기를 요구하기보다 다른 사람을 들어올리는 종류의.',
      advice: "Address your insecurities. Don't let jealousy control you.",
      adviceKo: '불안감을 해결하세요. 질투가 당신을 지배하지 않게 하세요.'
    }
  },
  {
    id: 35,
    name: 'King of Wands',
    nameKo: '완드 왕',
    arcana: 'minor',
    suit: 'wands',
    image: '/cards/35.jpg',
    upright: {
      keywords: ['Natural-born leader', 'Vision', 'Entrepreneur', 'Honor', 'Charisma'],
      keywordsKo: ['타고난 리더', '비전', '사업가', '명예', '카리스마'],
      meaning: 'The King of Wands embodies visionary leadership at its finest—charismatic, bold, and honorable. This King has mastered his fire, channeling passionate energy into constructive achievement. He leads not through fear but through inspiration, and others follow willingly because they believe in his vision. The salamander on his robe bites its tail, representing the infinite cycle of creative energy he commands. When this card appears, you are called to step into leadership with confidence. In career, you have the vision and charisma to lead major projects or build enterprises. In love, you bring passion and excitement while maintaining honor and commitment. The King of Wands may also represent a mentor, boss, or partner who embodies these qualities—dynamic, supportive, and ambitious. Rule your kingdom with wisdom and fire.',
      meaningKo: '완드 왕은 최상의 비전적 리더십을 구현합니다—카리스마 있고, 대담하며, 명예로운. 이 왕은 불을 숙달하여 열정적 에너지를 건설적 성취로 전환합니다. 두려움이 아닌 영감을 통해 이끌고, 다른 사람들이 그의 비전을 믿기 때문에 기꺼이 따릅니다. 그의 예복에 있는 도롱뇽이 꼬리를 무는 것은 그가 명령하는 창조적 에너지의 무한 순환을 나타냅니다. 이 카드가 나타나면 자신감을 가지고 리더십에 들어서라는 부름입니다. 직업에서 주요 프로젝트를 이끌거나 기업을 세울 비전과 카리스마가 있습니다. 사랑에서 명예와 헌신을 유지하면서 열정과 흥분을 가져옵니다. 완드 왕은 또한 이러한 자질을 구현하는 멘토, 상사, 또는 파트너를 나타낼 수 있습니다—역동적이고, 지지하며, 야심적인. 지혜와 불로 왕국을 다스리세요.',
      advice: 'Lead with vision and honor. Inspire others with your passion.',
      adviceKo: '비전과 명예로 이끄세요. 열정으로 다른 이들에게 영감을 주세요.'
    },
    reversed: {
      keywords: ['Arrogance', 'Impulsiveness', 'Ruthlessness', 'High expectations', 'Tyranny'],
      keywordsKo: ['오만', '충동', '무자비', '높은 기대', '독재'],
      meaning: 'The reversed King of Wands warns of power corrupted or misused. The visionary leader has become a tyrant—arrogant, impulsive, and ruthless in pursuit of goals. Fire that should warm and inspire now burns those in its path. You may be encountering such a person in your life—a boss, partner, or authority figure whose expectations are unreasonable and whose behavior is controlling. Alternatively, you may need to examine whether you are expressing these shadow qualities yourself. In career, beware of letting ambition override ethics or becoming the kind of leader others fear rather than respect. In love, dominance and control are replacing partnership. The reversed King asks: Is your fire serving your vision, or has it become destructive? Leadership requires humility; power requires restraint. Reclaim the honor that makes the crown worth wearing.',
      meaningKo: '역방향 완드 왕은 권력이 타락하거나 오용됨을 경고합니다. 비전적 리더가 폭군이 되었습니다—오만하고, 충동적이며, 목표 추구에 무자비합니다. 따뜻하게 하고 영감을 주어야 할 불이 이제 길에 있는 사람을 태웁니다. 삶에서 그런 사람을 만나고 있을 수 있습니다—기대가 불합리하고 행동이 통제적인 상사, 파트너, 또는 권위적 인물. 또는 자신이 이러한 그림자 자질을 표현하고 있는지 살펴볼 필요가 있을 수 있습니다. 직업에서 야망이 윤리를 넘어서거나 존경보다 두려움을 받는 리더가 되지 않도록 주의하세요. 사랑에서 지배와 통제가 파트너십을 대체하고 있습니다. 역방향 왕은 묻습니다: 불이 비전에 봉사하고 있나요, 아니면 파괴적이 되었나요? 리더십에는 겸손이 필요합니다; 권력에는 절제가 필요합니다. 왕관을 쓸 가치 있게 만드는 명예를 되찾으세요.',
      advice: 'Check your ego. Lead with humility, not tyranny.',
      adviceKo: '자만심을 점검하세요. 폭정이 아닌 겸손으로 이끄세요.'
    }
  },

  // Suit of Cups
  {
    id: 36,
    name: 'Ace of Cups',
    nameKo: '컵 에이스',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/36.jpg',
    upright: {
        keywords: ['Love', 'Compassion', 'Creativity', 'Overwhelming emotion', 'New relationship'],
        keywordsKo: ['사랑', '연민', '창조성', '감정의 물결', '새 관계'],
        meaning: 'The Ace of Cups overflows with divine love, emotional renewal, and the promise of deep connection. A sacred chalice appears in your life, offering you the purest waters of the heart—love without conditions, compassion without limits, creativity without bounds. This is the seed of all emotional fulfillment, whether it manifests as a new romance, a deepening friendship, a spiritual awakening, or a surge of artistic inspiration. The universe is opening your heart to receive. In love, this card heralds the beginning of something beautiful—perhaps a soulmate connection or the rekindling of passion in an existing relationship. In career, creative projects flourish and work becomes fulfilling on an emotional level. Spiritually, you are being invited to connect with your intuition and the divine feminine. Accept this gift with an open heart; allow yourself to feel deeply and love freely.',
        meaningKo: '컵 에이스는 신성한 사랑, 감정적 재생, 그리고 깊은 연결의 약속으로 넘쳐납니다. 신성한 성배가 당신의 삶에 나타나, 마음의 가장 순수한 물을 제공합니다—조건 없는 사랑, 한계 없는 연민, 경계 없는 창조성. 이것은 모든 감정적 충족의 씨앗이며, 새로운 로맨스, 깊어지는 우정, 영적 각성, 또는 예술적 영감의 물결로 나타날 수 있습니다. 우주가 당신의 마음을 열어 받아들이게 하고 있습니다. 사랑에서 이 카드는 아름다운 무언가의 시작을 알립니다—소울메이트와의 연결이거나 기존 관계에서 열정의 재점화일 수 있습니다. 직업에서 창조적 프로젝트가 번창하고 일이 감정적 수준에서 충족감을 줍니다. 영적으로 당신은 직관과 신성한 여성성과 연결하도록 초대받고 있습니다. 열린 마음으로 이 선물을 받아들이세요; 깊이 느끼고 자유롭게 사랑하세요.',
        advice: 'Open your heart to love. Accept emotional gifts freely offered.',
        adviceKo: '사랑에 마음을 열어주세요. 자유롭게 제공되는 감정적 선물을 받아들이세요.'
    },
    reversed: {
        keywords: ['Blocked emotions', 'Repressed feelings', 'Emptiness', 'Sadness', 'Creative block'],
        keywordsKo: ['감정 차단', '억압된 감정', '공허', '슬픔', '창작 정체'],
        meaning: 'The reversed Ace of Cups reveals emotional blockages that prevent love and creativity from flowing freely. The sacred chalice has been turned over, and its healing waters spill away unused. You may be guarding your heart too closely, afraid of vulnerability, rejection, or the intensity of your own feelings. Past wounds may have taught you that love is dangerous, but this protection has become a prison. Creative inspiration feels distant, relationships feel hollow, and there is an emptiness that material things cannot fill. In love, fear prevents new connections or deepening existing ones—you may push people away or choose unavailable partners. In career, you feel disconnected from your work, going through the motions without passion. This card calls you to examine what you are afraid to feel. True healing begins when you allow emotions to flow again. Consider what walls need to come down and what past hurts need acknowledgment and release.',
        meaningKo: '역방향 컵 에이스는 사랑과 창조성이 자유롭게 흐르는 것을 막는 감정적 차단을 드러냅니다. 신성한 성배가 뒤집어져 치유의 물이 사용되지 않은 채 쏟아집니다. 취약함, 거절, 또는 자신의 감정 강도가 두려워 마음을 너무 단단히 지키고 있을 수 있습니다. 과거의 상처가 사랑은 위험하다고 가르쳤을 수 있지만, 이 보호가 감옥이 되었습니다. 창조적 영감은 멀게 느껴지고, 관계는 공허하며, 물질적인 것으로 채울 수 없는 공허함이 있습니다. 사랑에서 두려움이 새로운 연결이나 기존 관계를 깊게 하는 것을 막습니다—사람들을 밀어내거나 만날 수 없는 파트너를 선택할 수 있습니다. 직업에서 일과 단절되어 열정 없이 움직이고 있습니다. 이 카드는 무엇을 느끼기 두려워하는지 살펴보라고 합니다. 진정한 치유는 감정이 다시 흐르도록 허용할 때 시작됩니다. 어떤 벽을 허물어야 하고 어떤 과거의 상처가 인정과 해방이 필요한지 생각해보세요.',
        advice: 'Release emotional blocks. Let yourself feel again.',
        adviceKo: '감정적 차단을 풀어주세요. 다시 느끼도록 허용하세요.'
    }
  },
  {
    id: 37,
    name: 'Two of Cups',
    nameKo: '컵 2',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/37.jpg',
    upright: {
        keywords: ['Unified love', 'Partnership', 'Mutual attraction', 'Connection', 'Harmony'],
        keywordsKo: ['하나된 사랑', '파트너십', '상호 끌림', '연결', '조화'],
        meaning: 'The Two of Cups celebrates the beautiful alchemy that occurs when two souls recognize each other. This is the card of true partnership—two individuals who see, honor, and uplift one another. Whether romantic love, deep friendship, or meaningful business partnership, this connection is marked by equality, mutual respect, and genuine understanding. The energy flows both ways; giving and receiving are perfectly balanced. In love, this is one of the most auspicious cards—suggesting a relationship built on authentic connection rather than fantasy or need. If single, a significant person may be entering your life; if partnered, your bond is being strengthened and renewed. In career, this signals successful collaborations, beneficial contracts, or finding a business partner who complements your skills. The Two of Cups reminds us that we are not meant to walk through life alone; the right connections multiply our joy and halve our burdens.',
        meaningKo: '컵 2는 두 영혼이 서로를 알아볼 때 일어나는 아름다운 연금술을 축하합니다. 이것은 진정한 파트너십의 카드입니다—서로를 보고, 존중하고, 끌어올리는 두 개인. 로맨틱한 사랑이든, 깊은 우정이든, 의미 있는 사업 파트너십이든, 이 연결은 평등, 상호 존중, 진정한 이해로 표시됩니다. 에너지가 양방향으로 흐르며; 주고받음이 완벽하게 균형을 이룹니다. 사랑에서 이것은 가장 길조적인 카드 중 하나입니다—환상이나 필요가 아닌 진정한 연결에 기반한 관계를 제안합니다. 미혼이라면 중요한 사람이 삶에 들어올 수 있고; 파트너가 있다면 유대가 강화되고 새로워지고 있습니다. 직업에서 이것은 성공적인 협력, 유익한 계약, 또는 당신의 기술을 보완하는 사업 파트너를 찾는 것을 신호합니다. 컵 2는 우리가 삶을 혼자 걸어가도록 되어 있지 않다는 것을 상기시킵니다; 올바른 연결은 기쁨을 배가하고 짐을 반으로 줄입니다.',
        advice: 'Honor this sacred connection. Nurture the bond with mutual respect and open communication.',
        adviceKo: '이 신성한 연결을 소중히 하세요. 상호 존중과 열린 소통으로 유대를 키우세요.'
    },
    reversed: {
        keywords: ['Break-up', 'Disharmony', 'Distrust', 'Relationship troubles', 'Misalignment'],
        keywordsKo: ['이별', '불화', '불신', '관계 문제', '불일치'],
        meaning: 'The reversed Two of Cups signals disharmony in what should be a balanced partnership. The equal exchange of energy has been disrupted—one person may be giving too much while the other takes, or both have stopped truly seeing each other. Trust has eroded, replaced by suspicion, miscommunication, or the painful realization that you want different things. In love, this can indicate a breakup, a relationship at a crossroads, or the need for serious conversation about where you stand. Perhaps you have grown apart, or outside influences are creating wedges between you. In career, partnerships or collaborations are struggling; there may be broken agreements or incompatible working styles. This card also asks you to examine your relationship with yourself—are you at war within? Do you reject parts of yourself that need integration? Sometimes the disharmony outside reflects a split inside. Healing requires honest communication, willingness to see the other\'s perspective, and courage to address what has been avoided.',
        meaningKo: '역방향 컵 2는 균형 잡힌 파트너십이어야 할 곳에서의 불화를 신호합니다. 에너지의 동등한 교환이 방해받았습니다—한 사람은 너무 많이 주고 다른 사람은 받기만 하거나, 둘 다 서로를 진정으로 보는 것을 멈췄습니다. 신뢰가 침식되어 의심, 오해, 또는 다른 것을 원한다는 고통스러운 깨달음으로 대체되었습니다. 사랑에서 이것은 이별, 기로에 선 관계, 또는 어디에 서 있는지에 대한 진지한 대화의 필요를 나타낼 수 있습니다. 아마도 멀어졌거나 외부의 영향이 사이에 쐐기를 만들고 있습니다. 직업에서 파트너십이나 협력이 어려움을 겪고 있습니다; 깨진 합의나 호환되지 않는 작업 스타일이 있을 수 있습니다. 이 카드는 또한 자신과의 관계를 살펴보라고 합니다—내면에서 전쟁 중인가요? 통합이 필요한 자신의 부분을 거부하나요? 때때로 외부의 불화는 내면의 분열을 반영합니다. 치유는 정직한 소통, 상대방의 관점을 보려는 의지, 피해왔던 것을 다룰 용기를 필요로 합니다.',
        advice: 'Address the imbalance honestly. Restore harmony through genuine dialogue or make peace with parting.',
        adviceKo: '불균형을 정직하게 다루세요. 진정한 대화로 조화를 회복하거나 이별과 화해하세요.'
    }
  },
  {
    id: 38,
    name: 'Three of Cups',
    nameKo: '컵 3',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/38.jpg',
    upright: {
        keywords: ['Celebration', 'Friendship', 'Creativity', 'Community', 'Reunion'],
        keywordsKo: ['축하', '우정', '창조성', '공동체', '재회'],
        meaning: 'The Three of Cups overflows with joy, connection, and celebration. Three figures raise their cups in toast—this is a moment to honor friendship, community, and the bonds that sustain us through life\'s journey. Happiness is best when shared, and this card calls you to gather with those you love. It may signal a reunion with old friends, a wedding or engagement celebration, a creative collaboration that brings joy, or simply a reminder to appreciate your support system. In love, this card suggests happiness within your social circle and possibly meeting someone through friends. Existing relationships benefit from community involvement and shared social experiences. In career, teamwork brings success and recognition; celebrate your achievements together rather than alone. The Three of Cups also speaks to creative fertility—group projects, artistic collaborations, and the inspiration that comes from connecting with like-minded souls. Make time for joy; nurture your friendships; let yourself be celebrated.',
        meaningKo: '컵 3은 기쁨, 연결, 축하로 넘쳐납니다. 세 인물이 건배하며 컵을 들어 올립니다—이것은 우정, 공동체, 그리고 삶의 여정을 통해 우리를 지탱하는 유대를 기리는 순간입니다. 행복은 나눌 때 가장 좋으며, 이 카드는 사랑하는 사람들과 모이라고 합니다. 오랜 친구와의 재회, 결혼식이나 약혼 축하, 기쁨을 가져다주는 창조적 협력, 또는 단순히 지지 체계를 감사히 여기라는 알림을 신호할 수 있습니다. 사랑에서 이 카드는 사회적 서클 내의 행복을 제안하고 친구를 통해 누군가를 만날 가능성을 나타냅니다. 기존 관계는 공동체 참여와 공유된 사회적 경험으로부터 이익을 얻습니다. 직업에서 팀워크가 성공과 인정을 가져옵니다; 혼자가 아니라 함께 성취를 축하하세요. 컵 3은 또한 창조적 비옥함에 대해 말합니다—그룹 프로젝트, 예술적 협력, 그리고 같은 생각을 가진 영혼과의 연결에서 오는 영감. 기쁨을 위한 시간을 만드세요; 우정을 가꾸세요; 축하받게 하세요.',
        advice: 'Gather your people and celebrate. Shared joy multiplies; honor your friendships today.',
        adviceKo: '사람들을 모아 축하하세요. 나눈 기쁨은 배가됩니다; 오늘 우정을 기리세요.'
    },
    reversed: {
        keywords: ['Gossip', 'Isolation', 'Overindulgence', 'Third-party interference', 'Cancelled celebration'],
        keywordsKo: ['험담', '고립', '과잉', '제3자 개입', '취소된 축하'],
        meaning: 'The reversed Three of Cups warns of discord within your social circle or the shadow side of celebration. Gossip may be poisoning friendships; jealousy creating rifts; or overindulgence in partying, drinking, or escapism causing problems in your life. A third party might be interfering in a relationship—watch for triangular situations that create drama and hurt. You may feel excluded from groups, uninvited from celebrations, or isolated despite being surrounded by people. In love, beware of infidelity (yours or a partner\'s), jealousy from friends about your relationship, or relationships that exist only in superficial social contexts without true depth. In career, team dynamics may be troubled; cliques or politics could be undermining collaboration. This card can also signal canceled plans, postponed celebrations, or feeling unable to access joy. Examine your social connections honestly—which friendships are genuine, and which are draining? Sometimes isolation is actually an invitation to be more selective about who you allow into your inner circle.',
        meaningKo: '역방향 컵 3은 사회적 서클 내의 불화나 축하의 그림자 측면을 경고합니다. 험담이 우정을 해치고 있을 수 있습니다; 질투가 균열을 만들고; 파티, 음주, 또는 도피에의 과잉이 삶에 문제를 일으킵니다. 제3자가 관계에 간섭할 수 있습니다—드라마와 상처를 만드는 삼각 상황을 조심하세요. 그룹에서 제외되거나, 축하에 초대받지 못하거나, 사람들에게 둘러싸여 있음에도 고립감을 느낄 수 있습니다. 사랑에서 불륜(당신 또는 파트너의), 관계에 대한 친구들의 질투, 또는 진정한 깊이 없이 피상적인 사회적 맥락에서만 존재하는 관계를 조심하세요. 직업에서 팀 역학이 문제가 될 수 있습니다; 파벌이나 정치가 협력을 약화시킬 수 있습니다. 이 카드는 취소된 계획, 연기된 축하, 또는 기쁨에 접근할 수 없음을 신호할 수도 있습니다. 사회적 연결을 정직하게 살펴보세요—어떤 우정이 진정하고 어떤 것이 소모적인가요? 때때로 고립은 실제로 내면의 서클에 누구를 허용할지 더 선별적이 되라는 초대입니다.',
        advice: 'Be selective about your circle. Address gossip directly and protect genuine bonds.',
        adviceKo: '서클에 대해 선별적이 되세요. 험담을 직접 다루고 진정한 유대를 보호하세요.'
    }
  },
  {
    id: 39,
    name: 'Four of Cups',
    nameKo: '컵 4',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/39.jpg',
    upright: {
        keywords: ['Apathy', 'Contemplation', 'Disconnection', 'Re-evaluation', 'Missed opportunity'],
        keywordsKo: ['무관심', '성찰', '단절', '재평가', '놓친 기회'],
        meaning: 'The Four of Cups depicts a figure sitting beneath a tree, arms crossed, blind to the cup being offered by a divine hand. This is the card of apathy, withdrawal, and introspective discontent. You may be so focused on what you don\'t have—or so disappointed by the past—that you fail to see new blessings arriving. There is a spiritual weariness here, a "what\'s the point?" energy that makes everything feel flat and meaningless. Sometimes this withdrawal is necessary; contemplation and soul-searching have their place. But stay too long in this state and life passes you by. In love, you may be emotionally unavailable, pushing away potential partners or taking your current relationship for granted. In career, opportunities are being offered that you dismiss or simply don\'t see because you\'re dwelling on dissatisfaction. This card invites you to look up, look around—what gift is the universe extending that you have been too preoccupied to notice? Gratitude is the medicine for apathy.',
        meaningKo: '컵 4는 나무 아래 앉아 팔짱을 끼고 신성한 손이 제공하는 컵을 보지 못하는 인물을 묘사합니다. 이것은 무관심, 철수, 내향적 불만의 카드입니다. 없는 것에 너무 집중하거나—과거에 너무 실망하여—새로운 축복이 오는 것을 보지 못할 수 있습니다. 영적 피로가 있습니다, "무슨 의미가 있어?" 에너지가 모든 것을 평평하고 무의미하게 느끼게 합니다. 때때로 이 철수는 필요합니다; 성찰과 영혼 탐색은 그 자리가 있습니다. 하지만 이 상태에 너무 오래 머물면 삶이 지나갑니다. 사랑에서 감정적으로 이용 불가할 수 있고, 잠재적 파트너를 밀어내거나 현재 관계를 당연시합니다. 직업에서 불만에 몰두하고 있어 제공되는 기회를 무시하거나 단순히 보지 못합니다. 이 카드는 위를 보고, 주위를 보라고 초대합니다—우주가 무슨 선물을 내밀고 있는데 너무 몰두해서 알아차리지 못했나요? 감사가 무관심의 약입니다.',
        advice: 'Look up and see what is being offered. Practice gratitude to break free from apathy.',
        adviceKo: '고개를 들어 제공되는 것을 보세요. 감사를 실천하여 무관심에서 벗어나세요.'
    },
    reversed: {
        keywords: ['Sudden awareness', 'Choosing happiness', 'Accepting help', 'New motivation', 'Seizing an opportunity'],
        keywordsKo: ['갑작스러운 깨달음', '행복 선택', '도움 수용', '새 동기', '기회 포착'],
        meaning: 'The reversed Four of Cups marks a powerful moment of awakening. The fog of apathy lifts, and suddenly you see what has been in front of you all along. New motivation floods in; you are ready to re-engage with life, to accept help when offered, to seize opportunities rather than dismiss them. Perhaps a period of contemplation has served its purpose and brought clarity about what you truly want. Perhaps you have simply grown tired of your own dissatisfaction and decided to choose a different perspective. In love, you are opening your heart again, ready to give new people or renewed connection with current partners a genuine chance. In career, you are emerging from a slump with fresh eyes and renewed ambition; the offer you previously ignored now looks appealing. This card encourages you to say yes, to reach for the cup being offered, to participate in your own life again. The withdrawal served a purpose, but now action and engagement are what heal.',
        meaningKo: '역방향 컵 4는 강력한 각성의 순간을 표시합니다. 무관심의 안개가 걷히고, 갑자기 줄곧 앞에 있었던 것을 봅니다. 새로운 동기가 밀려들어옵니다; 삶에 다시 참여하고, 제공될 때 도움을 받아들이고, 기회를 무시하지 않고 잡을 준비가 되었습니다. 아마도 성찰의 기간이 그 목적을 달성하고 진정으로 원하는 것에 대한 명확함을 가져왔습니다. 아마도 자신의 불만에 단순히 지쳐서 다른 관점을 선택하기로 결정했습니다. 사랑에서 다시 마음을 열고, 새로운 사람들이나 현재 파트너와의 새로운 연결에 진정한 기회를 줄 준비가 되었습니다. 직업에서 신선한 눈과 새로운 야망으로 침체에서 벗어나고 있습니다; 이전에 무시했던 제안이 이제 매력적으로 보입니다. 이 카드는 예라고 말하고, 제공되는 컵에 손을 뻗고, 자신의 삶에 다시 참여하라고 격려합니다. 철수는 목적을 달성했지만 이제 행동과 참여가 치유합니다.',
        advice: 'Say yes to what life offers. Re-engage with enthusiasm and seize this opportunity.',
        adviceKo: '삶이 제공하는 것에 예라고 하세요. 열정으로 다시 참여하고 이 기회를 잡으세요.'
    }
  },
  {
    id: 40,
    name: 'Five of Cups',
    nameKo: '컵 5',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/40.jpg',
    upright: {
        keywords: ['Loss', 'Regret', 'Disappointment', 'Sadness', 'Grief'],
        keywordsKo: ['상실', '후회', '실망', '슬픔', '애도'],
        meaning: 'The Five of Cups shows a cloaked figure mourning three spilled cups while two full cups stand behind them, unseen. This is the card of grief, regret, and focusing on what has been lost rather than what remains. Loss is real and valid—a relationship has ended, a dream has died, a disappointment has cut deep. Your pain deserves acknowledgment. But this card also gently asks: how long will you stand here mourning? Behind you are two cups still standing—blessings you still have, paths still open, love still available. In love, you may be grieving a breakup or betrayal, dwelling on how things should have been rather than accepting what is. This mourning is part of healing, but eventually you must turn around. In career, a failure, rejection, or loss of opportunity is weighing heavily. Allow yourself to grieve, but don\'t let this loss define your entire story. The bridge in the background leads home—you can return to yourself, to hope, to life. Feel what you need to feel, then choose to see what you still have.',
        meaningKo: '컵 5는 망토를 두른 인물이 세 개의 쏟아진 컵을 애도하는 동안 두 개의 가득 찬 컵이 뒤에 보이지 않게 서 있는 것을 보여줍니다. 이것은 슬픔, 후회, 남아있는 것보다 잃어버린 것에 집중하는 카드입니다. 상실은 실제이고 유효합니다—관계가 끝났고, 꿈이 죽었고, 실망이 깊이 상처를 주었습니다. 당신의 고통은 인정받을 자격이 있습니다. 하지만 이 카드는 또한 부드럽게 묻습니다: 얼마나 오래 여기 서서 애도할 건가요? 뒤에는 여전히 서 있는 두 컵이 있습니다—여전히 가진 축복, 여전히 열린 길, 여전히 가능한 사랑. 사랑에서 이별이나 배신을 애도하며 있는 그대로 받아들이기보다 어떻게 됐어야 했는지에 머물고 있을 수 있습니다. 이 애도는 치유의 일부이지만 결국 돌아서야 합니다. 직업에서 실패, 거절, 또는 기회의 상실이 무겁게 짓누르고 있습니다. 애도하도록 허용하되 이 손실이 전체 이야기를 정의하게 하지 마세요. 배경의 다리는 집으로 이어집니다—자신에게, 희망에게, 삶으로 돌아갈 수 있습니다. 느껴야 할 것을 느끼고, 그런 다음 여전히 가진 것을 보기로 선택하세요.',
        advice: 'Honor your grief, but turn around. See the two cups still standing behind you.',
        adviceKo: '슬픔을 존중하되 돌아서세요. 뒤에 여전히 서 있는 두 컵을 보세요.'
    },
    reversed: {
        keywords: ['Moving on', 'Acceptance', 'Forgiveness', 'Finding peace', 'Healing'],
        keywordsKo: ['나아감', '수용', '용서', '평화 찾기', '치유'],
        meaning: 'The reversed Five of Cups signals a turning point in your grieving process. The cloaked figure is finally ready to turn around, to see the cups still standing, to walk across the bridge toward healing and hope. Acceptance is dawning—not that the loss didn\'t matter, but that you cannot live in mourning forever. You are ready to release regret, to forgive yourself or others for what happened, to find meaning in loss rather than only pain. In love, you may be opening to new possibilities after a breakup, releasing someone you\'ve been holding onto, or finding peace within a difficult situation. Old wounds are healing; the weight is lifting. In career, you are moving past a disappointment or failure, ready to try again with wisdom gained from experience. This card can also indicate finally letting go of guilt or shame you\'ve carried too long. The past cannot be changed, but your relationship to it can transform. You are choosing life over mourning, the present over the past, possibility over regret.',
        meaningKo: '역방향 컵 5는 애도 과정의 전환점을 신호합니다. 망토를 두른 인물이 마침내 돌아서고, 여전히 서 있는 컵들을 보고, 치유와 희망을 향해 다리를 건널 준비가 되었습니다. 수용이 밝아오고 있습니다—상실이 중요하지 않았다는 것이 아니라, 영원히 애도 속에 살 수 없다는 것입니다. 후회를 놓고, 일어난 일에 대해 자신이나 다른 사람을 용서하고, 고통만이 아닌 상실에서 의미를 찾을 준비가 되었습니다. 사랑에서 이별 후 새로운 가능성에 열리거나, 붙잡고 있던 누군가를 놓거나, 어려운 상황 내에서 평화를 찾고 있을 수 있습니다. 오래된 상처가 치유되고; 무게가 가벼워지고 있습니다. 직업에서 실망이나 실패를 넘어 경험에서 얻은 지혜로 다시 시도할 준비가 되고 있습니다. 이 카드는 또한 너무 오래 지고 있던 죄책감이나 수치심을 마침내 놓는 것을 나타낼 수 있습니다. 과거는 바꿀 수 없지만 그것과의 관계는 변할 수 있습니다. 당신은 애도보다 삶을, 과거보다 현재를, 후회보다 가능성을 선택하고 있습니다.',
        advice: 'Release the past and cross the bridge to healing. Forgiveness sets you free.',
        adviceKo: '과거를 놓고 치유로 가는 다리를 건너세요. 용서가 자유롭게 합니다.'
    }
  },
  {
    id: 41,
    name: 'Six of Cups',
    nameKo: '컵 6',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/41.jpg',
    upright: {
        keywords: ['Nostalgia', 'Childhood memories', 'Reunion', 'Innocence', 'Kindness'],
        keywordsKo: ['향수', '어린 시절 추억', '재회', '순수함', '친절'],
        meaning: 'The Six of Cups bathes in the golden glow of nostalgia and innocent joy. A child offers another a cup filled with flowers—a symbol of pure giving without expectation, of simpler times before life became complicated. This card invites you to reconnect with your inner child, with the wonder and openness you once possessed. Happy memories surface; you may be thinking about your childhood home, old friends, or simpler times. Sometimes this card literally indicates a reunion—running into someone from your past or receiving news from an old friend. In love, childhood sweethearts may reconnect, or existing relationships are healed through vulnerability and playfulness. There is an energy of giving and receiving kindness without agenda. In career, you may return to work that felt like your original calling or reconnect with mentors who shaped your path. The Six of Cups also speaks to healing your inner child, addressing old wounds with compassion, and finding joy in simple pleasures. Let yourself remember what made you happy before the world told you what "should" make you happy.',
        meaningKo: '컵 6은 향수와 순수한 기쁨의 황금빛 광채에 휩싸입니다. 한 아이가 다른 아이에게 꽃으로 가득 찬 컵을 건넵니다—기대 없는 순수한 나눔의 상징, 삶이 복잡해지기 전 더 단순한 시절. 이 카드는 내면의 아이와, 한때 가졌던 경이와 열림에 다시 연결하라고 초대합니다. 행복한 추억이 떠오릅니다; 어린 시절 집, 옛 친구들, 또는 더 단순한 시절을 생각하고 있을 수 있습니다. 때때로 이 카드는 문자 그대로 재회를 나타냅니다—과거의 누군가와 마주치거나 옛 친구에게서 소식을 받습니다. 사랑에서 어린 시절 연인이 다시 연결되거나, 기존 관계가 취약함과 장난기를 통해 치유됩니다. 의도 없이 친절을 주고받는 에너지가 있습니다. 직업에서 원래 소명처럼 느껴졌던 일로 돌아가거나 길을 형성한 멘토와 다시 연결할 수 있습니다. 컵 6은 또한 내면의 아이를 치유하고, 연민으로 오래된 상처를 다루고, 단순한 기쁨에서 즐거움을 찾는 것에 대해 말합니다. 세상이 무엇이 행복하게 "해야 한다"고 말하기 전에 무엇이 행복하게 했는지 기억하세요.',
        advice: 'Reconnect with your inner child. Find joy in simple pleasures and innocent moments.',
        adviceKo: '내면의 아이와 다시 연결하세요. 단순한 기쁨과 순수한 순간에서 즐거움을 찾으세요.'
    },
    reversed: {
        keywords: ['Stuck in the past', 'Moving on', 'Leaving home', 'Rose-tinted glasses', 'Letting go of childhood'],
        keywordsKo: ['과거에 갇힘', '나아감', '집 떠남', '미화', '어린 시절 놓기'],
        meaning: 'The reversed Six of Cups warns against living in the past at the expense of the present. You may be romanticizing memories, seeing your childhood or previous relationships through rose-tinted glasses while neglecting current opportunities for joy. "Things were better then" becomes an excuse not to engage with now. Alternatively, this card can indicate childhood trauma that still affects you, unprocessed memories that need addressing, or patterns learned in youth that no longer serve you. In love, you may be comparing current partners unfavorably to idealized past loves, or unable to form adult relationships because you have not matured beyond childhood patterns. Someone from the past may return, but they may not be who you remember. In career, you may be clinging to outdated methods or refusing to grow because the familiar feels safer. This card calls you to honor the past while releasing your grip on it. Take what was good and let it inform—not define—your present. The child you were can guide the adult you are becoming, but cannot remain in control.',
        meaningKo: '역방향 컵 6은 현재를 희생하며 과거에 사는 것을 경고합니다. 추억을 미화하고, 현재의 기쁨 기회를 소홀히 하면서 어린 시절이나 이전 관계를 장밋빛 안경으로 보고 있을 수 있습니다. "그때가 더 좋았어"가 지금과 참여하지 않는 변명이 됩니다. 또는 이 카드는 여전히 영향을 미치는 어린 시절 트라우마, 다뤄져야 할 처리되지 않은 기억, 또는 더 이상 도움이 되지 않는 어린 시절에 배운 패턴을 나타낼 수 있습니다. 사랑에서 현재 파트너를 이상화된 과거 사랑과 불리하게 비교하거나, 어린 시절 패턴을 넘어 성숙하지 않아 성인 관계를 형성할 수 없을 수 있습니다. 과거의 누군가가 돌아올 수 있지만 기억하는 사람이 아닐 수 있습니다. 직업에서 구식 방법에 집착하거나 익숙한 것이 더 안전하게 느껴져 성장을 거부할 수 있습니다. 이 카드는 과거를 존중하면서 그것에 대한 집착을 놓으라고 합니다. 좋았던 것을 취하고 현재를 정의하지 않고—알려주게 하세요. 당신이었던 아이는 되어가는 어른을 안내할 수 있지만 통제하며 남아있을 수는 없습니다.',
        advice: 'Release nostalgia\'s grip. Let the past inform, not define, your present path.',
        adviceKo: '향수의 집착을 놓으세요. 과거가 현재를 정의하지 않고 알려주게 하세요.'
    }
  },
  {
    id: 42,
    name: 'Seven of Cups',
    nameKo: '컵 7',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/42.jpg',
    upright: {
        keywords: ['Choices', 'Illusion', 'Fantasy', 'Wishful thinking', 'Opportunities'],
        keywordsKo: ['선택', '환상', '공상', '희망적 생각', '기회들'],
        meaning: 'The Seven of Cups presents a figure gazing at seven cups floating in clouds, each containing a different vision—a castle, jewels, a wreath, a dragon, a face, a snake, a veiled mystery. This is the card of choices, fantasies, and the sometimes paralyzing array of possibilities. Options abound, but not all are real—some are illusions, wishful thinking, or temptations that would lead you astray. Which cup will you choose? The challenge is discernment: separating genuine opportunities from empty fantasies. In love, you may be idealizing potential partners, lost in daydreams about perfect romance rather than engaging with real people. Multiple romantic options might leave you unable to commit to any. In career, too many possibilities scatter your focus; the "what ifs" prevent actual progress. This card invites you to ground your dreams in reality. Imagination is beautiful, but at some point you must choose, act, and accept that choosing one path means releasing others. Not deciding is also a choice—and often the worst one.',
        meaningKo: '컵 7은 구름에 떠 있는 일곱 개의 컵을 바라보는 인물을 보여주며, 각각 다른 비전을 담고 있습니다—성, 보석, 화환, 용, 얼굴, 뱀, 베일에 가려진 신비. 이것은 선택, 환상, 그리고 때때로 마비시키는 가능성의 배열의 카드입니다. 옵션이 풍부하지만 모두 진짜는 아닙니다—일부는 환상, 희망적 생각, 또는 당신을 길을 잃게 할 유혹입니다. 어떤 컵을 선택할 건가요? 도전은 분별입니다: 공허한 환상에서 진정한 기회를 분리하는 것. 사랑에서 잠재적 파트너를 이상화하고, 실제 사람들과 참여하기보다 완벽한 로맨스에 대한 백일몽에 빠져 있을 수 있습니다. 여러 로맨틱 옵션이 어느 것에도 헌신하지 못하게 할 수 있습니다. 직업에서 너무 많은 가능성이 집중을 흩트립니다; "만약"이 실제 진전을 막습니다. 이 카드는 꿈을 현실에 기반을 두라고 초대합니다. 상상은 아름답지만 어느 시점에서 선택하고, 행동하고, 하나의 길을 선택하면 다른 것을 놓아야 함을 받아들여야 합니다. 결정하지 않는 것도 선택입니다—그리고 종종 최악의 선택입니다.',
        advice: 'Discern illusion from opportunity. Choose one path and commit with clarity.',
        adviceKo: '환상과 기회를 분별하세요. 하나의 길을 선택하고 명확하게 헌신하세요.'
    },
    reversed: {
        keywords: ['Clarity', 'Making a decision', 'Reality check', 'Choosing a path', 'Focus'],
        keywordsKo: ['명확함', '결정', '현실 점검', '길 선택', '집중'],
        meaning: 'The reversed Seven of Cups brings welcome clarity after a period of confusion and indecision. The clouds part, the illusions dissipate, and you can finally see which opportunities are real and which were just mirages. You are ready to make a firm decision and commit to a path. Perhaps reality has provided a necessary wake-up call, forcing you to release fantasies that were never going to materialize. Perhaps you have simply tired of your own indecision and chosen to focus. In love, you are seeing a situation or person clearly, stripped of projection and wishful thinking. You know what you want and are ready to pursue it in the real world, not just in daydreams. In career, scattered energy is consolidating around a concrete goal; you are prioritizing and eliminating distractions. This card celebrates the power of choice—the moment when potential becomes direction, and dreaming transforms into doing. The cup you choose may not be the most glamorous, but it is real, and that matters more.',
        meaningKo: '역방향 컵 7은 혼란과 우유부단의 시기 후에 환영할 만한 명확함을 가져옵니다. 구름이 걷히고, 환상이 사라지며, 마침내 어떤 기회가 진짜이고 어떤 것이 신기루였는지 볼 수 있습니다. 확고한 결정을 내리고 길에 헌신할 준비가 되었습니다. 아마도 현실이 필요한 경종을 제공하여 결코 실현되지 않을 환상을 놓게 강요했습니다. 아마도 단순히 자신의 우유부단에 지쳐 집중하기로 선택했습니다. 사랑에서 상황이나 사람을 투사와 희망적 생각이 벗겨진 채 명확하게 보고 있습니다. 원하는 것을 알고 백일몽에서가 아니라 현실 세계에서 그것을 추구할 준비가 되었습니다. 직업에서 흩어진 에너지가 구체적인 목표 주위로 통합되고 있습니다; 우선순위를 정하고 방해를 제거하고 있습니다. 이 카드는 선택의 힘을 축하합니다—잠재력이 방향이 되고, 꿈꾸는 것이 행동으로 변하는 순간. 선택한 컵이 가장 화려하지 않을 수 있지만 진짜이고, 그것이 더 중요합니다.',
        advice: 'The fog has lifted. Act on this clarity before confusion returns.',
        adviceKo: '안개가 걷혔습니다. 혼란이 돌아오기 전에 이 명확함으로 행동하세요.'
    }
  },
  {
    id: 43,
    name: 'Eight of Cups',
    nameKo: '컵 8',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/43.jpg',
    upright: {
        keywords: ['Abandonment', 'Walking away', 'Disappointment', 'Seeking something more', 'Moving on'],
        keywordsKo: ['떠남', '포기', '실망', '더 나은 것 찾기', '나아감'],
        meaning: 'The Eight of Cups shows a cloaked figure walking away from eight stacked cups, heading toward distant mountains under a waning moon. This is one of the most courageous cards in tarot—the choice to leave behind what no longer nourishes the soul, even when it looks complete from the outside. Something is missing. Despite having what others might envy, you feel hollow, restless, aware that there must be more to life than this. It takes tremendous bravery to walk away from the familiar into the unknown, from security into uncertainty, searching for deeper meaning. In love, you may be leaving a relationship that looks fine but feels empty, or emotionally withdrawing to understand what you truly need. This is not abandonment from weakness but departure from wisdom. In career, you may be leaving a stable job to pursue something more aligned with your soul\'s purpose. The journey will be difficult; the moon illuminates but does not show the full path. Yet staying would be harder—the slow death of settling for less than you deserve. Trust that what you seek is worth the search.',
        meaningKo: '컵 8은 망토를 입은 인물이 쌓인 여덟 개의 컵에서 등을 돌리고 기우는 달 아래 먼 산을 향해 걸어가는 것을 보여줍니다. 이것은 타로에서 가장 용감한 카드 중 하나입니다—밖에서 보면 완전해 보여도 더 이상 영혼에 영양을 주지 않는 것을 떠나는 선택. 무언가가 부족합니다. 다른 사람들이 부러워할 만한 것을 가지고도 공허하고, 불안하며, 이것보다 삶에 더 있어야 한다는 것을 알고 있습니다. 익숙한 것에서 미지로, 안정에서 불확실성으로 떠나는 것은 더 깊은 의미를 찾아 엄청난 용기가 필요합니다. 사랑에서 괜찮아 보이지만 공허하게 느껴지는 관계를 떠나거나, 진정으로 필요한 것을 이해하기 위해 감정적으로 물러나고 있을 수 있습니다. 이것은 약함에서 오는 버림이 아니라 지혜에서 오는 떠남입니다. 직업에서 영혼의 목적과 더 일치하는 것을 추구하기 위해 안정적인 직장을 떠나고 있을 수 있습니다. 여정은 어려울 것입니다; 달이 비추지만 전체 길을 보여주지 않습니다. 하지만 머무르는 것이 더 어려울 것입니다—당신이 받을 자격이 있는 것보다 적은 것에 안주하는 느린 죽음. 찾고 있는 것이 탐색할 가치가 있다고 믿으세요.',
        advice: 'Have courage to leave what is empty. The unknown holds what you truly seek.',
        adviceKo: '빈 것을 떠날 용기를 가지세요. 미지가 진정으로 찾는 것을 품고 있습니다.'
    },
    reversed: {
        keywords: ['Fear of change', 'Staying in a bad situation', 'Stagnation', 'Indecision', 'Return'],
        keywordsKo: ['변화 두려움', '나쁜 상황에 머묾', '정체', '우유부단', '귀환'],
        meaning: 'The reversed Eight of Cups reveals a soul trapped by fear of the unknown. You know you should leave—the relationship, the job, the situation—but you cannot bring yourself to walk away. The devil you know feels safer than the devil you do not. What if you leave and regret it? What if the unknown is worse? These fears keep you stuck in circumstances that drain your spirit while you tell yourself "it\'s not that bad." But it is. The reversed card can also indicate someone who has walked away before and is now returning, or someone drifting aimlessly without knowing what they are searching for. In love, you may be staying in an empty relationship out of fear of being alone, or running away from commitment rather than toward something meaningful. In career, you are stagnating in an unfulfilling role, afraid to pursue your true calling. This card challenges you to examine what you are really afraid of. Often the fear of leaving is greater than the actual difficulty of the journey. The cups will still be empty whether you stay or go—but only if you go can you find cups that are full.',
        meaningKo: '역방향 컵 8은 미지에 대한 두려움에 갇힌 영혼을 드러냅니다. 떠나야 한다는 것을 알고 있습니다—관계, 직장, 상황—하지만 떠나지 못합니다. 아는 악마가 모르는 악마보다 안전하게 느껴집니다. 떠나고 후회하면 어쩌죠? 미지가 더 나쁘면 어쩌죠? 이러한 두려움이 "그렇게 나쁘지 않아"라고 스스로에게 말하면서 정신을 소진시키는 상황에 갇히게 합니다. 하지만 나쁩니다. 역방향 카드는 또한 전에 떠났다가 이제 돌아오는 사람이나, 무엇을 찾고 있는지 모르고 목적 없이 떠도는 사람을 나타낼 수 있습니다. 사랑에서 혼자 있는 것이 두려워 공허한 관계에 머물거나, 의미 있는 무언가를 향하기보다 헌신에서 도망치고 있을 수 있습니다. 직업에서 진정한 소명을 추구하는 것이 두려워 충족되지 않는 역할에서 정체되고 있습니다. 이 카드는 진짜 무엇을 두려워하는지 살펴보라고 도전합니다. 종종 떠남의 두려움이 여정의 실제 어려움보다 큽니다. 머물든 떠나든 컵은 여전히 비어있을 것입니다—하지만 떠나야만 가득 찬 컵을 찾을 수 있습니다.',
        advice: 'Face your fear of change. Stagnation is more painful than the journey ahead.',
        adviceKo: '변화의 두려움에 맞서세요. 정체가 앞으로의 여정보다 더 고통스럽습니다.'
    }
  },
  {
    id: 44,
    name: 'Nine of Cups',
    nameKo: '컵 9',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/44.jpg',
    upright: {
        keywords: ['Wishes fulfilled', 'Contentment', 'Satisfaction', 'Gratitude', 'Success'],
        keywordsKo: ['소원 성취', '만족', '충족', '감사', '성공'],
        meaning: 'The Nine of Cups is known as the "wish card"—the card of dreams coming true and deep emotional satisfaction. A figure sits contentedly before nine golden cups arranged in an arc, arms crossed in quiet confidence. This is a moment to bask in fulfillment, to acknowledge that what you hoped for is manifesting. Your emotional, material, and spiritual desires are aligning; the universe is saying "yes" to your heart\'s wishes. In love, deep contentment and happiness are indicated—whether through a fulfilling relationship, self-love, or the joy of knowing you are worthy of love. Wishes related to romance may be granted. In career, success and recognition bring genuine satisfaction; you feel proud of what you have built. Financially, abundance flows. This card reminds you that happiness is possible, that dreams do come true, and that you deserve the good that is coming to you. Take time to feel grateful—not in the anxious way that fears losing what you have, but in the deep, settled way that knows you are exactly where you are meant to be. Enjoy this.',
        meaningKo: '컵 9는 "소원 카드"로 알려져 있습니다—꿈이 이루어지고 깊은 감정적 만족의 카드. 한 인물이 아치형으로 배열된 아홉 개의 황금 컵 앞에 만족스럽게 앉아 조용한 자신감으로 팔짱을 끼고 있습니다. 이것은 충족감에 젖어들고, 희망했던 것이 현실화되고 있음을 인정하는 순간입니다. 감정적, 물질적, 영적 욕망이 정렬되고 있습니다; 우주가 마음의 소원에 "예"라고 말하고 있습니다. 사랑에서 깊은 만족과 행복이 나타납니다—충족되는 관계, 자기 사랑, 또는 사랑받을 자격이 있다는 기쁨을 통해서든. 로맨스와 관련된 소원이 이루어질 수 있습니다. 직업에서 성공과 인정이 진정한 만족을 가져옵니다; 만든 것에 자부심을 느낍니다. 재정적으로 풍요가 흐릅니다. 이 카드는 행복이 가능하고, 꿈이 정말 이루어지며, 다가오는 좋은 것을 받을 자격이 있다는 것을 상기시킵니다. 감사하는 시간을 가지세요—가진 것을 잃을까 두려워하는 불안한 방식이 아니라, 바로 있어야 할 곳에 있다는 것을 아는 깊고 안정된 방식으로. 이것을 즐기세요.',
        advice: 'Your wish is granted. Bask in this fulfillment and feel deep gratitude.',
        adviceKo: '소원이 이루어졌습니다. 이 충족감에 젖어들고 깊은 감사를 느끼세요.'
    },
    reversed: {
        keywords: ['Dissatisfaction', 'Unfulfilled wishes', 'Materialism', 'Greed', 'Smugness'],
        keywordsKo: ['불만족', '이루어지지 않은 소원', '물질주의', '탐욕', '자만'],
        meaning: 'The reversed Nine of Cups reveals the shadow side of wish fulfillment—the hollow feeling when you get what you wanted but find it does not bring the happiness you expected. You may be surrounded by success yet feel empty, wondering "is this all there is?" Perhaps you wished for the wrong things, mistaking material acquisition or external validation for true fulfillment. Perhaps you have become smug or complacent, no longer appreciating what you have. In love, you may be dissatisfied in a relationship despite having a "good" partner, always wanting more or different. Or you may be using pleasure and indulgence to fill an emotional void that requires deeper work. In career, success feels hollow; the goal you achieved was not actually what your soul needed. This card invites you to examine your wishes—are they truly yours, or are they what you were taught to want? What would genuine fulfillment feel like? Sometimes the reversal indicates wishes delayed rather than denied; patience and inner work may be needed before dreams can manifest.',
        meaningKo: '역방향 컵 9는 소원 성취의 그림자 측면을 드러냅니다—원하는 것을 얻었지만 기대했던 행복을 가져오지 않는다는 공허한 느낌. 성공에 둘러싸여 있으면서도 "이게 전부야?"라고 궁금해하며 공허할 수 있습니다. 아마도 잘못된 것을 바랐고, 물질적 획득이나 외부 인정을 진정한 충족으로 착각했습니다. 아마도 자만하거나 안주하게 되어 더 이상 가진 것을 감사히 여기지 않습니다. 사랑에서 "좋은" 파트너가 있음에도 관계에 불만족하며, 항상 더 많거나 다른 것을 원할 수 있습니다. 또는 더 깊은 작업이 필요한 감정적 공허를 즐거움과 탐닉으로 채우고 있을 수 있습니다. 직업에서 성공이 공허하게 느껴집니다; 달성한 목표가 실제로 영혼이 필요한 것이 아니었습니다. 이 카드는 소원을 살펴보라고 초대합니다—진정으로 당신의 것인가요, 아니면 원하라고 배운 것인가요? 진정한 충족은 어떤 느낌일까요? 때때로 역방향은 거부된 것이 아니라 지연된 소원을 나타냅니다; 꿈이 실현되기 전에 인내와 내면 작업이 필요할 수 있습니다.',
        advice: 'Reexamine your wishes. True fulfillment comes from within, not external achievements.',
        adviceKo: '소원을 재검토하세요. 진정한 충족은 외부 성취가 아닌 내면에서 옵니다.'
    }
  },
  {
    id: 45,
    name: 'Ten of Cups',
    nameKo: '컵 10',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/45.jpg',
    upright: {
        keywords: ['Divine love', 'Happy family', 'Harmony', 'Fulfillment', 'Joy'],
        keywordsKo: ['신성한 사랑', '행복한 가정', '조화', '충만', '기쁨'],
        meaning: 'The Ten of Cups is the ultimate card of emotional fulfillment—the rainbow after the storm, the happy ending that is also a happy beginning. A loving couple stands beneath an arc of ten cups while children play joyfully nearby; this is the vision of harmonious family life, lasting love, and deep belonging. Whether or not you have a traditional family, this card speaks to finding your people, your home, the relationships that make life meaningful. This is divine love made manifest in daily life—not the fleeting passion of new romance, but the deep contentment of enduring connection. In love, this is one of the most positive cards—indicating a relationship marked by genuine happiness, emotional security, and shared dreams. Commitment leads to joy. In career, you feel you belong; your work contributes to something meaningful, and colleagues feel like family. This card celebrates what we all ultimately seek: to love and be loved, to belong somewhere, to know that at the end of the day there are people who matter to us and to whom we matter. Home is not just a place but a feeling—and you have found it.',
        meaningKo: '컵 10은 궁극적인 감정적 충족의 카드입니다—폭풍 후의 무지개, 또한 행복한 시작인 행복한 결말. 사랑하는 커플이 열 개의 컵 아치 아래 서 있고 아이들이 가까이에서 즐겁게 놀고 있습니다; 이것은 조화로운 가정생활, 지속적인 사랑, 깊은 소속감의 비전입니다. 전통적인 가족이 있든 없든, 이 카드는 당신의 사람들, 당신의 집, 삶을 의미 있게 만드는 관계를 찾는 것에 대해 말합니다. 이것은 일상생활에서 현실화된 신성한 사랑입니다—새로운 로맨스의 덧없는 열정이 아니라 지속적인 연결의 깊은 만족. 사랑에서 이것은 가장 긍정적인 카드 중 하나입니다—진정한 행복, 감정적 안정, 공유된 꿈으로 표시된 관계를 나타냅니다. 헌신이 기쁨으로 이어집니다. 직업에서 소속감을 느낍니다; 일이 의미 있는 것에 기여하고, 동료들이 가족처럼 느껴집니다. 이 카드는 우리 모두가 궁극적으로 추구하는 것을 축하합니다: 사랑하고 사랑받는 것, 어딘가에 속하는 것, 하루가 끝날 때 우리에게 중요하고 우리가 중요한 사람들이 있다는 것을 아는 것. 집은 단순히 장소가 아니라 느낌입니다—그리고 당신은 그것을 찾았습니다.',
        advice: 'You have found home. Cherish this harmony and nurture these sacred bonds.',
        adviceKo: '당신은 집을 찾았습니다. 이 조화를 소중히 여기고 신성한 유대를 키우세요.'
    },
    reversed: {
        keywords: ['Broken family', 'Disharmony', 'Unhappiness', 'Misaligned values', 'Relationship issues'],
        keywordsKo: ['깨진 가정', '불화', '불행', '가치관 불일치', '관계 문제'],
        meaning: 'The reversed Ten of Cups reveals the pain of broken dreams in relationships and family life. The rainbow has faded; the harmony has shattered. There may be family conflict, divorce, estrangement, or the painful gap between the happy family you wanted and the reality you have. Values that once aligned have diverged; people who once understood each other now speak different languages. In love, a once-happy relationship is struggling with serious issues—dishonesty, incompatibility, growing apart. The picture-perfect life you built or hoped for is crumbling. Family dynamics may be toxic, and you may need to redefine what "family" means to you. In career, workplace culture feels dysfunctional; there is no sense of belonging or shared purpose. This card can also indicate someone who rejects conventional ideas of happiness but has not yet defined what genuine fulfillment looks like for them. The message is not that happiness is impossible, but that you may need to release attachments to how you thought it would look. Sometimes the path to the Ten of Cups upright requires first accepting the reversed—acknowledging where relationships need healing, having difficult conversations, or choosing to build a different kind of family.',
        meaningKo: '역방향 컵 10은 관계와 가정생활에서 깨진 꿈의 고통을 드러냅니다. 무지개가 사라졌습니다; 조화가 산산조각 났습니다. 가족 갈등, 이혼, 소원함, 또는 원했던 행복한 가정과 가진 현실 사이의 고통스러운 간극이 있을 수 있습니다. 한때 일치했던 가치관이 갈라졌습니다; 한때 서로를 이해했던 사람들이 이제 다른 언어를 말합니다. 사랑에서 한때 행복했던 관계가 심각한 문제로 어려움을 겪고 있습니다—불정직, 비호환성, 멀어짐. 만들었거나 바랐던 완벽한 삶이 무너지고 있습니다. 가족 역학이 독성일 수 있고, "가족"이 당신에게 무엇을 의미하는지 재정의해야 할 수 있습니다. 직업에서 직장 문화가 기능 장애처럼 느껴집니다; 소속감이나 공유된 목적이 없습니다. 이 카드는 또한 행복에 대한 기존 관념을 거부하지만 진정한 충족이 그들에게 어떤 모습인지 아직 정의하지 않은 사람을 나타낼 수 있습니다. 메시지는 행복이 불가능하다는 것이 아니라, 어떻게 보일 것이라고 생각했던 것에 대한 집착을 놓아야 할 수 있다는 것입니다. 때때로 정방향 컵 10으로 가는 길은 먼저 역방향을 받아들이는 것을 필요로 합니다—관계가 치유되어야 할 곳을 인정하고, 어려운 대화를 하고, 다른 종류의 가족을 만들기로 선택하는 것.',
        advice: 'Redefine what family and happiness mean to you. Healing begins with honest conversations.',
        adviceKo: '가족과 행복이 당신에게 무엇을 의미하는지 재정의하세요. 치유는 정직한 대화에서 시작됩니다.'
    }
  },
  {
    id: 46,
    name: 'Page of Cups',
    nameKo: '컵 시종',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/46.jpg',
    upright: {
        keywords: ['Creative opportunities', 'Intuition', 'Curiosity', 'Imagination', 'A messenger of love'],
        keywordsKo: ['창조적 기회', '직관', '호기심', '상상력', '사랑의 메신저'],
        meaning: 'The Page of Cups appears as a gentle messenger from the realm of emotion and imagination. A young figure gazes at a fish emerging from a golden cup—a symbol of surprise, intuition, and the magical that emerges from the everyday. This card invites you to approach life with childlike wonder, to stay curious about your feelings and open to unexpected emotional experiences. A new creative or romantic opportunity may be presenting itself in an unusual way—stay receptive to messages from your unconscious, synchronicities, and the whispers of intuition. In love, this card often heralds the beginning of sweet romance, an unexpected confession of feelings, or a message that touches your heart. Existing relationships benefit from playfulness and emotional openness. In career, creative inspiration is flowing; artistic projects take on a dreamy, imaginative quality. Trust your creative instincts even if they seem unconventional. The Page of Cups reminds us that the heart speaks in poetry, not prose. Listen to dreams, pay attention to what moves you, and let yourself be surprised by the magic that life still holds.',
        meaningKo: '컵 시종은 감정과 상상의 영역에서 온 부드러운 메신저로 나타납니다. 젊은 인물이 황금 컵에서 나타나는 물고기를 바라봅니다—놀라움, 직관, 그리고 일상에서 나타나는 마법의 상징. 이 카드는 아이 같은 경이로움으로 삶에 접근하고, 감정에 호기심을 유지하고, 예상치 못한 감정적 경험에 열려 있으라고 초대합니다. 새로운 창조적 또는 로맨틱한 기회가 특이한 방식으로 나타나고 있을 수 있습니다—무의식으로부터의 메시지, 동시성, 그리고 직관의 속삭임에 수용적이세요. 사랑에서 이 카드는 종종 달콤한 로맨스의 시작, 예상치 못한 감정 고백, 또는 마음을 터치하는 메시지를 알립니다. 기존 관계는 장난기와 감정적 열림으로부터 이익을 얻습니다. 직업에서 창조적 영감이 흐르고 있습니다; 예술적 프로젝트가 꿈같고 상상력 풍부한 특질을 띕니다. 비전통적으로 보여도 창조적 본능을 믿으세요. 컵 시종은 마음은 산문이 아니라 시로 말한다는 것을 상기시킵니다. 꿈에 귀 기울이고, 무엇이 감동을 주는지 주의를 기울이고, 삶이 여전히 간직한 마법에 놀라게 하세요.',
        advice: 'Stay open to unexpected messages. Let wonder and imagination guide your heart.',
        adviceKo: '예상치 못한 메시지에 열려 있으세요. 경이와 상상력이 마음을 이끌게 하세요.'
    },
    reversed: {
        keywords: ['Creative blocks', 'Emotional immaturity', 'Escapism', 'Insecurity', 'Sad news'],
        keywordsKo: ['창작 정체', '감정적 미성숙', '도피', '불안감', '슬픈 소식'],
        meaning: 'The reversed Page of Cups suggests emotional immaturity or creative blockages preventing you from accessing your full emotional and imaginative potential. The fish has retreated back into the cup—the magic is hiding. You may be repressing your intuition, dismissing your feelings as silly, or too afraid of judgment to express your creative vision. Alternatively, this card can indicate someone who escapes into fantasy rather than dealing with real emotions, using daydreams, substances, or distractions to avoid facing what needs to be felt. In love, there may be childish behavior, unwillingness to have serious conversations, or emotional manipulation disguised as innocence. A romantic message or opportunity may be delayed or bring disappointment. In career, creative blocks frustrate you; the muse has gone silent, or you are too insecure to share your work. This card calls you to examine what is blocking your emotional and creative flow. Are you taking yourself too seriously to play? Too afraid of vulnerability to feel? Sometimes the reversal simply indicates a need to grow up emotionally without losing touch with wonder.',
        meaningKo: '역방향 컵 시종은 감정적 미성숙이나 창조적 차단이 전체 감정적, 상상적 잠재력에 접근하는 것을 막고 있음을 제안합니다. 물고기가 컵 안으로 후퇴했습니다—마법이 숨어 있습니다. 직관을 억압하거나, 감정을 어리석다고 무시하거나, 판단이 두려워 창조적 비전을 표현하지 못할 수 있습니다. 또는 이 카드는 실제 감정을 다루기보다 환상으로 도피하는 사람, 백일몽, 물질, 또는 방해로 느껴야 할 것을 마주하는 것을 피하는 사람을 나타낼 수 있습니다. 사랑에서 유치한 행동, 진지한 대화를 하지 않으려는 것, 또는 순수함으로 위장한 감정 조종이 있을 수 있습니다. 로맨틱 메시지나 기회가 지연되거나 실망을 가져올 수 있습니다. 직업에서 창조적 차단이 좌절감을 줍니다; 뮤즈가 침묵했거나, 작품을 공유하기엔 너무 불안합니다. 이 카드는 감정적, 창조적 흐름을 막고 있는 것을 살펴보라고 합니다. 놀기엔 너무 진지하게 받아들이나요? 느끼기엔 너무 취약함이 두려운가요? 때때로 역방향은 단순히 경이와의 연결을 잃지 않으면서 감정적으로 성장할 필요를 나타냅니다.',
        advice: 'Unblock your creativity by embracing vulnerability. Grow emotionally without losing wonder.',
        adviceKo: '취약함을 받아들여 창의성을 풀어주세요. 경이를 잃지 않고 감정적으로 성장하세요.'
    }
  },
  {
    id: 47,
    name: 'Knight of Cups',
    nameKo: '컵 기사',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/47.jpg',
    upright: {
        keywords: ['Romance', 'Charming', 'Imagination', 'An offer', 'A romantic dreamer'],
        keywordsKo: ['로맨스', '매력', '상상력', '제안', '낭만적 몽상가'],
        meaning: 'The Knight of Cups rides forth on a white horse, cup extended like an offering—he is the romantic quester, the poet in action, the one who follows his heart wherever it leads. This is the knight of feelings, dreams, and idealistic pursuit. When this card appears, romance is in the air; an invitation, proposal, or heartfelt offer may be coming your way. A charming, artistic, emotionally attuned person may be entering your life—or you are being called to embody these qualities yourself. In love, this is one of the most romantic cards in the deck. A proposal, declaration of love, or deepening of romantic connection is indicated. If you are seeking love, someone who stirs your heart may arrive. If you are in a relationship, your partner may surprise you with romantic gestures. In career, creative projects are calling; follow your passion even if the practical path is unclear. The Knight of Cups teaches that the heart has its own wisdom. Not everything needs to make logical sense—some things are worth pursuing simply because they feel right.',
        meaningKo: '컵 기사는 백마를 타고 제물처럼 컵을 내밀며 달려갑니다—그는 낭만적 탐구자, 행동하는 시인, 마음이 이끄는 곳을 따라가는 사람입니다. 이것은 감정, 꿈, 이상주의적 추구의 기사입니다. 이 카드가 나타나면 로맨스가 공기 중에 있습니다; 초대, 제안, 또는 진심 어린 제안이 올 수 있습니다. 매력적이고, 예술적이고, 감정적으로 조율된 사람이 삶에 들어올 수 있습니다—또는 이러한 자질을 직접 구현하도록 부름받고 있습니다. 사랑에서 이것은 덱에서 가장 로맨틱한 카드 중 하나입니다. 프로포즈, 사랑 고백, 또는 로맨틱한 연결의 깊어짐이 나타납니다. 사랑을 찾고 있다면, 마음을 흔드는 누군가가 도착할 수 있습니다. 관계 중이라면, 파트너가 로맨틱한 제스처로 놀라게 할 수 있습니다. 직업에서 창조적 프로젝트가 부르고 있습니다; 실용적인 길이 불분명해도 열정을 따르세요. 컵 기사는 마음에는 자체 지혜가 있다고 가르칩니다. 모든 것이 논리적으로 이해될 필요는 없습니다—어떤 것들은 단순히 옳게 느껴지기 때문에 추구할 가치가 있습니다.',
        advice: 'Follow your heart on this romantic quest. Let passion guide you to what feels right.',
        adviceKo: '이 낭만적 탐구에서 마음을 따르세요. 열정이 옳게 느껴지는 것으로 이끌게 하세요.'
    },
    reversed: {
        keywords: ['Unrealistic', 'Jealousy', 'Moodiness', 'Disappointment in love', 'Emotional manipulation'],
        keywordsKo: ['비현실적', '질투', '변덕', '사랑의 실망', '감정 조종'],
        meaning: 'The reversed Knight of Cups warns of the shadow side of romantic idealism—the charmer who disappoints, the dreamer who cannot commit, the emotional manipulator who uses feelings as weapons. This knight has lost his way; passion has curdled into jealousy, romance into manipulation, dreams into escapism. You may be dealing with someone who seems romantic but is actually emotionally unavailable, unreliable, or using charm to get what they want. Or perhaps you are this knight—lost in fantasy, unable to translate feelings into meaningful action, moody and unpredictable in relationships. In love, disappointment is likely; the romantic offer may not be genuine, the charming person may reveal a different nature, or you may be chasing an idealized love that does not exist in reality. In career, creative projects stall because dreams are not backed by discipline. This card calls for emotional honesty—with yourself and others. Romance is beautiful, but it must eventually land in reality. Check whether you are being seduced by appearances or genuinely connecting with substance.',
        meaningKo: '역방향 컵 기사는 낭만적 이상주의의 그림자 측면을 경고합니다—실망시키는 매력적인 사람, 헌신하지 못하는 몽상가, 감정을 무기로 사용하는 감정 조종자. 이 기사는 길을 잃었습니다; 열정이 질투로 변질되고, 로맨스가 조종으로, 꿈이 도피로 변했습니다. 로맨틱해 보이지만 실제로는 감정적으로 이용 불가능하고, 신뢰할 수 없거나, 매력을 사용해 원하는 것을 얻는 사람을 상대하고 있을 수 있습니다. 또는 아마도 당신이 이 기사입니다—환상에 빠져 감정을 의미 있는 행동으로 옮기지 못하고, 관계에서 변덕스럽고 예측 불가능합니다. 사랑에서 실망이 예상됩니다; 로맨틱한 제안이 진정하지 않을 수 있고, 매력적인 사람이 다른 본성을 드러낼 수 있거나, 현실에 존재하지 않는 이상화된 사랑을 쫓고 있을 수 있습니다. 직업에서 창조적 프로젝트가 멈춥니다 왜냐하면 꿈이 규율로 뒷받침되지 않기 때문입니다. 이 카드는 감정적 정직함을 요구합니다—자신과 다른 사람에게. 로맨스는 아름답지만 결국 현실에 착지해야 합니다. 외관에 유혹당하고 있는지 아니면 본질과 진정으로 연결하고 있는지 확인하세요.',
        advice: 'Ground romance in reality. Look beyond charm to see true intentions.',
        adviceKo: '로맨스를 현실에 기반을 두세요. 매력 너머 진정한 의도를 보세요.'
    }
  },
  {
    id: 48,
    name: 'Queen of Cups',
    nameKo: '컵 여왕',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/48.jpg',
    upright: {
        keywords: ['Compassion', 'Calm', 'Intuitive', 'Nurturing', 'Emotional stability'],
        keywordsKo: ['연민', '차분함', '직관적', '양육', '감정적 안정'],
        meaning: 'The Queen of Cups sits serenely at the water\'s edge, gazing at an ornate, closed cup—a symbol of the inner emotional world she has mastered. She embodies emotional intelligence at its finest: deeply feeling yet not overwhelmed, intuitive yet grounded, compassionate yet boundaried. This queen can sit with pain without drowning in it, sense what others feel without losing herself, offer comfort without depleting her own well. When this card appears, you are being called to embody these qualities or may encounter someone who does. In love, this signals deep emotional connection, intuitive understanding between partners, and a nurturing energy that heals. If representing a person, they are caring, sensitive, and emotionally supportive—a true emotional anchor. In career, trust your intuition; creative and healing professions are favored. The Queen of Cups reminds us that emotional depth is a strength, not a weakness. The ability to feel deeply, to sense what others need, to move through the waters of emotion with grace—these are gifts. Honor your sensitivity; it is your superpower.',
        meaningKo: '컵 여왕은 물가에 고요히 앉아 정교하게 닫힌 컵을 바라봅니다—그녀가 마스터한 내면의 감정 세계의 상징입니다. 그녀는 최상의 감정 지능을 구현합니다: 깊이 느끼면서도 압도되지 않고, 직관적이면서도 현실에 발을 딛고, 연민이 있으면서도 경계가 있습니다. 이 여왕은 고통과 함께 앉으면서도 빠져들지 않고, 다른 사람들의 감정을 감지하면서도 자신을 잃지 않고, 위안을 제공하면서도 자신의 우물을 고갈시키지 않습니다. 이 카드가 나타나면, 이러한 자질을 구현하도록 부름받거나 그런 사람을 만날 수 있습니다. 사랑에서 이것은 깊은 감정적 연결, 파트너 간의 직관적 이해, 치유하는 양육 에너지를 신호합니다. 사람을 나타낸다면, 그들은 돌보고, 민감하며, 감정적으로 지지적입니다—진정한 감정적 닻입니다. 직업에서 직관을 믿으세요; 창조적이고 치유적인 직업이 좋습니다. 컵 여왕은 감정적 깊이가 약점이 아니라 강점이라는 것을 상기시킵니다. 깊이 느끼는 능력, 다른 사람이 필요한 것을 감지하는 능력, 우아하게 감정의 물을 헤쳐나가는 능력—이것들은 선물입니다. 당신의 민감함을 존중하세요; 그것은 당신의 초능력입니다.',
        advice: 'Trust your emotional wisdom. Your sensitivity is a superpower, not a weakness.',
        adviceKo: '감정적 지혜를 믿으세요. 민감함은 약점이 아니라 초능력입니다.'
    },
    reversed: {
        keywords: ['Emotional insecurity', 'Co-dependency', 'Overly emotional', 'Needy', 'Martyrdom'],
        keywordsKo: ['감정적 불안', '상호의존', '과잉 감정', '의존적', '희생자'],
        meaning: 'The reversed Queen of Cups has lost her emotional center—the waters have grown turbulent, and she is drowning rather than swimming. Her gift of emotional sensitivity has become a burden; she absorbs others\' emotions without protection, gives until depleted, or uses emotional manipulation to get needs met. There is co-dependency here—losing yourself in others, martyrdom, or using emotional caretaking to avoid facing your own inner work. Alternatively, she may have shut down entirely, becoming cold and dismissive of feelings to protect a wounded heart. In love, emotional neediness may be pushing others away, or you may be giving too much while receiving too little, depleting yourself in the name of love. Boundaries have collapsed; you no longer know where you end and others begin. In career, you may be absorbing workplace drama, struggling with emotional overwhelm, or using care for others to avoid your own ambitions. This card calls for radical self-care and re-establishing emotional boundaries. You cannot pour from an empty cup. Before you can heal others, you must tend to your own waters.',
        meaningKo: '역방향 컵 여왕은 감정적 중심을 잃었습니다—물이 격랑해졌고, 헤엄치기보다 빠지고 있습니다. 감정적 민감함의 선물이 짐이 되었습니다; 보호 없이 다른 사람의 감정을 흡수하고, 고갈될 때까지 주거나, 필요를 충족시키기 위해 감정 조종을 사용합니다. 여기에 상호의존이 있습니다—다른 사람 안에서 자신을 잃거나, 순교하거나, 자신의 내면 작업을 마주하는 것을 피하기 위해 감정적 돌봄을 사용합니다. 또는 완전히 닫혀서, 상처받은 마음을 보호하기 위해 감정에 냉담하고 무시하게 되었을 수 있습니다. 사랑에서 감정적 필요가 다른 사람을 밀어낼 수 있거나, 너무 적게 받으면서 너무 많이 주며 사랑의 이름으로 자신을 고갈시키고 있을 수 있습니다. 경계가 무너졌습니다; 더 이상 어디서 끝나고 다른 사람이 시작되는지 알 수 없습니다. 직업에서 직장 드라마를 흡수하거나, 감정적 압도에 어려움을 겪거나, 자신의 야망을 피하기 위해 다른 사람을 돌봅니다. 이 카드는 급진적 자기 돌봄과 감정적 경계 재설정을 요구합니다. 빈 컵에서 부을 수 없습니다. 다른 사람을 치유하기 전에, 자신의 물을 돌봐야 합니다.',
        advice: 'Restore your boundaries and practice radical self-care. Fill your cup first.',
        adviceKo: '경계를 회복하고 급진적 자기 돌봄을 실천하세요. 먼저 자신의 컵을 채우세요.'
    }
  },
  {
    id: 49,
    name: 'King of Cups',
    nameKo: '컵 왕',
    arcana: 'minor',
    suit: 'cups',
    image: '/cards/49.jpg',
    upright: {
        keywords: ['Emotional balance', 'Compassion', 'Diplomacy', 'Control', 'Generosity'],
        keywordsKo: ['감정적 균형', '연민', '외교', '통제', '관대함'],
        meaning: 'The King of Cups sits upon his throne amid turbulent waters, yet remains calm and centered—the master of emotion, not its slave. This king has journeyed through the full depth of feeling and emerged with wisdom. He leads not with aggression but with emotional intelligence, not with force but with understanding. He can hold space for others\' pain without being destabilized, make difficult decisions without losing compassion, and navigate emotional complexity with grace. When this card appears, you are being called to embody emotional mastery or may encounter someone who does. In love, this signals a partner or potential partner who is emotionally mature, supportive, and stable—someone who can be trusted with your heart. Existing relationships deepen through mutual emotional support and understanding. In career, success comes through emotional intelligence, diplomacy, and the ability to understand and manage people. Creative and healing professions are especially favored. The King of Cups teaches that feeling deeply and functioning effectively are not opposites—the most powerful leaders are those who have integrated heart and mind.',
        meaningKo: '컵 왕은 격랑하는 물 가운데 왕좌에 앉아 있지만, 침착하고 중심을 잡고 있습니다—감정의 노예가 아닌 마스터입니다. 이 왕은 감정의 전체 깊이를 여행하고 지혜로 나왔습니다. 공격이 아닌 감정 지능으로, 힘이 아닌 이해로 이끕니다. 다른 사람의 고통을 위한 공간을 유지하면서도 불안정해지지 않고, 연민을 잃지 않고 어려운 결정을 내리며, 우아하게 감정적 복잡성을 탐색할 수 있습니다. 이 카드가 나타나면, 감정적 숙달을 구현하도록 부름받거나 그런 사람을 만날 수 있습니다. 사랑에서 이것은 감정적으로 성숙하고, 지지적이며, 안정적인 파트너나 잠재적 파트너를 신호합니다—마음을 맡길 수 있는 누군가. 기존 관계는 상호 감정적 지원과 이해를 통해 깊어집니다. 직업에서 성공은 감정 지능, 외교, 사람을 이해하고 관리하는 능력을 통해 옵니다. 창조적이고 치유적인 직업이 특히 좋습니다. 컵 왕은 깊이 느끼는 것과 효과적으로 기능하는 것이 반대가 아님을 가르칩니다—가장 강력한 리더는 마음과 정신을 통합한 사람입니다.',
        advice: 'Lead with emotional intelligence. Stay centered amid turbulent waters.',
        adviceKo: '감정 지능으로 이끄세요. 격랑하는 물 가운데서 중심을 유지하세요.'
    },
    reversed: {
        keywords: ['Emotional manipulation', 'Moodiness', 'Volatility', 'Coldness', 'Untrustworthy'],
        keywordsKo: ['감정 조종', '변덕', '불안정', '냉담', '신뢰할 수 없음'],
        meaning: 'The reversed King of Cups has lost his emotional center—the waters have overwhelmed him, or he has become so defended against feeling that coldness has replaced compassion. This king may use his emotional intelligence for manipulation rather than connection, wielding understanding of feelings as a weapon to control others. He may present a calm exterior while harboring rage, resentment, or emotional chaos within. Alternatively, he may have shut down entirely, becoming cold, distant, and unable to offer the warmth his position requires. In love, beware of partners who seem emotionally mature but reveal themselves to be manipulative, emotionally unavailable, or unable to handle your feelings. There may be moodiness, unpredictability, or emotional games in relationships. Someone may be using your emotional vulnerabilities against you. In career, a leader may be creating emotional turmoil rather than stability, or you yourself may be struggling to maintain composure under pressure. This card calls for honest examination: are you using your emotional gifts to heal or to harm? Is your calm a mask or a genuine center?',
        meaningKo: '역방향 컵 왕은 감정적 중심을 잃었습니다—물이 그를 압도했거나, 느낌에 대항해 너무 방어적이 되어 냉담이 연민을 대체했습니다. 이 왕은 감정 지능을 연결이 아닌 조종에 사용할 수 있으며, 다른 사람을 통제하기 위한 무기로 감정 이해를 휘두릅니다. 차분한 외양을 제시하면서 내면에 분노, 원한, 또는 감정적 혼란을 품고 있을 수 있습니다. 또는 완전히 닫혀서, 냉담하고, 멀며, 그의 위치가 요구하는 따뜻함을 제공할 수 없게 되었을 수 있습니다. 사랑에서 감정적으로 성숙해 보이지만 조종적이거나, 감정적으로 이용 불가능하거나, 당신의 감정을 다룰 수 없음이 드러나는 파트너를 조심하세요. 관계에서 변덕, 예측 불가능성, 또는 감정 게임이 있을 수 있습니다. 누군가가 당신의 감정적 취약성을 당신에게 불리하게 사용하고 있을 수 있습니다. 직업에서 리더가 안정보다 감정적 혼란을 만들고 있거나, 당신 자신이 압력 하에서 침착을 유지하는 데 어려움을 겪고 있을 수 있습니다. 이 카드는 정직한 검토를 요구합니다: 감정적 선물을 치유하기 위해 사용하고 있나요 아니면 해치기 위해? 당신의 침착은 가면인가요 아니면 진정한 중심인가요?',
        advice: 'Examine your emotional motives honestly. Use your gifts to heal, not manipulate.',
        adviceKo: '감정적 동기를 정직하게 살펴보세요. 선물을 조종이 아닌 치유에 사용하세요.'
    }
  },

  // Suit of Swords
  {
    id: 50,
    name: 'Ace of Swords',
    nameKo: '소드 에이스',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/50.jpg',
    upright: {
      keywords: ['Breakthrough', 'Clarity', 'Sharp mind', 'Truth', 'New idea'],
      keywordsKo: ['돌파구', '명확함', '날카로운 지성', '진실', '새 아이디어'],
      meaning: 'The Ace of Swords pierces through clouds of confusion with the brilliant light of mental clarity. A single sword rises, crowned with victory—this is the moment of breakthrough, when truth cuts through illusion and a powerful new understanding emerges. Your mind is sharp, your perception clear, your thinking unclouded. This is the card of epiphanies, sudden insights that change everything, the "aha!" moment when finally you see. The sword represents not just thought but truth—the courage to see things as they actually are, to speak what needs to be said, to make decisions based on facts rather than wishful thinking. In love, honest communication clears the air; truth, even when uncomfortable, creates the foundation for genuine connection. In career, a brilliant idea emerges, mental challenges are conquered, and clear thinking leads to success. The Ace of Swords reminds us that the mind, when properly wielded, is the most powerful tool we possess. Use this clarity wisely—truth is a sword that cuts both ways, capable of liberating or wounding.',
      meaningKo: '소드 에이스는 정신적 명확성의 빛으로 혼란의 구름을 뚫습니다. 단 하나의 검이 승리의 왕관을 쓰고 솟아오릅니다—이것은 돌파구의 순간, 진실이 환상을 베어내고 강력한 새 이해가 나타나는 때입니다. 정신이 날카롭고, 인식이 명확하고, 생각이 흐려지지 않았습니다. 이것은 깨달음의 카드, 모든 것을 바꾸는 갑작스러운 통찰, 마침내 보이는 "아하!" 순간입니다. 검은 단순히 생각뿐 아니라 진실을 나타냅니다—사물을 있는 그대로 보는 용기, 말해야 할 것을 말하는 것, 희망적 생각이 아닌 사실에 기반한 결정을 내리는 것. 사랑에서 정직한 소통이 공기를 맑게 합니다; 진실은 불편할 때도 진정한 연결의 기반을 만듭니다. 직업에서 빛나는 아이디어가 나타나고, 정신적 도전이 정복되며, 명확한 사고가 성공으로 이어집니다. 소드 에이스는 정신이 제대로 휘둘러질 때 우리가 가진 가장 강력한 도구임을 상기시킵니다. 이 명확성을 현명하게 사용하세요—진실은 양날의 검으로, 해방시키거나 상처 줄 수 있습니다.',
      advice: 'Cut through confusion with clarity. Speak truth and act on this breakthrough.',
      adviceKo: '명확함으로 혼란을 베어내세요. 진실을 말하고 이 돌파구에 행동하세요.'
    },
    reversed: {
      keywords: ['Confusion', 'Miscommunication', 'Lack of clarity', 'Wrong decision', 'Clouded judgment'],
      keywordsKo: ['혼란', '소통 오류', '명확함 부족', '잘못된 결정', '흐린 판단'],
      meaning: 'The reversed Ace of Swords indicates mental fog, confusion, or the misuse of intellectual power. The sword has lost its edge—your thinking is clouded, your judgment compromised, your communication garbled. This is not the time to make important decisions, as you lack the clarity needed to see all aspects of the situation. Miscommunication runs rampant; what you say is not what is heard, and what you hear may not be what was meant. In love, arguments arise from misunderstanding rather than genuine disagreement; words wound when they are meant to heal. There may be lies, whether told to you or by you. In career, brilliant ideas elude you; mental blocks prevent progress; or you may be using your intellect to manipulate rather than illuminate. The reversed Ace asks: is your sword serving truth or ego? Are you seeking clarity or avoiding uncomfortable realities? Sometimes confusion is the mind\'s way of protecting itself from truths it is not ready to face. Wait for the clouds to part before wielding this blade.',
      meaningKo: '역방향 소드 에이스는 정신적 안개, 혼란, 또는 지적 힘의 오용을 나타냅니다. 검이 날카로움을 잃었습니다—생각이 흐려지고, 판단이 손상되고, 소통이 뒤섞입니다. 상황의 모든 측면을 볼 명확성이 부족하므로 중요한 결정을 내릴 때가 아닙니다. 오해가 만연합니다; 말한 것이 들리는 것이 아니고, 들은 것이 의도한 것이 아닐 수 있습니다. 사랑에서 논쟁이 진정한 불일치가 아닌 오해에서 발생합니다; 말이 치유하려 할 때 상처를 줍니다. 당신에게 또는 당신이 말한 거짓말이 있을 수 있습니다. 직업에서 빛나는 아이디어가 피합니다; 정신적 차단이 진전을 막거나; 지성을 밝히기보다 조종하는 데 사용하고 있을 수 있습니다. 역방향 에이스는 묻습니다: 검이 진실을 위해 봉사하나요 아니면 자아를? 명확성을 찾고 있나요 아니면 불편한 현실을 피하고 있나요? 때때로 혼란은 마음이 마주할 준비가 안 된 진실로부터 자신을 보호하는 방법입니다. 이 칼날을 휘두르기 전에 구름이 걷히기를 기다리세요.',
      advice: 'Wait for mental clarity before deciding. Do not wield a dull blade.',
      adviceKo: '결정하기 전에 정신적 명확함을 기다리세요. 무딘 칼날을 휘두르지 마세요.'
    }
  },
  {
    id: 51,
    name: 'Two of Swords',
    nameKo: '소드 2',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/51.jpg',
    upright: {
      keywords: ['Difficult choice', 'Indecision', 'Stalemate', 'Blocked emotions', 'A truce'],
      keywordsKo: ['어려운 선택', '우유부단', '교착', '감정 차단', '휴전'],
      meaning: 'The Two of Swords depicts a blindfolded figure holding two crossed swords, seated before a body of water with rocky shores behind. This is the card of stalemate, of difficult choices where neither option feels good, of the temporary truce we create when we refuse to decide. The blindfold represents deliberately shutting out information—sometimes because you need objectivity, sometimes because you are avoiding what you do not want to see. You are at a crossroads, but neither path is appealing. Rather than choose, you freeze. In love, you may be avoiding a difficult conversation, refusing to see warning signs, or caught between two people or options. The relationship may be in a holding pattern where important issues remain unaddressed. In career, two options compete for your attention; paralysis by analysis prevents action. This card asks: what are you refusing to see? How long can you maintain this false peace? The swords are crossed but ready—eventually you must choose, or the choice will be made for you.',
      meaningKo: '소드 2는 눈을 가린 인물이 두 개의 교차된 검을 들고 바위 해안 앞 물가에 앉아 있는 것을 묘사합니다. 이것은 교착 상태의 카드, 어느 옵션도 좋지 않은 어려운 선택, 결정을 거부할 때 만드는 일시적 휴전입니다. 눈가리개는 정보를 의도적으로 차단함을 나타냅니다—때때로 객관성이 필요해서, 때때로 보고 싶지 않은 것을 피하기 때문입니다. 기로에 있지만 어느 길도 매력적이지 않습니다. 선택하기보다 얼어붙습니다. 사랑에서 어려운 대화를 피하거나, 경고 신호를 보기를 거부하거나, 두 사람 또는 옵션 사이에 끼어 있을 수 있습니다. 관계가 중요한 문제가 다뤄지지 않은 채 정체 상태일 수 있습니다. 직업에서 두 옵션이 관심을 위해 경쟁합니다; 분석에 의한 마비가 행동을 막습니다. 이 카드는 묻습니다: 무엇을 보기를 거부하나요? 이 거짓 평화를 얼마나 오래 유지할 수 있나요? 검은 교차되어 있지만 준비되어 있습니다—결국 선택해야 하며, 그렇지 않으면 선택이 대신 이루어질 것입니다.',
      advice: 'Remove the blindfold and face what you are avoiding. A choice must be made.',
      adviceKo: '눈가리개를 벗고 피하고 있는 것을 직면하세요. 선택이 이루어져야 합니다.'
    },
    reversed: {
      keywords: ['Indecision', 'Confusion', 'Information overload', 'Stuck in the middle', 'Anxiety'],
      keywordsKo: ['우유부단', '혼란', '정보 과부하', '중간에 갇힘', '불안'],
      meaning: 'The reversed Two of Swords indicates the stalemate is breaking—whether through forced choice, overwhelming anxiety, or the blindfold finally coming off. The delicate balance you maintained has become unbearable; the avoidance strategy is no longer working. You may be flooded with information and emotions you were blocking, overwhelmed rather than enlightened. Too much input from competing sources creates paralysis rather than clarity. In love, the difficult conversation can no longer be avoided; the issues you suppressed are forcing themselves into the open. You may be caught in the middle of others\' conflicts, forced to choose sides. In career, analysis paralysis has real consequences; decisions deferred too long make themselves, often badly. This card can also indicate relief—the burden of indecision lifting as you finally gather the courage to choose. Sometimes not deciding is worse than any possible wrong choice. Remove the blindfold. Look at what is actually in front of you. Then choose, accepting that no choice is perfect, but choosing is necessary.',
      meaningKo: '역방향 소드 2는 교착 상태가 깨지고 있음을 나타냅니다—강제된 선택, 압도적인 불안, 또는 마침내 눈가리개가 벗겨짐을 통해서. 유지했던 섬세한 균형이 견딜 수 없게 되었습니다; 회피 전략이 더 이상 작동하지 않습니다. 차단했던 정보와 감정이 쏟아져 깨우침이 아닌 압도당할 수 있습니다. 경쟁하는 출처에서 오는 너무 많은 입력이 명확함이 아닌 마비를 만듭니다. 사랑에서 어려운 대화를 더 이상 피할 수 없습니다; 억압했던 문제가 스스로 드러나게 강요하고 있습니다. 다른 사람들의 갈등 중간에 끼어 편을 선택하도록 강요받을 수 있습니다. 직업에서 분석 마비가 실제 결과를 가져옵니다; 너무 오래 미뤄진 결정이 스스로 이루어지며, 종종 나쁘게. 이 카드는 또한 안도를 나타낼 수 있습니다—마침내 선택할 용기를 모으면서 우유부단의 짐이 들립니다. 때때로 결정하지 않는 것이 어떤 잘못된 선택보다 나쁩니다. 눈가리개를 제거하세요. 실제로 앞에 있는 것을 보세요. 그런 다음 어떤 선택도 완벽하지 않지만 선택은 필요하다는 것을 받아들이며 선택하세요.',
      advice: 'The stalemate is breaking. Embrace clarity and decide before circumstances decide for you.',
      adviceKo: '교착 상태가 깨지고 있습니다. 명확함을 받아들이고 상황이 대신 결정하기 전에 결정하세요.'
    }
  },
  {
    id: 52,
    name: 'Three of Swords',
    nameKo: '소드 3',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/52.jpg',
    upright: {
      keywords: ['Heartbreak', 'Sorrow', 'Grief', 'Painful truth', 'Betrayal'],
      keywordsKo: ['상심', '슬픔', '애도', '고통스러운 진실', '배신'],
      meaning: 'The Three of Swords is perhaps the most viscerally painful image in the tarot: a heart pierced by three swords against a stormy sky. This is heartbreak made visible—the agony of betrayal, rejection, loss, or painful truth that cuts to the core. There is no softening this blow; it hurts exactly as much as it looks. Yet within this pain lies necessity: sometimes hearts must break to release what was never meant to be, to make space for something new, to force us to grow. The swords represent words that wound, truths that hurt, or the piercing clarity that comes when denial is no longer possible. In love, this card often signals breakup, betrayal, or devastating disappointment in someone you trusted. The pain is real and must be honored. In career, criticism cuts deep, trust is broken, or you face rejection that feels personal. Yet remember: rain falls, storms pass, hearts heal. This card acknowledges the pain but does not predict permanent damage. Allow yourself to grieve what is lost. The wound will become a scar, and the scar will become wisdom.',
      meaningKo: '소드 3은 아마도 타로에서 가장 본능적으로 고통스러운 이미지입니다: 폭풍 하늘 아래 세 개의 검에 꿰뚫린 심장. 이것은 눈에 보이는 상심입니다—핵심을 베는 배신, 거절, 상실, 또는 고통스러운 진실의 고통. 이 타격을 부드럽게 할 방법은 없습니다; 보이는 그대로 정확히 아픕니다. 하지만 이 고통 안에 필연성이 있습니다: 때때로 심장은 결코 의도되지 않았던 것을 놓고, 새로운 것을 위한 공간을 만들고, 우리를 성장하게 강요하기 위해 깨져야 합니다. 검은 상처 주는 말, 아프게 하는 진실, 또는 부정이 더 이상 불가능할 때 오는 꿰뚫는 명확함을 나타냅니다. 사랑에서 이 카드는 종종 이별, 배신, 또는 신뢰했던 사람에 대한 처참한 실망을 신호합니다. 고통은 진짜이며 존중되어야 합니다. 직업에서 비판이 깊이 상처를 주고, 신뢰가 깨지거나, 개인적으로 느껴지는 거절에 직면합니다. 하지만 기억하세요: 비가 내리고, 폭풍이 지나가고, 심장이 치유됩니다. 이 카드는 고통을 인정하지만 영구적 손상을 예측하지 않습니다. 잃은 것을 애도하세요. 상처가 흉터가 되고, 흉터가 지혜가 될 것입니다.',
      advice: 'Allow the pain to move through you. Grief honored transforms into wisdom.',
      adviceKo: '고통이 당신을 통과하게 하세요. 존중된 슬픔은 지혜로 변합니다.'
    },
    reversed: {
      keywords: ['Releasing pain', 'Optimism', 'Forgiveness', 'Healing', 'Overcoming sorrow'],
      keywordsKo: ['고통 놓기', '낙관', '용서', '치유', '슬픔 극복'],
      meaning: 'The reversed Three of Swords signals the beginning of healing after heartbreak. The swords are being removed from the heart; the storm clouds are parting. You have walked through the worst of the pain and are emerging on the other side. This does not mean forgetting or pretending the hurt did not happen—true healing integrates the experience rather than denying it. Forgiveness becomes possible, whether of others or yourself. The optimism returning is realistic rather than naive; you have learned from this pain and grown stronger. In love, you are ready to open your heart again, or a damaged relationship is beginning to heal through honest communication and renewed commitment. Old heartbreaks release their grip; you stop defining yourself by past wounds. In career, criticism is integrated constructively; setbacks are processed and learned from. Sometimes this card indicates the pain is being suppressed rather than healed—beware of rushing past grief before it has been fully honored. True healing takes time, but it does come. The heart, though scarred, remains capable of love.',
      meaningKo: '역방향 소드 3은 상심 후 치유의 시작을 신호합니다. 검이 심장에서 제거되고 있습니다; 폭풍 구름이 걷히고 있습니다. 고통의 최악을 통과하고 반대편에서 나타나고 있습니다. 이것은 잊거나 상처가 일어나지 않은 척 하는 것을 의미하지 않습니다—진정한 치유는 부정하기보다 경험을 통합합니다. 다른 사람이든 자신이든 용서가 가능해집니다. 돌아오는 낙관은 순진하기보다 현실적입니다; 이 고통에서 배우고 더 강해졌습니다. 사랑에서 다시 마음을 열 준비가 되었거나, 손상된 관계가 정직한 소통과 새로운 헌신을 통해 치유되기 시작합니다. 오래된 상심이 그립을 놓습니다; 과거 상처로 자신을 정의하는 것을 멈춥니다. 직업에서 비판이 건설적으로 통합됩니다; 좌절이 처리되고 배웁니다. 때때로 이 카드는 고통이 치유되기보다 억압되고 있음을 나타냅니다—완전히 존중되기 전에 슬픔을 서둘러 지나치지 않도록 주의하세요. 진정한 치유는 시간이 걸리지만 옵니다. 심장은 흉터가 있어도 사랑할 수 있습니다.',
      advice: 'The swords are being removed. Open your heart to healing and forgiveness.',
      adviceKo: '검이 제거되고 있습니다. 치유와 용서에 마음을 여세요.'
    }
  },
  {
    id: 53,
    name: 'Four of Swords',
    nameKo: '소드 4',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/53.jpg',
    upright: {
      keywords: ['Rest', 'Recuperation', 'Meditation', 'Contemplation', 'A necessary pause'],
      keywordsKo: ['휴식', '회복', '명상', '성찰', '필요한 멈춤'],
      meaning: 'The Four of Swords depicts a knight lying in repose within a church, three swords hanging above and one beneath him. This is sacred rest—not lazy inactivity, but the deep restoration that follows battle. You have been through challenges, and now your mind and body demand recovery. This is not the time to push forward; it is the time to withdraw, reflect, and restore your strength. The church setting suggests sanctuary—a place of safety where you can temporarily set down your swords and find peace. Meditation, contemplation, and quiet solitude serve you now. In love, stepping back provides perspective; sometimes space clarifies what togetherness could not. A period of calm allows wounds to heal and relationship dynamics to settle. In career, pause before the next project; rest prevents burnout; contemplation reveals strategies that action alone cannot. The Four of Swords reminds us that warriors who never rest are eventually defeated by their own exhaustion. Rest is not weakness—it is wisdom. Honor what your body and mind are telling you. The next battle will require your full strength.',
      meaningKo: '소드 4는 교회 안에서 누워 있는 기사를 묘사하며, 세 개의 검이 위에 걸려 있고 하나가 그 아래에 있습니다. 이것은 신성한 휴식입니다—게으른 비활동이 아니라 전투 후의 깊은 회복. 도전을 겪었고, 이제 정신과 몸이 회복을 요구합니다. 앞으로 나아갈 때가 아닙니다; 물러나고, 반성하고, 힘을 회복할 때입니다. 교회 배경은 성역을 암시합니다—일시적으로 검을 내려놓고 평화를 찾을 수 있는 안전한 장소. 명상, 성찰, 조용한 고독이 지금 당신에게 도움이 됩니다. 사랑에서 한 발 물러나면 관점이 생깁니다; 때때로 공간이 함께함이 할 수 없는 것을 명확히 합니다. 평온의 기간이 상처가 치유되고 관계 역학이 안정되게 합니다. 직업에서 다음 프로젝트 전에 멈추세요; 휴식이 번아웃을 예방합니다; 성찰이 행동만으로는 할 수 없는 전략을 드러냅니다. 소드 4는 결코 쉬지 않는 전사는 결국 자신의 탈진으로 패배한다는 것을 상기시킵니다. 휴식은 약함이 아닙니다—지혜입니다. 몸과 마음이 말하는 것을 존중하세요. 다음 전투는 전체 힘을 필요로 합니다.',
      advice: 'Retreat is not defeat. Rest now to fight another day with full strength.',
      adviceKo: '후퇴는 패배가 아닙니다. 지금 쉬어서 다른 날 전력으로 싸우세요.'
    },
    reversed: {
      keywords: ['Exhaustion', 'Burnout', 'Stagnation', 'Resuming activity', 'Forced rest'],
      keywordsKo: ['탈진', '번아웃', '정체', '활동 재개', '강제 휴식'],
      meaning: 'The reversed Four of Swords indicates rest denied, disrupted, or no longer needed. You may be pushing yourself past the point of exhaustion, refusing to take the break your body demands, heading toward burnout or breakdown. The culture of constant productivity has convinced you that rest is weakness, and you are paying the price. Alternatively, you may have rested long enough and it is time to rise—the period of recovery is complete, and continued withdrawal becomes stagnation rather than restoration. In love, restlessness prevents the peace needed to see clearly; or isolation has gone on too long and reconnection is needed. In career, you are either working yourself into the ground or have been inactive so long that momentum is lost. This card asks: are you resting, or are you avoiding? Is your withdrawal healing you, or hiding from challenges you need to face? The knight cannot stay in the church forever. At some point, rest must yield to renewed action. But forced activity before recovery is complete leads only to collapse.',
      meaningKo: '역방향 소드 4는 거부되거나, 방해되거나, 더 이상 필요하지 않은 휴식을 나타냅니다. 탈진 지점을 넘어 밀어붙이고, 몸이 요구하는 휴식을 거부하며, 번아웃이나 붕괴로 향하고 있을 수 있습니다. 끊임없는 생산성의 문화가 휴식은 약함이라고 확신시켰고, 대가를 치르고 있습니다. 또는 충분히 쉬었고 일어날 때입니다—회복 기간이 완료되었고, 계속된 철수는 회복이 아닌 정체가 됩니다. 사랑에서 불안정이 명확히 보는 데 필요한 평화를 막습니다; 또는 고립이 너무 오래 지속되어 재연결이 필요합니다. 직업에서 땅에 묻힐 때까지 일하거나 너무 오래 비활동이어서 추진력을 잃었습니다. 이 카드는 묻습니다: 쉬고 있나요, 아니면 피하고 있나요? 철수가 치유하고 있나요, 아니면 마주해야 할 도전에서 숨고 있나요? 기사는 영원히 교회에 머물 수 없습니다. 어느 시점에서 휴식은 새로운 행동에 양보해야 합니다. 하지만 회복이 완료되기 전 강제된 활동은 붕괴로만 이어집니다.',
      advice: 'Ask yourself honestly: are you healing or hiding? It may be time to rise.',
      adviceKo: '자신에게 정직하게 물어보세요: 치유하고 있나요 아니면 숨고 있나요? 일어날 때일 수 있습니다.'
    }
  },
  {
    id: 54,
    name: 'Five of Swords',
    nameKo: '소드 5',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/54.jpg',
    upright: {
      keywords: ['Conflict', 'Disagreement', 'Competition', 'Defeat', 'A hollow victory'],
      keywordsKo: ['갈등', '불일치', '경쟁', '패배', '공허한 승리'],
      meaning: 'The Five of Swords depicts a figure gathering swords while two others walk away defeated, storm clouds overhead. This is the hollow victory—the win that costs more than it was worth, the argument won but relationship lost, the battle where even the victor limps home wounded. Someone has acted without honor, prioritizing winning over integrity. The defeated figures walk away; they have lost the fight but perhaps preserved something more important. In love, this card warns of conflicts that damage relationships beyond repair—cutting words, betrayals of trust, or the bitter satisfaction of being "right" at the expense of being kind. Sometimes the question is not who won, but whether winning was worth what it cost. In career, office politics may have turned toxic; ambition without ethics creates enemies; or you may be on the losing end of an unfair fight. The Five of Swords asks you to examine your battles: are you fighting for something that matters, or just fighting to win? Some victories aren\'t worth having. Sometimes the wisest choice is to walk away, like the figures in the background, dignity intact.',
      meaningKo: '소드 5는 한 인물이 검을 모으는 동안 다른 두 명이 패배하여 떠나가고, 폭풍 구름이 머리 위에 있는 것을 묘사합니다. 이것은 공허한 승리입니다—가치보다 더 많이 치른 승리, 논쟁에서는 이겼지만 관계를 잃은 것, 승자조차 상처 입고 절뚝이며 집으로 가는 전투. 누군가가 명예 없이 행동했고, 진정성보다 승리를 우선시했습니다. 패배한 인물들이 떠나갑니다; 싸움에서 졌지만 아마도 더 중요한 것을 보존했습니다. 사랑에서 이 카드는 회복할 수 없을 정도로 관계를 손상시키는 갈등을 경고합니다—상처 주는 말, 신뢰의 배신, 또는 친절함 대신 "옳은" 것의 씁쓸한 만족. 때때로 질문은 누가 이겼는지가 아니라, 이기는 것이 그 대가만큼 가치가 있었는지입니다. 직업에서 사무실 정치가 독성이 되었을 수 있습니다; 윤리 없는 야망이 적을 만듭니다; 또는 불공정한 싸움의 지는 편에 있을 수 있습니다. 소드 5는 전투를 살펴보라고 합니다: 중요한 것을 위해 싸우고 있나요, 아니면 그냥 이기려고 싸우나요? 어떤 승리는 가질 가치가 없습니다. 때때로 가장 현명한 선택은 배경의 인물들처럼 품위를 유지하며 떠나는 것입니다.',
      advice: 'Ask yourself: is winning worth the cost? Some battles are better left unfought.',
      adviceKo: '자신에게 물어보세요: 이기는 것이 그 대가만큼 가치가 있나요? 어떤 전투는 싸우지 않는 것이 낫습니다.'
    },
    reversed: {
      keywords: ['Reconciliation', 'Making amends', 'Moving on', 'Forgiveness', 'Past resentment'],
      keywordsKo: ['화해', '보상', '나아감', '용서', '과거 원한'],
      meaning: 'The reversed Five of Swords brings the possibility of reconciliation after conflict. The swords are being returned; wounds are being acknowledged; the possibility of moving forward together becomes real. Perhaps you have recognized that winning at all costs was a mistake. Perhaps the defeated parties are willing to forgive. This card can indicate the humbling experience of apologizing, admitting wrongdoing, or accepting that you were the one who acted without honor. In love, relationships damaged by conflict begin the slow process of rebuilding trust through honest acknowledgment of harm done. Making amends requires vulnerability—something the upright Five of Swords would never allow. In career, workplace conflicts cool down; olive branches are extended; or you choose to leave a toxic situation rather than continue fighting. However, this card can also indicate lingering resentment, conflict that continues under the surface, or the inability to let go of past grievances. True reconciliation requires both parties to release their swords. Some conflicts leave scars that forgiveness cannot fully heal.',
      meaningKo: '역방향 소드 5는 갈등 후 화해의 가능성을 가져옵니다. 검이 반환되고 있습니다; 상처가 인정되고 있습니다; 함께 앞으로 나아갈 가능성이 현실이 됩니다. 아마도 어떤 대가를 치르더라도 이기는 것이 실수였음을 인식했습니다. 아마도 패배한 당사자들이 기꺼이 용서합니다. 이 카드는 사과하고, 잘못을 인정하고, 명예 없이 행동한 사람이 자신이었음을 받아들이는 겸손해지는 경험을 나타낼 수 있습니다. 사랑에서 갈등으로 손상된 관계가 가한 해를 정직하게 인정하며 신뢰를 재건하는 느린 과정을 시작합니다. 보상은 취약성을 필요로 합니다—정방향 소드 5가 결코 허용하지 않을 것입니다. 직업에서 직장 갈등이 식습니다; 올리브 가지가 확장됩니다; 또는 계속 싸우기보다 독성 상황을 떠나기로 선택합니다. 그러나 이 카드는 또한 남아있는 원한, 표면 아래 계속되는 갈등, 또는 과거 불만을 놓지 못함을 나타낼 수 있습니다. 진정한 화해는 양 당사자가 검을 놓아야 합니다. 어떤 갈등은 용서가 완전히 치유할 수 없는 흉터를 남깁니다.',
      advice: 'Lay down your sword. Reconciliation begins when winning stops mattering.',
      adviceKo: '검을 내려놓으세요. 이기는 것이 중요하지 않아질 때 화해가 시작됩니다.'
    }
  },
  {
    id: 55,
    name: 'Six of Swords',
    nameKo: '소드 6',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/55.jpg',
    upright: {
      keywords: ['Transition', 'Moving on', 'Leaving behind', 'A rite of passage', 'Finding peace'],
      keywordsKo: ['전환', '나아감', '뒤로 남김', '통과의례', '평화 찾기'],
      meaning: 'The Six of Swords depicts figures in a boat being ferried from turbulent waters toward a calmer shore, six swords standing upright in the vessel. This is the card of necessary transition—the journey from difficulty toward peace, from what was toward what will be. The passage is not joyful; there is grief in leaving behind, even when what you leave behind was painful. Yet the boat moves steadily forward, guided by a ferryman, carrying you toward smoother waters. Sometimes we must leave to survive; sometimes the kindest thing we can do for ourselves is go. In love, this can indicate leaving a troubled relationship, physically or emotionally moving away from pain, or the transition period after a breakup where healing slowly begins. In career, a change of job, location, or direction takes you away from stressful circumstances toward better opportunities. The Six of Swords reminds us that while we cannot always control what happens to us, we can choose to leave what harms us. The swords in the boat represent lessons learned, memories carried—you do not leave unchanged, but you do leave. Calmer waters await.',
      meaningKo: '소드 6은 보트에 탄 인물들이 격랑하는 물에서 더 잔잔한 해안으로 실려가고, 여섯 개의 검이 배 안에 똑바로 서 있는 것을 묘사합니다. 이것은 필요한 전환의 카드입니다—어려움에서 평화로, 과거에서 미래로의 여정. 그 통과는 기쁘지 않습니다; 떠나온 것이 고통스러웠더라도 뒤에 남기는 것에 슬픔이 있습니다. 하지만 배는 뱃사공의 안내를 받아 꾸준히 앞으로 나아가며, 더 잔잔한 물로 데려갑니다. 때때로 생존하려면 떠나야 합니다; 때때로 자신에게 할 수 있는 가장 친절한 일은 가는 것입니다. 사랑에서 이것은 문제 있는 관계를 떠나거나, 물리적으로 또는 감정적으로 고통에서 멀어지거나, 이별 후 치유가 천천히 시작되는 전환 기간을 나타낼 수 있습니다. 직업에서 직장, 위치, 또는 방향의 변화가 스트레스 많은 상황에서 더 나은 기회로 데려갑니다. 소드 6은 우리에게 일어나는 일을 항상 통제할 수는 없지만, 해치는 것을 떠나기로 선택할 수 있다는 것을 상기시킵니다. 보트의 검은 배운 교훈, 가져가는 기억을 나타냅니다—변하지 않고 떠나지 않지만, 떠납니다. 더 잔잔한 물이 기다립니다.',
      advice: 'Trust the journey. Leaving is not giving up—it is choosing peace.',
      adviceKo: '여정을 믿으세요. 떠나는 것은 포기가 아닙니다—평화를 선택하는 것입니다.'
    },
    reversed: {
      keywords: ['Emotional baggage', 'Unfinished business', 'Resistance to change', 'Feeling stuck', 'Returning to trouble'],
      keywordsKo: ['감정적 짐', '미완의 일', '변화 저항', '갇힌 느낌', '문제로 돌아감'],
      meaning: 'The reversed Six of Swords indicates a transition blocked, delayed, or reversed. The boat cannot leave the troubled waters—whether because you refuse to board, the weather is too dangerous, or invisible chains hold you to the shore. You may be carrying so much emotional baggage that the boat would sink, clinging to what you need to leave behind, or returning to a situation you had escaped. In love, you may be unable to move on from a past relationship, drawn back to an ex, or trapped in patterns you recognize as harmful but cannot seem to break. The transition you need feels impossible. In career, attempts to leave a bad situation keep failing; you feel stuck despite knowing you need change. This card can also indicate returning to troubled waters after a period of peace—falling back into old patterns, revisiting old pain, or choosing the familiar devil over the unknown angel. Ask yourself: what keeps you from boarding the boat? What would you have to release to make the crossing? Sometimes we must let go of heavy swords to keep the vessel afloat.',
      meaningKo: '역방향 소드 6은 막히거나, 지연되거나, 역전된 전환을 나타냅니다. 배가 격랑하는 물을 떠날 수 없습니다—승선을 거부하거나, 날씨가 너무 위험하거나, 보이지 않는 사슬이 해안에 붙잡고 있기 때문입니다. 배가 가라앉을 정도로 많은 감정적 짐을 지고 있거나, 뒤에 남겨야 할 것에 집착하거나, 탈출했던 상황으로 돌아가고 있을 수 있습니다. 사랑에서 과거 관계에서 나아가지 못하거나, 전 애인에게 이끌리거나, 해롭다고 인식하지만 깨지 못하는 패턴에 갇힐 수 있습니다. 필요한 전환이 불가능하게 느껴집니다. 직업에서 나쁜 상황을 떠나려는 시도가 계속 실패합니다; 변화가 필요하다는 것을 알면서도 갇힌 느낌입니다. 이 카드는 또한 평화의 기간 후 격랑하는 물로 돌아가는 것을 나타낼 수 있습니다—오래된 패턴으로 돌아가거나, 오래된 고통을 다시 방문하거나, 알려지지 않은 천사보다 익숙한 악마를 선택하는 것. 자신에게 물어보세요: 무엇이 배에 타는 것을 막나요? 건너가려면 무엇을 놓아야 하나요? 때때로 배를 띄우려면 무거운 검을 놓아야 합니다.',
      advice: 'What are you clinging to? Sometimes you must drop the weight to board the boat.',
      adviceKo: '무엇에 집착하고 있나요? 때로는 배에 타려면 무게를 내려놓아야 합니다.'
    }
  },
  {
    id: 56,
    name: 'Seven of Swords',
    nameKo: '소드 7',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/56.jpg',
    upright: {
      keywords: ['Betrayal', 'Deception', 'Getting away with something', 'Theft', 'Strategy'],
      keywordsKo: ['배신', '속임', '벗어남', '도둑질', '전략'],
      meaning: 'The Seven of Swords shows a figure sneaking away from a camp with five swords, leaving two behind, glancing back to see if anyone has noticed. This is the card of deception, stealth, and getting away with something—but also of strategic thinking when direct confrontation would fail. Someone is not being honest. It might be you, acting in secret to achieve a goal you could not reach openly. It might be someone deceiving you, working behind your back, taking what is not theirs to take. Not all the swords can be carried; something will be left behind; the theft is incomplete. In love, beware of dishonesty—whether discovering your partner\'s secrets or recognizing your own deceptive behavior. Infidelity, hidden agendas, or the slow erosion of trust through small lies may be indicated. In career, someone may be taking credit for your work, sabotaging from the shadows, or acting unethically to advance. Sometimes this card represents necessary cunning—using strategy and timing rather than brute force. But examine your methods: can you look in the mirror and respect who you see? The figure glances back because he knows what he does is wrong.',
      meaningKo: '소드 7은 한 인물이 진영에서 다섯 개의 검을 들고 몰래 빠져나가며 두 개를 남기고, 누군가 알아챘는지 뒤를 돌아보는 것을 보여줍니다. 이것은 속임, 은밀함, 무언가를 벗어남의 카드입니다—하지만 직접 대립이 실패할 때 전략적 사고이기도 합니다. 누군가가 정직하지 않습니다. 공개적으로 도달할 수 없는 목표를 달성하기 위해 비밀리에 행동하는 당신일 수 있습니다. 당신을 속이고, 뒤에서 일하고, 자신의 것이 아닌 것을 가져가는 누군가일 수 있습니다. 모든 검을 가져갈 수 없습니다; 무언가가 남겨질 것입니다; 도둑질은 불완전합니다. 사랑에서 불정직에 주의하세요—파트너의 비밀을 발견하든 자신의 기만적 행동을 인식하든. 불륜, 숨겨진 의도, 또는 작은 거짓말을 통한 신뢰의 느린 침식이 나타날 수 있습니다. 직업에서 누군가가 당신의 일에 대한 공로를 가져가거나, 그림자에서 방해하거나, 승진하기 위해 비윤리적으로 행동할 수 있습니다. 때때로 이 카드는 필요한 교활함을 나타냅니다—무력이 아닌 전략과 타이밍을 사용하는 것. 하지만 방법을 살펴보세요: 거울을 보고 보이는 사람을 존경할 수 있나요? 그 인물은 자신이 하는 일이 잘못됐다는 것을 알기에 뒤를 돌아봅니다.',
      advice: 'Examine your methods. Can you respect who you see in the mirror?',
      adviceKo: '방법을 살펴보세요. 거울에 보이는 자신을 존경할 수 있나요?'
    },
    reversed: {
      keywords: ['Confession', 'Getting caught', 'Conscience', 'Facing the truth', 'Returning stolen goods'],
      keywordsKo: ['고백', '들킴', '양심', '진실 마주', '돌려줌'],
      meaning: 'The reversed Seven of Swords indicates that secrets are coming to light—the thief is caught, the deception is exposed, the truth can no longer be hidden. If you have been the one acting dishonestly, prepare to face consequences; the backward glance has become a full discovery. This can be liberating—the burden of maintaining lies is exhausting, and confession, though painful, brings relief. Alternatively, this card can indicate choosing honesty over manipulation, returning what was taken, or coming clean about past deception. Conscience wins over cunning. In love, hidden truths emerge; affairs are discovered; or you finally tell the truth you have been hiding. The relationship will either end or be rebuilt on honesty. In career, unethical behavior is exposed; credit is rightfully restored; or you decide that integrity matters more than advantage. Sometimes the reversal indicates someone else\'s deception being revealed—you discover you have been played, and now you must decide what to do with that knowledge. The swords are being returned. What was taken in darkness must be accounted for in light.',
      meaningKo: '역방향 소드 7은 비밀이 밝혀지고 있음을 나타냅니다—도둑이 잡히고, 속임이 노출되고, 진실이 더 이상 숨겨질 수 없습니다. 부정직하게 행동한 사람이었다면 결과에 직면할 준비를 하세요; 뒤돌아봄이 완전한 발각이 되었습니다. 이것은 해방적일 수 있습니다—거짓을 유지하는 짐은 지치게 하고, 고백은 고통스럽지만 안도를 가져옵니다. 또는 이 카드는 조종보다 정직을 선택하고, 가져간 것을 돌려주거나, 과거 속임에 대해 깨끗이 말하는 것을 나타낼 수 있습니다. 양심이 교활함을 이깁니다. 사랑에서 숨겨진 진실이 나타납니다; 불륜이 발견됩니다; 또는 마침내 숨기고 있던 진실을 말합니다. 관계는 끝나거나 정직 위에 재건될 것입니다. 직업에서 비윤리적 행동이 노출됩니다; 공로가 정당하게 회복됩니다; 또는 진정성이 이점보다 중요하다고 결정합니다. 때때로 역방향은 다른 사람의 속임이 드러남을 나타냅니다—속았다는 것을 발견하고, 이제 그 지식으로 무엇을 할지 결정해야 합니다. 검이 반환되고 있습니다. 어둠에서 취한 것은 빛에서 책임져야 합니다.',
      advice: 'Truth liberates. Return what was taken and let conscience lead.',
      adviceKo: '진실은 해방시킵니다. 가져간 것을 돌려주고 양심이 이끌게 하세요.'
    }
  },
  {
    id: 57,
    name: 'Eight of Swords',
    nameKo: '소드 8',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/57.jpg',
    upright: {
      keywords: ['Feeling trapped', 'Imprisonment', 'Limiting beliefs', 'Victim mentality', 'Restriction'],
      keywordsKo: ['갇힌 느낌', '구속', '제한적 믿음', '피해자 심리', '제한'],
      meaning: 'The Eight of Swords shows a blindfolded and bound figure surrounded by eight swords, standing in muddy water, a castle visible in the distance. This is the card of mental imprisonment—feeling trapped by circumstances that, upon closer examination, are not as inescapable as they seem. The bindings are loose; the swords do not form a complete cage; the figure could walk away if only she could see this. But the blindfold prevents vision, and without vision, she believes she is trapped. Your prison is made of thoughts, not walls. Limiting beliefs, self-doubt, fear, and overthinking have convinced you that you have no options when options exist all around you. In love, you may feel trapped in a relationship you could leave, or paralyzed by fear of rejection that prevents connection. In career, you believe you have no choices when in fact you are simply afraid to make them. The Eight of Swords asks you to examine what you truly cannot change versus what you have only convinced yourself is unchangeable. Remove the blindfold. The path out has been there all along.',
      meaningKo: '소드 8은 눈을 가리고 묶인 인물이 여덟 개의 검에 둘러싸여 진흙탕 물에 서 있고, 멀리 성이 보이는 것을 보여줍니다. 이것은 정신적 감금의 카드입니다—더 자세히 살펴보면 보이는 것만큼 피할 수 없지 않은 상황에 갇힌 느낌. 구속은 느슨합니다; 검이 완전한 우리를 형성하지 않습니다; 그녀가 이것을 볼 수만 있다면 걸어 나갈 수 있습니다. 하지만 눈가리개가 시야를 막고, 시야 없이 그녀는 갇혔다고 믿습니다. 당신의 감옥은 벽이 아닌 생각으로 만들어졌습니다. 제한적 믿음, 자기 의심, 두려움, 과잉 사고가 옵션이 주변에 있는데 옵션이 없다고 확신시켰습니다. 사랑에서 떠날 수 있는 관계에 갇혔다고 느끼거나, 연결을 막는 거절의 두려움에 마비될 수 있습니다. 직업에서 실제로는 단순히 선택하는 것이 두려울 때 선택이 없다고 믿습니다. 소드 8은 진정으로 바꿀 수 없는 것과 바꿀 수 없다고 스스로를 확신시킨 것을 살펴보라고 합니다. 눈가리개를 벗으세요. 나가는 길은 줄곧 거기 있었습니다.',
      advice: 'Your prison is made of thoughts, not walls. Remove the blindfold—the path out is there.',
      adviceKo: '감옥은 벽이 아닌 생각으로 만들어졌습니다. 눈가리개를 벗으세요—나가는 길이 거기 있습니다.'
    },
    reversed: {
      keywords: ['Breaking free', 'Release', 'Finding solutions', 'New perspective', 'Taking control'],
      keywordsKo: ['자유로워짐', '해방', '해결책 찾기', '새 관점', '통제권 잡기'],
      meaning: 'The reversed Eight of Swords signals liberation from self-imposed limitations. The blindfold is coming off; you are beginning to see options you believed did not exist; the cage of your own making is dissolving. This freedom may come through therapy, a shift in perspective, a breakthrough in self-understanding, or simply the exhaustion of maintaining beliefs that were never true. You realize you have agency. The ropes were never as tight as they felt. In love, you break free from patterns that kept you trapped—leaving a bad relationship, finally allowing yourself to be loved, or releasing fear that blocked connection. In career, you see past limiting beliefs about what you can achieve; you take action despite fear; you recognize that the prison was internal. This card celebrates the moment of liberation when you realize you were never as trapped as you thought. The swords remain, but they no longer fence you in. You are not a victim of circumstance—you are the author of your own freedom.',
      meaningKo: '역방향 소드 8은 자기 부과된 제한으로부터의 해방을 신호합니다. 눈가리개가 벗겨지고 있습니다; 존재하지 않는다고 믿었던 옵션을 보기 시작합니다; 스스로 만든 우리가 녹아내리고 있습니다. 이 자유는 치료, 관점의 전환, 자기 이해의 돌파구, 또는 단순히 결코 진실이 아니었던 믿음을 유지하는 것의 지침을 통해 올 수 있습니다. 당신에게 주체성이 있다는 것을 깨닫습니다. 밧줄은 결코 느껴진 것만큼 팽팽하지 않았습니다. 사랑에서 갇혀 있게 한 패턴에서 벗어납니다—나쁜 관계를 떠나거나, 마침내 사랑받도록 허용하거나, 연결을 막은 두려움을 놓습니다. 직업에서 달성할 수 있는 것에 대한 제한적 믿음을 넘어 봅니다; 두려움에도 불구하고 행동합니다; 감옥이 내면에 있었음을 인식합니다. 이 카드는 생각했던 것만큼 갇히지 않았다는 것을 깨닫는 해방의 순간을 축하합니다. 검은 남아 있지만 더 이상 당신을 가두지 않습니다. 당신은 상황의 희생자가 아닙니다—자신의 자유의 저자입니다.',
      advice: 'You are the author of your own freedom. The swords no longer fence you in.',
      adviceKo: '당신은 자신의 자유의 저자입니다. 검은 더 이상 당신을 가두지 않습니다.'
    }
  },
  {
    id: 58,
    name: 'Nine of Swords',
    nameKo: '소드 9',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/58.jpg',
    upright: {
      keywords: ['Anxiety', 'Worry', 'Fear', 'Depression', 'Nightmares'],
      keywordsKo: ['불안', '걱정', '두려움', '우울', '악몽'],
      meaning: 'The Nine of Swords depicts a figure sitting up in bed in the darkest hour of night, head in hands, nine swords hanging ominously on the wall behind. This is the card of 3 AM anxiety—the racing thoughts that won\'t let you sleep, the fears that loom larger in darkness. The nightmares here may be literal or metaphorical: replaying past regrets, imagining future catastrophes, or drowning in present worries. Yet notice—the swords don\'t touch the figure. The suffering is real, but it\'s mental suffering, often amplified beyond the actual threat. This card validates your pain while gently reminding you that perspective shifts with daylight. In love, obsessive worry about the relationship may be creating problems where none exist. In career, anxiety about failure may be more paralyzing than actual obstacles. The first step is acknowledging the fear, then asking: what\'s real, and what has my mind constructed?',
      meaningKo: '소드 9은 가장 어두운 밤 시간에 침대에 앉아 머리를 손에 묻은 인물을 묘사하며, 뒤 벽에 아홉 개의 검이 불길하게 걸려 있습니다. 이것은 새벽 3시 불안의 카드입니다—잠들지 못하게 하는 질주하는 생각들, 어둠 속에서 더 크게 보이는 두려움들. 여기서의 악몽은 문자 그대로일 수도 있고 은유적일 수도 있습니다: 과거의 후회를 반복 재생하거나, 미래의 재앙을 상상하거나, 현재의 걱정에 빠져 있습니다. 하지만 주목하세요—검들은 인물을 건드리지 않습니다. 고통은 실제이지만, 정신적 고통이며 종종 실제 위협을 넘어 증폭됩니다. 이 카드는 당신의 고통을 인정하면서도 시각이 낮과 함께 바뀐다는 것을 부드럽게 상기시킵니다. 사랑에서 관계에 대한 강박적 걱정이 존재하지 않는 문제를 만들 수 있습니다. 직업에서 실패에 대한 불안이 실제 장애물보다 더 마비시킬 수 있습니다. 첫 번째 단계는 두려움을 인정하고, 무엇이 실제이고 무엇을 마음이 구성한 것인지 묻는 것입니다.',
      advice: 'Notice the swords do not touch you. What is real versus what has your mind constructed?',
      adviceKo: '검들이 당신을 건드리지 않는 것을 주목하세요. 무엇이 실제이고 무엇을 마음이 구성한 것인가요?'
    },
    reversed: {
      keywords: ['Hope', 'Reaching out for help', 'Recovery', 'Facing fears', 'Finding solutions'],
      keywordsKo: ['희망', '도움 요청', '회복', '두려움 마주', '해결책 찾기'],
      meaning: 'The reversed Nine of Swords brings the first light of dawn after the long dark night—relief is coming, whether through releasing irrational fears, seeking help, or simply realizing things aren\'t as bad as you imagined. Perhaps you\'ve finally spoken your fears aloud and discovered they lost power in the speaking. Maybe therapy, medication, meditation, or confiding in a friend has begun to quiet the anxious mind. The nightmares are fading. However, this reversal can also indicate suppressing anxiety rather than processing it, or fears that have become so chronic they\'ve numbed you. Alternatively, it may suggest the anxiety is actually worsening, becoming overwhelming. In love, you\'re learning to separate genuine concerns from anxiety-driven catastrophizing. In career, perspective is returning—the situation has solutions, and you\'re beginning to see them. The message is hope: you\'ve survived every sleepless night so far, and dawn always comes.',
      meaningKo: '역방향 소드 9은 긴 어두운 밤 후 첫 새벽 빛을 가져옵니다—비합리적 두려움을 놓거나, 도움을 구하거나, 상황이 상상만큼 나쁘지 않다는 것을 깨달으면서 안도가 오고 있습니다. 아마도 마침내 두려움을 소리 내어 말하고 그것이 말하는 과정에서 힘을 잃었다는 것을 발견했을 것입니다. 치료, 약물, 명상, 또는 친구에게 털어놓는 것이 불안한 마음을 조용하게 하기 시작했을 수 있습니다. 악몽이 사라지고 있습니다. 그러나 이 역방향은 불안을 처리하기보다 억압하거나, 두려움이 만성화되어 무감각해진 것을 나타낼 수도 있습니다. 또는 불안이 실제로 악화되어 압도적이 되고 있음을 시사할 수 있습니다. 사랑에서 진정한 우려와 불안이 만든 재앙 시나리오를 분리하는 것을 배우고 있습니다. 직업에서 관점이 돌아오고 있습니다—상황에는 해결책이 있고, 보기 시작하고 있습니다. 메시지는 희망입니다: 지금까지 모든 잠 못 이루는 밤을 견뎌왔고, 새벽은 항상 옵니다.',
      advice: 'Dawn always comes. You have survived every sleepless night so far.',
      adviceKo: '새벽은 항상 옵니다. 지금까지 모든 잠 못 이루는 밤을 견뎌왔습니다.'
    }
  },
  {
    id: 59,
    name: 'Ten of Swords',
    nameKo: '소드 10',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/59.jpg',
    upright: {
      keywords: ['Painful endings', 'Betrayal', 'Rock bottom', 'Defeat', 'Loss'],
      keywordsKo: ['고통스러운 끝', '배신', '바닥', '패배', '상실'],
      meaning: 'The Ten of Swords shows a figure lying face down with ten swords piercing their back—the most dramatic image in the deck. This is the card of complete defeat, betrayal, and hitting absolute rock bottom. There\'s no sugarcoating here: something has ended, painfully and definitively. Perhaps you\'ve been backstabbed, experienced a devastating loss, or watched something you cared about utterly fail. The overkill of ten swords suggests the pain may even feel excessive—why did it have to be this bad? Yet notice the dawn breaking on the horizon. This card\'s hidden blessing is finality: the worst has happened, meaning it can\'t get worse. The only direction from here is up. In love, a relationship may have ended through betrayal or simply run its painful course. In career, a project, job, or dream has failed completely. The message is not to fight—accept the ending, grieve fully, and know that from these ashes, something new will rise. Sometimes we must hit bottom to find solid ground.',
      meaningKo: '소드 10은 등에 열 개의 검이 꽂힌 채 엎드려 있는 인물을 보여줍니다—덱에서 가장 극적인 이미지입니다. 이것은 완전한 패배, 배신, 그리고 절대적인 바닥을 치는 카드입니다. 여기서는 미화가 없습니다: 무언가가 고통스럽고 결정적으로 끝났습니다. 아마도 등 뒤에서 칼을 맞았거나, 파괴적인 상실을 경험했거나, 소중히 여기던 것이 완전히 실패하는 것을 지켜봤을 것입니다. 열 개 검의 과잉은 고통이 과도하게 느껴질 수 있음을 시사합니다—왜 이렇게 나빠야 했을까요? 하지만 지평선에서 새벽이 밝아오는 것을 주목하세요. 이 카드의 숨겨진 축복은 종결성입니다: 최악이 일어났으므로 더 나빠질 수 없습니다. 여기서의 유일한 방향은 위입니다. 사랑에서 관계가 배신이나 고통스러운 과정을 통해 끝났을 수 있습니다. 직업에서 프로젝트, 직장, 또는 꿈이 완전히 실패했습니다. 메시지는 싸우지 말라는 것입니다—끝을 받아들이고, 충분히 슬퍼하고, 이 재로부터 새로운 것이 솟아오를 것을 알아야 합니다. 때로는 바닥을 쳐야 단단한 땅을 찾을 수 있습니다.',
      advice: 'The only direction from here is up. From these ashes, something new will rise.',
      adviceKo: '여기서의 유일한 방향은 위입니다. 이 재로부터 새로운 것이 솟아오를 것입니다.'
    },
    reversed: {
      keywords: ['Recovery', 'Resurrection', 'Healing', 'Resisting the end', 'A close call'],
      keywordsKo: ['회복', '부활', '치유', '끝 저항', '구사일생'],
      meaning: 'The reversed Ten of Swords begins the journey of resurrection. You are pulling the swords from your back one by one, standing up from what should have destroyed you. The worst is truly over—healing has begun, however slowly. This card can represent survival against the odds, a close call that taught you something vital, or the first signs of recovery after devastating loss. The dawn that was breaking is now your daylight. However, the reversal can also indicate refusal to accept that something has ended—playing dead doesn\'t mean death, and sometimes we lie in defeat longer than necessary because we fear what rising requires. It may also suggest ongoing pain, an ending that keeps dragging on instead of completing cleanly. In love, you\'re healing from heartbreak or realizing a relationship wasn\'t as dead as it seemed. In career, a failed venture is being resurrected, or you\'re finally moving on from professional betrayal. The key is knowing when to stay down and heal versus when it\'s time to rise.',
      meaningKo: '역방향 소드 10은 부활의 여정을 시작합니다. 등에서 검을 하나씩 빼며, 당신을 파괴했어야 할 것으로부터 일어서고 있습니다. 최악은 진정으로 끝났습니다—치유가 시작되었습니다, 아무리 천천히라도. 이 카드는 역경에도 불구하고 생존하거나, 중요한 것을 가르쳐준 구사일생, 또는 파괴적인 상실 후 첫 회복의 징후를 나타낼 수 있습니다. 밝아오던 새벽이 이제 당신의 낮입니다. 그러나 역방향은 무언가가 끝났음을 받아들이기를 거부하는 것을 나타낼 수도 있습니다—죽은 척하는 것은 죽음을 의미하지 않으며, 때로는 일어서는 것이 요구하는 것을 두려워하기 때문에 필요 이상으로 패배 속에 누워 있습니다. 깔끔하게 완료되지 않고 계속 질질 끄는 끝을 시사할 수도 있습니다. 사랑에서 심적 상처에서 치유되고 있거나 관계가 보이는 것만큼 죽지 않았음을 깨닫고 있습니다. 직업에서 실패한 사업이 부활하고 있거나, 마침내 직업적 배신에서 넘어가고 있습니다. 핵심은 언제 누워서 치유할지와 언제 일어설 시간인지를 아는 것입니다.',
      advice: 'You are pulling the swords out, rising. Know when to heal and when to rise.',
      adviceKo: '검을 빼내며 일어서고 있습니다. 언제 치유하고 언제 일어설지를 알아야 합니다.'
    }
  },
  {
    id: 60,
    name: 'Page of Swords',
    nameKo: '소드 시종',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/60.jpg',
    upright: {
      keywords: ['Curiosity', 'New ideas', 'Truthful', 'Energetic', 'A messenger'],
      keywordsKo: ['호기심', '새 아이디어', '정직', '활력', '메신저'],
      meaning: 'The Page of Swords stands windswept on high ground, sword raised, scanning the horizon with sharp, eager eyes. This youthful figure represents the beginner\'s mind approaching the realm of intellect—curious about everything, eager to learn, quick to speak. The Page brings news, ideas, and mental stimulation. They are the student discovering a passion for learning, the journalist chasing truth, the person asking questions others don\'t dare ask. There\'s restless mental energy here—a mind that won\'t stop turning, words that tumble out before being fully considered. In love, this card may represent someone who communicates openly (perhaps too openly), a relationship beginning with intellectual connection, or the need to speak truths in your current relationship. In career, you\'re learning new skills, gathering information, or bringing fresh perspectives to stale situations. The Page reminds you to stay curious and truthful, but also to think before speaking—the sword is sharp, and words can cut.',
      meaningKo: '소드 시종은 바람이 몰아치는 높은 땅에 서서 검을 들고, 날카롭고 열정적인 눈으로 지평선을 살피고 있습니다. 이 젊은 인물은 지성의 영역에 접근하는 초심자의 마음을 나타냅니다—모든 것에 호기심을 갖고, 배우기를 열망하며, 말하기를 서두릅니다. 시종은 소식, 아이디어, 정신적 자극을 가져옵니다. 그들은 학습에 대한 열정을 발견하는 학생, 진실을 쫓는 기자, 다른 사람들이 감히 묻지 않는 질문을 하는 사람입니다. 여기에는 불안한 정신적 에너지가 있습니다—멈추지 않는 마음, 충분히 고려되기 전에 쏟아져 나오는 말들. 사랑에서 이 카드는 공개적으로(아마도 너무 공개적으로) 소통하는 사람, 지적 연결로 시작하는 관계, 또는 현재 관계에서 진실을 말할 필요를 나타낼 수 있습니다. 직업에서 새로운 기술을 배우거나, 정보를 수집하거나, 낡은 상황에 신선한 관점을 가져오고 있습니다. 시종은 호기심을 유지하고 진실하게 되라고 상기시키지만, 말하기 전에 생각하라고도 합니다—검은 날카롭고, 말은 자를 수 있습니다.',
      advice: 'Stay curious and truthful. Think before speaking—words can cut.',
      adviceKo: '호기심과 진실함을 유지하세요. 말하기 전에 생각하세요—말은 자를 수 있습니다.'
    },
    reversed: {
      keywords: ['Gossip', 'Deception', 'Scattered energy', 'Sarcasm', 'Thoughtless words'],
      keywordsKo: ['험담', '속임', '산만한 에너지', '빈정거림', '생각 없는 말'],
      meaning: 'The reversed Page of Swords represents mental energy gone awry—the curious mind turned toward gossip, the sharp tongue used for harm, the restless intellect scattered across too many pursuits. This Page may speak without thinking, spread rumors, or use their cleverness to deceive. There\'s a tendency toward cynicism, sarcasm that wounds rather than amuses, and communication that confuses rather than clarifies. Perhaps you\'re all talk and no action, full of ideas that never become reality. Or you may be dealing with someone who cannot be trusted to keep secrets or speak truth. In love, hurtful words are flying, or someone is being deceptive. Arguments may be pointless, circular, or deliberately provocative. In career, there\'s miscommunication, broken agreements, or ideas that lack follow-through. The card warns against defensive criticism and asks you to examine whether your words are building or destroying. Intelligence without wisdom can be dangerous.',
      meaningKo: '역방향 소드 시종은 빗나간 정신적 에너지를 나타냅니다—험담으로 향한 호기심 많은 마음, 해를 끼치는 데 사용되는 날카로운 혀, 너무 많은 추구로 흩어진 불안한 지성. 이 시종은 생각 없이 말하거나, 소문을 퍼뜨리거나, 영리함을 속이는 데 사용할 수 있습니다. 냉소주의로의 경향, 즐겁게 하기보다 상처를 주는 빈정거림, 명확히 하기보다 혼란시키는 소통이 있습니다. 아마도 말만 많고 행동이 없거나, 결코 현실이 되지 않는 아이디어로 가득 차 있을 수 있습니다. 또는 비밀을 지키거나 진실을 말하는 것을 믿을 수 없는 사람을 상대하고 있을 수 있습니다. 사랑에서 상처 주는 말이 날아다니거나 누군가 기만적입니다. 논쟁이 무의미하거나, 순환적이거나, 의도적으로 도발적일 수 있습니다. 직업에서 의사소통 오류, 깨진 합의, 또는 후속 조치가 없는 아이디어가 있습니다. 카드는 방어적 비판을 경고하고 당신의 말이 건설적인지 파괴적인지 검토하라고 합니다. 지혜 없는 지능은 위험할 수 있습니다.',
      advice: 'Are your words building or destroying? Intelligence without wisdom is dangerous.',
      adviceKo: '당신의 말이 건설적인가요 아니면 파괴적인가요? 지혜 없는 지능은 위험합니다.'
    }
  },
  {
    id: 61,
    name: 'Knight of Swords',
    nameKo: '소드 기사',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/61.jpg',
    upright: {
      keywords: ['Ambitious', 'Action-oriented', 'Fast-thinking', 'Assertive', 'Driven'],
      keywordsKo: ['야심', '행동 지향', '빠른 사고', '단호함', '추진력'],
      meaning: 'The Knight of Swords charges across the field at full gallop, sword raised, eyes fixed on the target—the fastest, most focused knight in the deck. This is the mind in pursuit mode: ambitious, driven, unstoppable. When this knight appears, action is imminent and swift. Ideas that have been brewing will suddenly surge into execution. Debate becomes decisive. Hesitation is overridden by determination. This knight represents the champion of truth, the advocate for change, the force that cuts through obstacles with sheer intellectual will. They speak directly, think quickly, and never back down from a challenge. In love, this may indicate someone who pursues what they want intensely, or the need to have a direct, honest conversation even if it\'s uncomfortable. In career, you\'re ready to charge toward your goals—apply for that position, pitch that idea, confront that problem. The Knight\'s message is clear: act now, act decisively, and don\'t let fear slow you down. Just remember to steer.',
      meaningKo: '소드 기사는 검을 들고 전장을 전속력으로 달려갑니다, 목표에 눈을 고정하고—덱에서 가장 빠르고 집중된 기사입니다. 이것은 추구 모드의 마음입니다: 야심차고, 추진력 있고, 멈출 수 없습니다. 이 기사가 나타나면 행동이 임박하고 신속합니다. 품고 있던 아이디어가 갑자기 실행으로 급등합니다. 토론이 결정적이 됩니다. 망설임이 결단력에 의해 무효화됩니다. 이 기사는 진실의 챔피언, 변화의 옹호자, 순수한 지적 의지로 장애물을 자르는 힘을 나타냅니다. 그들은 직접적으로 말하고, 빠르게 생각하며, 도전에서 결코 물러서지 않습니다. 사랑에서 이것은 원하는 것을 강렬하게 추구하는 사람, 또는 불편하더라도 직접적이고 정직한 대화가 필요함을 나타낼 수 있습니다. 직업에서 목표를 향해 돌진할 준비가 되었습니다—그 자리에 지원하고, 그 아이디어를 제안하고, 그 문제에 직면하세요. 기사의 메시지는 분명합니다: 지금 행동하고, 결정적으로 행동하고, 두려움이 속도를 늦추지 않게 하세요. 다만 방향을 조종하는 것을 기억하세요.',
      advice: 'Act now, act decisively. Do not let fear slow you down—but remember to steer.',
      adviceKo: '지금 행동하고, 결정적으로 행동하세요. 두려움이 속도를 늦추지 않게 하세요—다만 방향을 조종하는 것을 기억하세요.'
    },
    reversed: {
      keywords: ['Reckless', 'Hasty', 'Arrogant', 'Aggressive', 'Thoughtless action'],
      keywordsKo: ['무모함', '성급함', '오만', '공격적', '생각 없는 행동'],
      meaning: 'The reversed Knight of Swords warns of momentum without direction—the charge continues, but the horse has no reins. This knight\'s drive has become recklessness, their directness aggression, their confidence arrogance. Words are spoken that cannot be taken back. Actions are taken without considering consequences. The need to be right overrides the ability to listen. You may be rushing into situations unprepared, picking fights that don\'t need to be fought, or steamrolling over others in pursuit of your goals. Alternatively, this reversal can indicate a knight who won\'t charge at all—someone whose mental energy has stalled, who hesitates when they should act, or whose ambition has lost its edge. In love, arguments escalate unnecessarily, or someone is being verbally aggressive and inconsiderate. In career, haste leads to mistakes, or you\'re alienating colleagues with combative behavior. The message is to slow down, think before speaking, and ask whether you\'re fighting for something worthwhile or just fighting.',
      meaningKo: '역방향 소드 기사는 방향 없는 추진력을 경고합니다—돌진은 계속되지만, 말에 고삐가 없습니다. 이 기사의 추진력이 무모함이 되었고, 직접성이 공격성이 되었고, 자신감이 오만이 되었습니다. 취소할 수 없는 말이 나옵니다. 결과를 고려하지 않은 행동을 합니다. 옳다는 필요가 듣는 능력을 무효화합니다. 준비 없이 상황에 돌진하거나, 싸울 필요 없는 싸움을 걸거나, 목표를 추구하면서 다른 사람들을 짓밟고 있을 수 있습니다. 또는 이 역방향은 전혀 돌진하지 않는 기사를 나타낼 수 있습니다—정신적 에너지가 정체된 사람, 행동해야 할 때 망설이는 사람, 또는 야망이 날카로움을 잃은 사람. 사랑에서 논쟁이 불필요하게 격화되거나, 누군가 언어적으로 공격적이고 배려 없습니다. 직업에서 성급함이 실수로 이어지거나, 전투적 행동으로 동료들을 멀리하고 있습니다. 메시지는 속도를 늦추고, 말하기 전에 생각하고, 가치 있는 것을 위해 싸우는지 아니면 그냥 싸우는지 묻는 것입니다.',
      advice: 'Slow down. Are you fighting for something worthwhile, or just fighting?',
      adviceKo: '속도를 늦추세요. 가치 있는 것을 위해 싸우고 있나요, 아니면 그냥 싸우나요?'
    }
  },
  {
    id: 62,
    name: 'Queen of Swords',
    nameKo: '소드 여왕',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/62.jpg',
    upright: {
      keywords: ['Independent', 'Unbiased judgment', 'Clear boundaries', 'Intelligent', 'Honest'],
      keywordsKo: ['독립적', '공정한 판단', '명확한 경계', '지적', '정직'],
      meaning: 'The Queen of Swords sits upon her throne facing forward, sword raised, her expression one of clear-eyed wisdom earned through experience—often painful experience. This queen has known sorrow; she has loved and lost, been betrayed, weathered storms. But rather than becoming bitter, she has transformed pain into wisdom. Her clear boundaries and honest communication come from knowing her own worth and refusing to be deceived again. She cuts through illusion with the precision of a surgeon: kind when possible, ruthlessly honest when necessary. This queen represents the divorced mother who rebuilt her life, the woman who chose independence over comfort, anyone who values truth over pleasant lies. In love, she offers clarity rather than romantic fantasy—she sees people as they are, not as she wishes them to be. In career, she represents fair judgment, professional boundaries, and the ability to make tough decisions without letting emotion cloud reason. Her wisdom: protect your peace, speak your truth, and never apologize for your standards.',
      meaningKo: '소드 여왕은 왕좌에 앉아 정면을 바라보며 검을 들고, 경험을 통해—종종 고통스러운 경험을 통해—얻은 명확한 지혜의 표정을 짓고 있습니다. 이 여왕은 슬픔을 알고 있습니다; 사랑하고 잃었고, 배신당했고, 폭풍을 견뎌왔습니다. 그러나 씁쓸해지기보다 고통을 지혜로 변화시켰습니다. 그녀의 명확한 경계와 정직한 소통은 자신의 가치를 알고 다시 속지 않겠다는 거부에서 옵니다. 그녀는 외과 의사의 정밀함으로 환상을 자릅니다: 가능하면 친절하게, 필요하면 무자비하게 정직하게. 이 여왕은 삶을 재건한 이혼한 어머니, 편안함보다 독립을 선택한 여성, 기분 좋은 거짓말보다 진실을 소중히 여기는 모든 사람을 나타냅니다. 사랑에서 그녀는 로맨틱한 환상보다 명확함을 제공합니다—사람들을 그녀가 바라는 대로가 아니라 있는 그대로 봅니다. 직업에서 그녀는 공정한 판단, 전문적 경계, 감정이 이성을 흐리지 않게 하고 어려운 결정을 내리는 능력을 나타냅니다. 그녀의 지혜: 평화를 보호하고, 진실을 말하고, 기준에 대해 결코 사과하지 마세요.',
      advice: 'Protect your peace, speak your truth, and never apologize for your standards.',
      adviceKo: '평화를 보호하고, 진실을 말하고, 기준에 대해 결코 사과하지 마세요.'
    },
    reversed: {
      keywords: ['Cold', 'Bitter', 'Cynical', 'Cruel', 'Overly critical'],
      keywordsKo: ['냉담', '씁쓸함', '냉소적', '잔인', '지나친 비판'],
      meaning: 'The reversed Queen of Swords has allowed her pain to harden into armor that keeps everyone out. The boundaries that once protected her have become walls; the honesty that once served her has become cruelty. This queen has become cynical about love, bitter about betrayal, cold where she once was merely guarded. Her high standards have become impossible demands; her discernment has become harsh judgment. She may use her sharp mind to wound rather than heal, her words to control rather than clarify. Perhaps someone has hurt you so deeply that you\'ve closed your heart entirely. Perhaps you\'ve become the very critic you once feared. In love, emotional unavailability or cruel words are damaging relationships. Past pain is being projected onto present partners. In career, you may be seen as cold, unapproachable, or unfairly critical. The message is to examine whether your protection has become a prison, whether your standards have become weapons, and whether there\'s warmth still alive beneath the ice.',
      meaningKo: '역방향 소드 여왕은 고통이 모든 사람을 차단하는 갑옷으로 굳어지도록 허용했습니다. 한때 그녀를 보호했던 경계가 벽이 되었습니다; 한때 그녀를 도왔던 정직이 잔인함이 되었습니다. 이 여왕은 사랑에 냉소적이 되었고, 배신에 씁쓸해졌고, 한때 단순히 경계했던 곳에서 냉담해졌습니다. 그녀의 높은 기준이 불가능한 요구가 되었습니다; 그녀의 분별력이 가혹한 판단이 되었습니다. 그녀는 날카로운 마음을 치유하기보다 상처 주는 데, 명확히 하기보다 통제하는 데 사용할 수 있습니다. 아마도 누군가가 너무 깊이 상처를 주어 마음을 완전히 닫았을 것입니다. 아마도 한때 두려워했던 바로 그 비평가가 되었을 것입니다. 사랑에서 감정적 불가용성이나 잔인한 말이 관계를 손상시키고 있습니다. 과거의 고통이 현재 파트너에게 투사되고 있습니다. 직업에서 냉담하거나, 접근하기 어렵거나, 부당하게 비판적으로 보일 수 있습니다. 메시지는 보호가 감옥이 되었는지, 기준이 무기가 되었는지, 얼음 아래 아직 따뜻함이 살아 있는지 검토하는 것입니다.',
      advice: 'Has your protection become a prison? Is there warmth still alive beneath the ice?',
      adviceKo: '보호가 감옥이 되었나요? 얼음 아래 아직 따뜻함이 살아 있나요?'
    }
  },
  {
    id: 63,
    name: 'King of Swords',
    nameKo: '소드 왕',
    arcana: 'minor',
    suit: 'swords',
    image: '/cards/63.jpg',
    upright: {
      keywords: ['Intellectual power', 'Authority', 'Truth', 'Clarity', 'Justice'],
      keywordsKo: ['지적 권위', '권위', '진실', '명확함', '정의'],
      meaning: 'The King of Swords sits upon his throne, sword raised, gaze direct and unwavering—the ultimate authority in matters of intellect and justice. This king has mastered his mind completely; emotion does not cloud his judgment, and personal bias does not sway his decisions. He represents the judge, the philosopher, the leader who rules through wisdom rather than force. His word is law because his logic is impeccable and his commitment to truth absolute. When this king appears, it\'s time to make decisions from the head rather than the heart, to cut through complexity with clear analysis, to uphold principles even when feelings protest. He may represent a mentor figure with valuable guidance, or the development of your own intellectual authority. In love, he counsels honest assessment over romantic delusion—is this relationship built on solid foundations? In career, he represents strategic thinking, ethical leadership, and the ability to see the big picture clearly. His wisdom: truth serves everyone better than comfortable lies, and clarity—however difficult—is always better than confusion.',
      meaningKo: '소드 왕은 왕좌에 앉아 검을 들고, 직접적이고 흔들리지 않는 시선을 보냅니다—지성과 정의 문제에서 궁극적인 권위입니다. 이 왕은 마음을 완전히 지배했습니다; 감정이 판단을 흐리지 않고, 개인적 편견이 결정을 흔들지 않습니다. 그는 판사, 철학자, 힘보다 지혜로 다스리는 지도자를 나타냅니다. 그의 말은 법입니다. 왜냐하면 그의 논리가 완벽하고 진실에 대한 헌신이 절대적이기 때문입니다. 이 왕이 나타나면 마음보다 머리로 결정을 내리고, 명확한 분석으로 복잡함을 자르고, 감정이 항의하더라도 원칙을 유지할 때입니다. 그는 가치 있는 지도가 있는 멘토 인물을 나타내거나, 당신 자신의 지적 권위의 발전을 나타낼 수 있습니다. 사랑에서 그는 로맨틱한 망상보다 정직한 평가를 권합니다—이 관계가 단단한 기반 위에 세워져 있는가? 직업에서 그는 전략적 사고, 윤리적 리더십, 전체 그림을 명확히 볼 수 있는 능력을 나타냅니다. 그의 지혜: 진실은 편안한 거짓말보다 모두에게 더 잘 봉사하며, 명확함은—아무리 어렵더라도—항상 혼란보다 낫습니다.',
      advice: 'Truth serves everyone better than comfortable lies. Clarity is always better than confusion.',
      adviceKo: '진실은 편안한 거짓말보다 모두에게 더 잘 봉사합니다. 명확함은 항상 혼란보다 낫습니다.'
    },
    reversed: {
      keywords: ['Manipulative', 'Tyrannical', 'Abuse of power', 'Cruel', 'Cold-hearted'],
      keywordsKo: ['조종적', '독재적', '권력 남용', '잔인', '냉혈'],
      meaning: 'The reversed King of Swords represents intellect without ethics—the brilliant mind turned toward manipulation, the authority figure who abuses power, the leader who becomes a tyrant. This king uses his formidable mental abilities to control, deceive, and dominate rather than to serve justice and truth. He may twist words, gaslight opponents, or use logical arguments to justify cruel behavior. Rules apply to others but not to him. Truth becomes whatever serves his purpose. Alternatively, this reversal can indicate an abdication of intellectual authority—someone who should be making clear decisions but is paralyzed by indecision, or a leader who has lost the respect of those he leads. In love, this may indicate someone who uses intelligence to manipulate and control, whose \"logic\" is really emotional abuse in disguise, or who is cold where warmth is needed. In career, watch for unethical leadership, office politics played with ruthless precision, or your own tendency to be dictatorial. The warning is clear: intelligence without heart becomes cruelty.',
      meaningKo: '역방향 소드 왕은 윤리 없는 지성을 나타냅니다—조종으로 향한 뛰어난 마음, 권력을 남용하는 권위 인물, 폭군이 되는 지도자. 이 왕은 정의와 진실을 위해 봉사하기보다 통제하고, 속이고, 지배하는 데 강력한 정신적 능력을 사용합니다. 그는 말을 비틀고, 상대를 가스라이팅하고, 잔인한 행동을 정당화하기 위해 논리적 주장을 사용할 수 있습니다. 규칙은 다른 사람에게 적용되지만 그에게는 아닙니다. 진실은 그의 목적에 맞는 무엇이든 됩니다. 또는 이 역방향은 지적 권위의 포기를 나타낼 수 있습니다—명확한 결정을 내려야 하지만 우유부단에 마비된 사람, 또는 이끄는 사람들의 존경을 잃은 지도자. 사랑에서 이것은 지성을 조종하고 통제하는 데 사용하는 사람, "논리"가 실제로 변장한 감정적 학대인 사람, 또는 따뜻함이 필요한 곳에서 차가운 사람을 나타낼 수 있습니다. 직업에서 비윤리적 리더십, 무자비한 정밀함으로 행해지는 사내 정치, 또는 독재적이 되려는 자신의 경향을 경계하세요. 경고는 분명합니다: 마음 없는 지능은 잔인함이 됩니다.',
      advice: 'Intelligence without heart becomes cruelty. Power must serve, not dominate.',
      adviceKo: '마음 없는 지능은 잔인함이 됩니다. 권력은 지배가 아니라 봉사해야 합니다.'
    }
  },
  
  // Suit of Pentacles
  {
    id: 64,
    name: 'Ace of Pentacles',
    nameKo: '펜타클 에이스',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/64.jpg',
    upright: {
      keywords: ['New opportunity', 'Prosperity', 'Manifestation', 'Abundance', 'A new job'],
      keywordsKo: ['새 기회', '번영', '실현', '풍요', '새 직장'],
      advice: 'Seize this opportunity. Plant the seed of prosperity now.',
      adviceKo: '이 기회를 잡으세요. 지금 번영의 씨앗을 심으세요.',
      meaning: 'The Ace of Pentacles shows a divine hand emerging from clouds, offering a golden coin above a flourishing garden with an archway leading to distant mountains. This is the seed of material manifestation—the beginning of something real, tangible, and prosperous. Unlike the ideas of Wands or emotions of Cups, this ace represents opportunity that can be touched, measured, and built upon. A new job, business venture, financial windfall, or material blessing is being offered. The garden shows this seed can grow into abundance if properly tended. In love, this ace brings grounding—a relationship that offers security and practical support, or the beginning of building something lasting together. In career, the door opens to new opportunities for financial growth, whether through a job offer, business idea, or investment that has real potential. The message is clear: the universe is offering something concrete. Reach out and take it—but know that this seed requires cultivation. Opportunity alone is not success; what you do with it determines the harvest.',
      meaningKo: '펜타클 에이스는 구름에서 나오는 신성한 손이 번성하는 정원 위에 황금 동전을 내밀고 있으며, 멀리 산으로 이어지는 아치길이 있습니다. 이것은 물질적 실현의 씨앗입니다—실제적이고, 유형적이며, 번영하는 무언가의 시작입니다. 완드의 아이디어나 컵의 감정과 달리, 이 에이스는 만지고, 측정하고, 그 위에 세울 수 있는 기회를 나타냅니다. 새 직장, 사업 벤처, 재정적 횡재, 또는 물질적 축복이 제공되고 있습니다. 정원은 이 씨앗이 제대로 돌보면 풍요로 자랄 수 있음을 보여줍니다. 사랑에서 이 에이스는 기반을 가져옵니다—안정과 실질적 지원을 제공하는 관계, 또는 함께 지속적인 것을 쌓기 시작하는 것. 직업에서 문이 열립니다—직업 제안, 사업 아이디어, 또는 진정한 잠재력이 있는 투자를 통한 재정적 성장의 새로운 기회. 메시지는 분명합니다: 우주가 구체적인 것을 제공하고 있습니다. 손을 뻗어 잡으세요—하지만 이 씨앗은 재배가 필요하다는 것을 알아야 합니다. 기회만으로는 성공이 아닙니다; 그것으로 무엇을 하느냐가 수확을 결정합니다.'
    },
    reversed: {
      keywords: ['Lost opportunity', 'Lack of planning', 'Greed', 'Financial instability', 'Poor investment'],
      keywordsKo: ['놓친 기회', '계획 부족', '탐욕', '재정 불안정', '잘못된 투자'],
      advice: 'Don\'t let greed blind you. Plan carefully for stability.',
      adviceKo: '탐욕에 눈멀지 마세요. 안정을 위해 신중히 계획하세요.',
      meaning: 'The reversed Ace of Pentacles warns of material opportunity slipping away—the golden coin falling from the hand, the garden gate closing. Perhaps you\'ve missed a financial chance due to hesitation, poor planning, or simply not recognizing it when it appeared. The seed was offered but not planted; the opportunity was present but not seized. Alternatively, this reversal can indicate an opportunity that appears golden but is actually fool\'s gold—a "sure thing" investment that fails, a job that promises much but delivers little, material gains that come with hidden costs. Greed may be corrupting judgment; impatience may be undermining potential. In love, material concerns are blocking emotional connection, or you\'re prioritizing security over genuine feeling. In career, financial instability threatens, poor investments drain resources, or you\'re too focused on money to see other forms of abundance. The message is to examine what opportunities you may be missing, what offers deserve more investigation, and whether your relationship with material success needs recalibration.',
      meaningKo: '역방향 펜타클 에이스는 물질적 기회가 사라지는 것을 경고합니다—손에서 떨어지는 황금 동전, 닫히는 정원 문. 아마도 망설임, 계획 부족, 또는 단순히 나타났을 때 인식하지 못하여 재정적 기회를 놓쳤을 것입니다. 씨앗이 제공되었지만 심어지지 않았습니다; 기회가 있었지만 잡히지 않았습니다. 또는 이 역방향은 황금으로 보이지만 실제로는 가짜 금인 기회를 나타낼 수 있습니다—실패하는 "확실한" 투자, 많이 약속하지만 적게 제공하는 직업, 숨겨진 비용이 따르는 물질적 이득. 탐욕이 판단을 부패시키고 있을 수 있습니다; 조급함이 잠재력을 훼손하고 있을 수 있습니다. 사랑에서 물질적 우려가 감정적 연결을 막거나, 진정한 감정보다 안정을 우선시하고 있습니다. 직업에서 재정적 불안정이 위협하거나, 나쁜 투자가 자원을 고갈시키거나, 다른 형태의 풍요를 보지 못할 정도로 돈에 집착하고 있습니다. 메시지는 어떤 기회를 놓치고 있는지, 어떤 제안이 더 조사할 가치가 있는지, 물질적 성공과의 관계가 재조정이 필요한지 검토하는 것입니다.'
    }
  },
  {
    id: 65,
    name: 'Two of Pentacles',
    nameKo: '펜타클 2',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/65.jpg',
    upright: {
      keywords: ['Balancing', 'Adaptability', 'Time management', 'Prioritizing', 'Juggling'],
      keywordsKo: ['균형', '적응력', '시간 관리', '우선순위', '저글링'],
      advice: 'Keep juggling skillfully. Adaptability is your strength.',
      adviceKo: '균형을 유지하세요. 적응력이 당신의 강점입니다.',
      meaning: 'The Two of Pentacles shows a figure juggling two coins bound by an infinity symbol, while ships ride rough waves in the background. This is life\'s balancing act in motion—managing multiple priorities, adapting to changing circumstances, keeping financial plates spinning. The figure dances rather than struggles; there\'s a lightness to the juggling, suggesting this balance is sustainable when approached with the right attitude. Sometimes life demands we handle competing responsibilities: work and family, saving and spending, stability and adventure. This card affirms you can manage it all, but it requires constant adjustment and presence. The waves behind remind us that external circumstances are never fully stable—adaptability is not optional but essential. In love, you\'re balancing relationship needs with other life demands, or navigating the give-and-take any partnership requires. In career, you\'re managing multiple projects, adapting to shifting priorities, or weighing financial decisions carefully. The message: stay flexible, keep your humor, and remember that balance is a verb, not a destination.',
      meaningKo: '펜타클 2는 무한대 기호로 묶인 두 개의 동전을 저글링하는 인물을 보여주며, 배경에서 배들이 거친 파도를 타고 있습니다. 이것은 움직이는 삶의 균형 잡기입니다—여러 우선순위 관리, 변화하는 상황에 적응, 재정적 접시를 돌리기. 인물은 힘들어하기보다 춤을 춥니다; 저글링에 가벼움이 있어 이 균형이 올바른 태도로 접근하면 지속 가능함을 시사합니다. 때로는 삶이 경쟁하는 책임을 다루도록 요구합니다: 일과 가족, 저축과 지출, 안정과 모험. 이 카드는 모든 것을 관리할 수 있음을 확인하지만, 지속적인 조정과 존재가 필요합니다. 뒤의 파도는 외부 상황이 결코 완전히 안정적이지 않다는 것을 상기시킵니다—적응력은 선택이 아니라 필수입니다. 사랑에서 다른 삶의 요구와 관계 필요의 균형을 맞추거나, 파트너십이 요구하는 주고받기를 탐색하고 있습니다. 직업에서 여러 프로젝트를 관리하거나, 변화하는 우선순위에 적응하거나, 재정적 결정을 신중히 저울질하고 있습니다. 메시지: 유연함을 유지하고, 유머를 잃지 말고, 균형은 목적지가 아니라 동사라는 것을 기억하세요.'
    },
    reversed: {
      keywords: ['Overwhelmed', 'Poor financial decisions', 'Disorganization', 'Losing balance', 'Struggling'],
      keywordsKo: ['압도됨', '잘못된 재정 결정', '비체계적', '균형 상실', '어려움'],
      advice: 'Prioritize ruthlessly. You can\'t do everything at once.',
      adviceKo: '과감하게 우선순위를 정하세요. 모든 것을 한꺼번에 할 수 없습니다.',
      meaning: 'The reversed Two of Pentacles shows the balls dropping, the dance becoming a struggle, the waves overwhelming the ships. Balance has been lost—too many demands, too little organization, too much change happening too fast. You\'re spread too thin, making poor financial decisions because you\'re reacting rather than planning, or dropping important balls because you\'ve taken on more than anyone can handle. The infinity symbol that once showed sustainable flow now shows an exhausting loop. Perhaps you need to stop juggling and prioritize: which plates actually matter? Which can you set down? Alternatively, this reversal may indicate refusing to adapt when change is necessary, clinging to one ball while others fall. In love, imbalance is straining the relationship—one person giving too much, or external stress overwhelming the partnership. In career, disorganization is causing missed deadlines, financial chaos, or burnout from trying to do everything. The message is clear: something has to give. Choose consciously what to prioritize rather than letting circumstances choose for you.',
      meaningKo: '역방향 펜타클 2는 공이 떨어지고, 춤이 몸부림이 되고, 파도가 배를 압도하는 것을 보여줍니다. 균형이 무너졌습니다—너무 많은 요구, 너무 적은 조직, 너무 많은 변화가 너무 빠르게 일어나고 있습니다. 너무 얇게 퍼져 있어서 계획하기보다 반응하기 때문에 잘못된 재정적 결정을 내리거나, 누구도 감당할 수 없는 것 이상을 맡아 중요한 공을 떨어뜨리고 있습니다. 한때 지속 가능한 흐름을 보여주던 무한대 기호가 이제 지치는 반복을 보여줍니다. 저글링을 멈추고 우선순위를 정해야 할 수도 있습니다: 어떤 접시가 실제로 중요한가? 어떤 것을 내려놓을 수 있는가? 또는 이 역방향은 변화가 필요할 때 적응을 거부하고, 다른 것이 떨어지는 동안 한 공에 매달리는 것을 나타낼 수 있습니다. 사랑에서 불균형이 관계에 긴장을 주고 있습니다—한 사람이 너무 많이 주거나, 외부 스트레스가 파트너십을 압도합니다. 직업에서 비체계적임이 마감을 놓치게 하거나, 재정적 혼돈, 또는 모든 것을 하려다 번아웃을 일으킵니다. 메시지는 분명합니다: 무언가를 양보해야 합니다. 상황이 당신을 위해 선택하게 두기보다 의식적으로 무엇을 우선시할지 선택하세요.'
    }
  },
  {
    id: 66,
    name: 'Three of Pentacles',
    nameKo: '펜타클 3',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/66.jpg',
    upright: {
      keywords: ['Teamwork', 'Collaboration', 'Learning', 'Implementation', 'Skill'],
      keywordsKo: ['팀워크', '협력', '학습', '실행', '기술'],
      advice: 'Collaborate with others. Teamwork elevates your work.',
      adviceKo: '다른 사람들과 협력하세요. 팀워크가 작업을 높입니다.',
      meaning: 'The Three of Pentacles shows a craftsman working on a cathedral while consulting with an architect and a monk—three people with different expertise combining their skills to create something magnificent. This is the card of collaboration where each person\'s contribution matters, where the whole becomes greater than the sum of its parts. The cathedral represents a shared vision that no one could build alone. When this card appears, it signals that working with others will produce better results than working in isolation. This might mean seeking feedback, hiring experts, joining a team, or recognizing that your skills, however excellent, need to be complemented by others. The craftsman is still learning—mastery comes through the practical application of knowledge under guidance. In love, this card suggests building something together, perhaps a home, a future, or simply a relationship where both partners contribute their strengths. In career, collaboration brings success—value your teammates, seek mentorship, and recognize that quality work often requires multiple perspectives and skill sets.',
      meaningKo: '펜타클 3은 건축가와 수도사와 상담하면서 성당에서 일하는 장인을 보여줍니다—서로 다른 전문성을 가진 세 사람이 기술을 결합하여 장엄한 것을 만듭니다. 이것은 각 사람의 기여가 중요하고, 전체가 부분의 합보다 커지는 협력의 카드입니다. 성당은 혼자서는 지을 수 없는 공유된 비전을 나타냅니다. 이 카드가 나타나면 다른 사람과 함께 일하는 것이 고립해서 일하는 것보다 더 나은 결과를 낼 것임을 신호합니다. 이것은 피드백을 구하거나, 전문가를 고용하거나, 팀에 합류하거나, 당신의 기술이 아무리 뛰어나도 다른 사람에 의해 보완되어야 함을 인식하는 것을 의미할 수 있습니다. 장인은 여전히 배우고 있습니다—숙련은 지도 아래 지식의 실제 적용을 통해 옵니다. 사랑에서 이 카드는 함께 무언가를 쌓는 것을 시사합니다, 아마도 집, 미래, 또는 단순히 두 파트너가 각자의 강점을 기여하는 관계. 직업에서 협력이 성공을 가져옵니다—팀원을 소중히 여기고, 멘토십을 구하고, 품질 높은 작업은 종종 여러 관점과 기술 세트를 필요로 한다는 것을 인식하세요.'
    },
    reversed: {
      keywords: ['Lack of teamwork', 'Disharmony', 'Poor quality work', 'Competition', 'Lack of skill'],
      keywordsKo: ['팀워크 부족', '불화', '저품질 작업', '경쟁', '기술 부족'],
      advice: 'Improve team communication. Competition hurts collaboration.',
      adviceKo: '팀 소통을 개선하세요. 경쟁은 협력을 해칩니다.',
      meaning: 'The reversed Three of Pentacles shows collaboration breaking down—the craftsman ignoring the architect\'s plans, the team members competing rather than cooperating, the cathedral being built crooked because no one is communicating. When this card appears reversed, something is wrong with how people are working together. Perhaps egos are getting in the way of quality. Perhaps there\'s no clear vision, and everyone is pulling in different directions. Maybe you\'re trying to do everything yourself when you should be seeking help, or you\'re surrounded by people whose contributions don\'t actually add value. Poor workmanship results from poor teamwork or lack of proper training. In love, you may be building alone when partnership is needed, or the relationship suffers from failure to combine strengths effectively. Arguments about whose contribution matters more can poison the foundation. In career, look for dysfunction in team dynamics, poor mentorship, lack of respect for expertise, or work that\'s suffering because collaboration isn\'t working. The message: quality requires cooperation, and cooperation requires clear communication and mutual respect.',
      meaningKo: '역방향 펜타클 3은 협력이 무너지는 것을 보여줍니다—건축가의 계획을 무시하는 장인, 협력하기보다 경쟁하는 팀원들, 아무도 소통하지 않아 비뚤게 지어지는 성당. 이 카드가 역방향으로 나타나면 사람들이 함께 일하는 방식에 문제가 있습니다. 아마도 자존심이 품질에 방해가 되고 있습니다. 아마도 명확한 비전이 없고 모두가 다른 방향으로 끌어당기고 있습니다. 도움을 구해야 할 때 모든 것을 혼자 하려고 하거나, 기여가 실제로 가치를 더하지 않는 사람들에게 둘러싸여 있을 수 있습니다. 열악한 솜씨는 열악한 팀워크나 적절한 훈련 부족에서 비롯됩니다. 사랑에서 파트너십이 필요할 때 혼자 쌓고 있거나, 강점을 효과적으로 결합하지 못해 관계가 고통받을 수 있습니다. 누구의 기여가 더 중요한지에 대한 논쟁이 기반을 해칠 수 있습니다. 직업에서 팀 역학의 기능 장애, 열악한 멘토십, 전문성에 대한 존중 부족, 또는 협력이 작동하지 않아 고통받는 작업을 찾으세요. 메시지: 품질은 협력을 필요로 하고, 협력은 명확한 소통과 상호 존중을 필요로 합니다.'
    }
  },
  {
    id: 67,
    name: 'Four of Pentacles',
    nameKo: '펜타클 4',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/67.jpg',
    upright: {
      keywords: ['Saving money', 'Security', 'Control', 'Conservation', 'Possessiveness'],
      keywordsKo: ['저축', '안정', '통제', '보존', '소유욕'],
      advice: 'Save wisely but don\'t hoard. Security shouldn\'t become a prison.',
      adviceKo: '현명하게 저축하되 모으지만 마세요. 안정이 감옥이 되어선 안 됩니다.',
      meaning: 'The Four of Pentacles shows a figure sitting with one coin on their head, one clutched to their chest, and two under their feet—surrounded by their wealth, yet unable to move or receive anything new because their hands are too full of holding on. This is the card of financial security taken to its extreme, where the desire for stability becomes rigidity, where saving becomes hoarding, where self-protection becomes isolation. There\'s nothing wrong with building security—in fact, this card can positively indicate wise financial management, the discipline to save, and the comfort of knowing your needs are met. But the figure cannot embrace anyone, cannot walk freely, cannot reach for new opportunities. The message is nuanced: protect what you\'ve built, but don\'t let protection become prison. In love, this may indicate holding back emotionally, fearing vulnerability, or a relationship where security matters more than intimacy. In career, you\'re building stability, perhaps through conservative investments or holding boundaries—just ensure you\'re not missing opportunities because your grip is too tight.',
      meaningKo: '펜타클 4는 머리에 동전 하나, 가슴에 꽉 쥔 동전 하나, 발 아래 두 개를 가진 인물을 보여줍니다—부로 둘러싸여 있지만, 손이 쥐고 있는 것으로 가득 차 움직이거나 새로운 것을 받을 수 없습니다. 이것은 극단으로 치달은 재정적 안정의 카드입니다. 안정에 대한 욕구가 경직성이 되고, 저축이 비축이 되고, 자기 보호가 고립이 됩니다. 안정을 쌓는 데 잘못된 것은 없습니다—사실 이 카드는 현명한 재정 관리, 저축하는 규율, 필요가 충족된다는 것을 아는 편안함을 긍정적으로 나타낼 수 있습니다. 그러나 인물은 누구도 포옹할 수 없고, 자유롭게 걸을 수 없고, 새로운 기회에 손을 뻗을 수 없습니다. 메시지는 미묘합니다: 쌓은 것을 보호하되, 보호가 감옥이 되지 않게 하세요. 사랑에서 이것은 감정적으로 물러서거나, 취약해지는 것을 두려워하거나, 친밀함보다 안정이 더 중요한 관계를 나타낼 수 있습니다. 직업에서 보수적인 투자나 경계 유지를 통해 안정을 쌓고 있습니다—다만 쥐는 것이 너무 세서 기회를 놓치지 않도록 하세요.'
    },
    reversed: {
      keywords: ['Greed', 'Materialism', 'Letting go', 'Generosity', 'Financial loss'],
      keywordsKo: ['탐욕', '물질주의', '놓음', '관대함', '재정 손실'],
      advice: 'Are you learning to trust with open hands, or losing control? Choose consciously.',
      adviceKo: '열린 손으로 신뢰하는 법을 배우고 있나요, 아니면 통제를 잃고 있나요? 의식적으로 선택하세요.',
      meaning: 'The reversed Four of Pentacles goes one of two directions: releasing the grip or tightening it to breaking point. On the positive side, you may be learning to let go of material attachment, becoming more generous, spending on experiences rather than hoarding, or realizing that true security comes from within rather than from possessions. The coins are flowing again. On the shadow side, this reversal can indicate greed spinning out of control, spending recklessly, gambling what should be saved, or losing money through poor financial decisions or circumstances beyond your control. The stability you\'ve built may be crumbling. In love, you\'re either opening up after a period of emotional guardedness or experiencing the consequences of having held too tightly—the relationship breaking under the pressure of control. In career, you might be taking healthy risks, loosening financial constraints appropriately, or watching helplessly as security slips away. The message depends on your situation: are you learning to trust life with open hands, or are you losing control of what once felt certain?',
      meaningKo: '역방향 펜타클 4는 두 방향 중 하나로 갑니다: 쥔 것을 풀거나 부러질 때까지 조입니다. 긍정적인 면에서 물질적 집착을 놓는 법을 배우거나, 더 관대해지거나, 비축하기보다 경험에 지출하거나, 진정한 안정은 소유물이 아닌 내면에서 온다는 것을 깨달을 수 있습니다. 동전이 다시 흐르고 있습니다. 그림자 면에서 이 역방향은 통제 불능의 탐욕, 무모한 지출, 저축해야 할 것을 도박, 또는 잘못된 재정 결정이나 통제할 수 없는 상황으로 돈을 잃는 것을 나타낼 수 있습니다. 쌓은 안정이 무너지고 있을 수 있습니다. 사랑에서 감정적 경계 기간 후에 열리거나, 너무 꽉 쥐어서 결과를 경험하고 있습니다—통제의 압력 아래 관계가 깨지고 있습니다. 직업에서 건강한 위험을 감수하거나, 재정적 제약을 적절히 풀거나, 한때 확실하다고 느꼈던 안정이 사라지는 것을 무력하게 지켜볼 수 있습니다. 메시지는 상황에 따라 다릅니다: 열린 손으로 삶을 신뢰하는 법을 배우고 있는지, 아니면 한때 확실했던 것의 통제를 잃고 있는지?'
    }
  },
  {
    id: 68,
    name: 'Five of Pentacles',
    nameKo: '펜타클 5',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/68.jpg',
    upright: {
      keywords: ['Financial loss', 'Poverty', 'Hard times', 'Isolation', 'Feeling left out'],
      keywordsKo: ['재정 손실', '빈곤', '힘든 시기', '고립', '소외감'],
      advice: 'Seek help. You don\'t have to struggle alone.',
      adviceKo: '도움을 구하세요. 혼자 힘들어할 필요 없습니다.',
      meaning: 'The Five of Pentacles shows two figures—one injured, one ill—trudging through snow past a brightly lit church window, seemingly unaware that warmth and help are right there. This is the card of material hardship and the spiritual poverty that often accompanies it: feeling abandoned, excluded from abundance, left out in the cold. Financial loss, job loss, health problems, or any circumstance that makes you feel like an outsider can trigger this energy. The suffering is real, but look at the image again: the church door is right there. Help exists; support is available; you are not as alone as you feel. Sometimes hardship makes us so focused on survival that we cannot see the resources around us. In love, you may feel rejected, unworthy of care, or struggling through a difficult period together. In career, financial setback, unemployment, or feeling excluded from opportunity weighs heavily. The message is compassionate but clear: look up. Seek help. You don\'t have to walk through this storm alone, and the resources you need may be closer than you realize.',
      meaningKo: '펜타클 5는 두 인물—한 명은 부상당하고, 한 명은 아픈—이 밝게 빛나는 교회 창문을 지나 눈 속을 터벅터벅 걸어가는 것을 보여줍니다. 따뜻함과 도움이 바로 거기 있는 것을 모르는 것 같습니다. 이것은 물질적 어려움과 종종 그것에 동반되는 영적 빈곤의 카드입니다: 버림받은 느낌, 풍요에서 배제된 느낌, 추위에 내버려진 느낌. 재정적 손실, 실직, 건강 문제, 또는 외부인처럼 느끼게 하는 모든 상황이 이 에너지를 유발할 수 있습니다. 고통은 실제이지만, 이미지를 다시 보세요: 교회 문이 바로 거기 있습니다. 도움이 존재합니다; 지원이 가능합니다; 느끼는 것만큼 혼자가 아닙니다. 때로는 어려움이 우리를 생존에 집중하게 해서 주변의 자원을 볼 수 없게 합니다. 사랑에서 거부당하거나, 보살핌을 받을 자격이 없다고 느끼거나, 함께 어려운 시기를 겪고 있을 수 있습니다. 직업에서 재정적 좌절, 실업, 또는 기회에서 배제된 느낌이 무겁게 짓누릅니다. 메시지는 연민적이지만 분명합니다: 고개를 드세요. 도움을 구하세요. 이 폭풍을 혼자 걸을 필요가 없고, 필요한 자원이 생각보다 가까이 있을 수 있습니다.'
    },
    reversed: {
      keywords: ['Recovery', 'Finding help', 'Improved finances', 'Hope', 'End of hardship'],
      keywordsKo: ['회복', '도움 찾기', '재정 개선', '희망', '어려움의 끝'],
      advice: 'The storm is passing. Even the coldest winter yields to spring.',
      adviceKo: '폭풍이 지나가고 있습니다. 가장 추운 겨울도 결국 봄에 양보합니다.',
      meaning: 'The reversed Five of Pentacles signals the end of hardship, the door finally opening, warmth flooding in after the cold walk through the storm. You\'ve found help—whether through reaching out, being discovered by those who care, or simply circumstances improving. The recovery may be slow, but it has begun. Financial situation is stabilizing; health is returning; you\'re reconnecting with community after a period of isolation. Alternatively, this reversal can indicate spiritual recovery—realizing that your worth isn\'t determined by your bank account, that you have inner resources even when outer ones are scarce. However, it can also mean hardship continuing or deepening, particularly if you refuse to accept help that\'s offered. In love, you\'re healing from rejection or reconnecting after a difficult period. In career, financial recovery is underway, job prospects are improving, or you\'re finding creative solutions to material challenges. The message is hope: the storm passes, doors open, and even the coldest winter eventually yields to spring.',
      meaningKo: '역방향 펜타클 5는 어려움의 끝을 신호합니다, 문이 마침내 열리고, 폭풍 속을 걷고 난 후 따뜻함이 밀려들어옵니다. 도움을 찾았습니다—손을 내밀거나, 신경 쓰는 사람들에게 발견되거나, 단순히 상황이 호전되어서. 회복은 느릴 수 있지만, 시작되었습니다. 재정 상황이 안정되고 있습니다; 건강이 돌아오고 있습니다; 고립 기간 후에 공동체와 다시 연결되고 있습니다. 또는 이 역방향은 영적 회복을 나타낼 수 있습니다—당신의 가치가 은행 잔고로 결정되지 않는다는 것, 외적 자원이 부족할 때도 내적 자원이 있다는 것을 깨닫는 것. 그러나 특히 제공되는 도움을 받아들이기를 거부하면 어려움이 계속되거나 심화되는 것을 의미할 수도 있습니다. 사랑에서 거부에서 치유되거나 어려운 기간 후에 다시 연결되고 있습니다. 직업에서 재정적 회복이 진행 중이거나, 취업 전망이 개선되거나, 물질적 도전에 대한 창의적인 해결책을 찾고 있습니다. 메시지는 희망입니다: 폭풍이 지나가고, 문이 열리고, 가장 추운 겨울도 결국 봄에 양보합니다.'
    }
  },
  {
    id: 69,
    name: 'Six of Pentacles',
    nameKo: '펜타클 6',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/69.jpg',
    upright: {
      keywords: ['Generosity', 'Charity', 'Giving and receiving', 'Sharing wealth', 'Balance'],
      keywordsKo: ['관대함', '자선', '주고받음', '부 나눔', '균형'],
      advice: 'Give generously. The flow of giving and receiving benefits all.',
      adviceKo: '너그럽게 베푸세요. 주고받음의 흐름이 모두에게 이롭습니다.',
      meaning: 'The Six of Pentacles shows a wealthy figure holding scales while giving coins to those in need below. This is the card of generosity, charity, and the healthy flow of resources between those who have and those who need. The scales represent fairness—giving what is appropriate, neither too much nor too little. When this card appears, you may be in either position: the generous giver sharing your abundance, or the humble receiver accepting help with gratitude. Both roles are dignified and necessary; the flow of giving and receiving is what creates community. However, examine the power dynamics: who holds the scales? True generosity empowers rather than creates dependence. In love, this represents balanced reciprocity—partners who give and receive care equitably, or the healing power of generosity within relationship. In career, you may be mentoring others, receiving financial assistance, or finding that sharing resources creates more abundance for everyone. The message: abundance flows to those who let it flow through them. Give when you can; receive gracefully when you must.',
      meaningKo: '펜타클 6은 저울을 들고 아래에 있는 궁핍한 사람들에게 동전을 주는 부유한 인물을 보여줍니다. 이것은 관대함, 자선, 그리고 가진 사람과 필요한 사람 사이의 건강한 자원 흐름의 카드입니다. 저울은 공정함을 나타냅니다—너무 많지도 너무 적지도 않게 적절한 것을 주는 것. 이 카드가 나타나면 두 위치 중 하나에 있을 수 있습니다: 풍요를 나누는 관대한 주는 사람, 또는 감사히 도움을 받는 겸손한 받는 사람. 두 역할 모두 존엄하고 필요합니다; 주고받음의 흐름이 공동체를 만드는 것입니다. 그러나 권력 역학을 살펴보세요: 누가 저울을 들고 있는가? 진정한 관대함은 의존을 만들기보다 권한을 부여합니다. 사랑에서 이것은 균형 잡힌 상호성을 나타냅니다—공평하게 돌봄을 주고받는 파트너들, 또는 관계 내 관대함의 치유력. 직업에서 다른 사람을 멘토링하거나, 재정적 도움을 받거나, 자원을 공유하는 것이 모두에게 더 많은 풍요를 만든다는 것을 발견할 수 있습니다. 메시지: 풍요는 그것이 자신을 통해 흐르게 하는 사람에게 흐릅니다. 할 수 있을 때 주고; 해야 할 때 우아하게 받으세요.'
    },
    reversed: {
      keywords: ['Debt', 'Selfishness', 'One-sided charity', 'String attached', 'Abuse of generosity'],
      keywordsKo: ['빚', '이기심', '일방적 자선', '조건 달림', '관대함 남용'],
      advice: 'Beware strings attached. Give without expectation.',
      adviceKo: '숨은 조건을 조심하세요. 기대 없이 베푸세요.',
      meaning: 'The reversed Six of Pentacles shows the scales tipping into imbalance—generosity with strings attached, charity that humiliates, receiving that creates harmful dependence, or giving that depletes rather than shares. Perhaps you\'re giving too much and receiving too little, or taking more than you give. The power dynamics of helping have become toxic: the giver uses generosity to control, or the receiver takes without gratitude or reciprocity. Debt—financial or emotional—may be accumulating. Be wary of those who help with hidden agendas, or examine whether your own generosity has conditions attached. In love, one partner may be giving everything while the other takes, creating an unsustainable dynamic. Financial resentments may be building. Help offered may come with expectations that weren\'t clearly stated. In career, watch for unfair compensation, being taken advantage of for your generosity, or accumulating financial obligations that create pressure. The message: examine the true nature of your giving and receiving. Is it creating mutual flourishing or harmful imbalance?',
      meaningKo: '역방향 펜타클 6은 저울이 불균형으로 기울어지는 것을 보여줍니다—조건이 달린 관대함, 굴욕을 주는 자선, 해로운 의존을 만드는 받음, 또는 나누기보다 고갈시키는 줌. 아마도 너무 많이 주고 너무 적게 받거나, 주는 것보다 더 많이 취하고 있을 것입니다. 돕는 것의 권력 역학이 독성이 되었습니다: 주는 사람이 관대함을 통제에 사용하거나, 받는 사람이 감사나 상호성 없이 취합니다. 빚—재정적이든 감정적이든—이 쌓이고 있을 수 있습니다. 숨겨진 의도로 돕는 사람을 조심하거나, 자신의 관대함에 조건이 붙어 있는지 검토하세요. 사랑에서 한 파트너가 모든 것을 주고 다른 사람이 취하여 지속 불가능한 역학을 만들 수 있습니다. 재정적 분개가 쌓이고 있을 수 있습니다. 제공된 도움이 명확히 언급되지 않은 기대와 함께 올 수 있습니다. 직업에서 불공정한 보상, 관대함을 이용당하는 것, 또는 압박을 만드는 재정적 의무 축적을 경계하세요. 메시지: 주고받음의 진정한 본질을 검토하세요. 상호 번영을 만들고 있는지 해로운 불균형을 만들고 있는지?'
    }
  },
  {
    id: 70,
    name: 'Seven of Pentacles',
    nameKo: '펜타클 7',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/70.jpg',
    upright: {
      keywords: ['Patience', 'Long-term view', 'Sustainable results', 'Investment', 'Perseverance'],
      keywordsKo: ['인내', '장기적 관점', '지속 가능한 결과', '투자', '끈기'],
      advice: 'Be patient. Your investments will grow with time.',
      adviceKo: '인내하세요. 투자는 시간이 지나면 성장합니다.',
      meaning: 'The Seven of Pentacles shows a gardener pausing from his labor, leaning on his hoe, contemplating the growing plant that bears seven golden coins. The seeds have been planted, the work has been done, and now comes the hardest part: waiting. This is the card of patience, long-term investment, and the pause before harvest. You\'ve put in the effort, but results take time. The gardener isn\'t doing nothing—he\'s assessing growth, planning next steps, deciding whether to continue tending this garden or redirect energy elsewhere. Sometimes this card asks whether your investment—of time, money, or heart—is growing as hoped. Is this plant worth continued care, or should you try a different garden? In love, you may be evaluating whether the relationship is growing as hoped, or simply waiting for connection to deepen naturally. In career, long-term projects require patience; investments need time to mature; not every seed sprouts on the same schedule. The message: sustainable success is built slowly. Take a breath, assess your progress, and trust that cultivation yields harvest in its own season.',
      meaningKo: '펜타클 7은 정원사가 일을 멈추고, 괭이에 기대어, 일곱 개의 황금 동전이 열린 자라나는 식물을 응시하는 것을 보여줍니다. 씨앗이 심어졌고, 일이 끝났으며, 이제 가장 어려운 부분이 옵니다: 기다림. 이것은 인내, 장기적 투자, 수확 전 휴식의 카드입니다. 노력을 들였지만 결과는 시간이 걸립니다. 정원사는 아무것도 안 하는 게 아닙니다—성장을 평가하고, 다음 단계를 계획하고, 이 정원을 계속 가꿀지 다른 곳에 에너지를 돌릴지 결정합니다. 때때로 이 카드는 시간, 돈, 또는 마음의 투자가 기대한 대로 자라고 있는지 묻습니다. 이 식물이 계속 돌봄을 받을 가치가 있는가, 아니면 다른 정원을 시도해야 하는가? 사랑에서 관계가 기대한 대로 성장하고 있는지 평가하거나, 단순히 연결이 자연스럽게 깊어지기를 기다리고 있을 수 있습니다. 직업에서 장기 프로젝트는 인내가 필요합니다; 투자는 성숙할 시간이 필요합니다; 모든 씨앗이 같은 일정에 싹트지 않습니다. 메시지: 지속 가능한 성공은 천천히 쌓입니다. 숨을 고르고, 진행 상황을 평가하고, 재배가 그 자체의 계절에 수확을 낸다는 것을 신뢰하세요.'
    },
    reversed: {
      keywords: ['Impatience', 'Lack of long-term vision', 'Unwise investment', 'Wasted effort', 'Frustration'],
      keywordsKo: ['조급함', '장기적 비전 부족', '현명하지 못한 투자', '낭비된 노력', '좌절'],
      advice: 'Reassess your investments. Is patience or pivot needed?',
      adviceKo: '투자를 재평가하세요. 인내가 필요한가요, 전환이 필요한가요?',
      meaning: 'The reversed Seven of Pentacles signals impatience undermining long-term success—you want the harvest before the fruit has ripened, or you\'ve abandoned the garden just before it would have flourished. Alternatively, this reversal may indicate justified frustration: the investment isn\'t growing, the effort was wasted, the seeds were planted in infertile soil. Perhaps it\'s time to acknowledge that this particular garden isn\'t going to bear fruit and redirect your energy elsewhere. There\'s wisdom in knowing when to wait and when to walk away. In love, impatience may be damaging a relationship that needs time, or you may be right to question whether further investment will ever yield the connection you deserve. In career, frustration at slow progress may be prompting rash decisions, or you may need to honestly assess whether your current path is worth continued effort. The message: examine whether your frustration is premature impatience or legitimate recognition that it\'s time to change course. Not every garden flourishes, and there\'s no shame in finding more fertile ground.',
      meaningKo: '역방향 펜타클 7은 조급함이 장기적 성공을 훼손하는 것을 신호합니다—열매가 익기 전에 수확을 원하거나, 번성하기 직전에 정원을 포기했습니다. 또는 이 역방향은 정당한 좌절을 나타낼 수 있습니다: 투자가 자라지 않고, 노력이 낭비되었고, 씨앗이 불모의 땅에 심어졌습니다. 아마도 이 특정 정원이 열매를 맺지 않을 것임을 인정하고 에너지를 다른 곳으로 돌릴 때일 것입니다. 언제 기다리고 언제 떠날지 아는 것에는 지혜가 있습니다. 사랑에서 조급함이 시간이 필요한 관계를 손상시키거나, 더 많은 투자가 당신이 마땅히 받을 연결을 낼 것인지 의문을 갖는 것이 옳을 수 있습니다. 직업에서 느린 진전에 대한 좌절이 성급한 결정을 유도하거나, 현재 경로가 계속 노력할 가치가 있는지 정직하게 평가해야 할 수 있습니다. 메시지: 좌절이 조급한 참을성 부족인지 아니면 방향을 바꿀 때라는 정당한 인식인지 검토하세요. 모든 정원이 번성하는 것은 아니며, 더 비옥한 땅을 찾는 것에 부끄러움이 없습니다.'
    }
  },
  {
    id: 71,
    name: 'Eight of Pentacles',
    nameKo: '펜타클 8',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/71.jpg',
    upright: {
      keywords: ['Apprenticeship', 'Mastery', 'Skill development', 'Diligence', 'Detail-oriented work'],
      keywordsKo: ['수련', '숙련', '기술 개발', '근면', '세부적 작업'],
      advice: 'Keep refining your skills. Mastery comes through practice.',
      adviceKo: '기술을 계속 연마하세요. 숙달은 연습에서 옵니다.',
      meaning: 'The Eight of Pentacles shows a craftsman at his workbench, carefully carving the eighth of eight pentacles, with completed works displayed beside him. This is the card of apprenticeship, skill development, and the dedication it takes to achieve mastery. The craftsman isn\'t rushing—each pentacle receives the same careful attention, the same commitment to quality. Excellence is not achieved through inspiration alone but through repetition, practice, and the willingness to start over when necessary. When this card appears, it signals a time for focused skill development. Perhaps you\'re learning something new, refining an existing talent, or committing to the slow work of becoming truly good at something. The message: mastery is built one careful pentacle at a time. In love, this card suggests putting in the work—relationships require the same dedication and skill-building as any craft. In career, your diligence is noticed; continuing education, skill development, or taking on detailed work will pay dividends. Honor the apprenticeship phase without rushing toward mastery you haven\'t yet earned.',
      meaningKo: '펜타클 8은 장인이 작업대에서 여덟 번째 펜타클을 정성스럽게 조각하고, 완성된 작품들이 옆에 진열된 것을 보여줍니다. 이것은 수련, 기술 개발, 그리고 숙련을 달성하기 위한 헌신의 카드입니다. 장인은 서두르지 않습니다—각 펜타클은 같은 세심한 주의, 같은 품질에 대한 헌신을 받습니다. 탁월함은 영감만으로 달성되는 것이 아니라 반복, 연습, 그리고 필요할 때 다시 시작하려는 의지를 통해 달성됩니다. 이 카드가 나타나면 집중된 기술 개발의 시기를 신호합니다. 아마도 새로운 것을 배우거나, 기존 재능을 다듬거나, 무언가에 진정으로 능숙해지는 느린 작업에 헌신하고 있을 것입니다. 메시지: 숙련은 한 번에 하나의 신중한 펜타클로 쌓입니다. 사랑에서 이 카드는 노력을 기울이라고 제안합니다—관계도 다른 기술처럼 같은 헌신과 기술 쌓기를 필요로 합니다. 직업에서 근면함이 인정받습니다; 계속적인 교육, 기술 개발, 또는 세부적인 작업을 맡는 것이 배당금을 줄 것입니다. 아직 얻지 못한 숙련을 향해 서두르지 말고 수련 단계를 존중하세요.'
    },
    reversed: {
      keywords: ['Perfectionism', 'Lack of ambition', 'Mediocrity', 'Repetitive work', 'Lack of focus'],
      keywordsKo: ['완벽주의', '야망 부족', '평범함', '반복 작업', '집중 부족'],
      meaning: 'The reversed Eight of Pentacles shows the apprenticeship going wrong—either through perfectionism that never finishes a single pentacle, or through sloppiness that produces poor quality work. Perhaps you\'re endlessly refining without ever completing, paralyzed by the pursuit of an impossible standard. Or perhaps you\'ve lost the dedication to your craft, doing minimum effort, cutting corners, producing work that doesn\'t represent your capability. The repetition that builds mastery has become mindless drudgery. You may be in the wrong field entirely, developing skills you don\'t actually care about. Alternatively, this reversal can indicate being stuck in apprenticeship forever—never stepping up to master-level responsibility. In love, you may be going through the motions without genuine engagement, or working so hard on the relationship that you\'ve lost joy in it. In career, either perfectionism or lack of care is hurting your output; you may need to rediscover passion for your work or find a craft that actually inspires you. The message: examine your relationship with your work. Is it building toward something, or just spinning wheels?',
      meaningKo: '역방향 펜타클 8은 수련이 잘못되고 있음을 보여줍니다—하나의 펜타클도 완성하지 못하는 완벽주의를 통해서, 또는 저품질 작업을 생산하는 엉성함을 통해서. 아마도 불가능한 기준을 추구하여 마비되어 완성하지 않고 끝없이 다듬고 있을 것입니다. 또는 기술에 대한 헌신을 잃고, 최소 노력을 하고, 모서리를 자르고, 능력을 대표하지 않는 작업을 생산하고 있을 수 있습니다. 숙련을 쌓는 반복이 무의미한 노역이 되었습니다. 실제로 신경 쓰지 않는 기술을 개발하며 완전히 잘못된 분야에 있을 수 있습니다. 또는 이 역방향은 영원히 수련에 갇혀 있음을 나타낼 수 있습니다—마스터 수준의 책임으로 결코 올라가지 않습니다. 사랑에서 진정한 참여 없이 형식만 따르거나, 관계에 너무 열심히 일해서 기쁨을 잃었을 수 있습니다. 직업에서 완벽주의나 관심 부족이 출력을 해치고 있습니다; 일에 대한 열정을 다시 발견하거나 실제로 영감을 주는 기술을 찾아야 할 수 있습니다. 메시지: 일과의 관계를 검토하세요. 무언가를 향해 쌓고 있는지, 아니면 그냥 바퀴만 돌리고 있는지?'
    }
  },
  {
    id: 72,
    name: 'Nine of Pentacles',
    nameKo: '펜타클 9',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/72.jpg',
    upright: {
      keywords: ['Abundance', 'Luxury', 'Self-sufficiency', 'Financial independence', 'Enjoying success'],
      keywordsKo: ['풍요', '럭셔리', '자급자족', '경제적 독립', '성공 즐김'],
      advice: 'Enjoy your success. You\'ve earned this abundance.',
      adviceKo: '성공을 즐기세요. 이 풍요를 얻을 자격이 있습니다.',
      meaning: 'The Nine of Pentacles shows an elegant figure standing in a bountiful garden, a falcon on her wrist, surrounded by ripe grapes and golden coins—the picture of cultivated abundance and self-sufficient success. This woman has built her own paradise through discipline and effort, and now she stands in it, enjoying the rewards without needing anyone else to provide them. This is the card of financial independence achieved not through inheritance but through personal accomplishment. The falcon represents trained instincts—she has mastered herself as well as her material world. When this card appears, it celebrates autonomy and well-earned success. You have the resources to enjoy life\'s luxuries; you don\'t need to depend on anyone for your security. In love, this suggests valuing your independence, attracting partnership from fullness rather than need, or taking time to enjoy being complete in yourself. In career, you\'ve achieved a level of success that allows enjoyment; you can appreciate quality and refinement. The message: savor what you\'ve built. You\'ve earned this abundance.',
      meaningKo: '펜타클 9는 풍성한 정원에 서 있는 우아한 인물을 보여주며, 손목에 매, 익은 포도와 황금 동전에 둘러싸여 있습니다—세련된 풍요와 자급자족 성공의 모습입니다. 이 여성은 규율과 노력을 통해 자신만의 낙원을 건설했고, 이제 그 안에 서서 다른 사람이 제공할 필요 없이 보상을 즐깁니다. 이것은 상속이 아닌 개인적 성취를 통해 달성된 경제적 독립의 카드입니다. 매는 훈련된 본능을 나타냅니다—그녀는 물질 세계뿐 아니라 자신도 마스터했습니다. 이 카드가 나타나면 자율성과 잘 얻은 성공을 축하합니다. 인생의 럭셔리를 즐길 자원이 있습니다; 안정을 위해 누구에게도 의존할 필요가 없습니다. 사랑에서 이것은 독립을 가치 있게 여기고, 필요가 아닌 충만함에서 파트너십을 끌어들이거나, 자신 안에서 완전하다는 것을 즐기는 시간을 갖는 것을 시사합니다. 직업에서 즐길 수 있는 수준의 성공을 달성했습니다; 품질과 세련됨을 감상할 수 있습니다. 메시지: 쌓은 것을 음미하세요. 이 풍요를 얻었습니다.'
    },
    reversed: {
      keywords: ['Financial dependency', 'Superficiality', 'Over-spending', 'Living beyond means', 'Hustling'],
      keywordsKo: ['경제적 의존', '피상성', '과소비', '분수에 넘치는 생활', '발버둥'],
      advice: 'Live within your means. True abundance is sustainable.',
      adviceKo: '분수에 맞게 살아가세요. 진정한 풍요는 지속 가능합니다.',
      meaning: 'The reversed Nine of Pentacles shows the garden withering, the falcon flying away, or the elegant figure revealed to be living on borrowed means. Independence is compromised—either through financial dependence on others, overspending that outpaces resources, or presenting a lifestyle that isn\'t genuinely yours. Perhaps you\'re hustling endlessly without ever pausing to enjoy what you\'ve earned. Or the success is hollow, bought at too high a price of isolation or workaholism. The luxury may be genuine but joyless, achieved through sacrifice of things that matter more than money. In love, you may be financially dependent in a way that compromises your autonomy, or so focused on independence that you\'ve become isolated. You might be attracted to relationships for security rather than genuine connection. In career, success is either eluding you, or you\'ve achieved it without the satisfaction it promised. Living beyond your means creates stress that undermines the abundance you\'re trying to project. The message: examine whether your success is genuine and sustainable, and whether you\'re actually enjoying what you\'ve built.',
      meaningKo: '역방향 펜타클 9는 정원이 시들거나, 매가 날아가거나, 우아한 인물이 빌린 수단으로 살고 있음이 드러나는 것을 보여줍니다. 독립이 손상되었습니다—다른 사람에 대한 경제적 의존, 자원을 초과하는 과소비, 또는 진정으로 당신 것이 아닌 생활 방식을 표현하는 것을 통해. 아마도 번 것을 즐기기 위해 멈추지 않고 끊임없이 발버둥치고 있을 것입니다. 또는 성공이 공허하고, 고립이나 일중독의 너무 높은 대가를 치르고 얻었습니다. 럭셔리는 진짜일 수 있지만 기쁨이 없고, 돈보다 더 중요한 것의 희생을 통해 달성되었습니다. 사랑에서 자율성을 손상시키는 방식으로 경제적으로 의존하거나, 독립에 너무 집중해서 고립되었을 수 있습니다. 진정한 연결보다 안정을 위해 관계에 끌릴 수 있습니다. 직업에서 성공이 당신을 피하거나, 약속한 만족 없이 달성했습니다. 분수에 넘치게 사는 것은 투사하려는 풍요를 훼손하는 스트레스를 만듭니다. 메시지: 성공이 진짜이고 지속 가능한지, 쌓은 것을 실제로 즐기고 있는지 검토하세요.'
    }
  },
  {
    id: 73,
    name: 'Ten of Pentacles',
    nameKo: '펜타클 10',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/73.jpg',
    upright: {
      keywords: ['Wealth', 'Family', 'Legacy', 'Inheritance', 'Long-term security'],
      keywordsKo: ['부', '가족', '유산', '상속', '장기적 안정'],
      advice: 'Build a lasting legacy. Think generationally.',
      adviceKo: '지속적인 유산을 쌓으세요. 세대를 넘어 생각하세요.',
      meaning: 'The Ten of Pentacles depicts a multigenerational family scene—an elderly patriarch, an adult couple, a child, and dogs—all gathered within an archway decorated with ten golden coins arranged in the Tree of Life pattern. This is the ultimate card of material completion: wealth that spans generations, legacy that outlasts individual lives, the culmination of long-term security building. When this card appears, it speaks to established abundance, family support systems, and the fruits of decisions made generations ago. You may be benefiting from inherited advantages, building something your descendants will enjoy, or simply experiencing the deep security of belonging to a stable, prosperous community. This isn\'t just money—it\'s roots, traditions, homes that hold memories, businesses built over decades. In love, this card indicates family approval, creating home together, or relationship as a foundation for generational continuity. In career, it signals lasting success, family business, retirement security, or work that creates enduring legacy. The message: true wealth isn\'t just what you accumulate but what you can pass on.',
      meaningKo: '펜타클 10은 다세대 가족 장면을 묘사합니다—노인 가장, 성인 부부, 아이, 그리고 개들—생명나무 패턴으로 배열된 열 개의 황금 동전으로 장식된 아치길 안에 모여 있습니다. 이것은 물질적 완성의 궁극적인 카드입니다: 세대를 아우르는 부, 개인의 삶보다 오래 지속되는 유산, 장기적 안정 구축의 정점. 이 카드가 나타나면 확립된 풍요, 가족 지원 시스템, 세대 전에 내린 결정의 열매에 대해 말합니다. 물려받은 이점의 혜택을 받거나, 후손이 즐길 무언가를 쌓거나, 단순히 안정적이고 번영하는 공동체에 속하는 깊은 안정을 경험하고 있을 수 있습니다. 이것은 단순히 돈이 아닙니다—뿌리, 전통, 추억을 담은 집, 수십 년에 걸쳐 세운 사업입니다. 사랑에서 이 카드는 가족 승인, 함께 가정을 만드는 것, 또는 세대 연속성의 기반으로서의 관계를 나타냅니다. 직업에서 지속적인 성공, 가족 사업, 은퇴 안정, 또는 지속적인 유산을 만드는 일을 신호합니다. 메시지: 진정한 부는 축적하는 것뿐만 아니라 물려줄 수 있는 것입니다.'
    },
    reversed: {
      keywords: ['Family disputes', 'Financial failure', 'Loss of inheritance', 'Instability', 'Breaking tradition'],
      keywordsKo: ['가족 분쟁', '재정 실패', '상속 손실', '불안정', '전통 깨기'],
      advice: 'Resolve family financial conflicts. Protect your legacy.',
      adviceKo: '가족 재정 갈등을 해결하세요. 유산을 보호하세요.',
      meaning: 'The reversed Ten of Pentacles shows the family fracturing, the inheritance being lost, the legacy crumbling. When this card appears reversed, generational wealth is at risk—through family disputes, poor financial decisions, or circumstances beyond anyone\'s control. Perhaps an inheritance is being contested, a family business is failing, or the traditions that once held everyone together are breaking apart. Money becomes a source of conflict rather than security. Alternatively, this reversal may indicate conscious rejection of family legacy—walking away from an inheritance that comes with too many strings, breaking from traditions that no longer serve you, choosing to build your own path rather than follow the one laid out by ancestors. In love, family disapproval may be complicating things, or financial stress is straining the relationship. You may be questioning whether to stay within family expectations or forge your own way. In career, business failures, loss of security, or the burden of family expectations weighs heavily. The message: examine what you\'ve inherited—both the gifts and the burdens—and decide consciously what legacy you want to carry forward.',
      meaningKo: '역방향 펜타클 10은 가족이 분열되고, 상속이 상실되고, 유산이 무너지는 것을 보여줍니다. 이 카드가 역방향으로 나타나면 세대의 부가 위험에 처합니다—가족 분쟁, 잘못된 재정 결정, 또는 누구의 통제도 벗어난 상황을 통해. 아마도 상속이 다투어지거나, 가족 사업이 실패하거나, 한때 모두를 함께 묶었던 전통이 무너지고 있을 것입니다. 돈이 안정의 원천이 아닌 갈등의 원천이 됩니다. 또는 이 역방향은 가족 유산의 의식적 거부를 나타낼 수 있습니다—너무 많은 조건이 따르는 상속에서 벗어나거나, 더 이상 도움이 되지 않는 전통에서 깨거나, 조상이 깔아둔 길을 따르기보다 자신만의 길을 쌓기로 선택하는 것. 사랑에서 가족의 불승인이 일을 복잡하게 만들거나, 재정적 스트레스가 관계에 긴장을 주고 있습니다. 가족 기대 안에 머물지 자신만의 길을 개척할지 고민하고 있을 수 있습니다. 직업에서 사업 실패, 안정 상실, 또는 가족 기대의 부담이 무겁게 짓누릅니다. 메시지: 물려받은 것—선물과 부담 모두—을 검토하고 어떤 유산을 이어갈지 의식적으로 결정하세요.'
    }
  },
  {
    id: 74,
    name: 'Page of Pentacles',
    nameKo: '펜타클 시종',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/74.jpg',
    upright: {
      keywords: ['New opportunity', 'Manifestation', 'Diligence', 'Learning', 'A student'],
      keywordsKo: ['새 기회', '실현', '근면', '학습', '학생'],
      advice: 'Approach opportunities with eagerness to learn.',
      adviceKo: '배우려는 열의로 기회에 접근하세요.',
      meaning: 'The Page of Pentacles stands in a green field, carefully studying a single golden coin held aloft—the beginner\'s approach to material manifestation. This youthful figure represents the student of practical matters: someone learning about money, health, craft, or any skill that creates tangible results. Unlike the other Pages who might act impulsively, the Page of Pentacles is studious and methodical. They plan before acting. They research before investing. This card signals a new opportunity in the material realm—perhaps a course of study, a job opportunity, a chance to learn a valuable skill, or the beginning of a project that could grow into something substantial. The Page reminds us that all material mastery begins with humble learning. In love, this suggests approaching relationship with the willingness to learn, or someone new entering your life who is grounded and practical. In career, new educational opportunities, entry-level positions with growth potential, or the beginning of skill development are indicated. The message: approach this opportunity with the seriousness of a student who knows this knowledge will become the foundation of future success.',
      meaningKo: '펜타클 시종은 녹색 들판에 서서 높이 든 황금 동전 하나를 주의 깊게 연구합니다—물질적 실현에 대한 초심자의 접근 방식입니다. 이 젊은 인물은 실용적 문제의 학생을 나타냅니다: 돈, 건강, 기술, 또는 실질적인 결과를 만드는 모든 기술에 대해 배우는 사람. 충동적으로 행동할 수 있는 다른 시종과 달리, 펜타클 시종은 학구적이고 체계적입니다. 그들은 행동하기 전에 계획합니다. 투자하기 전에 조사합니다. 이 카드는 물질 영역에서의 새로운 기회를 신호합니다—아마도 학업 과정, 취업 기회, 가치 있는 기술을 배울 기회, 또는 상당한 것으로 자랄 수 있는 프로젝트의 시작. 시종은 모든 물질적 숙련이 겸손한 학습에서 시작된다는 것을 상기시킵니다. 사랑에서 이것은 배우려는 의지로 관계에 접근하거나, 현실적이고 실용적인 새로운 사람이 삶에 들어오는 것을 시사합니다. 직업에서 새로운 교육 기회, 성장 잠재력이 있는 초급 직위, 또는 기술 개발의 시작이 나타납니다. 메시지: 이 지식이 미래 성공의 기반이 될 것을 아는 학생의 진지함으로 이 기회에 접근하세요.'
    },
    reversed: {
      keywords: ['Lack of progress', 'Procrastination', 'Laziness', 'Missed opportunity', 'Poor planning'],
      keywordsKo: ['진전 부족', '미루기', '게으름', '놓친 기회', '계획 부족'],
      meaning: 'The reversed Page of Pentacles shows the student distracted, the coin dropped, the opportunity missed. Perhaps procrastination has prevented you from taking advantage of a chance for material advancement. Maybe you\'re so lost in planning that you never actually begin. The practical diligence this page represents has become either paralysis or laziness—you know what you should be doing but can\'t seem to start. Alternatively, this reversal may indicate someone who is too focused on material gain at the expense of other values, or who is studying endlessly without ever applying knowledge practically. In love, you may be over-thinking rather than experiencing, or material concerns are blocking emotional availability. Someone may seem promising but lacks follow-through. In career, opportunities are being missed due to poor planning or lack of motivation. You may be in a learning phase that isn\'t leading anywhere, or resisting the practical work required for advancement. The message: examine what\'s blocking you from taking action on the opportunities before you. What would help you actually begin?',
      meaningKo: '역방향 펜타클 시종은 산만한 학생, 떨어뜨린 동전, 놓친 기회를 보여줍니다. 아마도 미루기가 물질적 발전의 기회를 활용하는 것을 막았을 것입니다. 아마도 계획에 너무 몰두해서 실제로 시작하지 못합니다. 이 시종이 나타내는 실용적 근면함이 마비 또는 게으름이 되었습니다—해야 할 것을 알지만 시작할 수 없는 것 같습니다. 또는 이 역방향은 다른 가치를 희생하면서 물질적 이득에 너무 집중하거나, 지식을 실제로 적용하지 않고 끝없이 공부하는 사람을 나타낼 수 있습니다. 사랑에서 경험하기보다 과도하게 생각하거나, 물질적 우려가 감정적 가용성을 막고 있을 수 있습니다. 누군가 유망해 보이지만 후속 조치가 부족할 수 있습니다. 직업에서 열악한 계획이나 동기 부족으로 기회를 놓치고 있습니다. 어디로도 이어지지 않는 학습 단계에 있거나, 발전에 필요한 실용적 작업에 저항하고 있을 수 있습니다. 메시지: 눈앞의 기회에 대해 행동하는 것을 막고 있는 것을 검토하세요. 실제로 시작하는 데 무엇이 도움이 될까요?',
      advice: 'What is blocking you from beginning? Stop planning and start doing.',
      adviceKo: '시작하는 것을 막고 있는 것이 무엇인가요? 계획을 멈추고 행동을 시작하세요.'
    }
  },
  {
    id: 75,
    name: 'Knight of Pentacles',
    nameKo: '펜타클 기사',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/75.jpg',
    upright: {
      keywords: ['Hard work', 'Responsibility', 'Routine', 'Diligence', 'Methodical'],
      keywordsKo: ['근면', '책임감', '루틴', '성실', '체계적'],
      advice: 'Stay steady and methodical. Consistency brings results.',
      adviceKo: '꾸준하고 체계적으로 하세요. 일관성이 결과를 가져옵니다.',
      meaning: 'The Knight of Pentacles sits atop a sturdy draft horse, both unmoving, both looking at a single pentacle in the knight\'s hand—the slowest, most methodical of all the knights. While other knights charge ahead, this one stands firm, planning each step carefully before moving. This is the energy of reliable diligence, the worker who shows up every day, the person who achieves goals through persistence rather than brilliance. The Knight of Pentacles doesn\'t take shortcuts; they do things right even when no one is watching. This may seem boring compared to the other knights, but this is how lasting success is built—through routine, responsibility, and methodical progress. In love, this card represents the reliable partner, perhaps not thrillingly romantic but deeply dependable. It suggests building relationship through consistent care rather than grand gestures. In career, steady hard work is the path forward; don\'t expect quick results, but trust that daily effort compounds into significant achievement. The message: there\'s honor in the unglamorous work of showing up every day and doing what needs to be done, well.',
      meaningKo: '펜타클 기사는 튼튼한 짐마 위에 앉아, 둘 다 움직이지 않고, 둘 다 기사 손에 있는 펜타클 하나를 바라봅니다—모든 기사 중 가장 느리고 가장 체계적입니다. 다른 기사들이 앞으로 돌진하는 동안, 이 기사는 움직이기 전에 각 단계를 신중히 계획하며 단단히 서 있습니다. 이것은 신뢰할 수 있는 근면의 에너지, 매일 나타나는 일꾼, 뛰어남보다 끈기를 통해 목표를 달성하는 사람입니다. 펜타클 기사는 지름길을 택하지 않습니다; 아무도 보지 않을 때도 일을 제대로 합니다. 다른 기사들에 비해 지루해 보일 수 있지만, 이것이 지속적인 성공이 쌓이는 방법입니다—루틴, 책임감, 체계적 진전을 통해. 사랑에서 이 카드는 신뢰할 수 있는 파트너를 나타냅니다, 아마도 스릴 넘치게 로맨틱하지는 않지만 깊이 신뢰할 수 있는. 웅장한 제스처보다 일관된 돌봄을 통해 관계를 쌓는 것을 시사합니다. 직업에서 꾸준한 근면이 앞으로 나아가는 길입니다; 빠른 결과를 기대하지 말고, 일상의 노력이 상당한 성취로 복리되는 것을 신뢰하세요. 메시지: 매일 나타나서 해야 할 일을 잘하는 화려하지 않은 작업에는 명예가 있습니다.'
    },
    reversed: {
      keywords: ['Boredom', 'Stagnation', 'Perfectionism', 'Unadventurous', 'Feeling stuck'],
      keywordsKo: ['지루함', '정체', '완벽주의', '모험 부족', '갇힌 느낌'],
      advice: 'Break the monotony. Don\'t let perfectionism stop progress.',
      adviceKo: '단조로움을 깨세요. 완벽주의가 진전을 막지 않게 하세요.',
      meaning: 'The reversed Knight of Pentacles shows the methodical approach becoming stagnation—the knight has stopped moving entirely, the routine has become a rut, the careful planning has become paralysis. Perhaps you\'re so focused on getting things perfect that you never finish anything. Maybe the steady work has become boring drudgery that you\'re going through the motions of without real engagement. The reliability that serves so well can become inability to adapt, resistance to any risk, or stubborn refusal to change course even when it\'s clearly needed. You may be feeling stuck in a job that offers security but no growth, a relationship that\'s stable but lifeless. Alternatively, this reversal may indicate someone who lacks follow-through, who starts practical projects but never completes them, or who is unreliable despite appearing dependable. In love, the relationship may have become routine without passion. In career, you\'re either stuck in an unfulfilling position or struggling to maintain the consistency your work requires. The message: examine whether your careful approach is building something or just marking time.',
      meaningKo: '역방향 펜타클 기사는 체계적 접근이 정체가 되는 것을 보여줍니다—기사가 완전히 움직임을 멈추었고, 루틴이 구렁이 되었고, 신중한 계획이 마비가 되었습니다. 아마도 완벽하게 하는 데 너무 집중해서 아무것도 끝내지 못할 것입니다. 아마도 꾸준한 작업이 진정한 참여 없이 형식만 따르는 지루한 노역이 되었을 것입니다. 그렇게 잘 봉사하는 신뢰성이 적응하지 못하거나, 어떤 위험도 저항하거나, 명확히 필요할 때도 방향을 바꾸기를 완고하게 거부하는 것이 될 수 있습니다. 안정은 제공하지만 성장이 없는 직장, 안정적이지만 활기 없는 관계에 갇혀 있다고 느낄 수 있습니다. 또는 이 역방향은 후속 조치가 부족하거나, 실용적 프로젝트를 시작하지만 결코 완료하지 않거나, 신뢰할 수 있어 보이지만 신뢰할 수 없는 사람을 나타낼 수 있습니다. 사랑에서 관계가 열정 없이 루틴이 되었을 수 있습니다. 직업에서 불만족스러운 자리에 갇혀 있거나 일이 요구하는 일관성을 유지하기 위해 애쓰고 있습니다. 메시지: 신중한 접근이 무언가를 쌓고 있는지 아니면 그냥 시간을 때우고 있는지 검토하세요.'
    }
  },
  {
    id: 76,
    name: 'Queen of Pentacles',
    nameKo: '펜타클 여왕',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/76.jpg',
    upright: {
      keywords: ['Nurturing', 'Practical', 'Down-to-earth', 'Financial security', 'A working parent'],
      keywordsKo: ['양육', '실용적', '현실적', '재정적 안정', '워킹맘/워킹대디'],
      advice: 'Balance home and work wisely. Nurture while staying practical.',
      adviceKo: '가정과 일의 균형을 현명하게 맞추세요. 실용적이면서 돌보세요.',
      meaning: 'The Queen of Pentacles sits on a throne surrounded by abundance—flowers, fruit, a rabbit at her feet—holding a pentacle on her lap as if it were a child. She represents the nurturing provider, the person who creates both material security and emotional warmth, the parent or partner who makes a house into a home. This queen understands that practical care is love in action: preparing meals, managing finances, creating beautiful spaces, ensuring everyone\'s needs are met. She doesn\'t choose between career and home—she manages both with graceful competence. When this card appears, it celebrates groundedness, domestic skill, and the ability to create abundance that nourishes everyone around you. You may be embodying this nurturing energy or benefiting from someone who does. In love, this represents partnership built on practical support and shared domestic life. Comfort and security are expressions of love. In career, your ability to blend productivity with care for people serves you well; you may be drawn to work that nurtures others or creates tangible comfort. The message: there is profound wisdom in practical care, and creating security for others is a form of love.',
      meaningKo: '펜타클 여왕은 풍요로 둘러싸인 왕좌에 앉아 있습니다—꽃, 과일, 발 아래 토끼—마치 아이처럼 펜타클을 무릎에 안고 있습니다. 그녀는 양육하는 제공자를 나타냅니다, 물질적 안정과 감정적 따뜻함을 모두 만드는 사람, 집을 가정으로 만드는 부모나 파트너. 이 여왕은 실용적 돌봄이 행동하는 사랑이라는 것을 이해합니다: 식사 준비, 재정 관리, 아름다운 공간 만들기, 모든 사람의 필요 충족 보장. 그녀는 직업과 가정 사이에서 선택하지 않습니다—우아한 능력으로 둘 다 관리합니다. 이 카드가 나타나면 현실감, 가정 기술, 주변 모든 사람을 양육하는 풍요를 만드는 능력을 축하합니다. 이 양육하는 에너지를 체현하거나 그런 사람의 혜택을 받고 있을 수 있습니다. 사랑에서 이것은 실용적 지원과 공유된 가정 생활에 기반한 파트너십을 나타냅니다. 편안함과 안정이 사랑의 표현입니다. 직업에서 생산성과 사람에 대한 돌봄을 조화시키는 능력이 도움이 됩니다; 다른 사람을 양육하거나 실질적 편안함을 만드는 일에 끌릴 수 있습니다. 메시지: 실용적 돌봄에는 심오한 지혜가 있고, 다른 사람을 위한 안정을 만드는 것은 사랑의 형태입니다.'
    },
    reversed: {
      keywords: ['Financial insecurity', 'Smothering', 'Work-life imbalance', 'Materialistic', 'Self-care issues'],
      keywordsKo: ['재정 불안', '과보호', '일-삶 불균형', '물질주의', '자기 관리 문제'],
      advice: 'Prioritize self-care. Address work-life imbalance.',
      adviceKo: '자기 관리를 우선시하세요. 일-삶 불균형을 해결하세요.',
      meaning: 'The reversed Queen of Pentacles shows the nurturing energy becoming problematic—either through excess or deficiency. Perhaps you\'re so focused on providing for others that you\'ve neglected your own needs; self-care has fallen by the wayside in the effort to care for everyone else. Or the nurturing has become smothering, controlling what you provide because you want to control those you provide for. The work-life balance has collapsed: you\'re either all work, unable to create the home life you want, or so consumed by domestic responsibilities that your own growth has stalled. Financial insecurity may be creating stress that undermines your ability to provide the stability you want to offer. Alternatively, material comfort may have become the only measure of care—you\'ve become materialistic, valuing things over relationships. In love, codependency or financial stress is straining the relationship. You may be giving too much or receiving too little. In career, work-life balance is suffering, or your nurturing nature is being exploited. The message: examine how you\'re caring for yourself while caring for others. Both matter.',
      meaningKo: '역방향 펜타클 여왕은 양육 에너지가 문제가 되는 것을 보여줍니다—과잉이나 부족을 통해. 아마도 다른 사람을 위해 제공하는 데 너무 집중해서 자신의 필요를 소홀히 했을 것입니다; 다른 모든 사람을 돌보려는 노력에서 자기 관리가 뒷전이 되었습니다. 또는 양육이 과보호가 되어, 제공받는 사람을 통제하고 싶어 제공하는 것을 통제합니다. 일-삶 균형이 무너졌습니다: 원하는 가정 생활을 만들 수 없어 온통 일이거나, 가정 책임에 너무 빠져 자신의 성장이 정체되었습니다. 재정적 불안정이 제공하고 싶은 안정을 훼손하는 스트레스를 만들고 있을 수 있습니다. 또는 물질적 편안함이 돌봄의 유일한 척도가 되었을 수 있습니다—물질주의적이 되어 관계보다 물건을 가치 있게 여깁니다. 사랑에서 상호 의존이나 재정적 스트레스가 관계에 긴장을 주고 있습니다. 너무 많이 주거나 너무 적게 받고 있을 수 있습니다. 직업에서 일-삶 균형이 고통받고 있거나, 양육하는 본성이 이용당하고 있습니다. 메시지: 다른 사람을 돌보면서 자신을 어떻게 돌보고 있는지 검토하세요. 둘 다 중요합니다.'
    }
  },
  {
    id: 77,
    name: 'King of Pentacles',
    nameKo: '펜타클 왕',
    arcana: 'minor',
    suit: 'pentacles',
    image: '/cards/77.jpg',
    upright: {
      keywords: ['Wealth', 'Business', 'Leadership', 'Security', 'Success'],
      keywordsKo: ['부', '사업', '리더십', '안정', '성공'],
      advice: 'Lead with business wisdom. Your success is well-earned.',
      adviceKo: '사업적 지혜로 이끄세요. 당신의 성공은 정당합니다.',
      meaning: 'The King of Pentacles sits on a throne carved with bull heads, robed in grapes and vines, his castle visible behind him, a golden pentacle on his lap—the ultimate embodiment of material mastery. This king has built an empire through practical intelligence, disciplined effort, and wise investment. He doesn\'t just have wealth; he knows how to create, maintain, and grow it. His leadership style is grounded and reliable: he leads by example, values results over words, and provides stable security for those in his domain. When this king appears, he represents the successful business person, the wise investor, the leader who understands that true power is built through sustained practical achievement. In love, this suggests a partner who provides security and stability, who shows love through practical support and reliable presence. The relationship may not be full of drama, but it\'s built on solid ground. In career, business success, financial mastery, and leadership that creates real value are indicated. You may be embodying these qualities or seeking guidance from someone who does. The message: material mastery is achieved through patience, discipline, and the wisdom to build something that lasts.',
      meaningKo: '펜타클 왕은 황소 머리가 조각된 왕좌에 앉아 있고, 포도와 덩굴로 장식된 로브를 입고, 뒤에 성이 보이며, 무릎에 황금 펜타클을 두고 있습니다—물질적 숙련의 궁극적 구현입니다. 이 왕은 실용적 지성, 규율된 노력, 현명한 투자를 통해 제국을 세웠습니다. 그는 단순히 부를 가진 것이 아닙니다; 그것을 만들고, 유지하고, 성장시키는 방법을 알고 있습니다. 그의 리더십 스타일은 현실적이고 신뢰할 수 있습니다: 그는 모범으로 이끌고, 말보다 결과를 가치 있게 여기며, 자신의 영역에 있는 사람들에게 안정적인 안전을 제공합니다. 이 왕이 나타나면 성공한 사업가, 현명한 투자자, 진정한 힘이 지속적인 실질적 성취를 통해 세워진다는 것을 이해하는 리더를 나타냅니다. 사랑에서 이것은 안정과 안전을 제공하고, 실용적 지원과 신뢰할 수 있는 존재를 통해 사랑을 보여주는 파트너를 시사합니다. 관계에 드라마가 가득하지 않을 수 있지만, 단단한 땅 위에 세워져 있습니다. 직업에서 사업 성공, 재정적 숙련, 그리고 진정한 가치를 만드는 리더십이 나타납니다. 이런 자질을 체현하거나 그런 사람에게 지도를 구하고 있을 수 있습니다. 메시지: 물질적 숙련은 인내, 규율, 그리고 지속되는 것을 쌓는 지혜를 통해 달성됩니다.'
    },
    reversed: {
      keywords: ['Greed', 'Materialistic', 'Stubborn', 'Overly cautious', 'Ruthless'],
      keywordsKo: ['탐욕', '물질적', '완고함', '지나친 신중', '무자비'],
      advice: 'Don\'t let greed corrupt your leadership. Balance profit with ethics.',
      adviceKo: '탐욕이 리더십을 부패시키지 않게 하세요. 이익과 윤리의 균형을 맞추세요.',
      meaning: 'The reversed King of Pentacles shows material mastery becoming materialism, wise leadership becoming stubborn tyranny, wealth-building becoming greed. This king has lost his way: the empire exists only for the empire\'s sake, not for the people it should serve. Money has become the only measure of worth. He may be so cautious that opportunities pass him by, or so ruthless that he destroys relationships in pursuit of profit. The stability he offers comes with control; the security comes at the price of freedom. You may be dealing with someone whose financial success has corrupted their character, or you may be examining your own relationship with material success. Has the pursuit of security become an end in itself? Have you become what you set out to escape? In love, material concerns are overshadowing emotional connection. Someone may be controlling through money, or financial stress is revealing unflattering aspects of character. In career, greed, corruption, or being stuck in outdated approaches threatens success. The message: examine whether your material pursuits are serving your life or consuming it.',
      meaningKo: '역방향 펜타클 왕은 물질적 숙련이 물질주의가 되고, 현명한 리더십이 완고한 폭정이 되고, 부 쌓기가 탐욕이 되는 것을 보여줍니다. 이 왕은 길을 잃었습니다: 제국이 봉사해야 할 사람들을 위해서가 아니라 제국 자체를 위해서만 존재합니다. 돈이 가치의 유일한 척도가 되었습니다. 그는 너무 신중해서 기회가 지나가거나, 이익을 추구하며 관계를 파괴할 정도로 무자비할 수 있습니다. 그가 제공하는 안정에는 통제가 따르고; 안전에는 자유의 대가가 따릅니다. 재정적 성공이 성격을 부패시킨 사람을 상대하고 있거나, 물질적 성공과의 자신의 관계를 검토하고 있을 수 있습니다. 안정 추구가 그 자체로 목적이 되었는가? 피하려고 했던 것이 되었는가? 사랑에서 물질적 우려가 감정적 연결을 가리고 있습니다. 누군가 돈을 통해 통제하거나, 재정적 스트레스가 성격의 불리한 면을 드러내고 있을 수 있습니다. 직업에서 탐욕, 부패, 또는 구식 접근에 갇혀 있는 것이 성공을 위협합니다. 메시지: 물질적 추구가 삶에 봉사하고 있는지 아니면 소비하고 있는지 검토하세요.'
    }
  }
].map(card => ({
  ...card,
  image: getCardImagePath(card.id)
})) as Card[];

export default tarotDeck;
