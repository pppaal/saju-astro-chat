# 🎓 처음 개발자를 위한 완벽 가이드

**대상**: 처음 프로젝트를 시작하는 개발자
**목표**: 전문가처럼 개발하기

---

## 📅 매일 해야 하는 것들

### 🌅 개발 시작할 때 (5분)

```bash
# 1. 최신 코드 받기
git pull origin main

# 2. 의존성 확인 (package.json 변경됐을 수도)
npm install

# 3. 테스트가 잘 도는지 확인
npm test

# 4. 개발 서버 시작
npm run dev

# 5. 브라우저에서 확인
# http://localhost:3000 열기
```

**왜 중요한가요?**
- 다른 팀원이 코드를 변경했을 수 있음
- 라이브러리가 업데이트되었을 수 있음
- 내 환경에서 잘 도는지 확인

---

### 💻 개발 중 (계속)

#### 터미널 2개를 열어두세요!

**터미널 1: 실시간 테스트**
```bash
npm run test:watch
```
- 코드 저장할 때마다 자동으로 테스트 실행
- 빨간색 보이면 = 뭔가 망가뜨렸다는 신호
- 초록색 = 안전!

**터미널 2: 개발 서버**
```bash
npm run dev
```
- 코드 변경하면 자동으로 새로고침
- 에러 나면 여기서 확인

#### VS Code 활용

**중요한 단축키:**
```
Ctrl + S          저장 (자동으로 prettier 실행)
F5                디버깅 시작
Ctrl + `          터미널 열기/닫기
Ctrl + P          파일 빠르게 찾기
Ctrl + Shift + F  전체 프로젝트에서 검색
```

---

### 🎯 새 기능 개발할 때 (단계별)

#### Step 1: 브랜치 만들기
```bash
# 새 브랜치 생성 (항상 main에서 시작)
git checkout main
git pull origin main
git checkout -b feature/새기능이름

# 예시:
git checkout -b feature/add-user-profile
```

**브랜치 이름 규칙:**
- `feature/기능이름` - 새 기능
- `fix/버그이름` - 버그 수정
- `refactor/리팩토링내용` - 코드 개선
- `docs/문서내용` - 문서만 수정

#### Step 2: 작은 단위로 작업
```
❌ 나쁜 예:
한 번에 5개 파일 수정, 3개 기능 추가, 버그 2개 고침

✅ 좋은 예:
1개 파일, 1개 기능만 추가
```

**왜?**
- 문제 생기면 쉽게 되돌릴 수 있음
- 코드 리뷰가 쉬움
- 테스트하기 쉬움

#### Step 3: 테스트 먼저 작성 (TDD)
```typescript
// 1단계: 테스트 작성 (실패할 것)
test('사용자 프로필이 보여야 함', () => {
  const profile = getUserProfile('123');
  expect(profile.name).toBe('홍길동');
});

// 2단계: 코드 작성
function getUserProfile(id: string) {
  return { name: '홍길동' };
}

// 3단계: 테스트 통과 확인
// ✅ Test passed!
```

**TDD의 장점:**
- 버그를 미리 방지
- 코드 설계가 좋아짐
- 리팩토링이 안전해짐

#### Step 4: 코드 작성할 때 체크리스트

**✅ 작성 전 체크:**
- [ ] 비슷한 코드가 이미 있나? (재사용!)
- [ ] 이 기능이 정말 필요한가?
- [ ] 어떻게 테스트할까?

**✅ 작성 중 체크:**
- [ ] console.log 대신 logger 사용
- [ ] any 타입 사용 안 함
- [ ] 함수는 한 가지 일만
- [ ] 변수/함수 이름이 명확한가?

**✅ 작성 후 체크:**
- [ ] 테스트 작성했나?
- [ ] 에러 처리했나?
- [ ] 주석 필요한가?
- [ ] 코드 중복 없나?

#### Step 5: 커밋하기
```bash
# 1. 변경사항 확인
git status

# 2. 파일 추가
git add src/components/UserProfile.tsx
git add tests/user-profile.test.ts

# 3. 커밋
git commit -m "feat: add user profile component"

# 좋은 커밋 메시지:
# feat: 새 기능
# fix: 버그 수정
# docs: 문서 수정
# refactor: 코드 개선
# test: 테스트 추가
```

**커밋 전 꼭!**
```bash
npm run check:all
```

**초록불 확인:**
- ✅ Lint: OK
- ✅ Type check: OK
- ✅ Tests: OK

**빨간불이면?**
- 고치고 다시 커밋!

---

### 🔍 버그 고칠 때

#### Step 1: 버그 재현
```typescript
// 먼저 테스트로 버그 재현
test('잘못된 이메일 입력 시 에러 발생', () => {
  expect(() => {
    validateEmail('invalid');
  }).toThrow('이메일 형식이 올바르지 않습니다');
});

// 이 테스트가 실패하면 = 버그 재현 성공!
```

#### Step 2: 로그 확인
```typescript
import { logger } from '@/lib/logger';

function processPayment(amount: number) {
  logger.info('Payment processing started', { amount });

  try {
    // ... 처리 로직
    logger.info('Payment successful', { amount });
  } catch (error) {
    logger.error('Payment failed', error, { amount });
    throw error;
  }
}
```

#### Step 3: 디버거 사용
```typescript
// 1. 브레이크포인트 설정 (VS Code 줄 번호 왼쪽 클릭)
function calculateTotal(items: Item[]) {
  debugger; // 또는 이렇게
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}

// 2. F5 눌러서 디버깅 시작
// 3. 변수 값 확인하면서 한 줄씩 실행
```

#### Step 4: 수정 후 확인
```bash
# 1. 테스트 통과하는지 확인
npm test

# 2. 수동으로도 확인
npm run dev
# 브라우저에서 직접 테스트

# 3. 다른 것도 안 망가뜨렸는지 확인
npm run check:all
```

---

## 🚨 절대 하면 안 되는 것들

### ❌ 1. 테스트 없이 커밋
```bash
# 나쁜 예:
git add .
git commit -m "fix"
git push

# 좋은 예:
npm run check:all  # 먼저 체크!
git add .
git commit -m "fix: resolve login issue"
git push
```

### ❌ 2. console.log 남기기
```typescript
// ❌ 나쁜 예
function login(email: string) {
  console.log('Login attempt:', email);
  console.log('Checking database...');
  // ...
}

// ✅ 좋은 예
import { authLogger } from '@/lib/logger';

function login(email: string) {
  authLogger.info('Login attempt', { email });
  // ...
}
```

### ❌ 3. any 타입 사용
```typescript
// ❌ 나쁜 예
function processData(data: any) {
  return data.value * 2; // data에 value가 없으면? 💥
}

// ✅ 좋은 예
interface DataInput {
  value: number;
  unit?: string;
}

function processData(data: DataInput) {
  return data.value * 2; // 안전!
}
```

### ❌ 4. 큰 파일 한 번에 커밋
```bash
# ❌ 나쁜 예
git add .  # 모든 파일
git commit -m "update"  # 애매한 메시지

# ✅ 좋은 예
git add src/components/UserProfile.tsx
git commit -m "feat: add user profile display"

git add src/components/UserSettings.tsx
git commit -m "feat: add user settings page"
```

### ❌ 5. 에러 무시하기
```typescript
// ❌ 나쁜 예
try {
  await saveToDatabase(data);
} catch (error) {
  // 아무것도 안 함 (에러 삼킴)
}

// ✅ 좋은 예
try {
  await saveToDatabase(data);
} catch (error) {
  logger.error('Failed to save', error, { data });
  throw new ApiError(ErrorCode.DATABASE_ERROR);
}
```

---

## 📋 일일 체크리스트

### 출근하면
- [ ] `git pull origin main`
- [ ] `npm install` (필요시)
- [ ] `npm test` (정상 작동 확인)
- [ ] `npm run dev` (개발 서버 시작)

### 개발 중
- [ ] 터미널 2개 열어두기 (test:watch, dev)
- [ ] 자주 저장 (Ctrl+S)
- [ ] 자주 커밋 (작은 단위로)
- [ ] 테스트 작성하면서 개발

### 커밋 전
- [ ] `npm run check:all`
- [ ] 불필요한 console.log 제거
- [ ] 주석 정리
- [ ] 좋은 커밋 메시지 작성

### 퇴근 전
- [ ] 작업 중인 내용 커밋
- [ ] `git push origin 브랜치이름`
- [ ] 내일 할 일 TODO 작성
- [ ] 터미널 정리 (Ctrl+C로 서버 종료)

---

## 🎯 주간 루틴

### 월요일
```bash
# 새로운 한 주 시작
git checkout main
git pull origin main

# 이번 주 목표 확인
# - 어떤 기능 개발할까?
# - 어떤 버그 고칠까?
```

### 화-금요일
```bash
# 매일 아침
git pull origin main
git merge main  # 내 브랜치에 main 최신 코드 합치기

# 개발 계속...
```

### 금요일 오후
```bash
# 코드 리뷰 요청
git push origin feature/my-feature
# GitHub에서 Pull Request 생성

# 정리
npm run quality:check  # 전체 품질 체크
# 다음 주 계획 세우기
```

---

## 💡 자주 묻는 질문

### Q1: 어디서부터 시작해야 하나요?
```bash
# 1. 작은 버그 수정부터!
git checkout -b fix/typo-in-readme
# README.md의 오타 고치기

# 2. 테스트 추가
git checkout -b test/add-user-tests
# 기존 코드에 테스트 추가

# 3. 작은 기능 추가
git checkout -b feature/add-loading-spinner
# 로딩 스피너 컴포넌트 추가
```

### Q2: 에러가 나면 어떻게 하나요?
```
1. 에러 메시지 읽기 (천천히, 끝까지)
2. 로그 확인하기
3. Google 검색: "에러 메시지 전체 복사해서 검색"
4. Stack Overflow 확인
5. 팀원에게 물어보기 (30분 이상 막히면)
```

### Q3: 테스트를 어떻게 작성하나요?
```typescript
// 패턴:
test('무엇을 테스트하는지', () => {
  // 1. 준비 (Arrange)
  const input = { name: '홍길동' };

  // 2. 실행 (Act)
  const result = processUser(input);

  // 3. 검증 (Assert)
  expect(result.name).toBe('홍길동');
});
```

### Q4: PR(Pull Request)은 언제 만드나요?
```
기준:
- 기능이 완성됨
- 테스트가 모두 통과
- 코드 리뷰 받을 준비됨

크기:
- 작을수록 좋음 (200줄 이하)
- 1개 기능 = 1개 PR

시간:
- 금요일 오후에 만들기
- 월요일 아침에 리뷰받기
```

### Q5: main 브랜치에 직접 커밋해도 되나요?
```
❌ 절대 안 됨!

항상:
1. 새 브랜치 생성
2. 작업
3. PR 생성
4. 리뷰 받기
5. merge

예외:
- README 오타 수정 (아주 작은 변경)
- 긴급 버그 수정 (팀장 허락 받고)
```

---

## 🛠️ 유용한 명령어 모음

### Git
```bash
# 브랜치
git branch                    # 브랜치 목록
git checkout -b 브랜치이름      # 새 브랜치 생성 + 이동
git checkout 브랜치이름         # 브랜치 이동
git branch -d 브랜치이름        # 브랜치 삭제

# 상태 확인
git status                    # 현재 상태
git log --oneline             # 커밋 히스토리
git diff                      # 변경사항 확인

# 되돌리기
git checkout -- 파일이름       # 파일 변경 취소
git reset HEAD~1              # 마지막 커밋 취소
git stash                     # 임시 저장
git stash pop                 # 임시 저장 꺼내기
```

### npm
```bash
# 개발
npm run dev                   # 개발 서버
npm run build                 # 프로덕션 빌드
npm run start                 # 프로덕션 서버

# 품질
npm run lint                  # 린트 체크
npm run lint:fix              # 린트 자동 수정
npm run typecheck             # 타입 체크
npm test                      # 테스트 실행
npm run test:watch            # 테스트 watch
npm run check:all             # 전체 체크

# 유틸
npm install 패키지이름         # 패키지 설치
npm uninstall 패키지이름       # 패키지 제거
npm outdated                  # 오래된 패키지 확인
```

### VS Code
```bash
# 터미널
code .                        # VS Code로 현재 폴더 열기
Ctrl + `                      # 터미널 토글
Ctrl + Shift + `              # 새 터미널

# 편집
Ctrl + D                      # 같은 단어 다중 선택
Ctrl + /                      # 주석 토글
Alt + ↑/↓                     # 줄 이동
Shift + Alt + ↑/↓             # 줄 복사

# 검색
Ctrl + P                      # 파일 찾기
Ctrl + Shift + F              # 전체 검색
Ctrl + F                      # 현재 파일 검색
```

---

## 🎓 학습 자료

### 필수
1. [Git 기초](https://git-scm.com/book/ko/v2)
2. [TypeScript 핸드북](https://www.typescriptlang.org/ko/docs/handbook/intro.html)
3. [React 공식 문서](https://react.dev/)

### 이 프로젝트
1. [QUICK_WINS.md](./QUICK_WINS.md) - 빠른 시작
2. [PROJECT_QUALITY_10_ROADMAP.md](./PROJECT_QUALITY_10_ROADMAP.md) - 전체 로드맵
3. [FINAL_PERFECTION_REPORT.md](./FINAL_PERFECTION_REPORT.md) - 완벽 리포트

### 추천 유튜브
- 노마드코더 (한글)
- Traversy Media (영어)
- Web Dev Simplified (영어)

---

## 🎯 3개월 학습 로드맵

### 1개월차: 기본기
- [ ] Git 기본 명령어 숙달
- [ ] TypeScript 기초 문법
- [ ] React 컴포넌트 만들기
- [ ] 간단한 버그 수정
- [ ] 테스트 작성 연습

### 2개월차: 실전
- [ ] API 라우트 만들기
- [ ] 데이터베이스 연동
- [ ] 에러 처리
- [ ] 로깅 시스템 활용
- [ ] 작은 기능 개발

### 3개월차: 고급
- [ ] 성능 최적화
- [ ] 복잡한 기능 개발
- [ ] 코드 리뷰 참여
- [ ] 다른 사람 멘토링
- [ ] 아키텍처 이해

---

## ✨ 마지막 팁

### 1. 완벽하지 않아도 괜찮아요
```
처음부터 완벽한 코드를 쓸 순 없습니다.

중요한 건:
✅ 테스트 작성
✅ 작은 단위로 커밋
✅ 계속 배우기
✅ 실수에서 배우기
```

### 2. 질문하는 것을 두려워하지 마세요
```
좋은 질문:
"이 에러가 뭘 의미하나요?"
"이 코드를 어떻게 개선할 수 있을까요?"
"이 기능을 어떻게 구현하면 좋을까요?"

나쁜 질문:
"이거 좀 해주세요" (직접 시도 안 함)
```

### 3. 매일 조금씩
```
하루 1시간 개발 > 주말 10시간 개발

꾸준함이 천재를 이깁니다!
```

### 4. 기록하세요
```
배운 것:
- 블로그에 정리
- 노션에 메모
- GitHub에 TIL (Today I Learned)

3개월 후 돌아보면 놀랄 거예요!
```

---

## 🎉 축하합니다!

이제 당신은:
- ✅ 프로젝트 시작하는 법을 알았습니다
- ✅ 매일 무엇을 해야 하는지 알았습니다
- ✅ 문제 해결하는 법을 알았습니다
- ✅ 전문가처럼 개발하는 법을 알았습니다

**시작이 반입니다. 지금 바로 시작하세요!** 💪

---

**작성일**: 2026-01-05
**대상**: 처음 개발자
**다음 단계**: [QUICK_WINS.md](./QUICK_WINS.md) 읽고 첫 번째 개선 적용하기!
