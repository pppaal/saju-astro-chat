import React from 'react';

// 이 컴포넌트가 어떤 종류의 정보(props)를 받을지 정의합니다.
interface ResultDisplayProps {
  result: any;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
    // 결과가 없으면 아무것도 보여주지 않습니다.
    if (!result) return null;

    // 오류가 있다면, 오류 메시지를 보여줍니다.
    if (result.error) return <p style={{color: 'red'}}>{result.error}</p>;

    // 오류가 없다면, 전달받은 'result'를 사용해서 결과를 보여줍니다.
    return (
        <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', textAlign: 'left', backdropFilter: 'blur(5px)' }}>
            
            <h2>Today's Hexagram: {result.primaryHexagram.name} {result.primaryHexagram.symbol}</h2>
            <p style={{marginTop: '1rem'}}><strong>[Judgment]</strong> {result.primaryHexagram.judgment}</p>
            <p style={{marginTop: '0.5rem', color: '#ccc'}}><strong>[Image]</strong> {result.primaryHexagram.image}</p>
            
            {result.changingLines.length > 0 && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
                    <h3 style={{color: '#ffdd00'}}>[Changing Lines]</h3>
                    {result.changingLines.map((line: any) => <p key={line.index} style={{marginTop: '0.5rem'}}>- {line.text}</p>)}
                </div>
            )}

            {result.resultingHexagram && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
                    <h3>[Resulting Hexagram: {result.resultingHexagram.name} {result.resultingHexagram.symbol}]</h3>
                    <p style={{marginTop: '0.5rem'}}>{result.resultingHexagram.judgment}</p>
                </div>
            )}
        </div>
    );
};

export default ResultDisplay;
