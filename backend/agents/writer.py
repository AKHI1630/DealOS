from google import genai
import os
import requests
from bs4 import BeautifulSoup
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()

def get_client():
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def scrape_lead_context(website: str) -> dict:
    result = {"description": "", "services": "", "pain_points": "", "rating": ""}
    if not website:
        return result
    try:
        if not website.startswith("http"):
            website = "http://" + website
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        resp = requests.get(website, timeout=5, headers=headers)
        soup = BeautifulSoup(resp.text, "html.parser")
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc:
            result["description"] = meta_desc.get("content", "")[:300]
        else:
            p = soup.find("p")
            if p:
                result["description"] = p.text[:300]
        text_content = soup.get_text(separator=' ', strip=True)[:500]
        result["services"] = text_content[:200]
    except Exception:
        pass
    return result

def generate_email_sync(lead: dict, config: dict, scraped: dict) -> dict:
    client = get_client()
    business_name = lead.get("business_name") or lead.get("name", "")
    city = lead.get("city", "")
    scraped_desc = scraped.get("description") or f"A local business in {city}"
    scraped_serv = scraped.get("services") or "Not available"

    prompt = f"""You are an expert B2B sales email writer for Indian businesses.
Write a cold email that will make {business_name} want to buy {config.get('product')}.

About their business: {scraped_desc}
Their services: {scraped_serv}
Our product: {config.get('product')}
Our USP: {config.get('usp')}
Our price: {config.get('price')}
Target customer: {config.get('target_customer')}

EMAIL RULES:
- 4-5 sentences maximum
- Open with something specific about THEIR business
- Sentence 2: ONE specific pain point based on their business type
- Sentence 3: How our product solves that pain point
- Sentence 4: Our USP + price (make it sound like a deal)
- Sentence 5: Clear CTA — ask for a 10 min call
- Tone: Professional but warm, not pushy
- Do NOT say 'I hope this email finds you well'
- Do NOT mention 'AI' or 'automated'
- Sign off as the business owner

Return JSON only:
{{
  "subject": "compelling subject line under 8 words",
  "body": "full email text"
}}"""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite-preview",
        contents=prompt
    )
    try:
        text = response.text.strip()
        text = text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception:
        return {"subject": "Introduction", "body": response.text}

def generate_whatsapp_sync(lead: dict, config: dict, scraped: dict) -> str:
    client = get_client()
    business_name = lead.get("business_name") or lead.get("name", "")
    city = lead.get("city", "")
    scraped_desc = scraped.get("description") or f"{business_name} in {city}"

    prompt = f"""Write a WhatsApp message for {business_name}.
Their business: {scraped_desc}
Our product: {config.get('product')}
Our price: {config.get('price')}
Our USP: {config.get('usp')}

RULES:
- Maximum 3 lines
- Line 1: Hi [business name], one sentence about their specific business
- Line 2: One sentence how our product helps them specifically
- Line 3: Price + soft CTA with one question
- Casual friendly tone
- Maximum 1 emoji
- Do NOT use asterisks for bold

Return just the message text, no JSON."""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite-preview",
        contents=prompt
    )
    return response.text.strip().replace("**", "")

async def generate_messages(lead: dict, config: dict) -> dict:
    website = lead.get("website", "")
    scraped = scrape_lead_context(website) if website else {
        "description": "", "services": "", "pain_points": "", "rating": ""
    }

    has_email = bool(lead.get("email"))
    has_phone = bool(lead.get("phone"))

    email_res = None
    whatsapp_res = None
    channel = "none"

    loop = asyncio.get_event_loop()

    if has_email and has_phone:
        email_res, whatsapp_res = await asyncio.gather(
            loop.run_in_executor(None, generate_email_sync, lead, config, scraped),
            loop.run_in_executor(None, generate_whatsapp_sync, lead, config, scraped)
        )
        channel = "both"
    elif has_email:
        email_res = await loop.run_in_executor(
            None, generate_email_sync, lead, config, scraped
        )
        channel = "email"
    elif has_phone:
        whatsapp_res = await loop.run_in_executor(
            None, generate_whatsapp_sync, lead, config, scraped
        )
        channel = "whatsapp"
    else:
        raise Exception("No contact information available")

    return {
        "email": email_res,
        "whatsapp": whatsapp_res,
        "channel": channel,
        "scraped_context": {
            "description": scraped.get("description", ""),
            "services": scraped.get("services", "")
        }
    }
