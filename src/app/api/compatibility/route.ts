import { NextRequest, NextResponse } from 'next/server';

type Relation = 'friend' | 'lover' | 'other';

type PersonInput = {
  name?: string;
  date: string;     // YYYY-MM-DD
  time: string;     // HH:mm
  city: string;
  latitude: number;
  longitude: number;
  timeZone: string; // e.g., Asia/Seoul

  // new: relation to Person 1 (undefined for Person 1)
  relationToP1?: Relation;
  relationNoteToP1?: string;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function relationWeight(r?: Relation) {
  if (!r) return 1.0;
  if (r === 'lover') return 1.0;
  if (r === 'friend') return 0.95;
  return 0.9; // other
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const persons: PersonInput[] = Array.isArray(body?.persons) ? body.persons : [];

    // 검증
    if (persons.length < 2 || persons.length > 4) {
      return bad('인원수는 2~4명만 지원합니다.');
    }
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      if (!p?.date || !p?.time || !p?.timeZone) return bad(`${i + 1}번째 인원의 필수 항목이 비었습니다.`);
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') {
        return bad(`${i + 1}번째 인원의 위도/경도가 유효하지 않습니다.`);
      }
      if (i > 0 && !p.relationToP1) {
        return bad(`${i + 1}번째 인원의 관계 유형을 선택해 주세요.`);
      }
      if (i > 0 && p.relationToP1 === 'other' && !p.relationNoteToP1?.trim()) {
        return bad(`${i + 1}번째 인원의 관계 메모를 입력해 주세요.`);
      }
    }

    // 더미 분석: 지리 기반 베이스 + 관계 가중치
    const names = persons.map((p, i) => p.name?.trim() || `Person ${i + 1}`);

    // 모든 페어 생성
    const pairs: [number, number][] = [];
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) pairs.push([i, j]);
    }

    const scores = pairs.map(([a, b]) => {
      const pa = persons[a];
      const pb = persons[b];
      const geo = Math.hypot(pa.latitude - pb.latitude, pa.longitude - pb.longitude);
      const base = Math.max(0, 100 - Math.min(100, Math.round(geo)));

      // 관계 가중치: Person 1 관련 페어는 상대의 relationToP1 사용.
      // 그 외 페어는 두 사람의 relationToP1을 평균 가중치로 사용.
      let weight = 1.0;
      if (a === 0) {
        weight = relationWeight(pb.relationToP1);
      } else if (b === 0) {
        weight = relationWeight(pa.relationToP1);
      } else {
        weight = (relationWeight(pa.relationToP1) + relationWeight(pb.relationToP1)) / 2;
      }

      const score = Math.round(base * weight);
      return { pair: [a, b], score };
    });

    const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);

    // 요약 텍스트
    const lines: string[] = [];
    lines.push(`인원: ${persons.length}명`);
    lines.push('');
    for (let i = 1; i < persons.length; i++) {
      const r = persons[i].relationToP1!;
      const rLabel = r === 'lover' ? '애인' : r === 'friend' ? '친구' : persons[i].relationNoteToP1 || '기타';
      lines.push(`• Person 1 ↔ ${names[i]}: ${rLabel}`);
    }
    lines.push('');
    scores.forEach(({ pair: [a, b], score }) => {
      lines.push(`• ${names[a]} × ${names[b]}: 호환도 ${score}/100`);
    });
    lines.push('');
    lines.push(`종합 호환도(평균): ${avg}/100`);
    lines.push('');
    lines.push('참고: 본 분석은 데모 점수입니다. 실제 버전에선 각 행성 각도/하우스 중첩/요소 균형 등을 계산해 상세 해석을 제공합니다.');

    return NextResponse.json({
      interpretation: lines.join('\n'),
      pairs: scores,
      average: avg,
    });
  } catch (e: any) {
    return bad(e?.message || '서버 내부 오류', 500);
  }
}