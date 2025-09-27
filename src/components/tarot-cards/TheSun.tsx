// src/components/tarot-cards/TheSun.tsx

// SVG 코드는 React 컴포넌트 안에 바로 작성할 수 있습니다.
// fill, stroke 등의 속성을 바꿔서 쉽게 색상을 커스터마이징 할 수 있습니다.
const TheSun = () => (
  <svg viewBox="0 0 120 204" fill="none" xmlns="http://www.w3.org/2000/svg" width="200" height="340">
    {/* 카드 배경과 테두리 */}
    <rect width="120" height="204" rx="10" fill="#FFFDE7"/>
    <rect x="5" y="5" width="110" height="194" rx="5" stroke="#FFC107" strokeWidth="2"/>

    {/* 태양 */}
    <circle cx="60" cy="60" r="25" fill="#FFECB3" stroke="#FFA000" strokeWidth="2"/>
    {/* 태양 광선 (간단한 선으로 표현) */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
      <line
        key={angle}
        x1="60"
        y1="60"
        x2={60 + 35 * Math.cos(angle * Math.PI / 180)}
        y2={60 + 35 * Math.sin(angle * Math.PI / 180)}
        stroke="#FFA000"
        strokeWidth="1.5"
      />
    ))}

    {/* 하단의 상징 (추상적인 언덕) */}
    <path d="M5 160 C 30 140, 90 140, 115 160 L 115 199 L 5 199 Z" fill="#FFF9C4" />

    {/* 카드 번호와 이름 */}
    <text x="60" y="25" textAnchor="middle" fontSize="12" fill="#E65100" fontWeight="bold">19</text>
    <text x="60" y="185" textAnchor="middle" fontSize="14" fill="#E65100" fontWeight="bold">THE SUN</text>
  </svg>
);

export default TheSun;