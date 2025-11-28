# test_saju.py
from together import Together

client = Together(api_key="5aadfaf41908c78f8462a4ed6ccf030eaa4be7e36bf0f46ea5b107c8413060bb")

response = client.completions.create(
    model="pjyrhee_4479/Meta-Llama-3.1-8B-Instruct-Reference-16a2ebc8",
    prompt="신미일주에 대해 사주 관점으로 자세히 설명해줘.",
    max_tokens=400,
    temperature=0.7
)
print(response.choices[0].text.strip())