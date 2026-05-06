'use client'

import { memo } from 'react'
import type { TabProps } from '../types'
import { InsightCard, InsightContent, ScoreBar, Badge } from '../InsightCard'

const DeepAstroTab = memo(function DeepAstroTab({ data, isKo }: TabProps) {
  const {
    persons,
    houseOverlays,
    mercuryAspects,
    jupiterAspects,
    saturnAspects,
    outerPlanets,
    nodes,
  } = data

  const _person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1')
  const _person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2')

  return (
    <div className="space-y-6">
      {/* Deep Astro Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 border border-purple-500/30 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative text-center">
          <span className="text-5xl mb-4 block">🌌</span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-2">
            {isKo ? '심화 점성학 분석' : 'Deep Astrology Analysis'}
          </h2>
          <p className="text-purple-300">
            {isKo
              ? '수성, 목성, 토성, 외행성, 노드 분석'
              : 'Mercury, Jupiter, Saturn, Outer Planets, Nodes'}
          </p>
        </div>
      </div>

      {/* 수성 (Mercury) - 소통 */}
      <InsightCard
        emoji="☿️"
        title={isKo ? '수성 - 소통과 지성' : 'Mercury - Communication'}
        colorTheme="cyan"
      >
        <p className="text-gray-400 text-sm mb-4">
          {isKo
            ? '두 분의 대화 스타일과 지적 교감'
            : 'Your conversation style and intellectual connection'}
        </p>

        {mercuryAspects ? (
          <>
            <ScoreBar
              label={isKo ? '소통 호환성' : 'Communication Compatibility'}
              score={mercuryAspects.mercuryCompatibility}
              colorTheme="cyan"
            />

            <InsightContent colorTheme="cyan">
              <p className="text-cyan-300 font-medium mb-2">
                {isKo ? '대화 스타일' : 'Communication Style'}
              </p>
              <p className="text-gray-200 text-sm">{mercuryAspects.communicationStyle}</p>
            </InsightContent>

            <InsightContent colorTheme="cyan" className="mt-3">
              <p className="text-cyan-300 font-medium mb-2">
                {isKo ? '지적 시너지' : 'Intellectual Synergy'}
              </p>
              <p className="text-gray-200 text-sm">{mercuryAspects.intellectualSynergy}</p>
            </InsightContent>

            {mercuryAspects.strengths.length > 0 && (
              <div className="mt-4">
                <p className="text-emerald-300 font-medium text-sm mb-2">
                  {isKo ? '💬 강점' : '💬 Strengths'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {mercuryAspects.strengths.map((s, idx) => (
                    <Badge key={idx} text={s} colorTheme="emerald" size="sm" />
                  ))}
                </div>
              </div>
            )}

            {mercuryAspects.potentialMiscommunications.length > 0 && (
              <div className="mt-4">
                <p className="text-orange-300 font-medium text-sm mb-2">
                  {isKo ? '⚠️ 주의할 점' : '⚠️ Watch Out'}
                </p>
                <div className="space-y-2">
                  {mercuryAspects.potentialMiscommunications.map((m, idx) => (
                    <InsightContent key={idx} colorTheme="orange">
                      <p className="text-gray-200 text-sm">{m}</p>
                    </InsightContent>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <InsightContent colorTheme="cyan">
            <p className="text-gray-400 text-sm text-center">
              {isKo ? '수성 데이터가 필요합니다' : 'Mercury data needed for analysis'}
            </p>
          </InsightContent>
        )}
      </InsightCard>

      {/* 목성 (Jupiter) - 성장 */}
      <InsightCard
        emoji="♃"
        title={isKo ? '목성 - 성장과 행운' : 'Jupiter - Growth & Fortune'}
        colorTheme="amber"
      >
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '함께할 때 확장되는 영역과 행운' : 'Areas of expansion and luck when together'}
        </p>

        {jupiterAspects ? (
          <>
            <ScoreBar
              label={isKo ? '확장 호환성' : 'Expansion Compatibility'}
              score={jupiterAspects.expansionCompatibility}
              colorTheme="amber"
            />

            <InsightContent colorTheme="amber">
              <p className="text-amber-300 font-medium mb-2">
                {isKo ? '공유하는 신념' : 'Shared Beliefs'}
              </p>
              <p className="text-gray-200 text-sm">{jupiterAspects.sharedBeliefs}</p>
            </InsightContent>

            {jupiterAspects.blessingAreas.length > 0 && (
              <div className="mt-4">
                <p className="text-emerald-300 font-medium text-sm mb-2">
                  {isKo ? '🍀 축복받는 영역' : '🍀 Blessed Areas'}
                </p>
                <div className="space-y-2">
                  {jupiterAspects.blessingAreas.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10"
                    >
                      <span className="text-emerald-400">✨</span>
                      <p className="text-gray-300 text-sm">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {jupiterAspects.growthAreas.length > 0 && (
              <div className="mt-4">
                <p className="text-amber-300 font-medium text-sm mb-2">
                  {isKo ? '🌱 성장 영역' : '🌱 Growth Areas'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {jupiterAspects.growthAreas.map((g, idx) => (
                    <Badge key={idx} text={g} colorTheme="amber" size="sm" />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <InsightContent colorTheme="amber">
            <p className="text-gray-400 text-sm text-center">
              {isKo ? '목성 데이터가 필요합니다' : 'Jupiter data needed for analysis'}
            </p>
          </InsightContent>
        )}
      </InsightCard>

      {/* 토성 (Saturn) - 장기 */}
      <InsightCard
        emoji="♄"
        title={isKo ? '토성 - 책임과 장기 전망' : 'Saturn - Commitment & Long-term'}
        colorTheme="indigo"
      >
        <p className="text-gray-400 text-sm mb-4">
          {isKo
            ? '관계의 안정성과 장기적 잠재력'
            : 'Relationship stability and long-term potential'}
        </p>

        {saturnAspects ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="text-2xl font-bold text-indigo-300">
                  {saturnAspects.stabilityCompatibility}
                </div>
                <div className="text-xs text-gray-400 mt-1">{isKo ? '안정성' : 'Stability'}</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-300">
                  {saturnAspects.longTermPotential}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {isKo ? '장기 잠재력' : 'Long-term'}
                </div>
              </div>
            </div>

            <InsightContent colorTheme="indigo">
              <p className="text-indigo-300 font-medium mb-2">
                {isKo ? '카르마적 교훈' : 'Karmic Lesson'}
              </p>
              <p className="text-gray-200 text-sm">{saturnAspects.karmicLesson}</p>
            </InsightContent>

            <InsightContent colorTheme="indigo" className="mt-3">
              <p className="text-indigo-300 font-medium mb-2">
                {isKo ? '관계 구조' : 'Relationship Structure'}
              </p>
              <p className="text-gray-200 text-sm">{saturnAspects.structureInRelationship}</p>
            </InsightContent>

            {saturnAspects.maturityAreas.length > 0 && (
              <div className="mt-4">
                <p className="text-emerald-300 font-medium text-sm mb-2">
                  {isKo ? '🎓 성숙 영역' : '🎓 Maturity Areas'}
                </p>
                <div className="space-y-2">
                  {saturnAspects.maturityAreas.map((m, idx) => (
                    <InsightContent key={idx} colorTheme="emerald">
                      <p className="text-gray-200 text-sm">{m}</p>
                    </InsightContent>
                  ))}
                </div>
              </div>
            )}

            {saturnAspects.challenges.length > 0 && (
              <div className="mt-4">
                <p className="text-orange-300 font-medium text-sm mb-2">
                  {isKo ? '⚡ 도전 과제' : '⚡ Challenges'}
                </p>
                <div className="space-y-2">
                  {saturnAspects.challenges.map((c, idx) => (
                    <InsightContent key={idx} colorTheme="orange">
                      <p className="text-gray-200 text-sm">{c}</p>
                    </InsightContent>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <InsightContent colorTheme="indigo">
            <p className="text-gray-400 text-sm text-center">
              {isKo ? '토성 데이터가 필요합니다' : 'Saturn data needed for analysis'}
            </p>
          </InsightContent>
        )}
      </InsightCard>

      {/* 외행성 (Outer Planets) */}
      <InsightCard
        emoji="🪐"
        title={isKo ? '외행성 - 초월적 영향' : 'Outer Planets - Transcendent'}
        colorTheme="purple"
      >
        <p className="text-gray-400 text-sm mb-4">
          {isKo
            ? '천왕성, 해왕성, 명왕성의 세대적/영적 영향'
            : 'Generational and spiritual influences of Uranus, Neptune, Pluto'}
        </p>

        {outerPlanets ? (
          <>
            {/* Uranus */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">♅</span>
                <span className="text-purple-300 font-medium">
                  {isKo ? '천왕성 - 변화' : 'Uranus - Change'}
                </span>
                <Badge
                  text={`${outerPlanets.uranusInfluence.changeCompatibility}%`}
                  colorTheme="purple"
                  size="sm"
                />
              </div>
              <InsightContent colorTheme="purple">
                <p className="text-gray-200 text-sm">
                  {outerPlanets.uranusInfluence.revolutionaryEnergy}
                </p>
              </InsightContent>
            </div>

            {/* Neptune */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">♆</span>
                <span className="text-blue-300 font-medium">
                  {isKo ? '해왕성 - 영성' : 'Neptune - Spirituality'}
                </span>
                <Badge
                  text={`${outerPlanets.neptuneInfluence.spiritualConnection}%`}
                  colorTheme="blue"
                  size="sm"
                />
              </div>
              <InsightContent colorTheme="blue">
                <p className="text-gray-200 text-sm">
                  {outerPlanets.neptuneInfluence.dreamyQualities}
                </p>
              </InsightContent>
            </div>

            {/* Pluto */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">♇</span>
                <span className="text-rose-300 font-medium">
                  {isKo ? '명왕성 - 변환' : 'Pluto - Transformation'}
                </span>
                <Badge
                  text={`${outerPlanets.plutoInfluence.transformationPotential}%`}
                  colorTheme="rose"
                  size="sm"
                />
              </div>
              <InsightContent colorTheme="rose">
                <p className="text-gray-200 text-sm">{outerPlanets.plutoInfluence.powerDynamics}</p>
              </InsightContent>
            </div>

            {/* Generational Themes */}
            {outerPlanets.generationalThemes.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-medium mb-2">
                  {isKo ? '🌐 세대적 테마' : '🌐 Generational Themes'}
                </p>
                {outerPlanets.generationalThemes.map((theme, idx) => (
                  <p key={idx} className="text-gray-300 text-sm">
                    {theme}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
                <span className="text-purple-300">
                  {isKo ? '초월적 점수' : 'Transcendent Score'}
                </span>
                <span className="text-2xl font-bold text-purple-200">
                  {outerPlanets.overallTranscendentScore}
                </span>
              </div>
            </div>
          </>
        ) : (
          <InsightContent colorTheme="purple">
            <p className="text-gray-400 text-sm text-center">
              {isKo ? '외행성 데이터가 필요합니다' : 'Outer planet data needed for analysis'}
            </p>
          </InsightContent>
        )}
      </InsightCard>

      {/* 노드 (Nodes) - 카르마 */}
      <InsightCard
        emoji="☊"
        title={isKo ? '노드 - 운명의 연결' : 'Nodes - Karmic Connection'}
        colorTheme="pink"
      >
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '북쪽/남쪽 노드로 보는 영혼의 연결' : 'Soul connection through North/South Nodes'}
        </p>

        {nodes ? (
          <>
            <ScoreBar
              label={isKo ? '북쪽 노드 연결' : 'North Node Connection'}
              score={nodes.northNodeConnection.compatibility}
              colorTheme="pink"
            />

            <InsightContent colorTheme="pink">
              <p className="text-pink-300 font-medium mb-2">
                {isKo ? '운명적 연결 유형' : 'Destiny Connection Type'}
              </p>
              <p className="text-gray-200 text-sm">{nodes.karmicRelationshipType}</p>
            </InsightContent>

            <InsightContent colorTheme="pink" className="mt-3">
              <p className="text-pink-300 font-medium mb-2">
                {isKo ? '영혼의 목적' : 'Soul Purpose Together'}
              </p>
              <p className="text-gray-200 text-sm">{nodes.evolutionaryPurpose}</p>
            </InsightContent>

            <InsightContent colorTheme="purple" className="mt-3">
              <p className="text-purple-300 font-medium mb-2">
                {isKo ? '🔮 전생 지표' : '🔮 Past Life Indicators'}
              </p>
              <p className="text-gray-200 text-sm">
                {nodes.southNodeConnection.pastLifeIndicators}
              </p>
            </InsightContent>

            {nodes.lifeLessons.length > 0 && (
              <div className="mt-4">
                <p className="text-emerald-300 font-medium text-sm mb-2">
                  {isKo ? '🌟 인생 교훈' : '🌟 Life Lessons'}
                </p>
                <div className="space-y-2">
                  {nodes.lifeLessons.map((lesson: string, idx: number) => (
                    <InsightContent key={idx} colorTheme="emerald">
                      <p className="text-gray-200 text-sm">{lesson}</p>
                    </InsightContent>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <InsightContent colorTheme="sky">
                <p className="text-sky-300 font-medium text-xs mb-1">
                  {isKo ? '성장 방향' : 'Growth Direction'}
                </p>
                <p className="text-gray-200 text-xs">{nodes.northNodeConnection.growthDirection}</p>
              </InsightContent>
              <InsightContent colorTheme="amber">
                <p className="text-amber-300 font-medium text-xs mb-1">
                  {isKo ? '안락 지대' : 'Comfort Zone'}
                </p>
                <p className="text-gray-200 text-xs">{nodes.southNodeConnection.comfortZone}</p>
              </InsightContent>
            </div>
          </>
        ) : (
          <InsightContent colorTheme="pink">
            <p className="text-gray-400 text-sm text-center">
              {isKo ? '노드 데이터가 필요합니다' : 'Node data needed for analysis'}
            </p>
          </InsightContent>
        )}
      </InsightCard>

      {/* House Overlays */}
      <InsightCard emoji="🏠" title={isKo ? '하우스 중첩' : 'House Overlays'} colorTheme="emerald">
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '관계가 활성화되는 삶의 영역' : 'Life areas activated by your relationship'}
        </p>

        {houseOverlays ? (
          <>
            <p className="text-emerald-300 text-sm mb-4">{houseOverlays.description}</p>

            <div className="space-y-3">
              {houseOverlays.areas.map((area, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    area.impact === 'very_positive'
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : area.impact === 'positive'
                        ? 'bg-green-500/10 border-green-500/20'
                        : area.impact === 'challenging'
                          ? 'bg-orange-500/10 border-orange-500/20'
                          : 'bg-gray-500/10 border-gray-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`font-medium ${
                        area.impact === 'very_positive'
                          ? 'text-emerald-300'
                          : area.impact === 'positive'
                            ? 'text-green-300'
                            : area.impact === 'challenging'
                              ? 'text-orange-300'
                              : 'text-gray-300'
                      }`}
                    >
                      {area.area}
                    </span>
                    <Badge
                      text={
                        area.impact === 'very_positive'
                          ? isKo
                            ? '매우 좋음'
                            : 'Excellent'
                          : area.impact === 'positive'
                            ? isKo
                              ? '좋음'
                              : 'Good'
                            : area.impact === 'challenging'
                              ? isKo
                                ? '도전'
                                : 'Challenge'
                              : isKo
                                ? '중립'
                                : 'Neutral'
                      }
                      colorTheme={
                        area.impact === 'very_positive'
                          ? 'emerald'
                          : area.impact === 'positive'
                            ? 'green'
                            : area.impact === 'challenging'
                              ? 'orange'
                              : 'blue'
                      }
                      size="sm"
                    />
                  </div>
                  <p className="text-gray-300 text-sm">{area.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <InsightContent colorTheme="emerald">
            <p className="text-gray-400 text-sm text-center">
              {isKo ? '하우스 중첩 분석 중...' : 'Analyzing house overlays...'}
            </p>
          </InsightContent>
        )}
      </InsightCard>
    </div>
  )
})

export default DeepAstroTab
