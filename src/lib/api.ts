export const API_BASE = "http://127.0.0.1:8000";

// ── helpers ──────────────────────────────────────────────
async function get(path: string) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post(path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function del(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

// ── API ───────────────────────────────────────────────────
export const api = {

  health: () => get("/health"),

  saveConfig: (config: BusinessConfig) =>
    post("/api/config", config),

  getLeads: (campaignId: string) =>
    get(`/api/leads/${campaignId}`),

  addManualLead: (lead: ManualLead) =>
    post("/api/manual-lead", lead),

  importCSV: async (file: File, campaignId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("campaign_id", campaignId);
    const res = await fetch(`${API_BASE}/api/import-csv`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`CSV upload failed: ${res.status}`);
    return res.json();
  },

  huntLeads: (campaignId: string, industry: string, city: string) =>
    post("/api/hunt", { campaign_id: campaignId, industry, city }),

  generateMessage: (leadId: string) =>
    post(`/api/generate/${leadId}`),

  getMessages: (leadId: string) =>
    get(`/api/messages/${leadId}`),

  approveAndSend: (messageId: string) =>
    post(`/api/approve/${messageId}`),

  analyzeReply: (payload: ReplyPayload) =>
    post("/api/analyze-reply", payload),

  getActivityLog: () =>
    get("/api/activity-log"),

  getDeals: (campaignId: string) =>
    get(`/api/deals/${campaignId}`),

  deleteCampaign: (campaignId: string) =>
    del(`/api/campaigns/${campaignId}`),
};

// ── Types ─────────────────────────────────────────────────
export interface BusinessConfig {
  business_name: string;
  product: string;
  usp: string;
  price: string;
  target_customer: string;
  city: string;
}

export interface ManualLead {
  campaign_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
}

export interface Lead {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  address?: string;
  website?: string;
  description?: string;
  status: string;
  score?: number;
  campaign_id: string;
}

export interface ReplyPayload {
  lead_id: string;
  reply_text: string;
  campaign_id: string;
}
