from together import Together

client = Together()

response = client.chat.completions.create(
    model="meta-llama/Meta-Llama-3-70B-Instruct-Turbo",
    messages=[
        {
            "role": "system",
            "content": "You are a Korean fortune teller AI. You read a person's saju and return a warm, human‑like fortune in Korean based on their birth date and hour."
        },
        {
            "role": "user",
            "content": "1996년 8월 15일 오전 10시생 여자. 오늘의 운세 알려줘."
        }
    ]
)

print(response.choices[0].message.content)