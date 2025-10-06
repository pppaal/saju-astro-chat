// src/app/api/astrology/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import * as swisseph from 'swisseph';

// --- Gemini 설정 ---
// 💡 API 키 존재 여부를 더 엄격하게 확인합니다.
if (!process.env.GEMINI_API_KEY) {
  console.error("치명적 오류: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); // 가장 기본적인 모델로 최종 시도

// --- 상수 및 초기화 함수 (기존과 동일) ---
const zodiacSigns = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const planetsToCalculate = [
    { name: '태양', id: swisseph.SE_SUN }, { name: '달', id: swisseph.SE_MOON }, { name: '수성', id: swisseph.SE_MERCURY },
    { name: '금성', id: swisseph.SE_VENUS }, { name: '화성', id: swisseph.SE_MARS }, { name: '목성', id: swisseph.SE_JUPITER },
    { name: '토성', id: swisseph.SE_SATURN }, { name: '천왕성', id: swisseph.SE_URANUS }, { name: '해왕성', id: swisseph.SE_NEPTUNE },
    { name: '명왕성', id: swisseph.SE_PLUTO },
];
function initializeSwisseph() {
    const ephePath = path.join(process.cwd(), 'public', 'ephe');
    if (!fs.existsSync(ephePath) || !fs.readdirSync(ephePath).some(file => file.endsWith('.se1'))) {
        throw new Error(`서버 설정 오류: public/ephe 폴더에 천체력(.se1) 파일이 없습니다.`);
    }
    swisseph.swe_set_ephe_path(ephePath);
}

// --- API 요청 핸들러 (기존과 동일) ---
export async function POST(request: Request) {
    try {
        // 💡 API 키가 없는 경우 요청을 즉시 중단시킵니다.
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("서버 설정 오류: Gemini API 키가 없습니다.");
        }
        initializeSwisseph();

        const body = await request.json();
        const { date, time, latitude, longitude } = body;

        if (!date || !time || latitude === undefined || longitude === undefined) {
            return NextResponse.json({ error: '필수 입력 필드가 누락되었습니다.' }, { status: 400 });
        }
        console.log('✅ Step 1: Original data received:', body);

        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = time.split(':').map(Number);
        
        const inputDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
        inputDate.setHours(inputDate.getHours() - 9); // KST to UTC

        const utcYear = inputDate.getUTCFullYear();
        const utcMonth = inputDate.getUTCMonth() + 1;
        const utcDay = inputDate.getUTCDate();
        const utcHour = inputDate.getUTCHours() + (inputDate.getUTCMinutes() / 60);
        console.log(`✅ Step 2: Converted to UTC -> ${utcYear}-${utcMonth}-${utcDay} ${utcHour.toFixed(2)}h`);
        
        const jd = swisseph.swe_julday(utcYear, utcMonth, utcDay, utcHour, swisseph.SE_GREG_CAL);

        if (typeof jd !== 'number' || !isFinite(jd)) {
            console.error(`[Swisseph Error] FATAL: swe_julday가 유효한 율리우스력을 반환하지 못했습니다. 결과:`, jd);
            throw new Error("율리우스력(JD) 계산에 실패했습니다. 날짜/시간 입력이 올바른지 확인하거나 서버 로그를 확인하세요.");
        }
        
        console.log(`✅ Step 3: Julian Day (JD) calculation successful: ${jd}`);

        const planetPromises = planetsToCalculate.map(p => new Promise((resolve, reject) => {
            swisseph.swe_calc_ut(jd, p.id, swisseph.SEFLG_SPEED, res => 'error' in res ? reject(new Error(res.error)) : resolve(res));
        }));

        const housePromise = new Promise((resolve, reject) => {
            const houseResult = swisseph.swe_houses(jd, latitude, longitude, 'P');
            
            // @ts-ignore
            if (houseResult && houseResult.error) { return reject(new Error(`House calculation failed: ${houseResult.error}`)); }
            
            if (houseResult && houseResult.house && houseResult.ascendant !== undefined && houseResult.mc !== undefined) {
                return resolve(houseResult);
            }

            console.error("[Swisseph Error] swe_houses가 예상치 못한 값을 반환했습니다:", houseResult);
            reject(new Error("하우스 정보를 계산할 수 없습니다. 서버 로그를 확인해주세요."));
        });

        const [planetResults, houseResult] = await Promise.all([Promise.all(planetPromises), housePromise]) as [any[], any];
        
        const chartData = {
            planets: planetResults.map((p, i) => ({
                planet: planetsToCalculate[i].name,
                zodiacSign: zodiacSigns[Math.floor(p.longitude / 30)],
                degree: parseFloat((p.longitude % 30).toFixed(2)),
            })),
            ascendant: {
                zodiacSign: zodiacSigns[Math.floor(houseResult.ascendant / 30)],
                degree: parseFloat((houseResult.ascendant % 30).toFixed(2)),
            },
            midheaven: {
                zodiacSign: zodiacSigns[Math.floor(houseResult.mc / 30)],
                degree: parseFloat((houseResult.mc % 30).toFixed(2)),
            }
        };
        console.log('✅ Step 4: Chart calculation complete. Starting interpretation.');
        
        const prompt = `당신은 친절하고 유능한 점성술사입니다. 다음은 한 사람의 출생 천궁도 데이터입니다. 각 행성이 위치한 별자리와 각도를 나타냅니다. --- ${JSON.stringify(chartData, null, 2)} --- 이 데이터를 바탕으로, 점성술을 전혀 모르는 초보자도 쉽게 이해할 수 있도록 각 행성의 위치가 개인의 성격, 재능, 삶의 과제에 어떤 영향을 미치는지 종합적으로 분석하고 설명해주세요. (개인정보 보호를 위해 이름, 성별 등은 언급하지 마세요.) \n\n### 답변 형식 가이드라인:\n1. **총평:** 차트의 전반적인 특징을 한두 문장으로 요약합니다.\n2. **핵심 에너지 (태양, 달, 상승점):** 개인의 정체성, 감정, 그리고 세상에 보여지는 모습에 대해 설명합니다.\n3. **소통과 관계 (수성, 금성):** 생각하고 말하는 방식과 사랑을 표현하는 스타일에 대해 설명합니다.\n4. **행동과 열정 (화성):** 에너지를 사용하는 방식과 동기 부여 요인에 대해 설명합니다.\n5. **성장과 도전 (목성, 토성):** 행운과 확장의 영역, 그리고 삶의 교훈과 책임의 영역을 짚어줍니다.\n6. **마무리 조언:** 차트를 바탕으로 자신을 더 잘 이해하고 잠재력을 발휘할 수 있도록 따뜻한 조언으로 마무리합니다.`;
        
        const result = await model.generateContent(prompt);
        const interpretation = result.response.text();
        console.log('✅ Step 5: Gemini interpretation generated successfully.');

        return NextResponse.json({ chartData, interpretation });

    } catch (error: any) {
        console.error('API 처리 중 최종 에러:', error);
        return NextResponse.json({ error: error.message || '알 수 없는 에러가 발생했습니다.' }, { status: 500 });
    }
}

