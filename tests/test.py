import os
from together import Together

# Use environment variable; never hardcode API keys.
API_KEY = os.getenv("TOGETHER_API_KEY")
if not API_KEY or API_KEY == "replace_me":
    raise SystemExit("Set TOGETHER_API_KEY in your environment before running this test.")

client = Together(api_key=API_KEY)

PROMPT = "AI drafting demo. Ask a question (type 'q' to quit): "

while True:
    print("\n" + "=" * 50)
    user_input = input(PROMPT)

    if user_input.lower() == "q":
        print("Bye!")
        break

    print("Requesting response...")

    try:
        response = client.chat.completions.create(
            model="meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
            messages=[
                {"role": "system", "content": "Be concise and helpful."},
                {"role": "user", "content": user_input},
            ],
        )

        print("-" * 50)
        print(response.choices[0].message.content)
        print("-" * 50)

    except Exception as e:
        print(f"Request failed: {e}")
