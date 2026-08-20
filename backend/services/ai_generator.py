import os
import json
import httpx


async def generate_questions_with_ai(subject, topic, difficulty, question_type, num_questions, marks):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not configured in backend .env")

    prompt = f"""Generate exactly {num_questions} {difficulty} level {question_type} questions on the topic "{topic}" in the subject "{subject}".

Return ONLY a valid JSON array (no markdown, no explanation). Each object must have:
- "question": the question text
- "options": array of 4 options (for MCQ) or ["True", "False"] (for TRUE_FALSE)
- "correct_answer": the correct answer text
- "difficulty": "{difficulty}"
- "marks": {marks}

Example format:
[
  {{
    "question": "Which algorithm is used for classification?",
    "options": ["K-Means", "Decision Tree", "PCA", "Apriori"],
    "correct_answer": "Decision Tree",
    "difficulty": "Medium",
    "marks": 1
  }}
]"""

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 8192,
                }
            }
        )

    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.text}")

    data = response.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(text)
