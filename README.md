---

<div align="center">

<img src="https://img.shields.io/badge/DealOS-v1.0-7C5CFC?style=for-the-badge&logoColor=white" />
<img src="https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
<img src="https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white" />

# ⬡ DealOS
### The Operating System for Sales

*6 autonomous AI agents that find leads, write personalised messages,*
*negotiate replies and close deals — automatically, for any business, for free.*

**Built at SRM AP Hackathon 2025 · Theme: Advanced Tech in Business**

[Live Demo](#) · [API Docs](http://localhost:8000/docs) · [Report Bug](#)

</div>

---

## 🎯 The Problem

India has **63 million small and medium businesses**. The vast majority 
cannot afford a dedicated sales team. The founder is simultaneously 
the product manager, accountant, delivery person, and salesperson.

A typical SME owner spends **4-5 hours every single day** on manual 
outbound sales:
- Searching for potential customers
- Writing individual emails that get ignored
- Following up manually or forgetting entirely
- Missing hot leads because there's no system

**DealOS gives every Indian SME owner a full autonomous AI sales 
workforce — for zero rupees.**

---

## ⚡ What DealOS Does

1. **Intelligent Lead Generation 🔎**
   Provide your industry and city, and our **Lead Hunter Agent** will autonomously compile a high-quality list of local businesses. It pulls from search engines to extract their website context, emails, and phone numbers in seconds.

2. **Personalized Omni-channel Outreach ✉️💬**
   Our **Writer Agent** analyzes each lead's website content and crafts tailored, hyper-personalized emails and WhatsApp messages highlighting exactly how your product solves their specific pain points.

3. **Autonomous Negotiation & Follow-ups 🤝**
   When a lead replies (e.g., "Too expensive" or "Tell me more"), the **Negotiator Agent** reads their sentiment, identifies the objection, and instantly drafts the perfect counter-reply to keep the deal alive. 

4. **Self-Managing Inbox & Analytics 📊**
   Seamlessly track which leads are Hot, Warm, or Cold based on our AI's lead scoring. Everything connects to an integrated dashboard that displays your funnel metrics at a glance.

---

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, Motion
- **Backend:** Python, FastAPI
- **AI Core:** Google Gemini 2.5 Flash
- **Database:** Supabase (PostgreSQL)
- **External API Integrations:** Twilio (WhatsApp API), SERP API, IMAP/SMTP (Gmail)

---

## 🚀 Getting Started

1. Clone the repository and configure `.env` variables in both the root and `backend` directory (Gemini, Supabase, Twilio, and Gmail keys).
2. Start the frontend: `npm install && npm run dev`
3. Launch the autonomous FastAPI backend: `cd backend && pip install -r requirements.txt && python main.py`

<div align="center">
<br/>
<img src="https://img.shields.io/badge/Made_with_❤️_by_smallidi-05030F?style=for-the-badge" />
</div>
