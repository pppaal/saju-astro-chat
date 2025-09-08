// 파일 위치: src/components/IChingReader.tsx
"use client";

import React, { useState } from 'react';
import { IChingData, Hexagram } from '@/lib/iChingData';
import HexagramLine from './HexagramLine';

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

  const handleDivination = async () => {
    setStatus('drawing');
    setResult(null);
    setDrawnLines([]);

    let lines: LineResult[] = [];
    let primaryBinary = '';
    let resultingBinary = '';

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

    // [수정!] 데이터 검색 후, 결과가 없을 경우를 대비한 안전장치 추가
    const primaryHexagram = IChingData.find(h => h.binary === primaryBinary);
    
    // [수정!] primaryHexagram을 찾지 못하면, 에러 메시지를 설정하고 함수를 종료합니다.
    if (!primaryHexagram) {
        console.error("주역 데이터를 찾을 수 없습니다. Binary:", primaryBinary);
        setResult({ error: "해당 괘의 데이터를 찾을 수 없습니다. 데이터를 확인해주세요." });
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

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setDrawnLines([]);
  }

  // [수정!] 결과를 표시하는 부분을 함수로 분리하여 가독성 향상
  const renderResult = () => {
    if (!result) return null;

    if (result.error) {
        return <p style={{color: 'red'}}>{result.error}</p>;
    }

    return (
        <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', textAlign: 'left' }}>
          <h2>오늘의 괘: {result.primaryHexagram.koreanName} ({result.primaryHexagram.name} {result.primaryHexagram.symbol})</h2>
          <p style={{marginTop: '1rem'}}><strong>[괘사(卦辭)]</strong> {result.primaryHexagram.judgment}</p>
          <p style={{marginTop: '0.5rem', color: '#ccc'}}><strong>[상(象)]</strong> {result.primaryHexagram.image}</p>
          
          {result.changingLines.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
              <h3 style={{color: '#ffdd00'}}>[변화의 조짐 (동효)]</h3>
              {result.changingLines.map((line: any) => <p key={line.index} style={{marginTop: '0.5rem'}}>- {line.text}</p>)}
            </div>
          )}

          {result.resultingHexagram && (
             <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
              <h3>[변화 후의 괘: {result.resultingHexagram.koreanName} ({result.resultingHexagram.name} {result.resultingHexagram.symbol})]</h3>
              <p style={{marginTop: '0.5rem'}}>{result.resultingHexagram.judgment}</p>
            </div>
          )}
        </div>
    );
  }

  return (
    <div style={{ color: 'white', textAlign: 'center', padding: '2rem', zIndex: 10, width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: '1px solid white', color: 'white', padding: '8px 12px', cursor: 'pointer' }}>
        ← 메뉴로
      </button>
      
      <h1>주역으로 보는 지혜</h1>

      <div style={{ width: '100px', height: '200px', margin: '2rem auto', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-start' }}>
        {(status === 'drawing' || status === 'finished') && (
            drawnLines.length > 0 ? drawnLines.map((line, index) => (
                <HexagramLine key={index} type={line.value === 1 ? 'solid' : 'broken'} isChanging={line.isChanging} />
            )) : (
              result?.primaryHexagram.binary.split('').map((val: string, index: number) => {
                const lineInfo = result.changingLines.find((l: any) => l.index === index);
                return <HexagramLine key={index} type={val === '1' ? 'solid' : 'broken'} isChanging={!!lineInfo} />
              })
            )
        )}
      </div>

      {status === 'idle' && (
        <>
          <p style={{ margin: '1rem 0' }}>마음을 가다듬고 버튼을 눌러 별의 인도를 받으세요.</p>
          <button onClick={handleDivination} className="submit-button">운세 보기</button>
        </>
      )}

      {status === 'drawing' && <p>괘를 뽑는 중...</p>}

      {status === 'finished' && (
        <>
          {renderResult()}
          <button onClick={reset} className="submit-button" style={{marginTop: '2rem'}}>다시하기</button>
        </>
      )}
    </div>
  );
};

export default IChingReader;