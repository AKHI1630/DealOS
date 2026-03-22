import os
import re
import json
import requests
import traceback
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from google import genai

activity_log = []

def log(msg):
    print(f"[HUNTER] {msg}")
    activity_log.append(msg)
    if len(activity_log) > 100:
        activity_log.pop(0)


# ─────────────────────────────────────
# GEMINI CLIENT
# ─────────────────────────────────────
def get_gemini_client():
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ─────────────────────────────────────
# UNIVERSAL BUSINESS NAME EXTRACTOR
# ─────────────────────────────────────
AGGREGATOR_DOMAINS = [
    'justdial', 'sulekha', 'indiamart', 'tradeindia',
    'urbancompany', 'serviceonwheel', 'healthandglow',
    'yellowpages', 'shopclues', 'paytmmall', 'meesho',
    'myntra', 'naukri', 'linkedin', 'glassdoor',
    'amazon', 'flipkart', 'snapdeal', 'quora', 'reddit',
    'facebook', 'instagram', 'youtube', 'twitter',
    'wikipedia', 'zomato', 'swiggy', 'practo',
    '99acres', 'magicbricks', 'olx', 'quikr',
    'google', 'bing', 'yahoo', 'askme', 'grotal',
]

def extract_real_business_name(raw_title: str, website: str, snippet: str) -> str:

    # STEP 1: Try to extract name from domain
    if website:
        try:
            parsed = urlparse(website)
            domain = parsed.netloc or parsed.path
            domain = re.sub(r'^www\.', '', domain).lower()

            is_aggregator = any(agg in domain for agg in AGGREGATOR_DOMAINS)

            if not is_aggregator:
                # Strip TLD and subdomains
                name = re.sub(
                    r'\.(com|in|co\.in|org|net|io|biz|info|shop|store|online|'
                    r'edu|gov|co|uk|au|ca|sg|ae|me|business).*$',
                    '', domain, flags=re.IGNORECASE
                )
                # Convert separators to spaces
                name = name.replace('-', ' ').replace('_', ' ').replace('.', ' ')
                # Title case
                name = ' '.join(word.capitalize() for word in name.split() if word)

                # Valid if 2–40 chars and not purely numeric
                if 2 <= len(name) <= 40 and not name.replace(' ', '').isdigit():
                    return name.strip()
        except Exception:
            pass

    # STEP 2: Clean the raw title from SerpAPI
    cleaned = raw_title

    # Split on common separators and take first part
    for sep in [' | ', ' - ', ' – ', ' — ', ' :: ', ': ']:
        if sep in cleaned:
            cleaned = cleaned.split(sep)[0].strip()

    # Remove trailing location mentions
    cleaned = re.sub(
        r'[\s,\-–]+(?:in|at|near|@)\s+[A-Za-z\s]{3,30}$',
        '', cleaned, flags=re.IGNORECASE
    )

    # Remove leading SEO garbage words
    cleaned = re.sub(
        r'^(?:best|top|find|book|get|hire|leading|trusted|'
        r'professional|affordable|cheap|quality|number\s*1|no\.?\s*1|'
        r'famous|popular|local|online)\s+',
        '', cleaned, flags=re.IGNORECASE
    )

    # Remove trailing service noise
    cleaned = re.sub(
        r'[\s\-]+(?:services?|providers?|dealers?|suppliers?|'
        r'online|near\s+me|at\s+your\s+\w+|home\s+service|'
        r'contact\s+us|official\s+(?:site|store|page)|'
        r'store\s+locator|latest\s+price).*$',
        '', cleaned, flags=re.IGNORECASE
    )

    # Remove "..." truncation
    cleaned = re.sub(r'\s*\.{2,}$', '', cleaned).strip(' ,\t\n|')

    # Accept if 1–5 words
    if 1 <= len(cleaned.split()) <= 5 and len(cleaned) >= 3:
        return cleaned

    # STEP 3: Pull first noun phrase from snippet
    if snippet:
        first = re.split(r'[.!?\n]', snippet)[0].strip()
        first = re.sub(
            r'^(?:we are|we have|welcome to|visit|discover|'
            r'buy|shop|explore|get|find|book|about|contact)\s+',
            '', first, flags=re.IGNORECASE
        )
        words = first.split()
        if words:
            candidate = ' '.join(words[:4]).strip(' ,.')
            if 3 <= len(candidate) <= 40:
                return candidate

    return "Unknown Business"


# ─────────────────────────────────────
# SCRAPER
# ─────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-IN,en;q=0.9",
}

def scrape_page(url: str) -> dict:
    result = {"phone": "", "email": "", "address": "", "name": "", "description": ""}
    try:
        r = requests.get(url, headers=HEADERS, timeout=6)
        if r.status_code != 200:
            return result

        soup = BeautifulSoup(r.text, 'html.parser')
        for tag in soup(["script", "style", "noscript", "svg", "img", "video", "iframe"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)

        # Name from title tag
        title_tag = soup.find('title')
        if title_tag:
            t = title_tag.text.strip()
            for sep in ["|", " - ", " – ", "—", ":"]:
                if sep in t:
                    t = t.split(sep)[0].strip()
            if len(t) > 3:
                result["name"] = t

        # Description from meta
        meta = soup.find('meta', attrs={'name': 'description'})
        if meta and meta.get('content'):
            result["description"] = meta['content'][:250]

        # Phone: tel links
        for tel in soup.find_all('a', href=re.compile(r'^tel:')):
            num = re.sub(r'[^\d]', '', tel.get('href', ''))
            num = num.lstrip('91').lstrip('0')
            if len(num) == 10:
                result["phone"] = num
                break

        # Phone: schema markup
        if not result["phone"]:
            for schema in soup.find_all('script', type='application/ld+json'):
                try:
                    data = json.loads(schema.string or '{}')
                    if isinstance(data, list):
                        data = data[0]
                    phone = (
                        data.get('telephone', '') or
                        data.get('phone', '') or
                        data.get('contactPoint', {}).get('telephone', '')
                    )
                    if phone:
                        num = re.sub(r'[^\d]', '', str(phone))
                        num = num.lstrip('91').lstrip('0')
                        if len(num) == 10:
                            result["phone"] = num
                            break
                except Exception:
                    continue

        # Phone: regex fallback
        if not result["phone"]:
            for pattern in [r'\+91[\s\-]?[6-9]\d{9}', r'\b[6-9]\d{9}\b', r'0[6-9]\d{9}']:
                pm = re.search(pattern, text)
                if pm:
                    num = re.sub(r'[\s\-\+\(\)]', '', pm.group(0))
                    num = num.lstrip('91').lstrip('0')
                    if len(num) == 10:
                        result["phone"] = num
                        break

        # Email: mailto links
        for m in soup.find_all('a', href=re.compile(r'^mailto:')):
            email = m.get('href', '').replace('mailto:', '').split('?')[0].strip()
            bad = ['.png', '.jpg', '.gif', 'example', 'sentry', 'noreply', 'no-reply', 'wordpress', 'wix']
            if email and '@' in email and not any(b in email.lower() for b in bad):
                result["email"] = email
                break

        # Email: regex fallback
        if not result["email"]:
            em = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
            if em:
                e = em.group(0)
                bad = ['.png', '.jpg', '.gif', '.svg', 'example', 'sentry', 'wix', 'noreply', 'wordpress']
                if not any(b in e.lower() for b in bad):
                    result["email"] = e

        # Address
        for pat in [
            r'\d+[,\s]+[A-Za-z\s]+[,\s]+Visakhapatnam',
            r'\d+[,\s]+[A-Za-z\s]+[,\s]+Vizag',
            r'[A-Za-z\s]+Nagar[,\s]+Visakhapatnam',
        ]:
            am = re.search(pat, text, re.IGNORECASE)
            if am:
                result["address"] = am.group(0)[:150]
                break

    except Exception as e:
        log(f"Scrape error {url}: {e}")

    return result


def scrape_business(website: str) -> dict:
    if not website:
        return {}
    if not website.startswith("http"):
        website = "https://" + website

    parsed = urlparse(website.rstrip("/"))
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    pages = [
        website,
        base_url + "/contact",
        base_url + "/contact-us",
        base_url + "/about-us",
        base_url + "/reach-us",
    ]

    combined = {"phone": "", "email": "", "address": "", "name": "", "description": ""}

    for page in pages:
        result = scrape_page(page)
        for key in combined:
            if not combined[key] and result[key]:
                combined[key] = result[key]
        if combined["phone"] and combined["email"]:
            break

    return combined


# ─────────────────────────────────────
# BAD DOMAIN FILTER
# ─────────────────────────────────────
BAD_DOMAINS = [
    'justdial.com', 'indiamart.com', 'sulekha.com', 'tradeindia.com',
    'quora.com', 'reddit.com', 'facebook.com', 'instagram.com',
    'youtube.com', 'twitter.com', 'amazon.in', 'amazon.com',
    'flipkart.com', 'snapdeal.com', 'wikipedia.org', 'shopclues.com',
    'paytmmall.com', 'meesho.com', 'myntra.com', 'naukri.com',
    'linkedin.com', 'glassdoor.com', 'zomato.com', 'swiggy.com',
    'practo.com', '99acres.com', 'magicbricks.com', 'olx.in',
    'quikr.com', 'grotal.com', 'askme.com', 'urbancompany.com',
    'serviceonwheel.com', 'healthandglow.com',
]

def is_bad_url(url: str) -> bool:
    return any(domain in url.lower() for domain in BAD_DOMAINS)


# ─────────────────────────────────────
# MAIN FUNCTION
# ─────────────────────────────────────
def hunt_leads(industry, city, campaign_id, api_key, supabase_client=None):

    log(f"═══ HUNT START: {industry} in {city} ═══")

    raw_results = []
    seen_urls = set()

    # ─────────────────────────────────────────────────────────────
    # FUTURE UPGRADE PLACEHOLDER — Google Places API
    # When you have billing enabled, replace Step 1A below with:
    #
    # from services.places_service import search_places
    # places_leads = search_places(industry, city, api_key=PLACES_API_KEY)
    # for p in places_leads:
    #     raw_results.append({
    #         "title": p["name"],
    #         "link": p.get("website", ""),
    #         "snippet": p.get("vicinity", ""),
    #         "phone_prefilled": p.get("formatted_phone_number", ""),
    #         "address_prefilled": p.get("formatted_address", ""),
    #         "source": "places",
    #     })
    # Places API gives structured name+phone+address with zero scraping needed.
    # ─────────────────────────────────────────────────────────────

    maps_queries = [
        f"{industry} {city}",
        f"{industry} near {city}",
        f"{industry} shop {city}",
        f"{industry} store {city}",
        f"{industry} centre {city}",
        f"{industry} services {city}",
    ]

    organic_queries = [
        f"{industry} {city} contact phone",
        f"{industry} dealer {city} email",
        f'"{city}" {industry} contact',
    ]

    # ── STEP 1A: SerpAPI Google Maps engine — real business data ──
    # engine=google_maps returns actual Google Maps listings with
    # real business names, phones, addresses — no SEO title garbage
    log("Step 1A: Google Maps via SerpAPI...")

    for query in maps_queries:
        if len(raw_results) >= 50:
            break
        try:
            log(f"Maps query: {query}")
            resp = requests.get(
                "https://serpapi.com/search",
                params={
                    "q": query,
                    "api_key": api_key,
                    "engine": "google_maps",
                    "type": "search",
                    "gl": "in",
                    "hl": "en",
                    "ll": "@17.6868,83.2185,14z",  # Visakhapatnam coordinates
                },
                timeout=15
            )
            data = resp.json()

            if "error" in data:
                log(f"Maps error: {data['error']}")
                continue

            places = data.get("local_results", [])
            log(f"Maps returned {len(places)} places")

            for place in places:
                if len(raw_results) >= 20:
                    break

                name    = place.get("title", "")
                phone   = place.get("phone", "")
                address = place.get("address", "")
                website = place.get("website", "")
                desc    = place.get("description", "") or place.get("snippet", "")
                rating  = place.get("rating", "")

                if not name:
                    continue

                key = website or name
                if key in seen_urls:
                    continue
                seen_urls.add(key)

                # Clean phone to 10 digits
                phone_clean = re.sub(r'[^\d]', '', phone)
                phone_clean = phone_clean.lstrip('91').lstrip('0')
                if len(phone_clean) != 10:
                    phone_clean = ""

                # Never put rating in snippet — it leaks into name via Gemini
                snippet_text = desc or address

                raw_results.append({
                    "title": name,           # Maps gives real business name
                    "link": website,
                    "snippet": snippet_text,
                    "phone_prefilled": phone_clean,
                    "address_prefilled": address,
                    "source": "maps",
                })
                log(f"Maps lead: {name} | {phone_clean or 'no phone'}")

        except Exception as e:
            log(f"Maps query failed: {e}")
            traceback.print_exc()

    log(f"Step 1A done: {len(raw_results)} from Maps")

    # ── STEP 1B: SerpAPI Google Search — organic results ──
    # Fallback source, also catches google_search local_results panel
    log("Step 1B: Google organic search via SerpAPI...")

    for query in organic_queries:
        if len(raw_results) >= 60:
            break
        try:
            log(f"Organic query: {query}")
            resp = requests.get(
                "https://serpapi.com/search",
                params={
                    "q": query,
                    "api_key": api_key,
                    "num": 10,
                    "engine": "google",
                    "gl": "in",
                    "hl": "en",
                    "location": f"{city}, Andhra Pradesh, India",
                },
                timeout=15
            )
            data = resp.json()

            if "error" in data:
                log(f"Organic error: {data['error']}")
                continue

            # Local results panel inside organic search (3-pack)
            for item in data.get("local_results", []):
                if len(raw_results) >= 30:
                    break
                name    = item.get("title", "")
                phone   = item.get("phone", "")
                address = item.get("address", "")
                website = item.get("website", "")
                if not name:
                    continue
                key = website or name
                if key in seen_urls:
                    continue
                seen_urls.add(key)
                phone_clean = re.sub(r'[^\d]', '', phone).lstrip('91').lstrip('0')
                if len(phone_clean) != 10:
                    phone_clean = ""
                raw_results.append({
                    "title": name,
                    "link": website,
                    "snippet": address,
                    "phone_prefilled": phone_clean,
                    "address_prefilled": address,
                    "source": "local_panel",
                })

            # Pure organic results
            for item in data.get("organic_results", []):
                if len(raw_results) >= 30:
                    break
                title   = item.get("title", "")
                link    = item.get("link", "")
                snippet = item.get("snippet", "")
                if not title or not link:
                    continue
                if link in seen_urls:
                    continue
                if is_bad_url(link):
                    continue
                seen_urls.add(link)
                raw_results.append({
                    "title": title,
                    "link": link,
                    "snippet": snippet,
                    "phone_prefilled": "",
                    "address_prefilled": "",
                    "source": "organic",
                })

        except Exception as e:
            log(f"Organic query failed: {e}")
            traceback.print_exc()

    log(f"Step 1B done. Total raw: {len(raw_results)}")

    # Filter bad URLs (for organic; local won't have bad URLs)
    good_results = [
        item for item in raw_results
        if item["source"] in ("maps", "local_panel") or not is_bad_url(item.get("link", ""))
    ]
    log(f"After URL filter: {len(good_results)}")

    # Priority: maps (best) → local_panel → organic (needs scraping)
    maps_items        = [r for r in good_results if r["source"] == "maps"]
    local_panel_items = [r for r in good_results if r["source"] == "local_panel"]
    organic_items     = [r for r in good_results if r["source"] == "organic"]
    good_results = maps_items + local_panel_items + organic_items

    # Cap at 50 for scraping — enough to get 20+ final leads
    good_results = good_results[:50]
    log(f"Processing top {len(good_results)} results")

    # ── STEP 2: Scrape each website ──
    log("Step 2: Web scraping...")
    scraped_data = {}

    for i, item in enumerate(good_results):
        link = item.get("link", "")
        if not link:
            scraped_data[i] = {}
            continue
        log(f"Scraping {i+1}/{len(good_results)}: {link[:60]}")
        scraped_data[i] = scrape_business(link)

    log("Step 2 done")

    # ── STEP 3: Build data for Gemini ──
    log("Step 3: Gemini cleaning and description generation...")

    leads_for_gemini = []
    for i, item in enumerate(good_results):
        scraped = scraped_data.get(i, {})

        # Prefer prefilled phone (from local results), fallback to scraped
        phone = item.get("phone_prefilled") or scraped.get("phone", "")
        address = item.get("address_prefilled") or scraped.get("address", "")

        # Extract name using universal function
        extracted_name = extract_real_business_name(
            item["title"],
            item.get("link", ""),
            item.get("snippet", "")
        )

        leads_for_gemini.append({
            "index": i,
            "extracted_name": extracted_name,
            "url": item.get("link", ""),
            "snippet": item.get("snippet", "")[:200],
            "scraped_desc": scraped.get("description", "")[:150],
            "phone": phone,
            "email": scraped.get("email", ""),
            "address": address,
            "source": item["source"],
        })

    prompt = f"""You are a lead data cleaner for a sales tool.
Industry: {industry}, City: {city}

For each lead:
1. CLEAN BUSINESS NAME: Use extracted_name. Only fix obvious errors.
   Rules:
   - Remove city name, state, country
   - Remove pipe symbols, dashes at start/end
   - Remove "Official Store", "Contact Us", "Home"
   - Keep brand names as-is (e.g. HP World, Samsung Plaza)
   - Max 5 words
   - If extracted_name looks correct already, keep it

2. DESCRIPTION: Write exactly 2 sentences.
   - Sentence 1: What this specific business sells or does
   - Sentence 2: One concrete reason a buyer should contact them
   - Use snippet and scraped_desc as source
   - Do NOT mention the city
   - Do NOT use generic filler like "quality products" or "great service"
   - Be specific to this business

Leads:
{json.dumps(leads_for_gemini, indent=2)}

Return ONLY valid JSON array, no markdown:
[
  {{
    "index": 0,
    "clean_name": "Exact Business Name",
    "description": "Specific sentence 1. Specific sentence 2."
  }}
]"""

    client = get_gemini_client()
    gemini_results = []

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=prompt
        )
        text = response.text.strip()
        text = re.sub(r'^```(?:json)?', '', text).strip()
        text = re.sub(r'```$', '', text).strip()
        gemini_results = json.loads(text)
        log(f"Gemini returned {len(gemini_results)} results")
    except Exception as e:
        log(f"Gemini failed: {e}")
        traceback.print_exc()

    gemini_lookup = {g.get("index", -1): g for g in gemini_results}

    # ── STEP 4: Build final leads ──
    BAD_NAMES = [
        'top laptop', 'best laptop', 'laptop dealers in',
        'best ', 'top ', 'find ', 'contact us', 'home',
        'index', 'welcome', 'about', 'support', 'unknown business',
        'dealers in', 'shops in', 'stores in', 'services in',
        'price in', 'near me', 'what is', 'how to',
    ]

    # Names that are clearly not business names — skip immediately
    def is_garbage_name(n: str) -> bool:
        n = n.strip().lower()
        # "Rated 4", "Rated 4.5", "Rated 4/5" etc
        if re.match(r'^rated\s+[\d\.\/]+', n):
            return True
        # Pure numbers
        if re.match(r'^[\d\s\.\/]+$', n):
            return True
        # Single word that is a generic noun
        if n in {'salon', 'parlour', 'parlor', 'beauty', 'store',
                 'shop', 'center', 'centre', 'studio', 'spa',
                 'contact', 'home', 'about', 'index'}:
            return True
        # Too short
        if len(n) < 3:
            return True
        return False

    final_leads = []

    for i, item in enumerate(good_results):
        scraped = scraped_data.get(i, {})
        g = gemini_lookup.get(i, {})

        # Name: Gemini > extracted > raw title
        if g.get("clean_name") and len(g["clean_name"].strip()) > 2:
            name = g["clean_name"].strip()
        else:
            name = extract_real_business_name(
                item["title"],
                item.get("link", ""),
                item.get("snippet", "")
            )

        # Skip garbage names
        if is_garbage_name(name):
            log(f"Skipping garbage name: {name}")
            continue
        name_lower = name.lower()
        if any(bad in name_lower for bad in BAD_NAMES):
            log(f"Skipping bad name: {name}")
            continue
        if name == "Unknown Business":
            log(f"Skipping unknown at index {i}")
            continue

        # Phone: prefilled > scraped
        phone = item.get("phone_prefilled") or scraped.get("phone", "")

        # Email: scraped only
        email = scraped.get("email", "")

        # Address: prefilled > scraped
        address = item.get("address_prefilled") or scraped.get("address", "")

        # Description: Gemini > scraped meta
        description = g.get("description") or scraped.get("description", "")[:200]

        lead = {
            "name": name,
            "phone": phone,
            "email": email,
            "website": item.get("link", ""),
            "address": address,
            "description": description,
            "source": "SerpAPI + AI",
            "city": city,
        }

        final_leads.append(lead)
        log(
            f"✓ Lead {len(final_leads)}: {name} | "
            f"Phone: {phone or 'none'} | "
            f"Email: {email or 'none'}"
        )

        # Stop at 50 good leads
        if len(final_leads) >= 50:
            break

    log(f"Final leads count: {len(final_leads)}")

    # ── STEP 5: Save to Supabase ──
    log("Step 5: Saving to database...")
    saved = []

    if supabase_client:
        for lead in final_leads:
            try:
                result = supabase_client.table("leads").insert({
                    "campaign_id": campaign_id,
                    "name": lead["name"],
                    "business_name": lead["name"],
                    "city": city,
                    "phone": lead["phone"],
                    "email": lead["email"],
                    "website": lead["website"],
                    "address": lead.get("address", ""),
                    "description": lead.get("description", ""),
                    "source": lead["source"],
                    "status": "new",
                    "score": 0,
                }).execute()

                if result.data:
                    saved.append(result.data[0])
                    log(f"Saved: {lead['name']}")

            except Exception as e:
                log(f"Save error for {lead['name']}: {e}")
                saved.append(lead)
    else:
        saved = final_leads

    log(f"═══ HUNT COMPLETE: {len(saved)} leads ═══")
    return saved
