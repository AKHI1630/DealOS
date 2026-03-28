from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import io
import pandas as pd
from typing import Optional
import uuid
import traceback

from database.supabase_client import supabase
from agents.lead_hunter import hunt_leads, activity_log

def log_activity(msg: str):
    print(f"[API_LOG] {msg}")
    activity_log.append(msg)
    if len(activity_log) > 50:
        activity_log.pop(0)

from agents.writer import generate_messages
from agents.scorer import score_lead
from agents.quantum_scorer import compute_quantum_score
from agents.negotiator import analyze_reply
from services.gmail_service import send_email
from services.whatsapp_service import send_whatsapp

app = FastAPI(title="DealOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CampaignConfig(BaseModel):
    business_name: str
    product: str
    target_customer: str
    price: str
    usp: str
    industry: str
    target_city: str
    outreach_channel: str
    gmail_user: str
    whatsapp_number: str

@app.post("/api/config")
def save_config(config: CampaignConfig):
    try:
        log_activity("Saving campaign config...")
        campaign_id = str(uuid.uuid4())
        insert_data = config.dict()
        insert_data["id"] = campaign_id
        data, count = supabase.table("campaigns").insert(insert_data).execute()
        log_activity(f"Campaign saved with ID {campaign_id}")
        return {"campaign_id": campaign_id}
    except Exception as e:
        log_activity(f"Error saving config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class HuntRequest(BaseModel):
    industry: str
    city: str
    campaign_id: str

import uuid

def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

@app.post("/api/hunt")
def trigger_hunt(request: HuntRequest):
    try:
        print(f"[API] Hunt called: {request.industry} in {request.city}")
        
        from agents.lead_hunter import hunt_leads
        
        campaign_id = request.campaign_id
        if not campaign_id or campaign_id == "default":
            campaign_id = str(uuid.uuid4())

        # ── Ensure campaign exists in Supabase ──
        camp_check = supabase.table("campaigns").select("id").eq("id", campaign_id).execute()
        if not camp_check.data:
            supabase.table("campaigns").insert({
                "id": campaign_id,
                "business_name": "DealOS Campaign",
                "product": "Product",
                "target_customer": "SMEs",
                "price": "0",
                "usp": "AI powered",
                "industry": request.industry,
                "target_city": request.city,
                "outreach_channel": "both",
                "gmail_user": "",
                "whatsapp_number": ""
            }).execute()
            log_activity(f"Created campaign {campaign_id}")
            
        leads = hunt_leads(
            industry=request.industry,
            city=request.city,
            campaign_id=campaign_id,
            api_key=os.getenv("SERP_API_KEY"),
            supabase_client=supabase
        )
        
        print(f"[API] Returning {len(leads)} leads")
        
        return {
            "success": True,
            "leads_found": len(leads),
            "leads": leads
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(e))

@app.post("/api/generate/{lead_id}")
async def generate_msgs(lead_id: str):
    try:
        log_activity(f"Generating messages for lead {lead_id}...")
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]
        print(f"[DEBUG] Lead found: {lead['business_name']}")
        print(f"[DEBUG] Campaign ID: {lead['campaign_id']}")

        camp_res = supabase.table("campaigns").select("*").eq("id", lead["campaign_id"]).execute()
        print(f"[DEBUG] Campaign data: {camp_res.data}")
        
        if not camp_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        campaign = camp_res.data[0]

        from agents.writer import generate_messages
        print(f"[DEBUG] Calling generate_messages...")
        messages = await generate_messages(lead, campaign)
        print(f"[DEBUG] Messages generated: {messages.keys()}")
        
        msg_data = {
            "lead_id": lead_id,
            "email_subject": messages.get("email", {}).get("subject") if messages.get("email") else None,
            "email_body": messages.get("email", {}).get("body") if messages.get("email") else None,
            "whatsapp_msg": messages.get("whatsapp"),
            "approval_status": "pending"
        }
        res = supabase.table("messages").insert(msg_data).execute()
        message_id = res.data[0]["id"] if res.data else None

        return {
            "email": messages.get("email"),
            "whatsapp": messages.get("whatsapp"),
            "channel": messages.get("channel"),
            "scraped_context": messages.get("scraped_context"),
            "message_id": message_id
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/score/{lead_id}")
def score_single_lead(lead_id: str):
    try:
        log_activity(f"Scoring lead {lead_id}...")
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]
        
        camp_res = supabase.table("campaigns").select("*").eq("id", lead["campaign_id"]).execute()
        campaign = camp_res.data[0]
        
        score_res = score_lead(lead, campaign)
        
        supabase.table("leads").update({
            "score": score_res.get("score"),
            "score_reason": score_res.get("reason")
        }).eq("id", lead_id).execute()
        
        log_activity(f"Lead {lead_id} scored: {score_res.get('score')}")
        return score_res
    except Exception as e:
        log_activity(f"Error scoring lead: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quantum-score/{lead_id}")
def quantum_score_lead(lead_id: str):
    """
    Compute a quantum-enhanced score for a single lead.

    1. Fetch lead row
    2. Fetch all replies for this lead
    3. Pass to quantum_scorer → get final score + badge
    4. Update leads table with new score + score_reason
    5. Return the result
    """
    try:
        from agents.quantum_scorer import compute_quantum_score

        # ── Fetch lead ────────────────────────────────────────────
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]

        # ── Fetch replies ─────────────────────────────────────────
        replies_res = supabase.table("replies") \
            .select("*") \
            .eq("lead_id", lead_id) \
            .order("replied_at", desc=True) \
            .execute()
        replies      = replies_res.data or []
        latest_reply = replies[0] if replies else None
        reply_count  = len(replies)

        # ── Run quantum scorer ────────────────────────────────────
        result = compute_quantum_score(
            lead=lead,
            latest_reply=latest_reply,
            reply_count=reply_count,
        )

        # ── Persist back to Supabase ──────────────────────────────
        supabase.table("leads").update({
            "score":        result["score"],
            "score_reason": result["reason"],
        }).eq("id", lead_id).execute()

        log_activity(
            f"⚛ Quantum scored {lead.get('business_name', lead_id)}: "
            f"{result['score']} ({result['badge']}) +{result['quantum_boost']:.1f} boost"
        )

        return {
            "lead_id":       lead_id,
            "score":         result["score"],
            "badge":         result["badge"],
            "sentiment":     result["sentiment"],
            "quantum_boost": result["quantum_boost"],
            "reason":        result["reason"],
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quantum-score-all")
def quantum_score_all_leads(body: dict = {}):
    """
    Score ALL leads in the current campaign at once.
    Called when the Leads page loads or refreshes.
    Returns list of {lead_id, score, badge} for the frontend to apply.
    """
    try:
        from agents.quantum_scorer import compute_quantum_score

        # Only score leads that have been interacted with
        # Filter by campaign_id if provided
        campaign_id = body.get("campaign_id")

        query = supabase.table("leads").select("*")
        
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)
        else:
            # Only score leads with actual activity - not all 140 blank ones
            query = query.in_("status", ["sent", "replied", "generated", "closed"])

        leads_res = query.execute()
        leads     = leads_res.data or []

        if not leads:
            return {"scored": 0, "results": []}

        results = []
        for lead in leads:
            try:
                replies_res = supabase.table("replies") \
                    .select("*") \
                    .eq("lead_id", lead["id"]) \
                    .order("replied_at", desc=True) \
                    .execute()
                replies      = replies_res.data or []
                latest_reply = replies[0] if replies else None
                reply_count  = len(replies)

                result = compute_quantum_score(
                    lead=lead,
                    latest_reply=latest_reply,
                    reply_count=reply_count,
                )

                supabase.table("leads").update({
                    "score":        result["score"],
                    "score_reason": result["reason"],
                }).eq("id", lead["id"]).execute()

                results.append({
                    "lead_id":       lead["id"],
                    "score":         result["score"],
                    "badge":         result["badge"],
                    "sentiment":     result["sentiment"],
                    "quantum_boost": result["quantum_boost"],
                })
            except Exception as e:
                results.append({"lead_id": lead["id"], "error": str(e)})

        log_activity(f"⚛ Quantum scored {len(results)} active leads")
        return {"scored": len(results), "results": results}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send/{lead_id}")
def send_messages(lead_id: str):
    try:
        log_activity(f"Sending messages for lead {lead_id}...")
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]
        
        msg_res = supabase.table("messages").select("*").eq("lead_id", lead_id).execute()
        if not msg_res.data:
            raise HTTPException(status_code=400, detail="No generated messages found for this lead")
        msg = msg_res.data[-1]
        
        results = {}
        
        if lead.get("email") and msg.get("email_subject"):
            pwd = os.environ.get("GMAIL_PASSWORD")
            usr = os.environ.get("GMAIL_USER")
            res = send_email(lead["email"], msg["email_subject"], msg["email_body"], usr, pwd)
            results["email"] = res
            
        if lead.get("phone") and msg.get("whatsapp_msg"):
            sid = os.environ.get("TWILIO_ACCOUNT_SID")
            token = os.environ.get("TWILIO_AUTH_TOKEN")
            res = send_whatsapp(lead["phone"], msg["whatsapp_msg"], sid, token)
            results["whatsapp"] = res
            
        from datetime import datetime
        supabase.table("messages").update({
            "sent_at": datetime.utcnow().isoformat()
        }).eq("id", msg["id"]).execute()
        
        log_activity(f"Sent messages for lead {lead_id}.")
        return results
    except Exception as e:
        log_activity(f"Error sending messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeReplyReq(BaseModel):
    lead_id: str
    reply_text: str

@app.post("/api/analyze-reply")
def analyze_lead_reply(req: AnalyzeReplyReq):
    try:
        log_activity(f"Analyzing reply for lead {req.lead_id}...")
        lead_res = supabase.table("leads").select("*").eq("id", req.lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]
        
        camp_res = supabase.table("campaigns").select("*").eq("id", lead["campaign_id"]).execute()
        campaign = camp_res.data[0]
        
        analysis = analyze_reply(req.reply_text, lead, campaign)
        
        reply_data = {
            "lead_id": req.lead_id,
            "reply_text": req.reply_text,
            "sentiment": analysis.get("sentiment"),
            "interest_score": analysis.get("interest_score"),
            "strategy": analysis.get("strategy"),
            "draft_reply": analysis.get("draft_reply")
        }
        res = supabase.table("replies").insert(reply_data).execute()
        
        log_activity("Reply analyzed and saved.")
        return analysis
    except Exception as e:
        log_activity(f"Error analyzing reply: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/{campaign_id}")
def get_leads(campaign_id: str):
    try:
        if campaign_id in ["latest", "test-001"]:
            # Don't use file - just get ALL recent leads
            result = supabase.table("leads")\
                .select("*")\
                .order("created_at", desc=True)\
                .limit(50)\
                .execute()
            leads = result.data or []
            print(f"-> Latest: returning {len(leads)} leads")
            return {"leads": leads}
        
        result = supabase.table("leads")\
            .select("*")\
            .eq("campaign_id", campaign_id)\
            .order("score", desc=True)\
            .execute()
        leads = result.data or []
        print(f"-> Campaign {campaign_id}: {len(leads)} leads")
        return {"leads": leads}
    except Exception as e:
        traceback.print_exc()
        return {"leads": []}

@app.get("/api/leads/detail/{lead_id}")
def get_lead_detail(lead_id: str):
    try:
        result = supabase.table("leads")\
            .select("*")\
            .eq("id", lead_id)\
            .execute()
        if result.data:
            return result.data[0]
        return {}
    except Exception as e:
        return {}

@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: str):
    try:
        supabase.table("leads")\
            .delete()\
            .eq("id", lead_id)\
            .execute()
        return {"success": True}
    except Exception as e:
        return {"success": False}

class TierUpdateReq(BaseModel):
    tier: str

@app.put("/api/leads/{lead_id}/tier")
def update_lead_tier(lead_id: str, req: TierUpdateReq):
    try:
        supabase.table("leads").update({"tier": req.tier}).eq("id", lead_id).execute()
        return {"success": True, "tier": req.tier}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/leads/wipe/{campaign_id}")
def wipe_campaign_leads(campaign_id: str):
    try:
        supabase.table("leads").delete().eq("campaign_id", campaign_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: str):
    try:
        supabase.table("campaigns").delete().eq("id", campaign_id).execute()
        return {"success": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.get("/api/messages/{lead_id}")
def get_messages(lead_id: str):
    try:
        res = supabase.table("messages").select("*").eq("lead_id", lead_id).execute()
        return {"messages": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/activity-log")
def get_activity_log():
    from agents.lead_hunter import activity_log
    return {"logs": activity_log[-20:]}

@app.get("/api/deals/{campaign_id}")
def get_deals(campaign_id: str):
    try:
        leads = supabase.table("leads").select("id").eq("campaign_id", campaign_id).execute()
        if not leads.data:
            return {"deals": []}
            
        lead_ids = [l["id"] for l in leads.data]
        deals = supabase.table("deals").select("*").in_("lead_id", lead_ids).execute()
        return {"deals": deals.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/approve/{message_id}")
async def approve_message(message_id: str):
    try:
        log_activity(f"Approving message {message_id}...")
        res = supabase.table("messages").update({"approval_status": "approved"}).eq("id", message_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Message not found")
            
        msg = res.data[0]
        await send_messages(msg["lead_id"])
        return {"status": "approved and sent"}
    except Exception as e:
        log_activity(f"Error approving message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ManualLeadReq(BaseModel):
    campaign_id: str
    business_name: str
    city: str
    phone: Optional[str] = None
    email: Optional[str] = None

@app.post("/api/manual-lead")
def add_manual_lead(req: ManualLeadReq):
    try:
        log_activity(f"Processing manual lead: {req.business_name}")
        
        # 1. Check if a lead with this phone already exists in this campaign
        existing = supabase.table("leads").select("id").eq("phone", req.phone).eq("campaign_id", req.campaign_id).execute()
        
        lead_data = {
            "campaign_id": req.campaign_id,
            "name": req.business_name,
            "business_name": req.business_name,
            "city": req.city,
            "phone": req.phone,
            "email": req.email,
            "source": "Manual",
            "status": "pending"
        }

        if existing.data:
            # UPDATE existing instead of inserting new
            lead_id = existing.data[0]["id"]
            res = supabase.table("leads").update(lead_data).eq("id", lead_id).execute()
            log_activity(f"Existing lead updated: {lead_id}")
        else:
            # Truly new lead
            res = supabase.table("leads").insert(lead_data).execute()
            lead_id = res.data[0]["id"]
            log_activity(f"New lead created: {lead_id}")

        lead = res.data[0]
        
        # 2. Re-calculate score
        camp_res = supabase.table("campaigns").select("*").eq("id", req.campaign_id).execute()
        if camp_res.data:
            score_res = score_lead(lead, camp_res.data[0])
            supabase.table("leads").update({
                "score": score_res.get("score"),
                "score_reason": score_res.get("reason")
            }).eq("id", lead_id).execute()
            lead["score"] = score_res.get("score")
            lead["score_reason"] = score_res.get("reason")
        
        return lead
    except Exception as e:
        log_activity(f"Error in manual lead upsert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/import-csv")
async def import_csv(campaign_id: str = Form(...), file: UploadFile = File(...)):
    try:
        log_activity(f"Importing CSV for campaign {campaign_id}...")
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))

        # Auto-create campaign if it doesn't exist
        camp_res = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()
        if not camp_res.data:
            log_activity(f"Campaign {campaign_id} not found — auto-creating...")
            supabase.table("campaigns").insert({
                "id": campaign_id,
                "business_name": "DealOS Campaign",
                "product": "Product",
                "target_customer": "SMEs",
                "price": "0",
                "usp": "AI powered outreach",
                "industry": "General",
                "target_city": "India",
                "outreach_channel": "both",
                "gmail_user": "",
                "whatsapp_number": ""
            }).execute()
            camp_res = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()

        campaign = camp_res.data[0]

        imported_leads = []
        cols = {str(c).lower().strip(): c for c in df.columns}

        name_col  = cols.get("business_name") or cols.get("name") or cols.get("company")
        city_col  = cols.get("city") or cols.get("location")
        phone_col = cols.get("phone") or cols.get("contact") or cols.get("mobile")
        email_col = cols.get("email")

        for _, row in df.iterrows():
            phone_val = str(row[phone_col]).strip() if phone_col and not pd.isna(row[phone_col]) else ""
            lead_data = {
                "campaign_id":  campaign_id,
                "name":         str(row[name_col]).strip() if name_col else "Unknown",
                "business_name": str(row[name_col]).strip() if name_col else "Unknown",
                "city":         str(row[city_col]).strip() if city_col else "Unknown",
                "phone":        phone_val,
                "email":        str(row[email_col]).strip() if email_col and not pd.isna(row[email_col]) else "",
                "source":       "CSV Import",
                "status":       "new",
                "score":        0
            }

            # Upsert: check if lead with this phone already exists in campaign
            if phone_val:
                existing = supabase.table("leads").select("id").eq("phone", phone_val).eq("campaign_id", campaign_id).execute()
            else:
                existing = type('obj', (object,), {'data': []})()  # no phone → always insert

            if existing.data:
                lead_id = existing.data[0]["id"]
                res = supabase.table("leads").update(lead_data).eq("id", lead_id).execute()
                log_activity(f"CSV upsert — updated existing lead: {lead_id}")
            else:
                res = supabase.table("leads").insert(lead_data).execute()
                log_activity(f"CSV upsert — new lead created")

            if res.data:
                imported_leads.append(res.data[0])

        log_activity(f"Imported {len(imported_leads)} leads from CSV.")
        # Return as "leads" so frontend can read it
        return {"leads": imported_leads, "imported_leads": imported_leads}
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_activity(f"Error importing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-email/{lead_id}")
def send_email_only(lead_id: str):
    try:
        log_activity(f"Sending Email for lead {lead_id}...")
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]

        msg_res = supabase.table("messages").select("*")\
            .eq("lead_id", lead_id)\
            .execute()
        
        if not msg_res.data:
            raise HTTPException(status_code=400, detail="No messages found. Generate first.")
        msg = msg_res.data[-1]  # Get latest

        email_text = msg.get("email_body")
        email_subject = msg.get("email_subject")
        if not email_text or not email_subject:
            raise HTTPException(status_code=400, detail="No email message in draft")

        email_addr = lead.get("email", "")
        if not email_addr:
            raise HTTPException(status_code=400, detail="Lead has no email address")

        pwd = os.environ.get("GMAIL_PASSWORD")
        usr = os.environ.get("GMAIL_USER")
        
        res = send_email(email_addr, email_subject, email_text, usr, pwd)

        from datetime import datetime
        supabase.table("messages").update({
            "sent_at": datetime.utcnow().isoformat()
        }).eq("id", msg["id"]).execute()

        supabase.table("leads").update({"status": "sent"}).eq("id", lead_id).execute()
        log_activity(f"Email sent to {lead.get('business_name')}")
        
        return {"success": True, "sent_to": email_addr, "result": res}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-whatsapp/{lead_id}")
def send_whatsapp_only(lead_id: str):
    try:
        log_activity(f"Sending WhatsApp for lead {lead_id}...")
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]

        # Get latest message
        msg_res = supabase.table("messages").select("*")\
            .eq("lead_id", lead_id)\
            .execute()
        
        if not msg_res.data:
            raise HTTPException(status_code=400, detail="No messages found. Generate first.")
        msg = msg_res.data[-1]

        whatsapp_text = msg.get("whatsapp_msg")
        if not whatsapp_text:
            raise HTTPException(status_code=400, detail="No WhatsApp message in draft")

        phone = lead.get("phone", "")
        if not phone:
            raise HTTPException(status_code=400, detail="Lead has no phone number")

        sid   = os.environ.get("TWILIO_ACCOUNT_SID")
        token = os.environ.get("TWILIO_AUTH_TOKEN")
        
        from services.whatsapp_service import send_whatsapp
        result = send_whatsapp(phone, whatsapp_text, sid, token)

        supabase.table("leads").update({"status": "sent"}).eq("id", lead_id).execute()
        log_activity(f"WhatsApp sent to {lead.get('business_name')}")
        
        return {"success": True, "sent_to": phone, "result": result}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/check-email-replies")
def check_email_replies():
    import imaplib, email as email_lib, re
    from email.header import decode_header
    try:
        gmail_user = os.environ.get("GMAIL_USER")
        gmail_pass = os.environ.get("GMAIL_PASSWORD")
        if not gmail_user or not gmail_pass:
            return {"checked": 0, "new_replies": [], "error": "Gmail not configured"}

        # Get all leads with email that are in "sent" or "replied" status
        leads_res = supabase.table("leads").select("*")\
            .in_("status", ["sent", "replied"])\
            .not_.is_("email", "null")\
            .execute()
        
        active_leads = [l for l in (leads_res.data or []) if l.get("email", "").strip()]
        if not active_leads:
            return {"checked": 0, "new_replies": [], "message": "No active email leads"}

        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(gmail_user, gmail_pass)
        mail.select("inbox")

        new_replies = []
        checked = 0

        for lead in active_leads:
            lead_email = lead.get("email", "").strip()
            if not lead_email:
                continue

            # --- 30-MINUTE TIMEOUT LOGIC ---
            from datetime import datetime, timezone, timedelta
            msg_res = supabase.table("messages").select("sent_at").eq("lead_id", lead["id"]).execute()
            if msg_res.data and msg_res.data[-1].get("sent_at"):
                sent_time_str = msg_res.data[-1]["sent_at"]
                if sent_time_str.endswith('Z'):
                    sent_time_str = sent_time_str[:-1] + '+00:00'
                try:
                    sent_time = datetime.fromisoformat(sent_time_str)
                    # If older than 30 minutes, mark as overtime and STOP checking
                    if datetime.now(timezone.utc) - sent_time > timedelta(minutes=30):
                        supabase.table("leads").update({"status": "overtime"}).eq("id", lead["id"]).execute()
                        log_activity(f"Lead {lead.get('business_name')} moved to overtime (30m expired)")
                        continue # Skip IMAP search entirely for this lead
                except Exception as e:
                    print(f"Time parsing error for {lead['id']}: {e}")
            # ------------------------------

            try:
                # Search for UNSEEN emails FROM this specific lead
                _, msgs = mail.search(None, f'(UNSEEN FROM "{lead_email}")')
                email_ids = msgs[0].split()
                checked += len(email_ids)

                if not email_ids:
                    continue

                # Get campaign for context
                camp_res = supabase.table("campaigns").select("*")\
                    .eq("id", lead["campaign_id"]).execute()
                if not camp_res.data:
                    continue
                campaign = camp_res.data[0]

                # Process each email from this lead
                for eid in email_ids:
                    try:
                        _, msg_data = mail.fetch(eid, "(RFC822)")
                        msg = email_lib.message_from_bytes(msg_data[0][1])

                        # Get body
                        body = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                if part.get_content_type() == "text/plain":
                                    try:
                                        body = part.get_payload(decode=True).decode(errors="ignore")
                                        break
                                    except: pass
                        else:
                            try:
                                body = msg.get_payload(decode=True).decode(errors="ignore")
                            except: pass

                        if not body.strip():
                            continue

                        # Analyze with Gemini
                        from agents.negotiator import analyze_reply
                        analysis = analyze_reply(body[:500], lead, campaign)

                        # Save reply
                        supabase.table("replies").insert({
                            "lead_id":        lead["id"],
                            "reply_text":     body[:500].strip(),
                            "sentiment":      analysis.get("sentiment"),
                            "interest_score": analysis.get("interest_score"),
                            "strategy":       analysis.get("strategy"),
                            "draft_reply":    analysis.get("draft_reply")
                        }).execute()

                        # Update lead status to replied
                        supabase.table("leads").update({"status": "replied"})\
                            .eq("id", lead["id"]).execute()

                        # Mark email as read
                        mail.store(eid, '+FLAGS', '\\Seen')

                        log_activity(f"📧 Email reply from {lead.get('business_name')}: {analysis.get('sentiment')}")
                        new_replies.append({
                            "lead":      lead["business_name"],
                            "lead_id":   lead["id"],
                            "sentiment": analysis.get("sentiment"),
                            "channel":   "email"
                        })

                    except Exception as e:
                        print(f"Email parse error for {lead_email}: {e}")
                        continue

            except Exception as e:
                print(f"IMAP search error for {lead_email}: {e}")
                continue

        mail.close()
        mail.logout()
        return {"checked": checked, "new_replies": new_replies}

    except Exception as e:
        print(f"Gmail polling error: {e}")
        import traceback
        traceback.print_exc()
        return {"checked": 0, "new_replies": [], "error": str(e)}

from fastapi import Request

@app.post("/api/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    try:
        form = await request.form()
        
        from_number = str(form.get("From", "")).replace("whatsapp:+91", "").replace("whatsapp:+", "").replace("whatsapp:", "")
        body = str(form.get("Body", ""))
        
        log_activity(f"Reply from {from_number}: {body[:50]}")
        
        # Find lead by phone number - get the most recently CONTACTED lead
        lead_res = supabase.table("leads")\
            .select("*")\
            .eq("phone", from_number)\
            .in_("status", ["sent", "replied"])\
            .execute()
        
        if not lead_res.data:
            # Try with 91 prefix stripped differently
            lead_res = supabase.table("leads")\
                .select("*")\
                .ilike("phone", f"%{from_number[-10:]}")\
                .in_("status", ["sent", "replied"])\
                .execute()
        
        if not lead_res.data:
            log_activity(f"No lead found for {from_number}")
            return {"status": "lead not found"}
        
        # Sort leads by created_at and take the latest one
        matching_leads = sorted(lead_res.data, key=lambda x: x.get("created_at", ""))
        lead = matching_leads[-1]
        
        # Get campaign
        camp_res = supabase.table("campaigns")\
            .select("*")\
            .eq("id", lead["campaign_id"])\
            .execute()
        
        if not camp_res.data:
            return {"status": "campaign not found"}
        
        campaign = camp_res.data[0]
        
        # Run Gemini sentiment analysis
        from agents.negotiator import analyze_reply
        analysis = analyze_reply(body, lead, campaign)
        
        # Save reply to database
        supabase.table("replies").insert({
            "lead_id": lead["id"],
            "reply_text": body,
            "sentiment": analysis.get("sentiment"),
            "interest_score": analysis.get("interest_score"),
            "strategy": analysis.get("strategy"),
            "draft_reply": analysis.get("draft_reply")
        }).execute()
        
        # Update lead status to replied
        supabase.table("leads").update({"status": "replied"})\
            .eq("id", lead["id"])\
            .execute()
        
        log_activity(f"Reply analyzed: {analysis.get('sentiment')} — {lead.get('business_name')}")
        
        # Return TwiML empty response (required by Twilio)
        from fastapi.responses import Response
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            media_type="application/xml"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_activity(f"Webhook error: {str(e)}")
        from fastapi.responses import Response
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            media_type="application/xml"
        )


@app.get("/api/conversation/{lead_id}")
def get_conversation(lead_id: str):
    try:
        # Fetch everything for this lead
        replies_res = supabase.table("replies").select("*").eq("lead_id", lead_id).execute()
        messages_res = supabase.table("messages").select("*").eq("lead_id", lead_id).execute()
        
        raw_messages = messages_res.data or []
        raw_replies = replies_res.data or []
        
        combined = []
        
        # Add sent messages
        for m in raw_messages:
            created = m.get("created_at") or m.get("sent_at")
            if m.get("email_body"):
                combined.append({
                    "type": "sent",
                    "text": f"Subject: {m.get('email_subject', '')}\n\n{m.get('email_body', '')}",
                    "channel": "email",
                    "time": created
                })
            if m.get("whatsapp_msg"):
                combined.append({
                    "type": "sent",
                    "text": m.get("whatsapp_msg"),
                    "channel": "whatsapp",
                    "time": created
                })
                
        # Add received replies
        for r in raw_replies:
            combined.append({
                "type": "received",
                "text": r.get("reply_text", ""),
                "sentiment": r.get("sentiment", ""),
                "interest_score": r.get("interest_score", 0),
                "strategy": r.get("strategy", ""),
                "draft_reply": r.get("draft_reply", ""),
                "time": r.get("created_at") or r.get("replied_at")
            })
            
        # Sort everything strictly by time
        combined.sort(key=lambda x: x.get("time") or "")
        
        return {
            "conversation": combined,
            "latest_reply": raw_replies[-1] if raw_replies else None
        }
    except Exception as e:
        print(f"Conversation error: {e}")
        return {"conversation": [], "latest_reply": None}

@app.get("/api/replies/{lead_id}")
def get_lead_replies(lead_id: str):
    try:
        res = supabase.table("replies").select("*")\
            .eq("lead_id", lead_id)\
            .execute()
        # Return last reply (most recent)
        return res.data[-1] if res.data else {}
    except Exception as e:
        print(f"Replies error: {e}")
        return {}

@app.post("/api/send-reply/{lead_id}")
def send_reply(lead_id: str, body: dict):
    try:
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead = lead_res.data[0]

        reply_text = body.get("reply_text", "")
        if not reply_text:
            raise HTTPException(status_code=400, detail="No reply text")

        # Get channel from frontend, default to whatsapp
        channel = body.get("channel", "whatsapp")
        
        from datetime import datetime
        now_iso = datetime.utcnow().isoformat()
        
        result = None
        if channel == "email" and lead.get("email"):
            from services.gmail_service import send_email
            pwd = os.environ.get("GMAIL_PASSWORD")
            usr = os.environ.get("GMAIL_USER")
            
            # Find the previous email subject to keep the thread going cleanly
            msg_res = supabase.table("messages").select("email_subject").eq("lead_id", lead_id).execute()
            subject = "Re: Following up"
            if msg_res.data:
                for m in reversed(msg_res.data):
                    if m.get("email_subject"):
                        subject = m["email_subject"]
                        if not subject.startswith("Re:"):
                            subject = f"Re: {subject}"
                        break

            # Send via Gmail
            result = send_email(lead["email"], subject, reply_text, usr, pwd)
            
            # Save to messages table so it appears in the Inbox history
            supabase.table("messages").insert({
                "lead_id": lead_id,
                "email_subject": subject,
                "email_body": reply_text,
                "whatsapp_msg": None,
                "approval_status": "approved",
                "sent_at": now_iso
            }).execute()
            
        else:
            sid   = os.environ.get("TWILIO_ACCOUNT_SID")
            token = os.environ.get("TWILIO_AUTH_TOKEN")
            from services.whatsapp_service import send_whatsapp
            
            # Send via Twilio
            result = send_whatsapp(lead.get("phone", ""), reply_text, sid, token)
            
            # Save to messages table so it appears in the Inbox history
            supabase.table("messages").insert({
                "lead_id": lead_id,
                "email_subject": None,
                "email_body": None,
                "whatsapp_msg": reply_text,
                "approval_status": "approved",
                "sent_at": now_iso
            }).execute()

        # Kick the lead back to 'sent' status waiting for their next reply
        supabase.table("leads").update({"status": "sent"}).eq("id", lead_id).execute()
        log_activity(f"Counter-reply sent to {lead.get('business_name')} via {channel}")

        return {"success": True, "result": result}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
