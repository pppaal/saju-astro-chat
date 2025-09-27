'use client';

import React, { useState, useEffect } from 'react';
import { getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/Saju/unse'; 
import { DayMaster } from '@/lib/Saju/types';

// --- 타입 정의 ---
type FiveElement = '목' | '화' | '토' | '금' | '수';
type YinYang = '양' | '음';

interface GanjiData { name: string; element: FiveElement; sibsin: string; }
interface JijangganData { chogi: { name: string; sibsin: string; }; junggi: { name: string; sibsin: string; }; jeonggi: { name: string; sibsin: string; }; }
interface PillarData { heavenlyStem: GanjiData; earthlyBranch: GanjiData; jijanggan: JijangganData; }
interface UnseData { heavenlyStem: string; earthlyBranch: string; sibsin: { cheon: string; ji: string; }; }
interface DaeunData extends UnseData { age: number; }
interface YeonunData extends UnseData { year: number; }
interface WolunData extends UnseData { year: number; month: number; }
interface IljinData extends UnseData { year: number; month: number; day: number; isCheoneulGwiin: boolean; }

interface SajuApiResponse {
    birthYear: number;
    yearPillar: PillarData;
    monthPillar: PillarData;
    dayPillar: PillarData;
    timePillar: PillarData;
    // ▼▼▼ [수정] 여기도 daeWoon -> daeun 으로 변경 ▼▼▼
    daeun: { daeunsu: number; cycles: DaeunData[]; };
    fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number; };
    dayMaster: DayMaster;
    yeonun: YeonunData[];
    wolun: WolunData[];
    iljin: IljinData[];
}

interface Props {
    result: SajuApiResponse;
}

// --- 메인 컴포넌트 ---
export default function SajuResultDisplay({ result }: Props) {
    // ▼▼▼ [수정] daeWoon -> daeun 으로 변경 ▼▼▼
    if (!result || !result.daeun || !result.daeun.cycles) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>결과를 표시할 수 없습니다.</div>;
    }

    const currentAge = new Date().getFullYear() - result.birthYear + 1;
    // ▼▼▼ [수정] daeWoon -> daeun 으로 변경 ▼▼▼
    const initialDaeun = result.daeun.cycles.find(d => currentAge >= d.age && currentAge < d.age + 10) || result.daeun.cycles[0];
    
    // (이 아래 로직은 사용자님이 보내주신 원본 그대로입니다. 클릭 연동 기능은 없습니다.)
    const [selectedDaeun, setSelectedDaeun] = useState<DaeunData>(initialDaeun);
    const [selectedYeonun, setSelectedYeonun] = useState<YeonunData | undefined>();
    const [selectedWolun, setSelectedWolun] = useState<WolunData | undefined>();
    const [displayedYeonun, setDisplayedYeonun] = useState<YeonunData[]>([]);
    const [displayedWolun, setDisplayedWolun] = useState<WolunData[]>([]);
    const [displayedIljin, setDisplayedIljin] = useState<IljinData[]>(result.iljin);
    const handleDaeunClick = (daeun: DaeunData) => { setSelectedDaeun(daeun); };
    const handleYeonunClick = (yeonun: YeonunData) => { setSelectedYeonun(yeonun); };
    const handleWolunClick = (wolun: WolunData) => { setSelectedWolun(wolun); };
    useEffect(() => {
        if (!selectedDaeun) return;
        const daeunStartYear = result.birthYear + selectedDaeun.age - 1;
        const newYeonun = getAnnualCycles(daeunStartYear, 10, result.dayMaster);
        setDisplayedYeonun(newYeonun);
        setSelectedYeonun(newYeonun.find(y => y.year === new Date().getFullYear()) || newYeonun[newYeonun.length - 1]);
    }, [selectedDaeun, result.birthYear, result.dayMaster]);
    useEffect(() => {
        if (!selectedYeonun) return;
        const newWolun = getMonthlyCycles(selectedYeonun.year, result.dayMaster);
        setDisplayedWolun(newWolun);
        setSelectedWolun(newWolun.find(m => m.month === new Date().getMonth() + 1) || newWolun[newWolun.length - 1]);
    }, [selectedYeonun, result.dayMaster]);
    useEffect(() => {
        if (!selectedWolun) return;
        const newIljin = getIljinCalendar(selectedWolun.year, selectedWolun.month, result.dayMaster);
        setDisplayedIljin(newIljin);
    }, [selectedWolun, result.dayMaster]);

    // ▼▼▼ [수정] daeWoon -> daeun 으로 변경 ▼▼▼
    const { yearPillar, monthPillar, dayPillar, timePillar, fiveElements, daeun } = result;

    return (
        <div style={{ marginTop: '3rem', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
            <Section title="사주 명식 (Four Pillars)">
                <div style={pillarContainerStyle}>
                    <PillarBox title="시주" heavenlyStem={timePillar.heavenlyStem} earthlyBranch={timePillar.earthlyBranch} />
                    <PillarBox title="일주" heavenlyStem={dayPillar.heavenlyStem} earthlyBranch={dayPillar.earthlyBranch} />
                    <PillarBox title="월주" heavenlyStem={monthPillar.heavenlyStem} earthlyBranch={monthPillar.earthlyBranch} />
                    <PillarBox title="연주" heavenlyStem={yearPillar.heavenlyStem} earthlyBranch={yearPillar.earthlyBranch} />
                </div>
                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '1rem', color: '#a0a0a0' }}>
                    당신의 일간(日干)은 <span style={{color: '#f5a623', fontWeight: 'bold'}}>{dayPillar.heavenlyStem.name} ({dayPillar.heavenlyStem.element})</span> 입니다.
                </p>
            </Section>

            <Section title="오행 분포 (Five Elements)">
                {fiveElements && <OhaengDistribution ohaengData={fiveElements} />}
            </Section>

            {/* ▼▼▼ [수정] daeWoon -> daeun 으로 변경 ▼▼▼ */}
            <Section title={`대운 (대운수: ${daeun.daeunsu})`}>
                <UnseFlowContainer>
                    {daeun.cycles.map((item) => (
                        <UnsePillar key={`daeun-${item.age}`} topText={`${item.age}세`} topSubText={item.sibsin.cheon} cheon={item.heavenlyStem} ji={item.earthlyBranch} bottomSubText={item.sibsin.ji} onClick={() => handleDaeunClick(item)} isSelected={selectedDaeun?.age === item.age}/>
                    ))}
                </UnseFlowContainer>
            </Section>

            <Section title="연운 (Annual Cycle)">
                <UnseFlowContainer>
                    {displayedYeonun.map((item) => (
                        <UnsePillar key={`yeonun-${item.year}`} topText={`${item.year}년`} topSubText={item.sibsin.cheon} cheon={item.heavenlyStem} ji={item.earthlyBranch} bottomSubText={item.sibsin.ji} onClick={() => handleYeonunClick(item)} isSelected={selectedYeonun?.year === item.year}/>
                    ))}
                </UnseFlowContainer>
            </Section>

            <Section title="월운 (Monthly Cycle)">
                <UnseFlowContainer>
                    {displayedWolun.map((item) => (
                        <UnsePillar key={`wolun-${item.month}`} topText={`${item.month}월`} topSubText={item.sibsin.cheon} cheon={item.heavenlyStem} ji={item.earthlyBranch} bottomSubText={item.sibsin.ji} onClick={() => handleWolunClick(item)} isSelected={selectedWolun?.month === item.month && selectedWolun?.year === item.year}/>
                    ))}
                </UnseFlowContainer>
            </Section>
            
            <Section title="일진 달력 (Daily Calendar)">
                <IljinCalendar iljinData={displayedIljin} year={selectedWolun?.year} month={selectedWolun?.month}/>
            </Section>
        </div>
    );
}

// --- 하위 컴포넌트들 (사용자님 원본 코드 그대로) ---

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '500', borderBottom: '1px solid #4f4f7a', paddingBottom: '0.8rem', marginBottom: '1.5rem', color: '#c0c0c0' }}>
            {title}
        </h2>
        {children}
    </div>
);
const PillarBox = ({ title, heavenlyStem, earthlyBranch }: { title: string, heavenlyStem: GanjiData, earthlyBranch: GanjiData }) => (
    <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>{title}</div>
        <div style={sibsinTextStyle}>{heavenlyStem.sibsin}</div>
        <div style={{ ...pillarCellStyle, backgroundColor: '#4a80f5' }}>{heavenlyStem.name}</div>
        <div style={{ ...pillarCellStyle, backgroundColor: '#f5a623', marginTop: '4px' }}>{earthlyBranch.name}</div>
        <div style={sibsinTextStyle}>{earthlyBranch.sibsin}</div>
    </div>
);
const sibsinTextStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#888', height: '1.5em', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const pillarCellStyle: React.CSSProperties = { width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 'bold', color: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' };
const pillarContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-around', background: '#1e1e2f', padding: '1rem', borderRadius: '12px', border: '1px solid #4f4f7a', };
const OhaengDistribution = ({ ohaengData }: { ohaengData: { [key in 'wood' | 'fire' | 'earth' | 'metal' | 'water']: number } }) => {
    const elements = [
        { name: '목', key: 'wood' as const, color: '#28a745' }, { name: '화', key: 'fire' as const, color: '#dc3545' },
        { name: '토', key: 'earth' as const, color: '#ffc107' }, { name: '금', key: 'metal' as const, color: '#adb5bd' },
        { name: '수', key: 'water' as const, color: '#007bff' },
    ];
    const total = Object.values(ohaengData).reduce((sum, count) => sum + count, 0);
    return (
        <div style={{ background: '#1e1e2f', padding: '1.5rem', borderRadius: '12px', border: '1px solid #4f4f7a' }}>
            {elements.map(el => {
                const count = ohaengData[el.key] || 0;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                    <div key={el.name} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ width: '40px' }}>{el.name}</span>
                        <div style={{ flex: 1, background: '#161625', borderRadius: '4px', height: '20px', marginRight: '1rem' }}>
                            <div style={{ width: `${percentage}%`, background: el.color, height: '100%', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                        <span style={{ width: '20px', textAlign: 'right' }}>{count}</span>
                    </div>
                );
            })}
        </div>
    );
};
const UnseFlowContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ display: 'flex', overflowX: 'auto', padding: '1rem 0.5rem', background: '#1e1e2f', borderRadius: '12px', border: '1px solid #4f4f7a' }}>
        {children}
    </div>
);
const UnsePillar = ({ topText, topSubText, cheon, ji, bottomSubText, onClick, isSelected }: {
    topText: string, topSubText: string, cheon: string, ji: string, bottomSubText: string,
    onClick?: () => void;
    isSelected?: boolean;
}) => (
    <div
        style={{
            flex: '0 0 65px',
            textAlign: 'center',
            padding: '0 4px',
            cursor: onClick ? 'pointer' : 'default',
            background: isSelected ? 'rgba(58, 109, 240, 0.2)' : 'transparent',
            borderRadius: '8px',
            border: isSelected ? '1px solid #3a6df0' : '1px solid transparent',
            transition: 'all 0.2s ease-in-out',
            paddingTop: '5px',
            paddingBottom: '5px',
        }}
        onClick={onClick}
    >
        <div style={{ fontSize: '0.8rem', color: '#a0a0a0', whiteSpace: 'nowrap' }}>{topText}</div>
        <div style={sibsinTextStyle}>{topSubText}</div>
        <div style={{ ...unseBoxStyle, borderBottom: '1px solid #161625' }}>{cheon}</div>
        <div style={{ ...unseBoxStyle }}>{ji}</div>
        <div style={sibsinTextStyle}>{bottomSubText}</div>
    </div>
);
const unseBoxStyle: React.CSSProperties = { padding: '0.6rem 0', fontSize: '1.2rem', fontWeight: 'bold', background: '#2a2a3e', borderRadius: '4px', color: '#e0e0e0' };

const IljinCalendar = ({ iljinData, year, month }: { iljinData: IljinData[], year?: number, month?: number }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (year && month) {
            setCurrentDate(new Date(year, month - 1, 1));
        }
    }, [year, month]);
    
    const calendarYear = currentDate.getFullYear();
    const calendarMonth = currentDate.getMonth();
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    
    const calendarDays: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) { calendarDays.push(<div key={`empty-${i}`} style={calendarCellStyle}></div>); }
    for (let day = 1; day <= daysInMonth; day++) {
        const iljin = iljinData.find(d => d.day === day);
        const isToday = new Date().toDateString() === new Date(calendarYear, calendarMonth, day).toDateString();
        const ganjiStr = iljin ? `${iljin.heavenlyStem}${iljin.earthlyBranch}` : '';
        const sibsinStr = iljin ? `${iljin.sibsin.cheon}/${iljin.sibsin.ji}` : '';
        calendarDays.push(
            <div key={day} style={{...calendarCellStyle, background: '#1e1e2f', border: isToday ? '2px solid #3a6df0' : '1px solid #4f4f7a', position: 'relative'}}>
                <div style={{fontWeight: 'bold', color: (firstDayOfMonth + day -1) % 7 === 0 ? '#ff6b6b' : '#e0e0e0'}}>{day}</div>
                <div style={{fontSize: '0.8rem', color: '#a0a0a0', marginTop: '4px'}}>{ganjiStr}</div>
                <div style={{fontSize: '0.7rem', color: '#777', marginTop: '2px'}}>{sibsinStr}</div>
                {iljin?.isCheoneulGwiin && <span style={{position: 'absolute', top: '5px', right: '5px', fontSize: '0.8rem'}}>⭐</span>}
            </div>
        );
    }
    
    return (
        <div style={{background: '#161625', padding: '1rem', borderRadius: '12px'}}>
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem'}}>
                <h3 style={{fontSize: '1.1rem', fontWeight: 'bold'}}>{calendarYear}년 {calendarMonth + 1}월</h3>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)'}}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => <div key={day} style={{...calendarHeaderStyle, color: i === 0 ? '#ff6b6b' : '#c0c0c0'}}>{day}</div>)}
                {calendarDays}
            </div>
        </div>
    );
};
const calendarCellStyle: React.CSSProperties = { border: '1px solid #4f4f7a', padding: '0.5rem', minHeight: '80px', textAlign: 'left' };
const calendarHeaderStyle: React.CSSProperties = { ...calendarCellStyle, textAlign: 'center', fontWeight: 'bold', background: '#1e1e2f', };