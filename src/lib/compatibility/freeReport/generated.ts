/**
 * 무료 궁합 리포트 — 40-에이전트 워크플로가 생성한 풍부한 해석 카피 (덮어쓰기 층).
 *
 * content.ts 의 베이스라인(BASE) 위에 이 값이 *덮어써진다*. 비어 있어도(생성
 * 실패/부분) 빌더는 베이스라인으로 동작한다 — 그래서 키는 모두 optional.
 * 이 파일의 prose 는 사람이 직접 손보기보다 워크플로 재실행으로 갱신한다.
 * (충 항목 + 100-에이전트 영한 검수 수정 반영.)
 */

import type { Bi, BandCopy, SignalCopy } from './types'

export interface GeneratedCopy {
  ASPECT_PAIR?: Record<string, Bi>
  TEN_GODS?: Record<string, SignalCopy>
  SPOUSE_STAR?: Record<string, SignalCopy>
  PILLAR_REL?: Record<string, SignalCopy>
  /** 키는 "1".."12" 문자열 — content 측에서 number 키로 변환. */
  OVERLAY_HOUSE?: Record<string, Bi>
  DAY_MASTER_REL?: Record<string, Bi>
  VERDICT_EXPANSION?: Record<string, Bi>
  ELEMENT_BALANCE?: Record<string, Bi>
  BAND?: Record<string, BandCopy>
  META?: { intro?: Bi; closing?: Bi }
}

export const GENERATED: GeneratedCopy = {
  META: {
    intro: {
      ko: '이 리포트는 두 사람의 사주(태어난 날에 담긴 네 기둥 이야기)랑 별자리를 한 장에 겹쳐 놓고 가만히 봐요. 동양 쪽 풀이랑 서양 쪽 풀이가 같은 얘기를 하는 대목이 있다면, 거기가 바로 두 사람한테서 제일 또렷하게 드러나는 부분이에요. 낯선 단어가 나올 땐 옆에 쉬운 뜻을 붙여 뒀고, 더 궁금하면 아래 용어 풀이에서 다시 찾아볼 수 있어요.',
      en: "This report lays your two Saju — the story held in the four pillars of each birthday — next to your star charts on one page, and just looks. Where the Eastern reading and the Western reading say the same thing, that's the part that stands out most clearly between you. When an unfamiliar word shows up, we tuck a plain meaning right beside it, and you can always look it up again in the glossary below.",
    },
    closing: {
      ko: "여기까지는 두 사람을 좀 멀리서 본 큰 그림이에요. 이 사이가 실제로 어떤 순간에 어떻게 피어나는지, 어디서 더 또렷해지는지 같은 '어떻게'와 '언제'는 상담사가 훨씬 깊이 짚어 드려요. 마음이 더 가닿는다면, 그 깊은 이야기 속으로 한 걸음 들어가 봐도 좋아요.",
      en: "What you've read so far is the big picture, seen from a little distance. The how and when — how this actually shows up in real moments, where it gets more vivid — is what a counselor walks you through far more deeply. If something here tugged at you, you're welcome to step into that fuller story.",
    },
  },
  VERDICT_EXPANSION: {
    aligned: {
      ko: '둘의 차트가 같은 쪽을 바라보고 있어요. 끌림이 한 사람만의 일이 아니라 양쪽에서 동시에 올라오죠. 그래서 대화도 마음도 굳이 애쓰지 않아도 자연스레 흘러가요. 처음부터 박자가 맞는 음악처럼요.',
      en: "Your two charts look the same way. The pull isn't one-sided. It rises in both of you at once. So talk and feeling move along easily, like music that was already in rhythm, no effort needed.",
    },
    tension: {
      ko: '둘은 쉽게 안 물러서요. 그래서 같이 있으면 팽팽하게 부딪치고, 가끔 불꽃도 튀죠. 근데 그렇게 티격태격하면서 서로를 더 단단하게 만들어 가요. 거친 돌 두 개가 맞갈리다 보면 어느새 매끈해지는 것처럼요.',
      en: 'Neither of you backs down easily. So you push against each other, and yes, sparks fly. But that very friction is what toughens you both up. Think of two rough stones grinding against each other until they come out smooth.',
    },
    mixed: {
      ko: '둘은 한쪽에선 두근두근 끌리고, 다른 한쪽에선 티격태격 부딪혀요. 어떤 자리에선 신기할 만큼 말이 척척 통하다가도, 어떤 자리에선 묘하게 박자가 어긋나죠. 그래서 밋밋하지 않고 여러 표정을 가진 사이예요.',
      en: "One of you pulls close while the other pushes back. In some spots you click in a way that's almost uncanny. In others you slip out of sync. So this isn't one flat note. You two carry many faces instead.",
    },
    neutral: {
      ko: '두 사람의 차트가 어느 한쪽으로 쏠리지 않고 고르게 섞여요. 첫눈에 확 타오르는 불꽃 같은 사이는 아니에요. 그보다 잔잔한 강물처럼 큰 기복 없이, 무던하고 편안하게 오래 곁에 머무는 쪽이죠.',
      en: "Your charts mix evenly, without tipping to one side. This isn't a spark that flares the moment you meet. It's more like a slow river. Easygoing, steady, the kind that stays close for a long while.",
    },
  },
  DAY_MASTER_REL: {
    same: {
      ko: '두 사람 다 {aEl} 기운을 바탕으로 가진 사이예요. 같은 말을 쓰는 사람을 만난 것처럼, 길게 설명 안 해도 둘은 술술 통해요. 근데 닮은 만큼 약한 자리도 똑같아서, 한쪽이 흔들리면 다른 쪽도 같이 휘청이곤 해요.',
      en: "You both carry {aEl} as your core nature. It's like meeting someone who speaks your language, so you click without explaining much. But you're alike in the soft spots too, so when one of you wobbles, the other tends to sway right along.",
    },
    aControlsB: {
      ko: '{A}의 {aEl} 기운이 {B}의 {bEl}을 한 번씩 다듬고 매만져 줘요. {B}는 곁에 단단한 울타리가 생긴 듯 든든해하죠. 근데 그 손길이 가끔은 살짝 따끔하게 와닿기도 해요.',
      en: "{A}'s {aEl} keeps shaping and smoothing {B}'s {bEl}. To {B} it feels like a steady fence standing close by, solid and reassuring. Still, every now and then that same hand lands with a little sting.",
    },
    bControlsA: {
      ko: '이번엔 {B}의 {bEl} 기운이 {A}의 {aEl}을 다듬어줘요. {A}는 곁에서 중심을 잡아주는 사람이 있어서 든든해해요. 근데 그 정돈하는 손길이 가끔은 콕 짚이듯 따끔하게 느껴지기도 해요.',
      en: "This time {B}'s {bEl} shapes and steadies {A}'s {aEl}. {A} feels safe with someone holding the center close by. Still, that tidying touch can sometimes land like a small, pointed nudge.",
    },
    generate: {
      ko: "{aEl}과 {bEl}이 서로를 살려서 쑥쑥 자라게 해요(사주에선 '상생'). 한 사람이 내어준 기운이 상대 안에서 싹을 틔우고, 그게 다시 돌아와 처음 사람을 키워요. 물 주면 자라는 화분처럼, 주고받는 기운이 둘 사이를 막힘없이 오가죠.",
      en: "{aEl} and {bEl} feed each other and help one another grow (Saju calls this 'mutual generation'). What one of you offers takes root in the other, then circles back and nourishes the first. Like a plant that grows each time it's watered, this give-and-take moves between you quite naturally.",
    },
  },
  TEN_GODS: {
    비견: {
      feel: {
        ko: '어깨를 나란히 하는 동료의 끌림',
        en: 'the pull of a shoulder-to-shoulder companion',
      },
      blurb: {
        ko: "이 사람은 당신과 마주 보고 서기보다, 옆에 나란히 서는 쪽이에요. 같은 곳을 바라보며 비슷한 보폭으로 걷는 친구처럼, 어깨를 톡톡 부딪치며 편하게 같이 가는 사이죠(사주에선 '비견'). 굳이 말로 풀지 않아도 척 통하고, 결정적인 순간엔 같은 편이 되어 주거든요. 그래서 둘은 설명이 필요 없는 익숙함으로 곁에 머물러요.",
        en: "This person stands beside you, not across from you. You both look in the same direction and walk at a matching pace, shoulders almost bumping, easy and unforced (Saju calls this 'bigyeon', the peer). You get each other without spelling things out, and when it counts, they're on your side. So you two settle into a closeness that needs no explaining.",
      },
    },
    겁재: {
      feel: {
        ko: '겨루며 끌리는 기운',
        en: 'A pull that wants to compete',
      },
      blurb: {
        ko: "이 사람 곁에 있으면 이상하게 더 잘하고 싶어져요. 편하게 기대 쉬는 사이라기보다, 둘이 서로를 슬쩍 재면서 한 발 더 내딛게 만드는 자극이 오가는 사이거든요. 잔잔할 때보다 살짝 팽팽할 때 마음이 콩닥 움직이는 쪽이라, 같이 있으면 묘하게 등이 곧게 펴지곤 해요(사주에선 '겁재').",
        en: "Being near this person somehow makes you want to step up your game. It's less the cozy, lean-back kind of closeness and more the kind where you each size the other up and push a step further. This connection comes alive when things get a little charged rather than calm. So their company quietly leaves you sitting up straighter.",
      },
    },
    식신: {
      feel: {
        ko: '편안함·표현이 트이는 끌림',
        en: 'a draw toward ease, where your words come loose',
      },
      blurb: {
        ko: "이 사람 앞에서는 이상하게 말문이 스르르 트여요. 평소 속에만 담아두던 얘기도 술술 흘러나오죠. 곁에 있으면 마음이 사르르 풀리면서, 내가 가진 솜씨도 한결 가볍게 펼쳐져요. 잘 보이려 애쓰지 않아도 본래의 내가 한 톤 더 환해지는, 그런 따뜻한 끌림이에요(사주에선 '식신').",
        en: "Around this person your words just come loose. Things you usually keep tucked away slip out on their own. Next to them you relax, and your own talents flow a little more lightly. Without trying to impress, the real you comes through a shade brighter. It's that kind of warm pull (in Saju, 'sik-sin').",
      },
    },
    상관: {
      feel: {
        ko: '재치·자유로움의 끌림',
        en: 'the pull of wit and freedom',
      },
      blurb: {
        ko: '이 사람은 말 한마디로 자리 분위기를 환하게 바꿔요. 어디로 튈지 모르는 생기로 곁을 가볍게 만들어 주죠. 정해진 답보다 그때그때 떠오르는 재치로 빛나서, 함께 있으면 하루가 조금 더 헐겁고 재밌어져요. 무거운 순간을 농담 한 줄로 풀어 버리는 그 자유로움에, 당신은 묘하게 끌리더라고요.',
        en: 'This person can change the whole mood with one line. They bring a bright, unpredictable energy that makes the air around you feel lighter. They shine on quick wit in the moment, not tidy answers, so time together loosens up and gets more fun. You find yourself quietly pulled toward that freedom, the way they melt a heavy moment with a single joke.',
      },
    },
    편재: {
      feel: {
        ko: '크게 굴러가는 기회·활달함의 끌림',
        en: 'the pull of big momentum and bright energy',
      },
      blurb: {
        ko: '두 사람을 겹쳐 보면, 상대는 닫혀 있던 창문을 활짝 열어젖히는 사람처럼 다가와요. 멈춰 있던 일이 갑자기 술술 굴러가고, 평소라면 망설였을 자리에서도 둘은 한 발 더 내딛어요. 그래서 이 사람 곁에 있으면 세상이 조금 넓어지고, 할 수 있는 게 늘어나는 느낌이 들죠.',
        en: "Lay your two charts side by side and they come toward you like someone throwing open a window that had been shut. Things that felt stuck suddenly roll along. Even in spots where you'd usually hesitate, the two of you step one further. So beside this person the world feels a little wider, and what you can do grows.",
      },
    },
    정재: {
      feel: {
        ko: '안정·성실의 끌림',
        en: 'the pull of steady devotion',
      },
      blurb: {
        ko: '이 사람은 화려한 한 방으로 다가오지 않아요. 매일 같은 자리에 하루치 마음을 조금씩 쌓아요. 약속한 건 조용히 지키고, 어제보다 살짝 더 단단해진 채로 곁에 있죠. 그래서 같이 있으면 발밑이 든든해져요. 요란하진 않아도 천천히 데워지는 온기로 남는 사이예요.',
        en: "This person doesn't show up as a dazzling spark. They lay down a little care in the same spot every single day. They keep their word quietly. They're there beside you, a touch steadier than yesterday. So being near them makes the ground feel solid under your feet. It's a warmth that builds slowly, not loudly.",
      },
    },
    편관: {
      feel: {
        ko: '확 끌려서 콩닥거리는 사이',
        en: 'A magnetic pull that quickens',
      },
      blurb: {
        ko: "둘이 만나면 상대가 잔잔한 호수에 돌을 던지듯 나를 흔들고 콕콕 밀어붙여요. 그래서 가만있던 마음이 단번에 콩닥콩닥 달아오르죠. 동시에 어딘가로 떠밀리는 듯한 묵직함도 같이 와요. 그건 상대가 거칠어서가 아니라, 나를 자꾸 움직이게 만드는 힘이 센 거예요(사주에선 '편관'). 그래서 둘 사이엔 심심할 틈 없이 짜릿함과 긴장이 늘 같이 흘러요.",
        en: "When you two come together, they stir you up and keep nudging you forward, like a stone tossed into a still pond. A quiet heart lights up in a heartbeat. At the same time you feel a heavier sense of being pushed somewhere. That's not them being harsh, it's a strong force that keeps you moving (Saju calls this 'pyeon-gwan'). So between you, the thrill and the tension always run together, never leaving a dull moment.",
      },
    },
    정관: {
      feel: {
        ko: '기대고 싶은 듬직함',
        en: 'Steady, Lean-on Pull',
      },
      blurb: {
        ko: '이 사람 곁에 있으면 어쩐지 어깨를 기대고 싶어져요. 작은 일까지 알아서 챙겨주거든요. 그 듬직함이 마음을 턱 놓이게 하죠. 가끔은 한 발짝 더 들어와서 잔소리처럼 느껴질 때도 있어요. 근데 그건 너를 통제하려는 게 아니라, 네가 어떻게 지내는지 자꾸 살피고 싶은 마음이에요.',
        en: "Being around this person makes you want to lean a shoulder on them. They handle even the little things without being asked, and that steadiness sets your mind at ease. Sometimes they step a touch closer and it can feel like fussing. But that's not them trying to control you. It's them wanting to keep looking out for how you're doing.",
      },
    },
    편인: {
      feel: {
        ko: '직관·독특함의 끌림 (살짝 거리)',
        en: 'Drawn to their intuition and offbeat charm, with a touch of distance',
      },
      blurb: {
        ko: '이 사람은 남들 안 보는 데를 들여다보는 눈을 가졌어요. 그래서 당신한텐 어딘가 알쏭달쏭하고, 자꾸 더 알고 싶어지는 사람이에요. 바짝 다가가도 마지막 한 뼘은 손에 안 잡히죠. 근데 그 옅은 거리가 끌림을 더 깊게 만들어요. 둘은 익숙함보다 호기심으로 시작하는 사이예요.',
        en: "This person looks where others don't, so to you they read a little puzzling, the kind you keep wanting to understand. Even up close, that last small inch stays out of reach. And that faint distance pulls you in deeper. You two start from curiosity, not familiarity.",
      },
    },
    정인: {
      feel: {
        ko: '보살핌·성숙의 끌림',
        en: 'the pull of steady care',
      },
      blurb: {
        ko: '상대는 당신 곁에서 천천히, 그래도 꾸준히 마음을 데워줘요. 펑 터지는 불꽃이 아니라, 매일 같은 자리에서 불씨를 살펴주는 사람의 온기에 가깝죠. 그 곁에 있으면 어느새 한 뼘 더 자라 있는 자신을 만나게 돼요. 챙겨주는 게 곧 배움이 되는, 그런 둥근 다정함이에요.',
        en: 'They warm you up slowly, but steadily, right there beside you. Not a sudden blaze. More like someone tending a quiet ember in the same spot every day. Stay near that kind of care and you find yourself a little more grown than before, almost without noticing. Here, being looked after quietly turns into a kind of learning.',
      },
    },
  },
  SPOUSE_STAR: {
    정재: {
      feel: {
        ko: '안정·가정의 짝',
        en: 'A steady, home-building partner',
      },
      blurb: {
        ko: '배우자 자리에 있는 상대는 하루하루 작은 벽돌을 쌓듯 둘의 안정을 만들어가요. 가슴 콩닥대는 설렘보다, 곁에 있으면 마음이 놓이는 든든함이 끌리는 지점이죠. 약속을 지키고 함께 집을 가꾸는 성실함으로 다가와요. 요란하지 않게, 오래 머무는 따뜻함이에요.',
        en: "In the spot that speaks of a life partner, they build your stability one small brick at a time, day after day. What pulls you in isn't a racing-heart thrill. It's the steady kind of dependability that keeps promises and tends a home with you, so being close to them just feels safe. It's a warmth that comes quietly and stays a long while.",
      },
    },
    편재: {
      feel: {
        ko: '생기·재미의 짝',
        en: 'A lively, fun-loving partner',
      },
      blurb: {
        ko: '배우자 자리에 활달하고 자유로운 사람이 들어와 있어요. 한곳에 가만히 묶이기보다 어디로 튈지 모르는 생기가 늘 곁에서 콩닥거리죠. 둘이 같이 있으면 평범한 하루도 막힘없이 재밌어지고, 어쩐지 마음이 가벼워져요. 이런 사람한테 자연스레 끌리더라고요.',
        en: "In the spouse seat, you've got someone breezy and free-spirited. They don't sit still in one spot. They carry a playful, where-will-they-go-next spark right beside you. With them around, an ordinary day turns fun and your heart feels lighter. That's the kind of person you're drawn to.",
      },
    },
    정관: {
      feel: {
        ko: '안심·가정의 짝',
        en: 'A safe-harbor partner',
      },
      blurb: {
        ko: "배우자 자리에서 상대는 기대고 싶을 만큼 듬직한 짝이에요. 약속한 건 끝까지 지키고, 흔들리는 날에도 옆을 반듯하게 지켜줘요. 그래서 이런 사람 곁에 있으면 마음이 자연스레 가라앉고 '아, 안심된다' 싶어지죠. 화려한 설렘보다는 둘이 함께 집을 한 채 짓는 듯한 든든한 끌림으로 다가와요.",
        en: "In the spot your chart keeps for a life partner, they show up as someone solid enough to lean on. They finish what they promise, and they stay steady right beside you even on shaky days. So next to someone like this your mind quietly settles, and a calm sense of safety sets in. It's less a flutter of dazzle, more the steady pull of the two of you building a home together.",
      },
    },
    편관: {
      feel: {
        ko: '열정·끌림의 짝',
        en: 'A spark-and-pull partner',
      },
      blurb: {
        ko: '배우자 자리에 가만히 곁을 지키는 사람보다, 마주 보면 심장이 콩닥 한 박자 빨라지는 짝이 떠올라요. 끌리는 마음이 큰 만큼 살짝 팽팽한 긴장도 같이 흘러서, 마냥 편하다기보다 자꾸 눈이 가고 신경이 쓰이는 사람이에요. 둘은 잔잔함보다 짜릿함 쪽으로 마음이 기울죠.',
        en: "In the spot your chart holds for a partner, who shows up isn't the quietly steady type. It's the one who makes your heart skip the moment you face them. The pull runs strong, and a little tension hums right alongside it, so they feel less like comfort and more like someone who keeps catching your eye. You two lean toward the thrill over the calm.",
      },
    },
  },
  ELEMENT_BALANCE: {
    balanced: {
      ko: '두 사람 기운을 한데 모아보면 어느 한쪽으로 쏠리지 않고 골고루 퍼져 있어요. 잘 차려진 한 상처럼 빠지는 맛 없이 두루 갖췄죠. 그래서 둘은 같이 있을 때 묘하게 균형 잡힌 안정감을 느껴요.',
      en: "Bring your two energies together and they spread out evenly, with nothing piling into one corner. It's like a well-set table where no flavor is missing. So when you're together, you feel a quietly balanced steadiness.",
    },
    complement: {
      ko: '한 사람이 옅은 자리를 다른 사람이 짙게 채워줘요. 서로의 빈칸을 메우는 사이죠. 퍼즐 두 조각이 딱 맞물리듯, 혼자일 땐 비어 보이던 데가 둘이 있으면 술술 채워지더라고요.',
      en: "Where one of you runs thin, the other runs full. You fill in each other's blanks. Like two puzzle pieces locking in, the spots that looked empty on your own quietly close up once you're together.",
    },
    skewed: {
      ko: '두 사람 기운을 합치면 {strongEl} 쪽으로 묵직하게 쏠리고, {weakEl}은 옅게만 깔려요. {strongEl} 색이 워낙 진하다 보니 관계 전체에 그 분위기가 짙게 물들죠. {weakEl}은 그 아래에 배경처럼 은은하게 깔리고요.',
      en: 'Put together, your energies lean heavily toward {strongEl}, and {weakEl} shows up only faintly. The shade of {strongEl} runs so deep that it tints the whole relationship. {weakEl} settles in underneath, soft as a background hum.',
    },
  },
  ASPECT_PAIR: {
    'Ascendant|Ascendant': {
      ko: '두 사람의 첫인상과 분위기(상승점)가 서로 얼마나 닮았는지 보는 자리예요. 풍기는 결이 비슷하면 처음부터 편하게 스며들기도 하고, 너무 닮아 같은 약점에 함께 걸리곤 합니다.',
      en: 'This is where you see how alike your first impressions and outward vibe (Ascendant) really are. When the feel is similar you can click easily from the start — or be so alike that you both stumble on the very same blind spot.',
    },
    'Ascendant|Jupiter': {
      ko: '두 사람의 첫인상·태도(상승점)와 너그러움·확장(목성)이 만나는 자리예요. 서로를 더 크고 편하게 펼쳐주는 기운이 되거나, 들뜬 기대만 부풀려 헐거워지기도 합니다.',
      en: 'This is where first impressions and presence (Ascendant) meet generosity and expansion (Jupiter). It can open each other up to feel bigger and more at ease — or just inflate easy expectations until things turn loose and unanchored.',
    },
    'Ascendant|MC': {
      ko: '두 사람의 첫인상·태도(상승점)와 사회적 모습·지향(중천점)이 어떻게 어울리는지 보는 자리예요. 겉으로 풍기는 분위기와 세상에서 가고 싶은 방향이 잘 맞으면 함께 그림이 그려지고, 어긋나면 서로 보여주고 싶은 모습이 따로 놀기도 합니다.',
      en: "This is where one person's first impression and manner (Ascendant) meets the other's public role and ambition (MC). When the vibe you give off and the direction you want to head line up, you picture a future together — when they don't, the selves you each want to show can pull in different directions.",
    },
    'Ascendant|Mars': {
      ko: '첫인상·태도(상승점)와 욕망·추진력(화성)이 맞부딪치는 자리예요. 서로를 강하게 끌어당기고 일을 밀고 나가는 힘이 되거나, 기싸움처럼 부딪치는 흐름이 생기곤 합니다.',
      en: 'First impression and demeanor (Ascendant) meet desire and drive (Mars). It can spark a strong pull that pushes you both forward — or turn into a clash of wills.',
    },
    'Ascendant|Mercury': {
      ko: '서로의 첫인상·태도(상승점)와 대화·생각(수성)이 어떻게 맞물리는지 보는 자리예요. 보이는 분위기와 주고받는 말이 자연스럽게 이어지기도, 인상과 실제 대화 결이 어긋나 갸우뚱하게 되기도 하는데요.',
      en: "This is where each other's first impression and manner (Ascendant) meets talk and thinking (Mercury). The vibe you give off and the words you trade can flow together naturally — or leave you puzzled when the impression and the actual conversation don't quite match.",
    },
    'Ascendant|Moon': {
      ko: '첫인상·태도(상승점)와 속마음·감정(달)이 만나는 자리예요. 겉으로 보이는 결과 마음속 정서가 맞아 편안해지는 흐름도 있고, 어딘가 어긋나 묘하게 거리감이 생기기도 해요.',
      en: 'First impression and manner (Ascendant) meet inner feelings and emotion (Moon). The way one comes across can sit easily with how the other feels inside — or quietly miss, leaving a subtle sense of distance.',
    },
    'Ascendant|Neptune': {
      ko: '첫인상·태도(상승점)와 환상·이상(해왕성)이 만나는 자리예요. 상대를 꿈처럼 아름답게 비춰주기도 하고, 실제보다 더 크게 그려서 흐릿해지는 경우도 있다.',
      en: "First impression (Ascendant) meets dream and idealization (Neptune). It can make you see each other in a beautiful, dreamlike light — or blur the real person behind an image that's bigger than life.",
    },
    'Ascendant|Pluto': {
      ko: '첫인상·태도(상승점)와 깊이·강렬함(명왕성)이 만나는 자리예요. 서로를 단숨에 끌어당기는 묵직한 인력이 되거나, 처음부터 속까지 파고드는 부담으로 느껴지곤 해요.',
      en: "First impression and bearing (Ascendant) meets depth and intensity (Pluto). It can be a heavy pull that draws you in at first sight — or a pressure that digs into you before you're ready.",
    },
    'Ascendant|Saturn': {
      ko: '서로의 첫인상·태도(상승점)와 책임·시험(토성)이 맞물리는 자리예요. 곁에서 듬직하게 자리를 잡아주기도 한다면, 은근히 평가받는 듯 긴장하게 만드는 흐름도 흐른다.',
      en: "This is where each other's first impression and manner (Ascendant) meets responsibility and testing (Saturn). It can be a steadying presence that grounds you — or a subtle pressure that leaves you feeling quietly judged.",
    },
    'Ascendant|Sun': {
      ko: '한 사람이 처음 다가설 때 풍기는 분위기와 첫인상이, 다른 사람의 가장 깊은 본모습과 맞닿아요. 겉으로 보이는 첫 표정이 상대의 진짜 알맹이를 곧장 건드립니다. 그래서 만나자마자 둘은 서로의 본질을 마주 봐요. 궁합에서 꽤 핵심이 되는 자리랍니다.',
      en: "The air one of you gives off at first, that very first impression, meets the other's deepest sense of self. The face you show on the surface reaches straight for their true center. So the moment you meet, you two are already looking at each other's essence. This is one of the core spots in the match.",
    },
    'Ascendant|Uranus': {
      ko: '첫인상·태도(상승점)와 자극·변화(천왕성)가 만나는 자리예요. 서로의 분위기를 단숨에 흔들어 신선하게 끌리는 경우도 있고, 종잡을 수 없이 들썩대는 결이 되기도 한다.',
      en: 'First impression and manner (Ascendant) meets spark and change (Uranus). It can pull you in with a fresh, electric jolt — or keep things restless and hard to pin down.',
    },
    'Ascendant|Venus': {
      ko: "한 사람이 처음 풍기는 분위기와 태도가, 다른 사람이 사랑할 때 드러나는 취향(점성에선 '금성')과 맞닿아요. 첫인상이라는 문과 마음이 서로를 향해 열리는 자리죠. 그래서 끌림이 어디서 시작되고 어떤 매력에 마음이 기우는지를 건드립니다. 한 사람은 첫인상을 내밀고, 다른 한 사람은 사랑하는 방식으로 응답하는 거라고 보면 돼요.",
      en: "The air one person gives off at first meeting brushes right up against the way the other one loves and what they're drawn to (in astrology, Venus). This is where a first impression and the heart open toward each other. So it touches where attraction starts and what charm someone leans into. You bring the first impression; they answer with how they love.",
    },
    'Jupiter|Mars': {
      ko: '크게 키우려는 마음(목성)과 밀어붙이는 욕망·추진력(화성)이 만나는 자리예요. 서로의 의욕에 불을 붙여 더 크게 나아가게 되기도, 욕심과 속도가 과해 무리하는 방향으로 흐르기도 하는 결이에요.',
      en: "This is where the urge to grow and be generous (Jupiter) meets desire and drive (Mars). It can fire up each other's ambition and push you further together — or tip into overreach when wanting and speed run too hot.",
    },
    'Jupiter|Mercury': {
      ko: '두 사람의 생각과 대화(수성)에 얼마나 너그러움과 여유(목성)가 흐르는지 보는 자리예요. 서로의 말을 크게 품어주고 시야를 넓혀주기도, 좋게 부풀려 말이 커지고 가벼워지기도 하죠.',
      en: "This is where talk and thinking (Mercury) meet generosity and breadth (Jupiter) between you two. It can open each other's minds and widen the view — or let words get inflated and breezy as things get talked up.",
    },
    'Jupiter|Moon': {
      ko: "한 사람은 품을 넓혀주는 너그러운 기운(점성에선 '목성')을 내고, 다른 한 사람은 마음의 리듬(점성에선 '달')으로 받아요. 한쪽이 품을 활짝 열어 세상을 크게 보여주면, 다른 한쪽의 마음이 그 품에 부드럽게 반응합니다. 그래서 둘 사이에서 마음이 쑥 자라기도, 출렁이기도 하는 가장 여린 데를 건드려요.",
      en: "One of you brings a warm, expansive spirit (in astrology, Jupiter); the other brings an emotional rhythm (the Moon). When one opens wide and shows the world as a bigger place, the other's heart answers that opening. So this is where, between you two, feelings either grow fast or sway the most — it's the tenderest spot.",
    },
    'Jupiter|Sun': {
      ko: "한 사람은 \"넌 더 커도 돼\" 하고 품을 열어 주고(점성에선 '목성'), 다른 사람은 그 말에 자기다움으로 곧장 반응해요(그 사람의 중심, '태양'). 한쪽이 펼쳐 줄 때 다른 쪽이 환하게 살아나는 사이죠. 그래서 둘은 서로를 얼마나 키워 주는지가 자연스럽게 드러나요.",
      en: "One of you opens up and says \"you can be even more\" (in astrology, 'Jupiter'); the other lights up and answers with their true self (their core, the 'Sun'). One makes room, the other grows into it. So you two quietly show how much you bring each other out.",
    },
    'Jupiter|Venus': {
      ko: '애정·매력(금성)과 너그럽게 키워주는 마음(목성)이 만나는 자리예요. 서로를 넉넉하게 품고 기분 좋게 부풀려주기도, 좋은 게 좋은 거라며 적당히 흘려보내는 흐름이 생기기도 해요.',
      en: 'This is where affection and charm (Venus) meet a generous, expansive heart (Jupiter). It can wrap you both in warmth and lift the mood, or let things drift along on an easy "it\'s all good" glow.',
    },
    'MC|Mars': {
      ko: '사회적 모습·지향(중천점)과 욕망·추진(화성)이 만나는 자리예요. 서로의 야망에 불을 붙여 같이 밀고 나가게 되기도, 누가 주도권을 쥐느냐로 부딪히게 되기도 하는 결이에요.',
      en: "Public role and ambition (MC) meets desire and drive (Mars). It can light a fire under each other's goals and push you forward together — or turn into a clash over who takes the lead.",
    },
    'MC|Mercury': {
      ko: '두 사람이 바깥 세상에서 보여주고 싶은 모습(중천점)과 평소 말과 생각의 결(수성)이 만나는 자리예요. 서로의 방향에 말이 잘 보태지기도, 같은 목표를 두고도 이야기가 자꾸 엇갈리기도 해요.',
      en: "This is where how each person wants to show up in the world (MC) meets the way you talk and think (Mercury). Your words can give real momentum to each other's direction — or you can keep talking past one another about the same goal.",
    },
    'MC|Moon': {
      ko: '사회적으로 보여지는 모습·지향(중천점)과 마음속 감정(달)이 만나는 곳이에요. 서로의 꿈과 정서가 같은 방향으로 흐르기도, 보여주고 싶은 모습과 진짜 기분이 어긋나기도 해요.',
      en: 'This is where public role and ambition (MC) meet inner feelings (Moon). Your dreams and emotions can flow the same way, or the face you want to show can pull against how you truly feel.',
    },
    'MC|Sun': {
      ko: '세상에 비치는 모습·지향(중천점)과 본래의 나 자신(해)이 만나는 곳이에요. 서로의 길을 같은 방향으로 밀어주기도, 되고 싶은 모습과 원래의 나 사이에서 엇갈리는 흐름이 돼요.',
      en: 'Where your public image and ambition (Midheaven) meets your core self (Sun). It can push you both toward the same direction, or the pull between who you want to be seen as and who you really are runs deep.',
    },
    'MC|Venus': {
      ko: '사회적 모습·지향(중천점)과 애정·매력(금성)이 만나는 곳이에요. 함께 그리는 미래나 서로의 겉모습이 마음에 쏙 들기도, 보여지는 모습에서 결이 조용히 어긋나기도 해요.',
      en: 'Public role and ambition (MC) meets affection and charm (Venus). The future you picture together and how you see each other can click beautifully, or the way you appear to the world quietly pulls in different directions.',
    },
    'Mars|Mars': {
      ko: "두 사람의 끌림과 추진력이 정면으로 만나요(점성에선 '화성'끼리). 속도, 열기, 원하는 걸 향해 달려드는 기운이 같은 곳에서 부딪혀요. 말하자면 둘 다 액셀을 밟는 곳이라, 관계의 박자와 추진력이 여기서 제일 또렷하게 드러나요.",
      en: "Your spark and drive meet head-on (in astrology, Mars to Mars). Your tempo, your heat, the way you both lunge toward what you want all collide in the same spot. This is where you're both on the gas, so the rhythm and momentum of the relationship show up most vividly right here.",
    },
    'Mars|Mercury': {
      ko: '욕망·추진(화성)과 대화·생각(수성)이 만나는 자리예요. 서로의 말에 불이 붙어 아이디어가 시원하게 굴러가기도, 사소한 말 한마디에 발끈해 토론이 신경전으로 변하기도 하는 결이에요.',
      en: "Desire and drive (Mars) meet talk and thinking (Mercury). It can spark each other's words into ideas that roll forward fast — or turn a small remark into a heated, prickly debate.",
    },
    'Mars|Moon': {
      ko: "한 사람은 무언가를 향해 확 달려드는 추진력(점성에선 '화성')을 들고 와요. 다른 사람은 잔잔히 차오르는 마음의 리듬(점성에선 '달')을 들고 오죠. 그 둘이 한곳에서 바로 만나요. 그래서 설렘과 감정이 둘 사이에서 얼마나 가깝게 포개지는지가 여기서 드러나요.",
      en: "One of you brings the drive to charge at something (in astrology, 'Mars'). The other brings the quiet, rising rhythm of how their heart moves (in astrology, the 'Moon'). These two touch each other right away. So this is where the spark and the feeling overlap, and you can see how closely the two of you fold together.",
    },
    'Mars|Neptune': {
      ko: '욕망과 추진력(화성)이 환상과 이상(해왕성)을 만나는 자리예요. 서로를 더 멋지게 꿈꾸게 하는 설렘이 되기도, 실제보다 부풀려 보다가 헷갈리는 안개 속으로 빠지기도 하는 거죠.',
      en: "Desire and drive (Mars) meet dream and idealization (Neptune). It can be a spark that lets you dream each other up beautifully — or a fog where you see more than what's really there and lose your footing.",
    },
    'Mars|Pluto': {
      ko: "한 사람은 원하는 걸 향해 곧장 달려가는 힘을 가져와요(점성에선 '화성'). 다른 사람은 쉽게 흔들리지 않는 깊은 강렬함과 변화의 힘으로 받아요(점성에선 '명왕성'). 가벼운 호감이 아니라 서로의 밑바닥까지 끌어당겨요. 그래서 둘은 욕망과 깊이가 정면으로 부딪혀요. 표면의 끌림이 어디까지 깊어지는지, 둘 사이 온도가 진하게 드러나는 곳이에요.",
      en: "You bring the energy of moving straight toward what you want (in astrology, 'Mars'). They bring a deep intensity that doesn't shift easily, and the force to transform (in astrology, 'Pluto'). It isn't a light spark. You two pull each other all the way down, so desire and depth meet head-on. This is where the temperature between you shows in full, hinting at how far a surface attraction can deepen.",
    },
    'Mars|Saturn': {
      ko: "한 사람은 좋아하면 곧장 다가가고 속도를 내요(애정과 활력, 점성에선 '화성'). 다른 사람은 약속을 재고 천천히 거리를 좁혀요(무게와 신중함, '토성'). 그래서 끌어당기는 마음과 한 발 물러서서 살피는 마음이 같은 지점에서 딱 맞물려요. 둘의 속도와 거리감이 가장 솔직하게 드러나는 곳이죠.",
      en: 'One of you rushes in the moment you like someone — all warmth and spark (in astrology, Mars). The other measures the promise and closes the gap slowly — weight and caution (Saturn). So the pull and the hold-back land on the very same point. This is where the two of you show your real pace and sense of closeness most honestly.',
    },
    'Mars|Sun': {
      ko: '서로의 추진력(화성)이 상대의 자아·정체성(태양)을 어떻게 건드리는지 보는 자리예요. 함께 불이 붙어 같은 곳으로 밀고 나가기도, 자존심과 기싸움으로 부딪히게 되기도 하는 결이에요.',
      en: "This is where each person's drive (Mars) meets the other's core self (Sun). It can light a fire that pushes you toward the same goal — or spark clashes of pride and willpower.",
    },
    'Mars|Uranus': {
      ko: '욕망·추진(화성)과 자극·변화(천왕성)가 만나는 자리예요. 둘 사이에 짜릿한 불꽃이 튀기도, 예측 못 할 충동으로 들썩거리게 되기도 하는 흐름이에요.',
      en: 'Desire and drive (Mars) meet spark and change (Uranus). It can throw off exciting sparks between you — or stir up sudden, unpredictable impulses.',
    },
    'Mars|Venus': {
      ko: '한 사람의 끌림과 속도, 밀어붙이는 힘이 다른 사람의 사랑하는 방식과 취향에 가닿아요. 욕망(화성)과 애정(금성)이 정면으로 만나요. 이곳이 불꽃 튀냐 마냐를 가르곤 해요. 둘 사이의 끌림과 설렘이 어떤 온도로 흐르는지 여기서 드러나요.',
      en: 'One of you brings the pull, the pace, the forward push. The other brings a way of loving and what charms them. This is where desire (Mars) and affection (Venus) face each other. It often decides whether sparks fly, and it shows the temperature of the attraction and flutter running between you.',
    },
    'Mercury|Mercury': {
      ko: '한 사람이 말하고 생각하는 방식과 다른 사람의 그것이 정면으로 마주 닿아요. 둘이 어떻게 대화하고, 뭘 어떻게 듣고 이해하는지 그 머릿속 리듬과 말투가 여기서 겹쳐요. 가벼운 잡담부터 진지한 이야기까지, 두 사람이 통하는 방식이 여기서 빚어져요.',
      en: "Here one person's way of speaking and thinking meets the other's head on. Your mental rhythms overlap. So do your ways of talking, listening, and making sense of things. This shapes how you connect across everything, from light chatter to the deeper conversations.",
    },
    'Mercury|Moon': {
      ko: '대화·생각(수성)과 감정·정서(달)가 만나는 곳이에요. 마음을 말로 잘 풀어내 통하기도, 머리와 마음이 따로 놀아 엇갈리곤 해요.',
      en: 'Talk and thinking (Mercury) meets feelings (Moon). It can put the heart into words that land, or leave head and heart pulling in different directions.',
    },
    'Mercury|Neptune': {
      ko: '대화·생각(수성)과 환상·이상(해왕성)이 만나는 곳이에요. 말로 다 못 할 마음까지 알아차리는 깊은 교감이 흐르기도, 듣고 싶은 대로 듣고 오해가 안개처럼 쌓이곤 해요.',
      en: 'Talk and thinking (Mercury) meet dream and idealization (Neptune). It can be a deep, unspoken understanding that reads between the lines, or a fog where you each hear what you wish and misreadings quietly pile up.',
    },
    'Mercury|Pluto': {
      ko: '대화·생각(수성)이 깊이·강렬함(명왕성)과 만나는 곳이에요. 표면적인 말 너머의 진심까지 파고들게 되기도, 캐묻고 통제하려는 무게로 서로를 누르곤 해요.',
      en: "Talk and thinking (Mercury) meet depth and intensity (Pluto). It can pull you past surface words into each other's real truths, or probing and control that weighs you both down takes over.",
    },
    'Mercury|Saturn': {
      ko: '두 사람의 대화·생각(수성)이 책임·시험(토성)과 마주치는 곳이에요. 말에 무게와 신뢰가 쌓이기도, 입을 떼기 전에 검열당하듯 조심스러워지곤 해요.',
      en: 'This is where talk and thinking (Mercury) meet responsibility and testing (Saturn). Words can gain weight and trust, or turn cautious as if every thought has to pass inspection first.',
    },
    'Mercury|Sun': {
      ko: '대화·생각(수성)과 자아·정체성(해)이 만나는 곳이에요. 내 말이 상대의 본모습에 가닿기도, 같은 이야기인데 자존심이 부딪히곤 해요.',
      en: 'Talk and thinking (Mercury) meets the core self (Sun). Your words can reach who the other person really is, or the same conversation keeps bumping up against their pride.',
    },
    'Mercury|Uranus': {
      ko: '대화·생각(수성)과 자극·변화(천왕성)가 만나는 곳이에요. 서로의 생각에 신선한 불꽃이 튀기도, 종잡을 수 없이 산만해지곤 해요.',
      en: 'Talk and thinking (Mercury) meets spark and change (Uranus). It can throw fresh sparks into how you think together, or scatter into something restless and hard to pin down.',
    },
    'Mercury|Venus': {
      ko: '대화·생각(수성)과 애정·매력(금성)이 만나는 자리거든요. 말 한마디에 호감이 깊어지기도 하고, 표현 방식이 어긋나 마음이 헛돌기도 합니다.',
      en: 'This is where talk and thinking (Mercury) meet affection and charm (Venus). A single word can deepen the fondness, or a mismatch in how you express yourselves can leave the feeling running in circles.',
    },
    'Moon|Moon': {
      ko: '한 사람 마음의 박자와 다른 사람 마음의 박자가 바로 겹치는 곳이에요. 둘이 무언가에 울컥하고, 안심하고, 서운해지는 그 리듬이 서로 만나요. 그래서 말로 꺼내기 전에 분위기로 먼저 알아차리죠.',
      en: "This is where one person's emotional beat folds right into the other's. You both well up, settle, and quietly ache on the same rhythm, and those rhythms touch. So you feel it in the air before either of you finds the words.",
    },
    'Moon|Neptune': {
      ko: '감정(달)과 환상·이상(해왕성)이 만나는 자리예요. 서로를 곱게 물들이며 꿈처럼 통하기도 하고, 보고 싶은 모습만 보다가 길을 잃기도 합니다.',
      en: 'Feeling (Moon) meets dream and idealization (Neptune). It can blend you into a tender, dreamlike understanding — or blur things until you only see what you wish were true.',
    },
    'Moon|Pluto': {
      ko: '한 사람의 마음이 흐르는 리듬에, 다른 사람의 가장 깊고 쉽게 흔들리지 않는 강렬함(명왕성)이 맞물려요. 잔잔한 호수에 저 아래 물줄기가 닿듯, 한쪽의 평범한 감정을 다른 한쪽이 바닥까지 끌어내려요. 그래서 둘은 마음이 표면에 머물지 못하고, 자꾸 더 안쪽을 건드리게 돼요.',
      en: "One person's emotional rhythm locks into the other's deepest, most unshakable intensity (Pluto). Like a still lake touched by a current running far below, one of you draws the other's ordinary feelings all the way down to their roots. So between you two, the heart never quite stays on the surface and keeps reaching deeper.",
    },
    'Moon|Saturn': {
      ko: '한 사람은 기분이 차오르고 가라앉는 대로 그날의 마음을 흐르듯 느껴요. 다른 한 사람은 그 마음을 진지하게 떠받치고 지키려 해요. 그래서 둘 사이엔 마음의 온도와 책임의 무게가 또렷이 어우러져요(점성에선 달과 토성이 만나는 곳). 가벼운 두근거림만이 아니라, 이 관계가 얼마나 단단해질 수 있는지를 건드려요.',
      en: "One of you feels each day's mood as it flows, rising and falling. The other instinctively wants to hold those feelings steady and keep them safe. So here, the warmth of one heart and the weight of responsibility meet head-on (in astrology, this is where the Moon meets Saturn). It touches not just the easy flutter, but how solid this bond can grow.",
    },
    'Moon|Sun': {
      ko: "한 사람의 마음이 뛰는 리듬과 다른 사람의 가장 깊은 중심이 만나요. 궁합에서 제일 핵심이 되는 곳이에요. 해와 달이 만나듯, 한쪽의 감정(달)이 다른 쪽의 자아(해)를 비춰요. 그 사람의 정체성은 다시 상대의 마음을 물들이고요. 둘은 여기서 서로를 '있는 그대로' 느끼고 받아들여요. 그래서 둘 사이의 정서적 온도가 바로 여기서 흐르기 시작해요.",
      en: "This is the most central place in your match, where one person's beating heart touches the very core of who the other person is. Like the sun and moon meeting, one of you reflects the other's feelings (the Moon) onto their sense of self (the Sun). That identity then colors the other's heart right back. This is where the two of you feel and accept each other exactly as you are. So the emotional warmth between you starts right here.",
    },
    'Moon|Uranus': {
      ko: '한 사람의 마음이 흐르는 잔잔한 리듬과, 다른 사람이 품은 예측 못 할 설렘이 딱 마주쳐요. 조용히 흐르던 감정(달)에 갑자기 창문이 열리듯 새 바람(천왕성)이 훅 불어들죠. 그래서 익숙함과 낯섦이 한 호흡에 섞여요. 둘의 마음은 늘 같은 자리에 머물지 않고 조금씩 흔들리고 새로워져요. 안정과 변화를 함께 건드리는 사이예요.',
      en: "One person's quiet emotional rhythm meets the other's knack for the unexpected. A softly flowing feeling (the Moon) has a window thrown open, and a fresh gust (Uranus) blows in. So the familiar and the surprising mingle in a single breath. Between you the mood never settles in one spot. It keeps shifting and renewing itself, touching both steadiness and restlessness at once.",
    },
    'Moon|Venus': {
      ko: '한 사람의 마음이 움직이는 방식과, 다른 한 사람이 사랑을 건네는 방식이 여기서 맞닿아요. 한 사람은 마음(달)으로 느끼고, 다른 한 사람은 애정(금성)으로 다가가요. 일상에서 다정함을 어떻게 주고받는지, 그 온기가 여기서 정해져요. 누가 어떻게 마음을 표현하고 그게 상대에게 어떻게 가닿는지, 둘은 바로 이 자리에서 만나요.',
      en: "This is where one of you feels things and the other reaches out with love. You bring the inner mood (the Moon); they bring the warmth of affection (Venus). It's where the everyday tenderness between you gets its temperature. How one offers a soft gesture, and how it lands for the other, plays out right here.",
    },
    'Neptune|Sun': {
      ko: '환상·이상(해왕성)과 자아·정체성(태양)이 만나는 데지요. 상대를 빛나게 꿈처럼 비춰주기도 하고, 실제 모습이 흐려져 서로를 헛보기도 해요.',
      en: "Dream and idealization (Neptune) meets the core self (Sun). It can light someone up like a dream — or blur who they truly are so you both end up seeing something that isn't there.",
    },
    'Neptune|Venus': {
      ko: "한 사람은 꿈꾸고 이상을 그리는 마음을 가져오고, 다른 사람은 사랑하는 방식과 끌리는 취향을 가져와요(애정·금성). 둘은 서로를 실제보다 살짝 반짝이게 바라봐요. 상대의 매력이 마음속 가장 말랑한 자리를 설레게 하거든요. 환상과 설렘, 그리고 '이 사람을 어떻게 사랑하고 싶지'가 한자리에서 만나면서 둘 사이의 무드가 정해지는 거예요.",
      en: 'One of you brings a dreaming, idealizing heart; the other brings a way of loving and what they\'re drawn to (affection, Venus). You see each other a little more luminous than life. Their charm touches the softest corner inside you. This is where fantasy, flutter, and "how do I want to love this person" all meet, and that sets the mood between you.',
    },
    'Pluto|Sun': {
      ko: '깊이·강렬함(명왕성)이 상대의 자아·정체성(해)을 정면으로 건드려요. 서로를 완전히 바꿔놓을 만큼 강하게 끌어당기기도 하고, 너무 깊이 파고들어 부담스러운 무게가 되기도 하죠.',
      en: "Depth and intensity (Pluto) press right up against the other's core self (Sun). It can pull you together with a force strong enough to remake each other — or dig so deep that it becomes an overwhelming weight.",
    },
    'Pluto|Venus': {
      ko: '한 사람의 가장 깊고 강렬한 마음이, 다른 사람이 사랑을 표현하고 끌리는 방식과 만나요. 부드러운 끌림(금성) 위로 상대의 깊은 속마음(명왕성)이 스며들죠. 그래서 좋아하는 마음이 설렘에서 멈추지 않고, 서로의 밑바닥까지 끌어내요. 둘 사이에서 끌림이 유독 진하고 묵직하게 흐르는 자리죠.',
      en: "Here one person's deepest, most intense self meets the way the other loves and feels drawn in. That depth (Pluto) seeps into the softer pull of attraction (Venus). So liking each other doesn't stay at a light flutter. It reaches all the way down to each other's core. This is where attraction between you runs especially deep and heavy.",
    },
    'Saturn|Sun': {
      ko: '자아·정체성(해)이 책임과 시험(토성)과 마주쳐요. 곁에서 단단하게 다듬어주는 어른의 무게가 되기도 하고, 자꾸 검열당하는 듯 위축되게 만드는 쪽이 되기도 합니다.',
      en: 'Your core self (Sun) comes up against responsibility and testing (Saturn). It can be a grounding, grown-up weight that shapes you — or turn into a pressure that leaves you feeling judged and diminished.',
    },
    'Saturn|Venus': {
      ko: "한 사람은 관계에 무게와 약속을 들여요. 진중하게 재고 다지면서, 거리와 책임을 챙기는 쪽이죠(점성에선 '토성'). 다른 한 사람은 부드럽게 좋아하고 누려요. 무엇에 마음이 끌리는지, 다정함을 어떻게 건네는지가 드러나거든요(애정·금성). 둘은 같은 자리에서 사랑의 온도와 관계의 무게를 함께 다뤄요.",
      en: 'One of you brings weight and commitment. You measure carefully and steady things, minding distance and responsibility (Saturn). The other brings a softer way of delighting and savoring. What your heart is drawn to, how you offer tenderness, comes through here (affection, Venus). This is where the warmth of love and the gravity of commitment find their balance.',
    },
    'Sun|Sun': {
      ko: "두 사람 각자의 '나는 이런 사람이야' 하는 중심이 정면으로 만나요. 궁합에서 제일 깊은 곳이에요. 서로의 자아(점성에선 '태양')가 같은 무대에 함께 서서, 세상을 보는 눈도 삶을 끌고 가는 기질도 그대로 포개져요. 한 사람의 빛과 다른 사람의 빛이 한자리에서 만나, 둘은 관계의 가장 밑바탕 톤을 같이 칠해요.",
      en: "Here each person's core sense of \"this is who I am\" meets the other head-on. It's the deepest spot in your charts together. Your two selves (in astrology, the Sun) step onto the same stage, so the way you see the world and steer your lives lays right over each other. One person's light and the other's meet in one place, and together you paint the most basic tone of the whole relationship.",
    },
    'Sun|Uranus': {
      ko: '서로의 자아·정체성(해)을 자극과 변화(천왕성)가 흔들거든요. 익숙한 나를 깨우고 새로운 모습을 끌어내기도 하고, 평온하던 자리를 갑자기 흔들어 어수선하게 만드는 흐름도 있어요.',
      en: "One person's spark and change (Uranus) stirs the other's core self (Sun). It can wake you up and draw out a fresh side of you — or suddenly shake what was settled and leave things restless.",
    },
    'Sun|Venus': {
      ko: "두 사람의 '나다움'(해)과 애정·끌림(금성)이 만나거든요. 있는 그대로의 모습에 마음이 끌리기도 하고, 서로의 자존심이 애정과 부딪치기도 해요.",
      en: "One person's sense of self (Sun) meets the other's affection and charm (Venus). It can be a pure pull toward each other as you are — or a place where pride and fondness rub against each other.",
    },
    'Uranus|Venus': {
      ko: '한 사람은 예측 못 할 두근거림을 몰고 와요. 늘 새롭고 짜릿한 쪽으로 잡아끄는 사람이죠(천왕성). 그게 다른 사람이 사랑하고 마음 끌리는 방식(애정·금성)에 가서 닿아요. 한쪽이 일상에 살짝 균열 같은 설렘을 던지면, 다른 한쪽이 그걸 바로 알아챠요. 그래서 둘 사이 끌림이 한자리에 머물지 않고 자꾸 색이 바뀌어요.',
      en: 'One of you brings the unexpected, that restless pull toward something new and electric (Uranus). It reaches over and lands on the way the other loves and gets drawn to things (their affection, Venus). One of you tosses a little flutter into the everyday, and the other picks up on it right away. So the pull between you never quite sits still. Its colors keep shifting.',
    },
    'Venus|Venus': {
      ko: '한 사람이 사랑하는 방식(금성)과 다른 사람이 사랑하는 방식(금성)이 정면으로 만나요. 둘은 사랑할 때 무엇에 두근거리고 무엇을 예쁘다 여기는지, 그 취향이 바로 마주쳐요. 그래서 서로를 어떻게 아끼고 어떤 다정함을 주고받는지가 고스란히 드러나요.',
      en: "This is where one person's way of loving (Venus) meets the other's way of loving (Venus). Your two sets of tastes and attractions touch directly here. So it quietly shows what each of you finds sweet, and the kind of tenderness you offer and take from each other.",
    },
  },
  OVERLAY_HOUSE: {
    '1': {
      ko: '여기는 "나는 누구인가"가 펼쳐지는 곳이거든요. 첫인상, 몸짓, 세상에 자신을 내미는 방식 같은 가장 바깥의 빛이 살아나는 자리죠. 그래서 둘은 서로의 존재 자체를 한눈에 알아봐요.',
      en: 'This is where "who I am" unfolds. It holds your outermost light: first impressions, the way you carry yourself, how you step into the world. So you two read each other\'s whole presence instantly.',
    },
    '2': {
      ko: '"내가 가진 것, 내가 아끼는 것"이 드러나는 지점이에요. 돈이나 살림살이는 물론이고, 둘이 뭘 진짜 소중하다고 느끼는지가 여기서 보이거든요. 그래서 안정감, 그리고 손에 쥐고 싶은 마음이 짙게 흐르는 사이죠.',
      en: 'This is where "what you own and what you cherish" shows up. Money and belongings, yes — but also what each of you truly counts as precious. So there\'s a steady warmth and the desire to hold something close.',
    },
    '3': {
      ko: '여기선 둘이 주고받는 말과 매일의 리듬이 흘러요. 대화하고, 메시지 보내고, 사소한 일상을 함께하는 공간이죠. 그래서 가볍게 통하고 자주 닿는, 친근한 기운이 감돌아요.',
      en: "This is where the two of you trade words and share an everyday rhythm. You talk, you text, you move through small daily moments as one. So there's a friendly warmth between you, with easy understanding and frequent connection.",
    },
    '4': {
      ko: "여기선 둘이 '집과 뿌리'를 봐요. 가족, 고향, 마음이 푹 쉬는 자리까지 들여다보는 가장 사적인 곳이라, 둘은 여기서 긴장을 풀고 속을 슬며시 내려놔요. 신발 벗고 들어와 소파에 폭 파묻히는 기분이죠.",
      en: 'Here you two look at "home and roots." It\'s the most private spot — family, where you come from, the place your heart actually rests. So here you both unclench and quietly let your guard down. It feels like kicking off your shoes and sinking into the couch.',
    },
    '5': {
      ko: '여기서 둘은 설렘이 흘러가고, 순수한 끌림이 맴돌고, 마음을 들뜨게 하는 말들이 오가요. 연애와 즐거움이 흐르는 곳이거든요. 그래서 서로에게 자연스럽게 끌리고, 함께 빛나고 싶은 마음이 생겨요.',
      en: "This is where you two flutter, play, and say the things that make a heart skip. Romance and delight flow here. So you're drawn to each other naturally, and wanting to shine together stirs between you.",
    },
    '6': {
      ko: "여기는 '일과 매일의 습관'이 펼쳐지는 곳이에요. 둘이 손발을 맞추고 서로를 챙기는 자리라, 옆에서 슬쩍 거들고 하루를 함께 나누는 잔잔한 흐름이 돌아요.",
      en: "This is where 'work and daily habits' play out. You pitch in together and look after each other here, so it carries a quiet feel of small everyday help and shared days.",
    },
    '7': {
      ko: '한 사람을 평생 곁에 둘 동반자로 깊이 받아들이고 싶어지는 곳이에요. 정통 점성에서 짝과 결혼을 읽는 바로 그 자리라, 둘은 서로를 옆자리에 들이고 싶다는 끌림을 자연스럽게 느껴요.',
      en: "This is where you want to truly let someone in as a lifelong partner at your side. In classical astrology it's the very place that reads committed partners and marriage, so you two feel a natural pull to make room for each other.",
    },
    '8': {
      ko: '여기서 둘은 가장 깊은 자리로 들어가요. 둘만 아는 은밀한 신뢰, 함께 나누는 것들, 서로를 송두리째 바꿔놓는 힘이 흐르는 곳이거든요. 그래서 표면 아래로 진하게 엮이는 공기가 맴돌아요.',
      en: "This is where you two go all the way in. It's where the most private trust lives, the things you share, the force that remakes each other. So there's an intense air of being woven together far beneath the surface.",
    },
    '9': {
      ko: "여긴 '믿음과 넓어짐'을 다루는 곳이에요. 둘은 세상을 어떻게 볼지 함께 고민하고, 새로운 걸 배우고, 멀리 떠나는 모험을 같이 그려요. 그래서 시야가 탁 트이고, 더 큰 그림을 함께 꿈꾸게 되죠.",
      en: 'This is where belief and expansion live. You two figure out how to see the world, learn new things, and picture journeys to far-off places together. So your horizons open up, and you start dreaming a bigger picture as one.',
    },
    '10': {
      ko: "여기서 둘은 '일과 세상에서의 자리'를 다뤄요. 남들 눈에 어떻게 비치고 뭐로 기억되는지가 달려 있는, 제일 공적인 곳이죠. 그래서 서로의 길과 평판을 또렷하게 흔들어 놓는, 무게감 있는 곳이에요.",
      en: "This is where you two handle work and your standing in the world. It's the most public place — how each of you is seen, what you're remembered for. So you shape each other's path and reputation in plain sight, and it carries real weight.",
    },
    '11': {
      ko: '둘은 같은 곳을 바라봐요. 친구처럼 편하게, 함께 그리고 싶은 내일이 비슷하거든요. 동지처럼 나란히 서서 "우리 이러면 어때?" 하고 앞날을 같이 그려요. 그럴 때 둘 사이엔 산뜻한 바람이 불어요.',
      en: "You two look at the same place. Easy like friends, you want a similar tomorrow. You stand side by side like allies and dream up what's ahead together. When you do, a fresh kind of breeze moves between you.",
    },
    '12': {
      ko: "여기는 마음 깊은 곳, 잘 안 보이는 것들이 깃드는 자리예요(점성에선 '12하우스'). 좀처럼 입 밖에 안 내는 마음, 꿈, 안 보이는 데서 일어나는 일들이 스며 있죠. 그래서 둘 사이엔 말로 콕 집기 힘든, 신비롭고 아련하게 끌리는 무언가가 흐릅니다.",
      en: "This is where the deep, barely-visible parts of you live (in astrology, the '12th house'). The feelings you rarely say out loud, your dreams, the things that stir out of sight. So between you two there's a pull that's mysterious and faraway, the kind that's hard to name.",
    },
  },
  PILLAR_REL: {
    천간합: {
      feel: {
        ko: '자석처럼 끌리는',
        en: 'Magnetic pull',
      },
      blurb: {
        ko: '두 사람의 가장 윗기운이 손을 맞잡듯 딱 묶여요. 그래서 처음 마주친 순간부터 말로 설명 안 되는 끌림이 두근두근 흘러요. 같은 공간에 있기만 해도 둘은 자꾸 서로에게 눈길이 가고, 대화가 신기할 만큼 막힘없이 맞아떨어져요. 가끔 둘이 너무 닮아서 살짝 거리감이 들기도 하는데, 그건 안 맞아서가 아니라 서로를 비춰 주며 다듬어 가는 사이라서 그래요.',
        en: "Your two topmost energies lock together like clasped hands. So from the very first meeting, a pull you can't quite explain runs between you. Just sharing a room, you keep glancing at each other, and your talk clicks with surprising ease. Sometimes you sit so alike that a faint distance creeps in — that's not a mismatch, it's the way you two reflect and polish each other.",
      },
    },
    천간충: {
      feel: {
        ko: '또렷이 부딪히는 사이',
        en: 'Sharply colliding with each other',
      },
      blurb: {
        ko: '둘은 생각하는 방식도, 세상을 대하는 태도도 정반대예요. 그래서 얘기하다 보면 의견이 자주 부딪히고, 묘하게 거리감이 느껴지기도 하죠. 근데 신기하게 서로를 그냥 흘려보내는 법이 없어요. 안 맞아서가 아니라, 너무 또렷하게 의식하다 보니 자꾸 상대가 선명하게 보이는 거예요.',
        en: "You two think in opposite ways, and you meet the world from opposite sides. So when you talk, your opinions clash a lot, and a strange distance creeps in. But oddly, neither of you ever just lets the other slide by. It isn't that you don't fit. You notice each other so sharply that the other person keeps coming into clear focus.",
      },
    },
    육합: {
      feel: {
        ko: '잔잔한 수면 아래 흐름',
        en: 'Still surface, a current beneath',
      },
      blurb: {
        ko: '겉으로 보면 둘 사이엔 별일 없어 보여요. 큰 불꽃도, 요란한 끌림도 없이 그냥 곁에 있는 사이 같죠. 근데 말이 줄어드는 순간에 오히려 거리가 좁아져요. 같은 공간에 오래 머물수록 둘은 어느새 서로를 닮아 가요. 굳이 확인 안 해도 통하는 무언가가 속에서 천천히 자라잖아요.',
        en: 'On the surface, nothing much seems to happen between you. No big spark, no loud pull — just two people who end up near each other. But the distance closes in the quiet, where words drop away. The longer you share a room, the more you start to resemble each other. Something neither of you has to check on keeps growing underneath.',
      },
    },
    삼합: {
      feel: {
        ko: '비면 채우는 사이',
        en: 'Gaps that fill each other',
      },
      blurb: {
        ko: "두 사람이 같이 있으면 묘하게 한 팀이 돼요. 한 사람한테 비어 있던 자리를 다른 사람이 자연스럽게 채워줘서, 혼자일 때보다 둘이 있을 때 어디로 갈지가 또렷해지고 사이도 단단해지죠(사주에선 '삼합'). 가끔 그 단단함이 서로를 살짝 길들이는 거리처럼 느껴지기도 해요. 안 맞아서가 아니라, 둘이 한 방향으로 묶이다 보니 생기는 거예요.",
        en: "When you're together, you fall into a team in a way that surprises you. What's empty in one of you gets quietly filled by the other, so the two of you know where you're heading more clearly than either of you alone, and the bond holds firmer (Saju calls this 'three-harmony'). Sometimes that firmness feels like a little distance, where you gently shape each other. That's not a mismatch. It's just what happens when you get pulled in one direction together.",
      },
    },
    방합: {
      feel: {
        ko: '한 색으로 물드는 사이',
        en: 'Blending into one color',
      },
      blurb: {
        ko: '두 사람은 같은 계절, 같은 쪽을 바라봐요. 그래서 굳이 약속하지 않아도 한자리에 모여요. 좋아하는 풍경도 마음이 오래 머무는 곳도 닮아서, 따로 맞추지 않아도 같은 색으로 점점 짙어지죠. 너무 닮은 만큼 가끔 미묘한 거리가 생기기도 해요. 근데 그건 안 맞아서가 아니라, 같은 빛을 오래 들여다보는 시간이에요.',
        en: "You two look toward the same season, the same direction. So you end up in one place without ever planning it. The scenery you love and the spots where your hearts linger come to look alike, deepening into one color on their own. Being this alike, a subtle distance shows up sometimes. That's not a mismatch — it's the long quiet of staring into the same light together.",
      },
    },
    충: {
      feel: {
        ko: '끌리며 흔들리는 자리',
        en: 'Drawn in, and shaken',
      },
      blurb: {
        ko: '두 사람 안쪽 기운이 정면으로 딱 마주 서 있어요. 그래서 같이 있으면 서로를 자꾸 의식하게 되고, 잔잔하기보다 콩닥콩닥 자극이 오가는 사이예요. 특히 한 사람 바로 옆자리에서 이 마주섬이 제일 또렷해지죠. 안 맞아서가 아니라 서로를 가장 가깝게 건드리는 자리라, 그만큼 단단해지는 일도 흔들리는 일도 크게 오가요.',
        en: "Your inner energies face each other head-on. So when you're together you keep noticing each other, and this connection runs on spark rather than stillness. It lands sharpest right beside one of you. Not because you clash, but because that's where you touch each other most closely, so growth and upheaval both move strongly between you.",
      },
    },
    형: {
      feel: {
        ko: '거치면 단단해지는 사이',
        en: 'Tempered by friction',
      },
      blurb: {
        ko: '둘은 서로를 은근히 누르고 부딪치는 사이예요. 가끔 말이 빙 돌아가거나 마음이 콱 막혀서 답답해지기도 하죠. 근데 그건 안 맞아서가 아니라, 둘 사이에 서로를 단단하게 만드는 거리가 놓여 있어서예요. 그 거리를 한 번씩 지날 때마다 서로를 향한 인내도, 둘 사이도 조금씩 더 단단해져요.',
        en: "You two quietly press and bump up against each other. Sometimes words take the long way around, or a feeling gets stuck and stuffy. That isn't a mismatch, though. There's a distance between you that makes each of you tougher. Every time you cross it, your patience and the bond both firm up a little more.",
      },
    },
    자형: {
      feel: {
        ko: '거울 같은 떨림',
        en: 'Mirror tremor',
      },
      blurb: {
        ko: '두 사람은 타고난 바탕이 똑 닮아서, 마주 보면 거울을 보듯 익숙하면서도 콩닥 설레요. 근데 닮은 만큼 똑같은 자리에서 예민해져서, 한 사람이 흔들리면 상대도 같이 출렁여요. 안 맞아서가 아니라 너무 닮아서 생기는 울림이라, 둘은 서로한테서 자기 모습을 자꾸 발견해요.',
        en: "You two are made of the same stuff, so facing each other feels like a mirror, familiar and a little thrilling at once. But because you're so alike, you get tender in the exact same spots. When one of you wavers, the other ripples right along. It's not a mismatch, it's an echo from how much you resemble each other, and you keep catching glimpses of yourself in the other.",
      },
    },
    해: {
      feel: {
        ko: '반 박자 엇갈리는 사이',
        en: 'Half a beat out of sync',
      },
      blurb: {
        ko: '둘은 큰소리 내며 싸우는 일은 별로 없어요. 근데 발이 묘하게 안 맞는 순간이 자꾸 와요. 같은 데를 보고 가는데 도착하는 속도가 살짝 달라서, 한 사람이 멈추면 다른 사람은 벌써 한 발 앞에 가 있죠. 미워서가 아니에요. 서로의 박자를 몸에 익히는 데 시간이 조금 더 걸리는 사이예요.',
        en: "You two rarely fight out loud. Still, your steps keep landing just a beat off. You're heading to the same place, but you get there at slightly different speeds. So when one of you stops, the other is already a step ahead. It's not dislike. You just need a little longer to learn each other's rhythm by heart.",
      },
    },
    파: {
      feel: {
        ko: '살짝 어긋나는 자리',
        en: 'A hairline crack',
      },
      blurb: {
        ko: '둘은 웬만한 일은 자연스레 잘 통하는데, 딱 한 군데서 살짝 어긋나요. 크게 부딪치는 건 아니에요. 그릇에 난 가는 금처럼, 평소엔 있는지도 모르고 지나가는 미묘한 거리죠. 안 맞아서가 아니라, 서로 다른 자리를 마주하면서 조금씩 단단해지는 사이이기도 해요.',
        en: "Most things between you two just flow. But in one spot you land slightly out of line. It's not a big clash. It's like a fine crack in a bowl. Most days you'd walk right past it without noticing. It isn't that you don't fit. It's a place where your two different sides meet and slowly grow sturdier.",
      },
    },
  },
  BAND: {
    eastern_hap: {
      what: {
        ko: "사주 글자끼리 손을 맞잡듯 묶이는 '합'의 정도",
        en: "How much the two charts' pillars naturally link hands and pair up",
      },
      high: {
        ko: "두 사람 사주 글자들이 서로 손을 잡듯 술술 엮여요(사주에선 '합'). 그래서 곁에 있으면 길게 설명 안 해도 뭔가 편하게 맞물리더라고요.",
        en: "Your charts' pieces tend to clasp hands and slot together easily (in Saju this is called 'hap'). So when you're together, things often click into place without much explaining.",
      },
      low: {
        ko: '두 사람의 글자가 손을 맞잡는 자리가 많지는 않아요. 그래서 가까워지기까지 둘만의 속도와 시간이 조금 더 필요한 사이죠.',
        en: "There aren't many spots where your pieces clasp hands. So this is a pairing that warms up at its own slower pace, in its own time.",
      },
    },
    eastern_chung: {
      what: {
        ko: "사주 글자끼리 부딪히는 '충'이 적어 잔잔한 정도",
        en: 'Calm and steady, with few places where the pillars knock against each other',
      },
      high: {
        ko: '두 사람 글자가 부딪혀서 튀는 데가 거의 없어서 잔잔해요. 그래서 같이 있는 시간이 큰 파도 없이 고요한 물처럼 막힘없이 흘러가요.',
        en: 'Almost none of your pieces grind against each other, so things stay calm. The time you share moves like still water, gliding along without big waves.',
      },
      low: {
        ko: '두 사람의 글자가 더러 맞부딪히며 불꽃이 톡톡 튀어요. 그래서 잔잔한 호수라기보다, 생기와 떨림이 같이 도는 만남에 가까워요.',
        en: 'A few of your pieces knock together and throw sparks. So this feels less like calm water, more like a lively, charged kind of meeting.',
      },
    },
    elements_match: {
      what: {
        ko: '서로에게 모자란 기운을 채워주는 오행(다섯 기운)의 보완 정도',
        en: 'How well your five elements fill in what each other is short on',
      },
      high: {
        ko: '한 사람에게 비어 있던 기운을 다른 사람이 슬며시 채워줘요. 그래서 둘이 모이면 빈칸이 메워진 듯 한결 둥글어지죠.',
        en: 'Where one of you runs short, the other quietly fills it in. So together you round out, like a circle whose gaps just got closed.',
      },
      low: {
        ko: '둘 다 비슷한 기운에 마음이 쏠려 있어요. 그래서 서로 빈자리를 채워주기보다, 같은 색을 두 번 덧칠해 더 진해지는 쪽에 가까워요.',
        en: "You both lean toward the same kind of energy. So instead of filling each other's gaps, you're more like two coats of the same color, layered until it deepens.",
      },
    },
    synastry_harmonic: {
      what: {
        ko: "두 사람 별자리 행성끼리 부드럽게 흐르며 어우러지는 '조화'의 정도",
        en: "How much harmony there is in the way your charts' planets flow and blend together",
      },
      high: {
        ko: '둘은 서로의 행성이 부드럽게 손을 내미는 자리가 많아요. 그래서 수다를 떨든 가만히 있든, 흐름이 한 곡의 음악처럼 자연스레 이어지곤 해요.',
        en: "Your planets reach toward each other in many spots. So whether you're talking or just sitting quiet, the flow tends to carry like one continuous song.",
      },
      low: {
        ko: '두 사람의 행성이 매끄럽게 이어지는 자리가 많진 않아요. 그래서 저절로 술술 흐르기보다는, 둘만의 리듬을 하나씩 맞춰가는 쪽에 가까워요.',
        en: "There aren't many spots where your planets glide together. So this works less on instinct and more like two people tuning their own rhythm, piece by piece.",
      },
    },
    synastry_tension: {
      what: {
        ko: '별자리 행성 사이의 긴장이 적어 마음이 편안한 정도',
        en: 'How at ease it feels, with little tension between your planets',
      },
      high: {
        ko: '둘 사이엔 팽팽하게 당겨지는 자리가 거의 없어요. 그래서 곁에 있으면 어깨에 힘이 풀리고, 둘은 마음이 느슨해지죠.',
        en: 'Almost nothing pulls tight between you two. So being near each other is the kind of ease where your shoulders drop and you both unwind.',
      },
      low: {
        ko: '둘의 행성끼리 팽팽하게 당기는 자리가 군데군데 있어요. 그래서 마냥 느슨하다기보다, 서로를 자꾸 끌어당기고 흔드는 긴장이 함께 도는 사이예요.',
        en: 'A few spots pull tight between your planets. So this works less like pure ease and more like a charged push and pull that keeps drawing you back to each other.',
      },
    },
  },
}
