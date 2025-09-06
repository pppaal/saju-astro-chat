import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

// 이전 버전의 Node.js 호환성을 위한 코드
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  ...compat.config({
    // 기존에 사용하시던 'next/core-web-vitals' 설정을 그대로 가져옵니다.
    extends: ['next/core-web-vitals'],
    
    // 여기에 규칙을 수정하는 코드를 추가합니다.
    rules: {
      // 'any' 타입을 사용해도 에러가 아닌, '끄기(off)' 상태로 변경합니다.
      '@typescript-eslint/no-explicit-any': 'off',
      
      // (보너스) 사용하지 않는 변수가 있을 때 에러가 아닌 '경고(warn)'만 표시하도록 변경합니다.
      '@typescript-eslint/no-unused-vars': 'warn'
    },
  }),
];

export default config;