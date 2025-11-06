"use client";

import { useI18n } from "@/i18n/I18nProvider";

interface ResultDisplayProps {
  interpretation: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function ResultDisplay({ interpretation, isLoading, error }: ResultDisplayProps) {
  const { t } = useI18n();

  // 로딩 메시지를 이 컴포넌트에서 보여주고 싶다면 아래 주석을 해제하세요.
  /*
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mt-8 text-center">
        <p className="text-lg text-gray-600">{t("result.loading")}</p>
      </div>
    );
  }
  */

  if (error) {
    return (
      <div className="w-full mt-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
        <h3 className="font-bold">{t("result.errorTitle")}</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!interpretation) return null;

  return (
    <div className="w-full mt-8 bg-white p-8 rounded-lg shadow-inner border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">{t("result.title")}</h2>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{interpretation}</p>
    </div>
  );
}