import traceback
import os
from database.supabase_client import supabase
from agents.lead_hunter import hunt_leads

try:
    print("Supabase URL:", os.environ.get("SUPABASE_URL"))
    print("Testing supabase campaigns select...")
    res = supabase.table("campaigns").select("*").limit(1).execute()
    if not res.data:
        print("No campaigns found, inserting one for test...")
        # create mock config
        mock_config = {
            "business_name": "Test",
            "industry": "Software",
            "target_city": "New York",
            "product": "Testing",
            "target_customer": "Developers",
            "price": "100",
            "usp": "Fast",
            "outreach_channel": "email",
            "gmail_user": "test",
            "whatsapp_number": "123"
        }
        inserted = supabase.table("campaigns").insert(mock_config).execute()
        campaign = inserted.data[0]
    else:
        campaign = res.data[0]
        
    print("Campaign:", campaign)
    print("Running hunt_leads...")
    leads = hunt_leads(campaign)
    print("Found leads:", leads)
except Exception as e:
    print("Exception caught in test script!")
    traceback.print_exc()
