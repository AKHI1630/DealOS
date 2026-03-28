from google import genai
from google.genai import types
import os
import json

# UPGRADED SYSTEM PROMPT: From "Assistant" to "Master Negotiator"
PROMPT_CONFIG = """
ROLE: You are the 'Lead Strategist & Master Closer' for DealOS. 
MISSION: Convert leads into closed deals by maximizing perceived value and using high-level negotiation.

CORE STRATEGIES:
1. THE CHAMELEON: Analyze the user's language. If they use Hinglish/Slang, you MUST respond in Hinglish to build 'Bhai-Bhai' trust. If they are formal, be a Corporate Executive.
2. VALUE ANCHORING: Never apologize for the price. Pivot to ROI. Use phrases like 'Fayde ka sauda', 'Investment hai, kharcha nahi'.
3. PSYCHOLOGICAL CLOSING: Use 'Social Proof' and 'Scarcity'. Make them feel like they are missing out if they don't act now.
4. TONE: Be matured, authoritative, and persuasive. Avoid robotic 'Ji Sir' unless the lead is significantly older/formal.

CONVINCING DICTIONARY: 'Pakka result milega', 'Trust me on this', 'Best deal in the market', 'Business scale karna hai toh yeh chahiye hi'.
"""

def analyze_reply(reply_text: str, lead_data: dict, campaign_data: dict):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    biz_name = campaign_data.get('business_name', 'DealOS Partner')
    product = campaign_data.get('product', 'premium solution')
    price = campaign_data.get('price', 'bespoke pricing')
    usp = campaign_data.get('usp', 'industry-leading tech')

    # THE EXPERT PROMPT
    prompt = f"""
    LEAD MESSAGE: "{reply_text}"
    CONTEXT: {biz_name} offers {product} at {price}. Our edge: {usp}.

    TASK: Think like a multi-million dollar business owner. 
    1. Analyze the 'unspoken' objection (Is it money? Trust? Time?).
    2. Create a high-level strategy to overcome it.
    3. PRICE QUOTES: If they ask for the price, give the exact price from CONTEXT ({price}).
    4. BARGAINING: If they ask to negotiate or severely lowball the price (e.g., offering 10% of the value), DO NOT drop the base price easily. Instead, offer a bundle deal (e.g., "Add 1 more unit and I'll give both for {price}") or offer EMI/starter packs.
    5. Draft a convincing, simple, and understandable 4-7 line response that compromises them into buying. Mirror their language perfectly.

    If they use slang like 'Bhai', 'Scene', 'Set', respond with the same energy.

    RETURN JSON ONLY:
    {{
      "sentiment": "string (hot_lead/doubting/price_objection)",
      "interest_score": int (0-100),
      "strategy": "Deep strategic move (e.g. Using psychological anchoring to justify the 100k price tag)",
      "draft_reply": "The powerful Hinglish/English response"
    }}
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=PROMPT_CONFIG
            )
        )
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_text)
    except Exception as e:
        # PROFESSIONAL FALLBACK (No more 'Ji Sir' default)
        print(f"[ERROR] Gemini Negotiation Failed: {e}")
        return {
            "sentiment": "interested",
            "interest_score": 75,
            "strategy": "Lead is highly qualified. Moving to direct value-proposition phase.",
            "draft_reply": "I've reviewed your requirements. This is exactly what we specialize in. Let's get on a quick 2-minute call to finalize the numbers?"
        }
