/**
 * 60갑자 일주 특성 사전 (60-pillar day-master archetypes).
 *
 * Each entry summarizes orthodox 명리학 readings of the day-master
 * stem + day branch combination: core character, strengths, weaknesses,
 * career aptitudes, relationship style.
 *
 * Source mix: 자평진전 / 적천수 / 명리정종 / 한국 사주 명리 통설을
 * 짧은 한 줄로 압축. 정통 해석을 깨지 않도록 단정 표현은 피하고
 * 경향형으로 표기.
 */

export interface IljuArchetype {
  character: string
  strengths: string[]
  weaknesses: string[]
  career: string[]
  relationship: string
}

export const ILJU_ARCHETYPES: Record<string, IljuArchetype> = {
  // ── 甲(목양) ──
  甲子: { character: '창의적 리더형, 지혜와 결단', strengths: ['리더십', '창의력', '추진'], weaknesses: ['고집', '독단'], career: ['경영', '연구', '창업'], relationship: '주도적·배려 필요' },
  甲寅: { character: '진취적이고 야심찬 행동가', strengths: ['추진력', '용기', '성취욕'], weaknesses: ['성급함', '과욕'], career: ['사업', '정치', '운동'], relationship: '열정·헌신' },
  甲辰: { character: '큰 그릇·포용형 거목', strengths: ['포용', '안목', '신뢰'], weaknesses: ['느린 결정', '권위'], career: ['관리직', '교육', '공직'], relationship: '안정·보호' },
  甲午: { character: '활발한 표현가, 빛나는 양목', strengths: ['표현력', '에너지', '인기'], weaknesses: ['감정 기복', '소진'], career: ['예능', '강연', '영업'], relationship: '뜨겁지만 변동' },
  甲申: { character: '강한 의지의 변혁가', strengths: ['결단', '대담', '실행'], weaknesses: ['충동', '대립'], career: ['군경', '엔지니어', '개혁'], relationship: '강한 유대·다툼' },
  甲戌: { character: '근면 성실한 실속형', strengths: ['책임감', '근면', '효'], weaknesses: ['보수', '걱정'], career: ['공직', '농업', '관리'], relationship: '의리·신뢰' },

  // ── 乙(목음) ──
  乙丑: { character: '온화하지만 끈기 있는 인내형', strengths: ['인내', '성실', '협조'], weaknesses: ['우유부단', '소극'], career: ['교육', '상담', '예술'], relationship: '헌신·안정' },
  乙卯: { character: '유연하고 섬세한 예술가', strengths: ['감수성', '미감', '교제'], weaknesses: ['예민', '의존'], career: ['예술', '디자인', '문학'], relationship: '낭만·집착 주의' },
  乙巳: { character: '재치 있고 사교적인 적응형', strengths: ['언변', '적응', '인맥'], weaknesses: ['변덕', '얕음'], career: ['영업', '미디어', '강연'], relationship: '다양한 만남' },
  乙未: { character: '온화하고 보살피는 자애형', strengths: ['배려', '인내', '안정'], weaknesses: ['소심', '피로 누적'], career: ['교육', '복지', '농업'], relationship: '따뜻·헌신' },
  乙酉: { character: '지적이고 깔끔한 비판가', strengths: ['분석', '단호', '결단'], weaknesses: ['차가움', '비판'], career: ['법조', '회계', '연구'], relationship: '신중·거리감' },
  乙亥: { character: '꿈 많은 이상주의자', strengths: ['상상력', '직관', '연민'], weaknesses: ['현실 회피', '몽상'], career: ['예술', '종교', '연구'], relationship: '낭만·이상' },

  // ── 丙(화양) ──
  丙子: { character: '밝고 추진력 있는 활동가', strengths: ['활력', '명랑', '추진'], weaknesses: ['감정 기복', '소진'], career: ['영업', '방송', '교육'], relationship: '환한 매력' },
  丙寅: { character: '뜨겁고 자신감 넘치는 리더', strengths: ['열정', '자신감', '결단'], weaknesses: ['독단', '단순'], career: ['CEO', '정치', '연예'], relationship: '강력한 매력' },
  丙辰: { character: '큰 무대 지향의 따뜻한 양화', strengths: ['포용', '에너지', '비전'], weaknesses: ['과로', '성급'], career: ['공직', '교육', '경영'], relationship: '믿음직' },
  丙午: { character: '극양 태양형 — 빛과 그림자', strengths: ['카리스마', '인기', '추진'], weaknesses: ['독선', '강한 자존'], career: ['리더', '예능', '정치'], relationship: '강렬·격렬' },
  丙申: { character: '강건한 행동가, 결단의 양화', strengths: ['실행', '결단', '의지'], weaknesses: ['거침', '대립'], career: ['군경', '경영', '엔지니어'], relationship: '직설·솔직' },
  丙戌: { character: '근면한 양화, 실속과 책임', strengths: ['책임감', '근면', '의리'], weaknesses: ['고집', '걱정'], career: ['관리', '교육', '공직'], relationship: '신뢰·보수' },

  // ── 丁(화음) ──
  丁丑: { character: '내면이 따뜻한 지혜형 등불', strengths: ['지혜', '인내', '섬세'], weaknesses: ['소극', '예민'], career: ['연구', '교육', '예술'], relationship: '깊은 정' },
  丁卯: { character: '예술적 감각의 음화', strengths: ['미감', '직관', '센스'], weaknesses: ['변덕', '예민'], career: ['예술', '디자인', '치유'], relationship: '낭만·섬세' },
  丁巳: { character: '재치와 기지의 빛나는 등불', strengths: ['언변', '센스', '추진'], weaknesses: ['감정 기복', '조급'], career: ['미디어', '교육', '영업'], relationship: '재치·열정' },
  丁未: { character: '따뜻하고 헌신적인 음화', strengths: ['배려', '인내', '예술성'], weaknesses: ['걱정', '소극'], career: ['교육', '복지', '예술'], relationship: '헌신·안정' },
  丁酉: { character: '예리하고 정제된 음화', strengths: ['분석', '센스', '단호'], weaknesses: ['차가움', '예민'], career: ['연구', '법무', '디자인'], relationship: '신중·거리' },
  丁亥: { character: '깊은 감수성의 이상주의자', strengths: ['직관', '연민', '예술성'], weaknesses: ['현실 회피'], career: ['예술', '종교', '심리'], relationship: '낭만·헌신' },

  // ── 戊(토양) ──
  戊子: { character: '안정 추구의 든든한 양토', strengths: ['신중', '안정', '책임'], weaknesses: ['고집', '느림'], career: ['공직', '관리', '부동산'], relationship: '신뢰·안정' },
  戊寅: { character: '진취적이고 강건한 양토', strengths: ['추진', '결단', '의리'], weaknesses: ['고집', '거침'], career: ['군경', '경영', '건설'], relationship: '직설·신의' },
  戊辰: { character: '대지 같은 포용의 양토', strengths: ['포용', '신뢰', '안정'], weaknesses: ['보수', '느린 변화'], career: ['공직', '교육', '관리'], relationship: '안정·보호' },
  戊午: { character: '뜨거운 행동가, 활화산형', strengths: ['에너지', '결단', '카리스마'], weaknesses: ['독단', '성급'], career: ['리더', '경영', '운동'], relationship: '열정·강함' },
  戊申: { character: '강인한 실행가, 견고한 산', strengths: ['실행', '결단', '책임'], weaknesses: ['거침', '경직'], career: ['엔지니어', '군경', '관리'], relationship: '믿음·직진' },
  戊戌: { character: '근면 성실한 보수형', strengths: ['책임', '신뢰', '인내'], weaknesses: ['고집', '걱정'], career: ['공직', '교육', '관리'], relationship: '신의·보수' },

  // ── 己(토음) ──
  己丑: { character: '온화하고 인내하는 음토', strengths: ['인내', '성실', '배려'], weaknesses: ['소극', '느림'], career: ['교육', '복지', '농업'], relationship: '헌신·안정' },
  己卯: { character: '섬세하고 부드러운 음토', strengths: ['배려', '협조', '미감'], weaknesses: ['우유부단', '예민'], career: ['교육', '예술', '복지'], relationship: '헌신·온화' },
  己巳: { character: '재치 있는 사교적 음토', strengths: ['언변', '적응', '인맥'], weaknesses: ['변덕', '피로'], career: ['영업', '교육', '서비스'], relationship: '다정·다양' },
  己未: { character: '인정 많고 헌신적인 음토', strengths: ['배려', '인내', '안정'], weaknesses: ['걱정', '소극'], career: ['교육', '복지', '농업'], relationship: '헌신·안정' },
  己酉: { character: '분석적이고 정확한 음토', strengths: ['분석', '꼼꼼', '협조'], weaknesses: ['예민', '비판'], career: ['회계', '연구', '의료'], relationship: '신중·거리' },
  己亥: { character: '직관과 인정의 음토', strengths: ['감수성', '인내', '직관'], weaknesses: ['걱정', '현실 회피'], career: ['상담', '예술', '복지'], relationship: '헌신·낭만' },

  // ── 庚(금양) ──
  庚子: { character: '날카롭고 결단력 있는 양금', strengths: ['결단', '추진', '의지'], weaknesses: ['거침', '독단'], career: ['군경', '엔지니어', '경영'], relationship: '직설·강함' },
  庚寅: { character: '강건한 행동가의 양금', strengths: ['추진', '결단', '용기'], weaknesses: ['충동', '거침'], career: ['군경', '운동', '엔지니어'], relationship: '직진·열정' },
  庚辰: { character: '신뢰·책임의 양금', strengths: ['책임', '신뢰', '결단'], weaknesses: ['고집', '강압'], career: ['관리', '공직', '엔지니어'], relationship: '신의·보수' },
  庚午: { character: '강렬한 의지의 양금', strengths: ['결단', '의지', '카리스마'], weaknesses: ['독단', '강함'], career: ['리더', '군경', '경영'], relationship: '강한 매력' },
  庚申: { character: '극강의 양금 — 의지와 칼날', strengths: ['결단', '의지', '실행'], weaknesses: ['강함', '대립'], career: ['군경', '엔지니어', '판검사'], relationship: '직설·신의' },
  庚戌: { character: '근면하고 의리 있는 양금', strengths: ['책임', '근면', '의리'], weaknesses: ['고집', '걱정'], career: ['공직', '관리', '엔지니어'], relationship: '신뢰·헌신' },

  // ── 辛(금음) ──
  辛丑: { character: '정제되고 인내하는 음금', strengths: ['정확', '인내', '단정'], weaknesses: ['차가움', '예민'], career: ['연구', '회계', '디자인'], relationship: '신중·거리' },
  辛卯: { character: '예리하고 섬세한 음금', strengths: ['미감', '예리', '분석'], weaknesses: ['예민', '비판'], career: ['예술', '디자인', '연구'], relationship: '깊은 정' },
  辛巳: { character: '재치와 결단의 음금', strengths: ['언변', '결단', '센스'], weaknesses: ['변덕', '날카로움'], career: ['미디어', '법무', '영업'], relationship: '재치·날카로움' },
  辛未: { character: '온화하면서도 단정한 음금 — 외유내강', strengths: ['단정', '책임', '예술성'], weaknesses: ['예민', '걱정'], career: ['교육', '예술', '관리'], relationship: '신중·헌신' },
  辛酉: { character: '극강의 음금 — 칼날 같은 정확함', strengths: ['정확', '결단', '센스'], weaknesses: ['차가움', '비판'], career: ['법무', '연구', '의료'], relationship: '신중·거리' },
  辛亥: { character: '깊은 감성의 음금', strengths: ['감수성', '직관', '예술성'], weaknesses: ['현실 회피', '예민'], career: ['예술', '심리', '연구'], relationship: '낭만·헌신' },

  // ── 壬(수양) ──
  壬子: { character: '극강의 양수 — 큰 흐름', strengths: ['지혜', '추진', '리더십'], weaknesses: ['변덕', '강함'], career: ['리더', '학자', '경영'], relationship: '깊고 변화' },
  壬寅: { character: '진취적인 양수', strengths: ['추진', '지혜', '결단'], weaknesses: ['성급', '거침'], career: ['경영', '연구', '미디어'], relationship: '능동·열정' },
  壬辰: { character: '큰 그릇의 포용형 양수', strengths: ['포용', '비전', '지혜'], weaknesses: ['고민', '느림'], career: ['공직', '학자', '경영'], relationship: '안정·신뢰' },
  壬午: { character: '활발한 양수, 빠른 흐름', strengths: ['활력', '추진', '센스'], weaknesses: ['감정 기복', '소진'], career: ['미디어', '영업', '예능'], relationship: '뜨거움·변동' },
  壬申: { character: '강건한 행동가의 양수', strengths: ['결단', '추진', '의지'], weaknesses: ['거침', '직설'], career: ['군경', '엔지니어', '경영'], relationship: '직설·신의' },
  壬戌: { character: '근면한 양수, 안정 추구', strengths: ['책임', '근면', '신뢰'], weaknesses: ['고집', '걱정'], career: ['공직', '관리', '교육'], relationship: '신뢰·보수' },

  // ── 癸(수음) ──
  癸丑: { character: '깊은 지혜의 음수', strengths: ['지혜', '인내', '직관'], weaknesses: ['걱정', '소극'], career: ['연구', '학자', '상담'], relationship: '헌신·신중' },
  癸卯: { character: '섬세하고 직관적인 음수', strengths: ['감수성', '미감', '직관'], weaknesses: ['예민', '의존'], career: ['예술', '상담', '학자'], relationship: '낭만·섬세' },
  癸巳: { character: '재치 있는 음수, 빠른 두뇌', strengths: ['언변', '재치', '직관'], weaknesses: ['변덕', '얕음'], career: ['미디어', '영업', '교육'], relationship: '다양·다정' },
  癸未: { character: '인정 깊은 음수', strengths: ['배려', '직관', '예술성'], weaknesses: ['걱정', '소극'], career: ['상담', '예술', '복지'], relationship: '헌신·낭만' },
  癸酉: { character: '분석적이고 정제된 음수', strengths: ['분석', '직관', '단호'], weaknesses: ['예민', '비판'], career: ['연구', '회계', '의료'], relationship: '신중·거리' },
  癸亥: { character: '극강의 음수 — 깊은 바다', strengths: ['직관', '연민', '지혜'], weaknesses: ['현실 회피', '소극'], career: ['예술', '학자', '심리'], relationship: '깊은 헌신' },
}

export function getIljuArchetype(stem: string, branch: string): IljuArchetype | null {
  return ILJU_ARCHETYPES[stem + branch] || null
}
