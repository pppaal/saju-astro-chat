export interface Hexagram {
  number: number;
  binary: string;
  name: string;
  symbol: string;
  judgment: string;
  image: string;
  lines: string[];
}

export const IChingData: Hexagram[] = [
  {
    number: 1,
    binary: '111111',
    name: 'Qian (The Creative)',
    symbol: '䷀',
    judgment: 'Greatly successful. It is favorable to be persevering. The creative power is strong and full.',
    image: 'The image of heaven repeating. The superior man, seeing this, makes himself strong and untiring.',
    lines: [
      'First line: Hidden dragon. Do not act.',
      'Second line: Dragon appearing in the field. It is favorable to see the great man.',
      'Third line: The superior man is creatively active all day, and vigilant in the evening. Danger, but no blame.',
      'Fourth line: Wavering flight over the depths. No blame.',
      'Fifth line: Flying dragon in the heavens. It is favorable to see the great man.',
      'Sixth line: Arrogant dragon. There will be cause for regret.'
    ]
  },
  {
    number: 2,
    binary: '000000',
    name: 'Kun (The Receptive)',
    symbol: '䷁',
    judgment: 'Greatly successful. It is favorable to be persevering like a mare. If the superior man undertakes something and tries to lead, he goes astray; but if he follows, he finds guidance. It is favorable.',
    image: 'The image of the earth layered. The superior man, seeing this, supports all things with his great virtue.',
    lines: [
      'First line: When you tread on hoarfrost, solid ice is not far away.',
      'Second line: Straight, square, great. Without purpose, yet nothing is not favorable.',
      'Third line: Hidden lines. It is favorable to remain persevering. If you serve a king, seek no success, but rather bring the work to a conclusion.',
      'Fourth line: A tied-up sack. No blame, no praise.',
      'Fifth line: A yellow lower garment brings supreme good fortune.',
      'Sixth line: Dragons fight in the meadow. Their blood is black and yellow.'
    ]
  },
  {
    number: 3,
    binary: '010001',
    name: 'Zhun (Difficulty at the Beginning)',
    symbol: '䷂',
    judgment: 'Greatly successful, perseverance is favorable. Do not act recklessly. It is favorable to appoint helpers.',
    image: 'The image of clouds and thunder. The superior man, seeing this, brings order out of confusion.',
    lines: [
      'First line: Hesitation and hindrance. It is favorable to remain persevering and to appoint helpers.',
      'Second line: Difficulty piles up. The horses of the chariot are separated. He is not a robber; he will woo her in due time. The maiden is chaste and does not pledge herself. Ten years, then she pledges herself.',
      'Third line: Whoever hunts deer without a guide only loses his way in the forest. The superior man understands the signs of the time and prefers to desist. To go on brings humiliation.',
      'Fourth line: The horses of the chariot are separated. Seek for union. To go brings good fortune. Everything acts to your advantage.',
      'Fifth line: Difficulties in blessing. Perseverance in small matters brings good fortune. Perseverance in great matters brings misfortune.',
      'Sixth line: The horses of the chariot are separated. Bloody tears flow.'
    ]
  },
  {
    number: 4,
    binary: '100010',
    name: 'Meng (Youthful Folly)',
    symbol: '䷃',
    judgment: 'Success. It is not I who seek the young fool; the young fool seeks me. At the first oracle, I inform him. If he asks two or three times, it is disrespect. If he is disrespectful, I do not inform him. Perseverance is favorable.',
    image: 'A spring issuing from beneath a mountain. The superior man, seeing this, fosters his character by thoroughness in all that he does.',
    lines: [
      'First line: To enlighten the foolish, it is favorable to use restraints to free people, and to remove fetters. To go on in this way brings humiliation.',
      'Second line: To bear with fools in kindness brings good fortune. To know how to take a wife brings good fortune. The son is capable of taking charge of the household.',
      'Third line: Do not take this woman. She sees a man of bronze and loses her self-control. Nothing is favorable.',
      'Fourth line: Entangled in folly brings humiliation.',
      'Fifth line: The folly of a child brings good fortune.',
      'Sixth line: Punishing folly is not favorable. It is favorable to prevent folly.'
    ]
  },
  {
    number: 5,
    binary: '010111',
    name: 'Xu (Waiting)',
    symbol: '䷄',
    judgment: 'If you are sincere, you have light and success. Perseverance brings good fortune. It is favorable to cross the great water.',
    image: 'Clouds rise up to the heavens. The superior man, seeing this, eats and drinks and is of good cheer.',
    lines: [
      'First line: Waiting in the meadow. It is favorable to remain in what is lasting. No blame.',
      'Second line: Waiting on the sand. There is some gossip. The end comes to good fortune.',
      'Third line: Waiting in the mud causes the arrival of the enemy.',
      'Fourth line: Waiting in blood. Get out of the pit.',
      'Fifth line: Waiting with food and wine. Perseverance brings good fortune.',
      'Sixth line: One enters the pit. Three uninvited guests arrive. Honor them, and in the end there will be good fortune.'
    ]
  },
  {
    number: 6,
    binary: '111010',
    name: 'Song (Conflict)',
    symbol: '䷅',
    judgment: 'Sincerity is obstructed. Be cautious and centered to find good fortune. Pushing to the end brings misfortune. It is favorable to see the great man. It is not favorable to cross the great water.',
    image: 'Heaven and water go in opposite directions. The superior man, seeing this, carefully considers the beginning of all undertakings.',
    lines: [
      'First line: If one does not perpetuate the conflict, there is a little gossip. In the end, good fortune comes.',
      'Second line: One cannot win the conflict. One returns home and hides. The people of his town, three hundred households, will be without blame.',
      'Third line: To remain in one\'s old virtue brings good fortune through perseverance, though there may be danger. If you follow the king\'s business, you will achieve nothing.',
      'Fourth line: One cannot win the conflict. One returns and submits to fate, changes one\'s attitude, and finds peace in perseverance. Good fortune.',
      'Fifth line: To win the conflict brings great good fortune.',
      'Sixth line: Even if one is awarded a grand leather belt, by the end of the morning it will be snatched away three times.'
    ]
  },
  {
    number: 7,
    binary: '000010',
    name: 'Shi (The Army)',
    symbol: '䷆',
    judgment: 'Perseverance is favorable. An experienced elder is needed. Good fortune, no blame.',
    image: 'Water is in the middle of the earth. The superior man, seeing this, tolerates and nurtures the people.',
    lines: [
      'First line: An army must set out in proper order. If not, misfortune threatens.',
      'Second line: In the midst of the army. Good fortune, no blame. The king bestows a triple decoration.',
      'Third line: The army may have to carry corpses in the wagon. Misfortune.',
      'Fourth line: The army retreats to the left. No blame.',
      'Fifth line: There is game in the field. It is favorable to handle words well. No blame. Let the eldest lead the army. Let the younger carry the corpses. Then perseverance brings misfortune.',
      'Sixth line: The great prince issues commands, founds states, and supports families. Small people should not be used.'
    ]
  },
  {
    number: 8,
    binary: '010000',
    name: 'Bi (Holding Together)',
    symbol: '䷇',
    judgment: 'Good fortune. Inquire of the oracle once more whether you have sublimity, constancy, and perseverance; then there is no blame. The restless gather. Whoever comes too late meets with misfortune.',
    image: 'On the earth is water. The ancient kings, seeing this, established the various states and maintained friendly relations with the feudal lords.',
    lines: [
      'First line: Hold together with sincerity. No blame. If sincerity is like a full earthen vessel, other good fortune will eventually come.',
      'Second line: Hold together from within. Perseverance brings good fortune.',
      'Third line: You hold together with the wrong people.',
      'Fourth line: Hold together with a wise person on the outside. Perseverance brings good fortune.',
      'Fifth line: Holding together openly. When the king hunts, he uses beaters on only three sides and forgoes the game that runs off in front. The citizens need no warning. Good fortune.',
      'Sixth line: Holding together without a leader brings misfortune.'
    ]
  },
  {
    number: 9,
    binary: '110111',
    name: 'Xiao Chu (The Taming Power of the Small)',
    symbol: '䷈',
    judgment: 'Success. Dense clouds, no rain from our western region.',
    image: 'The wind drives over heaven. The superior man, seeing this, refines the outward aspect of his nature.',
    lines: [
      'First line: Return to the way. How could there be blame in this? Good fortune.',
      'Second line: He is led to return. Good fortune.',
      'Third line: The spokes of the wagon wheel break. Husband and wife look at each other with angry eyes.',
      'Fourth line: If you are sincere, blood vanishes and fear gives way. No blame.',
      'Fifth line: If you are sincere and loyally attached, you are rich in your neighbor.',
      'Sixth line: The rain comes, the resting place is reached. This is due to the lasting effect of character. Perseverance brings the woman into danger. The moon is nearly full. If the superior man persists, misfortune comes.'
    ]
  },
  {
    number: 10,
    binary: '111011',
    name: 'Lu (Treading)',
    symbol: '䷉',
    judgment: 'Treading on the tail of the tiger. It does not bite the man. Success.',
    image: 'Heaven above, the lake below. The superior man, seeing this, discriminates between high and low, and so stabilizes the sentiments of the people.',
    lines: [
      'First line: Simple conduct. Progress without blame.',
      'Second line: Treading a smooth, level path. The perseverance of a dark man brings good fortune.',
      'Third line: A one-eyed man can see, a lame man can tread. He treads on the tail of the tiger. The tiger bites the man. Misfortune. Thus does a warrior act on behalf of his great prince.',
      'Fourth line: He treads on the tail of the tiger. Caution and circumspection lead ultimately to good fortune.',
      'Fifth line: Resolute conduct. Perseverance with awareness of danger.',
      'Sixth line: Look to your conduct and weigh the favorable signs. When everything is fulfilled, supreme good fortune comes.'
    ]
  },
  {
    number: 11,
    binary: '000111',
    name: 'Tai (Peace)',
    symbol: '䷊',
    judgment: 'The small departs, the great approaches. Good fortune. Success.',
    image: 'Heaven and earth unite. The ruler, seeing this, fashions and completes the Tao of heaven and earth, and assists the people.',
    lines: [
      'First line: When ribbon grass is pulled up, the sod comes with it. Each according to his kind. Undertakings bring good fortune.',
      'Second line: Bearing with the uncultured in gentleness, fording the river with resolution, not neglecting what is distant, not regarding one\'s companions, one may thus walk in the middle.',
      'Third line: No plain not followed by a slope. No going not followed by a return. He who remains persevering in danger is without blame. Do not complain about this truth; enjoy the good fortune you still possess.',
      'Fourth line: He flutters down, not boasting of his wealth, together with his neighbor, guileless and sincere.',
      'Fifth line: The sovereign I gives his daughter in marriage. This brings blessing and supreme good fortune.',
      'Sixth line: The wall falls back into the moat. Use no army now. Make your commands known within your own town. Perseverance brings humiliation.'
    ]
  },
  {
    number: 12,
    binary: '111000',
    name: 'Pi (Standstill)',
    symbol: '䷋',
    judgment: 'It is not a human being. It does not further the perseverance of the superior man. The great departs; the small approaches.',
    image: 'Heaven and earth do not unite. The superior man, seeing this, withdraws into his inner worth in order to escape the difficulties. He does not permit himself to be honored with revenue.',
    lines: [
      'First line: When ribbon grass is pulled up, the sod comes with it. Each according to his kind. Perseverance brings good fortune and success.',
      'Second line: They bear and endure; this means good fortune for small men. The great man, through the standstill, attains success.',
      'Third line: They bear shame.',
      'Fourth line: He who acts at the command of the highest remains without blame. Those of like mind partake of the blessing.',
      'Fifth line: Standstill is giving way. Good fortune for the great man. "What if it should fail, what if it should fail?" In this way he ties it to a cluster of mulberry shoots.',
      'Sixth line: The standstill is giving way. First standstill, then good fortune.'
    ]
  },
  {
    number: 13,
    binary: '111101',
    name: 'Tong Ren (Fellowship with Men)',
    symbol: '䷌',
    judgment: 'Fellowship with men in the open. Success. It is favorable to cross the great water. The perseverance of the superior man is favorable.',
    image: 'Heaven together with fire. The superior man, seeing this, organizes the clans and distinguishes things.',
    lines: [
      'First line: Fellowship with men at the gate. No blame.',
      'Second line: Fellowship with men in the clan. Humiliation.',
      'Third line: He hides weapons in the thicket; he climbs the high hill in front of it. For three years he does not rise up.',
      'Fourth line: He climbs up on his wall; he cannot attack. Good fortune.',
      'Fifth line: Men bound in fellowship first weep and lament, but afterward they laugh. After great struggles they succeed in meeting.',
      'Sixth line: Fellowship with men in the meadow. No remorse.'
    ]
  },
  {
    number: 14,
    binary: '101111',
    name: 'Da You (Possession in Great Measure)',
    symbol: '䷍',
    judgment: 'Supreme success.',
    image: 'Fire in heaven above. The superior man, seeing this, curbs evil and furthers good, and thereby obeys the benevolent will of heaven.',
    lines: [
      'First line: No relationship with what is harmful. There is no blame in this. If one remains conscious of difficulty, one remains without blame.',
      'Second line: A big wagon for loading. One may undertake something. No blame.',
      'Third line: A prince offers it to the Son of Heaven. A small man cannot do this.',
      'Fourth line: He makes a difference between himself and his neighbor. No blame.',
      'Fifth line: He whose truth is accessible, yet dignified, has good fortune.',
      'Sixth line: He is blessed by heaven. Good fortune. Nothing that does not further.'
    ]
  },
  {
    number: 15,
    binary: '000100',
    name: 'Qian (Modesty)',
    symbol: '䷎',
    judgment: 'Success. The superior man carries things through.',
    image: 'Within the earth, a mountain. The superior man, seeing this, reduces that which is too much, and augments that which is too little. He weighs things and makes them equal.',
    lines: [
      'First line: A modest, modest superior man may cross the great water. Good fortune.',
      'Second line: Modesty that comes to expression. Perseverance brings good fortune.',
      'Third line: A meritorious, modest superior man has a good end. Good fortune.',
      'Fourth line: Nothing that would not be favorable for modesty in movement.',
      'Fifth line: Not boasting of one\'s riches in front of one\'s neighbor. It is favorable to attack with force. Nothing that would not be favorable.',
      'Sixth line: Modesty that comes to expression. It is favorable to set armies marching to chastise one\'s own city and one\'s country.'
    ]
  },
  {
    number: 16,
    binary: '001000',
    name: 'Yu (Enthusiasm)',
    symbol: '䷏',
    judgment: 'It is favorable to install helpers and to set armies marching.',
    image: 'Thunder comes resounding out of the earth. The ancient kings, seeing this, made music in order to honor merit, and offered it with splendor to the Supreme Deity, inviting their ancestors to be present.',
    lines: [
      'First line: Enthusiasm that expresses itself brings misfortune.',
      'Second line: Firm as a rock. Not a whole day. Perseverance brings good fortune.',
      'Third line: Enthusiasm that looks upward brings remorse. Hesitation brings remorse.',
      'Fourth line: The source of enthusiasm. He achieves great things. Do not doubt. You gather friends around you as a hair clasp gathers the hair.',
      'Fifth line: Persistently ill, and still does not die. Perseverance despite danger.',
      'Sixth line: Deluded enthusiasm. But if one changes, there is no blame.'
    ]
  },
  {
    number: 17,
    binary: '011001',
    name: 'Sui (Following)',
    symbol: '䷐',
    judgment: 'Supreme success. Perseverance is favorable. No blame.',
    image: 'Thunder in the middle of the lake. The superior man, seeing this, at nightfall goes indoors for rest and recuperation.',
    lines: [
      'First line: The standard is changing. Perseverance brings good fortune. To go out of the door in fellowship brings achievement.',
      'Second line: If one clings to the little boy, one loses the strong man.',
      'Third line: If one clings to the strong man, one loses the little boy. Through following one finds what one seeks. It is favorable to remain persevering.',
      'Fourth line: Following creates success. Perseverance brings misfortune. To be sincere in the way brings clarity. How could there be blame in this?',
      'Fifth line: Sincere in the good. Good fortune.',
      'Sixth line: He is caught in firm bonds and followed. The king introduces him to the Western Mountain.'
    ]
  },
  {
    number: 18,
    binary: '100110',
    name: 'Gu (Work on What Has Been Spoiled)',
    symbol: '䷑',
    judgment: 'Supreme success. It is favorable to cross the great water. Before the starting point, three days. After the starting point, three days.',
    image: 'The wind blows low on the mountain. The superior man, seeing this, rouses the people and strengthens their virtue.',
    lines: [
      'First line: Setting right what has been spoiled by the father. If there is a son, no blame rests on the departed father. Danger. In the end good fortune.',
      'Second line: Setting right what has been spoiled by the mother. One must not be too persevering.',
      'Third line: Setting right what has been spoiled by the father. There will be a little remorse. No great blame.',
      'Fourth line: Tolerating what has been spoiled by the father. In continuing one sees humiliation.',
      'Fifth line: Setting right what has been spoiled by the father. One meets with praise.',
      'Sixth line: He does not serve kings and princes, sets himself higher goals.'
    ]
  },
  {
    number: 19,
    binary: '000011',
    name: 'Lin (Approach)',
    symbol: '䷒',
    judgment: 'Supreme success. Perseverance is favorable. When the eighth month comes, there will be misfortune.',
    image: 'The lake on the earth. The superior man, seeing this, has an inexhaustible will to teach, and endlessly tolerates and protects the people.',
    lines: [
      'First line: Joint approach. Perseverance brings good fortune.',
      'Second line: Joint approach. Good fortune. Everything is favorable.',
      'Third line: Comfortable approach. Nothing is favorable. If one becomes concerned about it, there is no blame.',
      'Fourth line: Complete approach. No blame.',
      'Fifth line: Wise approach. This is the way of a great prince. Good fortune.',
      'Sixth line: Magnanimous approach. Good fortune. No blame.'
    ]
  },
  {
    number: 20,
    binary: '110000',
    name: 'Guan (Contemplation)',
    symbol: '䷓',
    judgment: 'The ablution has been made, but not yet the offering. Full of trust they look up to him.',
    image: 'The wind blows over the earth. The ancient kings, seeing this, inspected the four quarters of the world, contemplated the people, and gave them instruction.',
    lines: [
      'First line: Boy-like contemplation. For a man of inferior position, no blame. For a superior man, humiliation.',
      'Second line: Contemplation through the crack of the door. Favorable for the perseverance of a woman.',
      'Third line: Contemplation of my life decides the choice between advance and retreat.',
      'Fourth line: Contemplation of the light of the kingdom. It is favorable to be the guest of a king.',
      'Fifth line: Contemplation of my life. A superior man is without blame.',
      'Sixth line: Contemplation of his life. A superior man is without blame.'
    ]
  },
  {
    number: 21,
    binary: '101001',
    name: 'Shi He (Biting Through)',
    symbol: '䷔',
    judgment: 'Success. It is favorable to make use of legal proceedings.',
    image: 'Thunder and lightning. The ancient kings, seeing this, made the penalties clear and the laws plain.',
    lines: [
      'First line: His feet are fastened in the stocks, so that his toes disappear. No blame.',
      'Second line: Bites through tender meat, so that his nose disappears. No blame.',
      'Third line: Bites on old dried meat and hits on something poisonous. Slight humiliation. No blame.',
      'Fourth line: Bites on dried gristly meat. Receives metal arrows. It is favorable to be mindful of difficulties and to be persevering. Good fortune.',
      'Fifth line: Bites on dried lean meat. Receives yellow gold. Perseveringly aware of danger. No blame.',
      'Sixth line: His neck is fastened in the wooden cangue, so that his ears disappear. Misfortune.'
    ]
  },
  {
    number: 22,
    binary: '100101',
    name: 'Bi (Grace)',
    symbol: '䷕',
    judgment: 'Success. In small matters it is favorable to undertake something.',
    image: 'Fire at the foot of the mountain. The superior man, seeing this, clarifies the business of the day but does not dare to decide controversial issues.',
    lines: [
      'First line: He lends grace to his toes, leaves the carriage, and walks.',
      'Second line: He lends grace to the beard on his chin.',
      'Third line: Graceful and moist. Eternal perseverance brings good fortune.',
      'Fourth line: Grace or simplicity? A white horse comes as if on wings. He is not a robber, he will woo in due time.',
      'Fifth line: Grace in the hills and gardens. The roll of silk is meager and small. Humiliation, but in the end good fortune.',
      'Sixth line: Simple grace. No blame.'
    ]
  },
  {
    number: 23,
    binary: '100000',
    name: 'Bo (Splitting Apart)',
    symbol: '䷖',
    judgment: 'It is not favorable to go anywhere.',
    image: 'The mountain rests on the earth. The men of high rank, seeing this, can secure their position only by giving generously to those below.',
    lines: [
      'First line: The leg of the bed is split. Those who persevere are destroyed. Misfortune.',
      'Second line: The bed is split at the edge. Those who persevere are destroyed. Misfortune.',
      'Third line: He splits with them. No blame.',
      'Fourth line: The bed is split up to the skin. Misfortune.',
      'Fifth line: A shoal of fishes. Favor comes through the court ladies. Everything is favorable.',
      'Sixth line: The great fruit is uneaten. The superior man receives a carriage. The house of the small man is split apart.'
    ]
  },
  {
    number: 24,
    binary: '000001',
    name: 'Fu (Return)',
    symbol: '䷗',
    judgment: 'Success. Going out and coming in without error. Friends come without blame. To and fro goes the way. On the seventh day comes return. It is favorable to have somewhere to go.',
    image: 'Thunder within the earth. The ancient kings, seeing this, closed the passes at the time of solstice. Merchants and strangers did not go about, and the ruler did not travel through the provinces.',
    lines: [
      'First line: Return from a short distance. No need for remorse. Great good fortune.',
      'Second line: Quiet return. Good fortune.',
      'Third line: Repeated return. Danger. No blame.',
      'Fourth line: Walking in the midst of others, one returns alone.',
      'Fifth line: Noble-hearted return. No remorse.',
      'Sixth line: Missing the return. Misfortune. Misfortune from within and without. If armies are set marching in this way, one will in the end suffer a great defeat, disastrous for the ruler of the country. For ten years it will not be possible to attack again.'
    ]
  },
  {
    number: 25,
    binary: '111001',
    name: 'Wu Wang (Innocence)',
    symbol: '䷘',
    judgment: 'Supreme success. Perseverance is favorable. If someone is not as he should be, he has misfortune, and it does not further him to undertake anything.',
    image: 'Under heaven thunder rolls. All things attain the natural state of innocence. The ancient kings, seeing this, made regulations in harmony with the seasons and nourished all beings.',
    lines: [
      'First line: Innocent behavior brings good fortune.',
      'Second line: If one does not count on the harvest while plowing, nor on the use of the ground while clearing it, it is favorable to undertake something.',
      'Third line: Undeserved misfortune. The cow that was tethered by someone is the wanderer\'s gain, the citizen\'s loss.',
      'Fourth line: He who can be persevering remains without blame.',
      'Fifth line: Use no medicine in an illness incurred through no fault of your own. It will pass away of itself.',
      'Sixth line: Innocent action brings misfortune. Nothing is favorable.'
    ]
  },
  {
    number: 26,
    binary: '100111',
    name: 'Da Chu (The Taming Power of the Great)',
    symbol: '䷙',
    judgment: 'Perseverance is favorable. Not eating at home brings good fortune. It is favorable to cross the great water.',
    image: 'Heaven within the mountain. The superior man, seeing this, stores up in his mind the words and deeds of former times, in order to strengthen his character.',
    lines: [
      'First line: Danger is at hand. It is favorable to desist.',
      'Second line: The axles are taken from the wagon.',
      'Third line: A good horse that follows others. Awareness of danger, with perseverance, is favorable. Practice chariot driving and armed defense daily. It is favorable to have somewhere to go.',
      'Fourth line: The headboard of a young bull. Great good fortune.',
      'Fifth line: The tusk of a gelded boar. Good fortune.',
      'Sixth line: One attains the way of heaven. Success.'
    ]
  },
  {
    number: 27,
    binary: '100001',
    name: 'Yi (Corners of the Mouth)',
    symbol: '䷚',
    judgment: 'Perseverance brings good fortune. Pay attention to the providing of nourishment and to what a man seeks to fill his own mouth with.',
    image: 'At the foot of the mountain, thunder. The superior man, seeing this, is careful of his words and temperate in eating and drinking.',
    lines: [
      'First line: You let your magic tortoise go and look at me with the corners of your mouth drooping. Misfortune.',
      'Second line: Turning away from the path to seek nourishment from the hill. Continuing to do so brings misfortune.',
      'Third line: Turning away from nourishment. Perseverance brings misfortune. For ten years do not act. Nothing is favorable.',
      'Fourth line: Turning to the summit for nourishment brings good fortune. Spying about with sharp eyes like a tiger with an insatiable appetite. No blame.',
      'Fifth line: Turning away from the path. To remain persevering brings good fortune. One should not cross the great water.',
      'Sixth line: The source of nourishment. Awareness of danger brings good fortune. It is favorable to cross the great water.'
    ]
  },
  {
    number: 28,
    binary: '011110',
    name: 'Da Guo (Preponderance of the Great)',
    symbol: '䷛',
    judgment: 'The ridgepole sags to the breaking point. It is favorable to have somewhere to go. Success.',
    image: 'The lake rises above the trees. The superior man, seeing this, stands alone without fear and is withdrawn from the world without regret.',
    lines: [
      'First line: To place the matter on white rushes. No blame.',
      'Second line: A dry poplar sprouts at the root. An older man takes a young wife. Everything is favorable.',
      'Third line: The ridgepole sags to the breaking point. Misfortune.',
      'Fourth line: The ridgepole is braced. Good fortune. If there are other motives, it is humiliating.',
      'Fifth line: A withered poplar puts forth flowers. An older woman takes a husband. No blame, no praise.',
      'Sixth line: One must go through the water. It goes over one\'s head. Misfortune. No blame.'
    ]
  },
  {
    number: 29,
    binary: '010010',
    name: 'Kan (The Abysmal)',
    symbol: '䷜',
    judgment: 'If you are sincere, you have success in your heart, and whatever you do succeeds.',
    image: 'Water flows on uninterruptedly. The superior man, seeing this, walks in lasting virtue and practices the work of instruction.',
    lines: [
      'First line: Repetition of the abysmal. In the abyss one falls into a pit. Misfortune.',
      'Second line: The abyss is dangerous. One should strive to attain small things only.',
      'Third line: Forward and backward, abyss on abyss. In danger like this, pause at first and wait, otherwise you will fall into a pit in the abyss. Do not act.',
      'Fourth line: A jug of wine, a bowl of rice with it; earthen vessels simply passed through the window. There is certainly no blame in this.',
      'Fifth line: The abyss is not filled to overflowing, it is filled only to the rim. No blame.',
      'Sixth line: Bound with black cords, penned in between thorn-covered prison walls. For three years one does not find the way. Misfortune.'
    ]
  },
  {
    number: 30,
    binary: '101101',
    name: 'Li (The Clinging, Fire)',
    symbol: '䷝',
    judgment: 'Perseverance is favorable. It brings success. To take care of the cow brings good fortune.',
    image: 'Brightness repeated. The great man, seeing this, continues the brightness and illuminates the four quarters of the world.',
    lines: [
      'First line: The footprints run crisscross. If one is seriously intent, no blame.',
      'Second line: Yellow light. Supreme good fortune.',
      'Third line: In the light of the setting sun, men either beat the pot and sing or loudly bewail the approach of old age. Misfortune.',
      'Fourth line: Its coming is sudden; it flames up, dies down, is thrown away.',
      'Fifth line: Tears in floods, sighing and lamenting. Good fortune.',
      'Sixth line: The king uses him to march forth and chastise. Then it is best to kill the leaders and take captive the followers. No blame.'
    ]
  },
  {
    number: 31,
    binary: '011100',
    name: 'Xian (Influence)',
    symbol: '䷞',
    judgment: 'Success. Perseverance is favorable. To take a maiden to wife brings good fortune.',
    image: 'A lake on the mountain. The superior man, seeing this, encourages people to approach him by his readiness to receive them.',
    lines: [
      'First line: The influence shows itself in the big toe.',
      'Second line: The influence shows itself in the calves of the legs. Misfortune. Tarrying brings good fortune.',
      'Third line: The influence shows itself in the thighs. Holds to that which follows it. To continue is humiliating.',
      'Fourth line: Perseverance brings good fortune. Remorse disappears. If a man is agitated in his mind, and his thoughts go hither and thither, only those friends on whom he fixes his conscious thoughts will follow.',
      'Fifth line: The influence shows itself in the back of the neck. No remorse.',
      'Sixth line: The influence shows itself in the jaws, cheeks, and tongue.'
    ]
  },
  {
    number: 32,
    binary: '001110',
    name: 'Heng (Duration)',
    symbol: '䷟',
    judgment: 'Success. No blame. Perseverance is favorable. It is favorable to have somewhere to go.',
    image: 'Thunder and wind. The superior man, seeing this, stands firm and does not change his direction.',
    lines: [
      'First line: Seeking duration too hastily brings misfortune persistently. Nothing that would be favorable.',
      'Second line: Remorse disappears.',
      'Third line: He who does not give duration to his character meets with disgrace. Persistent humiliation.',
      'Fourth line: No game in the field.',
      'Fifth line: Giving duration to one\'s character through perseverance. This is good fortune for a woman, misfortune for a man.',
      'Sixth line: Restlessness as an lasting condition brings misfortune.'
    ]
  },
  {
    number: 33,
    binary: '111100',
    name: 'Dun (Retreat)',
    symbol: '䷠',
    judgment: 'Success. In what is small, perseverance is favorable.',
    image: 'Mountain under heaven. The superior man, seeing this, keeps the small man at a distance, not in anger but with reserve.',
    lines: [
      'First line: Retreat at the tail. This is dangerous. One must not wish to undertake anything.',
      'Second line: He holds him fast with yellow ox hide. No one can tear him loose.',
      'Third line: A halted retreat is nerve-wracking and dangerous. To retain people as men- and maidservants brings good fortune.',
      'Fourth line: Voluntary retreat brings good fortune to the superior man and downfall to the small man.',
      'Fifth line: Friendly retreat. Perseverance brings good fortune.',
      'Sixth line: Cheerful retreat. Everything is favorable.'
    ]
  },
  {
    number: 34,
    binary: '001111',
    name: 'Da Zhuang (The Power of the Great)',
    symbol: '䷡',
    judgment: 'Perseverance is favorable.',
    image: 'Thunder in heaven above. The superior man, seeing this, does not tread on paths that do not accord with order.',
    lines: [
      'First line: Power in the toes. Continuing brings misfortune. This is certainly true.',
      'Second line: Perseverance brings good fortune.',
      'Third line: The small man uses power. The superior man does not use it. Perseverance is dangerous. A goat butts against a hedge and gets its horns entangled.',
      'Fourth line: Perseverance brings good fortune. Remorse disappears. The hedge opens; there is no entanglement. Power depends upon the axle of a big cart.',
      'Fifth line: Loses the goat with ease. No remorse.',
      'Sixth line: A goat butts against a hedge. It can neither retreat nor advance. Nothing is favorable. If one notes the difficulty, this brings good fortune.'
    ]
  },
  {
    number: 35,
    binary: '101000',
    name: 'Jin (Progress)',
    symbol: '䷢',
    judgment: 'The powerful prince is honored with horses in large numbers. In a single day he is granted audience three times.',
    image: 'The sun rises over the earth. The superior man, seeing this, himself brightens his bright virtue.',
    lines: [
      'First line: Progressing, but turned back. Perseverance brings good fortune. If one meets with no confidence, one should remain calm. No blame.',
      'Second line: Progressing, but in sorrow. Perseverance brings good fortune. Then one receives great happiness from one\'s ancestress.',
      'Third line: All are in accord. Remorse disappears.',
      'Fourth line: Progress like a hamster. Perseverance brings danger.',
      'Fifth line: Remorse disappears. Take not to heart gain and loss. Undertakings bring good fortune. Everything is favorable.',
      'Sixth line: Making progress with the horns. One is reduced to punishing one\'s own city. To be conscious of the danger brings good fortune. No blame. Perseverance brings humiliation.'
    ]
  },
  {
    number: 36,
    binary: '000101',
    name: 'Ming Yi (Darkening of the Light)',
    symbol: '䷣',
    judgment: 'It is favorable to be persevering in adversity.',
    image: 'The light has sunk into the earth. The superior man, seeing this, walks with the great multitude, hiding his light, yet remaining bright.',
    lines: [
      'First line: Darkening of the light during flight. He lowers his wings. The superior man is on a journey and for three days has nothing to eat. He has a place to go. The host has occasion to gossip about him.',
      'Second line: Darkening of the light, injured in the left thigh. He is saved by a strong horse. Good fortune.',
      'Third line: Darkening of the light during the hunt in the south. Their great leader is captured. One must not expect perseverance too soon.',
      'Fourth line: He penetrates into the left side of the belly. One gets at the heart of the darkening of the light, and leaves the gate and courtyard.',
      'Fifth line: Darkening of the light as with Prince Chi. Perseverance is favorable.',
      'Sixth line: Not light but darkness. First he climbed up to heaven, then he plunged into the depths of the earth.'
    ]
  },
  {
    number: 37,
    binary: '110101',
    name: 'Jia Ren (The Family)',
    symbol: '䷤',
    judgment: 'The perseverance of the woman is favorable.',
    image: 'Wind comes forth from fire. The superior man, seeing this, has substance in his words and duration in his way of life.',
    lines: [
      'First line: Firm seclusion within the family. Remorse disappears.',
      'Second line: She should not follow her whims. She must attend to the food. Perseverance brings good fortune.',
      'Third line: When tempers flare up in the family, too great severity brings remorse. Yet good fortune. When woman and child dally and laugh, it leads in the end to humiliation.',
      'Fourth line: She is the treasure of the house. Great good fortune.',
      'Fifth line: As a king he approaches his family. Fear not. Good fortune.',
      'Sixth line: His work commands respect. In the end good fortune comes.'
    ]
  },
  {
    number: 38,
    binary: '101011',
    name: 'Kui (Opposition)',
    symbol: '䷥',
    judgment: 'In small matters, good fortune.',
    image: 'Fire above, the lake below. The superior man, seeing this, in all his transactions, although he is in company, retains his individuality.',
    lines: [
      'First line: Remorse disappears. If you lose your horse, do not run after it; it will come back of its own accord. When you see evil people, avoid them. No blame.',
      'Second line: One meets one\'s lord in a narrow street. No blame.',
      'Third line: One sees the wagon dragged back, the oxen halted, a man\'s hair and nose cut off. Not a good beginning, but a good end.',
      'Fourth line: Isolated through opposition, one meets a like-minded man with whom one can associate in good faith. Despite the danger, no blame.',
      'Fifth line: Remorse disappears. The companion bites his way through the wrappings. If one goes to him, how could it be a mistake?',
      'Sixth line: Isolated through opposition, one sees one\'s companion as a pig covered with dirt, as a wagon full of devils. First one draws a bow against him, then one lays the bow aside. He is not a robber; he will woo at the right time. As one goes, rain falls; then good fortune comes.'
    ]
  },
  {
    number: 39,
    binary: '010100',
    name: 'Jian (Obstruction)',
    symbol: '䷦',
    judgment: 'The southwest is favorable. The northeast is not. It is favorable to see the great man. Perseverance brings good fortune.',
    image: 'Water on the mountain. The superior man, seeing this, turns his attention to himself and molds his character.',
    lines: [
      'First line: Going leads to obstructions, coming meets with praise.',
      'Second line: The king\'s servant is beset by obstruction upon obstruction, but it is not his own fault.',
      'Third line: Going leads to obstructions; hence he comes back.',
      'Fourth line: Going leads to obstructions, coming leads to union.',
      'Fifth line: In the midst of the greatest obstructions, friends come.',
      'Sixth line: Going leads to obstructions, coming leads to great things. Good fortune. It is favorable to see the great man.'
    ]
  },
  {
    number: 40,
    binary: '001010',
    name: 'Xie (Deliverance)',
    symbol: '䷧',
    judgment: 'The southwest is favorable. If there is no longer anything where one has to go, return brings good fortune. If there is still something where one has to go, hastening brings good fortune.',
    image: 'Thunder and rain set in. The superior man, seeing this, pardons errors and forgives misdeeds.',
    lines: [
      'First line: Without blame.',
      'Second line: One kills three foxes in the field and receives a yellow arrow. Perseverance brings good fortune.',
      'Third line: If a man carries a burden on his back and nevertheless rides in a carriage, he thereby encourages robbers to draw near. Perseverance brings humiliation.',
      'Fourth line: Deliver yourself from your big toe. Then the companion comes, and him you can trust.',
      'Fifth line: If only the superior man can deliver himself, it brings good fortune. He proves to small men that he is in earnest.',
      'Sixth line: The prince shoots at a hawk on a high wall. He kills it. Everything is favorable.'
    ]
  },
  {
    number: 41,
    binary: '100011',
    name: 'Sun (Decrease)',
    symbol: '䷨',
    judgment: 'Sincerity brings supreme good fortune, without blame. One may be persevering in this. It is favorable to undertake something. How is this to be carried out? One may use two small bowls for the sacrifice.',
    image: 'At the foot of the mountain, the lake. The superior man, seeing this, represses his anger and restrains his instincts.',
    lines: [
      'First line: Going quickly when one\'s tasks are finished is without blame. Consider how much one may decrease others.',
      'Second line: Perseverance is favorable. To undertake something brings misfortune. Without decreasing oneself, one is able to bring increase to others.',
      'Third line: When three people journey together, their number decreases by one. When one man journeys alone, he finds a companion.',
      'Fourth line: If a man decreases his faults, it makes the other hasten to rejoice. No blame.',
      'Fifth line: Someone increases him. Ten pairs of tortoises cannot oppose it. Supreme good fortune.',
      'Sixth line: If one increases others without decreasing oneself, there is no blame. Perseverance brings good fortune. It is favorable to undertake something. One obtains servants, but no longer has a separate home.'
    ]
  },
  {
    number: 42,
    binary: '110001',
    name: 'Yi (Increase)',
    symbol: '䷩',
    judgment: 'It is favorable to undertake something. It is favorable to cross the great water.',
    image: 'Wind and thunder. The superior man, seeing this, if he sees good, he imitates it; if he has faults, he rids himself of them.',
    lines: [
      'First line: It is favorable to perform great deeds. Supreme good fortune. No blame.',
      'Second line: Someone increases him. Ten pairs of tortoises cannot oppose it. Constant perseverance brings good fortune. The king presents him before God. Good fortune.',
      'Third line: One is enriched through unfortunate events. No blame, if you are sincere and walk in the middle, and report to the prince with a seal.',
      'Fourth line: If you walk in the middle and report to the prince, he will follow. It is favorable to be used in the removal of the capital.',
      'Fifth line: If you are sincere in heart, do not ask. Supreme good fortune. Sincerity is wealth to my virtue.',
      'Sixth line: He brings increase to no one. Indeed, someone strikes him. He does not keep his heart constantly steady. Misfortune.'
    ]
  },
  {
    number: 43,
    binary: '011111',
    name: 'Guai (Breakthrough)',
    symbol: '䷪',
    judgment: 'One must resolutely make the matter known at the court of the king. It must be announced in truth. Danger. It is necessary to notify one\'s own city. It is not favorable to resort to arms. It is favorable to undertake something.',
    image: 'The lake has risen up to heaven. The superior man, seeing this, bestows wealth on those below and refrains from resting on his virtue.',
    lines: [
      'First line: Mighty in the forward-striding toes. When one goes and is not equal to the task, one makes a mistake.',
      'Second line: A cry of alarm. Arms at evening and at night. Fear nothing.',
      'Third line: To be powerful in the cheekbones brings misfortune. The superior man is firmly resolved. He walks alone and is caught in the rain. He is bespattered, and people murmur against him. No blame.',
      'Fourth line: There is no skin on his thighs, and walking is difficult. If one lets oneself be led like a sheep, remorse disappears. But if these words are heard, they will not be believed.',
      'Fifth line: In dealing with weeds, one must be firmly resolved. Walking in the middle remains without blame.',
      'Sixth line: No cry. In the end misfortune comes.'
    ]
  },
  {
    number: 44,
    binary: '111110',
    name: 'Gou (Coming to Meet)',
    symbol: '䷫',
    judgment: 'The maiden is powerful. One should not marry such a maiden.',
    image: 'Under heaven, wind. The prince, seeing this, issues his commands and proclaims them to the four quarters of heaven.',
    lines: [
      'First line: It must be checked with a brake of bronze. Perseverance brings good fortune. If one lets it take its course, one experiences misfortune. Even a lean pig has it in him to rage.',
      'Second line: There is a fish in the tank. No blame. Does not further guests.',
      'Third line: There is no skin on his thighs, and walking is difficult. If one is mindful of the danger, no great mistake is made.',
      'Fourth line: No fish in the tank. This leads to misfortune.',
      'Fifth line: A melon covered with willow leaves. Hidden lines. Then it drops down to one from heaven.',
      'Sixth line: He comes to meet with his horns. Humiliation. No blame.'
    ]
  },
  {
    number: 45,
    binary: '011000',
    name: 'Cui (Gathering Together)',
    symbol: '䷬',
    judgment: 'Success. The king approaches his temple. It is favorable to see the great man. This brings success. Perseverance is favorable. To make great offerings brings good fortune. It is favorable to undertake something.',
    image: 'The lake on the earth. The superior man, seeing this, renews his weapons in order to meet the unforeseen.',
    lines: [
      'First line: If you are sincere, but not to the end, there will sometimes be confusion, sometimes gathering. If you cry out, then after one grasp of the hands you can laugh again. Regret not. Going is without blame.',
      'Second line: Letting oneself be drawn brings good fortune and remains without blame. If one is sincere, it is favorable to make even a small offering.',
      'Third line: Gathering together amidst sighs. Nothing that would be favorable. Going is without blame. Slight humiliation.',
      'Fourth line: Great good fortune. No blame.',
      'Fifth line: If in gathering together one has position, this is no blame. If there are some who are not yet sincerely in accord, sublime and lasting perseverance is needed. Then remorse disappears.',
      'Sixth line: Lamenting and sighing, floods of tears. No blame.'
    ]
  },
  {
    number: 46,
    binary: '000110',
    name: 'Sheng (Pushing Upward)',
    symbol: '䷭',
    judgment: 'Supreme success. One must see the great man. Fear not. Departure toward the south brings good fortune.',
    image: 'Within the earth, wood grows. The superior man, seeing this, devotes himself to the development of his character, accumulating the small things in order to achieve something high and great.',
    lines: [
      'First line: Pushing upward that meets with confidence brings great good fortune.',
      'Second line: If one is sincere, it is favorable to make even a small offering. No blame.',
      'Third line: One pushes upward into an empty city.',
      'Fourth line: The king offers sacrifice on Mount Ch\'i. Good fortune. No blame.',
      'Fifth line: Perseverance brings good fortune. One pushes upward by steps.',
      'Sixth line: Pushing upward in darkness. It is favorable to be unremittingly persevering.'
    ]
  },
  {
    number: 47,
    binary: '011010',
    name: 'Kun (Oppression)',
    symbol: '䷮',
    judgment: 'Success. Perseverance. The great man brings good fortune. No blame. When one has something to say, it is not believed.',
    image: 'The lake without water. The superior man, seeing this, stakes his life on following his will.',
    lines: [
      'First line: One sits oppressed under a bare tree and strays into a gloomy valley. For three years one sees nothing.',
      'Second line: One is oppressed while at meat and drink. The man with the scarlet knee bands is just coming. It is favorable to make offerings. To set forth brings misfortune. No blame.',
      'Third line: A man is oppressed by stone, and leans on thorns and thistles. He enters his house and does not see his wife. Misfortune.',
      'Fourth line: He comes very slowly, oppressed in a golden carriage. Humiliation, but the end is reached.',
      'Fifth line: His nose and feet are cut off. Oppression at the hands of the man with the purple knee bands. Joy comes slowly. It is favorable to make offerings and libations.',
      'Sixth line: He is oppressed by creeping vines. He moves uncertainly and says, "Movement brings remorse." If one feels remorse for this and sets forth, good fortune comes.'
    ]
  },
  {
    number: 48,
    binary: '010110',
    name: 'Jing (The Well)',
    symbol: '䷯',
    judgment: 'The town may be changed, but the well cannot be changed. It neither decreases nor increases. They come and go and draw from the well. If one gets down almost to the water and the rope does not go all the way, or the jug breaks, it brings misfortune.',
    image: 'Water over wood. The superior man, seeing this, encourages the people at their work, and exhorts them to help one another.',
    lines: [
      'First line: One does not drink the mud of the well. No animals come to an old well.',
      'Second line: In the ravine of the well one shoots at fishes. The jug is broken and leaks.',
      'Third line: The well is cleaned, but no one drinks from it. This is my heart\'s sorrow, for one might draw from it. If the king were clear-minded, good fortune might be enjoyed in common.',
      'Fourth line: The well is being lined. No blame.',
      'Fifth line: In the well there is a clear, cold spring from which one can drink.',
      'Sixth line: One draws from the well without hindrance. It is dependable. Supreme good fortune.'
    ]
  },
  {
    number: 49,
    binary: '011101',
    name: 'Ge (Revolution)',
    symbol: '䷰',
    judgment: 'On your own day you are believed. Supreme success. Perseverance is favorable. Remorse disappears.',
    image: 'Fire in the lake. The superior man, seeing this, sets the calendar in order and makes the seasons clear.',
    lines: [
      'First line: Wrapped in the hide of a yellow cow.',
      'Second line: When one\'s own day comes, one may create revolution. Starting brings good fortune. No blame.',
      'Third line: Starting brings misfortune. Perseverance brings danger. When the talk of revolution has gone around three times, one may commit oneself, and people will believe him.',
      'Fourth line: Remorse disappears. Men believe him. Changing the form of government brings good fortune.',
      'Fifth line: The great man changes like a tiger. Even before he questions the oracle, he is believed.',
      'Sixth line: The superior man changes like a panther. The small man changes his face. Starting brings misfortune. To remain persevering brings good fortune.'
    ]
  },
  {
    number: 50,
    binary: '101110',
    name: 'Ding (The Cauldron)',
    symbol: '䷱',
    judgment: 'Supreme good fortune. Success.',
    image: 'Fire over wood. The superior man, seeing this, consolidates his fate by making his position correct.',
    lines: [
      'First line: A cauldron with legs upturned. Favorable for getting out the stagnant stuff. One takes a concubine for the sake of her son. No blame.',
      'Second line: There is food in the cauldron. My comrades are envious, but they cannot harm me. Good fortune.',
      'Third line: The handle of the cauldron is altered. One is impeded in his way of life. The fat of the pheasant is not eaten. Once rain falls, remorse is spent. Good fortune comes in the end.',
      'Fourth line: The legs of the cauldron are broken. The prince\'s meal is spilled and his person is soiled. Misfortune.',
      'Fifth line: The cauldron has yellow handles, golden carrying rings. Perseverance is favorable.',
      'Sixth line: The cauldron has rings of jade. Great good fortune. Nothing that would not be favorable.'
    ]
  },
  {
    number: 51,
    binary: '001001',
    name: 'Zhen (The Arousing)',
    symbol: '䷲',
    judgment: 'Success. Shock comes—oh, oh! Laughing words—ha, ha! The shock terrifies for a hundred miles, and he does not let fall the sacrificial spoon and chalice.',
    image: 'Thunder repeated. The superior man, seeing this, sets his life in order and examines himself.',
    lines: [
      'First line: Shock comes—oh, oh! Then follow laughing words—ha, ha! Good fortune.',
      'Second line: Shock comes bringing danger. A hundred thousand times you lose your treasures and must climb the nine hills. Do not go in pursuit of them. After seven days you will get them.',
      'Third line: Shock comes and makes one distraught. If shock spurs to action, one remains free of misfortune.',
      'Fourth line: Shock is followed by a mire.',
      'Fifth line: Shock goes hither and thither. Danger. However, nothing is lost. Yet there are things to be done.',
      'Sixth line: Shock brings ruin and terrified gazing around. Going ahead brings misfortune. If it has not yet touched one\'s own body but has touched one\'s neighbor, there is no blame. One\'s comrades have something to talk about.'
    ]
  },
  {
    number: 52,
    binary: '100100',
    name: 'Gen (Keeping Still, Mountain)',
    symbol: '䷳',
    judgment: 'Keeping his back still so that he no longer feels his body. He goes into his courtyard and does not see his people. No blame.',
    image: 'Mountains standing close together. The superior man, seeing this, does not let his thoughts go beyond his situation.',
    lines: [
      'First line: Keeping his toes still. No blame. Continued perseverance is favorable.',
      'Second line: Keeping his calves still. He cannot rescue him whom he follows. His heart is not glad.',
      'Third line: Keeping his hips still. Making his sacrum stiff. Dangerous. The heart suffocates.',
      'Fourth line: Keeping his trunk still. No blame.',
      'Fifth line: Keeping his jaws still. The words have order. Remorse disappears.',
      'Sixth line: Noble-hearted keeping still. Good fortune.'
    ]
  },
  {
    number: 53,
    binary: '110100',
    name: 'Jian (Development)',
    symbol: '䷴',
    judgment: 'The maiden is given in marriage. Good fortune. Perseverance is favorable.',
    image: 'On the mountain, a tree. The superior man, seeing this, abides in dignity and virtue, in order to improve the mores.',
    lines: [
      'First line: The wild goose gradually draws near the shore. The young son is in danger. There is talk. No blame.',
      'Second line: The wild goose gradually draws near the cliff. Eating and drinking in peace and concord. Good fortune.',
      'Third line: The wild goose gradually draws near the plateau. The man goes forth and does not return. The woman carries a child but does not bring it forth. Misfortune. It is favorable to ward off robbers.',
      'Fourth line: The wild goose gradually draws near the tree. Perhaps it will find a flat bough. No blame.',
      'Fifth line: The wild goose gradually draws near the summit. For three years the woman has no child. In the end nothing can hinder her. Good fortune.',
      'Sixth line: The wild goose gradually draws near the clouds in the sky. Its feathers can be used for the sacred dance. Good fortune.'
    ]
  },
  {
    number: 54,
    binary: '001011',
    name: 'Gui Mei (The Marrying Maiden)',
    symbol: '䷵',
    judgment: 'Undertakings bring misfortune. Nothing is favorable.',
    image: 'Thunder over the lake. The superior man, seeing this, understands the transitory in the light of the eternity of the end.',
    lines: [
      'First line: The marrying maiden as a concubine. A lame man who is able to tread. Undertakings bring good fortune.',
      'Second line: A one-eyed man who is able to see. The perseverance of a solitary man is favorable.',
      'Third line: The marrying maiden as a slave. She marries as a concubine.',
      'Fourth line: The marrying maiden draws out the allotted time. A late marriage comes in due course.',
      'Fifth line: The sovereign I gives his daughter in marriage. The embroidered garments of the princess were not as gorgeous as those of the serving maid. The moon that is nearly full brings good fortune.',
      'Sixth line: The woman holds the basket, but there are no fruits in it. The man stabs the sheep, but no blood flows. Nothing is favorable.'
    ]
  },
  {
    number: 55,
    binary: '001101',
    name: 'Feng (Abundance)',
    symbol: '䷶',
    judgment: 'Success. The king attains abundance. Be not sad. Be like the sun at midday.',
    image: 'Both thunder and lightning come. The superior man, seeing this, decides lawsuits and carries out punishments.',
    lines: [
      'First line: When a man meets his destined ruler, they can be together for ten days, and it is not a mistake. Going meets with recognition.',
      'Second line: The curtain is of such fullness that the polestars can be seen at noon. Through going one meets with mistrust and hate. If one rouses him through truth, good fortune comes.',
      'Third line: The screen is of such fullness that the small stars can be seen at noon. He breaks his right arm. No blame.',
      'Fourth line: The curtain is of such fullness that the polestars can be seen at noon. He meets his ruler, who is of like kind. Good fortune.',
      'Fifth line: He brings splendor, which involves blessing and praise. Good fortune.',
      'Sixth line: His house is in a state of abundance. He screens off his family. He peeps through the gate and no longer perceives anyone. For three years he sees nothing. Misfortune.'
    ]
  },
  {
    number: 56,
    binary: '101100',
    name: 'Lu (The Wanderer)',
    symbol: '䷷',
    judgment: 'Success through smallness. Perseverance brings good fortune to the wanderer.',
    image: 'Fire on the mountain. The superior man, seeing this, is clear-minded and cautious in the use of penalties, and does not protract lawsuits.',
    lines: [
      'First line: If the wanderer busies himself with trivial things, he draws down misfortune upon himself.',
      'Second line: The wanderer comes to an inn. He has his property with him. He wins the steadfastness of a young servant.',
      'Third line: The wanderer\'s inn burns down. He loses the steadfastness of his young servant. Danger.',
      'Fourth line: The wanderer rests in a shelter. He obtains his property and an ax. My heart is not glad.',
      'Fifth line: He shoots a pheasant. It drops with the first arrow. In the end this brings both praise and office.',
      'Sixth line: The bird\'s nest burns up. The wanderer laughs at first, then must wail and weep. Through carelessness he loses his cow. Misfortune.'
    ]
  },
  {
    number: 57,
    binary: '110110',
    name: 'Sun (The Gentle)',
    symbol: '䷸',
    judgment: 'Success through what is small. It is favorable to have somewhere to go. It is favorable to see the great man.',
    image: 'Winds following one another. The superior man, seeing this, spreads his commands abroad and carries out his undertakings.',
    lines: [
      'First line: In advancing and in retreating, the perseverance of a warrior is favorable.',
      'Second line: Penetration under the bed. Priests and magicians are used in great number. Good fortune. No blame.',
      'Third line: Repeated penetration. Humiliation.',
      'Fourth line: Remorse vanishes. In the hunt three kinds of game are caught.',
      'Fifth line: Perseverance brings good fortune. Remorse vanishes. Nothing that does not further. No beginning, but an end. Before the change, three days. After the change, three days. Good fortune.',
      'Sixth line: Penetration under the bed. He loses his property and his ax. Perseverance brings misfortune.'
    ]
  },
  {
    number: 58,
    binary: '011011',
    name: 'Dui (The Joyous, Lake)',
    symbol: '䷹',
    judgment: 'Success. Perseverance is favorable.',
    image: 'Lakes resting one on the other. The superior man, seeing this, joins with his friends for discussion and practice.',
    lines: [
      'First line: Contented joyousness. Good fortune.',
      'Second line: Sincere joyousness. Good fortune. Remorse disappears.',
      'Third line: Coming joyousness. Misfortune.',
      'Fourth line: Joyousness that is weighed is not at peace. After ridding himself of mistakes a man has joy.',
      'Fifth line: Sincerity toward disintegrating influences is dangerous.',
      'Sixth line: Seductive joyousness.'
    ]
  },
  {
    number: 59,
    binary: '110010',
    name: 'Huan (Dispersion)',
    symbol: '䷺',
    judgment: 'Success. The king approaches his temple. It is favorable to cross the great water. Perseverance is favorable.',
    image: 'The wind drives over the water. The ancient kings, seeing this, offered sacrifice to God and built temples.',
    lines: [
      'First line: He brings help with the strength of a horse. Good fortune.',
      'Second line: In the midst of dispersion, he hurries to his support. Remorse disappears.',
      'Third line: He disperses his self. No remorse.',
      'Fourth line: He disperses his group. Supreme good fortune. Dispersion leads in turn to accumulation. This is something that ordinary men do not think of.',
      'Fifth line: He disperses his sweat in loud cries. He disperses the king\'s residence. No blame.',
      'Sixth line: He disperses his blood. He departs, keeps at a distance, and comes out. No blame.'
    ]
  },
  {
    number: 60,
    binary: '010011',
    name: 'Jie (Limitation)',
    symbol: '䷻',
    judgment: 'Success. Galling limitation must not be persevered in.',
    image: 'Water over the lake. The superior man, seeing this, creates number and measure, and examines the nature of virtue and correct conduct.',
    lines: [
      'First line: Not going out of the door and the courtyard is without blame.',
      'Second line: Not going out of the gate and the courtyard brings misfortune.',
      'Third line: He who knows no limitation will have cause to lament. No blame.',
      'Fourth line: Contented limitation. Success.',
      'Fifth line: Sweet limitation brings good fortune. Going brings esteem.',
      'Sixth line: Galling limitation. Perseverance brings misfortune. Remorse disappears.'
    ]
  },
  {
    number: 61,
    binary: '110011',
    name: 'Zhong Fu (Inner Truth)',
    symbol: '䷼',
    judgment: 'Pigs and fishes. Good fortune. It is favorable to cross the great water. Perseverance is favorable.',
    image: 'Wind over the lake. The superior man, seeing this, discusses criminal cases and postpones executions.',
    lines: [
      'First line: Being prepared brings good fortune. If there are secret designs, it is disquieting.',
      'Second line: A crane calling in the shade. Its young answers it. I have a good goblet. I will share it with you.',
      'Third line: He finds a comrade. Now he beats the drum, now he stops. Now he weeps, now he sings.',
      'Fourth line: The moon is nearly full. The team horse goes astray. No blame.',
      'Fifth line: He has truth on his side and is leagued with others. No blame.',
      'Sixth line: The crowing of a cock penetrates to heaven. Perseverance brings misfortune.'
    ]
  },
  {
    number: 62,
    binary: '001100',
    name: 'Xiao Guo (Preponderance of the Small)',
    symbol: '䷽',
    judgment: 'Success. Perseverance is favorable. Small things may be done; great things should not be done. The flying bird brings the message: It is not well to strive upward, it is well to remain below. Great good fortune.',
    image: 'Thunder on the mountain. The superior man, seeing this, in his conduct exceeds in reverence, in mourning he exceeds in sorrow, in his expenditures he exceeds in economy.',
    lines: [
      'First line: The bird meets with misfortune through flight.',
      'Second line: She passes by her ancestor and meets her ancestress. He does not reach his prince and meets the official. No blame.',
      'Third line: If one is not extremely careful, somebody may come from behind and strike him. Misfortune.',
      'Fourth line: No blame. He meets him without passing by. Going brings danger. One must be on guard. Do not act. Be constantly persevering.',
      'Fifth line: Dense clouds, no rain from our western region. The prince shoots and hits him who is in the cave.',
      'Sixth line: He passes him by, not meeting him. The flying bird leaves him. Misfortune. This means bad luck and injury.'
    ]
  },
  {
    number: 63,
    binary: '010101',
    name: 'Jiji (After Completion)',
    symbol: '䷾',
    judgment: 'Success in small matters. Perseverance is favorable. At the beginning good fortune, at the end disorder.',
    image: 'Water over fire. The superior man, seeing this, takes thought of misfortune and arms himself against it in advance.',
    lines: [
        'First line: He drags his wheels. He gets his tail in the water. No blame.',
        'Second line: The woman loses her curtain. Do not run after it; on the seventh day you will get it.',
        'Third line: The illustrious ancestor attacks the devil\'s country. After three years he conquers it. Small people should not be used.',
        'Fourth line: The finest clothes turn to rags. Be careful all day long.',
        'Fifth line: The neighbor in the east who slaughters an ox does not attain as much real happiness as the neighbor in the west with his small offering.',
        'Sixth line: He gets his head in the water. Danger.'
    ]
  },
  {
      number: 64,
      binary: '101010',
      name: 'Weiji (Before Completion)',
      symbol: '䷿',
      judgment: 'Success. But if the little fox, after nearly completing the crossing, gets his tail in the water, there is nothing that would be favorable.',
      image: 'Fire over water. The superior man, seeing this, carefully distinguishes things, so that each finds its place.',
      lines: [
        'First line: He gets his tail in the water. Humiliating.',
        'Second line: He brakes his wheels. Perseverance brings good fortune.',
        'Third line: Before completion, attack brings misfortune. It is favorable to cross the great water.',
        'Fourth line: Perseverance brings good fortune. Remorse disappears. The country of the devils is shaken and punished. After three years, great rewards are bestowed from the great country.',
        'Fifth line: Perseverance brings good fortune. No remorse. The light of the superior man is true. Good fortune.',
        'Sixth line: He drinks wine in genuine confidence. No blame. But if he wets his head, he loses it, in truth.'
    ]
  }
];

