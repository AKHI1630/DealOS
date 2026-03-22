from google import genai
import os
import json

def score_lead(lead: dict, config: dict):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = f"""Score this sales lead from 0-100 based on purchase intent and fit.
Lead: {json.dumps(lead)}
Product: {config.get('product')}
Target: {config.get('target_customer')}
Industry: {config.get('industry')}

Consider:
- Business type match
- Location relevance  
- Contact info availability
- Business size signals

Return strict JSON format: 
{{"score": 85, "reason": "...", "tier": "hot"}}
tier can be hot, warm, or cold."""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.endswith('```'):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error scoring lead: {e}")
        return {"score": 0, "reason": "Failed to parse score", "tier": "cold"}
