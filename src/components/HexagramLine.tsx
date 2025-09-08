// 파일 위치: src/components/HexagramLine.tsx

import React from 'react';

// 이 부품이 받을 정보의 종류를 정의합니다.
interface HexagramLineProps {
  type: 'solid' | 'broken'; // 양효(실선) 또는 음효(끊어진 선)
  isChanging?: boolean; // 변화하는 효(동효)인지 여부
}

const HexagramLine: React.FC<HexagramLineProps> = ({ type, isChanging }) => {
  const style: React.CSSProperties = {
    height: '10px',
    backgroundColor: isChanging ? '#ffdd00' : 'white', // 동효는 노란색으로 표시
    margin: '8px 0',
    borderRadius: '2px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    transition: 'all 0.3s ease-in-out', // 부드러운 등장을 위한 효과
  };

  // 음효(broken)일 경우, 가운데에 빈 공간을 만듭니다.
  if (type === 'broken') {
    return (
      <div style={style}>
        <div style={{
          position: 'absolute',
          width: '30%',
          height: '100%',
          backgroundColor: '#000' // 배경색과 동일하게 하여 끊어진 것처럼 보이게 함
        }}></div>
      </div>
    );
  }

  // 양효(solid)는 그냥 하나의 바로 그립니다.
  return <div style={style}></div>;
};

export default HexagramLine;