# 📸 Instagram API 설정 가이드 (스크린샷 기반)

## ✅ 올바른 Use Case 선택

현재 Facebook 앱 생성 화면에서:

### Step 1: Use Cases 선택

**Featured (6) 대신 "Content management (5)" 필터를 클릭하세요!**

그러면 다음 옵션이 나타납니다:

```
☑️ Instagram Basic Display
   - 사용자의 Instagram 프로필, 사진, 비디오에 접근

☑️ Instagram Content Publishing (필요!)
   - Instagram에 사진과 비디오 게시
   - Instagram Stories에 게시
```

### Step 2: 선택해야 할 Use Case

**"Instagram Content Publishing"** 을 체크하세요!

또는 전체 선택사항:
- ☑️ Instagram Basic Display
- ☑️ Instagram Content Publishing

### Step 3: 다음 단계

"Next" 버튼 클릭 후:

1. **Business** 탭에서:
   - Instagram Business Account 연결
   - Facebook Page와 연결 확인

2. **Requirements** 탭에서:
   - 필요한 권한 확인:
     - `instagram_basic`
     - `instagram_content_publish`
     - `pages_read_engagement`
     - `pages_show_list`

3. **Overview**에서 설정 완료

## 🎯 중요 포인트

❌ **잘못된 선택**:
- "Create & manage ads with Marketing API" ← 광고용 (불필요)
- "Create & manage app ads" ← 앱 광고용 (불필요)

✅ **올바른 선택**:
- "Content management" 필터
- "Instagram Content Publishing" Use Case

## 🔧 설정 순서

```
1. Facebook 앱 생성
   ↓
2. Use Cases → Content management 필터
   ↓
3. Instagram Content Publishing 선택
   ↓
4. Business 계정 연결
   ↓
5. Access Token 발급
   ↓
6. 완료! 🎉
```

## 💡 다음에 할 일

앱 생성 완료 후:

1. **Graph API Explorer**로 이동
2. Access Token 발급
3. 권한 추가 (instagram_content_publish)
4. Instagram Account ID 확인
5. `.env.local`에 추가

## 📞 도움이 필요하면

다음 단계를 보여주시면 계속 도와드리겠습니다!
