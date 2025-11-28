import "dotenv/config";

async function testTogether() {
  const response = await fetch("https://api.together.xyz/v1/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "pjyrhee_4479/Meta-Llama-3.1-8B-Instruct-Reference-a9078408",
      prompt: "# 테스트: 서울은 어떤 도시인가요?",
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  console.log("🔹 Status:", response.status);
  const data = await response.json();
  console.log("🔹 Response:", data);
}

testTogether().catch(console.error);