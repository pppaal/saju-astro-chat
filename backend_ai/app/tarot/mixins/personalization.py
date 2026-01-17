# backend_ai/app/tarot/mixins/personalization.py
"""
Personalization Mixin
=====================
Tier 4: 개인화 기능 믹스인
- 탄생 카드 계산
- 연간 카드 계산
- 개인화된 리딩
"""

from typing import List, Dict
from datetime import datetime

from ..personalization_data import BIRTH_CARD_MAP, YEAR_THEMES


class PersonalizationMixin:
    """Tier 4: 개인화 기능 믹스인"""

    def calculate_birth_card(self, birthdate: str) -> Dict:
        """
        생년월일로 탄생 카드 계산.

        Args:
            birthdate: 'YYYY-MM-DD' 또는 'YYYYMMDD' 형식

        Returns:
            탄생 카드 정보
        """
        # 날짜 파싱
        clean_date = birthdate.replace('-', '').replace('/', '')
        if len(clean_date) != 8:
            return {'error': 'Invalid date format. Use YYYY-MM-DD or YYYYMMDD'}

        try:
            year = int(clean_date[:4])
            month = int(clean_date[4:6])
            day = int(clean_date[6:8])
        except ValueError:
            return {'error': 'Invalid date'}

        # 숫자 합산
        total = sum(int(d) for d in str(year)) + sum(int(d) for d in str(month)) + sum(int(d) for d in str(day))

        # 22 이하가 될 때까지 축소
        while total > 22:
            total = sum(int(d) for d in str(total))

        # 특별 케이스: 0이면 22로
        if total == 0:
            total = 22

        card_info = BIRTH_CARD_MAP.get(total, BIRTH_CARD_MAP.get(22))

        return {
            'birth_number': total,
            'primary_card': card_info['primary'],
            'secondary_card': card_info.get('secondary'),
            'korean': card_info['korean'],
            'traits': card_info['traits'],
            'message': f"당신의 탄생 카드는 '{card_info['korean']}'입니다. "
                       f"이 카드는 당신의 인생 전반에 걸친 테마와 배울 교훈을 나타냅니다. "
                       f"핵심 특성: {', '.join(card_info['traits'])}",
        }

    def calculate_year_card(self, birthdate: str, target_year: int = None) -> Dict:
        """
        연간 카드 계산 (Personal Year Card).

        Args:
            birthdate: 생년월일 'YYYY-MM-DD'
            target_year: 계산할 연도 (기본: 현재)

        Returns:
            연간 카드 정보
        """
        if target_year is None:
            target_year = datetime.now().year

        # 생일 파싱
        clean_date = birthdate.replace('-', '').replace('/', '')
        month = int(clean_date[4:6])
        day = int(clean_date[6:8])

        # 연간 숫자: 생일 월+일 + 대상 연도
        total = sum(int(d) for d in str(month)) + sum(int(d) for d in str(day)) + sum(int(d) for d in str(target_year))

        # 9 이하로 축소 (연간 사이클은 1-9)
        while total > 9:
            total = sum(int(d) for d in str(total))

        if total == 0:
            total = 9

        year_info = YEAR_THEMES.get(total, YEAR_THEMES.get(9))

        # 연간 카드 매핑
        year_card = BIRTH_CARD_MAP.get(total, BIRTH_CARD_MAP.get(9))

        return {
            'year': target_year,
            'personal_year_number': total,
            'year_card': year_card['primary'],
            'year_card_korean': year_card['korean'],
            'theme': year_info['theme'],
            'korean': year_info['korean'],
            'advice': year_info['advice'],
            'message': f"{target_year}년은 당신에게 '{year_info['korean']}'입니다. "
                       f"테마: {year_info['theme']}. {year_info['advice']}",
        }

    def personalize_reading(self, cards: List[Dict], birthdate: str) -> Dict:
        """
        리딩에 개인화 정보 적용.

        Args:
            cards: 뽑은 카드들
            birthdate: 사용자 생년월일

        Returns:
            개인화된 분석 결과
        """
        birth_card = self.calculate_birth_card(birthdate)
        year_card = self.calculate_year_card(birthdate)

        result = {
            'birth_card': birth_card,
            'year_card': year_card,
            'personal_connections': [],
            'personalized_messages': [],
        }

        # 탄생 카드와 뽑은 카드 연결
        for card in cards:
            card_name = card.get('name', '')

            if card_name == birth_card.get('primary_card'):
                result['personal_connections'].append({
                    'type': 'birth_card_direct',
                    'card': card_name,
                    'message': f"당신의 탄생 카드 '{birth_card.get('korean')}'가 직접 나왔습니다! "
                               f"이 리딩은 당신의 핵심 인생 테마와 깊이 연결되어 있습니다."
                })

            if card_name == birth_card.get('secondary_card'):
                result['personal_connections'].append({
                    'type': 'birth_card_secondary',
                    'card': card_name,
                    'message': f"당신의 보조 탄생 카드가 나왔습니다. "
                               f"잠재된 능력이 드러나고 있습니다."
                })

            if card_name == year_card.get('year_card'):
                result['personal_connections'].append({
                    'type': 'year_card',
                    'card': card_name,
                    'message': f"올해의 카드 '{year_card.get('year_card_korean')}'가 나왔습니다! "
                               f"{year_card.get('theme')}의 에너지가 강하게 작용하고 있습니다."
                })

        # 종합 개인화 메시지
        if result['personal_connections']:
            result['personalized_messages'].append(
                "이 리딩은 당신의 개인 운명 카드와 특별한 연결이 있습니다. "
                "우연이 아닌 운명적인 메시지에 주목하세요."
            )

        return result
