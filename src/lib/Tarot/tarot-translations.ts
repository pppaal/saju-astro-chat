/**
 * Tarot card translations for i18n support
 * Maps card IDs to translated names, keywords, and meanings
 */

export interface CardTranslation {
  name: string;
  upright: {
    keywords: string[];
    meaning: string;
  };
  reversed: {
    keywords: string[];
    meaning: string;
  };
}

export type TarotTranslations = Record<number, CardTranslation>;

// Korean translations for all 78 tarot cards
export const tarotTranslationsKo: TarotTranslations = {
  // Major Arcana (0-21)
  0: {
    name: '바보',
    upright: {
      keywords: ['시작', '순수함', '자발성', '자유로운 영혼', '모험'],
      meaning: '새로운 여정이 시작되고 있습니다. 순수한 마음으로 두려움 없이 미지의 세계로 나아가세요. 무한한 가능성이 당신에게 열려 있습니다.'
    },
    reversed: {
      keywords: ['무모함', '어리석음', '이용당함', '경솔함', '위험 감수'],
      meaning: '충분한 준비 없이 무모하게 행동하고 있을 수 있습니다. 현실을 직시하지 않은 환상에 기반한 계획은 위험한 결과를 초래할 수 있습니다. 잠시 멈추고 계획을 검토하세요.'
    }
  },
  1: {
    name: '마법사',
    upright: {
      keywords: ['실현', '자원 활용', '힘', '영감받은 행동', '기술'],
      meaning: '당신은 원하는 것을 현실로 만들 수 있는 모든 재능과 능력을 가지고 있습니다. 지금이 아이디어를 행동으로 옮길 때입니다. 자신감을 가지고 시작하세요.'
    },
    reversed: {
      keywords: ['조종', '계획 부족', '발휘되지 않은 재능', '속임', '자신감 부족'],
      meaning: '재능을 잘못된 곳에 사용하거나 다른 사람을 속이려 할 수 있습니다. 또는 자신감 부족으로 인해 아무것도 시작하지 못하고 있을 수 있습니다.'
    }
  },
  2: {
    name: '여사제',
    upright: {
      keywords: ['직관', '신성한 지식', '신성한 여성성', '잠재의식', '지혜'],
      meaning: '직관과 내면의 목소리에 귀 기울이세요. 표면 아래에서 아직 명확하지 않은 일들이 일어나고 있습니다. 당신이 찾는 답은 당신 안에 있습니다.'
    },
    reversed: {
      keywords: ['비밀', '직관과의 단절', '침묵', '숨겨진 의도'],
      meaning: '직관을 무시하고 있거나 누군가가 당신에게 비밀을 숨기고 있을 수 있습니다. 숨겨진 정보나 소문에 주의해야 할 때입니다.'
    }
  },
  3: {
    name: '여황제',
    upright: {
      keywords: ['여성성', '아름다움', '자연', '양육', '풍요'],
      meaning: '이 카드는 풍요, 창의성, 모성적 돌봄을 나타냅니다. 성장과 번영의 시기입니다. 삶이 제공하는 아름다움과 즐거움을 받아들이세요.'
    },
    reversed: {
      keywords: ['창의적 막힘', '타인 의존', '과잉 보호', '공허함', '불안'],
      meaning: '창의적으로 막혀 있거나 타인에게 지나치게 의존하고 있을 수 있습니다. 사랑하는 사람을 과잉 보호하거나 공허함을 느끼지 않도록 주의하세요.'
    }
  },
  4: {
    name: '황제',
    upright: {
      keywords: ['권위', '확립', '구조', '아버지상', '리더십'],
      meaning: '이 카드는 구조, 안정성, 권위를 의미합니다. 명확한 계획으로 상황을 통제하고 규율 있는 행동을 취할 때입니다.'
    },
    reversed: {
      keywords: ['지배', '과도한 통제', '규율 부족', '경직성', '폭정'],
      meaning: '지나치게 통제하려는 사람을 상대하고 있거나, 당신 자신이 너무 경직되어 있을 수 있습니다. 자기 통제력 부족은 혼란을 초래할 수 있습니다.'
    }
  },
  5: {
    name: '교황',
    upright: {
      keywords: ['영적 지혜', '종교적 신념', '순응', '전통', '제도'],
      meaning: '이 카드는 전통, 확립된 제도, 공유된 신념을 나타냅니다. 관습적인 길을 따르거나 신뢰할 수 있는 멘토에게 조언을 구할 때일 수 있습니다.'
    },
    reversed: {
      keywords: ['개인적 신념', '자유', '현상에 도전', '비순응'],
      meaning: '전통에 의문을 제기하고 스스로 생각할 때입니다. 오래된 규칙에서 벗어나 자신만의 길과 신념을 찾으세요.'
    }
  },
  6: {
    name: '연인',
    upright: {
      keywords: ['사랑', '조화', '관계', '가치 정렬', '선택'],
      meaning: '이 카드는 아름다운 연결, 조화, 그리고 내려야 할 선택을 나타냅니다. 당신의 가치가 정렬되어 중요한 관계나 결정으로 이어지고 있습니다.'
    },
    reversed: {
      keywords: ['불화', '불균형', '가치 불일치', '관계 문제'],
      meaning: '관계에 갈등이 있거나 개인적 가치의 불일치가 있을 수 있습니다. 어려운 선택이 내적 또는 외적 갈등을 일으킬 수 있습니다.'
    }
  },
  7: {
    name: '전차',
    upright: {
      keywords: ['통제', '의지력', '승리', '주장', '결단력'],
      meaning: '결단력과 의지력으로 장애물을 극복하고 승리를 거둘 것입니다. 집중하고 통제력을 유지하여 올바른 방향으로 인생을 이끌어 가세요.'
    },
    reversed: {
      keywords: ['통제력 상실', '방향 상실', '공격성', '장애물', '자기 규율'],
      meaning: '방향을 잃거나 통제 대신 공격성으로 행동하고 있을 수 있습니다. 자기 규율 부족으로 장애물이 압도적으로 느껴질 수 있습니다.'
    }
  },
  8: {
    name: '힘',
    upright: {
      keywords: ['힘', '용기', '인내', '통제', '연민'],
      meaning: '이 카드는 내면의 힘, 용기, 연민을 나타냅니다. 무력이 아닌 부드러운 설득과 인내로 도전을 극복할 수 있습니다.'
    },
    reversed: {
      keywords: ['내적 혼란', '나약함', '자기 의심', '자기 통제 부족', '불안'],
      meaning: '자기 의심이나 내면의 힘 부족을 경험하고 있을 수 있습니다. 두려움과 불안이 잠재력 발휘를 방해하고 있습니다.'
    }
  },
  9: {
    name: '은둔자',
    upright: {
      keywords: ['영혼 탐구', '성찰', '혼자됨', '내면의 안내', '지혜'],
      meaning: '성찰하고 내면에서 지혜를 구할 때입니다. 바쁜 세상에서 한 발 물러나 내면의 빛과 안내를 찾으세요.'
    },
    reversed: {
      keywords: ['고립', '외로움', '은둔', '편집증', '반사회적'],
      meaning: '고립되거나 외로움을 느끼고 있을 수 있습니다. 세상에서 너무 물러나지 않도록 주의하세요. 슬픔이나 편집증으로 이어질 수 있습니다.'
    }
  },
  10: {
    name: '운명의 수레바퀴',
    upright: {
      keywords: ['행운', '카르마', '삶의 순환', '운명', '전환점'],
      meaning: '수레바퀴가 당신에게 유리하게 돌아가고 있습니다. 운의 긍정적 변화나 인생의 중요한 전환점을 기대하세요. 주는 대로 받게 됩니다.'
    },
    reversed: {
      keywords: ['불운', '변화에 대한 저항', '순환 깨기', '부정적 외부 힘'],
      meaning: '불운의 시기를 겪거나 불가피한 변화에 저항하고 있을 수 있습니다. 외부 세력이 당신에게 불리하게 작용할 수 있습니다.'
    }
  },
  11: {
    name: '정의',
    upright: {
      keywords: ['정의', '공정함', '진실', '인과응보', '법'],
      meaning: '이 카드는 공정함, 진실, 그리고 행동의 결과를 나타냅니다. 결정은 정당하게 내려질 것입니다. 선택에 책임을 지세요.'
    },
    reversed: {
      keywords: ['불공정', '책임 회피', '부정직', '불의', '법적 분쟁'],
      meaning: '불공정한 상황에 직면하거나 행동에 대한 책임을 회피하고 있을 수 있습니다. 부정직은 부정적 결과를 초래할 수 있습니다.'
    }
  },
  12: {
    name: '매달린 사람',
    upright: {
      keywords: ['일시 정지', '항복', '놓아줌', '새로운 관점', '희생'],
      meaning: '잠시 멈추고 새로운 관점에서 상황을 볼 때입니다. 상황에 순응하고 통제를 놓아 새로운 통찰을 얻으세요.'
    },
    reversed: {
      keywords: ['지연', '저항', '정체', '우유부단', '순교자'],
      meaning: '필요한 일시 정지에 저항하여 지연과 정체를 초래하고 있습니다. 불필요한 희생을 하거나 피해자 역할을 하지 마세요.'
    }
  },
  13: {
    name: '죽음',
    upright: {
      keywords: ['끝', '변화', '변형', '전환', '놓아줌'],
      meaning: '이 카드는 새로운 시작을 위한 중요한 끝을 의미합니다. 이 변형은 삶의 순환에서 필수적인 부분이므로 받아들이세요.'
    },
    reversed: {
      keywords: ['변화에 대한 저항', '집착', '정체', '변화에 대한 두려움', '쇠퇴'],
      meaning: '필요한 끝에 저항하여 정체를 유발하고 새로운 성장을 막고 있습니다. 변화에 대한 두려움이 당신을 과거에 묶어두고 있습니다.'
    }
  },
  14: {
    name: '절제',
    upright: {
      keywords: ['균형', '절제', '인내', '목적', '조화'],
      meaning: '이 카드는 모든 것에서 균형, 인내, 절제를 요구합니다. 조화와 목적을 찾아 차분하고 꾸준한 손으로 인생을 항해하세요.'
    },
    reversed: {
      keywords: ['불균형', '극단', '과잉', '조화 부족', '무모함'],
      meaning: '불균형을 경험하거나 극단으로 치닫고 있을 수 있습니다. 절제 부족이 갈등과 불화를 일으키고 있습니다.'
    }
  },
  15: {
    name: '악마',
    upright: {
      keywords: ['중독', '속박', '물질주의', '무지', '부정적 패턴'],
      meaning: '중독, 부정적 사고, 물질주의에 갇혀 있을 수 있습니다. 자유로워질 힘이 있지만, 먼저 자신의 사슬을 인식해야 합니다.'
    },
    reversed: {
      keywords: ['자유', '초연함', '제한적 신념 해방', '힘 되찾기'],
      meaning: '부정적 패턴과 집착에서 벗어나기 시작하고 있습니다. 당신을 붙잡고 있던 것을 놓아줌으로써 개인의 힘을 되찾고 있습니다.'
    }
  },
  16: {
    name: '탑',
    upright: {
      keywords: ['갑작스러운 변화', '격변', '혼란', '계시', '각성'],
      meaning: '갑작스럽고 극적인 변화가 일어나려 합니다. 혼란스러울 수 있지만, 이 격변은 거짓된 현실을 파괴하고 영적 각성으로 이끄는 데 필요합니다.'
    },
    reversed: {
      keywords: ['변화에 대한 두려움', '재난 회피', '불가피한 것 지연', '파괴에 저항'],
      meaning: '필요한 변화를 피하려 하고 있지만, 이는 불가피한 것을 지연시킬 뿐입니다. 이 변형에 저항하면 고통만 연장됩니다.'
    }
  },
  17: {
    name: '별',
    upright: {
      keywords: ['희망', '믿음', '목적', '갱신', '영성'],
      meaning: '어둠의 시기 후에 희망이 새로워집니다. 이 카드는 평화, 영감, 목적의 감각을 가져옵니다. 미래를 믿으세요.'
    },
    reversed: {
      keywords: ['믿음 부족', '절망', '낙담', '단절', '불안'],
      meaning: '절망감을 느끼거나 목적과의 연결이 끊어졌을 수 있습니다. 절망에 굴복하지 마세요. 빛은 보이지 않아도 여전히 있습니다.'
    }
  },
  18: {
    name: '달',
    upright: {
      keywords: ['환상', '두려움', '불안', '잠재의식', '직관'],
      meaning: '상황이 보이는 것과 다를 수 있습니다. 이 카드는 환상과 잠재의식에서 오는 두려움을 나타냅니다. 직관을 믿어 어둠을 헤쳐나가세요.'
    },
    reversed: {
      keywords: ['두려움 해소', '억압된 감정', '내적 혼란', '진실 드러남'],
      meaning: '두려움을 해소하고 환상 뒤의 진실을 보기 시작하고 있습니다. 억압된 감정이 치유를 위해 표면으로 올라올 수 있습니다.'
    }
  },
  19: {
    name: '태양',
    upright: {
      keywords: ['긍정', '즐거움', '따뜻함', '성공', '활력'],
      meaning: '순수한 기쁨, 성공, 낙관의 카드입니다. 주변의 따뜻함과 긍정성을 받아들이세요. 축하와 활력의 시간입니다.'
    },
    reversed: {
      keywords: ['내면 아이', '우울함', '과도한 낙관', '성공 부족', '비관'],
      meaning: '일시적으로 슬프거나 낙관주의가 비현실적일 수 있습니다. 일시적 좌절이 내면의 빛을 어둡게 하지 않도록 하세요.'
    }
  },
  20: {
    name: '심판',
    upright: {
      keywords: ['심판', '부활', '내면의 부름', '용서', '각성'],
      meaning: '이 카드는 각성과 부활의 순간을 나타냅니다. 중요한 판단을 내리고, 과거를 용서하고, 새로운 의식 수준을 받아들이도록 부름받고 있습니다.'
    },
    reversed: {
      keywords: ['자기 의심', '내면의 비판자', '부름 무시', '우유부단', '죄책감'],
      meaning: '자기 의심이나 지나치게 가혹한 내면의 비판자에 시달리고 있을 수 있습니다. 내면의 부름을 무시하면 후회만 남습니다.'
    }
  },
  21: {
    name: '세계',
    upright: {
      keywords: ['완성', '통합', '성취', '여행', '성취감'],
      meaning: '이 카드는 한 순환의 성공적인 완성을 의미합니다. 목표를 달성하고 성취감과 통합의 상태에 도달했습니다. 성공을 축하하세요.'
    },
    reversed: {
      keywords: ['미완성', '종결 부족', '지름길', '공허함', '미완의 일'],
      meaning: '종결의 부족을 느끼거나 미완성으로 남겨진 지름길을 택했을 수 있습니다. 시작한 것을 완료하지 않으면 공허함을 느낍니다.'
    }
  },
  // Wands (22-35)
  22: {
    name: '완드 에이스',
    upright: {
      keywords: ['영감', '새로운 기회', '성장', '잠재력', '창조'],
      meaning: '영감의 불꽃이나 새로운 기회가 도착했습니다. 순수한 잠재력과 창조적 에너지의 순간입니다. 성장의 기회를 잡으세요.'
    },
    reversed: {
      keywords: ['에너지 부족', '열정 부족', '지연', '창의적 막힘', '놓친 기회'],
      meaning: '영감이 부족하거나 지연에 직면하고 있을 수 있습니다. 창의적 막힘이 새로운 아이디어를 진행하지 못하게 막고 있습니다.'
    }
  },
  23: {
    name: '완드 2',
    upright: {
      keywords: ['미래 계획', '결정하기', '집 떠나기', '파트너십', '진전'],
      meaning: '미래를 계획해야 하는 시점에 있습니다. 안전지대에 머물 것인지 새로운 영역을 탐험할 것인지 선택해야 합니다.'
    },
    reversed: {
      keywords: ['변화에 대한 두려움', '안전하게 가기', '계획 부족', '우유부단', '취소된 계획'],
      meaning: '미지에 대한 두려움이 앞으로 나아가지 못하게 막고 있습니다. 계획 부족이 우유부단이나 여행 취소로 이어질 수 있습니다.'
    }
  },
  24: {
    name: '완드 3',
    upright: {
      keywords: ['확장', '선견지명', '해외 기회', '성장', '모험'],
      meaning: '계획이 진행 중이며 성공의 첫 징후가 보이기 시작합니다. 확장의 시기이며 기대감을 가지고 미래를 바라보세요.'
    },
    reversed: {
      keywords: ['지연', '장애물', '선견지명 부족', '좌절', '실망'],
      meaning: '예상치 못한 지연과 장애물에 직면하고 있습니다. 선견지명 부족으로 계획이 예상대로 진행되지 않을 수 있습니다.'
    }
  },
  25: {
    name: '완드 4',
    upright: {
      keywords: ['축하', '조화', '결혼', '가정', '공동체'],
      meaning: '기쁜 축하, 조화, 안정의 카드입니다. 종종 결혼이나 따뜻한 환영과 같은 행복한 행사를 의미합니다.'
    },
    reversed: {
      keywords: ['지원 부족', '불안정', '환영받지 못함', '가족 문제', '불화'],
      meaning: '가정이나 공동체에 조화가 부족할 수 있습니다. 현재 환경에서 불안정하거나 환영받지 못한다고 느낄 수 있습니다.'
    }
  },
  26: {
    name: '완드 5',
    upright: {
      keywords: ['갈등', '경쟁', '의견 충돌', '긴장', '경쟁의식'],
      meaning: '갈등이나 경쟁의 한가운데 있습니다. 긴장이 있지만, 이 투쟁은 건설적으로 다루면 성장과 더 나은 결과로 이어질 수 있습니다.'
    },
    reversed: {
      keywords: ['갈등 회피', '내적 갈등', '공통점 찾기', '평화', '해결'],
      meaning: '필요한 갈등을 피하거나 의견 충돌을 해결할 방법을 찾고 있습니다. 긴장의 시기 후 평화를 찾는 것을 의미할 수 있습니다.'
    }
  },
  27: {
    name: '완드 6',
    upright: {
      keywords: ['성공', '대중적 인정', '승리', '칭찬', '자신감'],
      meaning: '중요한 승리를 거두었고 노력에 대해 대중의 인정을 받고 있습니다. 이 성공과 칭찬의 순간을 즐기세요.'
    },
    reversed: {
      keywords: ['자만심', '인정 부족', '실패', '실망', '오만'],
      meaning: '인정을 받지 못하거나 최근 실패를 경험했을 수 있습니다. 오만하거나 작은 성공에 도취되지 않도록 주의하세요.'
    }
  },
  28: {
    name: '완드 7',
    upright: {
      keywords: ['도전', '경쟁', '인내', '방어', '입장 고수'],
      meaning: '강한 위치에 있지만 도전에 맞서 방어해야 합니다. 입장을 고수하고 인내하세요. 당신에게 유리한 점이 있습니다.'
    },
    reversed: {
      keywords: ['포기', '압도됨', '탈진', '공격받음', '지는 상황'],
      meaning: '압도당하고 포기하려는 시점에 있습니다. 탈진하거나 공격받는 느낌으로 인해 싸움에서 지고 있을 수 있습니다.'
    }
  },
  29: {
    name: '완드 8',
    upright: {
      keywords: ['속도', '행동', '항공 여행', '움직임', '빠른 변화'],
      meaning: '일들이 빠른 속도로 진행되고 있습니다. 이 카드는 빠른 진전, 소통, 심지어 여행을 나타냅니다. 빠른 변화에 대비하세요.'
    },
    reversed: {
      keywords: ['지연', '좌절', '속도 저하', '의사소통 오류', '변화에 저항'],
      meaning: '좌절스러운 지연과 추진력 상실을 경험하고 있습니다. 의사소통 오류로 인해 일이 느려지고 있습니다.'
    }
  },
  30: {
    name: '완드 9',
    upright: {
      keywords: ['회복력', '용기', '끈기', '마지막 저항', '경계'],
      meaning: '싸움에 지쳤지만 여전히 서 있습니다. 이 카드는 회복력과 목표에 도달하기 전 마지막 도전에 맞설 용기를 나타냅니다.'
    },
    reversed: {
      keywords: ['편집증', '포기', '피로', '방어적', '경계 부족'],
      meaning: '지쳐서 포기 직전입니다. 편집증과 방어적 태도가 다른 사람들을 밀어내고 있을 수 있습니다.'
    }
  },
  31: {
    name: '완드 10',
    upright: {
      keywords: ['부담', '책임', '고된 일', '스트레스', '압도됨'],
      meaning: '너무 많은 책임을 떠안아 이제 부담을 느끼고 있습니다. 결승선에 가깝지만 무게에 압도당하고 있습니다.'
    },
    reversed: {
      keywords: ['놓아줌', '위임', '해방', '부담 나누기', '책임 회피'],
      meaning: '위임하거나 일부 부담을 놓아주는 법을 배우고 있습니다. 그러나 이는 책임을 완전히 회피하고 있음을 의미할 수도 있습니다.'
    }
  },
  32: {
    name: '완드 페이지',
    upright: {
      keywords: ['열정', '탐험', '발견', '자유로운 영혼', '새로운 아이디어'],
      meaning: '이 카드는 창의적 에너지와 열정의 폭발을 나타냅니다. 새로운 아이디어를 탐험하고 열정적인 새로운 모험을 시작할 준비가 되어 있습니다.'
    },
    reversed: {
      keywords: ['창의적 막힘', '방향 부족', '성급함', '영감 부족', '지루함'],
      meaning: '영감이 부족하거나 방향을 잃었을 수 있습니다. 성급한 결정이 창의적 막힘이나 지루함을 초래할 수 있습니다.'
    }
  },
  33: {
    name: '완드 기사',
    upright: {
      keywords: ['에너지', '열정', '모험', '충동성', '행동'],
      meaning: '에너지와 열정으로 가득 차 돌진할 준비가 되어 있습니다. 이 카드는 때로는 충동적이더라도 빠른 행동을 취하고 모험을 받아들이는 것을 나타냅니다.'
    },
    reversed: {
      keywords: ['무모함', '지연', '좌절', '에너지 부족', '성급함'],
      meaning: '무모하게 행동하거나 지연에 좌절하고 있을 수 있습니다. 에너지 부족이 행동을 취하지 못하게 막고 있습니다.'
    }
  },
  34: {
    name: '완드 여왕',
    upright: {
      keywords: ['용기', '자신감', '독립', '사교성', '결단력'],
      meaning: '이 카드는 자신감 있고, 용감하며, 독립적인 사람을 나타냅니다. 결단력이 있고 다른 사람들을 끌어들이는 활기찬 사회적 에너지를 가지고 있습니다.'
    },
    reversed: {
      keywords: ['이기심', '질투', '불안', '요구', '자신감 부족'],
      meaning: '불안감을 느끼거나 질투심으로 행동하고 있을 수 있습니다. 자신감 부족이 요구적이거나 지나치게 공격적으로 만들 수 있습니다.'
    }
  },
  35: {
    name: '완드 왕',
    upright: {
      keywords: ['타고난 리더', '비전', '기업가', '명예', '카리스마'],
      meaning: '이 카드는 카리스마 있고 명예로운 비전가 리더를 나타냅니다. 명확한 비전과 다른 사람들을 따르게 하는 영감을 주는 능력이 있습니다.'
    },
    reversed: {
      keywords: ['오만', '충동성', '무자비함', '높은 기대', '폭정'],
      meaning: '오만하고 충동적인 사람을 상대하고 있을 수 있습니다. 높은 기대와 무자비한 성격은 폭군적 행동으로 이어질 수 있습니다.'
    }
  },
  // Cups (36-49)
  36: {
    name: '컵 에이스',
    upright: {
      keywords: ['사랑', '연민', '창의성', '압도적인 감정', '새로운 관계'],
      meaning: '새로운 감정, 창의성, 사랑의 물결이 당신의 삶으로 흘러들고 있습니다. 새로운 관계의 시작이거나 감정과의 더 깊은 연결입니다.'
    },
    reversed: {
      keywords: ['막힌 감정', '억압된 감정', '공허함', '슬픔', '창의적 막힘'],
      meaning: '감정을 막거나 억압하고 있을 수 있습니다. 이는 공허함이나 창의적 정체로 이어질 수 있습니다.'
    }
  },
  37: {
    name: '컵 2',
    upright: {
      keywords: ['통합된 사랑', '파트너십', '상호 끌림', '연결', '조화'],
      meaning: '이 카드는 상호 사랑과 존중에 기반한 깊은 연결과 파트너십을 나타냅니다. 두 사람 사이의 조화와 강한 유대를 의미합니다.'
    },
    reversed: {
      keywords: ['이별', '불화', '불신', '관계 문제', '불일치'],
      meaning: '관계에 불화나 불균형이 있습니다. 불신이나 가치의 불일치가 갈등으로 이어질 수 있습니다.'
    }
  },
  38: {
    name: '컵 3',
    upright: {
      keywords: ['축하', '우정', '창의성', '공동체', '재회'],
      meaning: '친구들과 공동체와 함께하는 기쁜 축하의 카드입니다. 행복한 재회나 성공적인 협력을 의미합니다.'
    },
    reversed: {
      keywords: ['소문', '고립', '과음', '제3자 간섭', '취소된 축하'],
      meaning: '고립감을 느끼거나 사회적 서클 내의 소문을 다루고 있을 수 있습니다. 과음이나 제3자가 문제를 일으킬 수 있습니다.'
    }
  },
  39: {
    name: '컵 4',
    upright: {
      keywords: ['무관심', '성찰', '단절', '재평가', '놓친 기회'],
      meaning: '무관심하거나 단절된 느낌으로 제공되는 기회를 놓치고 있습니다. 진정으로 중요한 것을 성찰하고 재평가할 때입니다.'
    },
    reversed: {
      keywords: ['갑작스러운 인식', '행복 선택', '도움 수용', '새로운 동기', '기회 포착'],
      meaning: '무관심의 시기에서 벗어나 새로운 기회를 포착할 준비가 되어 있습니다. 새로운 동기가 행복을 선택하도록 이끌고 있습니다.'
    }
  },
  40: {
    name: '컵 5',
    upright: {
      keywords: ['상실', '후회', '실망', '슬픔', '비탄'],
      meaning: '과거의 상실과 실망에 집중하여 여전히 남아있는 긍정적인 것들을 보지 못하고 있습니다. 비탄과 후회의 시간입니다.'
    },
    reversed: {
      keywords: ['극복', '수용', '용서', '평화 찾기', '치유'],
      meaning: '상실을 받아들이고 앞으로 나아갈 준비가 되고 있습니다. 후회를 놓아주면 용서와 치유가 가능합니다.'
    }
  },
  41: {
    name: '컵 6',
    upright: {
      keywords: ['향수', '어린 시절 추억', '재회', '순수함', '친절'],
      meaning: '이 카드는 과거의 행복한 추억으로의 회귀를 나타냅니다. 어린 시절 누군가와의 재회나 순수한 기쁨의 감정을 의미할 수 있습니다.'
    },
    reversed: {
      keywords: ['과거에 갇힘', '극복', '집 떠나기', '장밋빛 안경', '어린 시절 놓아주기'],
      meaning: '과거에 너무 많이 살며 이상화하고 있을 수 있습니다. 옛 추억을 놓아주고 현재와 미래에 집중할 때입니다.'
    }
  },
  42: {
    name: '컵 7',
    upright: {
      keywords: ['선택', '환상', '공상', '희망적 사고', '기회'],
      meaning: '많은 선택에 직면해 있지만 일부는 환상이나 공상일 수 있습니다. 희망적 사고에 주의하고 현실적으로 옵션을 평가하세요.'
    },
    reversed: {
      keywords: ['명확함', '결정하기', '현실 점검', '길 선택', '집중'],
      meaning: '혼란의 시기 후에 명확함을 얻고 확고한 결정을 내릴 준비가 되어 있습니다. 현실 점검이 명확한 길을 선택하는 데 도움이 되었습니다.'
    }
  },
  43: {
    name: '컵 8',
    upright: {
      keywords: ['포기', '떠나기', '실망', '더 많은 것 찾기', '전진'],
      meaning: '더 이상 감정적으로 충족되지 않는 상황에서 떠나기로 선택하고 있습니다. 더 깊은 의미와 목적을 찾는 여정입니다.'
    },
    reversed: {
      keywords: ['변화에 대한 두려움', '나쁜 상황에 머물기', '정체', '우유부단', '복귀'],
      meaning: '불행하게 만드는 상황을 떠나는 것이 두렵습니다. 미지에 대한 두려움이 갇히고 정체된 느낌을 주고 있습니다.'
    }
  },
  44: {
    name: '컵 9',
    upright: {
      keywords: ['소원 성취', '만족', '충족', '감사', '성공'],
      meaning: '"소원 카드"로, 만족, 즐거움, 감정적 성취를 나타냅니다. 소원이 이루어지고 있으며 만족감을 느낄 때입니다.'
    },
    reversed: {
      keywords: ['불만족', '이루어지지 않은 소원', '물질주의', '탐욕', '자만'],
      meaning: '많은 것을 가지고 있음에도 불만족을 느끼고 있습니다. 물질주의나 탐욕이 진정한 행복을 찾는 것을 막고 있을 수 있습니다.'
    }
  },
  45: {
    name: '컵 10',
    upright: {
      keywords: ['신성한 사랑', '행복한 가정', '조화', '성취', '기쁨'],
      meaning: '이 카드는 종종 행복하고 조화로운 가정 생활의 형태로 궁극적인 감정적 성취를 나타냅니다. 영원한 기쁨과 신성한 사랑의 그림입니다.'
    },
    reversed: {
      keywords: ['깨진 가정', '불화', '불행', '불일치한 가치', '관계 문제'],
      meaning: '가족이나 가까운 관계 내에 갈등이나 불화가 있을 수 있습니다. 연결의 단절이 불행을 야기하고 있습니다.'
    }
  },
  46: {
    name: '컵 페이지',
    upright: {
      keywords: ['창의적 기회', '직관', '호기심', '상상력', '사랑의 전령'],
      meaning: '새로운 창의적 또는 감정적 기회가 나타나고 있습니다. 직관에 귀 기울이고 호기심과 열린 마음으로 이 새로운 시작에 접근하세요.'
    },
    reversed: {
      keywords: ['창의적 막힘', '감정적 미성숙', '도피', '불안', '슬픈 소식'],
      meaning: '창의적으로 막히거나 감정적으로 미성숙하게 행동하고 있을 수 있습니다. 도피나 불안이 감정을 직면하지 못하게 막고 있습니다.'
    }
  },
  47: {
    name: '컵 기사',
    upright: {
      keywords: ['로맨스', '매력', '상상력', '제안', '낭만적 몽상가'],
      meaning: '이 카드는 종종 로맨틱한 제안이나 매력적이고 상상력이 풍부한 사람의 등장을 나타냅니다. 마음을 따를 때입니다.'
    },
    reversed: {
      keywords: ['비현실적', '질투', '변덕', '사랑의 실망', '감정 조종'],
      meaning: '감정적으로 조종하거나 비현실적인 사람을 다루고 있을 수 있습니다. 관계에서 질투와 변덕에 주의하세요.'
    }
  },
  48: {
    name: '컵 여왕',
    upright: {
      keywords: ['연민', '평온', '직관적', '양육', '감정적 안정'],
      meaning: '이 카드는 감정을 통제하는 연민적이고 직관적인 사람을 나타냅니다. 감정적 성숙과 양육하는 존재를 의미합니다.'
    },
    reversed: {
      keywords: ['감정적 불안', '공동 의존', '과도한 감정', '의존적', '순교자'],
      meaning: '감정적으로 불안하거나 의존적일 수 있습니다. 과도하게 감정적이거나 공동 의존적인 경향이 관계 문제를 일으킬 수 있습니다.'
    }
  },
  49: {
    name: '컵 왕',
    upright: {
      keywords: ['감정적 균형', '연민', '외교', '통제', '관대함'],
      meaning: '이 카드는 감정을 마스터한 사람을 나타냅니다. 차분하고 현명한 조언을 제공하는 연민적이고 외교적인 리더입니다.'
    },
    reversed: {
      keywords: ['감정 조종', '변덕', '변덕스러움', '냉담함', '신뢰할 수 없음'],
      meaning: '다른 사람을 통제하기 위해 감정 조종을 사용하는 사람에 주의하세요. 이 사람은 변덕스럽고, 냉담하며, 신뢰할 수 없을 수 있습니다.'
    }
  },
  // Swords (50-63)
  50: {
    name: '검 에이스',
    upright: {
      keywords: ['돌파구', '명확함', '예리한 정신', '진실', '새로운 아이디어'],
      meaning: '돌파구의 순간이 새로운 명확함과 이해를 가져옵니다. 이 카드는 강력한 새로운 아이디어나 핵심 진실의 계시를 나타냅니다.'
    },
    reversed: {
      keywords: ['혼란', '의사소통 오류', '명확함 부족', '잘못된 결정', '흐린 판단'],
      meaning: '혼란이나 명확함 부족을 경험하고 있습니다. 의사소통 오류나 흐린 판단이 잘못된 결정으로 이어질 수 있습니다.'
    }
  },
  51: {
    name: '검 2',
    upright: {
      keywords: ['어려운 선택', '우유부단', '교착 상태', '막힌 감정', '휴전'],
      meaning: '어려운 선택에 직면하여 현재 교착 상태에 있습니다. 고통스러운 결정을 피하기 위해 감정을 막고 있을 수 있습니다.'
    },
    reversed: {
      keywords: ['우유부단', '혼란', '정보 과부하', '중간에 갇힘', '불안'],
      meaning: '압도되어 결정을 내리지 못하고 있습니다. 정보 과부하가 혼란과 불안으로 이어지고 있습니다.'
    }
  },
  52: {
    name: '검 3',
    upright: {
      keywords: ['상심', '슬픔', '비탄', '고통스러운 진실', '배신'],
      meaning: '이 카드는 고통스러운 이별, 상심, 또는 슬픈 진실을 나타냅니다. 고통스럽지만, 이 명확함은 치유가 시작되기 위해 필요합니다.'
    },
    reversed: {
      keywords: ['고통 해소', '낙관', '용서', '치유', '슬픔 극복'],
      meaning: '고통스러운 경험에서 회복하기 시작하고 있습니다. 용서와 슬픔을 놓아주는 것이 치유로 가는 첫 단계입니다.'
    }
  },
  53: {
    name: '검 4',
    upright: {
      keywords: ['휴식', '회복', '명상', '성찰', '필요한 휴식'],
      meaning: '도전적인 시기 후에 휴식하고 회복할 때입니다. 명상하고 정신적, 육체적 에너지를 충전하기 위해 휴식을 취하세요.'
    },
    reversed: {
      keywords: ['탈진', '번아웃', '정체', '활동 재개', '강제 휴식'],
      meaning: '번아웃 직전이며 쉬도록 강요받고 있습니다. 더 밀어붙이면 탈진으로 이어질 뿐입니다.'
    }
  },
  54: {
    name: '검 5',
    upright: {
      keywords: ['갈등', '의견 충돌', '경쟁', '패배', '공허한 승리'],
      meaning: '이 카드는 진정한 승자가 없는 갈등을 나타냅니다. 너무 높은 대가를 치르고 얻은 승리로 쓴맛과 소외감을 초래합니다.'
    },
    reversed: {
      keywords: ['화해', '보상', '전진', '용서', '과거의 원한'],
      meaning: '화해하고 보상할 때입니다. 과거의 원한을 놓아주는 것이 갈등에서 벗어나기 위해 필요합니다.'
    }
  },
  55: {
    name: '검 6',
    upright: {
      keywords: ['전환', '전진', '뒤에 남기기', '통과의례', '평화 찾기'],
      meaning: '어려운 상황에서 더 평온한 미래로 이동하고 있습니다. 이 전환은 슬플 수 있지만, 평화를 찾기 위해 필요한 여정입니다.'
    },
    reversed: {
      keywords: ['감정적 짐', '미해결 문제', '변화에 대한 저항', '갇힌 느낌', '문제로 복귀'],
      meaning: '전진하지 못하게 막는 감정적 짐을 지고 있습니다. 변화에 대한 저항이 어려운 곳에 갇히게 만들고 있습니다.'
    }
  },
  56: {
    name: '검 7',
    upright: {
      keywords: ['배신', '속임', '빠져나가기', '절도', '전략'],
      meaning: '이 카드는 속임이나 배신을 경고합니다. 누군가가 뒤에서 전략적으로 행동하고 있거나, 당신이 무언가를 숨기려 하고 있을 수 있습니다.'
    },
    reversed: {
      keywords: ['고백', '들킴', '양심', '진실 직면', '반환'],
      meaning: '비밀이 곧 드러나려 합니다. 고백하고 행동의 결과를 직면할 때입니다.'
    }
  },
  57: {
    name: '검 8',
    upright: {
      keywords: ['갇힌 느낌', '감금', '제한적 신념', '피해자 심리', '제한'],
      meaning: '갇히고 제한되었다고 느끼지만, 이러한 한계는 스스로 부과한 것입니다. 자신의 부정적 생각이 당신을 가두고 있습니다. 스스로를 해방시킬 힘이 있습니다.'
    },
    reversed: {
      keywords: ['해방', '풀려남', '해결책 찾기', '새로운 관점', '통제권 잡기'],
      meaning: '인식된 감옥에서 벗어날 방법을 보기 시작하고 있습니다. 관점을 바꿈으로써 제한적 신념을 해소하고 통제권을 잡고 있습니다.'
    }
  },
  58: {
    name: '검 9',
    upright: {
      keywords: ['불안', '걱정', '두려움', '우울', '악몽'],
      meaning: '이 카드는 깊은 불안, 두려움, 절망을 나타냅니다. 걱정이 밤잠을 설치게 하지만, 이 두려움은 현실보다 마음 속에서 더 심할 수 있습니다.'
    },
    reversed: {
      keywords: ['희망', '도움 요청', '회복', '두려움 직면', '해결책 찾기'],
      meaning: '절망에서 벗어날 방법을 찾기 시작하고 있습니다. 도움을 요청하고 두려움을 직면하는 것이 회복의 첫 단계입니다.'
    }
  },
  59: {
    name: '검 10',
    upright: {
      keywords: ['고통스러운 끝', '배신', '바닥', '패배', '상실'],
      meaning: '이 카드는 고통스러운 끝, 배신, 또는 바닥을 의미합니다. 파괴적이지만, 이것이 마지막 타격이며 이제 올라갈 길밖에 없습니다. 회복이 시작될 수 있습니다.'
    },
    reversed: {
      keywords: ['회복', '부활', '치유', '끝에 저항', '아슬아슬한 고비'],
      meaning: '파괴적인 사건에서 서서히 회복하고 있습니다. 그러나 필요한 끝에 저항하여 고통을 연장할 수도 있습니다.'
    }
  },
  60: {
    name: '검 페이지',
    upright: {
      keywords: ['호기심', '새로운 아이디어', '진실함', '활력', '전령'],
      meaning: '젊은 에너지와 호기심으로 가득 차 새로운 아이디어를 배우고 공유하고 싶어합니다. 이 카드는 지식과 진실에 대한 탐구를 나타냅니다.'
    },
    reversed: {
      keywords: ['소문', '속임', '분산된 에너지', '비꼬는 말', '생각 없는 말'],
      meaning: '소문을 퍼뜨리거나 생각 없이 말하는 것에 주의하세요. 분산된 에너지는 집중력 부족과 비생산적인 소통으로 이어질 수 있습니다.'
    }
  },
  61: {
    name: '검 기사',
    upright: {
      keywords: ['야망', '행동 지향', '빠른 사고', '단호함', '추진력'],
      meaning: '이 카드는 행동에 돌입할 준비가 된 날카롭고 야심 찬 정신을 나타냅니다. 목표를 향해 빠른 속도와 집중력으로 나아가고 있습니다.'
    },
    reversed: {
      keywords: ['무모함', '성급함', '오만함', '공격성', '생각 없는 행동'],
      meaning: '결과를 충분히 생각하지 않고 성급하고 공격적으로 행동하고 있을 수 있습니다. 이 무모한 에너지는 갈등으로 이어질 수 있습니다.'
    }
  },
  62: {
    name: '검 여왕',
    upright: {
      keywords: ['독립', '편견 없는 판단', '명확한 경계', '지적', '정직'],
      meaning: '이 카드는 편견 없는 판단에 의존하는 지적이고 독립적인 사람을 나타냅니다. 명확한 경계가 있고 무엇보다 정직을 중시합니다.'
    },
    reversed: {
      keywords: ['냉담함', '쓴소리', '냉소', '잔인함', '지나친 비판'],
      meaning: '냉담하고 쓴 마음으로 행동하고 있을 수 있습니다. 과거의 고통이 지나치게 비판적이거나 말로 잔인해지게 만들 수 있습니다.'
    }
  },
  63: {
    name: '검 왕',
    upright: {
      keywords: ['지적 권위', '권위', '진실', '명확함', '정의'],
      meaning: '이 카드는 지성과 진실의 권위를 나타냅니다. 논리의 달인이며 명확함과 공정함으로 결정을 내릴 수 있습니다.'
    },
    reversed: {
      keywords: ['조종', '폭군적', '권력 남용', '잔인함', '냉담함'],
      meaning: '다른 사람을 조종하고 통제하기 위해 지성을 사용하는 사람에 주의하세요. 이 권력 남용은 잔인하고 폭군적일 수 있습니다.'
    }
  },
  // Pentacles (64-77)
  64: {
    name: '펜타클 에이스',
    upright: {
      keywords: ['새로운 기회', '번영', '실현', '풍요', '새 직장'],
      meaning: '번영과 풍요를 위한 새로운 기회가 도착했습니다. 이것은 실질적인 성공으로 자랄 수 있는 실현의 씨앗입니다.'
    },
    reversed: {
      keywords: ['놓친 기회', '계획 부족', '탐욕', '재정 불안정', '잘못된 투자'],
      meaning: '계획 부족으로 재정적 기회를 놓쳤을 수 있습니다. 탐욕이나 선견지명 부족이 불안정으로 이어질 수 있습니다.'
    }
  },
  65: {
    name: '펜타클 2',
    upright: {
      keywords: ['균형 잡기', '적응력', '시간 관리', '우선순위', '저글링'],
      meaning: '여러 우선순위를 성공적으로 저글링하고 있습니다. 이 카드는 시간과 자원을 관리하는 데 균형과 적응력의 필요성을 나타냅니다.'
    },
    reversed: {
      keywords: ['압도됨', '잘못된 재정 결정', '혼란', '균형 상실', '힘겨움'],
      meaning: '압도되고 모든 것을 균형 잡기 어려워하고 있습니다. 혼란이 잘못된 재정 결정으로 이어지고 있습니다.'
    }
  },
  66: {
    name: '펜타클 3',
    upright: {
      keywords: ['팀워크', '협력', '학습', '실행', '기술'],
      meaning: '이 카드는 성공적인 협력과 팀워크를 나타냅니다. 고유한 기술을 결합하여 높은 품질의 무언가를 만들고 있습니다.'
    },
    reversed: {
      keywords: ['팀워크 부족', '불화', '저품질 작업', '경쟁', '기술 부족'],
      meaning: '팀워크나 소통 부족이 저조한 결과로 이어지고 있습니다. 팀원 간의 경쟁이 불화를 만들고 있습니다.'
    }
  },
  67: {
    name: '펜타클 4',
    upright: {
      keywords: ['저축', '안전', '통제', '보존', '소유욕'],
      meaning: '소유물과 안전에 단단히 매달리고 있습니다. 이는 안정을 가져오지만, 지나치게 통제적이거나 인색해지지 않도록 주의하세요.'
    },
    reversed: {
      keywords: ['탐욕', '물질주의', '놓아줌', '관대함', '재정 손실'],
      meaning: '물질적 것에 대한 집착을 놓아주거나, 반대로 극도의 탐욕으로 행동하고 있습니다. 예상치 못한 재정 손실을 의미할 수도 있습니다.'
    }
  },
  68: {
    name: '펜타클 5',
    upright: {
      keywords: ['재정 손실', '빈곤', '어려운 시기', '고립', '소외감'],
      meaning: '재정적 어려움과 고립감의 시기를 겪고 있습니다. 도움이 종종 가까이 있다는 것을 기억하세요, 처음에는 보이지 않더라도.'
    },
    reversed: {
      keywords: ['회복', '도움 찾기', '재정 개선', '희망', '어려움의 끝'],
      meaning: '어려운 시기에서 회복하기 시작하고 있습니다. 새로운 기회나 다른 사람의 도움이 재정 개선으로 이어지고 있습니다.'
    }
  },
  69: {
    name: '펜타클 6',
    upright: {
      keywords: ['관대함', '자선', '주고받기', '부 나눔', '균형'],
      meaning: '이 카드는 주고받는 순환을 나타냅니다. 관대함, 자선, 재정 생활에서 건강한 균형 찾기를 의미합니다.'
    },
    reversed: {
      keywords: ['빚', '이기심', '일방적 자선', '조건부', '관대함 남용'],
      meaning: '주고받는 것에 불균형이 있습니다. 빚을 지거나 관대함을 이용당하는 것에 주의하세요.'
    }
  },
  70: {
    name: '펜타클 7',
    upright: {
      keywords: ['인내', '장기적 관점', '지속 가능한 결과', '투자', '인내심'],
      meaning: '열심히 일하고 씨앗을 심었습니다. 이제 투자가 자라기를 기다리는 인내의 시간입니다. 진행 상황을 평가하고 장기 계획을 세우세요.'
    },
    reversed: {
      keywords: ['조급함', '장기 비전 부족', '현명하지 못한 투자', '낭비된 노력', '좌절'],
      meaning: '즉각적인 결과가 없어 조급함을 느끼고 있습니다. 현명하지 못한 투자에 낭비된 노력이 좌절을 야기할 수 있습니다.'
    }
  },
  71: {
    name: '펜타클 8',
    upright: {
      keywords: ['견습', '숙달', '기술 개발', '근면', '세부 지향 작업'],
      meaning: '기술을 마스터하는 데 전념하고 있습니다. 근면한 작업과 세부 사항에 대한 주의를 통해 기술을 개발하고 전문가가 되고 있습니다.'
    },
    reversed: {
      keywords: ['완벽주의', '야망 부족', '평범함', '반복 작업', '집중력 부족'],
      meaning: '완벽주의에 빠지거나, 반대로 평범한 작업으로 이어지는 야망 부족이 있을 수 있습니다. 집중력 부족이 기술 개발을 방해하고 있습니다.'
    }
  },
  72: {
    name: '펜타클 9',
    upright: {
      keywords: ['풍요', '사치', '자급자족', '재정적 독립', '성공 즐기기'],
      meaning: '재정적 독립을 달성하고 이제 노력의 결실을 즐길 수 있습니다. 이 카드는 사치, 자급자족, 그리고 마땅히 받을 성공을 나타냅니다.'
    },
    reversed: {
      keywords: ['재정 의존', '피상성', '과소비', '분수에 넘치는 생활', '허슬'],
      meaning: '분수에 넘치게 살거나 타인에게 재정적으로 의존하고 있을 수 있습니다. 무모한 지출이나 피상적 이득에만 집중하는 것에 주의하세요.'
    }
  },
  73: {
    name: '펜타클 10',
    upright: {
      keywords: ['부', '가족', '유산', '상속', '장기 안정'],
      meaning: '이 카드는 종종 가족의 부와 지속적인 유산의 형태로 장기적 성공의 정점을 나타냅니다. 세대에 걸친 안정과 풍요를 의미합니다.'
    },
    reversed: {
      keywords: ['가족 분쟁', '재정 실패', '상속 손실', '불안정', '전통 깨기'],
      meaning: '가족 재정이나 상속에 관한 분쟁이 있을 수 있습니다. 갑작스러운 손실이나 재정 실패가 불안정을 야기하고 전통에서 단절되게 합니다.'
    }
  },
  74: {
    name: '펜타클 페이지',
    upright: {
      keywords: ['새로운 기회', '실현', '근면', '학습', '학생'],
      meaning: '물질 세계에서 목표를 실현할 새로운 기회가 왔습니다. 배우고 실질적인 것을 만들고자 하는 학생의 근면함으로 접근하세요.'
    },
    reversed: {
      keywords: ['진전 부족', '미루기', '게으름', '놓친 기회', '계획 부족'],
      meaning: '미루기나 계획 부족으로 기회를 놓치고 있습니다. 게으르거나 일할 동기가 부족할 수 있습니다.'
    }
  },
  75: {
    name: '펜타클 기사',
    upright: {
      keywords: ['근면', '책임', '루틴', '근면함', '체계적'],
      meaning: '이 카드는 목표 달성을 위한 근면하고 체계적인 접근을 나타냅니다. 근면한 작업과 루틴을 통해 꾸준한 진전을 이루고 있습니다.'
    },
    reversed: {
      keywords: ['지루함', '정체', '완벽주의', '모험심 부족', '갇힌 느낌'],
      meaning: '지루하거나 단조로운 루틴에 갇힌 느낌입니다. 완벽주의가 세부 사항에 빠지게 하고 추진력을 잃게 할 수 있습니다.'
    }
  },
  76: {
    name: '펜타클 여왕',
    upright: {
      keywords: ['양육', '실용적', '현실적', '재정 안정', '일하는 부모'],
      meaning: '이 카드는 안전하고 편안한 환경을 제공하는 양육하고 실용적인 사람을 나타냅니다. 가정과 일 모두를 관리하는 데 능숙합니다.'
    },
    reversed: {
      keywords: ['재정 불안', '과잉 보호', '일과 삶의 불균형', '물질주의', '자기 관리 문제'],
      meaning: '일과 삶의 불균형으로 힘들거나 재정적으로 불안할 수 있습니다. 지나치게 물질적이 되거나 자기 관리를 소홀히 하지 않도록 주의하세요.'
    }
  },
  77: {
    name: '펜타클 왕',
    upright: {
      keywords: ['부', '사업', '리더십', '안정', '성공'],
      meaning: '이 카드는 물질 세계를 마스터한 야심차고 성공한 리더를 나타냅니다. 사업 수완을 통해 부와 안정을 달성했습니다.'
    },
    reversed: {
      keywords: ['탐욕', '물질주의', '고집', '지나친 신중함', '무자비함'],
      meaning: '지나치게 물질적이고 고집스러운 사람을 다루고 있을 수 있습니다. 탐욕과 이익에 대한 무자비한 집중은 나쁜 리더십으로 이어질 수 있습니다.'
    }
  }
};

// English translations (same as original data, for consistency)
export const tarotTranslationsEn: TarotTranslations = {
  0: { name: 'The Fool', upright: { keywords: ['Beginnings', 'Innocence', 'Spontaneity', 'A free spirit', 'Adventure'], meaning: 'A new journey is beginning. Step forward with a pure heart and without fear of the unknown. Infinite possibilities are open to you.' }, reversed: { keywords: ['Recklessness', 'Folly', 'Being taken advantage of', 'Inconsideration', 'Risk-taking'], meaning: 'You may be acting recklessly without enough preparation. A plan based on fantasy without facing reality could lead to dangerous outcomes. Pause and review your plans.' } },
  1: { name: 'The Magician', upright: { keywords: ['Manifestation', 'Resourcefulness', 'Power', 'Inspired action', 'Skill'], meaning: 'You have all the talents and abilities to make your desires a reality. Now is the time to turn your ideas into action. Begin with confidence.' }, reversed: { keywords: ['Manipulation', 'Poor planning', 'Untapped talents', 'Deception', 'Lack of confidence'], meaning: 'You might be using your talents in the wrong places or trying to deceive others. Alternatively, a lack of confidence might be preventing you from starting anything.' } },
  2: { name: 'The High Priestess', upright: { keywords: ['Intuition', 'Sacred knowledge', 'Divine feminine', 'The subconscious mind', 'Wisdom'], meaning: 'Listen to your intuition and inner voice. There are things happening beneath the surface that are not yet clear. The answers you seek are within you.' }, reversed: { keywords: ['Secrets', 'Disconnected from intuition', 'Withdrawal and silence', 'Hidden agendas'], meaning: 'You may be ignoring your intuition or there may be secrets being kept from you. It is a time to be cautious of hidden information or gossip.' } },
  3: { name: 'The Empress', upright: { keywords: ['Femininity', 'Beauty', 'Nature', 'Nurturing', 'Abundance'], meaning: 'This card represents abundance, creativity, and maternal care. It is a time of growth and prosperity. Embrace the beauty and pleasure life has to offer.' }, reversed: { keywords: ['Creative block', 'Dependence on others', 'Smothering', 'Emptiness', 'Insecurity'], meaning: 'You may feel creatively stifled or overly dependent on others. Be mindful of smothering those you care for or feeling a sense of emptiness.' } },
  4: { name: 'The Emperor', upright: { keywords: ['Authority', 'Establishment', 'Structure', 'A father figure', 'Leadership'], meaning: 'This card signifies structure, stability, and authority. It is a time for disciplined action and taking control of the situation with a clear plan.' }, reversed: { keywords: ['Domination', 'Excessive control', 'Lack of discipline', 'Rigidity', 'Tyranny'], meaning: 'You may be dealing with someone who is overly controlling, or you yourself may be too rigid. A lack of self-control can lead to chaos.' } },
  5: { name: 'The Hierophant', upright: { keywords: ['Spiritual wisdom', 'Religious beliefs', 'Conformity', 'Tradition', 'Institutions'], meaning: 'This card represents tradition, established institutions, and shared beliefs. It may be time to follow a conventional path or seek guidance from a trusted mentor.' }, reversed: { keywords: ['Personal beliefs', 'Freedom', 'Challenging the status quo', 'Non-conformity'], meaning: 'It is time to question traditions and think for yourself. Break free from old rules and find your own path and beliefs.' } },
  6: { name: 'The Lovers', upright: { keywords: ['Love', 'Harmony', 'Relationships', 'Values alignment', 'Choices'], meaning: 'This card represents a beautiful connection, harmony, and a choice that must be made. Your values are aligning, leading to a significant relationship or decision.' }, reversed: { keywords: ['Disharmony', 'Imbalance', 'Misalignment of values', 'Relationship issues'], meaning: 'There may be a conflict in your relationships or a misalignment of personal values. A difficult choice may be causing internal or external strife.' } },
  7: { name: 'The Chariot', upright: { keywords: ['Control', 'Willpower', 'Victory', 'Assertion', 'Determination'], meaning: 'With determination and willpower, you will overcome obstacles and achieve victory. Stay focused and maintain control to steer your life in the right direction.' }, reversed: { keywords: ['Lack of control', 'Lack of direction', 'Aggression', 'Obstacles', 'Self-discipline'], meaning: 'You may be losing direction or acting with aggression instead of control. Obstacles may seem overwhelming due to a lack of self-discipline.' } },
  8: { name: 'Strength', upright: { keywords: ['Strength', 'Courage', 'Patience', 'Control', 'Compassion'], meaning: 'This card represents inner strength, courage, and compassion. You can overcome challenges not with brute force, but with gentle persuasion and patience.' }, reversed: { keywords: ['Inner turmoil', 'Weakness', 'Self-doubt', 'Lack of self-control', 'Insecurity'], meaning: 'You may be experiencing self-doubt or a lack of inner strength. Fear and insecurity are holding you back from achieving your potential.' } },
  9: { name: 'The Hermit', upright: { keywords: ['Soul-searching', 'Introspection', 'Being alone', 'Inner guidance', 'Wisdom'], meaning: 'It is a time for introspection and seeking wisdom from within. Step back from the busy world to find your inner light and guidance.' }, reversed: { keywords: ['Isolation', 'Loneliness', 'Withdrawal', 'Paranoia', 'Being anti-social'], meaning: 'You may be feeling isolated or lonely. Be careful not to withdraw too much from the world, as it could lead to sadness or paranoia.' } },
  10: { name: 'Wheel of Fortune', upright: { keywords: ['Good luck', 'Karma', 'Life cycles', 'Destiny', 'A turning point'], meaning: 'The wheel is turning in your favor. Expect a positive change in luck or a significant turning point in your life. What goes around, comes around.' }, reversed: { keywords: ['Bad luck', 'Resistance to change', 'Breaking cycles', 'Negative external forces'], meaning: 'You may be experiencing a period of bad luck or resisting an inevitable change. External forces may be working against you.' } },
  11: { name: 'Justice', upright: { keywords: ['Justice', 'Fairness', 'Truth', 'Cause and effect', 'Law'], meaning: 'This card represents fairness, truth, and the consequences of your actions. A decision will be made justly. Be accountable for your choices.' }, reversed: { keywords: ['Unfairness', 'Lack of accountability', 'Dishonesty', 'Injustice', 'Legal disputes'], meaning: 'You may be facing an unfair situation or avoiding responsibility for your actions. Dishonesty could lead to negative consequences.' } },
  12: { name: 'The Hanged Man', upright: { keywords: ['Pause', 'Surrender', 'Letting go', 'New perspectives', 'Sacrifice'], meaning: 'It is a time to pause and see things from a new perspective. Surrender to the situation and let go of control to gain new insights.' }, reversed: { keywords: ['Delays', 'Resistance', 'Stalling', 'Indecision', 'Martyrdom'], meaning: 'You are resisting a necessary pause, leading to delays and stagnation. Avoid making a needless sacrifice or playing the victim.' } },
  13: { name: 'Death', upright: { keywords: ['Endings', 'Change', 'Transformation', 'Transition', 'Letting go'], meaning: 'This card signifies a major ending to make way for a new beginning. Embrace this transformation, as it is a necessary part of your life\'s cycle.' }, reversed: { keywords: ['Resistance to change', 'Holding on', 'Stagnation', 'Fear of change', 'Decay'], meaning: 'You are resisting a necessary ending, which is causing stagnation and preventing new growth. Fear of change is holding you in the past.' } },
  14: { name: 'Temperance', upright: { keywords: ['Balance', 'Moderation', 'Patience', 'Purpose', 'Harmony'], meaning: 'This card calls for balance, patience, and moderation in all things. By finding harmony and purpose, you can navigate life with a calm and steady hand.' }, reversed: { keywords: ['Imbalance', 'Extremes', 'Excess', 'Lack of harmony', 'Recklessness'], meaning: 'You may be experiencing imbalance or going to extremes. A lack of moderation is causing conflict and discord in your life.' } },
  15: { name: 'The Devil', upright: { keywords: ['Addiction', 'Bondage', 'Materialism', 'Ignorance', 'Negative patterns'], meaning: 'You may be trapped by addiction, negative thinking, or materialism. You have the power to break free, but first, you must acknowledge your chains.' }, reversed: { keywords: ['Breaking free', 'Detachment', 'Releasing limiting beliefs', 'Reclaiming power'], meaning: 'You are beginning to break free from negative patterns and attachments. By releasing what holds you back, you are reclaiming your personal power.' } },
  16: { name: 'The Tower', upright: { keywords: ['Sudden change', 'Upheaval', 'Chaos', 'Revelation', 'Awakening'], meaning: 'A sudden, dramatic change is about to occur. While it may be chaotic, this upheaval is necessary to destroy a false reality and lead to a spiritual awakening.' }, reversed: { keywords: ['Fear of change', 'Avoiding disaster', 'Delaying the inevitable', 'Resisting destruction'], meaning: 'You are trying to avoid a necessary change, but this only delays the inevitable. Resisting this transformation will only prolong the suffering.' } },
  17: { name: 'The Star', upright: { keywords: ['Hope', 'Faith', 'Purpose', 'Renewal', 'Spirituality'], meaning: 'After a period of darkness, hope is renewed. This card brings a sense of peace, inspiration, and purpose. Have faith in the future.' }, reversed: { keywords: ['Lack of faith', 'Despair', 'Discouragement', 'Disconnection', 'Insecurity'], meaning: 'You may be feeling hopeless or disconnected from your purpose. Do not give in to despair; the light is still there, even if you cannot see it.' } },
  18: { name: 'The Moon', upright: { keywords: ['Illusion', 'Fear', 'Anxiety', 'Subconscious', 'Intuition'], meaning: 'Things may not be as they seem. This card represents illusion and the fears that arise from the subconscious. Trust your intuition to guide you through the darkness.' }, reversed: { keywords: ['Release of fear', 'Repressed emotion', 'Inner confusion', 'Truth revealed'], meaning: 'You are beginning to release your fears and see the truth behind illusions. Repressed emotions may be coming to the surface to be healed.' } },
  19: { name: 'The Sun', upright: { keywords: ['Positivity', 'Fun', 'Warmth', 'Success', 'Vitality'], meaning: 'This is a card of pure joy, success, and optimism. Embrace the warmth and positivity that surrounds you. It is a time of celebration and vitality.' }, reversed: { keywords: ['Inner child', 'Feeling down', 'Overly optimistic', 'Lack of success', 'Pessimism'], meaning: 'You may be feeling temporarily sad or your optimism might be unrealistic. Do not let a temporary setback dim your inner light.' } },
  20: { name: 'Judgement', upright: { keywords: ['Judgement', 'Rebirth', 'Inner calling', 'Absolution', 'Awakening'], meaning: 'This card represents a moment of awakening and rebirth. You are called to make a significant judgment, forgive the past, and embrace a new level of consciousness.' }, reversed: { keywords: ['Self-doubt', 'Inner critic', 'Ignoring the call', 'Indecisiveness', 'Guilt'], meaning: 'You may be plagued by self-doubt or an overly harsh inner critic. Ignoring your inner calling will only lead to regret.' } },
  21: { name: 'The World', upright: { keywords: ['Completion', 'Integration', 'Accomplishment', 'Travel', 'Fulfillment'], meaning: 'This card signifies the successful completion of a cycle. You have achieved your goals and reached a state of fulfillment and integration. Celebrate your success.' }, reversed: { keywords: ['Lack of completion', 'Lack of closure', 'Shortcuts', 'Emptiness', 'Unfinished business'], meaning: 'You may be feeling a lack of closure or have taken shortcuts that left things unfinished. A sense of emptiness comes from not completing what you started.' } },
  22: { name: 'Ace of Wands', upright: { keywords: ['Inspiration', 'New opportunities', 'Growth', 'Potential', 'Creation'], meaning: 'A spark of inspiration or a new opportunity has arrived. This is a moment of pure potential and creative energy. Seize this chance for growth.' }, reversed: { keywords: ['Lack of energy', 'Lack of passion', 'Delays', 'Creative blocks', 'Missed opportunity'], meaning: 'You may be feeling uninspired or facing delays. A creative block is preventing you from moving forward on a new idea.' } },
  23: { name: 'Two of Wands', upright: { keywords: ['Future planning', 'Making decisions', 'Leaving home', 'Partnership', 'Progress'], meaning: 'You are at a point where you need to plan for the future. A choice must be made between staying in your comfort zone and exploring new territories.' }, reversed: { keywords: ['Fear of change', 'Playing it safe', 'Lack of planning', 'Indecision', 'Cancelled plans'], meaning: 'Fear of the unknown is keeping you from moving forward. A lack of planning may lead to indecision or cancelled travel.' } },
  24: { name: 'Three of Wands', upright: { keywords: ['Expansion', 'Foresight', 'Overseas opportunities', 'Growth', 'Adventure'], meaning: 'Your plans are in motion and you are beginning to see the first signs of success. This is a time of expansion and looking toward the future with anticipation.' }, reversed: { keywords: ['Delays', 'Obstacles', 'Lack of foresight', 'Frustration', 'Disappointment'], meaning: 'You are facing unexpected delays and obstacles. A lack of foresight may have led to your plans not working out as expected.' } },
  25: { name: 'Four of Wands', upright: { keywords: ['Celebration', 'Harmony', 'Marriage', 'Home', 'Community'], meaning: 'This is a card of joyful celebration, harmony, and stability. It often signifies a happy event like a wedding or a welcoming home.' }, reversed: { keywords: ['Lack of support', 'Instability', 'Feeling unwelcome', 'Family issues', 'Disharmony'], meaning: 'There may be a lack of harmony in your home or community. You might feel unstable or unwelcome in your current environment.' } },
  26: { name: 'Five of Wands', upright: { keywords: ['Conflict', 'Competition', 'Disagreements', 'Tension', 'Rivalry'], meaning: 'You are in the midst of conflict or competition. While there is tension, this struggle can lead to growth and a better outcome if handled constructively.' }, reversed: { keywords: ['Avoiding conflict', 'Internal conflict', 'Finding common ground', 'Peace', 'Resolution'], meaning: 'You are either avoiding a necessary conflict or have found a way to resolve disagreements. It can signify finding peace after a period of tension.' } },
  27: { name: 'Six of Wands', upright: { keywords: ['Success', 'Public recognition', 'Victory', 'Praise', 'Confidence'], meaning: 'You have achieved a significant victory and are receiving public recognition for your efforts. Enjoy this moment of success and praise.' }, reversed: { keywords: ['Egotism', 'Lack of recognition', 'Failure', 'Disappointment', 'Arrogance'], meaning: 'You may be feeling a lack of recognition or have experienced a recent failure. Be wary of arrogance or letting a small success go to your head.' } },
  28: { name: 'Seven of Wands', upright: { keywords: ['Challenge', 'Competition', 'Perseverance', 'Defensiveness', 'Standing your ground'], meaning: 'You are in a position of strength but must defend it against challenges. Stand your ground and persevere, for you have the advantage.' }, reversed: { keywords: ['Giving up', 'Overwhelmed', 'Exhaustion', 'Being attacked', 'Losing ground'], meaning: 'You feel overwhelmed and are on the verge of giving up. You may be losing ground in a battle due to exhaustion or feeling attacked.' } },
  29: { name: 'Eight of Wands', upright: { keywords: ['Speed', 'Action', 'Air travel', 'Movement', 'Swift change'], meaning: 'Events are moving forward with great speed. This card indicates rapid progress, communication, or even travel. Be ready for swift changes.' }, reversed: { keywords: ['Delays', 'Frustration', 'Slowing down', 'Miscommunication', 'Resisting change'], meaning: 'You are experiencing frustrating delays and a loss of momentum. Things are slowing down, possibly due to miscommunication.' } },
  30: { name: 'Nine of Wands', upright: { keywords: ['Resilience', 'Courage', 'Persistence', 'Last stand', 'Boundaries'], meaning: 'You are weary from battle but still standing. This card represents resilience and the courage to face one final challenge before reaching your goal.' }, reversed: { keywords: ['Paranoia', 'Giving up', 'Fatigue', 'Defensiveness', 'Lack of boundaries'], meaning: 'You are exhausted and on the verge of giving up. Paranoia and defensiveness may be causing you to push others away.' } },
  31: { name: 'Ten of Wands', upright: { keywords: ['Burden', 'Responsibility', 'Hard work', 'Stress', 'Overwhelmed'], meaning: 'You have taken on too much responsibility and are now feeling the burden. While you are close to the finish line, you are overwhelmed by the weight.' }, reversed: { keywords: ['Letting go', 'Delegating', 'Release', 'Sharing the burden', 'Avoiding responsibility'], meaning: 'You are learning to delegate or release some of your burdens. However, it could also mean you are avoiding your responsibilities entirely.' } },
  32: { name: 'Page of Wands', upright: { keywords: ['Enthusiasm', 'Exploration', 'Discovery', 'Free spirit', 'New ideas'], meaning: 'This card represents a burst of creative energy and enthusiasm. You are ready to explore new ideas and embark on a passionate new adventure.' }, reversed: { keywords: ['Creative blocks', 'Lack of direction', 'Haste', 'Feeling uninspired', 'Boredom'], meaning: 'You may be feeling uninspired or have lost your direction. Hasty decisions could lead to creative blocks or a sense of boredom.' } },
  33: { name: 'Knight of Wands', upright: { keywords: ['Energy', 'Passion', 'Adventure', 'Impulsiveness', 'Action'], meaning: 'Full of energy and passion, you are ready to charge forward. This card represents taking swift action and embracing adventure, though sometimes impulsively.' }, reversed: { keywords: ['Recklessness', 'Delays', 'Frustration', 'Lack of energy', 'Haste'], meaning: 'You may be acting with recklessness or feeling frustrated by delays. A lack of energy is preventing you from taking action.' } },
  34: { name: 'Queen of Wands', upright: { keywords: ['Courage', 'Confidence', 'Independence', 'Social butterfly', 'Determination'], meaning: 'This card represents a confident, courageous, and independent person. You are determined and have a vibrant social energy that attracts others.' }, reversed: { keywords: ['Selfishness', 'Jealousy', 'Insecurity', 'Demanding', 'Lack of confidence'], meaning: 'You may be feeling insecure or acting out of jealousy. A lack of confidence can make one demanding or overly aggressive.' } },
  35: { name: 'King of Wands', upright: { keywords: ['Natural-born leader', 'Vision', 'Entrepreneur', 'Honor', 'Charisma'], meaning: 'This card represents a visionary leader who is charismatic and honorable. You have a clear vision and the ability to inspire others to follow you.' }, reversed: { keywords: ['Arrogance', 'Impulsiveness', 'Ruthlessness', 'High expectations', 'Tyranny'], meaning: 'You may be dealing with someone who is arrogant and impulsive. High expectations and a ruthless nature can lead to tyrannical behavior.' } },
  36: { name: 'Ace of Cups', upright: { keywords: ['Love', 'Compassion', 'Creativity', 'Overwhelming emotion', 'New relationship'], meaning: 'A new wave of emotion, creativity, and love is flowing into your life. This is the start of a new relationship or a deeper connection to your feelings.' }, reversed: { keywords: ['Blocked emotions', 'Repressed feelings', 'Emptiness', 'Sadness', 'Creative block'], meaning: 'You may be blocking or repressing your emotions. This can lead to a sense of emptiness or creative stagnation.' } },
  37: { name: 'Two of Cups', upright: { keywords: ['Unified love', 'Partnership', 'Mutual attraction', 'Connection', 'Harmony'], meaning: 'This card represents a deep connection and partnership based on mutual love and respect. It signifies harmony and a strong bond between two people.' }, reversed: { keywords: ['Break-up', 'Disharmony', 'Distrust', 'Relationship troubles', 'Misalignment'], meaning: 'There is a sense of disharmony or imbalance in a relationship. Distrust or a misalignment of values can lead to conflict.' } },
  38: { name: 'Three of Cups', upright: { keywords: ['Celebration', 'Friendship', 'Creativity', 'Community', 'Reunion'], meaning: 'This is a card of joyful celebration with friends and community. It signifies a happy reunion or a successful collaboration.' }, reversed: { keywords: ['Gossip', 'Isolation', 'Overindulgence', 'Third-party interference', 'Cancelled celebration'], meaning: 'You may be feeling isolated or dealing with gossip within your social circle. Overindulgence or a third party could be causing problems.' } },
  39: { name: 'Four of Cups', upright: { keywords: ['Apathy', 'Contemplation', 'Disconnection', 'Re-evaluation', 'Missed opportunity'], meaning: 'You are feeling apathetic or disconnected, causing you to miss opportunities being offered. It is a time for contemplation and re-evaluating what truly matters.' }, reversed: { keywords: ['Sudden awareness', 'Choosing happiness', 'Accepting help', 'New motivation', 'Seizing an opportunity'], meaning: 'You are coming out of a period of apathy and are now ready to seize new opportunities. A newfound motivation is leading you to choose happiness.' } },
  40: { name: 'Five of Cups', upright: { keywords: ['Loss', 'Regret', 'Disappointment', 'Sadness', 'Grief'], meaning: 'You are focusing on past losses and disappointments, which is preventing you from seeing the positive things that still remain. It is a time of grief and regret.' }, reversed: { keywords: ['Moving on', 'Acceptance', 'Forgiveness', 'Finding peace', 'Healing'], meaning: 'You are beginning to accept your losses and are ready to move on. Forgiveness and healing are possible once you let go of regret.' } },
  41: { name: 'Six of Cups', upright: { keywords: ['Nostalgia', 'Childhood memories', 'Reunion', 'Innocence', 'Kindness'], meaning: 'This card represents a return to happy memories from the past. It can signify a reunion with someone from your childhood or a feeling of innocent joy.' }, reversed: { keywords: ['Stuck in the past', 'Moving on', 'Leaving home', 'Rose-tinted glasses', 'Letting go of childhood'], meaning: 'You may be living too much in the past and idealizing it. It is time to let go of old memories and focus on the present and future.' } },
  42: { name: 'Seven of Cups', upright: { keywords: ['Choices', 'Illusion', 'Fantasy', 'Wishful thinking', 'Opportunities'], meaning: 'You are faced with many choices, but some may be illusions or fantasies. Be careful of wishful thinking and evaluate your options realistically.' }, reversed: { keywords: ['Clarity', 'Making a decision', 'Reality check', 'Choosing a path', 'Focus'], meaning: 'After a period of confusion, you are gaining clarity and are ready to make a firm decision. A reality check has helped you choose a clear path.' } },
  43: { name: 'Eight of Cups', upright: { keywords: ['Abandonment', 'Walking away', 'Disappointment', 'Seeking something more', 'Moving on'], meaning: 'You are choosing to walk away from a situation that is no longer emotionally fulfilling. It is a journey of seeking deeper meaning and purpose.' }, reversed: { keywords: ['Fear of change', 'Staying in a bad situation', 'Stagnation', 'Indecision', 'Return'], meaning: 'You are afraid to leave a situation that is making you unhappy. This fear of the unknown is causing you to feel stuck and stagnant.' } },
  44: { name: 'Nine of Cups', upright: { keywords: ['Wishes fulfilled', 'Contentment', 'Satisfaction', 'Gratitude', 'Success'], meaning: 'This is the "wish card," representing contentment, pleasure, and emotional fulfillment. Your wishes are coming true, and it is a time to feel satisfied.' }, reversed: { keywords: ['Dissatisfaction', 'Unfulfilled wishes', 'Materialism', 'Greed', 'Smugness'], meaning: 'You are feeling dissatisfied despite having much. Materialism or greed may be preventing you from finding true happiness.' } },
  45: { name: 'Ten of Cups', upright: { keywords: ['Divine love', 'Happy family', 'Harmony', 'Fulfillment', 'Joy'], meaning: 'This card represents ultimate emotional fulfillment, often in the form of a happy and harmonious family life. It is a picture of lasting joy and divine love.' }, reversed: { keywords: ['Broken family', 'Disharmony', 'Unhappiness', 'Misaligned values', 'Relationship issues'], meaning: 'There may be conflict or disharmony within your family or close relationships. A breakdown in connection is causing unhappiness.' } },
  46: { name: 'Page of Cups', upright: { keywords: ['Creative opportunities', 'Intuition', 'Curiosity', 'Imagination', 'A messenger of love'], meaning: 'A new creative or emotional opportunity is presenting itself. Listen to your intuition and approach this new beginning with curiosity and an open heart.' }, reversed: { keywords: ['Creative blocks', 'Emotional immaturity', 'Escapism', 'Insecurity', 'Sad news'], meaning: 'You may be feeling creatively blocked or acting with emotional immaturity. Escapism or insecurity is preventing you from facing your feelings.' } },
  47: { name: 'Knight of Cups', upright: { keywords: ['Romance', 'Charming', 'Imagination', 'An offer', 'A romantic dreamer'], meaning: 'This card often represents a romantic proposal or the arrival of a charming and imaginative person. It is a time for following your heart.' }, reversed: { keywords: ['Unrealistic', 'Jealousy', 'Moodiness', 'Disappointment in love', 'Emotional manipulation'], meaning: 'You may be dealing with someone who is emotionally manipulative or unrealistic. Be wary of jealousy and moodiness in relationships.' } },
  48: { name: 'Queen of Cups', upright: { keywords: ['Compassion', 'Calm', 'Intuitive', 'Nurturing', 'Emotional stability'], meaning: 'This card represents a compassionate and intuitive person who is in control of their emotions. It signifies emotional maturity and a nurturing presence.' }, reversed: { keywords: ['Emotional insecurity', 'Co-dependency', 'Overly emotional', 'Needy', 'Martyrdom'], meaning: 'You may be feeling emotionally insecure or needy. A tendency to be overly emotional or co-dependent can cause relationship problems.' } },
  49: { name: 'King of Cups', upright: { keywords: ['Emotional balance', 'Compassion', 'Diplomacy', 'Control', 'Generosity'], meaning: 'This card represents a person who has mastered their emotions. He is a compassionate and diplomatic leader who offers calm and wise counsel.' }, reversed: { keywords: ['Emotional manipulation', 'Moodiness', 'Volatility', 'Coldness', 'Untrustworthy'], meaning: 'Be wary of someone who uses emotional manipulation to control others. This person may be moody, cold, and untrustworthy.' } },
  50: { name: 'Ace of Swords', upright: { keywords: ['Breakthrough', 'Clarity', 'Sharp mind', 'Truth', 'New idea'], meaning: 'A moment of breakthrough brings new clarity and understanding. This card represents a powerful new idea or the revelation of a core truth.' }, reversed: { keywords: ['Confusion', 'Miscommunication', 'Lack of clarity', 'Wrong decision', 'Clouded judgment'], meaning: 'You are experiencing confusion or a lack of clarity. Miscommunication or clouded judgment may lead to making the wrong decision.' } },
  51: { name: 'Two of Swords', upright: { keywords: ['Difficult choice', 'Indecision', 'Stalemate', 'Blocked emotions', 'A truce'], meaning: 'You are facing a difficult choice and are currently at a stalemate. You may be blocking your emotions to avoid making a painful decision.' }, reversed: { keywords: ['Indecision', 'Confusion', 'Information overload', 'Stuck in the middle', 'Anxiety'], meaning: 'You are feeling overwhelmed and unable to make a decision. Information overload is leading to confusion and anxiety.' } },
  52: { name: 'Three of Swords', upright: { keywords: ['Heartbreak', 'Sorrow', 'Grief', 'Painful truth', 'Betrayal'], meaning: 'This card represents painful separation, heartbreak, or a sorrowful truth. While painful, this clarity is necessary for healing to begin.' }, reversed: { keywords: ['Releasing pain', 'Optimism', 'Forgiveness', 'Healing', 'Overcoming sorrow'], meaning: 'You are beginning to recover from a painful experience. Forgiveness and letting go of sorrow are the first steps toward healing.' } },
  53: { name: 'Four of Swords', upright: { keywords: ['Rest', 'Recuperation', 'Meditation', 'Contemplation', 'A necessary pause'], meaning: 'It is a time for rest and recovery after a challenging period. Take a break to meditate and recharge your mental and physical energy.' }, reversed: { keywords: ['Exhaustion', 'Burnout', 'Stagnation', 'Resuming activity', 'Forced rest'], meaning: 'You are on the verge of burnout and are being forced to rest. Pushing yourself further will only lead to exhaustion.' } },
  54: { name: 'Five of Swords', upright: { keywords: ['Conflict', 'Disagreement', 'Competition', 'Defeat', 'A hollow victory'], meaning: 'This card represents a conflict where there are no true winners. It signifies a victory won at too high a cost, leading to bitterness and alienation.' }, reversed: { keywords: ['Reconciliation', 'Making amends', 'Moving on', 'Forgiveness', 'Past resentment'], meaning: 'It is a time for reconciliation and making amends. Letting go of past resentments is necessary to move on from conflict.' } },
  55: { name: 'Six of Swords', upright: { keywords: ['Transition', 'Moving on', 'Leaving behind', 'A rite of passage', 'Finding peace'], meaning: 'You are moving away from a difficult situation toward a calmer future. This transition may be sad, but it is a necessary journey to find peace.' }, reversed: { keywords: ['Emotional baggage', 'Unfinished business', 'Resistance to change', 'Feeling stuck', 'Returning to trouble'], meaning: 'You are carrying emotional baggage that is preventing you from moving on. Resistance to change is keeping you stuck in a difficult place.' } },
  56: { name: 'Seven of Swords', upright: { keywords: ['Betrayal', 'Deception', 'Getting away with something', 'Theft', 'Strategy'], meaning: 'This card warns of deception or betrayal. Someone may be acting strategically behind your back, or you may be the one trying to get away with something.' }, reversed: { keywords: ['Confession', 'Getting caught', 'Conscience', 'Facing the truth', 'Returning stolen goods'], meaning: 'A secret is about to be revealed. It is a time for confession and facing the consequences of one\'s actions.' } },
  57: { name: 'Eight of Swords', upright: { keywords: ['Feeling trapped', 'Imprisonment', 'Limiting beliefs', 'Victim mentality', 'Restriction'], meaning: 'You feel trapped and restricted, but these limitations are self-imposed. Your own negative thoughts are holding you prisoner. You have the power to free yourself.' }, reversed: { keywords: ['Breaking free', 'Release', 'Finding solutions', 'New perspective', 'Taking control'], meaning: 'You are beginning to see a way out of your perceived prison. By changing your perspective, you are releasing your limiting beliefs and taking control.' } },
  58: { name: 'Nine of Swords', upright: { keywords: ['Anxiety', 'Worry', 'Fear', 'Depression', 'Nightmares'], meaning: 'This card represents deep anxiety, fear, and despair. Your worries are keeping you up at night, but these fears may be worse in your mind than in reality.' }, reversed: { keywords: ['Hope', 'Reaching out for help', 'Recovery', 'Facing fears', 'Finding solutions'], meaning: 'You are beginning to find a way out of your despair. Reaching out for help and facing your fears is the first step toward recovery.' } },
  59: { name: 'Ten of Swords', upright: { keywords: ['Painful endings', 'Betrayal', 'Rock bottom', 'Defeat', 'Loss'], meaning: 'This card signifies a painful ending, betrayal, or hitting rock bottom. While devastating, this is the final blow, and the only way to go is up. Recovery can now begin.' }, reversed: { keywords: ['Recovery', 'Resurrection', 'Healing', 'Resisting the end', 'A close call'], meaning: 'You are slowly recovering from a devastating event. However, it can also mean you are resisting a necessary ending, only prolonging the pain.' } },
  60: { name: 'Page of Swords', upright: { keywords: ['Curiosity', 'New ideas', 'Truthful', 'Energetic', 'A messenger'], meaning: 'Full of youthful energy and curiosity, you are eager to learn and share new ideas. This card represents a quest for knowledge and truth.' }, reversed: { keywords: ['Gossip', 'Deception', 'Scattered energy', 'Sarcasm', 'Thoughtless words'], meaning: 'Be wary of spreading gossip or speaking without thinking. Scattered energy can lead to a lack of focus and unproductive communication.' } },
  61: { name: 'Knight of Swords', upright: { keywords: ['Ambitious', 'Action-oriented', 'Fast-thinking', 'Assertive', 'Driven'], meaning: 'This card represents a sharp, ambitious mind ready to charge into action. You are driven to pursue your goals with great speed and focus.' }, reversed: { keywords: ['Reckless', 'Hasty', 'Arrogant', 'Aggressive', 'Thoughtless action'], meaning: 'You may be acting with haste and aggression, without fully thinking through the consequences. This reckless energy can lead to conflict.' } },
  62: { name: 'Queen of Swords', upright: { keywords: ['Independent', 'Unbiased judgment', 'Clear boundaries', 'Intelligent', 'Honest'], meaning: 'This card represents an intelligent and independent person who relies on unbiased judgment. You have clear boundaries and value honesty above all.' }, reversed: { keywords: ['Cold', 'Bitter', 'Cynical', 'Cruel', 'Overly critical'], meaning: 'You may be acting with a cold and bitter heart. Past pain can make one overly critical or cruel with their words.' } },
  63: { name: 'King of Swords', upright: { keywords: ['Intellectual power', 'Authority', 'Truth', 'Clarity', 'Justice'], meaning: 'This card represents the authority of intellect and truth. You are a master of logic and can make decisions with clarity and fairness.' }, reversed: { keywords: ['Manipulative', 'Tyrannical', 'Abuse of power', 'Cruel', 'Cold-hearted'], meaning: 'Be wary of someone who uses their intellect to manipulate and control. This abuse of power can be cruel and tyrannical.' } },
  64: { name: 'Ace of Pentacles', upright: { keywords: ['New opportunity', 'Prosperity', 'Manifestation', 'Abundance', 'A new job'], meaning: 'A new opportunity for prosperity and abundance has arrived. This is a seed of manifestation that can grow into tangible success.' }, reversed: { keywords: ['Lost opportunity', 'Lack of planning', 'Greed', 'Financial instability', 'Poor investment'], meaning: 'You may have missed a financial opportunity due to poor planning. Greed or a lack of foresight can lead to instability.' } },
  65: { name: 'Two of Pentacles', upright: { keywords: ['Balancing', 'Adaptability', 'Time management', 'Prioritizing', 'Juggling'], meaning: 'You are successfully juggling multiple priorities. This card represents the need for balance and adaptability in managing your time and resources.' }, reversed: { keywords: ['Overwhelmed', 'Poor financial decisions', 'Disorganization', 'Losing balance', 'Struggling'], meaning: 'You are feeling overwhelmed and struggling to keep everything in balance. Disorganization is leading to poor financial decisions.' } },
  66: { name: 'Three of Pentacles', upright: { keywords: ['Teamwork', 'Collaboration', 'Learning', 'Implementation', 'Skill'], meaning: 'This card represents successful collaboration and teamwork. By combining your unique skills, you are creating something of high quality.' }, reversed: { keywords: ['Lack of teamwork', 'Disharmony', 'Poor quality work', 'Competition', 'Lack of skill'], meaning: 'A lack of teamwork or communication is leading to poor results. Competition among team members is creating disharmony.' } },
  67: { name: 'Four of Pentacles', upright: { keywords: ['Saving money', 'Security', 'Control', 'Conservation', 'Possessiveness'], meaning: 'You are holding on tightly to your possessions and security. While this brings stability, be careful not to become overly controlling or miserly.' }, reversed: { keywords: ['Greed', 'Materialism', 'Letting go', 'Generosity', 'Financial loss'], meaning: 'You are either letting go of your attachment to material things or, conversely, acting with extreme greed. It can also signify an unexpected financial loss.' } },
  68: { name: 'Five of Pentacles', upright: { keywords: ['Financial loss', 'Poverty', 'Hard times', 'Isolation', 'Feeling left out'], meaning: 'You are going through a period of financial hardship and feeling isolated. Remember that help is often available, even if you don\'t see it at first.' }, reversed: { keywords: ['Recovery', 'Finding help', 'Improved finances', 'Hope', 'End of hardship'], meaning: 'You are beginning to recover from a period of hardship. New opportunities or help from others is leading to financial improvement.' } },
  69: { name: 'Six of Pentacles', upright: { keywords: ['Generosity', 'Charity', 'Giving and receiving', 'Sharing wealth', 'Balance'], meaning: 'This card represents a cycle of giving and receiving. It signifies generosity, charity, and finding a healthy balance in your financial life.' }, reversed: { keywords: ['Debt', 'Selfishness', 'One-sided charity', 'String attached', 'Abuse of generosity'], meaning: 'There is an imbalance in giving and receiving. Be wary of taking on debt or being taken advantage of for your generosity.' } },
  70: { name: 'Seven of Pentacles', upright: { keywords: ['Patience', 'Long-term view', 'Sustainable results', 'Investment', 'Perseverance'], meaning: 'You have worked hard and planted your seeds. Now is a time for patience, to wait for your investments to grow. Assess your progress and plan for the long term.' }, reversed: { keywords: ['Impatience', 'Lack of long-term vision', 'Unwise investment', 'Wasted effort', 'Frustration'], meaning: 'You are feeling impatient with a lack of immediate results. Wasted effort on an unwise investment may be causing frustration.' } },
  71: { name: 'Eight of Pentacles', upright: { keywords: ['Apprenticeship', 'Mastery', 'Skill development', 'Diligence', 'Detail-oriented work'], meaning: 'You are dedicated to mastering your craft. Through diligent work and attention to detail, you are developing your skills and becoming an expert.' }, reversed: { keywords: ['Perfectionism', 'Lack of ambition', 'Mediocrity', 'Repetitive work', 'Lack of focus'], meaning: 'You may be stuck in perfectionism or, conversely, have a lack of ambition leading to mediocre work. A lack of focus is hindering your skill development.' } },
  72: { name: 'Nine of Pentacles', upright: { keywords: ['Abundance', 'Luxury', 'Self-sufficiency', 'Financial independence', 'Enjoying success'], meaning: 'You have achieved financial independence and can now enjoy the fruits of your labor. This card represents luxury, self-sufficiency, and well-deserved success.' }, reversed: { keywords: ['Financial dependency', 'Superficiality', 'Over-spending', 'Living beyond means', 'Hustling'], meaning: 'You may be living beyond your means or are financially dependent on others. Be wary of reckless spending or focusing only on superficial gains.' } },
  73: { name: 'Ten of Pentacles', upright: { keywords: ['Wealth', 'Family', 'Legacy', 'Inheritance', 'Long-term security'], meaning: 'This card represents the culmination of long-term success, often in the form of family wealth and a lasting legacy. It signifies stability and abundance for generations.' }, reversed: { keywords: ['Family disputes', 'Financial failure', 'Loss of inheritance', 'Instability', 'Breaking tradition'], meaning: 'There may be disputes over family finances or inheritance. A sudden loss or financial failure is causing instability and breaking from tradition.' } },
  74: { name: 'Page of Pentacles', upright: { keywords: ['New opportunity', 'Manifestation', 'Diligence', 'Learning', 'A student'], meaning: 'A new opportunity to manifest your goals in the material world is here. Approach it with the diligence of a student, eager to learn and build something tangible.' }, reversed: { keywords: ['Lack of progress', 'Procrastination', 'Laziness', 'Missed opportunity', 'Poor planning'], meaning: 'Procrastination or a lack of planning is causing you to miss opportunities. You may be feeling lazy or unmotivated to put in the work.' } },
  75: { name: 'Knight of Pentacles', upright: { keywords: ['Hard work', 'Responsibility', 'Routine', 'Diligence', 'Methodical'], meaning: 'This card represents a diligent and methodical approach to achieving your goals. Through hard work and routine, you are making steady progress.' }, reversed: { keywords: ['Boredom', 'Stagnation', 'Perfectionism', 'Unadventurous', 'Feeling stuck'], meaning: 'You are feeling bored or stuck in a monotonous routine. Perfectionism may be causing you to get bogged down in details and lose momentum.' } },
  76: { name: 'Queen of Pentacles', upright: { keywords: ['Nurturing', 'Practical', 'Down-to-earth', 'Financial security', 'A working parent'], meaning: 'This card represents a nurturing and practical person who provides a secure and comfortable environment. You are skilled at managing both your home and your work.' }, reversed: { keywords: ['Financial insecurity', 'Smothering', 'Work-life imbalance', 'Materialistic', 'Self-care issues'], meaning: 'You may be struggling with a work-life imbalance or feeling financially insecure. Be careful not to become overly materialistic or neglect your own self-care.' } },
  77: { name: 'King of Pentacles', upright: { keywords: ['Wealth', 'Business', 'Leadership', 'Security', 'Success'], meaning: 'This card represents an ambitious and successful leader who has mastered the material world. You have achieved wealth and security through your business acumen.' }, reversed: { keywords: ['Greed', 'Materialistic', 'Stubborn', 'Overly cautious', 'Ruthless'], meaning: 'You may be dealing with someone who is overly materialistic and stubborn. Greed and a ruthless focus on the bottom line can lead to poor leadership.' } }
};

/**
 * Get translated card data by ID and locale
 */
export function getCardTranslation(cardId: number, locale: string): CardTranslation | undefined {
  if (locale === 'ko') {
    return tarotTranslationsKo[cardId];
  }
  return tarotTranslationsEn[cardId];
}

/**
 * Get all card translations for a locale
 */
export function getAllCardTranslations(locale: string): TarotTranslations {
  return locale === 'ko' ? tarotTranslationsKo : tarotTranslationsEn;
}
