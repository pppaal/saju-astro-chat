import type { IcpNarrative } from '@/lib/icp/narrative'

interface ConfidenceDisclosureProps {
  confidence: IcpNarrative['confidence']
  whyThisResult: IcpNarrative['whyThisResult']
  disclaimers: IcpNarrative['disclaimers']
  styles: Record<string, string>
}

export default function ConfidenceDisclosure({
  confidence,
  whyThisResult,
  disclaimers,
  styles,
}: ConfidenceDisclosureProps) {
  return (
    <section className={styles.confidenceSection} aria-labelledby="confidence-heading">
      <h2 id="confidence-heading" className={styles.sectionTitlePremium}>
        신뢰도와 해석 가이드
      </h2>
      <details className={styles.confidenceDisclosure}>
        <summary>
          신뢰도 {confidence.score}% ({confidence.levelLabel}) 자세히 보기
        </summary>
        <div className={styles.confidenceBody}>
          <p className={styles.confidenceMeaning}>{confidence.whatItMeans}</p>
          <article>
            <h3>이 결과가 나온 이유</h3>
            <p>{whyThisResult.summary}</p>
            <ul>
              {whyThisResult.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>해석 방법</h3>
            <ul>
              {confidence.howToUse.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>비임상 고지</h3>
            <p>{disclaimers.nonClinical}</p>
            <p>{disclaimers.variability}</p>
          </article>
        </div>
      </details>
    </section>
  )
}
