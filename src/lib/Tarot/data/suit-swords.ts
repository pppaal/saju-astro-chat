/**
 * @file Suit of Swords cards (50-63)
 */

import type { RawCard } from './tarot-types';

// Suit of Swords (Ace through King)
export const swordsCards: RawCard[] = [
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
      meaningKo: '소드 3은 상심과 슬픔을 나타냅니다. 연애에서는 이별이나 배신, 신뢰했던 사람에게 실망하는 상황이 올 수 있어요. 직장에서는 비판을 받거나 기대했던 결과가 나오지 않을 때 나타나는 카드예요. 지금은 아프지만, 이 고통이 영원하지는 않아요. 충분히 슬퍼하고 받아들이는 시간이 필요합니다. 상처는 결국 아물고, 그 경험은 당신을 더 강하게 만들 거예요.',
      advice: 'Allow the pain to move through you. Grief honored transforms into wisdom.',
      adviceKo: '지금은 충분히 슬퍼해도 괜찮아요. 시간이 지나면 회복될 거예요.'
    },
    reversed: {
      keywords: ['Releasing pain', 'Optimism', 'Forgiveness', 'Healing', 'Overcoming sorrow'],
      keywordsKo: ['고통 놓기', '낙관', '용서', '치유', '슬픔 극복'],
      meaning: 'The reversed Three of Swords signals the beginning of healing after heartbreak. The swords are being removed from the heart; the storm clouds are parting. You have walked through the worst of the pain and are emerging on the other side. This does not mean forgetting or pretending the hurt did not happen—true healing integrates the experience rather than denying it. Forgiveness becomes possible, whether of others or yourself. The optimism returning is realistic rather than naive; you have learned from this pain and grown stronger. In love, you are ready to open your heart again, or a damaged relationship is beginning to heal through honest communication and renewed commitment. Old heartbreaks release their grip; you stop defining yourself by past wounds. In career, criticism is integrated constructively; setbacks are processed and learned from. Sometimes this card indicates the pain is being suppressed rather than healed—beware of rushing past grief before it has been fully honored. True healing takes time, but it does come. The heart, though scarred, remains capable of love.',
      meaningKo: '역방향 소드 3은 치유가 시작되고 있다는 신호예요. 가장 힘든 시기는 지나갔고 이제 회복 중입니다. 상처를 잊는 게 아니라, 그 경험을 받아들이고 배우는 과정이에요. 연애에서는 다시 마음을 열 준비가 되었거나, 관계가 개선되기 시작해요. 직장에서는 비판을 건설적으로 받아들이고 발전할 수 있어요. 다만 아직 충분히 슬퍼하지 않았다면 성급하게 넘어가지 마세요. 진짜 치유는 시간이 필요해요.',
      advice: 'The swords are being removed. Open your heart to healing and forgiveness.',
      adviceKo: '치유의 시간을 가지세요. 용서와 회복은 천천히 옵니다.'
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
  
];
