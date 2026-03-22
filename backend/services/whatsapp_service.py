from twilio.rest import Client
import os

def send_whatsapp(to_number: str, message: str, account_sid: str, auth_token: str):
    try:
        client = Client(account_sid, auth_token)
        
        # Ensure correct formatting for WhatsApp
        if not to_number.startswith("whatsapp:"):
            # Default to formatting standard Indian numbers or standard international dialing if provided cleanly
            formatted_number = "".join(filter(str.isdigit, to_number))
            if len(formatted_number) == 10:
                to_number = f"whatsapp:+91{formatted_number}"
            elif formatted_number.startswith("91") and len(formatted_number) == 12:
                to_number = f"whatsapp:+{formatted_number}"
            else:
                to_number = f"whatsapp:+{formatted_number}"
                
        # Handle the sender format correctly
        from_whatsapp = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
        if not from_whatsapp.startswith("whatsapp:"):
            from_whatsapp = f"whatsapp:{from_whatsapp}"

        message_resp = client.messages.create(
            body=message,
            from_=from_whatsapp,
            to=to_number
        )
        
        return {"success": True, "message": f"WhatsApp sent successfully, SID: {message_resp.sid}"}
    except Exception as e:
        print(f"Error sending WhatsApp message: {e}")
        return {"success": False, "message": str(e)}
