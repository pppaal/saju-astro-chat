const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'Tarot', 'tarot-data.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf-8');

// Define the advice data for each card
const adviceData = {
  50: {
    upright: 'Embrace clarity and truth. Cut through confusion with insight.',
    uprightKo: '명확함과 진실을 받아들이세요. 통찰력으로 혼란을 뚫으세요.',
    reversed: 'Clear mental fog. Seek truth before acting.',
    reversedKo: '정신적 안개를 걷으세요. 행동 전에 진실을 찾으세요.'
  },
  51: {
    upright: 'Face the difficult choice. Avoiding it only delays resolution.',
    uprightKo: '어려운 선택에 맞서세요. 피하면 해결만 늦어집니다.',
    reversed: "Open your eyes to the truth. Make the decision you've been avoiding.",
    reversedKo: '진실에 눈을 뜨세요. 피해왔던 결정을 내리세요.'
  },
  52: {
    upright: 'Allow yourself to grieve. Healing begins with acknowledgment.',
    uprightKo: '슬픔을 허용하세요. 치유는 인정에서 시작됩니다.',
    reversed: 'Begin releasing old pain. Recovery is possible.',
    reversedKo: '오래된 고통을 놓기 시작하세요. 회복은 가능합니다.'
  },
  53: {
    upright: 'Rest and recuperate. Your mind needs peace.',
    uprightKo: '쉬고 회복하세요. 마음에 평화가 필요합니다.',
    reversed: "Don't ignore the need for rest. Burnout is avoidable.",
    reversedKo: '휴식의 필요를 무시하지 마세요. 번아웃은 피할 수 있습니다.'
  },
  54: {
    upright: 'Choose your battles wisely. Not every fight is worth winning.',
    uprightKo: '싸움을 현명하게 선택하세요. 모든 싸움이 이길 가치가 있진 않습니다.',
    reversed: 'Seek reconciliation. Let go of the need to be right.',
    reversedKo: '화해를 추구하세요. 옳아야 한다는 필요를 놓으세요.'
  },
  55: {
    upright: 'Trust the transition. Calmer waters await.',
    uprightKo: '전환을 믿으세요. 잔잔한 물이 기다리고 있습니다.',
    reversed: "Face what you're running from. Healing requires confrontation.",
    reversedKo: '도망치는 것에 맞서세요. 치유에는 직면이 필요합니다.'
  },
  56: {
    upright: 'Be strategic, but stay ethical. Check your intentions.',
    uprightKo: '전략적이되, 윤리적으로 하세요. 의도를 점검하세요.',
    reversed: 'Come clean. Honesty is the best policy now.',
    reversedKo: '솔직해지세요. 지금은 정직이 최선입니다.'
  },
  57: {
    upright: 'Recognize your mental prison is self-imposed. Freedom is possible.',
    uprightKo: '정신적 감옥이 자초한 것임을 인식하세요. 자유는 가능합니다.',
    reversed: 'Begin removing your blindfold. Take one small step toward freedom.',
    reversedKo: '눈가리개를 벗기 시작하세요. 자유를 향해 작은 한 걸음을 내딛으세요.'
  },
  58: {
    upright: "Share your worries. You don't have to face anxiety alone.",
    uprightKo: '걱정을 나누세요. 불안에 혼자 맞설 필요 없습니다.',
    reversed: 'Your fears are often worse than reality. Seek perspective.',
    reversedKo: '두려움은 대개 현실보다 과장됩니다. 관점을 찾으세요.'
  },
  59: {
    upright: 'Accept the ending. From rock bottom, the only way is up.',
    uprightKo: '끝을 받아들이세요. 바닥에서는 올라가는 길뿐입니다.',
    reversed: 'Resist playing the victim. Recovery and renewal begin now.',
    reversedKo: '피해자 역할을 그만두세요. 회복과 갱신이 지금 시작됩니다.'
  },
  60: {
    upright: 'Stay curious and alert. Use your mind to solve problems.',
    uprightKo: '호기심과 경계심을 유지하세요. 문제 해결에 지성을 사용하세요.',
    reversed: 'Think before you speak. Avoid gossip and hasty conclusions.',
    reversedKo: '말하기 전에 생각하세요. 험담과 성급한 결론을 피하세요.'
  },
  61: {
    upright: "Act decisively when you're certain. Speed can be an advantage.",
    uprightKo: '확신이 있을 때 단호하게 행동하세요. 속도가 이점이 될 수 있습니다.',
    reversed: 'Slow down. Rushing leads to unnecessary conflict.',
    reversedKo: '속도를 늦추세요. 서두름은 불필요한 갈등을 낳습니다.'
  },
  62: {
    upright: 'Speak your truth with clarity. Set clear boundaries.',
    uprightKo: '명확하게 진실을 말하세요. 분명한 경계를 설정하세요.',
    reversed: "Balance intellect with compassion. Don't be too harsh.",
    reversedKo: '지성과 연민의 균형을 맞추세요. 너무 가혹하지 마세요.'
  },
  63: {
    upright: 'Make decisions with logic and fairness. Be objective.',
    uprightKo: '논리와 공정함으로 결정하세요. 객관적이 되세요.',
    reversed: "Don't let intellectual superiority become coldness. Consider others' feelings.",
    reversedKo: '지적 우월감이 냉정함이 되지 않게 하세요. 타인의 감정을 고려하세요.'
  }
};

// Process each card (50-63)
for (let id = 50; id <= 63; id++) {
  const advice = adviceData[id];

  // First, add arcana and suit if not present for cards 51-63
  if (id > 50) {
    const cardPattern = new RegExp(
      `(\\{\\s*id: ${id},\\s*name: '[^']+',\\s*nameKo: '[^']+',)`,
      'g'
    );
    content = content.replace(
      cardPattern,
      `$1\n    arcana: 'minor',\n    suit: 'swords',`
    );
  }

  // Add advice to upright section
  const uprightPattern = new RegExp(
    `(id: ${id},[\\s\\S]*?upright: \\{[\\s\\S]*?meaningKo: '[^']*')\\s*\\}`,
    ''
  );
  content = content.replace(
    uprightPattern,
    `$1,\n      advice: '${advice.upright}',\n      adviceKo: '${advice.uprightKo}'\n    }`
  );

  // Add advice to reversed section
  const reversedPattern = new RegExp(
    `(id: ${id},[\\s\\S]*?reversed: \\{[\\s\\S]*?meaningKo: '[^']*')\\s*\\}`,
    ''
  );
  content = content.replace(
    reversedPattern,
    `$1,\n      advice: '${advice.reversed}',\n      adviceKo: '${advice.reversedKo}'\n    }`
  );
}

// Write the file back
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated all Swords cards (50-63)!');
