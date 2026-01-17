/**
 * @file Suit of Cups cards (36-49)
 */

import type { RawCard } from './tarot-types';

// Suit of Cups (Ace through King)
export const cupsCards: RawCard[] = [
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

];
