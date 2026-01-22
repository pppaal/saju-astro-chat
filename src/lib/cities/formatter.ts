// src/lib/cities/formatter.ts

/**
 * Korean translations for major cities
 */
const CITY_NAME_KR: Record<string, string> = {
  // South Korea
  'Seoul': '서울',
  'Busan': '부산',
  'Incheon': '인천',
  'Daegu': '대구',
  'Daejeon': '대전',
  'Gwangju': '광주',
  'Ulsan': '울산',
  'Suwon': '수원',
  'Changwon': '창원',
  'Goyang': '고양',
  'Yongin': '용인',
  'Seongnam': '성남',
  'Cheongju': '청주',
  'Jeonju': '전주',
  'Ansan': '안산',
  'Cheonan': '천안',
  'Namyangju': '남양주',
  'Pohang': '포항',
  'Jeju': '제주',
  'Gimhae': '김해',
  'Jinju': '진주',
  'Iksan': '익산',
  'Pyeongtaek': '평택',
  'Uijeongbu': '의정부',
  'Siheung': '시흥',
  'Paju': '파주',
  'Gimpo': '김포',
  'Bucheon': '부천',
  'Anyang': '안양',
  'Hwaseong': '화성',
  'Gwangmyeong': '광명',
  'Hanam': '하남',
  'Osan': '오산',
  'Yangju': '양주',
  'Icheon': '이천',
  'Gunpo': '군포',
  'Uiwang': '의왕',
  'Yangsan': '양산',
  'Gumi': '구미',
  'Mokpo': '목포',
  'Wonju': '원주',
  'Chuncheon': '춘천',
  'Gangneung': '강릉',
  'Gyeongju': '경주',
  'Andong': '안동',
  'Gimcheon': '김천',
  'Geoje': '거제',
  'Tongyeong': '통영',
  'Sacheon': '사천',
  'Yeosu': '여수',
  'Suncheon': '순천',
  'Gwangyang': '광양',
  'Naju': '나주',
  'Gongju': '공주',
  'Seosan': '서산',
  'Asan': '아산',
  'Nonsan': '논산',
  'Boryeong': '보령',
  'Sejong': '세종',

  // Japan
  'Tokyo': '도쿄',
  'Osaka': '오사카',
  'Kyoto': '교토',
  'Yokohama': '요코하마',
  'Nagoya': '나고야',
  'Sapporo': '삿포로',
  'Fukuoka': '후쿠오카',
  'Kobe': '고베',
  'Hiroshima': '히로시마',
  'Sendai': '센다이',
  'Nara': '나라',
  'Kawasaki': '가와사키',
  'Saitama': '사이타마',
  'Chiba': '치바',
  'Kitakyushu': '기타큐슈',
  'Kumamoto': '구마모토',
  'Okayama': '오카야마',
  'Niigata': '니가타',
  'Hamamatsu': '하마마쓰',
  'Shizuoka': '시즈오카',
  'Kagoshima': '가고시마',

  // China
  'Beijing': '베이징',
  'Shanghai': '상하이',
  'Guangzhou': '광저우',
  'Shenzhen': '선전',
  'Chengdu': '청두',
  'Chongqing': '충칭',
  'Tianjin': '톈진',
  'Wuhan': '우한',
  'Hangzhou': '항저우',
  'Xi\'an': '시안',
  'Nanjing': '난징',
  'Qingdao': '칭다오',
  'Dalian': '다롄',
  'Harbin': '하얼빈',
  'Suzhou': '쑤저우',
  'Dongguan': '둥관',
  'Changsha': '창사',
  'Shenyang': '선양',
  'Zhengzhou': '정저우',
  'Xiamen': '샤먼',
  'Jinan': '지난',
  'Changchun': '창춘',
  'Shijiazhuang': '스자좡',
  'Hefei': '허페이',
  'Kunming': '쿤밍',
  'Fuzhou': '푸저우',
  'Nanchang': '난창',
  'Guiyang': '구이양',
  'Taiyuan': '타이위안',
  'Lanzhou': '란저우',
  'Urumqi': '우루무치',

  // Taiwan
  'Taipei': '타이페이',
  'Kaohsiung': '가오슝',
  'Taichung': '타이중',
  'Tainan': '타이난',

  // Hong Kong & Macau
  'Hong Kong': '홍콩',
  'Macau': '마카오',

  // Southeast Asia
  'Singapore': '싱가포르',
  'Bangkok': '방콕',
  'Manila': '마닐라',
  'Hanoi': '하노이',
  'Ho Chi Minh City': '호치민',
  'Jakarta': '자카르타',
  'Kuala Lumpur': '쿠알라룸푸르',
  'Yangon': '양곤',
  'Phnom Penh': '프놈펜',
  'Vientiane': '비엔티안',
  'Phuket': '푸켓',
  'Pattaya': '파타야',
  'Chiang Mai': '치앙마이',
  'Penang': '페낭',
  'Johor Bahru': '조호르바루',
  'Cebu': '세부',
  'Davao': '다바오',
  'Bali': '발리',
  'Surabaya': '수라바야',
  'Bandung': '반둥',
  'Medan': '메단',

  // United States
  'New York': '뉴욕',
  'Los Angeles': '로스앤젤레스',
  'Chicago': '시카고',
  'Houston': '휴스턴',
  'Phoenix': '피닉스',
  'Philadelphia': '필라델피아',
  'San Antonio': '샌안토니오',
  'San Diego': '샌디에이고',
  'Dallas': '댈러스',
  'San Jose': '산호세',
  'Austin': '오스틴',
  'Jacksonville': '잭슨빌',
  'San Francisco': '샌프란시스코',
  'Seattle': '시애틀',
  'Denver': '덴버',
  'Washington': '워싱턴',
  'Boston': '보스턴',
  'Las Vegas': '라스베이거스',
  'Miami': '마이애미',
  'Atlanta': '애틀랜타',
  'Portland': '포틀랜드',
  'Nashville': '내슈빌',
  'Detroit': '디트로이트',
  'Minneapolis': '미니애폴리스',
  'Tampa': '탬파',
  'Orlando': '올랜도',
  'Cleveland': '클리블랜드',
  'Pittsburgh': '피츠버그',
  'Cincinnati': '신시내티',
  'Kansas City': '캔자스시티',
  'Indianapolis': '인디애나폴리스',
  'Columbus': '콜럼버스',
  'Charlotte': '샬럿',
  'Raleigh': '롤리',
  'Salt Lake City': '솔트레이크시티',
  'New Orleans': '뉴올리언스',
  'Milwaukee': '밀워키',
  'Albuquerque': '앨버커키',
  'Tucson': '투손',
  'Fresno': '프레즈노',
  'Sacramento': '새크라멘토',
  'Long Beach': '롱비치',
  'Oakland': '오클랜드',
  'Omaha': '오마하',

  // Canada
  'Toronto': '토론토',
  'Montreal': '몬트리올',
  'Vancouver': '밴쿠버',
  'Calgary': '캘거리',
  'Edmonton': '에드먼턴',
  'Ottawa': '오타와',
  'Quebec': '퀘벡',

  // United Kingdom
  'London': '런던',
  'Manchester': '맨체스터',
  'Birmingham': '버밍엄',
  'Liverpool': '리버풀',
  'Edinburgh': '에든버러',
  'Glasgow': '글래스고',
  'Bristol': '브리스톨',
  'Leeds': '리즈',
  'Sheffield': '셰필드',
  'Newcastle': '뉴캐슬',
  'Nottingham': '노팅엄',
  'Southampton': '사우샘프턴',
  'Leicester': '레스터',
  'Cambridge': '케임브리지',
  'Oxford': '옥스퍼드',
  'Brighton': '브라이튼',

  // Europe
  'Paris': '파리',
  'Berlin': '베를린',
  'Madrid': '마드리드',
  'Rome': '로마',
  'Amsterdam': '암스테르담',
  'Vienna': '빈',
  'Brussels': '브뤼셀',
  'Barcelona': '바르셀로나',
  'Munich': '뮌헨',
  'Milan': '밀라노',
  'Prague': '프라하',
  'Budapest': '부다페스트',
  'Warsaw': '바르샤바',
  'Copenhagen': '코펜하겐',
  'Stockholm': '스톡홀름',
  'Oslo': '오슬로',
  'Helsinki': '헬싱키',
  'Athens': '아테네',
  'Lisbon': '리스본',
  'Dublin': '더블린',
  'Zurich': '취리히',
  'Geneva': '제네바',
  'Marseille': '마르세유',
  'Lyon': '리옹',
  'Toulouse': '툴루즈',
  'Nice': '니스',
  'Bordeaux': '보르도',
  'Hamburg': '함부르크',
  'Frankfurt': '프랑크푸르트',
  'Cologne': '쾰른',
  'Stuttgart': '슈투트가르트',
  'Düsseldorf': '뒤셀도르프',
  'Dortmund': '도르트문트',
  'Essen': '에센',
  'Leipzig': '라이프치히',
  'Dresden': '드레스덴',
  'Hanover': '하노버',
  'Nuremberg': '뉘른베르크',
  'Naples': '나폴리',
  'Turin': '토리노',
  'Palermo': '팔레르모',
  'Genoa': '제노바',
  'Bologna': '볼로냐',
  'Florence': '피렌체',
  'Venice': '베니스',
  'Verona': '베로나',
  'Valencia': '발렌시아',
  'Seville': '세비야',
  'Zaragoza': '사라고사',
  'Malaga': '말라가',
  'Bilbao': '빌바오',
  'Rotterdam': '로테르담',
  'The Hague': '헤이그',
  'Utrecht': '위트레흐트',
  'Eindhoven': '아인트호번',
  'Antwerp': '앤트워프',
  'Ghent': '겐트',
  'Bruges': '브뤼헤',
  'Krakow': '크라쿠프',
  'Wroclaw': '브로츠와프',
  'Gdansk': '그단스크',
  'Bratislava': '브라티슬라바',
  'Bucharest': '부쿠레슈티',
  'Sofia': '소피아',
  'Belgrade': '베오그라드',
  'Zagreb': '자그레브',
  'Ljubljana': '류블랴나',
  'Vilnius': '빌뉴스',
  'Riga': '리가',
  'Tallinn': '탈린',
  'Reykjavik': '레이캬비크',
  'Luxembourg': '룩셈부르크',
  'Monaco': '모나코',

  // Australia & New Zealand
  'Sydney': '시드니',
  'Melbourne': '멜버른',
  'Brisbane': '브리즈번',
  'Perth': '퍼스',
  'Adelaide': '애들레이드',
  'Auckland': '오클랜드',
  'Wellington': '웰링턴',

  // Middle East
  'Dubai': '두바이',
  'Abu Dhabi': '아부다비',
  'Riyadh': '리야드',
  'Jeddah': '제다',
  'Tel Aviv': '텔아비브',
  'Jerusalem': '예루살렘',
  'Istanbul': '이스탄불',
  'Ankara': '앙카라',
  'Izmir': '이즈미르',
  'Antalya': '안탈리아',
  'Bursa': '부르사',
  'Doha': '도하',
  'Kuwait City': '쿠웨이트시티',
  'Manama': '마나마',
  'Muscat': '무스카트',
  'Amman': '암만',
  'Beirut': '베이루트',
  'Damascus': '다마스쿠스',
  'Baghdad': '바그다드',
  'Tehran': '테헤란',

  // South Asia
  'Mumbai': '뭄바이',
  'Delhi': '델리',
  'Bangalore': '방갈로르',
  'Kolkata': '콜카타',
  'Chennai': '첸나이',
  'Hyderabad': '하이데라바드',
  'Karachi': '카라치',
  'Lahore': '라호르',
  'Islamabad': '이슬라마바드',
  'Dhaka': '다카',
  'Pune': '푸네',
  'Ahmedabad': '아마다바드',
  'Jaipur': '자이푸르',
  'Lucknow': '러크나우',
  'Kanpur': '칸푸르',
  'Nagpur': '나그푸르',
  'Indore': '인도르',
  'Colombo': '콜롬보',
  'Kathmandu': '카트만두',

  // South America
  'São Paulo': '상파울루',
  'Rio de Janeiro': '리우데자네이루',
  'Buenos Aires': '부에노스아이레스',
  'Lima': '리마',
  'Bogotá': '보고타',
  'Santiago': '산티아고',
  'Caracas': '카라카스',
  'Medellín': '메데인',
  'Cali': '칼리',
  'Barranquilla': '바랑키야',
  'Quito': '키토',
  'Guayaquil': '과야킬',
  'Montevideo': '몬테비데오',
  'Asunción': '아순시온',
  'La Paz': '라파스',
  'Santa Cruz': '산타크루스',
  'Brasília': '브라질리아',
  'Salvador': '살바도르',
  'Fortaleza': '포르탈레자',
  'Belo Horizonte': '벨루오리존치',
  'Manaus': '마나우스',
  'Curitiba': '쿠리치바',
  'Recife': '헤시페',
  'Porto Alegre': '포르투알레그리',

  // Africa
  'Cairo': '카이로',
  'Lagos': '라고스',
  'Johannesburg': '요하네스버그',
  'Cape Town': '케이프타운',
  'Nairobi': '나이로비',
  'Casablanca': '카사블랑카',
  'Durban': '더반',
  'Pretoria': '프리토리아',
  'Alexandria': '알렉산드리아',
  'Giza': '기자',
  'Luxor': '룩소르',
  'Addis Ababa': '아디스아바바',
  'Accra': '아크라',
  'Dakar': '다카르',
  'Abidjan': '아비장',
  'Kinshasa': '킨샤사',
  'Luanda': '루안다',
  'Dar es Salaam': '다르에스살람',
  'Khartoum': '하르툼',
  'Algiers': '알제',
  'Tunis': '튀니스',
  'Rabat': '라바트',
  'Marrakech': '마라케시',
  'Tripoli': '트리폴리',

  // Russia
  'Moscow': '모스크바',
  'Saint Petersburg': '상트페테르부르크',
  'Novosibirsk': '노보시비르스크',
  'Vladivostok': '블라디보스토크',
  'Yekaterinburg': '예카테린부르크',
  'Kazan': '카잔',
  'Nizhny Novgorod': '니즈니노브고로드',
  'Chelyabinsk': '첼랴빈스크',
  'Samara': '사마라',
  'Omsk': '옴스크',
  'Rostov-on-Don': '로스토프나도누',
  'Ufa': '우파',
  'Krasnoyarsk': '크라스노야르스크',
  'Perm': '페름',
  'Volgograd': '볼고그라드',
  'Voronezh': '보로네시',
  'Irkutsk': '이르쿠츠크',
  'Khabarovsk': '하바롭스크',

  // Mexico
  'Mexico City': '멕시코시티',
  'Guadalajara': '과달라하라',
  'Monterrey': '몬테레이',
  'Cancún': '칸쿤',
  'Puebla': '푸에블라',
  'Tijuana': '티후아나',
  'León': '레온',
  'Juárez': '후아레스',
  'Mérida': '메리다',
  'Acapulco': '아카풀코',

  // Caribbean
  'Havana': '아바나',
  'Kingston': '킹스턴',
  'Santo Domingo': '산토도밍고',
  'San Juan': '산후안',
  'Port-au-Prince': '포르토프랭스',
  'Nassau': '나소',
};

/**
 * Korean translations for country codes
 */
const COUNTRY_NAME_KR: Record<string, string> = {
  'KR': '한국',
  'US': '미국',
  'JP': '일본',
  'CN': '중국',
  'GB': '영국',
  'FR': '프랑스',
  'DE': '독일',
  'IT': '이탈리아',
  'ES': '스페인',
  'CA': '캐나다',
  'AU': '호주',
  'NZ': '뉴질랜드',
  'SG': '싱가포르',
  'TH': '태국',
  'VN': '베트남',
  'PH': '필리핀',
  'MY': '말레이시아',
  'ID': '인도네시아',
  'IN': '인도',
  'TW': '타이완',
  'HK': '홍콩',
  'RU': '러시아',
  'BR': '브라질',
  'MX': '멕시코',
  'AR': '아르헨티나',
  'CH': '스위스',
  'AT': '오스트리아',
  'BE': '벨기에',
  'NL': '네덜란드',
  'SE': '스웨덴',
  'NO': '노르웨이',
  'DK': '덴마크',
  'FI': '핀란드',
  'PL': '폴란드',
  'PT': '포르투갈',
  'GR': '그리스',
  'TR': '터키',
  'AE': '아랍에미리트',
  'SA': '사우디아라비아',
  'EG': '이집트',
  'ZA': '남아프리카공화국',
  'NG': '나이지리아',
  'KE': '케냐',
};

/**
 * Full country names for better display
 */
const COUNTRY_FULL_NAME: Record<string, string> = {
  'KR': 'South Korea',
  'US': 'United States',
  'GB': 'United Kingdom',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'ZA': 'South Africa',
  'NZ': 'New Zealand',
};

export interface CityFormatOptions {
  locale?: 'ko' | 'en';
  style?: 'short' | 'full';
}

/**
 * Capitalize each word in a string
 */
function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format city name for display
 */
export function formatCityName(
  cityName: string,
  countryCode?: string,
  options: CityFormatOptions = {}
): string {
  const { locale = 'en', style = 'short' } = options;

  let city = cityName;
  let country = countryCode;

  if (!country && cityName.includes(',')) {
    const parts = cityName.split(',').map(p => p.trim());
    city = parts[0];
    country = parts[1]?.toUpperCase();
  }

  city = capitalizeWords(city);

  if (locale === 'ko') {
    const cityKr = CITY_NAME_KR[city] || city;
    const countryKr = country ? COUNTRY_NAME_KR[country.toUpperCase()] || country : '';
    return countryKr ? `${cityKr}, ${countryKr}` : cityKr;
  }

  const countryDisplay = country
    ? (style === 'full' ? COUNTRY_FULL_NAME[country.toUpperCase()] || country : country)
    : '';

  return countryDisplay ? `${city}, ${countryDisplay}` : city;
}

/**
 * Format city for dropdown display
 */
export function formatCityForDropdown(
  cityName: string,
  countryCode: string,
  locale: 'ko' | 'en' = 'en'
): string {
  const city = capitalizeWords(cityName);
  const country = countryCode.toUpperCase();

  if (locale === 'ko') {
    const cityKr = CITY_NAME_KR[city];
    const countryKr = COUNTRY_NAME_KR[country];

    if (cityKr && countryKr) {
      return `${cityKr}, ${countryKr}`;
    } else if (cityKr) {
      return `${cityKr}, ${country}`;
    } else if (countryKr) {
      return `${city}, ${countryKr}`;
    }
  }

  const countryDisplay = COUNTRY_FULL_NAME[country] || country;
  return `${city}, ${countryDisplay}`;
}

/**
 * Get city name in Korean (for search)
 */
export function getCityNameInKorean(cityName: string): string | null {
  const city = capitalizeWords(cityName);
  return CITY_NAME_KR[city] || null;
}

/**
 * Get country name in Korean (for search)
 */
export function getCountryNameInKorean(countryCode: string): string | null {
  const code = countryCode.toUpperCase();
  return COUNTRY_NAME_KR[code] || null;
}

/**
 * Reverse lookup: Get English city name from Korean name
 */
export function getCityNameFromKorean(koreanName: string): string | null {
  for (const [eng, kor] of Object.entries(CITY_NAME_KR)) {
    if (kor === koreanName) {
      return eng;
    }
  }
  return null;
}