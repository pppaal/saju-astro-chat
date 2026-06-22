/**
 * ViralTopCard — 무료 리포트 맨 위 "한 장 요약". 사주·점성을 몰라도 0.5초에
 * "헐 완전 나야"가 오게: 유형 별명 + 소름 한 줄 + 강점 해시태그 + 동·서양 일치
 * 훅 + 궁합. 한자·전문용어는 아래 섹션(더보기)에 그대로 두고, 여기선 평어만.
 * 미스틱 프리미엄 라이트 — 크림 카드 + 플럼/골드 + 셀레셜. 본문 톤(다크 공유카드와 별개).
 * 순수 표현 컴포넌트 — 데이터는 buildViralSummary 가 합성해 넘긴다.
 */
import s from './ViralTopCard.module.css'
import { eulReul } from '@/lib/i18n/koParticle'
import type { ViralSummary } from './viralArchetype'

export interface ViralTopCardProps {
  summary: ViralSummary
  lang: 'ko' | 'en'
  /** 공유 버튼 등 카드 하단에 끼울 액션(선택). */
  action?: React.ReactNode
}

export default function ViralTopCard({ summary, lang, action }: ViralTopCardProps) {
  const ko = lang === 'ko'
  const joinedResonant = summary.resonant.join(' · ')
  return (
    <div className={s.card}>
      <div className={s.aura} aria-hidden />
      <div className={s.inner}>
        <span className={s.eyebrow}>
          {ko ? '나의 사주 × 별자리 유형' : 'My Saju × Astrology type'}
        </span>

        <div className={s.medallion}>
          <span className={s.emoji}>{summary.emoji}</span>
        </div>

        <h2 className={s.name}>{summary.name}</h2>
        <p className={s.oneLiner}>{summary.oneLiner}</p>

        {summary.outer && (
          <p className={s.outer}>
            <span className={s.outerKey}>{ko ? '겉모습' : 'Outer'}</span>
            {ko ? `${summary.outer} 인상` : summary.outer}
          </p>
        )}

        {summary.hashtags.length > 0 && (
          <div className={s.tags}>
            {summary.hashtags.map((t, i) => (
              <span className={s.tag} key={i}>
                #{t.replace(/\s+/g, '')}
              </span>
            ))}
          </div>
        )}

        {(summary.resonant.length > 0 || summary.partner) && (
          <div className={s.facts}>
            {summary.resonant.length > 0 && (
              <div className={s.fact}>
                <span className={s.factIcon}>🔮</span>
                <p>
                  {ko
                    ? '사주와 별자리, 두 관점이 '
                    : 'Saju and astrology — both lenses point the same way on '}
                  <b>{joinedResonant}</b>
                  {ko ? `${eulReul(joinedResonant)} 같은 결로 가리켜요.` : '.'}
                </p>
              </div>
            )}
            {summary.partner && (
              <div className={s.fact}>
                <span className={s.factIcon}>💞</span>
                <p>
                  {ko ? '잘 맞는 사람: ' : 'Best match: '}
                  <b>{summary.partner}</b>
                </p>
              </div>
            )}
          </div>
        )}

        {action && <div className={s.action}>{action}</div>}
      </div>
    </div>
  )
}
