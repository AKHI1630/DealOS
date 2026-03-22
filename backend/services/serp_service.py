import os, re, requests, traceback

def search_leads(industry: str, city: str, api_key: str):
    print(f"[SERP] Starting: {industry} in {city}")
    
    all_leads = []
    seen = set()
    
    queries = [
        f"{industry} {city}",
        f"{industry} in {city} contact",
        f"{industry} {city} phone",
    ]
    
    for query in queries:
        if len(all_leads) >= 20:
            break
        try:
            print(f"[SERP] Query: {query}")
            resp = requests.get(
                "https://serpapi.com/search",
                params={
                    "q": query,
                    "api_key": api_key,
                    "num": 10,
                    "engine": "google"
                },
                timeout=15
            )
            data = resp.json()
            
            if "error" in data:
                print(f"[SERP] Error: {data['error']}")
                continue
            
            results = data.get("organic_results", [])
            print(f"[SERP] Got {len(results)} results")
            
            for item in results:
                if len(all_leads) >= 20:
                    break
                
                title = item.get("title","")
                link = item.get("link","")
                snippet = item.get("snippet","")
                
                if not title or not link:
                    print(f"[SERP] Skipping blank title/link")
                    continue
                if link in seen:
                    print(f"[SERP] Skipping duplicate link: {link}")
                    continue
                seen.add(link)
                
                # Clean title
                for sep in ["|"," - "," – "]:
                    if sep in title:
                        title = title.split(sep)[0].strip()
                
                # Extract phone
                phone = ""
                phone_match = re.search(r'[6-9]\d{9}', snippet + " " + title)
                if phone_match:
                    phone = phone_match.group(0)
                
                # Extract email  
                email = ""
                email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', snippet + " " + title)
                if email_match:
                    em = email_match.group(0)
                    bad = ['.png','.jpg','example','sentry']
                    if not any(b in em.lower() for b in bad):
                        email = em
                
                print(f"[SERP] Lead: {title} | Phone: {phone} | Email: {email}")
                
                all_leads.append({
                    "name": title,
                    "phone": phone,
                    "email": email,
                    "website": link,
                    "source": "SerpAPI"
                })
                
        except Exception as e:
            print(f"[SERP] Failed: {e}")
            traceback.print_exc()
    
    print(f"[SERP] Total: {len(all_leads)}")
    return all_leads
