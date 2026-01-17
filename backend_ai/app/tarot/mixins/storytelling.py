# backend_ai/app/tarot/mixins/storytelling.py
"""
Storytelling Mixin
==================
Tier 6: 스토리텔링 기능 믹스인
- 서사 구조 구축
- 카드 간 전이 생성
- 스토리 톤 결정
"""

from typing import List, Dict

from ..constants import SUIT_INFO, POLARITY_PAIRS, ELEMENT_INTERACTIONS
from ..data import CARD_SYNERGIES
from ..storytelling_data import NARRATIVE_STRUCTURES, CARD_TRANSITIONS


class StorytellingMixin:
    """Tier 6: 스토리텔링 기능 믹스인"""

    def build_narrative_arc(self, cards: List[Dict], context: Dict = None) -> Dict:
        """
        카드로 서사 구조 구축.

        Args:
            cards: 카드 목록
            context: 추가 컨텍스트 (theme, question 등)

        Returns:
            서사 구조
        """
        num_cards = len(cards)
        theme = context.get('theme', 'general') if context else 'general'

        # 카드 수에 따른 구조 선택
        if num_cards <= 3:
            structure = self._build_three_act_structure(cards)
        elif num_cards <= 5:
            structure = self._build_five_act_structure(cards)
        else:
            structure = self._build_hero_journey_structure(cards)

        # 카드 간 전이 생성
        transitions = self._generate_transitions(cards)

        # 테마별 스토리 톤 조정
        tone = self._determine_story_tone(cards, theme)

        return {
            'structure': structure,
            'transitions': transitions,
            'tone': tone,
            'opening_hook': self._create_opening_hook(cards[0] if cards else None),
            'climax': self._identify_climax(cards),
            'resolution': self._create_resolution(cards[-1] if cards else None),
            'full_narrative': self._weave_full_narrative(structure, transitions, tone),
        }

    def _build_three_act_structure(self, cards: List[Dict]) -> Dict:
        """3막 구조 (설정-갈등-해결)"""
        structure = {
            'type': 'three_act',
            'acts': []
        }

        if len(cards) >= 1:
            structure['acts'].append({
                'name': 'Setup (설정)',
                'card': cards[0].get('name'),
                'role': '현재 상황과 배경',
            })

        if len(cards) >= 2:
            structure['acts'].append({
                'name': 'Conflict (갈등)',
                'card': cards[1].get('name') if len(cards) > 1 else None,
                'role': '도전과 장애물',
            })

        if len(cards) >= 3:
            structure['acts'].append({
                'name': 'Resolution (해결)',
                'card': cards[2].get('name') if len(cards) > 2 else None,
                'role': '결과와 지혜',
            })

        return structure

    def _build_five_act_structure(self, cards: List[Dict]) -> Dict:
        """5막 구조 (도입-상승-절정-하강-결말)"""
        acts = [
            ('Exposition (도입)', '상황 소개'),
            ('Rising Action (상승)', '긴장 고조'),
            ('Climax (절정)', '핵심 전환점'),
            ('Falling Action (하강)', '결과 전개'),
            ('Resolution (결말)', '마무리와 교훈'),
        ]

        structure = {
            'type': 'five_act',
            'acts': []
        }

        for i, (name, role) in enumerate(acts):
            if i < len(cards):
                structure['acts'].append({
                    'name': name,
                    'card': cards[i].get('name'),
                    'role': role,
                })

        return structure

    def _build_hero_journey_structure(self, cards: List[Dict]) -> Dict:
        """영웅의 여정 구조 (6장 이상)"""
        journey_stages = [
            ('Ordinary World (일상)', '현재 상태'),
            ('Call to Adventure (소명)', '변화의 부름'),
            ('Threshold (문턱)', '여정의 시작'),
            ('Trials (시련)', '도전과 성장'),
            ('Abyss (심연)', '가장 어두운 순간'),
            ('Transformation (변환)', '핵심 변화'),
            ('Return (귀환)', '새로운 지혜와 함께'),
        ]

        structure = {
            'type': 'hero_journey',
            'korean': '영웅의 여정',
            'acts': []
        }

        for i, (name, role) in enumerate(journey_stages):
            if i < len(cards):
                structure['acts'].append({
                    'name': name,
                    'card': cards[i].get('name'),
                    'role': role,
                })

        return structure

    def _generate_transitions(self, cards: List[Dict]) -> List[Dict]:
        """카드 간 전이 문구 생성"""
        if len(cards) < 2:
            return []

        transitions = []

        for i in range(len(cards) - 1):
            card1 = cards[i]
            card2 = cards[i + 1]

            # 카드 에너지 비교
            transition_type = self._determine_transition_type(card1, card2)
            connector = CARD_TRANSITIONS.get(transition_type, CARD_TRANSITIONS['consequence'])[0]

            transitions.append({
                'from': card1.get('name'),
                'to': card2.get('name'),
                'type': transition_type,
                'connector': connector,
                'meaning': self._explain_transition(card1, card2, transition_type),
            })

        return transitions

    def _determine_transition_type(self, card1: Dict, card2: Dict) -> str:
        """두 카드 사이의 전이 유형 결정"""
        name1 = card1.get('name', '')
        name2 = card2.get('name', '')

        # 극성 대비 체크
        polarity_names = {p[0] for p in POLARITY_PAIRS} | {p[1] for p in POLARITY_PAIRS}
        if name1 in polarity_names and name2 in polarity_names:
            return 'contrast'

        # 숫자 진행 체크
        parsed1 = self._parse_card(card1)
        parsed2 = self._parse_card(card2)

        if parsed1.get('number') and parsed2.get('number'):
            if parsed2['number'] > parsed1['number']:
                return 'time'
            elif parsed2['number'] < parsed1['number']:
                return 'contrast'

        # 같은 슈트면 진행
        if parsed1.get('suit') == parsed2.get('suit'):
            return 'time'

        # 원소 상호작용 체크
        elem1 = parsed1.get('element')
        elem2 = parsed2.get('element')

        if elem1 and elem2:
            interaction = ELEMENT_INTERACTIONS.get((elem1, elem2)) or ELEMENT_INTERACTIONS.get((elem2, elem1))
            if interaction:
                if interaction['type'] == 'conflict':
                    return 'contrast'
                elif interaction['type'] == 'amplify':
                    return 'emphasis'

        return 'consequence'

    def _explain_transition(self, card1: Dict, card2: Dict, transition_type: str) -> str:
        """전이 설명 생성"""
        name1 = card1.get('name', '')
        name2 = card2.get('name', '')

        explanations = {
            'contrast': f"{name1}의 에너지가 {name2}로 전환되며 새로운 관점이 열립니다.",
            'consequence': f"{name1}로 인해 자연스럽게 {name2}의 상황이 펼쳐집니다.",
            'addition': f"{name1}의 에너지에 {name2}가 더해져 힘이 증폭됩니다.",
            'time': f"{name1}에서 {name2}로 시간이 흐르며 상황이 진전됩니다.",
            'condition': f"{name1}의 조건이 충족되면 {name2}가 실현됩니다.",
            'emphasis': f"{name2}가 {name1}의 메시지를 더욱 강조합니다.",
        }

        return explanations.get(transition_type, f"{name1}에서 {name2}로 흐름이 이어집니다.")

    def _determine_story_tone(self, cards: List[Dict], theme: str) -> Dict:
        """스토리 톤 결정"""
        # 카드 에너지 분석
        major_count = sum(1 for c in cards if 'The ' in c.get('name', ''))
        reversed_count = sum(1 for c in cards if c.get('isReversed', False))

        # 특정 카드 체크
        challenging_cards = {'The Tower', 'Death', 'Ten of Swords', 'Three of Swords', 'The Devil'}
        hopeful_cards = {'The Sun', 'The Star', 'Ace of Cups', 'Ten of Cups', 'The World'}

        has_challenge = any(c.get('name', '') in challenging_cards for c in cards)
        has_hope = any(c.get('name', '') in hopeful_cards for c in cards)

        # 톤 결정
        if has_challenge and has_hope:
            tone_type = 'transformative'
            description = '도전을 통한 성장'
            mood = '희망찬 긴장감'
        elif has_challenge:
            tone_type = 'serious'
            description = '진지한 성찰 필요'
            mood = '깊은 통찰'
        elif has_hope:
            tone_type = 'optimistic'
            description = '밝은 전망'
            mood = '기쁨과 축복'
        else:
            tone_type = 'balanced'
            description = '균형잡힌 여정'
            mood = '안정적 진행'

        return {
            'type': tone_type,
            'description': description,
            'mood': mood,
            'major_ratio': major_count / len(cards) if cards else 0,
            'challenge_level': reversed_count / len(cards) if cards else 0,
        }

    def _create_opening_hook(self, first_card: Dict) -> str:
        """오프닝 후크 생성"""
        if not first_card:
            return "당신의 이야기가 시작됩니다..."

        card_name = first_card.get('name', '')
        is_reversed = first_card.get('isReversed', False)

        hooks = {
            'The Fool': "모든 여정은 첫 발걸음에서 시작됩니다. 당신 앞에 무한한 가능성이 펼쳐져 있습니다.",
            'The Magician': "당신에게는 이미 필요한 모든 것이 있습니다. 이제 그것을 어떻게 사용할지가 문제입니다.",
            'The High Priestess': "보이지 않는 곳에 진실이 숨어 있습니다. 귀 기울여 들어보세요.",
            'The Empress': "풍요로움이 당신을 감싸고 있습니다. 그것을 느낄 준비가 되셨나요?",
            'The Tower': "때로는 모든 것이 무너져야 새로운 것이 세워질 수 있습니다.",
            'Death': "끝은 항상 새로운 시작을 품고 있습니다.",
            'The Sun': "빛이 당신을 향해 비추고 있습니다.",
        }

        hook = hooks.get(card_name, f"{card_name}가 당신의 이야기를 열어줍니다.")

        if is_reversed:
            hook = hook.replace('있습니다', '있지만, 아직 막힘이 있습니다')
            hook = hook.replace('비추고', '비추려 하지만 구름이')

        return hook

    def _identify_climax(self, cards: List[Dict]) -> Dict:
        """절정 포인트 식별"""
        if not cards:
            return {}

        # 가장 강렬한 카드 찾기
        climax_candidates = ['The Tower', 'Death', 'The Lovers', 'The Chariot', 'The World', 'Judgement']
        for card in cards:
            if card.get('name') in climax_candidates:
                return {
                    'card': card.get('name'),
                    'position': cards.index(card),
                    'message': f"이 리딩의 핵심 전환점은 '{card.get('name')}'입니다. "
                               f"이 카드의 메시지에 특히 주목하세요."
                }

        # 없으면 중간 카드
        mid_idx = len(cards) // 2
        return {
            'card': cards[mid_idx].get('name') if mid_idx < len(cards) else None,
            'position': mid_idx,
            'message': "리딩의 중심에서 균형점을 찾으세요.",
        }

    def _create_resolution(self, last_card: Dict) -> str:
        """결말 메시지 생성"""
        if not last_card:
            return "당신의 여정은 계속됩니다."

        card_name = last_card.get('name', '')
        is_reversed = last_card.get('isReversed', False)

        resolutions = {
            'The World': "한 사이클이 아름답게 완성됩니다. 다음 여정을 준비하세요.",
            'The Sun': "기쁨과 성공이 당신을 기다리고 있습니다.",
            'Ten of Cups': "사랑하는 이들과 함께 행복을 누리게 됩니다.",
            'The Star': "희망의 빛이 당신을 인도할 것입니다.",
            'Ace of Wands': "새로운 열정과 함께 새 시작이 기다립니다.",
            'Ten of Pentacles': "풍요와 안정이 당신의 것이 됩니다.",
        }

        resolution = resolutions.get(card_name,
                                      f"{card_name}의 에너지로 이 여정의 한 장이 마무리됩니다.")

        if is_reversed:
            resolution += " 다만, 완전한 실현을 위해 아직 작업이 필요합니다."

        return resolution

    def _weave_full_narrative(self, structure: Dict, transitions: List[Dict], tone: Dict) -> str:
        """전체 서사 엮기"""
        narrative_parts = []

        # 서두
        if tone['type'] == 'transformative':
            narrative_parts.append("변화의 바람이 불어옵니다.")
        elif tone['type'] == 'optimistic':
            narrative_parts.append("축복의 에너지가 흐르고 있습니다.")
        elif tone['type'] == 'serious':
            narrative_parts.append("깊은 성찰의 시간입니다.")
        else:
            narrative_parts.append("당신의 이야기가 펼쳐집니다.")

        # 각 막/단계
        for i, act in enumerate(structure.get('acts', [])):
            card = act.get('card', '')
            role = act.get('role', '')
            narrative_parts.append(f"[{act.get('name', '')}] {card}: {role}")

            # 전이 추가
            if i < len(transitions):
                trans = transitions[i]
                narrative_parts.append(f"-> {trans['connector']}...")

        # 마무리
        narrative_parts.append(f"\n이 리딩의 분위기: {tone['mood']}. {tone['description']}.")

        return '\n'.join(narrative_parts)

    def weave_card_connections(self, cards: List[Dict]) -> List[str]:
        """카드 간 연결고리 서술"""
        if len(cards) < 2:
            return []

        connections = []

        for i in range(len(cards) - 1):
            card1 = cards[i].get('name', '')
            card2 = cards[i + 1].get('name', '')

            # 시너지 체크
            synergy_found = False
            for synergy_type, synergies in CARD_SYNERGIES.items():
                for pair_cards, meaning, theme, multiplier in synergies:
                    if card1 in pair_cards and card2 in pair_cards:
                        connection = f"'{card1}'과 '{card2}'가 만나 {meaning}의 에너지를 만들어냅니다."
                        if synergy_type == 'reinforcing':
                            connection += " 강화된 긍정 에너지입니다."
                        elif synergy_type == 'conflicting':
                            connection += " 주의가 필요한 조합입니다."
                        elif synergy_type == 'transforming':
                            connection += " 변환의 에너지가 흐릅니다."
                        connections.append(connection)
                        synergy_found = True
                        break

            if not synergy_found:
                # 일반 연결
                connections.append(f"'{card1}'의 에너지가 '{card2}'로 흘러들어갑니다.")

        return connections
