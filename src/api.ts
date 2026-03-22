export const API_BASE = "http://localhost:8000"

export async function huntLeads(industry: string, city: string) {
  const res = await fetch(`${API_BASE}/api/hunt`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      industry, city, campaign_id: "test-001"
    })
  })
  if (!res.ok) throw new Error("API Error: Backend offline or failed");
  return res.json()
}

export async function getLeads() {
  const res = await fetch(`${API_BASE}/api/leads/test-001`)
  if (!res.ok) throw new Error("API Error");
  return res.json()
}

export async function getActivityLog() {
  const res = await fetch(`${API_BASE}/api/activity-log`)
  if (!res.ok) throw new Error("API Error");
  return res.json()
}

export async function generateMessages(leadId: string) {
  const res = await fetch(`${API_BASE}/api/generate/${leadId}`, {
    method: "POST"
  })
  if (!res.ok) throw new Error("API Error");
  return res.json()
}

export async function sendMessages(leadId: string) {
  const res = await fetch(`${API_BASE}/api/send/${leadId}`, {
    method: "POST"
  })
  if (!res.ok) throw new Error("API Error");
  return res.json()
}
