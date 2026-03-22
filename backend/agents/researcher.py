import requests, re, traceback
from bs4 import BeautifulSoup

PHONE_PATTERNS = [
    r'\+91[\s\-]?[6-9]\d{9}',
    r'[6-9]\d{9}',
    r'0[6-9]\d{9}',
]

EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

BAD_EMAILS = ['.png','.jpg','.gif','example','yourdomain','sentry','wix','wordpress','@2x','@3x','noreply']

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def extract_phone_from_text(text):
    for pattern in PHONE_PATTERNS:
        match = re.search(pattern, text)
        if match:
            num = re.sub(r'[\s\-\+\(\)]','', match.group(0))
            num = num.lstrip('91').lstrip('0')
            if len(num) == 10:
                return num
    return ""

def extract_email_from_text(text):
    for match in EMAIL_PATTERN.finditer(text):
        email = match.group(0)
        if not any(b in email.lower() for b in BAD_EMAILS):
            return email
    return ""

def scrape_website(url):
    result = {"email": "", "phone": "", "description": ""}
    try:
        print(f"[SCRAPER] Visiting: {url}")
        resp = requests.get(url, headers=HEADERS, timeout=5)
        
        if resp.status_code != 200:
            print(f"[SCRAPER] Status: {resp.status_code}")
            return result
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Remove script/style tags
        for tag in soup(["script","style","noscript"]):
            tag.decompose()
        
        text = soup.get_text(separator=' ', strip=True)
        
        # Get email
        email = extract_email_from_text(text)
        if email:
            result["email"] = email
            print(f"[SCRAPER] Email: {email}")
        
        # Get phone
        phone = extract_phone_from_text(text)
        if phone:
            result["phone"] = phone
            print(f"[SCRAPER] Phone: {phone}")
        
        # Get description
        meta = soup.find('meta', attrs={'name':'description'})
        if meta and meta.get('content'):
            result["description"] = meta['content'][:200]
        else:
            # Try first paragraph
            p = soup.find('p')
            if p:
                result["description"] = p.get_text()[:200]
        
        # If no email on main page, try /contact page
        if not email:
            try:
                base = url.rstrip('/')
                contact_url = base + "/contact"
                cr = requests.get(contact_url, headers=HEADERS, timeout=5)
                if cr.status_code == 200:
                    ct = BeautifulSoup(cr.text, 'html.parser')
                    ct_text = ct.get_text(separator=' ', strip=True)
                    ce = extract_email_from_text(ct_text)
                    if ce:
                        result["email"] = ce
                        print(f"[SCRAPER] Contact email: {ce}")
            except:
                pass
                
    except Exception as e:
        print(f"[SCRAPER] Failed {url}: {e}")
    
    return result

def research_lead(lead):
    website = lead.get("website","")
    if not website:
        return lead
    if not website.startswith("http"):
        website = "https://" + website
    
    scraped = scrape_website(website)
    
    # Only update if found something better
    if scraped["email"] and not lead.get("email"):
        lead["email"] = scraped["email"]
    if scraped["phone"] and not lead.get("phone"):
        lead["phone"] = scraped["phone"]
    if scraped["description"]:
        lead["description"] = scraped["description"]
    
    return lead
