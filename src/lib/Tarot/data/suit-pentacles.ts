/**
 * @file Suit of Pentacles cards (64-77)
 */

import type { RawCard } from './tarot-types';

// Suit of Pentacles (Ace through King)
export const pentaclesCards: RawCard[] = [
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
      advice: 'Find balance between perfectionism and carelessness. Rediscover your passion.',
      adviceKo: '완벽주의와 부주의 사이의 균형을 찾으세요. 열정을 다시 발견하세요.',
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
];
