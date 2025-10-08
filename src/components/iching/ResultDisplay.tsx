import React from 'react';

// --- 데이터 타입 정의 ---

// 괘(Hexagram) 정보를 위한 타입
interface Hexagram {
  name: string;
  symbol: string;
  judgment: string;
  image: string;
}

// 변효(Changing Line) 정보를 위한 타입
interface ChangingLine {
  index: number;
  text: string;
}

// 주역(I Ching) 결과 전체를 위한 타입
interface IChingResult {
  primaryHexagram: Hexagram;
  changingLines: ChangingLine[];
  resultingHexagram?: Hexagram; // 변효가 있을 때만 존재하므로 optional
  error?: string;
}

// 컴포넌트가 받을 props 타입을 정의합니다.
interface ResultDisplayProps {
  result: IChingResult | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  // 결과가 없으면 아무것도 보여주지 않습니다.
  if (!result) {
    return null;
  }

  // 오류가 있다면, 오류 메시지를 보여줍니다.
  if (result.error) {
    return <p style={{ color: 'red' }}>{result.error}</p>;
  }

  // 오류가 없다면, 전달받은 'result'를 사용해서 결과를 보여줍니다.
  return (
    <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', textAlign: 'left', backdropFilter: 'blur(5px)' }}>
      {/* "Today's"의 작은따옴표 에러를 &apos;로 수정했습니다. */}
      <h2>Today&apos;s Hexagram: {result.primaryHexagram.name} {result.primaryHexagram.symbol}</h2>
      <p style={{ marginTop: '1rem' }}><strong>[Judgment]</strong> {result.primaryHexagram.judgment}</p>
      <p style={{ marginTop: '0.5rem', color: '#ccc' }}><strong>[Image]</strong> {result.primaryHexagram.image}</p>
      
      {result.changingLines.length > 0 && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
          <h3 style={{ color: '#ffdd00' }}>[Changing Lines]</h3>
          {/* map 안의 line 타입을 명확하게 지정했습니다. */}
          {result.changingLines.map((line: ChangingLine) => (
            <p key={line.index} style={{ marginTop: '0.5rem' }}>- {line.text}</p>
          ))}
        </div>
      )}

      {result.resultingHexagram && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
          <h3>[Resulting Hexagram: {result.resultingHexagram.name} {result.resultingHexagram.symbol}]</h3>
          <p style={{ marginTop: '0.5rem' }}>{result.resultingHexagram.judgment}</p>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
