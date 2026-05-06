export function getGeokgukCareer(name: string, isKo: boolean): { title: string; desc: string; emoji: string } | null {
  const n = name.toLowerCase();
  if (n.includes("식신") || n.includes("food")) {return {
    title: isKo ? "창작형 커리어" : "Creative Career",
    emoji: "🎨",
    desc: isKo
      ? "당신은 무언가를 '만들어내는' 사람이에요. 요리, 글쓰기, 디자인, 예술... 창작 활동을 할 때 가장 행복해요."
      : "You're someone who 'creates.' Cooking, writing, design, art... you're happiest when creating."
  };}
  if (n.includes("상관") || n.includes("hurting")) {return {
    title: isKo ? "표현형 커리어" : "Expressive Career",
    emoji: "🎤",
    desc: isKo
      ? "당신은 말과 표현의 천재예요. 강의, 방송, 영업, 마케팅... 소통하는 일에서 두각을 나타내요."
      : "You're a genius of expression. Lectures, broadcasting, sales, marketing... you excel in communication roles."
  };}
  if (n.includes("정재") || n.includes("direct wealth")) {return {
    title: isKo ? "안정 재물형" : "Steady Wealth",
    emoji: "🏦",
    desc: isKo
      ? "당신은 '차곡차곡' 쌓아가는 타입이에요. 월급, 적금, 부동산... 안정적인 재테크가 잘 맞아요."
      : "You build wealth steadily. Salary, savings, real estate... stable investments suit you."
  };}
  if (n.includes("편재") || n.includes("indirect wealth")) {return {
    title: isKo ? "사업형 재물" : "Business Wealth",
    emoji: "💰",
    desc: isKo
      ? "당신은 큰 그림을 그리는 타입이에요. 투자, 사업, 부업... 다양한 수입원을 만드는 데 능해요."
      : "You see the big picture. Investment, business, side hustles... you're good at creating multiple income streams."
  };}
  if (n.includes("정관") || n.includes("direct officer")) {return {
    title: isKo ? "조직형 성공" : "Organizational Success",
    emoji: "👔",
    desc: isKo
      ? "당신은 조직에서 빛나는 타입이에요. 안정적인 커리어 경로에서 차근차근 올라가요."
      : "You shine in organizations. You steadily climb stable career paths."
  };}
  if (n.includes("편관") || n.includes("indirect officer")) {return {
    title: isKo ? "도전형 성공" : "Challenger Success",
    emoji: "⚔️",
    desc: isKo
      ? "당신은 경쟁에서 강해지는 타입이에요. 어려운 환경에서 오히려 능력이 발휘돼요."
      : "You get stronger in competition. Difficult environments bring out your abilities."
  };}
  return null;
}
