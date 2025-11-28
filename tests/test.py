import os
from together import Together

# ---------------------------------------------------------
# API 키를 넣어주세요.
my_api_key = "5aadfaf41908c78f8462a4ed6ccf030eaa4be7e36bf0f46ea5b107c8413060bb"
# ---------------------------------------------------------

client = Together(api_key=my_api_key)

while True:
    print("\n" + "="*50)
    # 사용자의 입력을 기다리는 부분
    user_input = input("AI에게 물어볼 내용을 입력하세요 (종료하려면 'q' 입력): ")
    
    if user_input.lower() == 'q':
        print("프로그램을 종료합니다.")
        break

    print("AI가 생각 중입니다...")

    try:
        response = client.chat.completions.create(
            model="meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
            messages=[
                # 사주 분석가 역할을 부여 (선택 사항)
                {"role": "system", "content": "당신은 전문적인 사주 명리학자입니다. 한국어로 친절하게 풀이해주세요."},
                {"role": "user", "content": user_input}
            ],
        )

        print("-" * 50)
        print(response.choices[0].message.content)
        print("-" * 50)

    except Exception as e:
        print(f"에러가 발생했습니다: {e}")