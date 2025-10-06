'use client';

import { useState, FormEvent, useMemo } from 'react';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import ResultDisplay from '@/components/astrology/ResultDisplay';

export default function Home() {
  // --- 💡 1. date와 time 상태 추가 ---
  // 기본값을 설정하여 페이지 로드 시 입력 필드가 채워지도록 합니다.
  const [date, setDate] = useState('1995-02-09');
  const [time, setTime] = useState('06:40');
  // --- 수정 끝 ---

  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState<string>(getUserTimezone() || 'Asia/Seoul');

  // --- 💡 2. handleSubmit 함수 로직 수정 ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 페이지 새로고침 방지
    setIsLoading(true);
    setError(null);
    setInterpretation(null);

    // 디버깅: 서버로 보내기 직전의 데이터를 콘솔에 출력
    console.log('서버로 전송할 데이터:', { date, time, timeZone });

    try {
      // 백엔드 API가 요구하는 형식에 맞춰 데이터를 준비합니다.
      const body = {
        date: date,          // 상태 변수에서 가져온 "YYYY-MM-DD" 형식의 문자열
        time: time,          // 상태 변수에서 가져온 "HH:MM" 형식의 문자열
        latitude: 37.5665,   // 서울 위도 (고정값)
        longitude: 126.9780, // 서울 경도 (고정값)
        // timeZone은 현재 백엔드에서 사용하지 않지만, 추후 확장을 위해 포함 가능
      };

      // 우리 백엔드 API(/api/astrology)를 호출합니다.
      const response = await fetch('/api/astrology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();

      if (!response.ok) {
        // 서버에서 보낸 에러 메시지를 화면에 표시합니다.
        throw new Error(result.error || `서버 응답 오류: ${response.status}`);
      }

      // 성공적으로 받은 데이터에서 'interpretation' 값을 상태에 저장합니다.
      if (result.interpretation) {
        setInterpretation(result.interpretation);
      } else {
        throw new Error("서버 응답에 분석 데이터가 없습니다.");
      }

    } catch (err: any) {
      console.error("폼 제출 중 에러 발생:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  // --- 수정 끝 ---


  // --- 💡 3. JSX(디자인) 부분에 상태 연결 ---
  // 기존 디자인 코드는 그대로 두고, input 태그에만 value와 onChange를 추가합니다.
  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0px); } }
        @keyframes pan-background { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .fade-in-card { animation: fadeIn 1s ease-out forwards; }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>
      <main
        className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-8 text-white font-sans overflow-hidden"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop')",
          backgroundSize: '150% auto',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          animation: 'pan-background 90s linear infinite',
        }}
      >
        <button type="button" onClick={() => window.history.back()} aria-label="Go back" className="absolute left-4 top-4 md:left-6 md:top-6 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/30 text-white/85 backdrop-blur-sm text-xl hover:bg-black/45 transition-colors">
          ←
        </button>
        <div className="w-full max-w-3xl mx-auto bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 md:p-10 lg:p-14 fade-in-card animate-float">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">AI Natal Chart</h1>
            <p className="text-base md:text-lg text-indigo-200">Discover your cosmic map based on your birth information.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-indigo-100 mb-2">Date of Birth</label>
                {/* value와 onChange를 추가하여 React 상태와 연결합니다. */}
                <input type="date" id="date" name="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"/>
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-indigo-100 mb-2">Time of Birth</label>
                {/* value와 onChange를 추가하여 React 상태와 연결합니다. */}
                <input type="time" id="time" name="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"/>
              </div>
            </div>
            <div><label htmlFor="city" className="block text-sm font-medium text-indigo-100 mb-2">City of Birth</label><input type="text" id="city" name="city" required defaultValue="Seoul" placeholder="e.g., Seoul, London, New York" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"/></div>
            <div><label htmlFor="gender" className="block text-sm font-medium text-indigo-100 mb-2">Gender</label><select id="gender" name="gender" required className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none"><option value="male" className="bg-gray-900 text-white">Male</option><option value="female" className="bg-gray-900 text-white">Female</option><option value="other" className="bg-gray-900 text-white">Other</option></select></div>
            <div><label htmlFor="timeZone" className="block text-sm font-medium text-indigo-100 mb-2">Time Zone</label><select id="timeZone" name="timeZone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none">{timezones.map((tz) => (<option key={tz} value={tz} className="bg-gray-900 text-white">{tz}</option>))}</select></div>
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400/50 text-white font-bold py-3.5 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center text-lg">{isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Analyzing...</>) : ('Generate My Chart')}</button>
          </form>
          <ResultDisplay isLoading={isLoading} error={error} interpretation={interpretation} />
        </div>
      </main>
    </>
  );
}