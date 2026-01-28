import type { FC } from 'react';
import { Section, AnalysisCard, CardRow, CardDesc, ScoreBar } from '../components';
import type { AdvancedAnalysis } from '../types';

interface Props {
  advancedAnalysis: AdvancedAnalysis;
}

const AdvancedAnalysisSection: FC<Props> = ({ advancedAnalysis }) => (
  <>
    {/* Geokguk/Yongsin section */}
    {(advancedAnalysis.geokguk || advancedAnalysis.yongsin) && (
      <Section title="격국 · 용신 분석">
        <div className="flex flex-wrap gap-4">
          {advancedAnalysis.geokguk && (
            <AnalysisCard title="격국 (格局)" colorClass="border-blue-400/40 text-blue-400">
              <CardRow label="격국" value={advancedAnalysis.geokguk.primary || '미정'} />
              {advancedAnalysis.geokguk.category && (
                <CardRow label="분류" value={advancedAnalysis.geokguk.category} />
              )}
              {advancedAnalysis.geokguk.confidence && (
                <CardRow label="확신도" value={advancedAnalysis.geokguk.confidence} />
              )}
              {advancedAnalysis.geokguk.description && (
                <CardDesc>{advancedAnalysis.geokguk.description}</CardDesc>
              )}
            </AnalysisCard>
          )}
          {advancedAnalysis.yongsin && (
            <AnalysisCard title="용신 (用神)" colorClass="border-yellow-400/40 text-yellow-400">
              <CardRow label="용신" value={advancedAnalysis.yongsin.primaryYongsin || '-'} />
              {advancedAnalysis.yongsin.secondaryYongsin && (
                <CardRow label="희신" value={advancedAnalysis.yongsin.secondaryYongsin} />
              )}
              {advancedAnalysis.yongsin.kibsin && (
                <CardRow label="기신" value={advancedAnalysis.yongsin.kibsin} />
              )}
              {advancedAnalysis.yongsin.daymasterStrength && (
                <CardRow label="신강/신약" value={advancedAnalysis.yongsin.daymasterStrength} />
              )}
              {advancedAnalysis.yongsin.luckyColors && (
                <CardRow label="행운색" value={advancedAnalysis.yongsin.luckyColors.join(', ')} />
              )}
              {advancedAnalysis.yongsin.luckyDirection && (
                <CardRow label="행운방향" value={advancedAnalysis.yongsin.luckyDirection} />
              )}
              {advancedAnalysis.yongsin.luckyNumbers && (
                <CardRow label="행운숫자" value={advancedAnalysis.yongsin.luckyNumbers.join(', ')} />
              )}
              {advancedAnalysis.yongsin.description && (
                <CardDesc>{advancedAnalysis.yongsin.description}</CardDesc>
              )}
              {advancedAnalysis.yongsin.reasoning && (
                <p className="text-xs text-gray-500 mt-2 italic">{advancedAnalysis.yongsin.reasoning}</p>
              )}
            </AnalysisCard>
          )}
        </div>
      </Section>
    )}

    {/* Tonggeun/Deukryeong/Johu section */}
    <Section title="통근 · 득령 · 조후용신">
      <div className="flex flex-wrap gap-4 relative min-h-[200px]">
        {advancedAnalysis.tonggeun && (
          <AnalysisCard title="통근 (通根)" colorClass="border-emerald-400/40 text-emerald-400">
            <CardRow label="통근 강도" value={String(advancedAnalysis.tonggeun.totalStrength || 0)} />
            {advancedAnalysis.tonggeun.roots?.map((root, i) => (
              <CardRow key={i} label={root.pillar} value={`${root.branch} (${root.type}, ${root.strength})`} />
            ))}
          </AnalysisCard>
        )}
        {advancedAnalysis.deukryeong && (
          <AnalysisCard title="득령 (得令)" colorClass="border-red-400/40 text-red-400">
            <CardRow label="상태" value={advancedAnalysis.deukryeong.status || '-'} />
            <CardRow label="점수" value={String(advancedAnalysis.deukryeong.strength || 0)} />
            {advancedAnalysis.deukryeong.description && (
              <CardDesc>{advancedAnalysis.deukryeong.description}</CardDesc>
            )}
          </AnalysisCard>
        )}
        {advancedAnalysis.johuYongsin && (
          <AnalysisCard title="조후용신 (調候用神)" colorClass="border-indigo-400/40 text-indigo-400">
            {advancedAnalysis.johuYongsin.primary && (
              <CardRow label="제1용신" value={advancedAnalysis.johuYongsin.primary} />
            )}
            {advancedAnalysis.johuYongsin.secondary && (
              <CardRow label="제2용신" value={advancedAnalysis.johuYongsin.secondary} />
            )}
            {advancedAnalysis.johuYongsin.seasonalNeed && (
              <CardRow label="계절적 필요" value={advancedAnalysis.johuYongsin.seasonalNeed} />
            )}
            {advancedAnalysis.johuYongsin.interpretation && (
              <CardDesc>{advancedAnalysis.johuYongsin.interpretation}</CardDesc>
            )}
          </AnalysisCard>
        )}
      </div>
    </Section>

    {/* Sibsin section */}
    <Section title="십신 분석">
      <div className="flex flex-wrap gap-4 relative min-h-[200px]">
        {advancedAnalysis.sibsin && (
          <>
            {advancedAnalysis.sibsin.count && (
              <AnalysisCard title="십신 분포" colorClass="border-amber-400/40 text-amber-400">
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(advancedAnalysis.sibsin.count).map(([name, cnt]) => (
                    cnt > 0 && (
                      <div key={name} className="flex flex-col items-center p-2 bg-white/5 rounded-lg">
                        <span className="text-xs text-gray-400 mb-1">{name}</span>
                        <span className="text-base font-bold text-gray-200">{cnt}</span>
                      </div>
                    )
                  ))}
                </div>
              </AnalysisCard>
            )}
            {advancedAnalysis.sibsin.careerAptitude && advancedAnalysis.sibsin.careerAptitude.length > 0 && (
              <AnalysisCard title="직업 적성" colorClass="border-blue-400/40 text-blue-400">
                {advancedAnalysis.sibsin.careerAptitude.map((apt, i) => (
                  <CardRow key={i} label={apt.field} value={`${apt.score}점 - ${apt.reason}`} />
                ))}
              </AnalysisCard>
            )}
            {advancedAnalysis.sibsin.personality && (
              <AnalysisCard title="성격 분석" colorClass="border-purple-400/40 text-purple-400">
                {advancedAnalysis.sibsin.personality.strengths?.length ? (
                  <CardRow label="강점" value={advancedAnalysis.sibsin.personality.strengths.join(', ')} />
                ) : null}
                {advancedAnalysis.sibsin.personality.weaknesses?.length ? (
                  <CardRow label="약점" value={advancedAnalysis.sibsin.personality.weaknesses.join(', ')} />
                ) : null}
              </AnalysisCard>
            )}
          </>
        )}
      </div>
    </Section>

    {/* Health/Career section */}
    <Section title="건강 · 직업 분석">
      <div className="flex flex-wrap gap-4 relative min-h-[200px]">
        {advancedAnalysis.health && (
          <AnalysisCard title="건강 분석" colorClass="border-red-500/40 text-red-500">
            {advancedAnalysis.health.constitution && (
              <CardRow label="체질" value={advancedAnalysis.health.constitution} />
            )}
            {advancedAnalysis.health.organHealth?.map((org, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-white/10 text-sm">
                <span className="text-gray-400">{org.organ} ({org.element}):</span>
                <span className={`font-medium ${
                  org.status === 'weak' || org.status === 'vulnerable' ? 'text-red-400' :
                  org.status === 'strong' ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  {org.status} (점수: {org.score})
                </span>
              </div>
            ))}
            {advancedAnalysis.health.preventionAdvice?.length ? (
              <CardDesc>{advancedAnalysis.health.preventionAdvice.join(', ')}</CardDesc>
            ) : null}
          </AnalysisCard>
        )}
        {advancedAnalysis.career && (
          <AnalysisCard title="직업 적성" colorClass="border-sky-500/40 text-sky-500">
            {advancedAnalysis.career.primaryFields?.map((field, i) => (
              <CardRow key={i} label={field.category} value={`${field.fitScore}점 - ${field.jobs?.slice(0, 3).join(', ')}`} />
            ))}
            {advancedAnalysis.career.workStyle && (
              <>
                <div className="mt-2 pt-2 border-t border-white/10">
                  <CardRow label="업무 스타일" value={advancedAnalysis.career.workStyle.type || '-'} />
                </div>
                {advancedAnalysis.career.workStyle.description && (
                  <p className="text-xs text-slate-400 mt-1">{advancedAnalysis.career.workStyle.description}</p>
                )}
                {advancedAnalysis.career.workStyle.strengths?.length ? (
                  <CardRow label="강점" value={advancedAnalysis.career.workStyle.strengths.join(', ')} />
                ) : null}
                {advancedAnalysis.career.workStyle.idealEnvironment?.length ? (
                  <CardRow label="이상적 환경" value={advancedAnalysis.career.workStyle.idealEnvironment.join(', ')} />
                ) : null}
              </>
            )}
            {advancedAnalysis.career.careerAdvice?.length ? (
              <CardDesc>{advancedAnalysis.career.careerAdvice.join(' ')}</CardDesc>
            ) : null}
          </AnalysisCard>
        )}
      </div>
    </Section>

    {/* Score section */}
    <Section title="종합 점수">
      {advancedAnalysis.score && (
        <div className="flex flex-col gap-6 bg-slate-800 p-6 rounded-xl border border-slate-600 relative min-h-[200px]">
          {/* Total Score */}
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/15 to-yellow-500/15 rounded-xl">
            <div className="text-sm text-gray-400 mb-2">종합 점수</div>
            <div className="text-4xl font-extrabold text-yellow-400">{advancedAnalysis.score.overall ?? '-'}</div>
            {advancedAnalysis.score.grade && (
              <div className="text-base text-blue-400 mt-1">{advancedAnalysis.score.grade}등급</div>
            )}
          </div>

          {/* Score Breakdown */}
          <div className="flex flex-col gap-3">
            {advancedAnalysis.score.strength && (
              <ScoreBar
                label="신강/신약"
                value={advancedAnalysis.score.strength.total || 0}
                suffix={advancedAnalysis.score.strength.level}
              />
            )}
            {advancedAnalysis.score.geokguk && (
              <>
                <ScoreBar label="격국 순수도" value={advancedAnalysis.score.geokguk.purity || 0} />
                <ScoreBar label="격국 안정도" value={advancedAnalysis.score.geokguk.stability || 0} />
              </>
            )}
            {advancedAnalysis.score.yongsin && (
              <ScoreBar label="용신 적합도" value={advancedAnalysis.score.yongsin.fitScore || 0} />
            )}
          </div>

          {advancedAnalysis.score.summary && (
            <CardDesc>{advancedAnalysis.score.summary}</CardDesc>
          )}

          {advancedAnalysis.score.strengths?.length ? (
            <div className="mt-3">
              <span className="block text-gray-400 text-sm mb-1">강점:</span>
              <ul className="list-disc pl-5 text-emerald-400 text-sm">
                {advancedAnalysis.score.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          ) : null}
          {advancedAnalysis.score.weaknesses?.length ? (
            <div className="mt-2">
              <span className="block text-gray-400 text-sm mb-1">약점:</span>
              <ul className="list-disc pl-5 text-red-400 text-sm">
                {advancedAnalysis.score.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          ) : null}
          {advancedAnalysis.score.recommendations?.length ? (
            <div className="mt-2">
              <span className="block text-gray-400 text-sm mb-1">추천:</span>
              <ul className="list-disc pl-5 text-yellow-400 text-sm">
                {advancedAnalysis.score.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Section>

    {/* Report section */}
    <Section title="종합 리포트">
      {advancedAnalysis.report && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 relative min-h-[200px]">
          {advancedAnalysis.report.summary && (
            <div className="mb-5 pb-4 border-b border-white/10">
              <h4 className="text-base font-semibold text-yellow-400 mb-2">요약</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{advancedAnalysis.report.summary}</p>
            </div>
          )}
          {advancedAnalysis.report.sections?.map((sec, i) => (
            <div key={i} className="mb-5 pb-4 border-b border-white/10 last:border-b-0">
              <h4 className="text-base font-semibold text-yellow-400 mb-2">{sec.title}</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{sec.content}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  </>
);

export default AdvancedAnalysisSection;
