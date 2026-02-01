import type { SajuData, AstroData, UnseItem } from '../types';

interface TimeBasedFortuneResult {
  year?: { title: string; message: string; advice: string; emoji: string };
  month?: { title: string; message: string; advice?: string; emoji: string };
  today?: { title: string; message: string; tip: string; emoji: string };
  growth?: { title: string; stage: string; message: string; emoji: string };
}

export function getTimeBasedFortune(saju: SajuData | undefined, astro: AstroData | undefined, lang: string): TimeBasedFortuneResult | null {
  const isKo = lang === "ko";
  const result: TimeBasedFortuneResult = {};

  // 올해 운세 (Solar Return + 사주 세운)
  const solarReturn = astro?.solarReturn?.summary;
  const currentYear = new Date().getFullYear();
  const annualList = saju?.unse?.annual;
  const thisYearSaju = Array.isArray(annualList) ? annualList.find((a: UnseItem) => a.year === currentYear) : null;

  if (solarReturn || thisYearSaju) {
    let message = "";
    let advice = "";

    if (typeof solarReturn === 'string') {
      message = solarReturn;
    } else if (thisYearSaju) {
      // 사주 기반 간단한 메시지
      const ganji = thisYearSaju.ganji || "";
      if (ganji.includes("甲") || ganji.includes("乙")) {
        message = isKo
          ? "당신의 씨 에너지와 새로운 변화의 기운이 만나는 해예요. 올해는 '이거 해볼까?'했던 것들을 실제로 시작하기 딱 좋아요. 작년까지 망설였던 거, 올해는 일단 해보세요. 새로운 프로젝트, 새로운 관계, 새로운 환경... 변화를 두려워하지 마세요. 물론 처음엔 서툴러요. 그런데 그게 정상이에요. 올해는 완벽하게 하는 게 목표가 아니라 '일단 시작하는 것'이 목표예요."
          : "Your seed energy meets new change energy this year. Perfect year to actually start things you thought 'should I try this?' What you hesitated until last year, just do it this year. New projects, relationships, environments... don't fear change. Of course you'll be clumsy at first. But that's normal. This year's goal isn't to do perfectly but to 'just start'.";
        advice = isKo ? "계획만 하지 말고 일단 실행하세요. 움직이면서 배워요." : "Don't just plan—execute. Learn while moving.";
      } else if (ganji.includes("丙") || ganji.includes("丁")) {
        message = isKo
          ? "올해는 숨어 있으면 안 되는 해예요. 나서야 해요. 사람들 만나고, 말하고, 표현하고, 활동해야 운이 들어와요. '이건 내가 만든 거예요', '제 생각은 이래요'라고 말하세요. 혼자 조용히 하던 일도 이제는 사람들한테 보여주세요. SNS든, 모임이든, 발표든... 보여줘야 인정받아요. 열정은 있는데 표현 안 하면 아무도 몰라요. 올해는 에너지를 밖으로 쏟아내는 해예요."
          : "This year you can't hide. You must step out. Meet people, speak, express, be active—that's how luck comes in. Say 'I made this', 'This is what I think'. Show people what you did alone quietly before. SNS, gatherings, presentations... showing brings recognition. Having passion but not expressing means nobody knows. This year is for pouring energy outward.";
        advice = isKo ? "적극적으로 나서세요. 조용히 잘하는 건 이제 끝." : "Take initiative. Silent excellence is over now.";
      } else if (ganji.includes("戊") || ganji.includes("己")) {
        message = isKo
          ? "올해는 화려한 성과보다 탄탄한 기반을 다지는 해예요. '대박'을 꿈꾸지 말고 '꾸준함'을 선택하세요. 매일 작은 것들을 쌓아가세요. 운동, 공부, 저축, 인간관계... 지금은 티가 안 나요. 6개월 뒤에 보면 '아, 이때 쌓아둔 게 도움이 되네'라고 느낄 거예요. 서두르면 무너져요. 욕심부리지 말고 한 걸음씩. 지루해도 계속하세요. 그게 올해 성공하는 방법이에요."
          : "This year is for building solid foundation over flashy results. Choose 'consistency' instead of dreaming 'jackpot'. Stack small things daily. Exercise, study, savings, relationships... not visible now. In 6 months you'll feel 'ah, what I built then helps now'. Rushing makes it crumble. Don't be greedy—one step at a time. Keep going even if boring. That's how to succeed this year.";
        advice = isKo ? "조급해하지 마세요. 천천히 가는 게 결국 더 빨라요." : "Don't rush. Going slow is ultimately faster.";
      } else if (ganji.includes("庚") || ganji.includes("辛")) {
        message = isKo
          ? "올해는 정리의 해예요. 수확하고, 불필요한 건 버리고, 핵심만 남겨두세요. 쓸데없이 많은 건 다 독이에요. 관계도 정리하세요. 안 맞는 사람 억지로 만나지 마세요. 일도 정리하세요. 중요한 것만 하고 나머지는 과감히 NO. 물건도 정리하세요. 1년 안 쓴 건 버려요. 올해는 많이 하는 게 아니라 '잘 고르는' 해예요. 옷장이든, 일이든, 관계든... 정말 중요한 것만 남기세요."
          : "This year is for organizing. Harvest, discard unnecessary, keep only essentials. Too much of anything is poison. Organize relationships—don't force yourself to meet incompatible people. Organize work—do only important things, boldly say NO to rest. Organize belongings—throw away what you haven't used in a year. This year isn't about doing much but 'choosing well'. Wardrobe, work, relationships... keep only what truly matters.";
        advice = isKo ? "단순하게 가세요. 적게 가질수록 가벼워져요." : "Keep it simple. Less you have, lighter you become.";
      } else {
        message = isKo
          ? "올해는 겉으로 드러나는 성과가 적을 수 있어요. 그런데 그게 문제가 아니에요. 지금은 내실을 다지는 시기거든요. 깊이 생각하고, 공부하고, 준비하세요. 밖에서 보면 '별로 안 하네?'라고 할 수도 있어요. 신경 쓰지 마세요. 물 밑에서 뿌리가 자라고 있어요. 혼자만의 시간을 충분히 가지세요. 명상, 독서, 사색... 내면을 채우는 시간이 올해의 투자예요."
          : "This year may show few visible achievements. But that's not a problem. Now is time to build substance. Think deeply, study, prepare. From outside, people may say 'not doing much?' Don't mind. Roots are growing underwater. Have plenty of alone time. Meditation, reading, contemplation... time filling your inner self is this year's investment.";
        advice = isKo ? "조용히 힘을 축적하세요. 때가 되면 터져요." : "Quietly build strength. It bursts when time comes.";
      }
    }

    if (message) {
      result.year = {
        title: isKo ? "올해 어때요?" : "How's This Year?",
        message,
        advice: advice || (isKo ? "흐름을 타세요" : "Ride the flow"),
        emoji: "☀️"
      };
    }
  }

  // 이번 달 (Lunar Return + 사주 월운)
  const lunarReturn = astro?.lunarReturn?.summary;
  const currentMonth = new Date().getMonth() + 1;
  const monthlyList = saju?.unse?.monthly;
  const thisMonthSaju = Array.isArray(monthlyList) ? monthlyList.find((m: UnseItem) => m.month === currentMonth) : null;

  if (lunarReturn || thisMonthSaju) {
    let message = "";
    let advice = "";

    // 기존 lunarReturn 메시지가 있으면 사용
    if (typeof lunarReturn === 'string' && lunarReturn.length > 50) {
      message = lunarReturn;
    } else if (thisMonthSaju) {
      // 월운 간지로 이번 달 에너지 판단
      const ganjiRaw = thisMonthSaju.ganji || (thisMonthSaju as Record<string, unknown>).month_ganji || "";
      const ganjiMonth = typeof ganjiRaw === 'string' ? ganjiRaw : "";

      if (ganjiMonth.includes("甲") || ganjiMonth.includes("乙")) {
        message = isKo
          ? "이번 달은 새로운 걸 시작하기 딱 좋은 타이밍이에요. '다음 달에 해야지'라고 미루지 말고 이번 달에 시작하세요. 작은 거라도 좋아요. 새로운 습관, 새로운 관계, 새로운 배움... 뭐든 시작하면 생각보다 잘 풀려요. 에너지가 '시작'을 밀어주는 시기거든요. 망설이던 거 있으면 이번 달에 일단 해보세요."
          : "This month is perfect for starting something new. Don't postpone to next month - start this month. Even small things work. New habits, new relationships, new learning... whatever you start will flow better than expected.";
        advice = isKo ? "망설이지 말고 일단 시작하세요. 흐름이 도와줘요." : "Don't hesitate, just start. The flow supports you.";
      } else if (ganjiMonth.includes("丙") || ganjiMonth.includes("丁")) {
        message = isKo
          ? "이번 달은 사람들한테 당신을 보여줘야 하는 달이에요. 숨어서 일하지 말고, 적극적으로 나서세요. 회의 때 의견 말하기, SNS에 글 올리기, 친구들한테 연락하기... 사람들과 만나고 소통하는 게 운을 끌어와요. 조용히 있으면 기회가 안 와요. 이번 달은 표현하고, 말하고, 보여줘야 해요. 에너지를 밖으로 쏟아내세요."
          : "This month you need to show yourself to people. Don't hide - be active. Share opinions in meetings, post on social media, contact friends... meeting and communicating brings luck.";
        advice = isKo ? "숨지 말고 적극적으로 표현하세요. 보여줘야 인정받아요." : "Don't hide, express actively. You get recognized when you show up.";
      } else if (ganjiMonth.includes("戊") || ganjiMonth.includes("己")) {
        message = isKo
          ? "이번 달은 안정적으로 가야 해요. 큰 변화보다는 지금 하던 거 잘 마무리하는 게 중요해요. 서두르지 말고, 차근차근 하나씩 처리하세요. 급하게 새로운 거 벌이는 것보다 기존 것들 정리하고 안정화하는 게 나아요. 루틴 잘 지키고, 건강 챙기고, 관계 정리하고... 차분하게 지내는 게 이번 달 운을 잘 타는 방법이에요."
          : "This month needs stability. Rather than big changes, finishing what you're doing is important. Don't rush, handle things one by one. Better to organize existing things than start new ones hastily.";
        advice = isKo ? "서두르지 말고 차근차근 안정적으로 가세요." : "Don't rush, go steadily and stable.";
      } else if (ganjiMonth.includes("庚") || ganjiMonth.includes("辛")) {
        message = isKo
          ? "이번 달은 정리의 달이에요. 필요 없는 거 버리고, 중요한 것만 남기세요. 옷장 정리, 파일 정리, 관계 정리, 일정 정리... 뭐든 정리하면 마음이 가벼워져요. 복잡하게 얽혀 있던 게 심플해지면 다음 달부터 새로운 걸 받아들일 공간이 생겨요. 이번 달은 덜어내는 연습을 하세요. 비워야 채워져요."
          : "This month is for organizing. Throw away unnecessary things, keep only important ones. Closet, files, relationships, schedules... organizing anything lightens your mind.";
        advice = isKo ? "복잡한 거 정리하세요. 비워야 다시 채워져요." : "Organize complexity. You must empty to fill again.";
      } else if (ganjiMonth.includes("壬") || ganjiMonth.includes("癸")) {
        message = isKo
          ? "이번 달은 내면으로 들어가는 시기예요. 밖으로 나서는 것보다 안으로 들여다보는 게 중요해요. 나는 지금 뭘 원하는지, 무엇이 나를 행복하게 하는지, 어디로 가고 싶은지... 생각을 정리하세요. 혼자 조용히 있는 시간이 필요해요. 사람 많이 만나는 것보다 나 자신과 대화하는 게 이번 달 과제예요. 명상, 산책, 독서... 혼자만의 시간을 충분히 가지세요."
          : "This month is for turning inward. Looking inside is more important than going outward. What do I want now, what makes me happy, where do I want to go... organize your thoughts.";
        advice = isKo ? "혼자만의 시간을 가지세요. 내면의 소리를 들어보세요." : "Take time alone. Listen to your inner voice.";
      } else {
        message = isKo
          ? "이번 달은 감정 변화가 큰 시기예요. 기분이 오락가락할 수 있어요. 너무 큰 결정은 미루고, 마음이 안정될 때까지 기다리세요. 감정에 휘둘려서 충동적으로 행동하지 마세요. 일기 쓰거나 친한 사람한테 털어놓는 게 도움이 돼요. 자기 감정을 잘 살피고, 필요하면 쉬어가세요."
          : "This month has big emotional changes. Your mood might fluctuate. Postpone big decisions, wait until your mind settles. Don't act impulsively driven by emotions.";
        advice = isKo ? "감정이 흔들릴 때는 큰 결정 미루세요. 일단 쉬어요." : "When emotions shake, postpone big decisions. Rest first.";
      }
    }

    if (message) {
      result.month = {
        title: isKo ? "이번 달은?" : "This Month?",
        message,
        advice: advice || (isKo ? "이번 달 에너지를 잘 타세요" : "Ride this month's energy"),
        emoji: "🌙"
      };
    }
  }

  // 오늘 (사주 일진)
  const todayDate = new Date().toISOString().slice(0, 10);
  const iljinList = saju?.unse?.iljin;
  const todayDayNum = new Date().getDate();
  const todayIljin = Array.isArray(iljinList) ? iljinList.find((i: UnseItem) => i.day === todayDate || i.day === todayDayNum) : null;

  if (todayIljin) {
    const ganji = todayIljin.ganji || "";
    let message = "";
    let tip = "";

    if (ganji.includes("甲") || ganji.includes("乙")) {
      message = isKo ? "새로운 걸 시도하기 좋은 날" : "Good day to try new things";
      tip = isKo ? "아침부터 활기차게 시작하세요" : "Start energetically from morning";
    } else if (ganji.includes("丙") || ganji.includes("丁")) {
      message = isKo ? "사람 만나고 소통하기 좋은 날" : "Good day to meet and communicate";
      tip = isKo ? "밝게 웃으며 다니세요" : "Go around with a bright smile";
    } else if (ganji.includes("戊") || ganji.includes("己")) {
      message = isKo ? "차분하게 일 처리하기 좋은 날" : "Good day to handle tasks calmly";
      tip = isKo ? "급하게 서두르지 마세요" : "Don't rush";
    } else if (ganji.includes("庚") || ganji.includes("辛")) {
      message = isKo ? "정리하고 결정하기 좋은 날" : "Good day to organize and decide";
      tip = isKo ? "명확하게 말하세요" : "Speak clearly";
    } else {
      message = isKo ? "혼자만의 시간을 갖기 좋은 날" : "Good day for alone time";
      tip = isKo ? "조용히 쉬어도 괜찮아요" : "It's okay to rest quietly";
    }

    result.today = {
      title: isKo ? "오늘은?" : "Today?",
      message,
      tip,
      emoji: "📅"
    };
  }

  // 성장 단계 (Progressions)
  const progressions = astro?.progressions;
  if (progressions?.secondary?.moonPhase) {
    const phase = progressions.secondary.moonPhase.toLowerCase();
    let stage = "";
    let message = "";

    if (phase.includes("new")) {
      stage = isKo ? "씨앗 심는 시기" : "Planting Seeds";
      message = isKo ? "새로운 걸 시작하세요. 지금은 시작이 중요해요." : "Start something new. Beginning matters now.";
    } else if (phase.includes("crescent") || phase.includes("quarter")) {
      stage = isKo ? "쑥쑥 자라는 시기" : "Growing Phase";
      message = isKo ? "노력한 만큼 성장해요. 계속 밀고 나가세요." : "You grow as much as you effort. Keep pushing.";
    } else if (phase.includes("full")) {
      stage = isKo ? "꽃 피는 시기" : "Blooming";
      message = isKo ? "결과가 나와요. 자신감을 가지세요." : "Results show. Be confident.";
    } else {
      stage = isKo ? "정리하는 시기" : "Organizing";
      message = isKo ? "불필요한 걸 놓아주세요. 비워야 채워져요." : "Let go of unnecessary things. Empty to fill.";
    }

    result.growth = {
      title: isKo ? "지금 어떤 단계?" : "What Stage Now?",
      stage,
      message,
      emoji: "🦋"
    };
  }

  return Object.keys(result).length > 0 ? result : null;
}
