/**
 * 무료 궁합 리포트 — 40-에이전트 워크플로가 생성한 풍부한 해석 카피 (덮어쓰기 층).
 *
 * content.ts 의 베이스라인(BASE) 위에 이 값이 *덮어써진다*. 비어 있어도(생성
 * 실패/부분) 빌더는 베이스라인으로 동작한다 — 그래서 키는 모두 optional.
 * 이 파일의 prose 는 사람이 직접 손보기보다 워크플로 재실행으로 갱신한다.
 * (PILLAR_REL 은 Anthropic tool-schema 가 한글 키를 거부해 미생성 → 베이스라인 사용.)
 */

import type { Bi, BandCopy, SignalCopy } from "./types";

export interface GeneratedCopy {
  ASPECT_PAIR?: Record<string, Bi>;
  TEN_GODS?: Record<string, SignalCopy>;
  SPOUSE_STAR?: Record<string, SignalCopy>;
  PILLAR_REL?: Record<string, SignalCopy>;
  /** 키는 "1".."12" 문자열 — content 측에서 number 키로 변환. */
  OVERLAY_HOUSE?: Record<string, Bi>;
  DAY_MASTER_REL?: Record<string, Bi>;
  VERDICT_EXPANSION?: Record<string, Bi>;
  ELEMENT_BALANCE?: Record<string, Bi>;
  BAND?: Record<string, BandCopy>;
  META?: { intro?: Bi; closing?: Bi };
}

export const GENERATED: GeneratedCopy = {
  "META": {
    "intro": {
      "ko": "이 리포트는 두 사람의 사주(태어난 날이 담은 네 기둥의 이야기)와 별자리를 한 장에 겹쳐 놓고 가만히 들여다본 거예요. 동양의 결과 서양의 결이 같은 말을 하는 대목이 있다면, 그게 바로 두 사람 사이에서 또렷하게 드러나는 특징이라 볼 수 있어요. 낯선 단어가 나오면 그때그때 쉬운 뜻을 곁들였고, 더 궁금한 말은 아래 용어 풀이에서 다시 찾아볼 수 있어요.",
      "en": "This report lays your Saju — the story held in the four pillars of your birth — and your star charts side by side on one page, and simply looks. Where the Eastern reading and the Western reading happen to say the same thing, that's usually the trait that stands out most clearly between you. Whenever an unfamiliar word comes up we've slipped in a plain meaning beside it, and you can always look it up again in the glossary below."
    },
    "closing": {
      "ko": "여기까지는 두 사람을 멀리서 바라본 큰 그림이에요. 이 결들이 실제로 어떤 장면에서 어떻게 피어나는지, 어느 흐름에서 더 또렷해지는지 같은 구체적인 '어떻게'와 '언제'는 상담사가 훨씬 깊이 짚어 드릴 수 있는 자리예요. 마음이 더 가닿는다면, 그 깊은 이야기 속으로 한 걸음 들어가 보셔도 좋아요.",
      "en": "What you've read so far is the big picture, seen from a little distance. The specific how and when — how these patterns actually show up in real moments, where they grow more vivid — is exactly what a counselor can walk you through far more deeply. If something here tugged at you, you're welcome to step into that fuller story."
    }
  },
  "VERDICT_EXPANSION": {
    "aligned": {
      "ko": "두 사람의 차트가 같은 방향을 바라보는 결이에요. 끌림이 한쪽만의 일이 아니라 양쪽에서 동시에 일어나서, 처음부터 박자가 맞는 음악처럼 굳이 애쓰지 않아도 대화와 마음이 자연스럽게 흘러가는 모습이 보여요.",
      "en": "Your two charts seem to face the same direction. The pull isn't one-sided, it rises from both ends at once, so things flow like music that was already in rhythm, with talk and feeling moving along without much effort."
    },
    "tension": {
      "ko": "두 사람의 차트가 서로 맞부딪히는 결이에요. 양쪽이 쉽게 물러서지 않아 불꽃이 튀기도 하지만, 그렇게 부대끼는 사이에서 서로를 더 단단하게 만들어가는, 거친 돌이 마주 갈리며 매끈해지는 듯한 단련의 기운이 함께 담겨 있어요.",
      "en": "Your charts push against each other here. Neither side gives way easily, so sparks can fly, but in that friction there's a tempering quality too, like two rough stones grinding each other smooth over time."
    },
    "mixed": {
      "ko": "한쪽에선 끌림이, 다른 한쪽에선 부딪힘이 함께 흐르는 입체적인 결이에요. 어떤 자리에선 신기할 만큼 잘 통하다가도 다른 자리에선 묘하게 어긋나서, 단조롭지 않고 여러 표정을 가진 관계로 보여요.",
      "en": "One side pulls close while another pushes back, giving this a layered feel. In some spots you click in a way that's almost uncanny, and in others you slip out of sync, making for a relationship with many faces rather than one flat note."
    },
    "neutral": {
      "ko": "두 사람의 차트가 어느 한쪽으로 치우치지 않고 고르게 섞이는 결이에요. 첫눈에 타오르는 불꽃보다는, 잔잔한 강물처럼 큰 기복 없이 오래 곁에 머무는 종류의 무던하고 편안한 기운이 흐르는 사이로 보여요.",
      "en": "Your charts blend evenly, without tipping to one side. Rather than a flame that flares at first sight, there's the quiet of a slow river here, an easygoing steadiness that tends to stay close for a long while."
    }
  },
  "DAY_MASTER_REL": {
    "same": {
      "ko": "두 사람 모두 {aEl} 기운을 본바탕으로 가진 결이에요. 같은 언어를 쓰는 사람을 만난 것처럼 말하지 않아도 통하는 편안함이 흐르지만, 닮은 만큼 약한 자리도 똑같아서 한쪽이 흔들릴 때 같이 휘청이는 모습이 보이기도 해요.",
      "en": "Both of you carry {aEl} as your core nature. There's an easy familiarity here, like meeting someone who speaks your language without needing to explain. But because you're so alike, your soft spots line up too, and when one of you wobbles the other often sways along."
    },
    "aControlsB": {
      "ko": "{A}의 {aEl} 기운이 {B}의 {bEl}을 한 번 다듬고 매만지는 결이에요. {B} 입장에선 곁에 단단한 울타리가 생긴 듯 든든하지만, 그 손길이 가끔은 살짝 따끔하게 느껴지는 순간도 함께 담겨 있어요.",
      "en": "{A}'s {aEl} tends to shape and smooth {B}'s {bEl}. For {B} it can feel like having a steady fence nearby, reassuring and grounding, though now and then that same hand lands with a little sting."
    },
    "bControlsA": {
      "ko": "이번엔 {B}의 {bEl} 기운이 {A}의 {aEl}을 다듬어주는 결이에요. {A}는 곁에서 중심을 잡아주는 사람이 있는 듯 든든함을 느끼지만, 그 정돈하는 손길이 때로는 콕 짚이듯 따끔하게 와닿기도 해요.",
      "en": "This time it's {B}'s {bEl} that shapes and steadies {A}'s {aEl}. {A} feels the comfort of someone holding the center close by, yet that tidying touch can occasionally feel like a gentle but pointed nudge."
    },
    "generate": {
      "ko": "{aEl}과 {bEl}이 서로를 살려주며 자라게 하는 상생의 결이에요. 한 사람이 내어준 기운이 다른 사람 안에서 싹을 틔우고, 그게 다시 돌아와 처음 사람을 키우는, 물 주면 자라는 화분 같은 흐름이 자연스럽게 오가는 사이로 보여요.",
      "en": "{aEl} and {bEl} feed each other and help one another grow. What one person offers takes root in the other, then circles back to nourish the first, like a plant that thrives each time it's watered, a give-and-take that moves between you quite naturally."
    }
  },
  "TEN_GODS": {
    "비견": {
      "feel": {
        "ko": "어깨를 나란히 하는 동료의 끌림",
        "en": "the pull of a shoulder-to-shoulder companion"
      },
      "blurb": {
        "ko": "이 사람은 당신을 마주 보고 서기보다 옆에 나란히 서는 결로 다가와요. 같은 곳을 바라보는 동료처럼, 어깨를 부딪치며 비슷한 보폭으로 걷는 친구 같은 편안함이 느껴지는 사이예요. 보통 이런 결은 굳이 설명하지 않아도 통하는 익숙함과, 같은 편이 되어줄 든든함으로 다가오곤 해요.",
        "en": "Rather than standing face to face, this person comes to you side by side. There's an ease here, like a companion who looks in the same direction as you and walks at a matching pace, shoulders almost brushing. A bond like this often feels like the kind of familiarity where things just click without explaining, and the quiet reassurance of having someone on your team."
      }
    },
    "겁재": {
      "feel": {
        "ko": "겨루며 끌리는 기운",
        "en": "A pull that wants to compete"
      },
      "blurb": {
        "ko": "이 사람은 곁에 있으면 이상하게 더 잘하고 싶어지는, 살짝 승부욕을 건드리는 결로 다가와요. 편안하게 기대 쉬는 사이라기보다, 서로를 슬쩍 재고 한 발 더 내딛게 만드는 자극이 흐르는 끌림이에요. 보통 이런 결은 잔잔함보다 팽팽한 긴장감 속에서 마음이 움직이는 쪽이라, 함께 있으면 묘하게 등이 곧게 펴지는 느낌이 들곤 해요.",
        "en": "Being near this person somehow makes you want to step up your game—there's a quiet competitive spark in how they reach you. It's less the cozy, lean-back kind of closeness and more an attraction with a charged edge, the kind where you're each sizing the other up and nudging one another a little further. A pull like this tends to come alive in tension rather than calm, so their company often leaves you sitting up a little straighter without quite knowing why."
      }
    },
    "식신": {
      "feel": {
        "ko": "편안함·표현이 트이는 끌림",
        "en": "an ease that loosens your words"
      },
      "blurb": {
        "ko": "이 사람 앞에서는 이상하게 말문이 술술 트이고, 평소 안에만 담아두던 이야기도 자연스럽게 흘러나오는 결이에요. 보통 이런 끌림은 상대가 나의 긴장을 슬며시 풀어주는 자리에 있을 때 생기는데, 곁에 있으면 마음이 편해지면서 내가 가진 솜씨나 재주가 한결 가볍게 펼쳐지곤 해요. 잘 보이려 애쓰지 않아도 본래의 내 모습이 한 톤 더 환하게 드러나는, 그런 따뜻한 끌림이에요.",
        "en": "Around this person your words seem to come loose on their own, and even the things you usually keep tucked away find their way out naturally. An ease like this often shows up when someone quietly settles your nerves, and in their company your own talents and craft tend to unfold a little more lightly. It's the kind of warm pull where, without trying to impress, the real you simply comes through a shade brighter."
      }
    },
    "상관": {
      "feel": {
        "ko": "재치·자유로움의 끌림",
        "en": "the pull of wit and freedom"
      },
      "blurb": {
        "ko": "이 사람은 말 한마디로 분위기를 환하게 바꾸고, 어디로 튈지 모르는 생기로 곁을 가볍게 만들어주는 결로 다가와요. 보통 이런 결은 정해진 답보다 그때그때 떠오르는 재치와 즉흥적인 솜씨로 빛나서, 함께 있으면 일상이 조금 더 헐겁고 재미있어지는 느낌을 줘요. 무거운 자리를 농담 한 줄로 풀어내는 그 자유로움이, 당신에겐 묘하게 끌리는 신호로 비치네요.",
        "en": "This person comes to you as someone who can light up a room with a single quip, a bright unpredictability that makes the air around you feel lighter. A texture like this tends to shine in spur-of-the-moment wit and improvised charm rather than tidy answers, so being together loosens up the everyday and makes it more fun. That freedom to dissolve a heavy moment with one playful line reads, to you, like a quietly magnetic signal."
      }
    },
    "편재": {
      "feel": {
        "ko": "크게 굴러가는 기회·활달함의 끌림",
        "en": "the pull of big momentum and bright energy"
      },
      "blurb": {
        "ko": "두 사람의 결을 겹쳐 보면, 상대는 마치 닫혀 있던 창문을 활짝 열어젖히는 사람처럼 다가와요. 멈춰 있던 일들이 갑자기 굴러가기 시작하고, 평소라면 망설였을 자리에서도 한 발 더 내딛게 되는 활달함이 상대 쪽에서 흘러나오는 거예요. 그래서 이 사람 곁에 있으면 세상이 조금 더 넓어지고 가능성이 커지는 느낌이 드는, 그런 끌림이에요.",
        "en": "When you lay your two charts side by side, this person comes toward you like someone throwing open a window that had been shut. Things that felt stuck suddenly start rolling, and a kind of bright, expansive energy flows from their side that nudges you a step further than you'd usually dare. That's the pull here: beside this person, the world feels a little wider and your sense of what's possible grows."
      }
    },
    "정재": {
      "feel": {
        "ko": "안정·성실의 끌림",
        "en": "the pull of steady devotion"
      },
      "blurb": {
        "ko": "이 사람은 화려한 한 방보다, 하루치의 마음을 매일 같은 자리에 쌓아 올리는 결로 다가와요. 약속한 건 조용히 지키고, 어제보다 조금 더 단단해진 모습으로 곁에 있어서, 함께 있으면 발밑이 든든해지는 느낌이 드는 사이예요. 보통 이런 결은 요란하지 않아도 오래 데워지는 온기로 남곤 한답니다.",
        "en": "This person comes through not as a dazzling spark but as someone who lays down a little care in the same spot every single day. They keep their word quietly and show up a touch steadier than yesterday, so being near them makes the ground feel solid under your feet. A pull like this tends to stay as a warmth that builds slowly rather than loudly."
      }
    },
    "편관": {
      "feel": {
        "ko": "끌어당기는 격정의 결",
        "en": "A pull of intense, magnetic heat"
      },
      "blurb": {
        "ko": "두 분의 결을 겹쳐 보면, 상대가 잔잔한 호수에 돌을 던지듯 나를 흔들고 밀어붙이는 모양이 또렷하게 나타나요. 그 기운은 가만히 있던 마음을 단번에 달뜨게 하는 짜릿함과, 동시에 어딘가 떠밀리는 듯한 묵직한 부담이 한 호흡에 같이 묻어 오는 결이에요. 보통 이런 끌림은 심심할 틈을 주지 않는 격정과 긴장이 늘 함께 흐르는 사이로 그려지곤 해요.",
        "en": "When your two charts overlap, there's a clear shape of the other person stirring you up and pressing forward, like a stone tossed into a still pond. That energy carries a jolt that lights up a quiet heart in an instant, and in the same breath a heavier sense of being pushed somewhere you didn't quite choose. A pull like this tends to read as a bond where heat and tension always run together, never leaving room for a dull moment."
      }
    },
    "정관": {
      "feel": {
        "ko": "기대고 싶은 듬직함",
        "en": "Steady, Lean-on Pull"
      },
      "blurb": {
        "ko": "이 사람의 결은 묵직한 어깨 같은 데가 있어요. 곁에 있으면 어딘가 기대고 싶고, 작은 일도 알아서 챙겨주는 책임감이 마음을 놓이게 하죠. 그 챙김이 가끔은 한 발짝 더 들어와 간섭처럼 느껴지기도 하지만, 보통 이런 결은 무심함이 아니라 너를 살피고 싶은 마음에서 나오는 듬직함으로 다가와요.",
        "en": "There's something of a broad, steady shoulder in how this person comes across. Being near them makes you want to lean in a little, and the quiet responsibility with which they handle even small things sets your mind at ease. That care can sometimes step a touch too close and feel like fussing, but usually this kind of warmth reads less as control and more as a dependability that simply wants to keep an eye on you."
      }
    },
    "편인": {
      "feel": {
        "ko": "직관·독특함의 끌림 (살짝 거리)",
        "en": "Drawn to their intuition and quiet mystery"
      },
      "blurb": {
        "ko": "이 사람은 남들과 다른 시선으로 세상을 읽는 결을 가지고 있어서, 당신에게는 어딘가 신비롭고 자꾸 들여다보고 싶은 사람으로 비쳐요. 가까이 다가가도 마지막 한 뼘은 손에 다 잡히지 않는, 그 옅은 거리감이 오히려 끌림을 더 깊게 만드는 사이랍니다. 보통 이런 결은 익숙함보다 호기심으로 시작되는 인연으로 다가오곤 해요.",
        "en": "This person reads the world through a lens unlike anyone else's, which is exactly why they come across to you as a little mysterious, someone you keep wanting to understand. Even up close, there's always a last small inch you can't quite reach, and that faint distance is what makes the pull run deeper. A connection with this texture tends to begin not from familiarity but from curiosity."
      }
    },
    "정인": {
      "feel": {
        "ko": "보살핌·성숙의 끌림",
        "en": "the pull of steady care"
      },
      "blurb": {
        "ko": "상대는 당신 곁에서 천천히, 그러나 꾸준히 마음을 데워주는 결로 다가와요. 화려한 불꽃이라기보다 매일 같은 자리에서 불씨를 살펴주는 사람의 온기에 가까워서, 그 곁에 있으면 어느새 한 뼘 더 자라 있는 자신을 발견하게 되는 끌림이죠. 보살핌이 곧 가르침이 되는, 그런 둥근 다정함의 결이에요.",
        "en": "Their warmth reaches you slowly but steadily, more like someone tending a quiet ember in the same spot each day than a sudden blaze. Being near that kind of care has a way of leaving you a little more grown than you were, almost without noticing. It's the soft, rounded tenderness where looking after someone quietly becomes a kind of teaching."
      }
    }
  },
  "SPOUSE_STAR": {
    "정재": {
      "feel": {
        "ko": "안정·가정의 짝",
        "en": "A steady, home-building partner"
      },
      "blurb": {
        "ko": "배우자 자리에서 상대가 하루하루 작은 벽돌을 쌓듯 둘의 안정을 차곡차곡 만들어가는 짝으로 떠올라요. 화려한 설렘보다는 곁에 있으면 마음이 놓이는 믿음직함, 약속을 지키고 함께 집을 가꾸는 성실함이 끌림의 결이에요. 보통 이런 결은 요란하지 않게, 오래 머무는 따뜻함으로 다가오곤 해요.",
        "en": "In the place that speaks of a life partner, this person comes through as someone who builds your shared stability brick by brick, day after day. The pull here isn't dazzling excitement so much as a quiet dependability, the kind that keeps promises and tends a home together, so being near them simply feels safe. A current like this tends to arrive softly and stay a long, warm while."
      }
    },
    "편재": {
      "feel": {
        "ko": "생기·재미의 짝",
        "en": "A lively, fun-loving partner"
      },
      "blurb": {
        "ko": "배우자 자리에서 활달하고 자유롭게 굴러가는 사람이 짝으로 떠올라요. 한자리에 가만히 묶이기보다 어디로 튈지 모르는 생기가 늘 곁에 있고, 보통 이런 결은 같이 있으면 일상이 재밌어지고 어쩐지 마음이 가벼워지는 끌림으로 다가와요.",
        "en": "In the place of a life partner, someone breezy and free-spirited tends to come into view. Rather than staying neatly in one spot, they carry a playful, unpredictable spark, and this kind of pull usually feels like life gets more fun and your heart somehow lighter when they're around."
      }
    },
    "정관": {
      "feel": {
        "ko": "안심·가정의 짝",
        "en": "A safe-harbor partner"
      },
      "blurb": {
        "ko": "배우자 자리에서 상대가 기대고 싶을 만큼 듬직한 짝으로 떠올라요. 약속한 건 끝까지 책임지고, 흔들리는 날에도 반듯하게 곁을 지키는 결이라, 보통 이런 사람 옆에선 마음이 자연스럽게 가라앉고 안심이 들곤 해요. 화려한 설렘보다는 함께 집을 짓는 듯한 든든한 끌림으로 다가오는 인연이에요.",
        "en": "In the place your chart reserves for a life partner, this person comes through as someone solid enough to lean on. They tend to follow through on what they promise and stay steady and grounded even on shaky days, so being near someone like this usually settles the heart and brings a quiet sense of safety. It's less the flutter of dazzle and more the reassuring pull of building a home together."
      }
    },
    "편관": {
      "feel": {
        "ko": "열정·끌림의 짝",
        "en": "A spark-and-pull partner"
      },
      "blurb": {
        "ko": "배우자 자리에서 가만히 곁에 머무는 사람보다, 마주 서면 심장이 한 박자 빨라지는 짝으로 떠올라요. 끌림이 강한 만큼 살짝 팽팽한 긴장이 함께 흐르는 결이라, 편안하다기보다 자꾸 눈이 가고 신경이 쓰이는 자극을 주는 상대로 그려지는 편이에요. 보통 이런 결은 잔잔함보다 짜릿함 쪽으로 마음이 기우는 모습으로 비쳐요.",
        "en": "In the place your chart reserves for a partner, the one who surfaces isn't the quietly steady type but the kind who makes your heart skip a beat the moment you face them. The pull is strong, and a little tension hums right alongside it, so they read less like comfort and more like someone who keeps catching your eye and stirring you up. A chart with this texture tends to lean toward the thrill rather than the calm."
      }
    }
  },
  "ELEMENT_BALANCE": {
    "balanced": {
      "ko": "두 사람의 기운을 한데 모아보면 어느 한쪽으로 쏠리지 않고 고루 퍼져 있는 결이에요. 잘 차려진 한 상처럼 빠진 맛 없이 두루 갖춰진 느낌이라, 함께 있을 때 묘하게 균형 잡힌 안정감이 감도는 사이로 보여요.",
      "en": "Put your energies together and they spread out evenly, with nothing crowding to one corner. It feels like a well-set table where no flavor is missing, so being together carries a quietly balanced sense of steadiness."
    },
    "complement": {
      "ko": "한 사람에게 옅은 자리를 다른 사람이 짙게 채워주는, 서로의 빈칸을 메우는 결이에요. 퍼즐 두 조각이 맞물리듯 혼자일 땐 비어 보이던 부분이 함께 있으면 자연스레 채워지는 모습이 보여요.",
      "en": "Where one of you runs thin, the other runs full, so you fill in each other's blanks. Like two puzzle pieces locking in, the gaps that showed when you were on your own quietly close up once you're together."
    },
    "skewed": {
      "ko": "두 사람을 합한 기운이 {strongEl} 쪽으로 묵직하게 쏠리고 {weakEl}은 옅게 비치는 결이에요. {strongEl}의 색이 워낙 진하다 보니 관계 전체에 그 분위기가 짙게 물들고, 상대적으로 {weakEl}의 결은 배경처럼 은은하게 깔리는 모습으로 보여요.",
      "en": "Combined, your energies lean heavily toward {strongEl} while {weakEl} shows up only faintly. The shade of {strongEl} is so deep that it tints the whole relationship, and {weakEl} settles in softly underneath, more like a background hum."
    }
  },
  "ASPECT_PAIR": {
    "Moon|Sun": {
      "ko": "한 사람의 마음의 리듬과 다른 사람의 가장 깊은 중심이 맞닿는, 궁합에서 가장 핵심이 되는 자리예요. 해와 달이 만나듯 한쪽의 감정(달)이 다른 쪽의 자아(해)를 비추고, 그 사람의 정체성이 다시 마음의 결을 물들이는 풍경이 그려져요. 두 사람이 서로를 '있는 그대로' 느끼고 받아들이는 일이 오가는 축이라, 관계의 정서적 온도가 이곳에서부터 그려지는 결이에요.",
      "en": "This is the most central place in your compatibility, where one person's emotional rhythm touches the very core of who the other person is. Like the sun and moon meeting, one's feelings (the Moon) reflect the other's sense of self (the Sun), and that identity in turn colors the texture of the other's heart. It's the axis where the two of you feel and accept each other exactly as you are, so the emotional warmth of the whole relationship tends to take shape right here."
    },
    "Mars|Venus": {
      "ko": "한 사람의 끌림과 속도, 밀어붙이는 에너지가 다른 사람의 사랑하는 방식과 취향에 가닿는 자리예요. 욕망(화성)과 애정(금성)이 마주 보는, 궁합에서 흔히 '불꽃이 튀느냐 마느냐'를 가르는 결이라 둘 사이의 끌어당김과 설렘이 어떤 온도로 흐르는지를 보여주는 축이에요.",
      "en": "This is the place where one person's pull, pace, and forward-moving energy reaches the other's way of loving and what charms them. It's where desire (Mars) and affection (Venus) face each other, the very thread that so often decides whether sparks fly, showing you the temperature of the attraction and flutter that runs between the two of you."
    },
    "Moon|Venus": {
      "ko": "한 사람의 마음이 흐르는 결과 다른 사람이 사랑을 건네는 방식이 맞닿는 자리예요. 감정(달)과 애정(금성)이 서로의 결을 더듬는, 일상의 다정함이 오가는 결이라 함께 있을 때의 온도가 정해지는 부분이기도 해요. 누가 어떻게 마음을 표현하고, 그 표현이 상대 마음에 어떻게 가닿는지가 여기서 그려지는 그림이에요.",
      "en": "This is the place where one person's inner emotional current touches the way the other reaches out with love. It's where feeling (the Moon) and affection (Venus) feel for each other's texture, the part that shapes the warmth between you in everyday closeness. How one of you offers tenderness, and how it lands in the other's heart, is the picture being drawn here."
    },
    "Mars|Moon": {
      "ko": "한 사람의 끌림과 추진력(화성), 그러니까 무언가를 향해 달려가는 속도와 에너지가, 다른 사람의 마음이 흐르는 정서적 리듬과 맞닿는 자리예요. 한쪽이 불꽃처럼 당기고 움직이는 결과 다른 한쪽이 잔잔히 차오르는 감정의 결이 서로를 직접 건드리는, 끌림과 마음이 한자리에서 만나는 축이에요. 두 사람 사이에서 설렘과 정서가 얼마나 가깝게 포개지는지를 보여주는 결이랍니다.",
      "en": "This is the place where one person's pull and drive (Mars), the speed and energy of chasing after something, meets the emotional rhythm of how the other person's heart moves. It's the axis where one side's spark-like, forward-leaning energy and the other side's quietly rising feelings touch each other directly, where attraction and emotion meet in the same spot. It's the thread that shows how closely the flutter of desire and the tides of feeling overlap between the two of you."
    },
    "Mercury|Mercury": {
      "ko": "한 사람의 말과 생각이 흐르는 결과 다른 사람의 말과 생각이 흐르는 결이 마주 닿는 자리예요. 둘이 어떻게 대화하고, 무엇을 어떻게 받아들이고 풀어내는지, 그 머릿속 리듬과 언어가 서로 겹쳐 보이는 지점이라, 일상의 잡담부터 진지한 이야기까지 두 사람의 소통이 만들어지는 결이에요.",
      "en": "This is the place where the way one person's words and thoughts flow comes face to face with the other's. It's where your two mental rhythms and your ways of speaking, listening, and making sense of things overlap, so it shapes the whole texture of how you talk together, from light everyday chatter to the deeper conversations."
    },
    "Moon|Moon": {
      "ko": "한 사람의 마음의 리듬과 다른 사람의 마음의 리듬이 직접 포개지는 자리예요. 둘이 무언가에 울컥하고 안심하고 서운해지는 그 결, 그러니까 일상에서 감정이 오르내리는 박자가 서로 맞닿는 곳이에요. 말로 설명하기 전에 분위기로 먼저 느껴지는, 두 사람 마음의 온도가 만나는 결이랍니다.",
      "en": "This is the place where one person's emotional rhythm folds directly into the other's. It's the part of you both that wells up, settles, or quietly aches — the everyday tempo of feelings rising and falling, touching each other. It's a meeting of inner temperatures, the kind you sense in the air before either of you finds the words."
    },
    "Venus|Venus": {
      "ko": "한 사람의 애정(금성)과 다른 사람의 애정(금성)이 마주 보는 자리예요. 둘 다 사랑할 때 무엇에 설레고 무엇을 예쁘다 여기는지, 그 취향과 끌림의 결끼리 맞닿는 곳이라, 서로를 어떻게 아끼고 어떤 다정함을 주고받는지가 고스란히 드러나는 자리랍니다.",
      "en": "This is the place where one person's way of loving (Venus) meets the other's way of loving (Venus). It's where two sets of tastes and attractions touch directly, so it quietly reveals what each of you finds sweet and lovely, and the kind of tenderness you tend to offer and receive from each other."
    },
    "Sun|Sun": {
      "ko": "두 사람 각자의 '나는 이런 사람이다' 하는 중심이 정면으로 맞닿는, 궁합에서 가장 깊은 자리예요. 서로의 자아(태양)와 자아(태양)가 같은 무대에 함께 서는 결이라, 두 사람이 세상을 바라보는 방식과 삶을 끌고 가는 기질이 그대로 포개지는 자리랍니다. 한 사람의 빛과 다른 한 사람의 빛이 한 곳에서 만나, 관계의 가장 근본적인 톤을 함께 칠하는 만남이에요.",
      "en": "This is the deepest spot in your chart together — where each person's core sense of \"this is who I am\" meets the other head-on. Your two selves (the Sun) step onto the same stage, so the way you each see the world and steer your lives lays directly over one another. One person's light and the other's gather in the same place, painting the most fundamental tone of the whole relationship together."
    },
    "Mars|Mars": {
      "ko": "한 사람의 끌림과 추진력(화성)이 다른 사람의 끌림과 추진력(화성)과 맞닿는 자리예요. 두 사람의 속도와 열기, 무언가를 향해 달려드는 에너지가 같은 결에서 부딪히는, 말하자면 둘 다 액셀을 밟는 곳이라 관계의 박자와 추진력이 가장 선명하게 드러나는 자리예요.",
      "en": "This is where one person's spark and drive (Mars) meets the other's spark and drive (Mars). It's the place where your tempo, your heat, and the way you both lunge toward what you want come into contact, so to speak, the spot where you're both on the gas, which is why the rhythm and momentum of the relationship show up most vividly right here."
    },
    "Moon|Saturn": {
      "ko": "한 사람의 마음의 리듬, 그러니까 기분이 차오르고 가라앉는 정서의 결이, 다른 사람이 관계에 가져오는 무게와 약속(토성)의 결과 맞닿는 자리예요. 한쪽은 그날그날의 감정을 흐르듯 느끼고, 다른 쪽은 그 감정을 진지하게 떠받치고 지키려는 쪽이라, 마음의 온도와 책임의 무게가 서로를 시험하듯 또렷이 비추는 결이에요. 궁합에서 보면 가벼운 설렘만이 아니라 이 관계가 얼마나 단단해질 수 있는지를 건드리는 축이랍니다.",
      "en": "This is the place where one person's emotional rhythm, the quiet rise and fall of how they feel, meets the weight and commitment (Saturn) that the other brings into the relationship. One of you tends to feel each day's mood as something flowing and changeable, while the other instinctively wants to hold those feelings steady and keep them safe, so the warmth of the heart and the weight of responsibility end up reflecting each other in a clear, almost testing way. In a compatibility reading, this is the axis that touches not just easy fluttering, but how solid and lasting this bond can grow to be."
    },
    "Saturn|Venus": {
      "ko": "한 사람이 관계에 들이는 무게와 약속, 그러니까 거리감과 책임의 결이 다른 사람이 사랑을 표현하는 방식, 무엇에 마음이 끌리고 어떻게 다정함을 건네는지(애정·금성)와 맞닿는 자리예요. 한쪽이 진중하게 재고 다지려는 마음과 다른 쪽이 부드럽게 좋아하고 누리려는 마음이 같은 무대에서 서로를 마주 보는, 사랑의 온도와 관계의 무게가 어떻게 포개지는지 드러나는 결이에요.",
      "en": "This is the place where one person's sense of weight and commitment in the relationship, that pull toward distance and responsibility, meets the way the other person loves, what their heart is drawn to and how they offer their tenderness (affection, Venus). It's where one's careful, steadying instinct stands on the same stage as the other's softer way of delighting and savoring, showing how the warmth of love and the gravity of commitment come to rest against each other."
    },
    "Mars|Saturn": {
      "ko": "한 사람의 끌림과 추진력(애정과 활력의 결), 그러니까 좋아하면 곧장 다가가고 속도를 내는 마음이, 다른 사람의 무게와 거리감(약속을 재고 천천히 다가서는 결)과 정면으로 맞물리는 자리예요. 끌어당기는 에너지와 한 발 물러서서 시험하는 마음이 같은 지점에서 만나는, 두 사람의 속도와 거리감이 가장 솔직하게 드러나는 결이에요.",
      "en": "This is the spot where one person's pull and momentum — the warmth and spark that rushes in the moment they like someone — meets the other's weight and distance, the part that measures a promise and steps closer slowly. The drawing-in energy and the holding-back, testing heart land on the very same point, so it's the place where the two of you reveal your true pace and sense of closeness most honestly."
    },
    "Moon|Pluto": {
      "ko": "한 사람의 마음의 리듬과 다른 사람의 가장 깊은 곳, 쉽게 흔들리지 않는 강렬함(명왕성)이 맞물리는 자리예요. 잔잔한 호수에 깊은 물줄기가 닿듯, 한쪽의 일상적인 감정의 결을 다른 한쪽이 바닥까지 끌어내리는 깊이로 받아들이는 만남이라, 둘 사이에서 마음이 표면에 머물지 않고 자꾸 더 안쪽을 건드리게 되는 결이에요.",
      "en": "This is where one person's emotional rhythm meets the other's deepest, most unshakable intensity (Pluto). Like a still lake touched by a current running far below the surface, one person's everyday feelings get drawn down to their roots by the other, so between the two of you the heart rarely stays on the surface and keeps reaching toward something deeper."
    },
    "Pluto|Venus": {
      "ko": "한 사람의 가장 깊고 강렬한 부분과 다른 사람이 사랑을 표현하고 끌리는 방식이 맞닿는 자리예요. 매력(금성)이라는 부드러운 결 위로 상대의 깊은 마음(명왕성)이 스며들면서, 좋아하는 감정이 단순한 설렘에 머물지 않고 서로의 밑바닥까지 끌어내려는 힘이 함께 작동하는 결이에요. 궁합에서 끌림의 온도가 유독 진하고 묵직하게 다뤄지는 축이라고 보면 돼요.",
      "en": "This is where one person's deepest, most intense self meets the way the other loves and feels drawn to someone. As that depth (Pluto) seeps into the softer texture of attraction (Venus), the feeling of liking each other doesn't stay at light flutter; a pull toward each other's very core works alongside it. In your chart, it's the axis where the temperature of attraction tends to run especially deep and weighty."
    },
    "Mars|Pluto": {
      "ko": "한 사람의 끌림과 추진력, 그러니까 무언가를 향해 곧장 달려가는 에너지(화성)가 다른 사람의 가장 깊은 곳, 쉽게 흔들리지 않는 강렬함과 변화의 힘(명왕성)과 맞물리는 자리예요. 가벼운 호감이 아니라 서로의 밑바닥까지 끌어당기는 결이라, 둘 사이에서 욕망과 깊이가 정면으로 만나는 축이 돼요. 표면의 끌림이 어디까지 깊어지는지를 가늠하게 하는, 관계의 온도가 진하게 드러나는 자리랍니다.",
      "en": "This is where one person's pull and drive, that energy of moving straight toward what they want (Mars), meets the other's deepest place, the kind of intensity and transforming force that doesn't shift easily (Pluto). It isn't a light spark but a pull that reaches all the way down, so it becomes the axis where desire and depth meet head-on between you two. It's the spot where the relationship's temperature shows in full, hinting at just how far a surface attraction can deepen."
    },
    "Uranus|Venus": {
      "ko": "한 사람의 예측 못 할 설렘, 그러니까 늘 새로운 자극과 변화를 몰고 오는 결이 다른 사람의 사랑하는 방식과 취향, 마음이 끌리는 자리(애정·금성)에 가서 닿는 자리예요. 한쪽이 일상에 살짝 균열 같은 두근거림을 던지면, 다른 한쪽의 애정 어린 감각이 그걸 바로 알아차리는 식이라, 둘 사이의 끌림이 어떤 온도로 살아 움직이는지를 건드리는 축이에요. 보통 이런 결은 관계가 한자리에 머무르지 않고 자꾸 색이 바뀌는 풍경 같은 느낌으로 그려져요.",
      "en": "This is where one person's spark of the unexpected, that restless pull toward something new and electric, reaches over and lands on the way the other person loves and is drawn to things (their affection, Venus). When one tosses a little flutter into the everyday, the other's tender sense of attraction picks up on it right away, so this is the axis that touches the very temperature of the chemistry between them. A meeting like this tends to paint the relationship as a scene that never quite sits still, its colors always shifting."
    },
    "Moon|Uranus": {
      "ko": "한 사람의 마음이 흐르는 리듬과 다른 사람이 품은 예측 못 할 설렘이 마주 닿는 자리예요. 잔잔히 흐르던 감정(달)의 결에 갑자기 창문이 열리듯 새로운 바람(천왕성)이 불어드는, 익숙함과 낯섦이 한 호흡에 섞이는 결이라고 보통 말해요. 둘 사이의 정서가 늘 같은 자리에 머물지 않고 조금씩 흔들리고 새로워지는, 마음의 안정과 변화가 동시에 건드려지는 축이에요.",
      "en": "This is where one person's inner emotional rhythm meets the other's knack for the unexpected. People often describe it as a quietly flowing feeling (the Moon) suddenly having a window thrown open, a fresh gust (Uranus) blowing in so that the familiar and the surprising mingle in a single breath. It's an axis where the emotion between you never quite settles in one place but keeps shifting and renewing itself, touching both the steadiness and the restlessness of the heart at once."
    },
    "Neptune|Venus": {
      "ko": "한 사람의 꿈꾸고 이상화하는 마음과 다른 사람의 사랑하는 방식, 끌리는 취향(애정·금성)이 맞물리는 자리예요. 보통 이런 결은 상대의 매력이 내 안의 가장 말랑하고 낭만적인 상상을 건드리고, 서로를 실제보다 조금 반짝이게 바라보게 되는 분위기로 흘러요. 환상과 설렘, 그리고 \"이 사람을 어떻게 사랑하고 싶은가\"가 한자리에서 만나는, 마음의 무드를 정하는 결이에요.",
      "en": "This is where one person's dreaming, idealizing heart meets the other's way of loving and what they're drawn to (affection, Venus). A pairing like this tends to touch the softest, most romantic corner of someone's imagination through the other's charm, so you end up seeing each other a little more luminous than life. It's the spot where fantasy, flutter, and \"how do I want to love this person\" all meet, the thread that sets the mood of the heart."
    },
    "Jupiter|Sun": {
      "ko": "한 사람의 넓혀주는 기운(목성)과 다른 사람의 나 자신, 그러니까 그 사람의 중심이 정면으로 마주 보는 자리예요. 한쪽이 \"넌 더 커도 돼\" 하고 품을 열어줄 때 다른 쪽의 자기다움이 곧장 반응하는, 서로의 그릇과 존재감이 닿는 결이라 관계 안에서 한 사람이 다른 사람을 얼마나 펼쳐주느냐가 자연스럽게 드러나는 축이에요.",
      "en": "This is the spot where one person's broadening, generous energy (Jupiter) comes face to face with the other's sense of self, the very center of who they are. When one side opens up and says \"you can be even more,\" the other's true nature responds right away, so it's the kind of meeting where each person's room to grow touches the other's presence, and it quietly reveals how much one widens the other within the relationship."
    },
    "Jupiter|Moon": {
      "ko": "한 사람의 넓혀주는 너그러운 기운(목성)과 다른 사람의 마음의 리듬(달)이 가만히 포개지는 자리예요. 한쪽이 품을 활짝 열어 세상을 크게 보여줄 때, 다른 한쪽의 정서가 그 품에 어떻게 반응하는지가 비치는 결이라, 두 사람 사이에서 마음이 자라거나 출렁이는 가장 여린 축을 건드려요.",
      "en": "This is the spot where one person's warm, expansive spirit (Jupiter) quietly settles over the other's emotional rhythm (the Moon). When one of you opens wide and shows the world as a bigger place, the other's feelings answer that openness, so it touches the tender axis where, between the two of you, the heart either grows or sways."
    },
    "Ascendant|Venus": {
      "ko": "한 사람의 겉으로 비치는 결, 그러니까 처음 마주했을 때 풍기는 분위기와 태도가, 다른 사람이 사랑할 때 드러나는 애정(금성)의 취향과 맞닿는 자리예요. 첫인상이라는 문과 마음의 결이 서로를 향해 열리는 지점이라, 끌림이 어디서 시작되고 어떤 매력에 마음이 기우는지를 건드리는 결이에요.",
      "en": "This is where one person's outward impression, the air and manner they give off at first meeting, brushes up against the way the other one loves and what they're drawn to in affection (Venus). It's the point where the doorway of a first impression and the texture of the heart open toward each other, so it touches on where the attraction begins and what kind of charm the heart leans into."
    },
    "Ascendant|Sun": {
      "ko": "한 사람이 처음 다가설 때 풍기는 분위기와 첫인상의 결이, 다른 사람의 가장 깊은 자기다움, 그러니까 그 사람이 누구인지 그 중심과 맞닿는 자리예요. 겉으로 비치는 첫 표정이 상대의 진짜 알맹이를 곧장 건드리는, 만나자마자 서로의 본질이 마주 보게 되는 결이라 궁합에서 꽤 핵심이 되는 축이랍니다.",
      "en": "This is the spot where the air one person gives off at first, the texture of their first impression, meets the other's deepest sense of self, the very core of who they are. The face you show on the surface reaches straight for the other's true center, so the moment you meet, your essences are already looking at each other, which makes this one of the heart-axes of the match."
    }
  },
  "OVERLAY_HOUSE": {
    "1": {
      "ko": "\"나는 누구인가\"가 펼쳐지는 무대예요. 첫인상, 몸짓, 세상에 자신을 내미는 방식 같은 가장 바깥의 빛이 머무는 자리라, 존재 자체가 곧장 눈에 들어오는 결이 흐르곤 해요.",
      "en": "This is the stage of \"who I am.\" It's where the outermost light settles — first impressions, the way someone carries themselves and steps into the world — so there's often a quality of simply being noticed at a glance."
    },
    "2": {
      "ko": "\"가진 것과 소중히 여기는 것\"의 무대예요. 돈과 살림살이뿐 아니라 무엇을 진짜 가치 있다고 느끼는지가 드러나는 자리라, 안정감과 손에 쥐는 감각이 짙게 도는 결이에요.",
      "en": "This is the stage of \"what we hold and what we treasure.\" It's where money and belongings live, but also what feels genuinely worth keeping — so there's a warm undertone of security and something held close in the hand."
    },
    "3": {
      "ko": "\"주고받는 말과 매일의 결\"이 흐르는 무대예요. 대화, 메시지, 사소한 일상의 오감이 오가는 자리라, 가볍게 통하고 자주 닿는 친근한 공기가 감도는 결이에요.",
      "en": "This is the stage of \"words exchanged and everyday rhythm.\" It's where conversations, messages, and small daily comings-and-goings happen — so there's a friendly air of easy understanding and frequent little touches."
    },
    "4": {
      "ko": "\"집과 뿌리\"의 무대예요. 가족, 고향, 마음 깊은 곳의 안식처를 보는 가장 사적인 자리라, 편안히 머물고 속을 내려놓게 되는 포근한 결이 흐르곤 해요.",
      "en": "This is the stage of \"home and roots.\" It's the most private place, where family, origins, and the heart's resting spot are read — so there's a cozy quality of settling in and letting your guard down."
    },
    "5": {
      "ko": "\"연애와 즐거움\"의 무대예요. 설렘, 놀이, 마음을 두근거리게 하는 표현이 피어나는 자리라, 순수하게 끌리고 함께 빛나고 싶어지는 화사한 결이 도는 자리예요.",
      "en": "This is the stage of \"romance and delight.\" It's where flutter, play, and heart-quickening expression bloom — so there's a bright quality of pure attraction and the wish to shine together."
    },
    "6": {
      "ko": "\"일과 매일의 습관\"이 자리한 무대예요. 함께 손발을 맞추고 서로를 챙기는 돌봄이 오가는 자리라, 곁에서 작게 도와주고 일상을 나누는 잔잔한 결이 흐르곤 해요.",
      "en": "This is the stage of \"work and daily habits.\" It's where pitching in together and looking after one another happen — so there's a quiet quality of small everyday help and shared routine."
    },
    "7": {
      "ko": "\"동반자와 결혼\"의 무대예요. 정통 점성에서 짝과 결혼을 보는 바로 그 자리라, 한 사람을 곁의 동반자로 깊이 받아들이고 싶어지는 강한 끌림의 결이 도는 자리예요.",
      "en": "This is the stage of \"partnership and marriage.\" In classical astrology it's the very place where mates and marriage are read — so there's a strong pull toward truly taking someone in as a partner at your side."
    },
    "8": {
      "ko": "\"깊은 결합과 변화\"의 무대예요. 둘 사이의 가장 은밀한 신뢰와 함께 나누는 것들, 서로를 송두리째 바꿔놓는 결이 흐르는 자리라, 표면 아래로 깊이 엮이는 진한 공기가 도는 자리예요.",
      "en": "This is the stage of \"deep merging and transformation.\" It's where the most private trust, shared things, and a force that remakes each other live — so there's an intense air of being woven together far beneath the surface."
    },
    "9": {
      "ko": "\"믿음과 넓어짐\"의 무대예요. 세상을 보는 시야, 배움, 멀리 떠나는 모험이 깃든 자리라, 함께 지평을 넓히고 더 큰 그림을 꿈꾸게 되는 탁 트인 결이 흐르곤 해요.",
      "en": "This is the stage of \"belief and expansion.\" It's where worldview, learning, and journeys to far places dwell — so there's an open quality of broadening horizons and dreaming a bigger picture together."
    },
    "10": {
      "ko": "\"커리어와 세상 속 자리\"의 무대예요. 사회에서 어떻게 보이고 무엇으로 기억되는지가 걸린 가장 공적인 자리라, 서로의 길과 위신에 또렷이 영향을 주는 무게감 있는 결이 도는 자리예요.",
      "en": "This is the stage of \"career and standing in the world.\" It's the most public place, where how one is seen and remembered in society rests — so there's a weighty quality of clearly shaping each other's path and reputation."
    },
    "11": {
      "ko": "\"친구와 함께 그리는 미래\"의 무대예요. 같은 곳을 바라보는 동료애와 앞날의 바람이 모이는 자리라, 편안한 동지처럼 나란히 서서 내일을 그려보게 되는 산뜻한 결이 흐르곤 해요.",
      "en": "This is the stage of \"friends and the future we picture together.\" It's where kinship and shared hopes for what's ahead gather — so there's a fresh quality of standing side by side like easy allies, sketching tomorrow."
    },
    "12": {
      "ko": "\"내면과 숨겨진 것\"의 무대예요. 말로 잘 꺼내지 않는 마음, 꿈, 보이지 않는 곳에서 일어나는 일들이 깃든 자리라, 설명하기 어려운 신비롭고 아련한 끌림의 결이 도는 자리예요.",
      "en": "This is the stage of \"the inner world and hidden things.\" It's where the feelings we rarely voice, dreams, and what stirs out of sight reside — so there's a mysterious, faraway quality of attraction that's hard to put into words."
    }
  },
  "BAND": {
    "eastern_hap": {
      "what": {
        "ko": "사주 글자끼리 손을 맞잡듯 묶이는 '합'의 정도",
        "en": "How much the two charts' pillars naturally link hands and pair up"
      },
      "high": {
        "ko": "두 사람의 사주 글자들이 서로 손을 잡듯 자연스레 엮이는 결이라, 곁에 있으면 말을 길게 하지 않아도 무언가 편하게 맞물리는 느낌이 흐르곤 해요.",
        "en": "Your charts' pieces tend to clasp hands easily, so being together often feels like things click into place without much explaining."
      },
      "low": {
        "ko": "서로의 글자가 손을 맞잡는 자리가 많지는 않은 결이라, 가까워지기까지 둘만의 속도와 시간이 조금 더 필요한 그림으로 보여요.",
        "en": "There aren't many spots where your pieces naturally clasp, so this reads like a pairing that warms up at its own slower pace."
      }
    },
    "eastern_chung": {
      "what": {
        "ko": "사주 글자끼리 부딪히는 '충'이 적어 잔잔한 정도",
        "en": "How calm things stay, with few places where the pillars knock against each other"
      },
      "high": {
        "ko": "서로의 글자가 부딪히며 튀는 자리가 거의 없는 잔잔한 결이라, 함께 있는 시간이 큰 파도 없이 고요한 물처럼 흘러가는 그림으로 보여요.",
        "en": "Hardly any of your pieces grind against each other, so the time you share reads like still water, moving along without big waves."
      },
      "low": {
        "ko": "서로의 글자가 맞부딪히며 불꽃이 튀는 자리가 더러 있는 결이라, 잔잔하다기보다 생기와 진동이 함께 도는 만남으로 보여요.",
        "en": "A few of your pieces do knock together and throw sparks, so this reads less like calm water and more like a lively, charged kind of meeting."
      }
    },
    "elements_match": {
      "what": {
        "ko": "서로에게 모자란 기운을 채워주는 오행(다섯 기운)의 보완 정도",
        "en": "How well your five elements fill in what the other is short on"
      },
      "high": {
        "ko": "한 사람에게 비어 있던 기운을 다른 사람이 자연스레 채워주는 결이라, 둘이 모이면 빈칸이 메워진 듯 한결 둥글어지는 그림이 보여요.",
        "en": "Where one of you runs short, the other tends to quietly top it up, so together you read like a circle whose gaps have been filled in."
      },
      "low": {
        "ko": "둘 다 비슷한 기운에 마음이 쏠려 있는 결이라, 서로 채워주기보다 같은 색을 더 짙게 겹쳐 칠하는 듯한 그림으로 보여요.",
        "en": "You both lean toward similar energies, so rather than filling each other's gaps you read like two coats of the same color, layered deeper."
      }
    },
    "synastry_harmonic": {
      "what": {
        "ko": "두 사람 별자리 행성끼리 부드럽게 흐르며 어우러지는 '조화'의 정도",
        "en": "How smoothly your charts' planets flow and blend together"
      },
      "high": {
        "ko": "서로의 행성들이 부드럽게 손을 내미는 자리가 많은 결이라, 대화든 침묵이든 한 곡의 음악처럼 흐름이 잘 이어지는 느낌이 감돌곤 해요.",
        "en": "Your planets reach toward each other in many spots, so whether you're talking or just quiet, the flow tends to carry like one continuous song."
      },
      "low": {
        "ko": "행성끼리 매끄럽게 이어지는 자리가 많지는 않은 결이라, 자연스레 흐르기보다 둘만의 리듬을 하나씩 맞춰가는 그림으로 보여요.",
        "en": "There aren't many spots where your planets glide together, so this reads like two people tuning their own rhythm piece by piece rather than flowing on instinct."
      }
    },
    "synastry_tension": {
      "what": {
        "ko": "별자리 행성 사이의 긴장이 적어 마음이 편안한 정도",
        "en": "How easy it feels, with little tension between your charts' planets"
      },
      "high": {
        "ko": "행성 사이에 팽팽하게 당겨지는 자리가 거의 없는 결이라, 곁에 있어도 어깨에 힘이 빠지고 마음이 느슨해지는 편안한 그림으로 보여요.",
        "en": "Almost nothing pulls tight between your planets, so being near each other reads as the kind of ease where your shoulders drop and you relax."
      },
      "low": {
        "ko": "행성끼리 팽팽하게 당겨지는 자리가 더러 있는 결이라, 마냥 느슨하다기보다 서로를 자꾸 끌어당기고 흔드는 긴장감이 함께 도는 만남으로 보여요.",
        "en": "A few spots pull tight between your planets, so this reads less like pure ease and more like a charged push and pull that keeps drawing you back."
      }
    }
  }
};
