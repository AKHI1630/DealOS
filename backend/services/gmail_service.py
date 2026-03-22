import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def send_email(to_email: str, subject: str, body: str, from_email: str, password: str):
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email

        # Assume body could be used as plain text and HTML
        part1 = MIMEText(body, 'plain')
        part2 = MIMEText(body.replace('\n', '<br>'), 'html')

        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(from_email, password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        
        return {"success": True, "message": "Email sent successfully"}
    except Exception as e:
        print(f"Error sending email: {e}")
        return {"success": False, "message": str(e)}
