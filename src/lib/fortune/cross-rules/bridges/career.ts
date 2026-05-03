// Career archetype bridges — 격국·십성·dignity → 직업 군 매핑.
// 자평진전 격국별 직업 적합성 + 점성 행성 dignity 직업 색 결합.

export type CareerArchetype =
  | 'public-servant'   // 공무원·관리·행정
  | 'judiciary'        // 법조·법무
  | 'military'         // 군경·외과·격투
  | 'researcher'       // 연구·학자·교육
  | 'creator'          // 창작·예술·콘텐츠
  | 'performer'        // 연예·스포츠·표현
  | 'finance'          // 금융·회계·투자
  | 'merchant'         // 무역·유통·중개
  | 'entrepreneur'     // 자영업·창업
  | 'caregiver'        // 의료·간호·돌봄
  | 'spiritual'        // 종교·영성·치유
  | 'communicator'     // 미디어·언론·교육
  | 'designer'         // 디자인·예술·조화
  | 'leader'           // 정치·CEO·리더
  | 'analyst'          // 분석·IT·과학
  | 'reformer'         // 변혁·심리·심층

// 격국 → 적합 직업 군 (자평진전 전통 + 현대 적용)
export const GEOKGUK_TO_ARCHETYPES: Record<string, CareerArchetype[]> = {
  정관격: ['public-servant', 'judiciary', 'leader'],
  편관격: ['military', 'reformer', 'leader'],
  정인격: ['researcher', 'caregiver', 'communicator'],
  편인격: ['spiritual', 'creator', 'researcher'],
  정재격: ['finance', 'public-servant'],
  편재격: ['merchant', 'entrepreneur', 'finance'],
  식신격: ['creator', 'caregiver', 'communicator'],
  상관격: ['performer', 'judiciary', 'communicator'],
  양인격: ['military', 'leader'],
  건록격: ['entrepreneur', 'leader'],
  월겁격: ['entrepreneur'],
  // 종격
  종왕격: ['entrepreneur', 'leader'],
  종강격: ['researcher', 'spiritual'],
  종아격: ['creator', 'performer'],
  종재격: ['merchant', 'finance', 'entrepreneur'],
  종살격: ['military', 'leader', 'reformer'],
}

// 점성 행성 dignified → 직업 색
export const PLANET_DIGNITY_TO_ARCHETYPES: Record<string, CareerArchetype[]> = {
  Sun: ['leader', 'performer', 'public-servant'],
  Moon: ['caregiver', 'communicator'],
  Mercury: ['analyst', 'communicator', 'merchant', 'judiciary'],
  Venus: ['designer', 'creator', 'performer'],
  Mars: ['military', 'reformer'],
  Jupiter: ['judiciary', 'researcher', 'spiritual', 'communicator'],
  Saturn: ['public-servant', 'analyst', 'researcher'],
  Uranus: ['analyst', 'reformer'],
  Neptune: ['spiritual', 'creator', 'designer'],
  Pluto: ['reformer', 'analyst'],
}

// 십성 그룹 dominant → 직업 성향
export const SIBSIN_GROUP_TO_ARCHETYPES: Record<string, CareerArchetype[]> = {
  비겁: ['entrepreneur', 'leader'],
  식상: ['creator', 'performer', 'communicator'],
  재성: ['finance', 'merchant', 'entrepreneur'],
  관성: ['public-servant', 'leader', 'military'],
  인성: ['researcher', 'communicator', 'caregiver'],
}

export const ARCHETYPE_KO: Record<CareerArchetype, string> = {
  'public-servant': '공직·행정',
  judiciary: '법조',
  military: '군경·외과',
  researcher: '연구·학자',
  creator: '창작·콘텐츠',
  performer: '연예·표현',
  finance: '금융·회계',
  merchant: '무역·유통',
  entrepreneur: '자영업·창업',
  caregiver: '의료·돌봄',
  spiritual: '종교·영성',
  communicator: '미디어·교육',
  designer: '디자인·예술',
  leader: '정치·리더',
  analyst: '분석·IT',
  reformer: '변혁·심리',
}
