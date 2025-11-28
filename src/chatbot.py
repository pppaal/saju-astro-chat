import os
from dotenv import load_dotenv
from together import Together

# 1. 환경 변수 로드
load_dotenv()

api_key = os.getenv("TOGETHER_API_KEY")

if not api_key:
    print("⚠️ 오류: .env 파일에 TOGETHER_API_KEY가 설정되지 않았습니다.")
    exit()

# 2. Together 클라이언트 설정
client = Together(api_key=api_key)

def chat_with_bot():
    print("🔮 사주/점성술 챗봇 (Together AI) - 종료하려면 'exit' 입력\n")
    
    # --- [수정된 부분] 시스템 프롬프트 강화 ---
    system_instruction = """
    당신은 한국의 전문적인 사주 명리학자이자 점성술가입니다. 
    사용자의 생년월일과 일주 정보를 바탕으로 운세를 봐주세요.
    
    [중요 규칙]
    1. 1995년은 '돼지띠(을해년)'입니다. 연도별 띠 계산을 정확히 하세요.
    2. 사용자가 '신미일주'라고 했다면, 이는 태어난 날(Day)이 '양(미)'인 것이지, 띠(Year)가 양띠인 것이 아닙니다. 혼동하지 마세요.
    3. 사용자의 입력 정보가 당신의 계산과 다르다면 사용자의 정보를 우선시하고 존중하세요.
    4. 말투는 신뢰감 있고 친절하게, 한국어로 답변하세요.
    """
    # ----------------------------------------

    messages = [
        {"role": "system", "content": system_instruction}
    ]

    while True:
        user_input = input("사용자: ")
        
        if user_input.lower() == "exit":
            print("챗봇을 종료합니다. 안녕히 가세요! 👋")
            break

        messages.append({"role": "user", "content": user_input})

        try:
            # 3. AI 모델에 요청 보내기 (Llama 3.1 사용)
            response = client.chat.completions.create(
                model="meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
                top_p=0.7,
                top_k=50,
                repetition_penalty=1
            )

            # 4. 응답 출력
            bot_response = response.choices[0].message.content
            print(f"\n챗봇: {bot_response}\n")

            messages.append({"role": "assistant", "content": bot_response})

        except Exception as e:
            print(f"API 오류 발생: {e}")

if __name__ == "__main__":
    chat_with_bot()