// 파일 경로: src/app/components/ResultDisplay.tsx
interface ResultDisplayProps {
    interpretation: string | null;
    isLoading: boolean;
    error: string | null;
}

export default function ResultDisplay({ interpretation, isLoading, error }: ResultDisplayProps) {
    // 로딩 중일 때는 메인 페이지의 버튼에서 상태를 보여주므로 여기서는 null을 반환해도 좋습니다.
    // 혹은 로딩 상태를 여기서도 표시하고 싶다면 아래 주석을 해제하세요.
    /*
    if (isLoading) {
        return (
            <div className="w-full max-w-2xl mt-8 text-center">
                <p className="text-lg text-gray-600">당신의 우주를 분석 중입니다... 잠시만 기다려주세요.</p>
            </div>
        );
    }
    */

    if (error) {
        return (
            <div className="w-full mt-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h3 className="font-bold">오류 발생!</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!interpretation) {
        return null; // 초기 상태 또는 로딩 중에는 아무것도 보여주지 않음
    }

    return (
        <div className="w-full mt-8 bg-white p-8 rounded-lg shadow-inner border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">차트 해석 결과</h2>
            {/* AI가 생성한 텍스트의 줄바꿈을 그대로 보여주기 위해 pre-wrap 사용 */}
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{interpretation}</p>
        </div>
    );
}