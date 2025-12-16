const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'Tarot', 'tarot-data.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Card 1 - The Magician
content = content.replace(
  /(\s+id: 1,\s+name: 'The Magician',\s+nameKo: '마법사',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 1[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Use your skills and resources wisely. You have everything you need to succeed.',\n      adviceKo: '기술과 자원을 현명하게 사용하세요. 성공에 필요한 모든 것을 가지고 있습니다.'`
);
content = content.replace(
  /(id: 1[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Be honest with yourself and others. Reconnect with your true abilities.',\n      adviceKo: '자신과 타인에게 정직하세요. 진정한 능력과 다시 연결하세요.'$2`
);

// Card 2 - The High Priestess
content = content.replace(
  /(\s+id: 2,\s+name: 'The High Priestess',\s+nameKo: '여사제',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 2[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Trust your intuition. Be still and listen to your inner wisdom.',\n      adviceKo: '직관을 믿으세요. 고요히 내면의 지혜에 귀 기울이세요.'`
);
content = content.replace(
  /(id: 2[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Reconnect with your inner voice. Be wary of hidden agendas around you.',\n      adviceKo: '내면의 목소리와 다시 연결하세요. 주변의 숨겨진 의도를 경계하세요.'$2`
);

// Card 3 - The Empress
content = content.replace(
  /(\s+id: 3,\s+name: 'The Empress',\s+nameKo: '여황제',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 3[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Nurture yourself and others. Embrace creativity and connect with nature.',\n      adviceKo: '자신과 타인을 돌보세요. 창의성을 받아들이고 자연과 연결하세요.'`
);
content = content.replace(
  /(id: 3[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Find balance in nurturing. Don\\'t neglect your own creative needs.',\n      adviceKo: '양육의 균형을 찾으세요. 자신의 창조적 필요를 방치하지 마세요.'$2`
);

// Card 4 - The Emperor
content = content.replace(
  /(\s+id: 4,\s+name: 'The Emperor',\s+nameKo: '황제',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 4[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Take charge with clear boundaries. Create structure and lead with wisdom.',\n      adviceKo: '명확한 경계로 책임을 지세요. 구조를 만들고 지혜로 이끄세요.'`
);
content = content.replace(
  /(id: 4[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Examine your relationship with power. Find balance between control and flexibility.',\n      adviceKo: '권력과의 관계를 점검하세요. 통제와 유연성 사이의 균형을 찾으세요.'$2`
);

// Card 5 - The Hierophant
content = content.replace(
  /(\s+id: 5,\s+name: 'The Hierophant',\s+nameKo: '교황',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 5[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Seek wisdom from established traditions. Consider working with a mentor.',\n      adviceKo: '확립된 전통에서 지혜를 구하세요. 멘토와 함께 일하는 것을 고려하세요.'`
);
content = content.replace(
  /(id: 5[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Trust your own spiritual journey. Don\\'t be afraid to question traditions.',\n      adviceKo: '자신만의 영적 여정을 믿으세요. 전통에 의문을 품는 것을 두려워하지 마세요.'$2`
);

// Card 6 - The Lovers
content = content.replace(
  /(\s+id: 6,\s+name: 'The Lovers',\s+nameKo: '연인',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 6[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Follow your heart in matters of love. Align your choices with your values.',\n      adviceKo: '사랑의 문제에서 마음을 따르세요. 선택을 가치관과 일치시키세요.'`
);
content = content.replace(
  /(id: 6[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Examine your values and relationships. Address imbalances honestly.',\n      adviceKo: '가치관과 관계를 점검하세요. 불균형을 정직하게 해결하세요.'$2`
);

// Card 7 - The Chariot
content = content.replace(
  /(\s+id: 7,\s+name: 'The Chariot',\s+nameKo: '전차',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 7[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Stay focused on your goals. Use your willpower to overcome challenges.',\n      adviceKo: '목표에 집중하세요. 의지력을 사용해 도전을 극복하세요.'`
);
content = content.replace(
  /(id: 7[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Regain your focus. Channel your energy constructively, not aggressively.',\n      adviceKo: '집중력을 되찾으세요. 에너지를 공격적이 아닌 건설적으로 사용하세요.'$2`
);

// Card 8 - Strength
content = content.replace(
  /(\s+id: 8,\s+name: 'Strength',\s+nameKo: '힘',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 8[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Lead with compassion, not force. Your inner strength will guide you through.',\n      adviceKo: '힘이 아닌 연민으로 이끄세요. 내면의 힘이 당신을 인도할 것입니다.'`
);
content = content.replace(
  /(id: 8[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Build your inner confidence. Face your fears with gentle courage.',\n      adviceKo: '내면의 자신감을 키우세요. 부드러운 용기로 두려움에 맞서세요.'$2`
);

// Card 9 - The Hermit
content = content.replace(
  /(\s+id: 9,\s+name: 'The Hermit',\s+nameKo: '은둔자',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 9[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Take time for solitude and reflection. The answers you seek are within.',\n      adviceKo: '고독과 성찰의 시간을 가지세요. 찾는 답은 내면에 있습니다.'`
);
content = content.replace(
  /(id: 9[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Balance solitude with connection. Don\\'t isolate yourself too much.',\n      adviceKo: '고독과 연결의 균형을 맞추세요. 너무 고립되지 마세요.'$2`
);

// Card 10 - Wheel of Fortune
content = content.replace(
  /(\s+id: 10,\s+name: 'Wheel of Fortune',\s+nameKo: '운명의 수레바퀴',)/,
  `$1\n    arcana: 'major',\n    suit: 'major',`
);
content = content.replace(
  /(id: 10[\s\S]*?upright: {[\s\S]*?meaningKo: '[^']*')/,
  `$1,\n      advice: 'Embrace change. This is a fortunate turning point in your journey.',\n      adviceKo: '변화를 받아들이세요. 이것은 여정의 행운의 전환점입니다.'`
);
content = content.replace(
  /(id: 10[\s\S]*?reversed: {[\s\S]*?meaningKo: '[^']*')(\s+})/,
  `$1,\n      advice: 'Accept that change is inevitable. Work to break negative cycles.',\n      adviceKo: '변화가 불가피함을 받아들이세요. 부정적 순환을 끊도록 노력하세요.'$2`
);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully updated cards 1-10 with arcana, suit, and advice fields!');
