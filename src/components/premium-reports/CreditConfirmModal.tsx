'use client'

interface CreditConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  creditCost: number
  currentCredits: number
  reportTitle: string
  isLoading?: boolean
}

export function CreditConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  creditCost,
  currentCredits,
  reportTitle,
  isLoading = false,
}: CreditConfirmModalProps) {
  const hasEnoughCredits = currentCredits >= creditCost

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">✦</div>
          <h2 className="text-xl font-bold text-white">크레딧 확인</h2>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">리포트</span>
              <span className="text-white font-medium">{reportTitle}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">필요 크레딧</span>
              <span className="text-purple-400 font-bold">{creditCost} 크레딧</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-600">
              <span className="text-gray-400">보유 크레딧</span>
              <span className={`font-bold ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
                {currentCredits} 크레딧
              </span>
            </div>
          </div>

          {!hasEnoughCredits && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
              <p className="text-red-300 text-sm">
                크레딧이 부족합니다. 추가 크레딧을 구매해주세요.
              </p>
            </div>
          )}

          {hasEnoughCredits && (
            <div className="bg-slate-700/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm">
                리포트 생성 후 잔여 크레딧:{' '}
                <span className="text-white font-medium">{currentCredits - creditCost}</span> 크레딧
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-50"
          >
            취소
          </button>
          {hasEnoughCredits ? (
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  생성 중...
                </>
              ) : (
                '생성하기'
              )}
            </button>
          ) : (
            <a
              href="/pricing"
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white font-medium transition-opacity text-center"
            >
              크레딧 구매
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
