export const getTypeCodeMeanings = (typeCode: string, locale: string): { letter: string; meaning: string }[] => {
  const meanings: { letter: string; meaning: string }[] = [];

  if (typeCode.length >= 4) {
    // Energy: R=Radiant, G=Grounded
    meanings.push({
      letter: typeCode[0],
      meaning: locale === 'ko'
        ? (typeCode[0] === 'R' ? '발산형' : '내향형')
        : (typeCode[0] === 'R' ? 'Radiant' : 'Grounded')
    });

    // Cognition: V=Visionary, S=Structured
    meanings.push({
      letter: typeCode[1],
      meaning: locale === 'ko'
        ? (typeCode[1] === 'V' ? '비전형' : '구조형')
        : (typeCode[1] === 'V' ? 'Visionary' : 'Structured')
    });

    // Decision: L=Logic, H=Heart(Empathic)
    meanings.push({
      letter: typeCode[2],
      meaning: locale === 'ko'
        ? (typeCode[2] === 'L' ? '논리형' : '공감형')
        : (typeCode[2] === 'L' ? 'Logic' : 'Empathic')
    });

    // Rhythm: A=Anchor, F=Flow
    meanings.push({
      letter: typeCode[3],
      meaning: locale === 'ko'
        ? (typeCode[3] === 'A' ? '안정형' : '유동형')
        : (typeCode[3] === 'A' ? 'Anchor' : 'Flow')
    });
  }

  return meanings;
};
