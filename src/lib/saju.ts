// src/lib/saju.ts
import { toDate } from 'date-fns-tz';

// 천간, 지지, 오행, 음양 데이터
const STEMS = [
    { name: '甲', element: '목', yin_yang: '양' }, { name: '乙', element: '목', yin_yang: '음' },
    { name: '丙', element: '화', yin_yang: '양' }, { name: '丁', element: '화', yin_yang: '음' },
    { name: '戊', element: '토', yin_yang: '양' }, { name: '己', element: '토', yin_yang: '음' },
    { name: '庚', element: '금', yin_yang: '양' }, { name: '辛', element: '금', yin_yang: '음' },
    { name: '壬', element: '수', yin_yang: '양' }, { name: '癸', element: '수', yin_yang: '음' },
];

const BRANCHES = [
    { name: '子', element: '수', hidden_stems: ['壬', '癸'] }, { name: '丑', element: '토', hidden_stems: ['癸', '辛', '己'] },
    { name: '寅', element: '목', hidden_stems: ['戊', '丙', '甲'] }, { name: '卯', element: '목', hidden_stems: ['甲', '乙'] },
    { name: '辰', element: '토', hidden_stems: ['乙', '癸', '戊'] }, { name: '巳', element: '화', hidden_stems: ['戊', '庚', '丙'] },
    { name: '午', element: '화', hidden_stems: ['丙', '己', '丁'] }, { name: '未', element: '토', hidden_stems: ['丁', '乙', '己'] },
    { name: '申', element: '금', hidden_stems: ['戊', '壬', '庚'] }, { name: '酉', element: '금', hidden_stems: ['庚', '辛'] },
    { name: '戌', element: '토', hidden_stems: ['辛', '丁', '戊'] }, { name: '亥', element: '수', hidden_stems: ['戊', '甲', '壬'] },
];

// 24절기 데이터 (근사치)
const SOLAR_TERMS_OFFSET = [
    -1, 4.22, 19.22, 4.47, 19.47, 5.22, 20.22, 6.02, 21.02, 6.82, 21.82, 7.45, 22.45,
    7.65, 22.65, 7.5, 22.5, 7.2, 22.2, 6.8, 21.8, 6.5, 21.5,
];

function getSolarTerm(year: number, month: number): Date {
    // 월이 1~12 범위를 벗어나는 경우를 대비
    const termMonth = month <= 0 ? 1 : month > 12 ? 12 : month;
    const termIndex = termMonth * 2 - 1;
    const offset = SOLAR_TERMS_OFFSET[termIndex];
    return new Date(`${year}-${termMonth}-${Math.floor(offset)}`);
}

// 핵심 계산 함수
export function calculateSajuData(birthDate: string, birthTime: string, gender: 'male' | 'female') {
    try {
        const timezone = 'Asia/Seoul';
        const dateString = `${birthDate}T${birthTime}`;
        const birthDateTime = toDate(dateString, { timeZone: timezone });

        let year = birthDateTime.getFullYear();
        const month = birthDateTime.getMonth() + 1;
        
        // 년주 계산 (입춘 기준)
        const ipchun = getSolarTerm(year, 2);
        if (birthDateTime < ipchun) {
            year--;
        }
        const yearStemIndex = (year - 4 + 60) % 10;
        const yearBranchIndex = (year - 4 + 60) % 12;
        const yearPillar = { stem: STEMS[yearStemIndex], branch: BRANCHES[yearBranchIndex] };

        // 월주 계산 (절기 기준)
        let monthBranchIndex = (month + 1) % 12; // 기본 월지로 초기화
        for (let i = 1; i <= 12; i++) {
            const termStart = getSolarTerm(year, i);
            const termEnd = getSolarTerm(year, i + 1 > 12 ? 1 : i + 1);
            if (birthDateTime >= termStart && birthDateTime < termEnd) {
                monthBranchIndex = (i + 1) % 12; // 절기 기준 월지 (예: 2월 입춘 ~ 3월 경칩 사이는 寅월 -> index 2)
                break;
            }
        }
        const monthStemIndex = (yearStemIndex * 2 + monthBranchIndex) % 10;
        const monthPillar = { stem: STEMS[monthStemIndex], branch: BRANCHES[monthBranchIndex] };

        // 일주 계산
        const epoch = new Date('1900-01-01T00:00:00Z');
        const diffMillis = birthDateTime.getTime() - epoch.getTime();
        const diffDays = Math.floor(diffMillis / (1000 * 60 * 60 * 24));
        const dayStemIndex = (diffDays + 40) % 10;
        const dayBranchIndex = (diffDays + 40) % 12;
        const dayPillar = { stem: STEMS[dayStemIndex], branch: BRANCHES[dayBranchIndex] };
        
        // 시주 계산
        const hour = birthDateTime.getHours();
        const hourBranchIndex = Math.floor((hour + 1) / 2) % 12;
        const hourStemIndex = (dayStemIndex * 2 + hourBranchIndex) % 10;
        const timePillar = { stem: STEMS[hourStemIndex], branch: BRANCHES[hourBranchIndex] };

        const pillars = [yearPillar, monthPillar, dayPillar, timePillar];

        // 오행 계산
        const fiveElementsCount: { [key: string]: number } = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
        pillars.forEach(p => {
            fiveElementsCount[p.stem.element]++;
            fiveElementsCount[p.branch.element]++;
        });
        
        // 💥💥💥 여기가 문제였습니다! '順行'을 'isForward'로 수정했습니다. 💥💥💥
        const isYangYear = yearPillar.stem.yin_yang === '양';
        const isMale = gender === 'male';
        const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);
        
        const daeWoonList: any[] = [];
        let currentStemIndex = monthStemIndex;
        let currentBranchIndex = monthBranchIndex;
        for (let i = 0; i < 10; i++) {
            const age = i * 10 + 3; // 대운수는 3으로 간략화
            if (isForward) {
                currentStemIndex = (currentStemIndex + 1) % 10;
                currentBranchIndex = (currentBranchIndex + 1) % 12;
            } else {
                currentStemIndex = (currentStemIndex - 1 + 10) % 10;
                currentBranchIndex = (currentBranchIndex - 1 + 12) % 12;
            }
            daeWoonList.push({
                age: age,
                heavenlyStem: STEMS[currentStemIndex].name,
                earthlyBranch: BRANCHES[currentBranchIndex].name,
            });
        }

        const currentAge = new Date().getFullYear() - birthDateTime.getFullYear() + 1;
        const currentLuckPillar = daeWoonList.slice().reverse().find(d => currentAge >= d.age) || daeWoonList[0];
        const nextLuckPillar = daeWoonList.find(d => d.age > (currentLuckPillar?.age || 0));

        return {
            yearPillar: { heavenlyStem: { name: yearPillar.stem.name }, earthlyBranch: { name: yearPillar.branch.name } },
            monthPillar: { heavenlyStem: { name: monthPillar.stem.name }, earthlyBranch: { name: monthPillar.branch.name } },
            dayPillar: { heavenlyStem: { name: dayPillar.stem.name }, earthlyBranch: { name: dayPillar.branch.name } },
            timePillar: { heavenlyStem: { name: timePillar.stem.name }, earthlyBranch: { name: timePillar.branch.name } },
            daeWoon: {
                current: currentLuckPillar,
                next: nextLuckPillar,
            },
            fiveElements: {
                wood: fiveElementsCount['목'], fire: fiveElementsCount['화'],
                earth: fiveElementsCount['토'], metal: fiveElementsCount['금'],
                water: fiveElementsCount['수'],
            },
        };

    } catch (error) {
        console.error("[saju.ts] 자체 사주 데이터 계산 중 오류 발생:", error);
        throw new Error(`자체 계산 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}