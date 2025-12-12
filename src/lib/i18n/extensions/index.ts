// src/lib/i18n/extensions/index.ts
// 모든 extension을 합쳐서 export

import { dailyRitualExtension } from "./dailyRitual";
import { psychologyExtension } from "./psychology";
import { meditationExtension } from "./meditation";
import type { LocaleExtension } from "../types";

// 모든 extension 합치기
function mergeExtensions(...extensions: LocaleExtension[]): LocaleExtension {
  const result: LocaleExtension = {};

  for (const ext of extensions) {
    for (const [locale, namespaces] of Object.entries(ext)) {
      if (!result[locale]) {
        result[locale] = {};
      }
      for (const [ns, translations] of Object.entries(namespaces)) {
        result[locale][ns] = {
          ...(result[locale][ns] || {}),
          ...translations,
        };
      }
    }
  }

  return result;
}

// 합쳐진 extension export
export const allExtensions = mergeExtensions(
  dailyRitualExtension,
  psychologyExtension,
  meditationExtension
);

// 개별 extension도 export (필요한 것만 쓸 수 있게)
export { dailyRitualExtension } from "./dailyRitual";
export { psychologyExtension } from "./psychology";
export { meditationExtension } from "./meditation";

// 새 extension 추가 방법:
// 1. extensions 폴더에 새 파일 생성 (예: spiritualMentor.ts)
// 2. LocaleExtension 타입 따라서 작성
// 3. 여기 import하고 mergeExtensions에 추가
// 4. I18nProvider에서 자동으로 merge됨
