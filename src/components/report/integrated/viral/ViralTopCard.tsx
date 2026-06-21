/**
 * ViralTopCard — 무료 리포트 맨 위 "한 장 요약". 사주·점성을 몰라도 0.5초에
 * "헐 완전 나야"가 오게: 유형 별명 + 소름 한 줄 + 강점 해시태그 + 동·서양 일치
 * 훅 + 궁합. 한자·전문용어는 아래 섹션(더보기)에 그대로 두고, 여기선 평어만.
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
  return (
    <div className={s.card}>
      <div className={s.crown}>
        <span className={s.emoji}>{summary.emoji}</span>
        <span className={s.eyebrow}>{ko ? '당신의 유형' : 'Your type'}</span>
      </div>
      <h2 className={s.name}>{summary.name}</h2>
      <p className={s.oneLiner}>{summary.oneLiner}</p>

      {summary.outer && (
        <p className={s.outer}>
          <b>{ko ? '겉모습' : 'Outer'}</b> {ko ? `${summary.outer} 인상` : summary.outer}
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

      {(summary.resonant.length > 0 || summary.partner) && <div className={s.divider} />}

      {summary.resonant.length > 0 && (
        <p className={s.hook}>
          <span className={s.hookIcon}>🔮</span>
          <span>
            {ko ? '사주와 별자리가 ' : 'Saju and astrology both point to '}
            <b>{summary.resonant.join(' · ')}</b>
            {ko
              ? `${eulReul(summary.resonant.join(' · '))} 둘 다 가리켜요 — 그래서 더 확실해요.`
              : ' — that’s why it’s extra solid.'}
          </span>
        </p>
      )}

      {summary.partner && (
        <p className={s.partner}>
          <span className={s.hookIcon}>💞</span>
          <span>
            {ko ? '잘 맞는 사람: ' : 'Best match: '}
            <b>{summary.partner}</b>
          </span>
        </p>
      )}

      {action && <div className={s.action}>{action}</div>}
    </div>
  )
}
