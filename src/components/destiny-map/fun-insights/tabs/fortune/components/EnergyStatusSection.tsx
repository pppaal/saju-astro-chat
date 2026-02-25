// src/components/destiny-map/fun-insights/tabs/fortune/components/EnergyStatusSection.tsx
'use client'

import type { DaeunData } from '../types'
import {
  dayMasterFortuneTraits,
  daeunStemInterpretations,
  jupiterHouseDetails,
  saturnHouseDetails,
} from '../constants'
import { getDaeunRelation } from '../utils'
import { ensureMinSentenceText } from '../../shared/textDepth'

interface EnergyStatusSectionProps {
  dayMaster: string
  dayMasterElement: string
  currentDaeun: DaeunData | null
  jupiterSign: string | null
  jupiterHouse: number | null
  saturnSign: string | null
  saturnHouse: number | null
  isKo: boolean
}

export default function EnergyStatusSection({
  dayMaster,
  dayMasterElement,
  currentDaeun,
  jupiterSign,
  jupiterHouse,
  saturnSign,
  saturnHouse,
  isKo,
}: EnergyStatusSectionProps) {
  const enrich = (
    text: string | undefined,
    topic: 'fortune' | 'warning' = 'fortune',
    min = 3
  ) => ensureMinSentenceText(text || '', isKo, topic, min)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/30 border border-purple-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⚡</span>
        <h3 className="text-lg font-bold text-purple-300">
          {isKo ? '지금 내 운명 에너지' : 'My Destiny Energy Now'}
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Day Master */}
        {dayMaster && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
            <p className="text-purple-400 text-xs mb-1">{isKo ? '일간 (나)' : 'Day Master'}</p>
            <p className="text-xl font-bold text-purple-300">{dayMaster}</p>
            {dayMasterElement && <p className="text-purple-400 text-xs mt-1">{dayMasterElement}</p>}
          </div>
        )}
        {/* Current Daeun */}
        {currentDaeun && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-blue-400 text-xs mb-1">{isKo ? '현재 대운' : 'Current Daeun'}</p>
            <p className="text-lg font-bold text-blue-300">
              {currentDaeun.ganji ||
                currentDaeun.name ||
                `${currentDaeun.stem?.name || ''}${currentDaeun.branch?.name || ''}`}
            </p>
            {(currentDaeun.startAge || currentDaeun.age) && (
              <p className="text-blue-400 text-xs mt-1">
                {currentDaeun.startAge || currentDaeun.age}
                {isKo ? '세~' : '+'}
              </p>
            )}
          </div>
        )}
        {/* Jupiter */}
        {jupiterHouse && (
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
            <p className="text-yellow-400 text-xs mb-1">{isKo ? '목성 (행운)' : 'Jupiter'}</p>
            <p className="text-lg font-bold text-yellow-300">{jupiterHouse}H</p>
            {jupiterSign && <p className="text-yellow-400 text-xs mt-1">{jupiterSign}</p>}
          </div>
        )}
        {/* Saturn */}
        {saturnHouse && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-amber-400 text-xs mb-1">{isKo ? '토성 (시험)' : 'Saturn'}</p>
            <p className="text-lg font-bold text-amber-300">{saturnHouse}H</p>
            {saturnSign && <p className="text-amber-400 text-xs mt-1">{saturnSign}</p>}
          </div>
        )}
      </div>

      {/* Day Master Traits */}
      {dayMaster && dayMasterFortuneTraits[dayMaster] && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 mb-4">
          <p className="text-purple-300 font-bold text-sm mb-2">
            🔮{' '}
            {isKo
              ? dayMasterFortuneTraits[dayMaster].trait
              : dayMasterFortuneTraits[dayMaster].traitEn}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-green-500/10">
              <span className="text-green-400 font-medium">✨ {isKo ? '강점' : 'Strength'}</span>
              <p className="text-gray-300 mt-1">
                {isKo
                  ? dayMasterFortuneTraits[dayMaster].strength
                  : dayMasterFortuneTraits[dayMaster].strengthEn}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <span className="text-orange-400 font-medium">⚠️ {isKo ? '주의' : 'Caution'}</span>
              <p className="text-gray-300 mt-1">
                {enrich(
                  isKo
                    ? dayMasterFortuneTraits[dayMaster].caution
                    : dayMasterFortuneTraits[dayMaster].cautionEn,
                  'warning',
                  3
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Daeun Interpretation + Relation */}
      {currentDaeun &&
        (() => {
          const daeunGanji =
            currentDaeun.ganji ||
            currentDaeun.name ||
            `${currentDaeun.stem?.name || ''}${currentDaeun.branch?.name || ''}`
          const daeunStem = daeunGanji ? daeunGanji.charAt(0) : ''
          const daeunInterp = daeunStemInterpretations[daeunStem]
          const relation =
            dayMaster && daeunStem ? getDaeunRelation(dayMaster, daeunStem, isKo) : null

          return (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-4">
              {daeunInterp && (
                <>
                  <p className="text-blue-300 font-bold text-sm mb-2">
                    📅 {isKo ? daeunInterp.ko : daeunInterp.en}
                  </p>
                  <p className="text-gray-400 text-xs mb-3">
                    {isKo ? '에너지: ' : 'Energy: '}
                    {isKo ? daeunInterp.energy : daeunInterp.energyEn}
                  </p>
                </>
              )}

              {relation && relation.relation && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
                  <p className="text-cyan-400 font-bold text-sm mb-1">
                    🔄 {dayMaster} × {daeunStem} = {relation.relation}
                  </p>
                  <p className="text-gray-300 text-sm mb-2">{enrich(relation.message, 'fortune', 3)}</p>
                  <p className="text-teal-400 text-xs">💡 {enrich(relation.advice, 'fortune', 3)}</p>
                </div>
              )}
            </div>
          )
        })()}

      {/* Jupiter/Saturn Houses Detail */}
      {(jupiterHouse || saturnHouse) && (
        <div className="space-y-4">
          {/* Jupiter - Lucky Area */}
          {jupiterHouse && jupiterHouseDetails[jupiterHouse] && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <p className="text-green-400 font-bold text-sm mb-2 flex items-center gap-2">
                <span>✨</span>{' '}
                {isKo
                  ? `행운이 오는 영역: ${jupiterHouse}하우스`
                  : `Lucky Area: House ${jupiterHouse}`}
              </p>
              <p className="text-gray-200 text-sm leading-relaxed mb-3">
                {enrich(
                  isKo ? jupiterHouseDetails[jupiterHouse].ko : jupiterHouseDetails[jupiterHouse].en,
                  'fortune',
                  4
                )}
              </p>
              <div className="p-2 rounded-lg bg-green-500/10">
                <p className="text-green-300 text-xs">
                  🎯 {isKo ? '추천 활동: ' : 'Recommended: '}
                  <span className="text-green-200">
                    {enrich(
                      isKo
                        ? jupiterHouseDetails[jupiterHouse].action
                        : jupiterHouseDetails[jupiterHouse].actionEn,
                      'fortune',
                      3
                    )}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Saturn - Test Area */}
          {saturnHouse && saturnHouseDetails[saturnHouse] && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
              <p className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
                <span>🏋️</span>{' '}
                {isKo
                  ? `시험받는 영역: ${saturnHouse}하우스`
                  : `Testing Area: House ${saturnHouse}`}
              </p>
              <p className="text-gray-200 text-sm leading-relaxed mb-3">
                {enrich(
                  isKo ? saturnHouseDetails[saturnHouse].ko : saturnHouseDetails[saturnHouse].en,
                  'warning',
                  4
                )}
              </p>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <p className="text-amber-300 text-xs">
                  💪 {isKo ? '극복 방법: ' : 'How to overcome: '}
                  <span className="text-amber-200">
                    {enrich(
                      isKo
                        ? saturnHouseDetails[saturnHouse].lesson
                        : saturnHouseDetails[saturnHouse].lessonEn,
                      'warning',
                      3
                    )}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
