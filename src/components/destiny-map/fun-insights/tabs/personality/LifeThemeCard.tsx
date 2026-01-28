import type { TabProps } from '../types';

interface LifeThemeCardProps {
  combinedLifeTheme: TabProps['combinedLifeTheme'];
  isKo: boolean;
}

export default function LifeThemeCard({ combinedLifeTheme, isKo }: LifeThemeCardProps) {
  if (!combinedLifeTheme) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-bold text-purple-300">{isKo ? '당신의 인생 테마' : 'Your Life Theme'}</h3>
      </div>
      <p className="text-gray-200 text-base leading-relaxed mb-3">
        {isKo ? combinedLifeTheme.ko : combinedLifeTheme.en}
      </p>
      {combinedLifeTheme.detail && (
        <p className="text-gray-400 text-sm leading-relaxed">
          {isKo ? combinedLifeTheme.detail.ko : combinedLifeTheme.detail.en}
        </p>
      )}
    </div>
  );
}
