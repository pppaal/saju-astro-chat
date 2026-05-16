import type { IntegratedProfileId } from './integratedProfile'

export interface IntegratedProfileTemplate {
  id: IntegratedProfileId
  nameKo: string
  nameEn: string
  oneLineKo: string
  oneLineEn: string
  strengthsKo: string[]
  strengthsEn: string[]
  watchoutsKo: string[]
  watchoutsEn: string[]
  howYouShowUpKo: {
    dating: string[]
    work: string[]
    friendsFamily: string[]
  }
  howYouShowUpEn: {
    dating: string[]
    work: string[]
    friendsFamily: string[]
  }
  communicationPlaybookKo: {
    conflictOpener: string
    boundarySetting: string
    repairReconnect: string
  }
  communicationPlaybookEn: {
    conflictOpener: string
    boundarySetting: string
    repairReconnect: string
  }
}

export const INTEGRATED_PROFILES: Record<IntegratedProfileId, IntegratedProfileTemplate> = {
  E_A: {
    id: 'E_A',
    nameKo: '관계 점화형',
    nameEn: 'Relational Igniter',
    oneLineKo: '에너지가 높고 기준이 분명해, 관계의 속도와 방향을 함께 끌어올립니다.',
    oneLineEn:
      'High social energy and clear standards help you move people and direction together.',
    strengthsKo: ['초기 분위기 형성 속도', '관계 신호 포착 민감도', '실행 전환 탄력'],
    strengthsEn: [
      'Fast relationship kickoff',
      'Sensitive to social signals',
      'Quick shift into action',
    ],
    watchoutsKo: ['발화 속도 과다', '경청 시간 부족', '감정 처리 누락'],
    watchoutsEn: [
      'Speaking pace can run ahead',
      'Listening time can shrink',
      'Emotion processing may be skipped',
    ],
    howYouShowUpKo: {
      dating: ['분위기를 먼저 열고 대화를 리드합니다.', '관계 기준을 빠르게 공유합니다.'],
      work: ['초반 협업 에너지를 끌어올립니다.', '결정이 지연되면 구조를 다시 잡습니다.'],
      friendsFamily: ['모임의 흐름을 주도해 정리합니다.', '불편한 상황을 바로 조정하려 합니다.'],
    },
    howYouShowUpEn: {
      dating: ['You open the tone and lead dialogue.', 'You share relationship standards early.'],
      work: ['You lift team energy at the start.', 'You reframe structure when decisions stall.'],
      friendsFamily: [
        'You organize group flow quickly.',
        'You move fast to reset awkward moments.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '지금 핵심 쟁점을 먼저 한 줄로 맞추고 시작할게요.',
      boundarySetting: '이 요청은 가능 범위와 일정 기준을 맞추면 진행할 수 있어요.',
      repairReconnect: '내 전달 속도가 빨랐던 것 같아요. 다시 맥락부터 맞춰볼게요.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Let us align on the core issue in one line before we continue.',
      boundarySetting: 'I can support this if we align scope and timing first.',
      repairReconnect: 'My delivery was too fast. Let me reset the context with you.',
    },
  },
  E_T: {
    id: 'E_T',
    nameKo: '공감 연결형',
    nameEn: 'Empathic Connector',
    oneLineKo: '사람의 정서를 읽으며 관계의 온도를 안정적으로 맞추는 연결 중심 유형입니다.',
    oneLineEn: 'You read emotional context well and stabilize relational temperature.',
    strengthsKo: ['정서 공감 정확도', '관계 톤 조율', '대화 참여 촉진'],
    strengthsEn: [
      'Accurate emotional attunement',
      'Tone regulation in relationships',
      'Inclusive dialogue facilitation',
    ],
    watchoutsKo: ['자기 주장 후순위', '합의 지연', '피드백 완곡화 과다'],
    watchoutsEn: [
      'Self-assertion can be delayed',
      'Agreement may take longer',
      'Feedback can become over-softened',
    ],
    howYouShowUpKo: {
      dating: ['상대의 감정 변화를 빠르게 읽습니다.', '갈등에서도 말투를 부드럽게 유지합니다.'],
      work: ['회의에서 소외된 의견을 끌어냅니다.', '팀 감정 온도를 보며 속도를 조절합니다.'],
      friendsFamily: ['갈등 중재 역할을 자주 맡습니다.', '관계의 균형을 지키는 쪽으로 움직입니다.'],
    },
    howYouShowUpEn: {
      dating: ['You catch emotional shifts quickly.', 'You keep tone gentle during conflict.'],
      work: [
        'You surface voices that were left out.',
        'You tune pace based on team emotional load.',
      ],
      friendsFamily: ['You often mediate tension.', 'You prioritize relational balance.'],
    },
    communicationPlaybookKo: {
      conflictOpener: '서로 의도는 같고 방식이 달랐던 것 같아요. 포인트를 맞춰볼까요?',
      boundarySetting: '도움은 가능하지만 이 범위를 넘기면 제 리듬이 무너집니다.',
      repairReconnect: '내가 놓친 부분이 있으면 듣고 반영해서 다시 맞추고 싶어요.',
    },
    communicationPlaybookEn: {
      conflictOpener:
        'Our intent seems aligned; only methods differed. Can we align the key point?',
      boundarySetting: 'I can help, but crossing this scope breaks my working rhythm.',
      repairReconnect: 'If I missed something, I want to hear it and recalibrate together.',
    },
  },
  E_P: {
    id: 'E_P',
    nameKo: '회복 조절형',
    nameEn: 'Recovery Regulator',
    oneLineKo: '관계 에너지는 유지하되, 감정 회복과 재정렬 루틴으로 안정성을 확보합니다.',
    oneLineEn: 'You sustain social energy while relying on reset routines for stability.',
    strengthsKo: ['감정 회복 속도 관리', '상황 재정렬 능력', '관계 리듬 복구'],
    strengthsEn: [
      'Emotion reset management',
      'Situational recalibration',
      'Relational rhythm recovery',
    ],
    watchoutsKo: ['반추 길어짐', '과잉 해석', '복구 지연 시 소진'],
    watchoutsEn: [
      'Rumination can extend',
      'Over-interpretation risk',
      'Delayed reset can drain energy',
    ],
    howYouShowUpKo: {
      dating: ['갈등 후 대화 재개 타이밍을 조율합니다.', '감정이 올라오면 잠시 간격을 둡니다.'],
      work: ['충돌 후 일정을 재배치해 회복합니다.', '감정 신호를 체크하며 업무 리듬을 복원합니다.'],
      friendsFamily: [
        '갈등 이후 거리 조절을 통해 균형을 찾습니다.',
        '정리된 언어로 다시 대화를 시작합니다.',
      ],
    },
    howYouShowUpEn: {
      dating: ['You pace the restart after tension.', 'You use short pauses when emotions spike.'],
      work: ['You re-sequence work after conflict.', 'You rebuild pace with emotional check-ins.'],
      friendsFamily: [
        'You rebalance through temporary distance.',
        'You restart with clarified language.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '지금 감정이 올라와서, 쟁점만 먼저 분리해서 이야기하고 싶어요.',
      boundarySetting: '바로 답하면 왜곡될 수 있어요. 정리 후 다시 답변할게요.',
      repairReconnect: '정리할 시간을 가진 뒤에 다시 연결하고 싶습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Emotions are high, so I want to separate the issue first.',
      boundarySetting: 'If I answer now, clarity drops. I will respond after I organize.',
      repairReconnect: 'After a short reset, I want to reconnect with clearer intent.',
    },
  },
  C_A: {
    id: 'C_A',
    nameKo: '구조 선도형',
    nameEn: 'Structured Driver',
    oneLineKo: '사고 구조와 관계 기준을 결합해 논점을 빠르게 정렬하는 유형입니다.',
    oneLineEn: 'You combine cognitive structure with clear standards to align issues quickly.',
    strengthsKo: ['논점 구조화', '의사결정 선명도', '역할 경계 명확화'],
    strengthsEn: ['Issue structuring', 'Decision clarity', 'Role-boundary definition'],
    watchoutsKo: ['유연성 축소', '정서 맥락 축약', '설명 과밀'],
    watchoutsEn: [
      'Flexibility can narrow',
      'Emotional context can be compressed',
      'Explanations can become dense',
    ],
    howYouShowUpKo: {
      dating: ['관계 기대치를 문장으로 명확히 합니다.', '애매한 상황을 빠르게 정의합니다.'],
      work: ['회의 논점을 항목 단위로 정리합니다.', '협업 경계를 미리 합의합니다.'],
      friendsFamily: ['요청 우선순위를 구조화해 답합니다.', '갈등 원인을 패턴 단위로 설명합니다.'],
    },
    howYouShowUpEn: {
      dating: ['You articulate expectations clearly.', 'You define ambiguous situations quickly.'],
      work: [
        'You break discussions into structured points.',
        'You align collaboration boundaries early.',
      ],
      friendsFamily: [
        'You respond with clear priorities.',
        'You explain conflict as repeatable patterns.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '지금 이슈를 사실, 해석, 요청 세 줄로 나눠볼게요.',
      boundarySetting: '이 역할은 여기까지 맡고, 이후 단계는 분리하는 게 맞습니다.',
      repairReconnect: '내 설명이 딱딱했다면 의도와 감정을 함께 다시 설명하겠습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Let me split this into facts, interpretation, and request in three lines.',
      boundarySetting: 'I can own this scope, and the next phase should be separated.',
      repairReconnect: 'If my tone felt rigid, I will restate both intent and emotion.',
    },
  },
  C_T: {
    id: 'C_T',
    nameKo: '맥락 해석형',
    nameEn: 'Context Interpreter',
    oneLineKo: '구조적 사고 위에 공감 필터를 더해 합의 가능한 문장을 만드는 유형입니다.',
    oneLineEn: 'You apply empathy on top of structure to produce agreement-friendly language.',
    strengthsKo: ['맥락 번역 능력', '합의 문장 구성', '관계 저항 완화'],
    strengthsEn: [
      'Context translation',
      'Agreement-oriented phrasing',
      'Relational resistance reduction',
    ],
    watchoutsKo: ['결론 지연', '정리 부담 증가', '완곡 표현 반복'],
    watchoutsEn: [
      'Conclusions can be delayed',
      'Synthesis load increases',
      'Soft phrasing can repeat',
    ],
    howYouShowUpKo: {
      dating: ['서로 기대를 맥락과 함께 설명합니다.', '정서와 사실을 함께 다룹니다.'],
      work: ['다른 부서 언어를 공통 프레임으로 바꿉니다.', '갈등 시 합의 가능한 표현을 찾습니다.'],
      friendsFamily: ['입장 차이를 중립 문장으로 변환합니다.', '대화 온도를 낮추는 표현을 씁니다.'],
    },
    howYouShowUpEn: {
      dating: ['You explain expectations with context.', 'You hold emotion and facts together.'],
      work: [
        'You translate across team languages.',
        'You find phrasing that reduces conflict friction.',
      ],
      friendsFamily: [
        'You convert positional gaps into neutral language.',
        'You use wording that cools the tone.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '각자 중요하게 보는 포인트를 먼저 한 줄씩 확인해볼까요?',
      boundarySetting: '이 부분은 돕되, 제 처리 한도를 넘지 않도록 선을 맞추고 싶어요.',
      repairReconnect: '내가 이해한 내용을 먼저 요약하고, 틀린 부분은 바로 수정하겠습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Can we each state the most important point in one line first?',
      boundarySetting: 'I can support this, while keeping my processing limit clear.',
      repairReconnect:
        'I will summarize what I understood first and correct any mismatch right away.',
    },
  },
  C_P: {
    id: 'C_P',
    nameKo: '정리 복구형',
    nameEn: 'Analytical Resetter',
    oneLineKo: '복잡한 관계 신호를 정리하고 회복 루틴으로 흐름을 다시 세우는 유형입니다.',
    oneLineEn: 'You organize complex social signals and restore flow through reset routines.',
    strengthsKo: ['문제 재정의', '사후 정리력', '재발 방지 구조화'],
    strengthsEn: ['Problem reframing', 'Post-event synthesis', 'Relapse prevention structuring'],
    watchoutsKo: ['반추 장기화', '행동 전환 지연', '완벽 정리 집착'],
    watchoutsEn: [
      'Rumination can prolong',
      'Action shift can slow',
      'Over-focus on perfect closure',
    ],
    howYouShowUpKo: {
      dating: ['갈등 기록을 정리해 패턴을 찾습니다.', '재연결 전에 핵심 포인트를 정리합니다.'],
      work: [
        '이슈 회고를 통해 다음 운영 규칙을 만듭니다.',
        '문제가 반복되면 원인 구조를 다시 설계합니다.',
      ],
      friendsFamily: [
        '관계 긴장 이후 대화 순서를 재설계합니다.',
        '감정 소모를 줄일 기준을 만듭니다.',
      ],
    },
    howYouShowUpEn: {
      dating: [
        'You capture conflict patterns in notes.',
        'You organize key points before reconnecting.',
      ],
      work: [
        'You convert incidents into operating rules.',
        'You redesign root structure when issues repeat.',
      ],
      friendsFamily: [
        'You redesign conversation sequence after tension.',
        'You set criteria to reduce emotional drain.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '지금 상황을 다시 반복되지 않게 정리하는 방식으로 이야기해볼게요.',
      boundarySetting: '이 주제는 바로 결론보다 정리 시간이 먼저 필요합니다.',
      repairReconnect: '정리한 내용을 공유하고, 합의된 다음 단계까지 맞추고 싶습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Let us discuss this in a way that prevents the same loop.',
      boundarySetting: 'This topic needs a short organizing window before conclusion.',
      repairReconnect: 'I want to share my synthesis and align the next concrete step.',
    },
  },
  D_A: {
    id: 'D_A',
    nameKo: '결정 선명형',
    nameEn: 'Decision Clarifier',
    oneLineKo: '결정 축이 강하고 관계 기준이 분명해, 갈등을 실행 가능한 선택으로 수렴합니다.',
    oneLineEn:
      'Strong decision preference and clear boundaries help convert conflict into executable choices.',
    strengthsKo: ['결정 속도 확보', '우선순위 분리', '모호성 축소'],
    strengthsEn: ['Decision velocity', 'Priority separation', 'Ambiguity reduction'],
    watchoutsKo: ['상대 처리 속도 간과', '관계 피로 누적', '합의 감각 저하'],
    watchoutsEn: [
      'Others pace may be overlooked',
      'Relational fatigue can accumulate',
      'Consensus sensitivity can drop',
    ],
    howYouShowUpKo: {
      dating: [
        '핵심 기대와 비허용 기준을 명확히 말합니다.',
        '갈등에서 결론 시점을 분명히 제시합니다.',
      ],
      work: ['의사결정 규칙을 먼저 정하고 실행합니다.', '지연 이슈를 빠르게 정리합니다.'],
      friendsFamily: ['중요한 사안을 빠르게 분류해 대응합니다.', '경계선을 분명히 공유합니다.'],
    },
    howYouShowUpEn: {
      dating: [
        'You state expectations and non-negotiables clearly.',
        'You set clear timing for conflict closure.',
      ],
      work: ['You define decision rules early and execute.', 'You clear stalled issues quickly.'],
      friendsFamily: ['You triage important matters fast.', 'You communicate boundaries directly.'],
    },
    communicationPlaybookKo: {
      conflictOpener: '감정은 존중하고, 지금은 결정해야 할 항목부터 맞추겠습니다.',
      boundarySetting: '이 요청은 현재 우선순위와 충돌해서 지금은 받기 어렵습니다.',
      repairReconnect: '내 결론이 빨랐다면 근거와 맥락을 다시 설명하겠습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'I respect the emotions, and I want to align the decision items first.',
      boundarySetting: 'This request conflicts with current priorities, so I cannot take it now.',
      repairReconnect: 'If my conclusion came too fast, I will restate rationale and context.',
    },
  },
  D_T: {
    id: 'D_T',
    nameKo: '공감 판단형',
    nameEn: 'Empathic Decider',
    oneLineKo: '판단은 분명하지만 사람의 감정 신호를 함께 반영해 결정을 조율합니다.',
    oneLineEn: 'You make clear decisions while incorporating emotional signals.',
    strengthsKo: ['관계 기반 판단', '수용도 높은 결정', '갈등 전환 대화'],
    strengthsEn: [
      'Relationship-aware judgment',
      'High acceptance decisions',
      'Conflict-to-alignment dialogue',
    ],
    watchoutsKo: ['과잉 고려로 지연', '자기 피로 은닉', '결정 후 흔들림'],
    watchoutsEn: [
      'Over-consideration can delay',
      'Personal fatigue can stay hidden',
      'Post-decision second-guessing',
    ],
    howYouShowUpKo: {
      dating: ['상대 감정을 반영해 합의점을 찾습니다.', '결정 전 서로 기대를 재확인합니다.'],
      work: [
        '의사결정 시 이해관계자 수용도를 확인합니다.',
        '피드백 저항을 낮추는 문장을 선택합니다.',
      ],
      friendsFamily: [
        '관계 손상을 줄이는 선택을 우선합니다.',
        '결론 전에 감정 상태를 한 번 점검합니다.',
      ],
    },
    howYouShowUpEn: {
      dating: [
        'You seek agreement while acknowledging feelings.',
        'You recheck mutual expectations before deciding.',
      ],
      work: [
        'You validate stakeholder acceptance during decisions.',
        'You choose language that lowers feedback resistance.',
      ],
      friendsFamily: [
        'You prioritize options that reduce relational damage.',
        'You check emotional state before closing decisions.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '지금 서로 중요하게 보는 지점을 먼저 맞추고 결론을 내릴게요.',
      boundarySetting: '도움을 주고 싶지만 제 시간 한도 안에서만 가능합니다.',
      repairReconnect: '결론 이후 감정이 남았던 부분을 다시 확인하고 싶습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Let us align what matters most to each of us, then close the decision.',
      boundarySetting: 'I want to help, but only within my time limit.',
      repairReconnect: 'I want to revisit the emotional residue left after the decision.',
    },
  },
  D_P: {
    id: 'D_P',
    nameKo: '신중 복원형',
    nameEn: 'Reflective Restorer',
    oneLineKo: '결정 전후의 감정 여파를 관리하며, 관계 손실을 줄이는 복원형 판단 패턴입니다.',
    oneLineEn:
      'You manage emotional aftereffects around decisions and focus on relational restoration.',
    strengthsKo: ['사후 복원력', '관계 손실 최소화', '재협상 설계'],
    strengthsEn: [
      'Post-decision recovery',
      'Relational loss minimization',
      'Re-negotiation design',
    ],
    watchoutsKo: ['판단 속도 저하', '반추 증가', '결정 확신 약화'],
    watchoutsEn: [
      'Decision pace can slow',
      'Rumination can rise',
      'Decision confidence can weaken',
    ],
    howYouShowUpKo: {
      dating: ['갈등 후 회복 대화를 구조화합니다.', '결정 이후의 감정 반응을 점검합니다.'],
      work: [
        '결정 여파를 리뷰해 다음 기준을 보완합니다.',
        '재발 이슈를 줄이는 운영 규칙을 만듭니다.',
      ],
      friendsFamily: [
        '관계 복원을 위한 대화 순서를 제안합니다.',
        '긴장 후 재연결 타이밍을 조절합니다.',
      ],
    },
    howYouShowUpEn: {
      dating: [
        'You structure recovery talks after tension.',
        'You review emotional effects after decisions.',
      ],
      work: [
        'You review aftermath and refine criteria.',
        'You establish rules to reduce repeat friction.',
      ],
      friendsFamily: [
        'You suggest sequence for relational repair.',
        'You pace reconnect timing after tension.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '결론도 필요하지만, 남은 감정까지 정리하는 방식으로 가고 싶습니다.',
      boundarySetting: '지금 바로 판단하면 정확도가 떨어져서, 짧은 정리 시간이 필요합니다.',
      repairReconnect: '정리한 뒤 다시 이야기하면 더 정확하게 맞출 수 있습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'We need a decision, and we also need to close the emotional residue.',
      boundarySetting: 'If I decide now, clarity drops. I need a short organizing window.',
      repairReconnect: 'After a short reset, we can align with better accuracy.',
    },
  },
  R_A: {
    id: 'R_A',
    nameKo: '리듬 주도형',
    nameEn: 'Rhythm Driver',
    oneLineKo: '변화 구간에서 속도와 기준을 동시에 잡아 관계 흐름을 전환합니다.',
    oneLineEn: 'In changing contexts, you set pace and standards simultaneously.',
    strengthsKo: ['변화 대응 속도', '리듬 재설정', '우선순위 재배치'],
    strengthsEn: ['Speed in change response', 'Rhythm reset', 'Priority re-sequencing'],
    watchoutsKo: ['속도 편차 확대', '타인 적응 부담', '피로 누적'],
    watchoutsEn: [
      'Pace variance can widen',
      'Others adaptation load increases',
      'Fatigue can accumulate',
    ],
    howYouShowUpKo: {
      dating: ['관계 속도 조절을 주도합니다.', '갈등 뒤 다음 행동을 빠르게 제시합니다.'],
      work: ['변화 시 실행 리듬을 다시 짭니다.', '역할 전환 타이밍을 명확히 합니다.'],
      friendsFamily: ['이벤트 흐름을 빠르게 재조정합니다.', '불필요한 반복 갈등을 끊어냅니다.'],
    },
    howYouShowUpEn: {
      dating: [
        'You lead pacing in the relationship.',
        'You propose next actions quickly after conflict.',
      ],
      work: ['You redesign execution rhythm during change.', 'You clarify role-shift timing.'],
      friendsFamily: ['You recalibrate event flow quickly.', 'You cut repetitive conflict loops.'],
    },
    communicationPlaybookKo: {
      conflictOpener: '지금은 리듬이 깨졌으니 우선순위를 다시 맞추고 진행하겠습니다.',
      boundarySetting: '이 요청은 일정 리듬을 깨서, 범위를 조정해야 수용 가능합니다.',
      repairReconnect: '속도만 앞섰다면, 상대 리듬에 맞춰 다시 정렬하겠습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Our rhythm broke, so let us realign priorities first.',
      boundarySetting: 'This request breaks core pacing, so scope needs adjustment first.',
      repairReconnect: 'If speed got ahead, I will realign to your processing rhythm.',
    },
  },
  R_T: {
    id: 'R_T',
    nameKo: '온도 조율형',
    nameEn: 'Pacing Harmonizer',
    oneLineKo: '리듬 축에서 유연하게 움직이며 대화의 온도와 타이밍을 맞추는 유형입니다.',
    oneLineEn: 'You move flexibly on rhythm and tune conversation temperature and timing.',
    strengthsKo: ['타이밍 감각', '관계 완충 역할', '리듬 맞춤 대화'],
    strengthsEn: ['Timing sensitivity', 'Relational buffering', 'Pace-matched communication'],
    watchoutsKo: ['결정 미루기', '자기 요구 축소', '합의 후 실행 지연'],
    watchoutsEn: [
      'Decisions may be postponed',
      'Personal needs can be downplayed',
      'Execution may lag after agreement',
    ],
    howYouShowUpKo: {
      dating: [
        '상대 페이스를 읽고 대화 속도를 맞춥니다.',
        '감정이 올라오면 톤을 먼저 안정화합니다.',
      ],
      work: ['팀 속도 차이를 완충해 협업을 유지합니다.', '회의 긴장을 낮춰 재정렬합니다.'],
      friendsFamily: [
        '갈등에서 말투와 타이밍을 조율합니다.',
        '관계 균형이 깨지면 완충 역할을 합니다.',
      ],
    },
    howYouShowUpEn: {
      dating: [
        'You match conversational pace to your partner.',
        'You stabilize tone first when emotions rise.',
      ],
      work: [
        'You buffer pace differences across teams.',
        'You lower tension and realign discussion.',
      ],
      friendsFamily: [
        'You regulate tone and timing during conflict.',
        'You buffer when relational balance drops.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '서로 말할 타이밍을 나눠서 천천히 정리해보면 좋겠습니다.',
      boundarySetting: '지금은 제 리듬이 가득 차서, 우선순위를 조정한 뒤 도울 수 있습니다.',
      repairReconnect: '대화 속도를 조금 낮추면 더 정확히 맞출 수 있습니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'It would help if we split speaking turns and slow the pace.',
      boundarySetting: 'My bandwidth is full right now, so I can help after priority adjustment.',
      repairReconnect: 'If we slow the pace, we can align with better accuracy.',
    },
  },
  R_P: {
    id: 'R_P',
    nameKo: '리듬 회복형',
    nameEn: 'Rhythm Recoverer',
    oneLineKo: '변동 상황에서 흔들림을 정리하고 회복 루틴으로 관계 흐름을 복원합니다.',
    oneLineEn: 'You absorb volatility and restore relational flow through recovery routines.',
    strengthsKo: ['회복 루틴 활용', '불안정 구간 완화', '지속 리듬 복원'],
    strengthsEn: [
      'Use of recovery routines',
      'Stabilization in volatility',
      'Sustainable rhythm restoration',
    ],
    watchoutsKo: ['과잉 반추', '반응 지연', '정서 에너지 소모'],
    watchoutsEn: ['Excess rumination', 'Delayed response', 'Emotional energy drain'],
    howYouShowUpKo: {
      dating: ['감정 파동이 있을 때 거리와 대화를 조절합니다.', '회복 후 재대화를 선호합니다.'],
      work: ['이슈 이후 리듬 복원 계획을 세웁니다.', '반복 피로를 줄이는 루틴을 유지합니다.'],
      friendsFamily: ['긴장 이후 회복 시간을 명확히 둡니다.', '재연결 시점을 신중하게 맞춥니다.'],
    },
    howYouShowUpEn: {
      dating: [
        'You adjust distance and dialogue during emotional waves.',
        'You prefer reconnection after reset.',
      ],
      work: [
        'You define rhythm restoration plans after incidents.',
        'You maintain routines to reduce repeated fatigue.',
      ],
      friendsFamily: [
        'You set clear recovery windows after tension.',
        'You choose reconnect timing carefully.',
      ],
    },
    communicationPlaybookKo: {
      conflictOpener: '지금은 감정이 커서, 핵심만 확인하고 잠시 정리 시간을 갖고 싶습니다.',
      boundarySetting: '이 요청은 바로 처리보다 회복 시간을 확보한 뒤 진행하겠습니다.',
      repairReconnect: '정리 후 다시 연결하면 관계와 내용 둘 다 더 정확해집니다.',
    },
    communicationPlaybookEn: {
      conflictOpener: 'Emotions are high, so I want to confirm essentials and take a short reset.',
      boundarySetting: 'I will handle this after securing a short recovery window.',
      repairReconnect: 'After reset, we can reconnect with better relational and content accuracy.',
    },
  },
} as const
