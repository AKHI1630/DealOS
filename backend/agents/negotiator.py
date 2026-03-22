from google import genai
import os
import json

def analyze_reply(reply_text: str, lead: dict, config: dict):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = f"""Analyze this sales reply and draft a response.
Reply: {reply_text}
Our product: {config.get('product')}
Price: {config.get('price')}
USP: {config.get('usp')}

Classify sentiment as one of:
interested, price_objection, busy_not_now, has_supplier, not_interested

Return strict JSON format:
{{
  "sentiment": "interested",
  "interest_score": 80,
  "confidence": 90,
  "strategy": "...",
  "draft_reply": "..."
}}"""

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=prompt
        )
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.endswith('```'):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error analyzing reply: {e}")
        return {
            "sentiment": "unknown",
            "interest_score": 0,
            "confidence": 0,
            "strategy": "Fallback due to error",
            "draft_reply": ""
        }
