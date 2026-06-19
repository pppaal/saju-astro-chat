'use client'

// "지금 나를 닮은 카드" — 리딩 결과 화면에 자연스럽게 끼는 정체성 한 컷.
// 뽑은 카드 중 대표 1장(pickSignatureCard)을 골라 아키타입명 + 본질 키워드 +
// 후크 한 줄로 보여주고, 그대로 공유(세로 카드 → 링크/OG)로 잇는다.
// 별도 진단/LLM 없이 기존 리딩 데이터만 재사용한다.

import Image from 'next/image'
import type {
  ReadingResponse,
  InterpretationResult,
} from '@/app/tarot/[categoryName]/[spreadId]/types'
import { pickSignatureCard, signatureKeywords, signatureName } from '@/lib/tarot/signatureCard'
import { buildSignatureShareData, cleanShareHook, pickKeyMessage } from './shareCardData'
import { ShareTarotButton } from './ShareTarotButton'

interface SignatureCardBlockProps {
  readingResult: ReadingResponse
  interpretation: InterpretationResult | null
  language: string
}

export function SignatureCardBlock({
  readingResult,
  interpretation,
  language,
}: SignatureCardBlockProps) {
  const isKo = language === 'ko'
  const signature = pickSignatureCard(readingResult.drawnCards)
  if (!signature) return null

  const name = signatureName(signature, isKo)
  const keywords = signatureKeywords(signature, isKo)
  const line =
    cleanShareHook(interpretation?.hook) ||
    pickKeyMessage(interpretation?.overall_message || interpretation?.affirmation)

  return (
    <div className="flex flex-col items-center text-center rounded-2xl border border-[rgba(212,181,114,0.28)] bg-[rgba(212,181,114,0.06)] px-5 py-7">
      <p className="text-[11px] tracking-[0.24em] uppercase text-[#d4b572]">
        {isKo ? '지금 나를 닮은 카드' : 'The card that is you'}
      </p>

      <div
        className="relative mt-4 w-[132px] h-[211px] rounded-xl overflow-hidden ring-1 ring-[rgba(212,181,114,0.4)]"
        style={{ transform: signature.isReversed ? 'rotate(180deg)' : 'none' }}
      >
        <Image src={signature.card.image} alt={name} fill sizes="132px" className="object-cover" />
      </div>

      <h3 className="mt-4 text-2xl font-extrabold text-[#e8cc8a]">
        {name}
        {signature.isReversed ? (isKo ? ' (역)' : ' (R)') : ''}
      </h3>
      {keywords ? <p className="mt-1 text-sm text-slate-400">{keywords}</p> : null}

      {line ? (
        <p className="mt-4 max-w-md text-[17px] font-semibold leading-relaxed text-slate-100 [word-break:keep-all]">
          {line}
        </p>
      ) : null}

      <div className="mt-6">
        <ShareTarotButton
          data={buildSignatureShareData(signature, interpretation, isKo)}
          language={language}
          body={interpretation?.overall_message || undefined}
        />
      </div>
    </div>
  )
}
