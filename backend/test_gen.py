import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
api_key = os.getenv("OPENROUTER_API_KEY")

brand_name = "Bon & Vanilla"
category = "Restaurant"
language = "Arabic"
dialect = "Egyptian Arabic"
tone = "Friendly"

prompt = f"""You are an elite business strategist and AI agent architect.
Create a hyper-realistic, highly customized AI conversational agent configuration for this specific business:

Business Name: {brand_name}
Industry / Category: {category}
Language: {language}
Dialect: {dialect}
Communication Tone: {tone}

IMPORTANT INSTRUCTIONS:
- Analyze the EXACT business name '{brand_name}'. If it is a cafe / specialty coffee / bakery, generate authentic specialty coffee items (like سبانش لاتيه, فلات وايت, قهوة V60 مختصة, كرواسون فستق, تشيز كيك توت) with realistic Egyptian market prices in EGP (e.g. 75 - 145 EGP).
- If it is medical, generate clinic services/consultations.
- If it is real estate, generate apartments/villas.
- If language is Arabic, all text, item names, and categories MUST be in clean, natural Arabic without English parentheses.
- If language is English, all text MUST be in English.

Respond ONLY with a valid JSON object matching this schema:
{{
  "tagline": "Short magnetic tagline in {language}",
  "role": "Specific professional role in {language}",
  "welcomeMessage": "Warm conversational welcome in {language}",
  "instructions": "1. Rule one\\n2. Rule two\\n3. Rule three\\n4. Rule four",
  "menuItems": [
     {{"name": "Authentic item name", "price": 110, "category": "Category name"}},
     {{"name": "Authentic item name", "price": 85, "category": "Category name"}},
     {{"name": "Authentic item name", "price": 135, "category": "Category name"}},
     {{"name": "Authentic item name", "price": 95, "category": "Category name"}},
     {{"name": "Authentic item name", "price": 150, "category": "Category name"}}
  ]
}}"""

req_data = {
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.6,
    "response_format": {"type": "json_object"}
}

h_req = urllib.request.Request(
    "https://openrouter.ai/api/v1/chat/completions",
    data=json.dumps(req_data).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Kayanova AI Studio"
    },
    method="POST"
)

with urllib.request.urlopen(h_req, timeout=15) as res:
    data = json.loads(res.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    print("AI Response:", content)
