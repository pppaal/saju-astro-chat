import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// POST 요청을 처리하는 비동기 함수
export async function POST(request: NextRequest) {
  // 1. 가장 먼저 try...catch 블록으로 모든 코드를 감싸서 예상치 못한 에러를 잡습니다.
  try {
    // API 키가 있는지 먼저 확인합니다.
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      // API 키가 없으면 즉시 에러를 발생시켜 catch 블록으로 보냅니다.
      throw new Error("GOOGLE_API_KEY가 .env.local 파일에 설정되지 않았습니다.");
    }

    // 프론트엔드에서 보낸 데이터를 받습니다.
    const { birthdate, birthtime, gender } = await request.json();

    // 프롬프트를 구성합니다.
    const prompt = `
      당신은 신비로운 우주와 별의 기운을 읽는 점성술사입니다.
      아래 정보를 바탕으로 한 사람의 성격, 재능, 그리고 2025년 하반기의 조언을 담은 짧은 운명 분석 보고서를 작성해주세요.
      분석은 친절하고, 긍정적이며, 희망을 주는 어조로 작성해주세요.
      결과는 마크다운 형식을 사용해서 제목과 단락으로 구분해주세요.

      - 생년월일: ${birthdate}
      - 태어난 시간: ${birthtime}
      - 성별: ${gender}
    `;

    // Gemini 클라이언트를 초기화합니다.
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Gemini API에 요청을 보냅니다.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisResult = response.text();

    // 성공적으로 결과를 받으면, 약속대로 JSON 형태로 프론트엔드에 전달합니다.
    return NextResponse.json({ result: analysisResult });

  } catch (error: any) {
    // 2. 어떤 종류의 에러든 여기서 잡힙니다. (API 키, 네트워크, Gemini 서버 에러 등)
    console.error('API 라우트에서 심각한 오류 발생:', error);

    // 3. 에러가 발생했음을 명확히 알려주는 '진짜 JSON' 에러 메시지를 프론트엔드에 보냅니다.
    // 이렇게 하면 프론트엔드는 더 이상 HTML을 받지 않고, 에러 상태를 제대로 처리할 수 있습니다.
    return NextResponse.json(
      { error: `서버 측에서 오류가 발생했습니다: ${error.message}` },
      { status: 500 } // '서버 내부 오류'를 의미하는 HTTP 상태 코드
    );
  }
}