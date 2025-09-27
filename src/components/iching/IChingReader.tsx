"use client";

import React, { useState } from 'react';
// lib 폴더의 데이터와, 같은 폴더에 있는 다른 부품들을 불러옵니다.
import { IChingData } from '@/lib/iChing/iChingData';
import HexagramLine from './HexagramLine';
import ResultDisplay from '@/components/iching/ResultDisplay';

// 이 컴포넌트가 어떤 종류의 정보(props)를 받을지 정의합니다.
interface IChingReaderProps {
  onBack: () => void;
}

type LineResult = { value: number; isChanging: boolean };
type DivinationStatus = 'idle' | 'drawing' | 'finished';

const IChingReader: React.FC<IChingReaderProps> = ({ onBack }) => {
    const [result, setResult] = useState<any>(null);
    const [status, setStatus] = useState<DivinationStatus>('idle');
    const [drawnLines, setDrawnLines] = useState<LineResult[]>([]);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // '운세 보기' 버튼을 눌렀을 때 실행되는 함수입니다.
    const handleDivination = async () => {
        setStatus('drawing');
        setResult(null);
        setDrawnLines([]);

        let lines: LineResult[] = [];
        let primaryBinary = '';
        let resultingBinary = '';

        // 6번 반복하며 효를 하나씩 뽑습니다.
        for (let i = 0; i < 6; i++) {
            await delay(500);
            const sum = (Math.floor(Math.random() * 2) + 2) + (Math.floor(Math.random() * 2) + 2) + (Math.floor(Math.random() * 2) + 2);
            let currentLine: LineResult;

            if (sum === 6) { currentLine = { value: 0, isChanging: true }; primaryBinary += '0'; resultingBinary += '1'; }
            else if (sum === 7) { currentLine = { value: 1, isChanging: false }; primaryBinary += '1'; resultingBinary += '1'; }
            else if (sum === 8) { currentLine = { value: 0, isChanging: false }; primaryBinary += '0'; resultingBinary += '0'; }
            else { currentLine = { value: 1, isChanging: true }; primaryBinary += '1'; resultingBinary += '0'; }
            
            lines.push(currentLine);
            setDrawnLines([...lines]);
        }

        await delay(500);

        // 뽑힌 효 조합(이진수)으로 데이터 파일에서 괘를 찾습니다.
        const primaryHexagram = IChingData.find(h => h.binary === primaryBinary);
        
        if (!primaryHexagram) {
            console.error("IChing data not found for binary:", primaryBinary);
            setResult({ error: "Could not find the corresponding hexagram. Please check the data." });
            setStatus('finished');
            return;
        }

        const resultingHexagram = primaryBinary !== resultingBinary ? IChingData.find(h => h.binary === resultingBinary) : null;
        const changingLines = lines.map((line, index) => ({ ...line, index }))
                                     .filter(line => line.isChanging)
                                     .map(line => ({ index: line.index, text: primaryHexagram.lines[line.index] }));

        setResult({ primaryHexagram, changingLines, resultingHexagram });
        setStatus('finished');
    };

    // '다시하기' 버튼을 누르면 모든 것을 초기 상태로 되돌립니다.
    const reset = () => {
        setStatus('idle');
        setResult(null);
        setDrawnLines([]);
    }

    return (
        <div style={{ color: 'white', textAlign: 'center', zIndex: 10, width: '100%', maxWidth: '600px', margin: '0 auto' }}>
             <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid white', color: 'white', padding: '8px 12px', cursor: 'pointer', borderRadius: '8px' }}>
                ← Back to Menu
             </button>
            


             {/* 괘의 효(선)들이 그려지는 공간입니다. */}
             <div style={{ width: '100px', height: '200px', margin: '2rem auto', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-start' }}>
                { (status === 'drawing' || status === 'finished') && drawnLines.map((line, index) => (
                    <HexagramLine key={index} type={line.value === 1 ? 'solid' : 'broken'} isChanging={line.isChanging} />
                ))}
             </div>

             {/* 상태에 따라 다른 버튼과 메시지를 보여줍니다. */}
             {status === 'idle' && (
                <>
                    <p style={{ margin: '1rem 0' }}>Calm your mind and press the button to receive guidance.</p>
                    <button onClick={handleDivination} className="submit-button">Cast Hexagram</button>
                </>
             )}

             {status === 'drawing' && <p>Casting the lines...</p>}

             {status === 'finished' && (
                <>
                    {/* 점괘가 끝나면 ResultDisplay 컴포넌트를 불러 결과를 보여줍니다. */}
                    <ResultDisplay result={result} />
                    <button onClick={reset} className="submit-button" style={{marginTop: '2rem'}}>Cast Again</button>
                </>
             )}
        </div>
    );
};

export default IChingReader;

