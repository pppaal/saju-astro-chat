# test_openai.py
from openai import OpenAI
from dotenv import load_dotenv
import os

# ① .env 파일 내용 환경변수로 불러오기
load_dotenv()

# ② 환경변수에서 OPENAI_API_KEY 불러오기
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("⚠️ OPENAI_API_KEY가 감지되지 않았습니다. .env 위치 또는 내용 확인!")

# ③ API 클라이언트 생성
client = OpenAI(api_key=api_key)

# ④ gpt-5-mini 테스트 질의
resp = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[{"role": "user", "content": "안녕 GPT-5 mini! 오늘 기분 어때?"}],
    max_tokens=50,
)

print("✅ 응답:", resp.choices[0].message.content)