# GPT Interpretation Prompt (Data-Locked)

아래 JSON 데이터만 근거로 해석해 주세요.
추측/일반론 금지, 데이터에 없는 말 금지.

## 출력 요구사항

- 총 분량: 한국어 기준 A4 3페이지 수준(약 5,000~7,000자)
- 말투: 단정적/명확, 근거 인용 중심
- 섹션 순서:

1. 핵심 프로필 요약 (일간/격국/용신/ASC/MC/핵심 어스펙트)
2. 사주 고급 해석 (신강약, 십신구조, 대운/세운 포함)
3. 점성 고급 해석 (나탈, 하우스, 어스펙트, 프로그레션/리턴/드라코닉/하모닉)
4. 통합 결론 (사주+점성 교차근거)
5. 3단계 실행 전략 (오늘/이번달/올해)

## 강제 규칙

- 각 단락마다 최소 1개 이상 데이터 근거를 괄호로 표기: (근거: ...)
- 일간/격국/용신/대운/주요 어스펙트는 반드시 본문 앞부분에 명시
- 불확실하거나 데이터 누락이면 "데이터 없음"이라고 명시
- 욕설/비속어/과장 금지

## 입력 JSON

```json
{
  "generatedAt": "2026-03-06T03:27:21.185Z",
  "profile": {
    "name": "1995-02-09 06:40 Seoul",
    "birthDate": "1995-02-09",
    "birthTime": "06:40",
    "birthCity": "Seoul",
    "latitude": 37.5665,
    "longitude": 126.978,
    "timezone": "Asia/Seoul",
    "gender": "male"
  },
  "basis": {
    "todayIso": "2026-03-06",
    "assumption": {
      "genderAffectsDaeunDirection": true
    }
  },
  "saju": {
    "yearPillar": {
      "heavenlyStem": {
        "name": "乙",
        "element": "목",
        "yin_yang": "음",
        "sibsin": "편재",
        "graphId": "GAN_을",
        "elementGraphId": "EL_목"
      },
      "earthlyBranch": {
        "name": "亥",
        "element": "수",
        "yin_yang": "음",
        "sibsin": "상관",
        "graphId": "BR_해",
        "elementGraphId": "EL_수"
      },
      "ganjiGraphId": "GAN_을해",
      "jijanggan": {
        "chogi": {
          "name": "戊",
          "sibsin": "정인",
          "graphId": "GAN_무"
        },
        "jeonggi": {
          "name": "壬",
          "sibsin": "상관",
          "graphId": "GAN_임"
        }
      }
    },
    "monthPillar": {
      "heavenlyStem": {
        "name": "戊",
        "element": "토",
        "yin_yang": "양",
        "sibsin": "정인",
        "graphId": "GAN_무",
        "elementGraphId": "EL_토"
      },
      "earthlyBranch": {
        "name": "寅",
        "element": "목",
        "yin_yang": "양",
        "sibsin": "정재",
        "graphId": "BR_인",
        "elementGraphId": "EL_목"
      },
      "ganjiGraphId": "GAN_무인",
      "jijanggan": {
        "chogi": {
          "name": "戊",
          "sibsin": "정인",
          "graphId": "GAN_무"
        },
        "junggi": {
          "name": "丙",
          "sibsin": "정관",
          "graphId": "GAN_병"
        },
        "jeonggi": {
          "name": "甲",
          "sibsin": "정재",
          "graphId": "GAN_갑"
        }
      }
    },
    "dayPillar": {
      "heavenlyStem": {
        "name": "辛",
        "element": "금",
        "yin_yang": "음",
        "sibsin": "비견",
        "graphId": "GAN_신",
        "elementGraphId": "EL_금"
      },
      "earthlyBranch": {
        "name": "未",
        "element": "토",
        "yin_yang": "음",
        "sibsin": "편인",
        "graphId": "BR_미",
        "elementGraphId": "EL_토"
      },
      "ganjiGraphId": "GAN_신미",
      "jijanggan": {
        "chogi": {
          "name": "丁",
          "sibsin": "편관",
          "graphId": "GAN_정"
        },
        "junggi": {
          "name": "乙",
          "sibsin": "편재",
          "graphId": "GAN_을"
        },
        "jeonggi": {
          "name": "己",
          "sibsin": "편인",
          "graphId": "GAN_기"
        }
      }
    },
    "timePillar": {
      "heavenlyStem": {
        "name": "辛",
        "element": "금",
        "yin_yang": "음",
        "sibsin": "비견",
        "graphId": "GAN_신",
        "elementGraphId": "EL_금"
      },
      "earthlyBranch": {
        "name": "卯",
        "element": "목",
        "yin_yang": "음",
        "sibsin": "편재",
        "graphId": "BR_묘",
        "elementGraphId": "EL_목"
      },
      "ganjiGraphId": "GAN_신묘",
      "jijanggan": {
        "jeonggi": {
          "name": "乙",
          "sibsin": "편재",
          "graphId": "GAN_을"
        }
      }
    },
    "dayMaster": {
      "name": "辛",
      "element": "금",
      "yin_yang": "음",
      "graphId": "GAN_신",
      "elementGraphId": "EL_금"
    },
    "fiveElements": {
      "wood": 3,
      "fire": 0,
      "earth": 2,
      "metal": 2,
      "water": 1
    },
    "daeWoon": {
      "startAge": 11,
      "isForward": false,
      "current": {
        "age": 31,
        "heavenlyStem": "乙",
        "earthlyBranch": "亥",
        "sibsin": {
          "cheon": "편재",
          "ji": "상관"
        }
      },
      "list": [
        {
          "age": 11,
          "heavenlyStem": "丁",
          "earthlyBranch": "丑",
          "sibsin": {
            "cheon": "편관",
            "ji": "편인"
          }
        },
        {
          "age": 21,
          "heavenlyStem": "丙",
          "earthlyBranch": "子",
          "sibsin": {
            "cheon": "정관",
            "ji": "상관"
          }
        },
        {
          "age": 31,
          "heavenlyStem": "乙",
          "earthlyBranch": "亥",
          "sibsin": {
            "cheon": "편재",
            "ji": "상관"
          }
        },
        {
          "age": 41,
          "heavenlyStem": "甲",
          "earthlyBranch": "戌",
          "sibsin": {
            "cheon": "정재",
            "ji": "정인"
          }
        },
        {
          "age": 51,
          "heavenlyStem": "癸",
          "earthlyBranch": "酉",
          "sibsin": {
            "cheon": "식신",
            "ji": "비견"
          }
        },
        {
          "age": 61,
          "heavenlyStem": "壬",
          "earthlyBranch": "申",
          "sibsin": {
            "cheon": "상관",
            "ji": "겁재"
          }
        },
        {
          "age": 71,
          "heavenlyStem": "辛",
          "earthlyBranch": "未",
          "sibsin": {
            "cheon": "비견",
            "ji": "편인"
          }
        },
        {
          "age": 81,
          "heavenlyStem": "庚",
          "earthlyBranch": "午",
          "sibsin": {
            "cheon": "겁재",
            "ji": "편관"
          }
        },
        {
          "age": 91,
          "heavenlyStem": "己",
          "earthlyBranch": "巳",
          "sibsin": {
            "cheon": "편인",
            "ji": "정관"
          }
        },
        {
          "age": 101,
          "heavenlyStem": "戊",
          "earthlyBranch": "辰",
          "sibsin": {
            "cheon": "정인",
            "ji": "정인"
          }
        }
      ]
    },
    "unse": {
      "daeun": [
        {
          "age": 11,
          "heavenlyStem": "丁",
          "earthlyBranch": "丑",
          "ganji": "丁丑"
        },
        {
          "age": 21,
          "heavenlyStem": "丙",
          "earthlyBranch": "子",
          "ganji": "丙子"
        },
        {
          "age": 31,
          "heavenlyStem": "乙",
          "earthlyBranch": "亥",
          "ganji": "乙亥"
        },
        {
          "age": 41,
          "heavenlyStem": "甲",
          "earthlyBranch": "戌",
          "ganji": "甲戌"
        },
        {
          "age": 51,
          "heavenlyStem": "癸",
          "earthlyBranch": "酉",
          "ganji": "癸酉"
        },
        {
          "age": 61,
          "heavenlyStem": "壬",
          "earthlyBranch": "申",
          "ganji": "壬申"
        },
        {
          "age": 71,
          "heavenlyStem": "辛",
          "earthlyBranch": "未",
          "ganji": "辛未"
        },
        {
          "age": 81,
          "heavenlyStem": "庚",
          "earthlyBranch": "午",
          "ganji": "庚午"
        },
        {
          "age": 91,
          "heavenlyStem": "己",
          "earthlyBranch": "巳",
          "ganji": "己巳"
        },
        {
          "age": 101,
          "heavenlyStem": "戊",
          "earthlyBranch": "辰",
          "ganji": "戊辰"
        }
      ],
      "annual": [
        {
          "year": 2026,
          "ganji": "丙午",
          "element": "화",
          "sibsin": {
            "cheon": "정관",
            "ji": "편관"
          }
        },
        {
          "year": 2027,
          "ganji": "丁未",
          "element": "화",
          "sibsin": {
            "cheon": "편관",
            "ji": "편인"
          }
        },
        {
          "year": 2028,
          "ganji": "戊申",
          "element": "토",
          "sibsin": {
            "cheon": "정인",
            "ji": "겁재"
          }
        },
        {
          "year": 2029,
          "ganji": "己酉",
          "element": "토",
          "sibsin": {
            "cheon": "편인",
            "ji": "비견"
          }
        },
        {
          "year": 2030,
          "ganji": "庚戌",
          "element": "금",
          "sibsin": {
            "cheon": "겁재",
            "ji": "정인"
          }
        },
        {
          "year": 2031,
          "ganji": "辛亥",
          "element": "금",
          "sibsin": {
            "cheon": "비견",
            "ji": "상관"
          }
        }
      ],
      "monthly": [
        {
          "year": 2026,
          "month": 3,
          "ganji": "壬辰",
          "element": "수",
          "sibsin": {
            "cheon": "상관",
            "ji": "정인"
          }
        },
        {
          "year": 2026,
          "month": 4,
          "ganji": "癸巳",
          "element": "수",
          "sibsin": {
            "cheon": "식신",
            "ji": "정관"
          }
        },
        {
          "year": 2026,
          "month": 5,
          "ganji": "甲午",
          "element": "목",
          "sibsin": {
            "cheon": "정재",
            "ji": "편관"
          }
        },
        {
          "year": 2026,
          "month": 6,
          "ganji": "乙未",
          "element": "목",
          "sibsin": {
            "cheon": "편재",
            "ji": "편인"
          }
        },
        {
          "year": 2026,
          "month": 7,
          "ganji": "丙申",
          "element": "화",
          "sibsin": {
            "cheon": "정관",
            "ji": "겁재"
          }
        },
        {
          "year": 2026,
          "month": 8,
          "ganji": "丁酉",
          "element": "화",
          "sibsin": {
            "cheon": "편관",
            "ji": "비견"
          }
        },
        {
          "year": 2026,
          "month": 9,
          "ganji": "戊戌",
          "element": "토",
          "sibsin": {
            "cheon": "정인",
            "ji": "정인"
          }
        },
        {
          "year": 2026,
          "month": 10,
          "ganji": "己亥",
          "element": "토",
          "sibsin": {
            "cheon": "편인",
            "ji": "상관"
          }
        },
        {
          "year": 2026,
          "month": 11,
          "ganji": "庚子",
          "element": "금",
          "sibsin": {
            "cheon": "겁재",
            "ji": "상관"
          }
        },
        {
          "year": 2026,
          "month": 12,
          "ganji": "辛丑",
          "element": "금",
          "sibsin": {
            "cheon": "비견",
            "ji": "편인"
          }
        },
        {
          "year": 2027,
          "month": 1,
          "ganji": "壬寅",
          "element": "수",
          "sibsin": {
            "cheon": "상관",
            "ji": "정재"
          }
        },
        {
          "year": 2027,
          "month": 2,
          "ganji": "癸卯",
          "element": "수",
          "sibsin": {
            "cheon": "식신",
            "ji": "편재"
          }
        }
      ]
    },
    "advanced": {
      "strength": {
        "level": "중화",
        "score": -10,
        "helpingScore": 2.54,
        "drainingScore": 3.08,
        "monthBranchHelps": false,
        "seasonHelps": false,
        "details": {
          "비겁": 1,
          "인성": 1.54,
          "식상": 0.54,
          "재성": 2.31,
          "관성": 0.23
        }
      },
      "geokguk": {
        "type": "정재격",
        "basis": "월지 寅 정기 甲 기준"
      },
      "yongsin": {
        "primary": "화",
        "basis": "중화 상태이므로 부족한 오행 보충",
        "favorable": ["화"],
        "unfavorable": []
      }
    },
    "relations": [
      {
        "kind": "공망",
        "pillars": ["year"],
        "detail": "공망(亥)"
      },
      {
        "kind": "지지삼합",
        "pillars": ["year", "day", "time"],
        "detail": "亥·卯·未 삼합(목)"
      },
      {
        "kind": "지지육합",
        "pillars": ["year", "month"],
        "detail": "亥-寅 육합"
      },
      {
        "kind": "지지파",
        "pillars": ["year", "month"],
        "detail": "亥-寅 파"
      },
      {
        "kind": "천간충",
        "pillars": ["year", "day"],
        "detail": "乙-辛 충"
      },
      {
        "kind": "천간충",
        "pillars": ["year", "time"],
        "detail": "乙-辛 충"
      }
    ],
    "twelveByPillar": {
      "year": "양",
      "month": "관대",
      "day": "사",
      "time": "임관"
    },
    "shinsalHits": [
      {
        "kind": "지살",
        "pillars": ["year"],
        "target": "亥",
        "detail": "일지(未) 기준"
      },
      {
        "kind": "월살",
        "pillars": ["month"],
        "target": "寅",
        "detail": "일지(未) 기준"
      },
      {
        "kind": "겁살",
        "pillars": ["time"],
        "target": "卯",
        "detail": "일지(未) 기준"
      },
      {
        "kind": "공망",
        "pillars": ["year"],
        "target": "亥",
        "detail": "일주(辛未) 기준"
      },
      {
        "kind": "천라지망",
        "pillars": ["year"],
        "target": "亥"
      },
      {
        "kind": "천을귀인",
        "pillars": ["year"],
        "target": "亥"
      },
      {
        "kind": "문곡",
        "pillars": ["year"],
        "target": "亥"
      },
      {
        "kind": "암록",
        "pillars": ["month"],
        "target": "寅"
      },
      {
        "kind": "괴강",
        "pillars": ["day"],
        "target": "未"
      },
      {
        "kind": "태극귀인",
        "pillars": ["day"],
        "target": "未"
      },
      {
        "kind": "도화",
        "pillars": ["time"],
        "target": "卯"
      },
      {
        "kind": "고신",
        "pillars": ["time"],
        "target": "卯"
      },
      {
        "kind": "문곡",
        "pillars": ["time"],
        "target": "卯"
      },
      {
        "kind": "삼재",
        "pillars": ["year"],
        "target": "亥,子,丑",
        "detail": "亥띠 삼재 지지: 亥,子,丑"
      },
      {
        "kind": "길성",
        "pillars": ["month"],
        "target": "寅",
        "detail": "예시 길성 세트"
      }
    ]
  },
  "astrology": {
    "natalData": {
      "planets": [
        {
          "name": "Sun",
          "longitude": 319.66424807291077,
          "sign": "Aquarius",
          "degree": 19,
          "minute": 39,
          "formatted": "Aquarius 19deg 39'",
          "norm": 319.6642480729108,
          "house": 1,
          "speed": 1.0125452038963718,
          "retrograde": false,
          "graphId": "Sun"
        },
        {
          "name": "Moon",
          "longitude": 64.39404457101848,
          "sign": "Gemini",
          "degree": 4,
          "minute": 23,
          "formatted": "Gemini 4deg 23'",
          "norm": 64.39404457101847,
          "house": 4,
          "speed": 11.800764547295014,
          "retrograde": false,
          "graphId": "Moon"
        },
        {
          "name": "Mercury",
          "longitude": 309.04809866939746,
          "sign": "Aquarius",
          "degree": 9,
          "minute": 2,
          "formatted": "Aquarius 9deg 02'",
          "norm": 309.0480986693974,
          "house": 1,
          "speed": -0.9378894903473167,
          "retrograde": true,
          "graphId": "Mercury"
        },
        {
          "name": "Venus",
          "longitude": 274.5710255440129,
          "sign": "Capricorn",
          "degree": 4,
          "minute": 34,
          "formatted": "Capricorn 4deg 34'",
          "norm": 274.57102554401285,
          "house": 11,
          "speed": 1.1310411576018333,
          "retrograde": false,
          "graphId": "Venus"
        },
        {
          "name": "Mars",
          "longitude": 144.18044702966333,
          "sign": "Leo",
          "degree": 24,
          "minute": 10,
          "formatted": "Leo 24deg 10'",
          "norm": 144.18044702966336,
          "house": 7,
          "speed": -0.3961911858966349,
          "retrograde": true,
          "graphId": "Mars"
        },
        {
          "name": "Jupiter",
          "longitude": 251.5066523290807,
          "sign": "Sagittarius",
          "degree": 11,
          "minute": 30,
          "formatted": "Sagittarius 11deg 30'",
          "norm": 251.50665232908068,
          "house": 10,
          "speed": 0.14064173238483296,
          "retrograde": false,
          "graphId": "Jupiter"
        },
        {
          "name": "Saturn",
          "longitude": 341.9717864716233,
          "sign": "Pisces",
          "degree": 11,
          "minute": 58,
          "formatted": "Pisces 11deg 58'",
          "norm": 341.9717864716233,
          "house": 1,
          "speed": 0.11674366796837224,
          "retrograde": false,
          "graphId": "Saturn"
        },
        {
          "name": "Uranus",
          "longitude": 297.73848781308584,
          "sign": "Capricorn",
          "degree": 27,
          "minute": 44,
          "formatted": "Capricorn 27deg 44'",
          "norm": 297.73848781308584,
          "house": 12,
          "speed": 0.05585693449865477,
          "retrograde": false,
          "graphId": "Uranus"
        },
        {
          "name": "Neptune",
          "longitude": 294.01578820080937,
          "sign": "Capricorn",
          "degree": 24,
          "minute": 0,
          "formatted": "Capricorn 24deg 00'",
          "norm": 294.0157882008093,
          "house": 12,
          "speed": 0.03499341058857923,
          "retrograde": false,
          "graphId": "Neptune"
        },
        {
          "name": "Pluto",
          "longitude": 240.44551487953368,
          "sign": "Sagittarius",
          "degree": 0,
          "minute": 26,
          "formatted": "Sagittarius 0deg 26'",
          "norm": 240.44551487953368,
          "house": 10,
          "speed": 0.01365402849247233,
          "retrograde": false,
          "graphId": "Pluto"
        },
        {
          "name": "True Node",
          "longitude": 219.34131571542196,
          "sign": "Scorpio",
          "degree": 9,
          "minute": 20,
          "formatted": "Scorpio 9deg 20'",
          "norm": 219.34131571542196,
          "house": 9,
          "speed": -0.027270228452846098,
          "retrograde": true,
          "graphId": "NorthNode"
        }
      ],
      "ascendant": {
        "name": "Ascendant",
        "longitude": 302.2969488234313,
        "sign": "Aquarius",
        "degree": 2,
        "minute": 17,
        "formatted": "Aquarius 2deg 17'",
        "norm": 302.2969488234313,
        "house": 1,
        "graphId": "Asc"
      },
      "mc": {
        "name": "MC",
        "longitude": 232.9015435616369,
        "sign": "Scorpio",
        "degree": 22,
        "minute": 54,
        "formatted": "Scorpio 22deg 54'",
        "norm": 232.9015435616369,
        "house": 10,
        "graphId": "MC"
      },
      "houses": [
        {
          "cusp": 302.2969488234313,
          "formatted": "Aquarius 2deg 17'",
          "graphId": "H1"
        },
        {
          "cusp": 346.7521381287476,
          "formatted": "Pisces 16deg 45'",
          "graphId": "H2"
        },
        {
          "cusp": 24.825215748424384,
          "formatted": "Aries 24deg 49'",
          "graphId": "H3"
        },
        {
          "cusp": 52.90154356163691,
          "formatted": "Taurus 22deg 54'",
          "graphId": "H4"
        },
        {
          "cusp": 75.50385183364602,
          "formatted": "Gemini 15deg 30'",
          "graphId": "H5"
        },
        {
          "cusp": 97.01304395988694,
          "formatted": "Cancer 7deg 00'",
          "graphId": "H6"
        },
        {
          "cusp": 122.29694882343131,
          "formatted": "Leo 2deg 17'",
          "graphId": "H7"
        },
        {
          "cusp": 166.75213812874767,
          "formatted": "Virgo 16deg 45'",
          "graphId": "H8"
        },
        {
          "cusp": 204.8252157484244,
          "formatted": "Libra 24deg 49'",
          "graphId": "H9"
        },
        {
          "cusp": 232.9015435616369,
          "formatted": "Scorpio 22deg 54'",
          "graphId": "H10"
        },
        {
          "cusp": 255.50385183364602,
          "formatted": "Sagittarius 15deg 30'",
          "graphId": "H11"
        },
        {
          "cusp": 277.01304395988694,
          "formatted": "Capricorn 7deg 00'",
          "graphId": "H12"
        }
      ],
      "meta": {
        "jdUT": 2449757.4027813203,
        "timeZone": "Asia/Seoul",
        "latitude": 37.5665,
        "longitude": 126.978,
        "houseSystem": "Placidus"
      }
    },
    "natalAspects": [
      {
        "from": {
          "name": "Mercury",
          "kind": "natal",
          "longitude": 309.04809866939746,
          "house": 1,
          "sign": "Aquarius"
        },
        "to": {
          "name": "True Node",
          "kind": "natal",
          "longitude": 219.34131571542196,
          "house": 9,
          "sign": "Scorpio"
        },
        "type": "square",
        "orb": 0.29,
        "applying": true,
        "score": 0.93
      },
      {
        "from": {
          "name": "Jupiter",
          "kind": "natal",
          "longitude": 251.5066523290807,
          "house": 10,
          "sign": "Sagittarius"
        },
        "to": {
          "name": "Saturn",
          "kind": "natal",
          "longitude": 341.9717864716233,
          "house": 1,
          "sign": "Pisces"
        },
        "type": "square",
        "orb": 0.47,
        "applying": true,
        "score": 0.913
      },
      {
        "from": {
          "name": "Saturn",
          "kind": "natal",
          "longitude": 341.9717864716233,
          "house": 1,
          "sign": "Pisces"
        },
        "to": {
          "name": "True Node",
          "kind": "natal",
          "longitude": 219.34131571542196,
          "house": 9,
          "sign": "Scorpio"
        },
        "type": "trine",
        "orb": 2.63,
        "applying": true,
        "score": 0.657
      },
      {
        "from": {
          "name": "Mercury",
          "kind": "natal",
          "longitude": 309.04809866939746,
          "house": 1,
          "sign": "Aquarius"
        },
        "to": {
          "name": "Jupiter",
          "kind": "natal",
          "longitude": 251.5066523290807,
          "house": 10,
          "sign": "Sagittarius"
        },
        "type": "sextile",
        "orb": 2.46,
        "applying": true,
        "score": 0.64
      },
      {
        "from": {
          "name": "Uranus",
          "kind": "natal",
          "longitude": 297.73848781308584,
          "house": 12,
          "sign": "Capricorn"
        },
        "to": {
          "name": "Pluto",
          "kind": "natal",
          "longitude": 240.44551487953368,
          "house": 10,
          "sign": "Sagittarius"
        },
        "type": "sextile",
        "orb": 2.71,
        "applying": false,
        "score": 0.612
      },
      {
        "from": {
          "name": "Uranus",
          "kind": "natal",
          "longitude": 297.73848781308584,
          "house": 12,
          "sign": "Capricorn"
        },
        "to": {
          "name": "Neptune",
          "kind": "natal",
          "longitude": 294.01578820080937,
          "house": 12,
          "sign": "Capricorn"
        },
        "type": "conjunction",
        "orb": 3.72,
        "applying": true,
        "score": 0.591
      },
      {
        "from": {
          "name": "Moon",
          "kind": "natal",
          "longitude": 64.39404457101848,
          "house": 4,
          "sign": "Gemini"
        },
        "to": {
          "name": "Pluto",
          "kind": "natal",
          "longitude": 240.44551487953368,
          "house": 10,
          "sign": "Sagittarius"
        },
        "type": "opposition",
        "orb": 3.95,
        "applying": false,
        "score": 0.587
      },
      {
        "from": {
          "name": "Moon",
          "kind": "natal",
          "longitude": 64.39404457101848,
          "house": 4,
          "sign": "Gemini"
        },
        "to": {
          "name": "Mercury",
          "kind": "natal",
          "longitude": 309.04809866939746,
          "house": 1,
          "sign": "Aquarius"
        },
        "type": "trine",
        "orb": 4.65,
        "applying": false,
        "score": 0.481
      },
      {
        "from": {
          "name": "Venus",
          "kind": "natal",
          "longitude": 274.5710255440129,
          "house": 11,
          "sign": "Capricorn"
        },
        "to": {
          "name": "True Node",
          "kind": "natal",
          "longitude": 219.34131571542196,
          "house": 9,
          "sign": "Scorpio"
        },
        "type": "sextile",
        "orb": 4.77,
        "applying": false,
        "score": 0.363
      }
    ],
    "transitChart": {
      "planets": [
        {
          "name": "Sun",
          "longitude": 345.1866399664213,
          "sign": "Pisces",
          "degree": 15,
          "minute": 11,
          "formatted": "Pisces 15deg 11'",
          "norm": 345.18663996642135,
          "house": 2,
          "speed": 1.0012534142385745,
          "retrograde": false
        },
        {
          "name": "Moon",
          "longitude": 192.54371994474414,
          "sign": "Libra",
          "degree": 12,
          "minute": 32,
          "formatted": "Libra 12deg 32'",
          "norm": 192.5437199447441,
          "house": 9,
          "speed": 12.661243224412491,
          "retrograde": false
        },
        {
          "name": "Mercury",
          "longitude": 348.5365929930683,
          "sign": "Pisces",
          "degree": 18,
          "minute": 32,
          "formatted": "Pisces 18deg 32'",
          "norm": 348.5365929930683,
          "house": 2,
          "speed": -0.9424823392418571,
          "retrograde": true
        },
        {
          "name": "Venus",
          "longitude": 359.1545262435887,
          "sign": "Pisces",
          "degree": 29,
          "minute": 9,
          "formatted": "Pisces 29deg 09'",
          "norm": 359.15452624358863,
          "house": 3,
          "speed": 1.244551284100229,
          "retrograde": false
        },
        {
          "name": "Mars",
          "longitude": 332.5013173257,
          "sign": "Pisces",
          "degree": 2,
          "minute": 30,
          "formatted": "Pisces 2deg 30'",
          "norm": 332.50131732570003,
          "house": 2,
          "speed": 0.7878623433437114,
          "retrograde": false
        },
        {
          "name": "Jupiter",
          "longitude": 105.13460870295565,
          "sign": "Cancer",
          "degree": 15,
          "minute": 8,
          "formatted": "Cancer 15deg 08'",
          "norm": 105.13460870295563,
          "house": 7,
          "speed": -0.017605573229509563,
          "retrograde": true
        },
        {
          "name": "Saturn",
          "longitude": 2.2972539362938322,
          "sign": "Aries",
          "degree": 2,
          "minute": 17,
          "formatted": "Aries 2deg 17'",
          "norm": 2.297253936293828,
          "house": 3,
          "speed": 0.12113458440220039,
          "retrograde": false
        },
        {
          "name": "Uranus",
          "longitude": 57.844374139979514,
          "sign": "Taurus",
          "degree": 27,
          "minute": 50,
          "formatted": "Taurus 27deg 50'",
          "norm": 57.84437413997949,
          "house": 5,
          "speed": 0.025388458989828916,
          "retrograde": false
        },
        {
          "name": "Neptune",
          "longitude": 1.2171926972900333,
          "sign": "Aries",
          "degree": 1,
          "minute": 13,
          "formatted": "Aries 1deg 13'",
          "norm": 1.217192697290045,
          "house": 3,
          "speed": 0.03667543158164733,
          "retrograde": false
        },
        {
          "name": "Pluto",
          "longitude": 304.65917878712963,
          "sign": "Aquarius",
          "degree": 4,
          "minute": 39,
          "formatted": "Aquarius 4deg 39'",
          "norm": 304.6591787871296,
          "house": 1,
          "speed": 0.025678796091007036,
          "retrograde": false
        },
        {
          "name": "True Node",
          "longitude": 338.9694604808958,
          "sign": "Pisces",
          "degree": 8,
          "minute": 58,
          "formatted": "Pisces 8deg 58'",
          "norm": 338.9694604808958,
          "house": 2,
          "speed": -0.012510862994294073,
          "retrograde": true
        }
      ],
      "ascendant": {
        "name": "Ascendant",
        "longitude": 277.39567238584635,
        "sign": "Capricorn",
        "degree": 7,
        "minute": 23,
        "formatted": "Capricorn 7deg 23'",
        "norm": 277.3956723858464,
        "house": 1
      },
      "mc": {
        "name": "MC",
        "longitude": 209.39355494698452,
        "sign": "Libra",
        "degree": 29,
        "minute": 23,
        "formatted": "Libra 29deg 23'",
        "norm": 209.39355494698452,
        "house": 10
      },
      "houses": [
        {
          "index": 1,
          "cusp": 277.39567238584635,
          "sign": "Capricorn",
          "formatted": "Capricorn 7deg 23'",
          "graphId": "H1"
        },
        {
          "index": 2,
          "cusp": 316.4323533208196,
          "sign": "Aquarius",
          "formatted": "Aquarius 16deg 25'",
          "graphId": "H2"
        },
        {
          "index": 3,
          "cusp": 356.72892044055055,
          "sign": "Pisces",
          "formatted": "Pisces 26deg 43'",
          "graphId": "H3"
        },
        {
          "index": 4,
          "cusp": 29.393554946984523,
          "sign": "Aries",
          "formatted": "Aries 29deg 23'",
          "graphId": "H4"
        },
        {
          "index": 5,
          "cusp": 54.59737284241993,
          "sign": "Taurus",
          "formatted": "Taurus 24deg 35'",
          "graphId": "H5"
        },
        {
          "index": 6,
          "cusp": 76.01799531955976,
          "sign": "Gemini",
          "formatted": "Gemini 16deg 01'",
          "graphId": "H6"
        },
        {
          "index": 7,
          "cusp": 97.39567238584635,
          "sign": "Cancer",
          "formatted": "Cancer 7deg 23'",
          "graphId": "H7"
        },
        {
          "index": 8,
          "cusp": 136.43235332081957,
          "sign": "Leo",
          "formatted": "Leo 16deg 25'",
          "graphId": "H8"
        },
        {
          "index": 9,
          "cusp": 176.7289204405506,
          "sign": "Virgo",
          "formatted": "Virgo 26deg 43'",
          "graphId": "H9"
        },
        {
          "index": 10,
          "cusp": 209.39355494698452,
          "sign": "Libra",
          "formatted": "Libra 29deg 23'",
          "graphId": "H10"
        },
        {
          "index": 11,
          "cusp": 234.59737284241993,
          "sign": "Scorpio",
          "formatted": "Scorpio 24deg 35'",
          "graphId": "H11"
        },
        {
          "index": 12,
          "cusp": 256.01799531955976,
          "sign": "Sagittarius",
          "formatted": "Sagittarius 16deg 01'",
          "graphId": "H12"
        }
      ],
      "meta": {
        "jdUT": 2461105.2689930554,
        "isoUTC": "2026-03-06T03:27:21.185Z",
        "timeZone": "Asia/Seoul",
        "latitude": 37.5665,
        "longitude": 126.978,
        "houseSystem": "Placidus"
      }
    },
    "majorTransits": [
      {
        "from": {
          "name": "Jupiter",
          "kind": "transit",
          "house": 10,
          "sign": "Sagittarius",
          "longitude": 251.5066523290807
        },
        "to": {
          "name": "Moon",
          "kind": "natal",
          "house": 9,
          "sign": "Libra",
          "longitude": 192.54371994474414
        },
        "type": "trine",
        "orb": 1.0370676156634318,
        "score": 0.8114422516975579,
        "transitPlanet": "Jupiter",
        "natalPoint": "Moon",
        "isApplying": false
      },
      {
        "from": {
          "name": "Uranus",
          "kind": "transit",
          "house": 12,
          "sign": "Capricorn",
          "longitude": 297.73848781308584
        },
        "to": {
          "name": "Venus",
          "kind": "natal",
          "house": 3,
          "sign": "Pisces",
          "longitude": 359.1545262435887
        },
        "type": "trine",
        "orb": 1.4160384305028515,
        "score": 0.7821479337687921,
        "transitPlanet": "Uranus",
        "natalPoint": "Venus",
        "isApplying": true
      },
      {
        "from": {
          "name": "Pluto",
          "kind": "transit",
          "house": 10,
          "sign": "Sagittarius",
          "longitude": 240.44551487953368
        },
        "to": {
          "name": "Venus",
          "kind": "natal",
          "house": 3,
          "sign": "Pisces",
          "longitude": 359.1545262435887
        },
        "type": "sextile",
        "orb": 1.2909886359449843,
        "score": 0.7694663150098242,
        "transitPlanet": "Pluto",
        "natalPoint": "Venus",
        "isApplying": true
      },
      {
        "from": {
          "name": "Uranus",
          "kind": "transit",
          "house": 12,
          "sign": "Capricorn",
          "longitude": 297.73848781308584
        },
        "to": {
          "name": "MC",
          "kind": "natal",
          "house": 10,
          "sign": "Libra",
          "longitude": 209.39355494698452
        },
        "type": "square",
        "orb": 1.655067133898683,
        "score": 0.7453742870925103,
        "transitPlanet": "Uranus",
        "natalPoint": "MC",
        "isApplying": false
      },
      {
        "from": {
          "name": "Pluto",
          "kind": "transit",
          "house": 10,
          "sign": "Sagittarius",
          "longitude": 240.44551487953368
        },
        "to": {
          "name": "Mars",
          "kind": "natal",
          "house": 2,
          "sign": "Pisces",
          "longitude": 332.5013173257
        },
        "type": "square",
        "orb": 2.0558024461662967,
        "score": 0.7063139362619576,
        "transitPlanet": "Pluto",
        "natalPoint": "Mars",
        "isApplying": true
      },
      {
        "from": {
          "name": "Saturn",
          "kind": "transit",
          "house": 1,
          "sign": "Pisces",
          "longitude": 341.9717864716233
        },
        "to": {
          "name": "Sun",
          "kind": "natal",
          "house": 2,
          "sign": "Pisces",
          "longitude": 345.1866399664213
        },
        "type": "opposition",
        "orb": 3.214853494798035,
        "score": 0.5534925701669395,
        "transitPlanet": "Saturn",
        "natalPoint": "Sun",
        "isApplying": true
      },
      {
        "from": {
          "name": "Jupiter",
          "kind": "transit",
          "house": 10,
          "sign": "Sagittarius",
          "longitude": 251.5066523290807
        },
        "to": {
          "name": "Sun",
          "kind": "natal",
          "house": 2,
          "sign": "Pisces",
          "longitude": 345.1866399664213
        },
        "type": "square",
        "orb": 3.6799876373405596,
        "score": 0.3309113386653528,
        "transitPlanet": "Jupiter",
        "natalPoint": "Sun",
        "isApplying": true
      },
      {
        "from": {
          "name": "Saturn",
          "kind": "transit",
          "house": 1,
          "sign": "Pisces",
          "longitude": 341.9717864716233
        },
        "to": {
          "name": "Ascendant",
          "kind": "natal",
          "house": 1,
          "sign": "Capricorn",
          "longitude": 277.39567238584635
        },
        "type": "trine",
        "orb": 4.576114085776908,
        "score": 0.23731431903718203,
        "transitPlanet": "Saturn",
        "natalPoint": "Ascendant",
        "isApplying": false
      },
      {
        "from": {
          "name": "Neptune",
          "kind": "transit",
          "house": 12,
          "sign": "Capricorn",
          "longitude": 294.01578820080937
        },
        "to": {
          "name": "Venus",
          "kind": "natal",
          "house": 3,
          "sign": "Pisces",
          "longitude": 359.1545262435887
        },
        "type": "trine",
        "orb": 5.138738042779323,
        "score": 0.20942491649548878,
        "transitPlanet": "Neptune",
        "natalPoint": "Venus",
        "isApplying": true
      },
      {
        "from": {
          "name": "Neptune",
          "kind": "transit",
          "house": 12,
          "sign": "Capricorn",
          "longitude": 294.01578820080937
        },
        "to": {
          "name": "MC",
          "kind": "natal",
          "house": 10,
          "sign": "Libra",
          "longitude": 209.39355494698452
        },
        "type": "square",
        "orb": 5.377766746175212,
        "score": 0.1726512698191982,
        "transitPlanet": "Neptune",
        "natalPoint": "MC",
        "isApplying": false
      },
      {
        "from": {
          "name": "Neptune",
          "kind": "transit",
          "house": 12,
          "sign": "Capricorn",
          "longitude": 294.01578820080937
        },
        "to": {
          "name": "Mercury",
          "kind": "natal",
          "house": 2,
          "sign": "Pisces",
          "longitude": 348.5365929930683
        },
        "type": "trine",
        "orb": 5.479195207741043,
        "score": 0.15704689111676262,
        "transitPlanet": "Neptune",
        "natalPoint": "Mercury",
        "isApplying": true
      },
      {
        "from": {
          "name": "Saturn",
          "kind": "transit",
          "house": 1,
          "sign": "Pisces",
          "longitude": 341.9717864716233
        },
        "to": {
          "name": "Mercury",
          "kind": "natal",
          "house": 2,
          "sign": "Pisces",
          "longitude": 348.5365929930683
        },
        "type": "opposition",
        "orb": 6.564806521445007,
        "score": 0.0882213164659712,
        "transitPlanet": "Saturn",
        "natalPoint": "Mercury",
        "isApplying": true
      }
    ],
    "extraPoints": {
      "chiron": {
        "name": "Chiron",
        "longitude": 175.62485074751797,
        "sign": "Virgo",
        "degree": 25,
        "minute": 37,
        "formatted": "Virgo 25deg 37'",
        "house": 8,
        "description": "상처와 치유의 포인트. 내면의 상처를 통해 다른 이들을 치유하는 능력."
      },
      "lilith": {
        "name": "Lilith",
        "longitude": 64.12494713175957,
        "sign": "Gemini",
        "degree": 4,
        "minute": 7,
        "formatted": "Gemini 4deg 07'",
        "house": 4,
        "description": "검은 달 릴리스. 억압된 욕망, 그림자 자아, 본능적 힘."
      },
      "partOfFortune": {
        "name": "Part of Fortune",
        "longitude": 197.5671523253235,
        "sign": "Libra",
        "degree": 17,
        "minute": 34,
        "formatted": "Libra 17deg 34'",
        "house": 8,
        "description": "행운점. 물질적 풍요와 행운이 흐르는 영역."
      },
      "vertex": {
        "name": "Vertex",
        "longitude": 152.56284692415187,
        "sign": "Virgo",
        "degree": 2,
        "minute": 33,
        "formatted": "Virgo 2deg 33'",
        "house": 7,
        "description": "버텍스. 운명적 만남, 카르마적 연결 포인트."
      }
    },
    "asteroids": [
      {
        "name": "Ceres",
        "longitude": 132.33262560292863,
        "sign": "Leo",
        "degree": 12,
        "minute": 19,
        "formatted": "Leo 12deg 19'",
        "house": 7,
        "speed": -0.23165646546092036,
        "retrograde": true
      },
      {
        "name": "Pallas",
        "longitude": 45.142906693645465,
        "sign": "Taurus",
        "degree": 15,
        "minute": 8,
        "formatted": "Taurus 15deg 08'",
        "house": 3,
        "speed": 0.3735361067964379,
        "retrograde": false
      },
      {
        "name": "Juno",
        "longitude": 262.4859584924387,
        "sign": "Sagittarius",
        "degree": 22,
        "minute": 29,
        "formatted": "Sagittarius 22deg 29'",
        "house": 11,
        "speed": 0.27358601473453253,
        "retrograde": false
      },
      {
        "name": "Vesta",
        "longitude": 85.14958428321746,
        "sign": "Gemini",
        "degree": 25,
        "minute": 8,
        "formatted": "Gemini 25deg 08'",
        "house": 5,
        "speed": -0.020483121328474112,
        "retrograde": true
      }
    ],
    "secondaryProgressions": {
      "planets": [
        {
          "name": "Sun",
          "longitude": 350.9244272928812,
          "sign": "Pisces",
          "degree": 20,
          "minute": 55,
          "formatted": "Pisces 20deg 55'",
          "norm": 350.9244272928812,
          "house": 12,
          "speed": 0.9982097001307321,
          "retrograde": false
        },
        {
          "name": "Moon",
          "longitude": 109.09829916504411,
          "sign": "Cancer",
          "degree": 19,
          "minute": 5,
          "formatted": "Cancer 19deg 05'",
          "norm": 109.09829916504412,
          "house": 4,
          "speed": 12.322414305142711,
          "retrograde": false
        },
        {
          "name": "Mercury",
          "longitude": 325.9437285597265,
          "sign": "Aquarius",
          "degree": 25,
          "minute": 56,
          "formatted": "Aquarius 25deg 56'",
          "norm": 325.9437285597264,
          "house": 11,
          "speed": 1.351886243421868,
          "retrograde": false
        },
        {
          "name": "Venus",
          "longitude": 310.66983061245776,
          "sign": "Aquarius",
          "degree": 10,
          "minute": 40,
          "formatted": "Aquarius 10deg 40'",
          "norm": 310.66983061245776,
          "house": 10,
          "speed": 1.1832898119584887,
          "retrograde": false
        },
        {
          "name": "Mars",
          "longitude": 134.1927832515669,
          "sign": "Leo",
          "degree": 14,
          "minute": 11,
          "formatted": "Leo 14deg 11'",
          "norm": 134.19278325156688,
          "house": 5,
          "speed": -0.16335049440823812,
          "retrograde": true
        },
        {
          "name": "Jupiter",
          "longitude": 254.7312350967255,
          "sign": "Sagittarius",
          "degree": 14,
          "minute": 43,
          "formatted": "Sagittarius 14deg 43'",
          "norm": 254.73123509672553,
          "house": 8,
          "speed": 0.06257652464325697,
          "retrograde": false
        },
        {
          "name": "Saturn",
          "longitude": 345.7371029914857,
          "sign": "Pisces",
          "degree": 15,
          "minute": 44,
          "formatted": "Pisces 15deg 44'",
          "norm": 345.7371029914857,
          "house": 12,
          "speed": 0.1225197765655718,
          "retrograde": false
        },
        {
          "name": "Uranus",
          "longitude": 299.28205102037106,
          "sign": "Capricorn",
          "degree": 29,
          "minute": 16,
          "formatted": "Capricorn 29deg 16'",
          "norm": 299.282051020371,
          "house": 10,
          "speed": 0.04178403881267448,
          "retrograde": false
        },
        {
          "name": "Neptune",
          "longitude": 294.95643503510365,
          "sign": "Capricorn",
          "degree": 24,
          "minute": 57,
          "formatted": "Capricorn 24deg 57'",
          "norm": 294.9564350351036,
          "house": 10,
          "speed": 0.024433526779220928,
          "retrograde": false
        },
        {
          "name": "Pluto",
          "longitude": 240.58719596758124,
          "sign": "Sagittarius",
          "degree": 0,
          "minute": 35,
          "formatted": "Sagittarius 0deg 35'",
          "norm": 240.58719596758124,
          "house": 7,
          "speed": -0.004516546200197327,
          "retrograde": true
        },
        {
          "name": "True Node",
          "longitude": 216.6774091372174,
          "sign": "Scorpio",
          "degree": 6,
          "minute": 40,
          "formatted": "Scorpio 6deg 40'",
          "norm": 216.6774091372174,
          "house": 7,
          "speed": -0.07764304053565832,
          "retrograde": true
        }
      ],
      "ascendant": {
        "name": "Ascendant",
        "longitude": 28.547416273819596,
        "sign": "Aries",
        "degree": 28,
        "minute": 32,
        "formatted": "Aries 28deg 32'",
        "norm": 28.54741627381958,
        "house": 1
      },
      "mc": {
        "name": "MC",
        "longitude": 286.56376399718636,
        "sign": "Capricorn",
        "degree": 16,
        "minute": 33,
        "formatted": "Capricorn 16deg 33'",
        "norm": 286.56376399718636,
        "house": 10
      },
      "houses": [
        {
          "index": 1,
          "cusp": 28.547416273819596,
          "sign": "Aries",
          "formatted": "Aries 28deg 32'",
          "graphId": "H1"
        },
        {
          "index": 2,
          "cusp": 61.16914676584332,
          "sign": "Gemini",
          "formatted": "Gemini 1deg 10'",
          "graphId": "H2"
        },
        {
          "index": 3,
          "cusp": 84.87982311943473,
          "sign": "Gemini",
          "formatted": "Gemini 24deg 52'",
          "graphId": "H3"
        },
        {
          "index": 4,
          "cusp": 106.56376399718636,
          "sign": "Cancer",
          "formatted": "Cancer 16deg 33'",
          "graphId": "H4"
        },
        {
          "index": 5,
          "cusp": 130.82474874020602,
          "sign": "Leo",
          "formatted": "Leo 10deg 49'",
          "graphId": "H5"
        },
        {
          "index": 6,
          "cusp": 163.2542410402816,
          "sign": "Virgo",
          "formatted": "Virgo 13deg 15'",
          "graphId": "H6"
        },
        {
          "index": 7,
          "cusp": 208.5474162738196,
          "sign": "Libra",
          "formatted": "Libra 28deg 32'",
          "graphId": "H7"
        },
        {
          "index": 8,
          "cusp": 241.16914676584332,
          "sign": "Sagittarius",
          "formatted": "Sagittarius 1deg 10'",
          "graphId": "H8"
        },
        {
          "index": 9,
          "cusp": 264.8798231194347,
          "sign": "Sagittarius",
          "formatted": "Sagittarius 24deg 52'",
          "graphId": "H9"
        },
        {
          "index": 10,
          "cusp": 286.56376399718636,
          "sign": "Capricorn",
          "formatted": "Capricorn 16deg 33'",
          "graphId": "H10"
        },
        {
          "index": 11,
          "cusp": 310.824748740206,
          "sign": "Aquarius",
          "formatted": "Aquarius 10deg 49'",
          "graphId": "H11"
        },
        {
          "index": 12,
          "cusp": 343.25424104028156,
          "sign": "Pisces",
          "formatted": "Pisces 13deg 15'",
          "graphId": "H12"
        }
      ],
      "progressionType": "secondary",
      "yearsProgressed": 31.07,
      "progressedDate": "1995-03-12"
    },
    "solarArcDirections": {
      "planets": [
        {
          "name": "Sun",
          "longitude": 350.9244272928812,
          "sign": "Pisces",
          "degree": 20,
          "minute": 55,
          "formatted": "Pisces 20deg 55'",
          "norm": 350.9244272928812,
          "house": 2,
          "speed": 1.0125452038963718,
          "retrograde": false
        },
        {
          "name": "Moon",
          "longitude": 95.65422379098891,
          "sign": "Cancer",
          "degree": 5,
          "minute": 39,
          "formatted": "Cancer 5deg 39'",
          "norm": 95.65422379098891,
          "house": 5,
          "speed": 11.800764547295014,
          "retrograde": false
        },
        {
          "name": "Mercury",
          "longitude": 340.3082778893679,
          "sign": "Pisces",
          "degree": 10,
          "minute": 18,
          "formatted": "Pisces 10deg 18'",
          "norm": 340.3082778893679,
          "house": 1,
          "speed": -0.9378894903473167,
          "retrograde": true
        },
        {
          "name": "Venus",
          "longitude": 305.83120476398335,
          "sign": "Aquarius",
          "degree": 5,
          "minute": 49,
          "formatted": "Aquarius 5deg 49'",
          "norm": 305.83120476398335,
          "house": 1,
          "speed": 1.1310411576018333,
          "retrograde": false
        },
        {
          "name": "Mars",
          "longitude": 175.44062624963374,
          "sign": "Virgo",
          "degree": 25,
          "minute": 26,
          "formatted": "Virgo 25deg 26'",
          "norm": 175.44062624963374,
          "house": 8,
          "speed": -0.3961911858966349,
          "retrograde": true
        },
        {
          "name": "Jupiter",
          "longitude": 282.7668315490512,
          "sign": "Capricorn",
          "degree": 12,
          "minute": 46,
          "formatted": "Capricorn 12deg 46'",
          "norm": 282.7668315490512,
          "house": 12,
          "speed": 0.14064173238483296,
          "retrograde": false
        },
        {
          "name": "Saturn",
          "longitude": 13.231965691593757,
          "sign": "Aries",
          "degree": 13,
          "minute": 13,
          "formatted": "Aries 13deg 13'",
          "norm": 13.231965691593757,
          "house": 2,
          "speed": 0.11674366796837224,
          "retrograde": false
        },
        {
          "name": "Uranus",
          "longitude": 328.99866703305634,
          "sign": "Aquarius",
          "degree": 28,
          "minute": 59,
          "formatted": "Aquarius 28deg 59'",
          "norm": 328.99866703305634,
          "house": 1,
          "speed": 0.05585693449865477,
          "retrograde": false
        },
        {
          "name": "Neptune",
          "longitude": 325.2759674207798,
          "sign": "Aquarius",
          "degree": 25,
          "minute": 16,
          "formatted": "Aquarius 25deg 16'",
          "norm": 325.2759674207798,
          "house": 1,
          "speed": 0.03499341058857923,
          "retrograde": false
        },
        {
          "name": "Pluto",
          "longitude": 271.70569409950417,
          "sign": "Capricorn",
          "degree": 1,
          "minute": 42,
          "formatted": "Capricorn 1deg 42'",
          "norm": 271.70569409950417,
          "house": 11,
          "speed": 0.01365402849247233,
          "retrograde": false
        },
        {
          "name": "True Node",
          "longitude": 250.60149493539234,
          "sign": "Sagittarius",
          "degree": 10,
          "minute": 36,
          "formatted": "Sagittarius 10deg 36'",
          "norm": 250.60149493539234,
          "house": 10,
          "speed": -0.027270228452846098,
          "retrograde": true
        }
      ],
      "ascendant": {
        "name": "Ascendant",
        "longitude": 333.5571280434017,
        "sign": "Pisces",
        "degree": 3,
        "minute": 33,
        "formatted": "Pisces 3deg 33'",
        "norm": 333.5571280434017,
        "house": 1
      },
      "mc": {
        "name": "MC",
        "longitude": 264.1617227816073,
        "sign": "Sagittarius",
        "degree": 24,
        "minute": 9,
        "formatted": "Sagittarius 24deg 09'",
        "norm": 264.1617227816073,
        "house": 10
      },
      "houses": [
        {
          "index": 1,
          "cusp": 302.2969488234313,
          "sign": "Aquarius",
          "formatted": "Aquarius 2deg 17'",
          "graphId": "H1"
        },
        {
          "index": 2,
          "cusp": 346.7521381287476,
          "sign": "Pisces",
          "formatted": "Pisces 16deg 45'",
          "graphId": "H2"
        },
        {
          "index": 3,
          "cusp": 24.825215748424384,
          "sign": "Aries",
          "formatted": "Aries 24deg 49'",
          "graphId": "H3"
        },
        {
          "index": 4,
          "cusp": 52.90154356163691,
          "sign": "Taurus",
          "formatted": "Taurus 22deg 54'",
          "graphId": "H4"
        },
        {
          "index": 5,
          "cusp": 75.50385183364602,
          "sign": "Gemini",
          "formatted": "Gemini 15deg 30'",
          "graphId": "H5"
        },
        {
          "index": 6,
          "cusp": 97.01304395988694,
          "sign": "Cancer",
          "formatted": "Cancer 7deg 00'",
          "graphId": "H6"
        },
        {
          "index": 7,
          "cusp": 122.29694882343131,
          "sign": "Leo",
          "formatted": "Leo 2deg 17'",
          "graphId": "H7"
        },
        {
          "index": 8,
          "cusp": 166.75213812874767,
          "sign": "Virgo",
          "formatted": "Virgo 16deg 45'",
          "graphId": "H8"
        },
        {
          "index": 9,
          "cusp": 204.8252157484244,
          "sign": "Libra",
          "formatted": "Libra 24deg 49'",
          "graphId": "H9"
        },
        {
          "index": 10,
          "cusp": 232.9015435616369,
          "sign": "Scorpio",
          "formatted": "Scorpio 22deg 54'",
          "graphId": "H10"
        },
        {
          "index": 11,
          "cusp": 255.50385183364602,
          "sign": "Sagittarius",
          "formatted": "Sagittarius 15deg 30'",
          "graphId": "H11"
        },
        {
          "index": 12,
          "cusp": 277.01304395988694,
          "sign": "Capricorn",
          "formatted": "Capricorn 7deg 00'",
          "graphId": "H12"
        }
      ],
      "progressionType": "solarArc",
      "yearsProgressed": 31.07,
      "progressedDate": "2026-03-06"
    },
    "solarReturn": {
      "planets": [
        {
          "name": "Sun",
          "longitude": 319.66423047812583,
          "sign": "Aquarius",
          "degree": 19,
          "minute": 39,
          "formatted": "Aquarius 19deg 39'",
          "norm": 319.6642304781258,
          "house": 6,
          "speed": 1.0126322490749993,
          "retrograde": false
        },
        {
          "name": "Moon",
          "longitude": 217.70900817412746,
          "sign": "Scorpio",
          "degree": 7,
          "minute": 42,
          "formatted": "Scorpio 7deg 42'",
          "norm": 217.70900817412746,
          "house": 3,
          "speed": 12.037152948385737,
          "retrograde": false
        },
        {
          "name": "Mercury",
          "longitude": 332.59817931664645,
          "sign": "Pisces",
          "degree": 2,
          "minute": 35,
          "formatted": "Pisces 2deg 35'",
          "norm": 332.59817931664645,
          "house": 6,
          "speed": 1.734229582325429,
          "retrograde": false
        },
        {
          "name": "Venus",
          "longitude": 327.5046333369779,
          "sign": "Aquarius",
          "degree": 27,
          "minute": 30,
          "formatted": "Aquarius 27deg 30'",
          "norm": 327.5046333369779,
          "house": 6,
          "speed": 1.2532118083821344,
          "retrograde": false
        },
        {
          "name": "Mars",
          "longitude": 312.5586787142052,
          "sign": "Aquarius",
          "degree": 12,
          "minute": 33,
          "formatted": "Aquarius 12deg 33'",
          "norm": 312.55867871420514,
          "house": 6,
          "speed": 0.785145141703677,
          "retrograde": false
        },
        {
          "name": "Jupiter",
          "longitude": 106.59219530455806,
          "sign": "Cancer",
          "degree": 16,
          "minute": 35,
          "formatted": "Cancer 16deg 35'",
          "norm": 106.59219530455806,
          "house": 11,
          "speed": -0.09447464399926014,
          "retrograde": true
        },
        {
          "name": "Saturn",
          "longitude": 359.3995321627344,
          "sign": "Pisces",
          "degree": 29,
          "minute": 23,
          "formatted": "Pisces 29deg 23'",
          "norm": 359.39953216273443,
          "house": 7,
          "speed": 0.10544151616538515,
          "retrograde": false
        },
        {
          "name": "Uranus",
          "longitude": 57.468059751922944,
          "sign": "Taurus",
          "degree": 27,
          "minute": 28,
          "formatted": "Taurus 27deg 28'",
          "norm": 57.468059751922965,
          "house": 9,
          "speed": 0.0038413386537012296,
          "retrograde": false
        },
        {
          "name": "Neptune",
          "longitude": 0.355801533752441,
          "sign": "Aries",
          "degree": 0,
          "minute": 21,
          "formatted": "Aries 0deg 21'",
          "norm": 0.35580153375246937,
          "house": 7,
          "speed": 0.030397141541272817,
          "retrograde": false
        },
        {
          "name": "Pluto",
          "longitude": 303.9307439466052,
          "sign": "Aquarius",
          "degree": 3,
          "minute": 55,
          "formatted": "Aquarius 3deg 55'",
          "norm": 303.93074394660516,
          "house": 5,
          "speed": 0.031057695667584314,
          "retrograde": false
        },
        {
          "name": "True Node",
          "longitude": 339.129090605701,
          "sign": "Pisces",
          "degree": 9,
          "minute": 7,
          "formatted": "Pisces 9deg 07'",
          "norm": 339.129090605701,
          "house": 7,
          "speed": 0.014938909605452872,
          "retrograde": false
        }
      ],
      "ascendant": {
        "name": "Ascendant",
        "longitude": 158.18701926908864,
        "sign": "Virgo",
        "degree": 8,
        "minute": 11,
        "formatted": "Virgo 8deg 11'",
        "norm": 158.18701926908864,
        "house": 1
      },
      "mc": {
        "name": "MC",
        "longitude": 65.16818533848098,
        "sign": "Gemini",
        "degree": 5,
        "minute": 10,
        "formatted": "Gemini 5deg 10'",
        "norm": 65.16818533848095,
        "house": 10
      },
      "houses": [
        {
          "index": 1,
          "cusp": 158.18701926908864,
          "sign": "Virgo",
          "formatted": "Virgo 8deg 11'",
          "graphId": "H1"
        },
        {
          "index": 2,
          "cusp": 182.8850898802669,
          "sign": "Libra",
          "formatted": "Libra 2deg 53'",
          "graphId": "H2"
        },
        {
          "index": 3,
          "cusp": 212.21566155850044,
          "sign": "Scorpio",
          "formatted": "Scorpio 2deg 12'",
          "graphId": "H3"
        },
        {
          "index": 4,
          "cusp": 245.16818533848098,
          "sign": "Sagittarius",
          "formatted": "Sagittarius 5deg 10'",
          "graphId": "H4"
        },
        {
          "index": 5,
          "cusp": 278.8518263554132,
          "sign": "Capricorn",
          "formatted": "Capricorn 8deg 51'",
          "graphId": "H5"
        },
        {
          "index": 6,
          "cusp": 310.2463060585943,
          "sign": "Aquarius",
          "formatted": "Aquarius 10deg 14'",
          "graphId": "H6"
        },
        {
          "index": 7,
          "cusp": 338.18701926908864,
          "sign": "Pisces",
          "formatted": "Pisces 8deg 11'",
          "graphId": "H7"
        },
        {
          "index": 8,
          "cusp": 2.8850898802668894,
          "sign": "Aries",
          "formatted": "Aries 2deg 53'",
          "graphId": "H8"
        },
        {
          "index": 9,
          "cusp": 32.215661558500415,
          "sign": "Taurus",
          "formatted": "Taurus 2deg 12'",
          "graphId": "H9"
        },
        {
          "index": 10,
          "cusp": 65.16818533848098,
          "sign": "Gemini",
          "formatted": "Gemini 5deg 10'",
          "graphId": "H10"
        },
        {
          "index": 11,
          "cusp": 98.8518263554132,
          "sign": "Cancer",
          "formatted": "Cancer 8deg 51'",
          "graphId": "H11"
        },
        {
          "index": 12,
          "cusp": 130.2463060585943,
          "sign": "Leo",
          "formatted": "Leo 10deg 14'",
          "graphId": "H12"
        }
      ],
      "returnType": "solar",
      "returnYear": 2026,
      "exactReturnTime": "2026-02-08T10:30:50Z"
    },
    "lunarReturn": {
      "planets": [
        {
          "name": "Sun",
          "longitude": 3.014248928502126,
          "sign": "Aries",
          "degree": 3,
          "minute": 0,
          "formatted": "Aries 3deg 00'",
          "norm": 3.014248928502127,
          "house": 4,
          "speed": 0.9921767470521473,
          "retrograde": false
        },
        {
          "name": "Moon",
          "longitude": 64.39408632825001,
          "sign": "Gemini",
          "degree": 4,
          "minute": 23,
          "formatted": "Gemini 4deg 23'",
          "norm": 64.39408632825001,
          "house": 6,
          "speed": 14.433071628035698,
          "retrograde": false
        },
        {
          "name": "Mercury",
          "longitude": 338.8734220765984,
          "sign": "Pisces",
          "degree": 8,
          "minute": 52,
          "formatted": "Pisces 8deg 52'",
          "norm": 338.87342207659844,
          "house": 3,
          "speed": 0.2642583441405846,
          "retrograde": false
        },
        {
          "name": "Venus",
          "longitude": 21.339801863430036,
          "sign": "Aries",
          "degree": 21,
          "minute": 20,
          "formatted": "Aries 21deg 20'",
          "norm": 21.33980186343001,
          "house": 4,
          "speed": 1.2363385100543092,
          "retrograde": false
        },
        {
          "name": "Mars",
          "longitude": 346.5736582396798,
          "sign": "Pisces",
          "degree": 16,
          "minute": 34,
          "formatted": "Pisces 16deg 34'",
          "norm": 346.57365823967984,
          "house": 3,
          "speed": 0.7852111782788987,
          "retrograde": false
        },
        {
          "name": "Jupiter",
          "longitude": 105.33985057675449,
          "sign": "Cancer",
          "degree": 15,
          "minute": 20,
          "formatted": "Cancer 15deg 20'",
          "norm": 105.33985057675449,
          "house": 7,
          "speed": 0.040146440544953046,
          "retrograde": false
        },
        {
          "name": "Saturn",
          "longitude": 4.506132454895111,
          "sign": "Aries",
          "degree": 4,
          "minute": 30,
          "formatted": "Aries 4deg 30'",
          "norm": 4.506132454895123,
          "house": 4,
          "speed": 0.12487388695918625,
          "retrograde": false
        },
        {
          "name": "Uranus",
          "longitude": 58.4185410895763,
          "sign": "Taurus",
          "degree": 28,
          "minute": 25,
          "formatted": "Taurus 28deg 25'",
          "norm": 58.41854108957631,
          "house": 6,
          "speed": 0.03842492194406034,
          "retrograde": false
        },
        {
          "name": "Neptune",
          "longitude": 1.888572489827801,
          "sign": "Aries",
          "degree": 1,
          "minute": 53,
          "formatted": "Aries 1deg 53'",
          "norm": 1.8885724898278227,
          "house": 3,
          "speed": 0.037953429361823686,
          "retrograde": false
        },
        {
          "name": "Pluto",
          "longitude": 305.0666764365798,
          "sign": "Aquarius",
          "degree": 5,
          "minute": 4,
          "formatted": "Aquarius 5deg 04'",
          "norm": 305.0666764365799,
          "house": 2,
          "speed": 0.019605790526902686,
          "retrograde": false
        },
        {
          "name": "True Node",
          "longitude": 338.7577200470064,
          "sign": "Pisces",
          "degree": 8,
          "minute": 45,
          "formatted": "Pisces 8deg 45'",
          "norm": 338.7577200470064,
          "house": 3,
          "speed": -0.040027818398328495,
          "retrograde": true
        }
      ],
      "ascendant": {
        "name": "Ascendant",
        "longitude": 254.89589577904655,
        "sign": "Sagittarius",
        "degree": 14,
        "minute": 53,
        "formatted": "Sagittarius 14deg 53'",
        "norm": 254.89589577904655,
        "house": 1
      },
      "mc": {
        "name": "MC",
        "longitude": 182.46849706644238,
        "sign": "Libra",
        "degree": 2,
        "minute": 28,
        "formatted": "Libra 2deg 28'",
        "norm": 182.4684970664424,
        "house": 10
      },
      "houses": [
        {
          "index": 1,
          "cusp": 254.89589577904655,
          "sign": "Sagittarius",
          "formatted": "Sagittarius 14deg 53'",
          "graphId": "H1"
        },
        {
          "index": 2,
          "cusp": 288.55844874782986,
          "sign": "Capricorn",
          "formatted": "Capricorn 18deg 33'",
          "graphId": "H2"
        },
        {
          "index": 3,
          "cusp": 326.7432335961779,
          "sign": "Aquarius",
          "formatted": "Aquarius 26deg 44'",
          "graphId": "H3"
        },
        {
          "index": 4,
          "cusp": 2.46849706644241,
          "sign": "Aries",
          "formatted": "Aries 2deg 28'",
          "graphId": "H4"
        },
        {
          "index": 5,
          "cusp": 31.29431701299029,
          "sign": "Taurus",
          "formatted": "Taurus 1deg 17'",
          "graphId": "H5"
        },
        {
          "index": 6,
          "cusp": 54.45912872929512,
          "sign": "Taurus",
          "formatted": "Taurus 24deg 27'",
          "graphId": "H6"
        },
        {
          "index": 7,
          "cusp": 74.89589577904655,
          "sign": "Gemini",
          "formatted": "Gemini 14deg 53'",
          "graphId": "H7"
        },
        {
          "index": 8,
          "cusp": 108.55844874782986,
          "sign": "Cancer",
          "formatted": "Cancer 18deg 33'",
          "graphId": "H8"
        },
        {
          "index": 9,
          "cusp": 146.7432335961779,
          "sign": "Leo",
          "formatted": "Leo 26deg 44'",
          "graphId": "H9"
        },
        {
          "index": 10,
          "cusp": 182.46849706644238,
          "sign": "Libra",
          "formatted": "Libra 2deg 28'",
          "graphId": "H10"
        },
        {
          "index": 11,
          "cusp": 211.2943170129903,
          "sign": "Scorpio",
          "formatted": "Scorpio 1deg 17'",
          "graphId": "H11"
        },
        {
          "index": 12,
          "cusp": 234.45912872929512,
          "sign": "Scorpio",
          "formatted": "Scorpio 24deg 27'",
          "graphId": "H12"
        }
      ],
      "returnType": "lunar",
      "returnYear": 2026,
      "returnMonth": 3,
      "exactReturnTime": "2026-03-23T15:36:35Z"
    },
    "draconic": {
      "draconicChart": {
        "planets": [
          {
            "name": "Sun",
            "longitude": 100.32293235748881,
            "sign": "Cancer",
            "degree": 10,
            "minute": 19,
            "formatted": "Cancer 10deg 19'",
            "house": 1,
            "speed": 1.0125452038963718,
            "retrograde": false,
            "graphId": "Sun"
          },
          {
            "name": "Moon",
            "longitude": 205.0527288555965,
            "sign": "Libra",
            "degree": 25,
            "minute": 3,
            "formatted": "Libra 25deg 03'",
            "house": 4,
            "speed": 11.800764547295014,
            "retrograde": false,
            "graphId": "Moon"
          },
          {
            "name": "Mercury",
            "longitude": 89.7067829539755,
            "sign": "Gemini",
            "degree": 29,
            "minute": 42,
            "formatted": "Gemini 29deg 42'",
            "house": 1,
            "speed": -0.9378894903473167,
            "retrograde": true,
            "graphId": "Mercury"
          },
          {
            "name": "Venus",
            "longitude": 55.229709828590956,
            "sign": "Taurus",
            "degree": 25,
            "minute": 13,
            "formatted": "Taurus 25deg 13'",
            "house": 11,
            "speed": 1.1310411576018333,
            "retrograde": false,
            "graphId": "Venus"
          },
          {
            "name": "Mars",
            "longitude": 284.8391313142414,
            "sign": "Capricorn",
            "degree": 14,
            "minute": 50,
            "formatted": "Capricorn 14deg 50'",
            "house": 7,
            "speed": -0.3961911858966349,
            "retrograde": true,
            "graphId": "Mars"
          },
          {
            "name": "Jupiter",
            "longitude": 32.165336613658724,
            "sign": "Taurus",
            "degree": 2,
            "minute": 9,
            "formatted": "Taurus 2deg 09'",
            "house": 10,
            "speed": 0.14064173238483296,
            "retrograde": false,
            "graphId": "Jupiter"
          },
          {
            "name": "Saturn",
            "longitude": 122.63047075620136,
            "sign": "Leo",
            "degree": 2,
            "minute": 37,
            "formatted": "Leo 2deg 37'",
            "house": 1,
            "speed": 0.11674366796837224,
            "retrograde": false,
            "graphId": "Saturn"
          },
          {
            "name": "Uranus",
            "longitude": 78.39717209766388,
            "sign": "Gemini",
            "degree": 18,
            "minute": 23,
            "formatted": "Gemini 18deg 23'",
            "house": 12,
            "speed": 0.05585693449865477,
            "retrograde": false,
            "graphId": "Uranus"
          },
          {
            "name": "Neptune",
            "longitude": 74.67447248538741,
            "sign": "Gemini",
            "degree": 14,
            "minute": 40,
            "formatted": "Gemini 14deg 40'",
            "house": 12,
            "speed": 0.03499341058857923,
            "retrograde": false,
            "graphId": "Neptune"
          },
          {
            "name": "Pluto",
            "longitude": 21.10419916411172,
            "sign": "Aries",
            "degree": 21,
            "minute": 6,
            "formatted": "Aries 21deg 06'",
            "house": 10,
            "speed": 0.01365402849247233,
            "retrograde": false,
            "graphId": "Pluto"
          },
          {
            "name": "True Node",
            "longitude": 0,
            "sign": "Aries",
            "degree": 0,
            "minute": 0,
            "formatted": "Aries 0deg 00'",
            "house": 9,
            "speed": -0.027270228452846098,
            "retrograde": true,
            "graphId": "NorthNode"
          }
        ],
        "ascendant": {
          "name": "Ascendant",
          "longitude": 82.95563310800935,
          "sign": "Gemini",
          "degree": 22,
          "minute": 57,
          "formatted": "Gemini 22deg 57'",
          "norm": 302.2969488234313,
          "house": 1,
          "graphId": "Asc"
        },
        "mc": {
          "name": "MC",
          "longitude": 13.560227846214957,
          "sign": "Aries",
          "degree": 13,
          "minute": 33,
          "formatted": "Aries 13deg 33'",
          "norm": 232.9015435616369,
          "house": 10,
          "graphId": "MC"
        },
        "houses": [
          {
            "index": 1,
            "cusp": 82.95563310800935,
            "sign": "Gemini",
            "formatted": "Gemini 22deg 57'",
            "graphId": "H1"
          },
          {
            "index": 2,
            "cusp": 127.41082241332566,
            "sign": "Leo",
            "formatted": "Leo 7deg 24'",
            "graphId": "H2"
          },
          {
            "index": 3,
            "cusp": 165.48390003300244,
            "sign": "Virgo",
            "formatted": "Virgo 15deg 29'",
            "graphId": "H3"
          },
          {
            "index": 4,
            "cusp": 193.56022784621496,
            "sign": "Libra",
            "formatted": "Libra 13deg 33'",
            "graphId": "H4"
          },
          {
            "index": 5,
            "cusp": 216.16253611822407,
            "sign": "Scorpio",
            "formatted": "Scorpio 6deg 09'",
            "graphId": "H5"
          },
          {
            "index": 6,
            "cusp": 237.671728244465,
            "sign": "Scorpio",
            "formatted": "Scorpio 27deg 40'",
            "graphId": "H6"
          },
          {
            "index": 7,
            "cusp": 262.95563310800935,
            "sign": "Sagittarius",
            "formatted": "Sagittarius 22deg 57'",
            "graphId": "H7"
          },
          {
            "index": 8,
            "cusp": 307.4108224133257,
            "sign": "Aquarius",
            "formatted": "Aquarius 7deg 24'",
            "graphId": "H8"
          },
          {
            "index": 9,
            "cusp": 345.48390003300244,
            "sign": "Pisces",
            "formatted": "Pisces 15deg 29'",
            "graphId": "H9"
          },
          {
            "index": 10,
            "cusp": 13.560227846214957,
            "sign": "Aries",
            "formatted": "Aries 13deg 33'",
            "graphId": "H10"
          },
          {
            "index": 11,
            "cusp": 36.16253611822407,
            "sign": "Taurus",
            "formatted": "Taurus 6deg 09'",
            "graphId": "H11"
          },
          {
            "index": 12,
            "cusp": 57.67172824446499,
            "sign": "Taurus",
            "formatted": "Taurus 27deg 40'",
            "graphId": "H12"
          }
        ],
        "chartType": "draconic",
        "natalNorthNode": 219.34131571542196,
        "offsetDegrees": 219.34131571542196
      },
      "natalChart": {
        "planets": [
          {
            "name": "Sun",
            "longitude": 319.66424807291077,
            "sign": "Aquarius",
            "degree": 19,
            "minute": 39,
            "formatted": "Aquarius 19deg 39'",
            "house": 1,
            "speed": 1.0125452038963718,
            "retrograde": false,
            "graphId": "Sun"
          },
          {
            "name": "Moon",
            "longitude": 64.39404457101848,
            "sign": "Gemini",
            "degree": 4,
            "minute": 23,
            "formatted": "Gemini 4deg 23'",
            "house": 4,
            "speed": 11.800764547295014,
            "retrograde": false,
            "graphId": "Moon"
          },
          {
            "name": "Mercury",
            "longitude": 309.04809866939746,
            "sign": "Aquarius",
            "degree": 9,
            "minute": 2,
            "formatted": "Aquarius 9deg 02'",
            "house": 1,
            "speed": -0.9378894903473167,
            "retrograde": true,
            "graphId": "Mercury"
          },
          {
            "name": "Venus",
            "longitude": 274.5710255440129,
            "sign": "Capricorn",
            "degree": 4,
            "minute": 34,
            "formatted": "Capricorn 4deg 34'",
            "house": 11,
            "speed": 1.1310411576018333,
            "retrograde": false,
            "graphId": "Venus"
          },
          {
            "name": "Mars",
            "longitude": 144.18044702966333,
            "sign": "Leo",
            "degree": 24,
            "minute": 10,
            "formatted": "Leo 24deg 10'",
            "house": 7,
            "speed": -0.3961911858966349,
            "retrograde": true,
            "graphId": "Mars"
          },
          {
            "name": "Jupiter",
            "longitude": 251.5066523290807,
            "sign": "Sagittarius",
            "degree": 11,
            "minute": 30,
            "formatted": "Sagittarius 11deg 30'",
            "house": 10,
            "speed": 0.14064173238483296,
            "retrograde": false,
            "graphId": "Jupiter"
          },
          {
            "name": "Saturn",
            "longitude": 341.9717864716233,
            "sign": "Pisces",
            "degree": 11,
            "minute": 58,
            "formatted": "Pisces 11deg 58'",
            "house": 1,
            "speed": 0.11674366796837224,
            "retrograde": false,
            "graphId": "Saturn"
          },
          {
            "name": "Uranus",
            "longitude": 297.73848781308584,
            "sign": "Capricorn",
            "degree": 27,
            "minute": 44,
            "formatted": "Capricorn 27deg 44'",
            "house": 12,
            "speed": 0.05585693449865477,
            "retrograde": false,
            "graphId": "Uranus"
          },
          {
            "name": "Neptune",
            "longitude": 294.01578820080937,
            "sign": "Capricorn",
            "degree": 24,
            "minute": 0,
            "formatted": "Capricorn 24deg 00'",
            "house": 12,
            "speed": 0.03499341058857923,
            "retrograde": false,
            "graphId": "Neptune"
          },
          {
            "name": "Pluto",
            "longitude": 240.44551487953368,
            "sign": "Sagittarius",
            "degree": 0,
            "minute": 26,
            "formatted": "Sagittarius 0deg 26'",
            "house": 10,
            "speed": 0.01365402849247233,
            "retrograde": false,
            "graphId": "Pluto"
          },
          {
            "name": "True Node",
            "longitude": 219.34131571542196,
            "sign": "Scorpio",
            "degree": 9,
            "minute": 20,
            "formatted": "Scorpio 9deg 20'",
            "house": 9,
            "speed": -0.027270228452846098,
            "retrograde": true,
            "graphId": "NorthNode"
          }
        ],
        "ascendant": {
          "name": "Ascendant",
          "longitude": 302.2969488234313,
          "sign": "Aquarius",
          "degree": 2,
          "minute": 17,
          "formatted": "Aquarius 2deg 17'",
          "norm": 302.2969488234313,
          "house": 1,
          "graphId": "Asc"
        },
        "mc": {
          "name": "MC",
          "longitude": 232.9015435616369,
          "sign": "Scorpio",
          "degree": 22,
          "minute": 54,
          "formatted": "Scorpio 22deg 54'",
          "norm": 232.9015435616369,
          "house": 10,
          "graphId": "MC"
        },
        "houses": [
          {
            "index": 1,
            "cusp": 302.2969488234313,
            "sign": "Aquarius",
            "formatted": "Aquarius 2deg 17'",
            "graphId": "H1"
          },
          {
            "index": 2,
            "cusp": 346.7521381287476,
            "sign": "Pisces",
            "formatted": "Pisces 16deg 45'",
            "graphId": "H2"
          },
          {
            "index": 3,
            "cusp": 24.825215748424384,
            "sign": "Aries",
            "formatted": "Aries 24deg 49'",
            "graphId": "H3"
          },
          {
            "index": 4,
            "cusp": 52.90154356163691,
            "sign": "Taurus",
            "formatted": "Taurus 22deg 54'",
            "graphId": "H4"
          },
          {
            "index": 5,
            "cusp": 75.50385183364602,
            "sign": "Gemini",
            "formatted": "Gemini 15deg 30'",
            "graphId": "H5"
          },
          {
            "index": 6,
            "cusp": 97.01304395988694,
            "sign": "Cancer",
            "formatted": "Cancer 7deg 00'",
            "graphId": "H6"
          },
          {
            "index": 7,
            "cusp": 122.29694882343131,
            "sign": "Leo",
            "formatted": "Leo 2deg 17'",
            "graphId": "H7"
          },
          {
            "index": 8,
            "cusp": 166.75213812874767,
            "sign": "Virgo",
            "formatted": "Virgo 16deg 45'",
            "graphId": "H8"
          },
          {
            "index": 9,
            "cusp": 204.8252157484244,
            "sign": "Libra",
            "formatted": "Libra 24deg 49'",
            "graphId": "H9"
          },
          {
            "index": 10,
            "cusp": 232.9015435616369,
            "sign": "Scorpio",
            "formatted": "Scorpio 22deg 54'",
            "graphId": "H10"
          },
          {
            "index": 11,
            "cusp": 255.50385183364602,
            "sign": "Sagittarius",
            "formatted": "Sagittarius 15deg 30'",
            "graphId": "H11"
          },
          {
            "index": 12,
            "cusp": 277.01304395988694,
            "sign": "Capricorn",
            "formatted": "Capricorn 7deg 00'",
            "graphId": "H12"
          }
        ]
      },
      "alignments": [],
      "tensions": [
        {
          "draconicPlanet": "Moon",
          "natalPlanet": "Neptune",
          "aspectType": "square",
          "orb": 1.036940654787145,
          "meaning": "드라코닉 Moon과 출생 Neptune의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Venus",
          "natalPlanet": "Mars",
          "aspectType": "square",
          "orb": 1.049262798927657,
          "meaning": "드라코닉 Venus과 출생 Mars의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Moon",
          "natalPlanet": "Uranus",
          "aspectType": "square",
          "orb": 2.685758957489327,
          "meaning": "드라코닉 Moon과 출생 Uranus의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Neptune",
          "natalPlanet": "Saturn",
          "aspectType": "square",
          "orb": 2.702686013764094,
          "meaning": "드라코닉 Neptune과 출생 Saturn의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Pluto",
          "natalPlanet": "Neptune",
          "aspectType": "square",
          "orb": 2.9115890366976487,
          "meaning": "드라코닉 Pluto과 출생 Neptune의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Neptune",
          "natalPlanet": "Jupiter",
          "aspectType": "opposition",
          "orb": 3.167820156306675,
          "meaning": "드라코닉 Neptune과 출생 Jupiter의 오포지션 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Jupiter",
          "natalPlanet": "Uranus",
          "aspectType": "square",
          "orb": 4.426848800572884,
          "meaning": "드라코닉 Jupiter과 출생 Uranus의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "True Node",
          "natalPlanet": "Venus",
          "aspectType": "square",
          "orb": 4.571025544012912,
          "meaning": "드라코닉 True Node과 출생 Venus의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Mercury",
          "natalPlanet": "Venus",
          "aspectType": "opposition",
          "orb": 4.864242590037406,
          "meaning": "드라코닉 Mercury과 출생 Venus의 오포지션 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Saturn",
          "natalPlanet": "Uranus",
          "aspectType": "opposition",
          "orb": 4.891982943115522,
          "meaning": "드라코닉 Saturn과 출생 Uranus의 오포지션 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Venus",
          "natalPlanet": "Pluto",
          "aspectType": "opposition",
          "orb": 5.21580505094272,
          "meaning": "드라코닉 Venus과 출생 Pluto의 오포지션 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Venus",
          "natalPlanet": "Sun",
          "aspectType": "square",
          "orb": 5.5654617556801895,
          "meaning": "드라코닉 Venus과 출생 Sun의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Sun",
          "natalPlanet": "Venus",
          "aspectType": "opposition",
          "orb": 5.751906813475898,
          "meaning": "드라코닉 Sun과 출생 Venus의 오포지션 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Saturn",
          "natalPlanet": "Mercury",
          "aspectType": "opposition",
          "orb": 6.4176279131961,
          "meaning": "드라코닉 Saturn과 출생 Mercury의 오포지션 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Uranus",
          "natalPlanet": "Saturn",
          "aspectType": "square",
          "orb": 6.4253856260405655,
          "meaning": "드라코닉 Uranus과 출생 Saturn의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Pluto",
          "natalPlanet": "Uranus",
          "aspectType": "square",
          "orb": 6.63428864897412,
          "meaning": "드라코닉 Pluto과 출생 Uranus의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Saturn",
          "natalPlanet": "True Node",
          "aspectType": "square",
          "orb": 6.710844959220594,
          "meaning": "드라코닉 Saturn과 출생 True Node의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Jupiter",
          "natalPlanet": "Mercury",
          "aspectType": "square",
          "orb": 6.882762055738738,
          "meaning": "드라코닉 Jupiter과 출생 Mercury의 스퀘어 - 영혼의 의도와 현실 사이의 성장 압력"
        },
        {
          "draconicPlanet": "Uranus",
          "natalPlanet": "Jupiter",
          "aspectType": "opposition",
          "orb": 6.890519768583204,
          "meaning": "드라코닉 Uranus과 출생 Jupiter의 오포지션 - 영혼의 의도와 현실 사이의 성장 압력"
        }
      ],
      "summary": {
        "soulIdentity": "양육자 영혼 - 어머니, 치유자로서의 전생 경험",
        "soulNeeds": "관계, 균형 - 영혼이 진정으로 필요로 하는 것",
        "soulPurpose": "개척자 영혼의 사명 - 자율성, 용기를 통한 성취",
        "karmicLessons": "왕, 예술가에서의 미완성 과제 - 인정, 창조적 표현의 성숙",
        "alignmentScore": 0
      }
    },
    "harmonicProfile": {
      "strongestHarmonics": [
        {
          "harmonic": 8,
          "strength": 100,
          "meaning": "깊은 변형, 죽음과 재생"
        },
        {
          "harmonic": 7,
          "strength": 76.49136407821493,
          "meaning": "영감, 신비적 체험, 직관적 통찰"
        },
        {
          "harmonic": 12,
          "strength": 66.80010811501461,
          "meaning": "희생, 봉사, 카르마 완성"
        }
      ],
      "weakestHarmonics": [
        {
          "harmonic": 9,
          "strength": -297.8174377788621,
          "meaning": "지혜, 완성, 기쁨의 절정"
        },
        {
          "harmonic": 5,
          "strength": 0,
          "meaning": "개인적 스타일, 창조와 파괴의 힘"
        },
        {
          "harmonic": 3,
          "strength": 25.81730048863415,
          "meaning": "기쁨, 창조성, 자기 표현"
        }
      ],
      "ageHarmonic": {
        "harmonic": 31,
        "chart": {
          "planets": [
            {
              "name": "Sun",
              "longitude": 189.591690260233,
              "sign": "Libra",
              "degree": 9,
              "minute": 35,
              "formatted": "Libra 9deg 35'",
              "house": 1,
              "speed": 1.0125452038963718,
              "retrograde": false,
              "graphId": "Sun"
            },
            {
              "name": "Moon",
              "longitude": 196.21538170157305,
              "sign": "Libra",
              "degree": 16,
              "minute": 12,
              "formatted": "Libra 16deg 12'",
              "house": 4,
              "speed": 11.800764547295014,
              "retrograde": false,
              "graphId": "Moon"
            },
            {
              "name": "Mercury",
              "longitude": 220.49105875132045,
              "sign": "Scorpio",
              "degree": 10,
              "minute": 29,
              "formatted": "Scorpio 10deg 29'",
              "house": 1,
              "speed": -0.9378894903473167,
              "retrograde": true,
              "graphId": "Mercury"
            },
            {
              "name": "Venus",
              "longitude": 231.70179186439964,
              "sign": "Scorpio",
              "degree": 21,
              "minute": 42,
              "formatted": "Scorpio 21deg 42'",
              "house": 11,
              "speed": 1.1310411576018333,
              "retrograde": false,
              "graphId": "Venus"
            },
            {
              "name": "Mars",
              "longitude": 149.59385791956356,
              "sign": "Leo",
              "degree": 29,
              "minute": 35,
              "formatted": "Leo 29deg 35'",
              "house": 7,
              "speed": -0.3961911858966349,
              "retrograde": true,
              "graphId": "Mars"
            },
            {
              "name": "Jupiter",
              "longitude": 236.706222201502,
              "sign": "Scorpio",
              "degree": 26,
              "minute": 42,
              "formatted": "Scorpio 26deg 42'",
              "house": 10,
              "speed": 0.14064173238483296,
              "retrograde": false,
              "graphId": "Jupiter"
            },
            {
              "name": "Saturn",
              "longitude": 161.12538062032218,
              "sign": "Virgo",
              "degree": 11,
              "minute": 7,
              "formatted": "Virgo 11deg 07'",
              "house": 1,
              "speed": 0.11674366796837224,
              "retrograde": false,
              "graphId": "Saturn"
            },
            {
              "name": "Uranus",
              "longitude": 229.8931222056617,
              "sign": "Scorpio",
              "degree": 19,
              "minute": 53,
              "formatted": "Scorpio 19deg 53'",
              "house": 12,
              "speed": 0.05585693449865477,
              "retrograde": false,
              "graphId": "Uranus"
            },
            {
              "name": "Neptune",
              "longitude": 114.48943422509001,
              "sign": "Cancer",
              "degree": 24,
              "minute": 29,
              "formatted": "Cancer 24deg 29'",
              "house": 12,
              "speed": 0.03499341058857923,
              "retrograde": false,
              "graphId": "Neptune"
            },
            {
              "name": "Pluto",
              "longitude": 253.8109612655444,
              "sign": "Sagittarius",
              "degree": 13,
              "minute": 48,
              "formatted": "Sagittarius 13deg 48'",
              "house": 10,
              "speed": 0.01365402849247233,
              "retrograde": false,
              "graphId": "Pluto"
            },
            {
              "name": "True Node",
              "longitude": 319.58078717808075,
              "sign": "Aquarius",
              "degree": 19,
              "minute": 34,
              "formatted": "Aquarius 19deg 34'",
              "house": 9,
              "speed": -0.027270228452846098,
              "retrograde": true,
              "graphId": "NorthNode"
            }
          ],
          "ascendant": {
            "name": "Ascendant",
            "longitude": 11.205413526369739,
            "sign": "Aries",
            "degree": 11,
            "minute": 12,
            "formatted": "Aries 11deg 12'",
            "norm": 302.2969488234313,
            "house": 1,
            "graphId": "Asc"
          },
          "mc": {
            "name": "MC",
            "longitude": 19.94785041074465,
            "sign": "Aries",
            "degree": 19,
            "minute": 56,
            "formatted": "Aries 19deg 56'",
            "norm": 232.9015435616369,
            "house": 10,
            "graphId": "MC"
          },
          "houses": [
            {
              "index": 1,
              "cusp": 11.205413526369739,
              "sign": "Aries",
              "formatted": "Aries 11deg 12'",
              "graphId": "H1"
            },
            {
              "index": 2,
              "cusp": 309.31628199117586,
              "sign": "Aquarius",
              "formatted": "Aquarius 9deg 18'",
              "graphId": "H2"
            },
            {
              "index": 3,
              "cusp": 49.581688201155885,
              "sign": "Taurus",
              "formatted": "Taurus 19deg 34'",
              "graphId": "H3"
            },
            {
              "index": 4,
              "cusp": 199.9478504107442,
              "sign": "Libra",
              "formatted": "Libra 19deg 56'",
              "graphId": "H4"
            },
            {
              "index": 5,
              "cusp": 180.6194068430268,
              "sign": "Libra",
              "formatted": "Libra 0deg 37'",
              "graphId": "H5"
            },
            {
              "index": 6,
              "cusp": 127.40436275649517,
              "sign": "Leo",
              "formatted": "Leo 7deg 24'",
              "graphId": "H6"
            },
            {
              "index": 7,
              "cusp": 191.20541352637065,
              "sign": "Libra",
              "formatted": "Libra 11deg 12'",
              "graphId": "H7"
            },
            {
              "index": 8,
              "cusp": 129.31628199117768,
              "sign": "Leo",
              "formatted": "Leo 9deg 18'",
              "graphId": "H8"
            },
            {
              "index": 9,
              "cusp": 229.5816882011568,
              "sign": "Scorpio",
              "formatted": "Scorpio 19deg 34'",
              "graphId": "H9"
            },
            {
              "index": 10,
              "cusp": 19.94785041074465,
              "sign": "Aries",
              "formatted": "Aries 19deg 56'",
              "graphId": "H10"
            },
            {
              "index": 11,
              "cusp": 0.6194068430268089,
              "sign": "Aries",
              "formatted": "Aries 0deg 37'",
              "graphId": "H11"
            },
            {
              "index": 12,
              "cusp": 307.4043627564952,
              "sign": "Aquarius",
              "formatted": "Aquarius 7deg 24'",
              "graphId": "H12"
            }
          ],
          "harmonicNumber": 31,
          "chartType": "harmonic"
        },
        "strength": 50.22737788284143,
        "conjunctions": [
          {
            "planets": ["Venus", "Jupiter"],
            "averageLongitude": 234.2040070329508,
            "sign": "Scorpio",
            "orb": 2.5022151685511744,
            "strength": 0.7497784831448826
          },
          {
            "planets": ["Sun", "Moon"],
            "averageLongitude": 192.90353598090303,
            "sign": "Libra",
            "orb": 3.3118457206700214,
            "strength": 0.6688154279329979
          },
          {
            "planets": ["Ascendant", "MC"],
            "averageLongitude": 15.576631968557194,
            "sign": "Aries",
            "orb": 4.371218442187455,
            "strength": 0.5628781557812544
          },
          {
            "planets": ["Mercury", "Uranus"],
            "averageLongitude": 225.19209047849108,
            "sign": "Scorpio",
            "orb": 4.70103172717063,
            "strength": 0.529896827282937
          }
        ],
        "patterns": [],
        "interpretation": "H31 (H31): 보통 - 하모닉 31이 적절히 발현"
      },
      "overallInterpretation": "하모닉 프로필 분석:\n\n가장 강한 하모닉: H8 (깊은 변형, 죽음과 재생)\n이 영역에서 타고난 재능과 자연스러운 흐름이 있습니다.\n\n개발이 필요한 영역: H9 (지혜, 완성, 기쁨의 절정)\n의식적인 노력으로 이 영역을 강화할 수 있습니다.\n\n현재 나이 하모닉 (H31): 활성화된 해입니다."
    }
  }
}
```
