// src/app/components/UserInfoForm.tsx 또는 ChatComponent.tsx

"use client";

import { useState } from "react";
import { NatalChartData, PlanetData } from "@/lib/astrology";

// 1. 사용자 입력을 파싱하여 JSON 객체로 변환하는 함수
function parseUserInput(text: string): { data: any; error: string | null } {
    // 정규 표현식을 사용하여 날짜와 시간을 찾습니다.
    const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
    const timeRegex = /(\d{2}):(\d{2})/;

    const dateMatch = text.match(dateRegex);
    const timeMatch = text.match(timeRegex);

    if (!dateMatch || !timeMatch) {
        return { data: null, error: "날짜(YYYY-MM-DD)와 시간(HH:MM) 형식을 모두 포함해주세요." };
    }

    // 일단 서울의 위도/경도를 기본값으로 사용합니다.
    const SEOUL_LATITUDE = 37.56;
    const SEOUL_LONGITUDE = 126.97;

    return {
        data: {
            year: parseInt(dateMatch[1]),
            month: parseInt(dateMatch[2]),
            date: parseInt(dateMatch[3]),
            hour: parseInt(timeMatch[1]),
            minute: parseInt(timeMatch[2]),
            latitude: SEOUL_LATITUDE,
            longitude: SEOUL_LONGITUDE,
        },
        error: null,
    };
}


export default function ChatInterface() {
    const [userInput, setUserInput] = useState("생년월일: 1995-02-09, 시간: 06:40, 성별: 남성");
    const [messages, setMessages] = useState<any[]>([]); // 채팅 메시지 목록
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!userInput.trim()) return;

        const userMessage = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setUserInput(""); // 입력창 비우기

        // 2. 사용자 입력을 파싱합니다.
        const { data: parsedData, error: parseError } = parseUserInput(userMessage.text);

        // 3. 파싱 실패 시 에러 메시지를 표시합니다.
        if (parseError) {
            setMessages(prev => [...prev, { sender: 'bot', text: `오류: ${parseError}` }]);
            setIsLoading(false);
            return;
        }

        // 4. 파싱 성공 시, 우리 API로 데이터를 전송합니다.
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData), // 파싱된 JSON 데이터를 전송
            });

            const result = await response.json();

            if (!response.ok) {
                // 서버에서 보낸 에러 메시지를 표시 (예: "필수 정보 누락: ...")
                throw new Error(result.error || "서버에서 오류가 발생했습니다.");
            }
            
            // 5. 성공 결과를 채팅창에 표시 (결과를 텍스트로 예쁘게 가공)
            const resultText = formatChartResult(result);
            setMessages(prev => [...prev, { sender: 'bot', text: resultText }]);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
            setMessages(prev => [...prev, { sender: 'bot', text: `오류 발생: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
            </div>
            <div className="input-area">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="생년월일과 시간을 입력하세요..."
                    disabled={isLoading}
                />
                <button onClick={handleSend} disabled={isLoading}>
                    {isLoading ? '분석중...' : '전송'}
                </button>
            </div>
        </div>
    );
}

// 서버에서 받은 차트 데이터를 사용자가 보기 좋은 텍스트로 변환하는 함수
function formatChartResult(chartData: NatalChartData): string {
    if (!chartData || !chartData.planets) return "차트 데이터를 분석할 수 없습니다.";

    const sun = chartData.planets.find(p => p.name === 'Sun');
    const moon = chartData.planets.find(p => p.name === 'Moon');
    
    if (!sun || !moon) return "주요 행성 정보를 찾을 수 없습니다.";

    return `당신의 차트 분석 결과입니다:\n- 태양은 ${sun.sign}자리의 ${sun.degree}도에 위치하며, ${sun.house} 하우스에 있습니다.\n- 달은 ${moon.sign}자리의 ${moon.degree}도에 위치하며, ${moon.house} 하우스에 있습니다.`;
}