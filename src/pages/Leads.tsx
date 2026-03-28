import React, { useState, useEffect } from "react";

// ── Quantum Score Badge ──────────────────────────────────────────────────────
const ScoreBadge = ({ score, badge }: { score?: number; badge?: string }) => {
  if (score === undefined || score === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/30 border border-white/10">
        ⚛ —
      </span>
    );
  }

  const config: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    Hot:  { bg: "bg-red-500/20",    text: "text-red-300",    border: "border-red-500/40",    glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]"  },
    Warm: { bg: "bg-amber-500/20",  text: "text-amber-300",  border: "border-amber-500/40",  glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]" },
    Cold: { bg: "bg-blue-500/20",   text: "text-blue-300",   border: "border-blue-500/40",   glow: "shadow-[0_0_12px_rgba(59,130,246,0.2)]" },
    New:  { bg: "bg-white/5",       text: "text-white/40",   border: "border-white/10",      glow: ""                                        },
  };

  const b   = badge || (score >= 80 ? "Hot" : score >= 50 ? "Warm" : score >= 20 ? "Cold" : "New");
  const cfg = config[b] || config.New;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.glow}`}>
      <span className="text-[10px] opacity-70">⚛</span>
      {score}
      <span className="opacity-60 font-normal">{b}</span>
    </span>
  );
};

// ── Status Badge (existing, unchanged) ──────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    new:       "bg-white/10 text-white/50",
    generated: "bg-[#7C5CFC]/20 text-[#7C5CFC]",
    sent:      "bg-[#00FFD1]/20 text-[#00FFD1]",
    replied:   "bg-[#FFB347]/20 text-[#FFB347]",
    closed:    "bg-green-500/20 text-green-300",
    overtime:  "bg-red-500/10 text-red-400 border border-red-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[status] || map.new}`}>
      {status || "new"}
    </span>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function Leads() {
  const [myLeads, setMyLeads]               = useState<any[]>([]);
  const [search, setSearch]                 = useState("");
  const [selected, setSelected]             = useState<any>(null);
  const [generating, setGenerating]         = useState<"email" | "whatsapp" | null>(null);
  const [drafts, setDrafts]                 = useState<any>(null);
  const [error, setError]                   = useState("");
  const [sendingEmail, setSendingEmail]     = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [emailSent, setEmailSent]           = useState(false);
  const [whatsappSent, setWhatsappSent]     = useState(false);
  const [scoringId, setScoringId]           = useState<string | null>(null);
  const [scoringAll, setScoringAll]         = useState(false);

  // ── Load leads + quantum-score all on mount ────────────────────
  useEffect(() => {
    const my = JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
    setMyLeads(my);

    // Auto quantum-score all leads on page load
    scoreAllLeads(my);

    // Poll backend every 5s to sync status
    const interval = setInterval(async () => {
      const cid = localStorage.getItem("dealos_campaign_id") || "default";
      try {
        const res  = await fetch(`http://127.0.0.1:8000/api/leads/${cid}`);
        const data = await res.json();
        const arr  = Array.isArray(data) ? data : [];

        const current = JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
        let changed = false;
        const updated = current.map((l: any) => {
          const fresh = arr.find((r: any) => r.id === l.id);
          if (fresh && (fresh.status !== l.status || fresh.score !== l.score)) {
            changed = true;
            return { ...l, status: fresh.status, score: fresh.score, badge: fresh.badge };
          }
          return l;
        });
        if (changed) {
          localStorage.setItem("dealos_my_leads", JSON.stringify(updated));
          setMyLeads(updated);
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ── Quantum score ALL leads ────────────────────────────────────
  const scoreAllLeads = async (leadsOverride?: any[]) => {
    setScoringAll(true);
    try {
      const cid = localStorage.getItem("dealos_campaign_id") || "";
      const res = await fetch("http://127.0.0.1:8000/api/quantum-score-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: cid })
      });
      const data = await res.json();
      if (!data.results) return;

      const scoreMap: Record<string, { score: number; badge: string }> = {};
      data.results.forEach((r: any) => {
        if (!r.error) scoreMap[r.lead_id] = { score: r.score, badge: r.badge };
      });

      const current = leadsOverride || JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
      const updated = current.map((l: any) =>
        scoreMap[l.id] ? { ...l, score: scoreMap[l.id].score, badge: scoreMap[l.id].badge } : l
      );

      // Sort by score descending
      updated.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

      localStorage.setItem("dealos_my_leads", JSON.stringify(updated));
      setMyLeads(updated);
    } catch {}
    finally { setScoringAll(false); }
  };

  // ── Quantum score ONE lead ─────────────────────────────────────
  const scoreSingleLead = async (leadId: string) => {
    setScoringId(leadId);
    try {
      const res  = await fetch(`http://127.0.0.1:8000/api/quantum-score/${leadId}`, { method: "POST" });
      const data = await res.json();

      const current = JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
      const updated = current
        .map((l: any) => l.id === leadId ? { ...l, score: data.score, badge: data.badge } : l)
        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

      localStorage.setItem("dealos_my_leads", JSON.stringify(updated));
      setMyLeads(updated);
      if (selected?.id === leadId) setSelected((p: any) => ({ ...p, score: data.score, badge: data.badge }));
    } catch {}
    finally { setScoringId(null); }
  };

  // ── Existing handlers (unchanged) ─────────────────────────────
  const handleRemove = (lead: any) => {
    const newMy   = myLeads.filter((l: any) => l.id !== lead.id);
    const pool    = JSON.parse(localStorage.getItem("dealos_hunt_pool") || "[]");
    const newPool = [...pool, { ...lead, status: "new" }];
    setMyLeads(newMy);
    localStorage.setItem("dealos_my_leads",  JSON.stringify(newMy));
    localStorage.setItem("dealos_hunt_pool", JSON.stringify(newPool));
    if (selected?.id === lead.id) setSelected(null);
  };

  const handleGenerate = async (type: "email" | "whatsapp") => {
    if (!selected) return;
    if (drafts?.email && drafts?.whatsapp) return;
    setGenerating(type);
    setError("");
    try {
      const res  = await fetch(`http://127.0.0.1:8000/api/generate/${selected.id}`, { method: "POST" });
      if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
      const data = await res.json();
      setDrafts({ email: data.email, whatsapp: data.whatsapp });
      const updated = myLeads.map((l: any) => l.id === selected.id ? { ...l, status: "generated" } : l);
      setMyLeads(updated);
      setSelected((prev: any) => ({ ...prev, status: "generated" }));
      localStorage.setItem("dealos_my_leads", JSON.stringify(updated));
    } catch (e: any) {
      setError(e.message || "Generation failed. Is backend running?");
    } finally { setGenerating(null); }
  };

  const updateLeadStatus = (id: string, newStatus: string) => {
    const updated = myLeads.map((l: any) => l.id === id ? { ...l, status: newStatus } : l);
    setMyLeads(updated);
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status: newStatus }));
    localStorage.setItem("dealos_my_leads", JSON.stringify(updated));
  };

  const sendEmail = async () => {
    setSendingEmail(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/send-email/${selected.id}`, { method: "POST" });
      setEmailSent(true);
      updateLeadStatus(selected.id, "sent");
      setTimeout(() => scoreSingleLead(selected.id), 1000);
    } catch (e: any) { setError(e.message); } finally { setSendingEmail(false); }
  };

  const sendWhatsapp = async () => {
    setSendingWhatsApp(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/send-whatsapp/${selected.id}`, { method: "POST" });
      setWhatsappSent(true);
      updateLeadStatus(selected.id, "sent");
      setTimeout(() => scoreSingleLead(selected.id), 1000);
    } catch (e: any) { setError(e.message); } finally { setSendingWhatsApp(false); }
  };

  const sendBoth = async () => {
    setSendingEmail(true); setSendingWhatsApp(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/send/${selected.id}`, { method: "POST" });
      setEmailSent(true); setWhatsappSent(true);
      updateLeadStatus(selected.id, "sent");
      setTimeout(() => scoreSingleLead(selected.id), 1000);
    } catch (e: any) { setError(e.message); }
    finally { setSendingEmail(false); setSendingWhatsApp(false); }
  };

  const openModal = (lead: any) => {
    setSelected(lead);
    setEmailSent(false);
    setWhatsappSent(false);
    setDrafts(null);
    setError("");
  };

  const filtered = myLeads.filter(l =>
    !search ||
    l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.city?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Summary cards ──────────────────────────────────────────────
  const hotCount  = myLeads.filter(l => (l.score || 0) >= 80).length;
  const warmCount = myLeads.filter(l => (l.score || 0) >= 50 && (l.score || 0) < 80).length;
  const coldCount = myLeads.filter(l => (l.score || 0) > 0  && (l.score || 0) < 50).length;

  return (
    <div className="min-h-screen bg-[#05030F] p-6 space-y-6">

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "In Campaign",  value: myLeads.length,                                                                       color: "text-white"     },
          { label: "Hot Leads",    value: hotCount,                                                                              color: "text-red-400"   },
          { label: "Warm Leads",   value: warmCount,                                                                             color: "text-amber-400" },
          { label: "Contacted",    value: myLeads.filter(l => ["sent","replied","closed","overtime"].includes(l.status)).length, color: "text-[#00FFD1]" },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C5CFC]/50"
        />
        <button
          onClick={() => scoreAllLeads()}
          disabled={scoringAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C5CFC]/20 border border-[#7C5CFC]/30 text-[#7C5CFC] text-sm font-semibold hover:bg-[#7C5CFC]/30 disabled:opacity-50 transition-all"
        >
          {scoringAll
            ? <><span className="animate-spin">⟳</span> Scoring...</>
            : <><span>⚛</span> Re-Score All</>}
        </button>
      </div>

      {/* ── Leads Table ───────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-white/30 text-sm">
            No leads in campaign yet. Add some from the Hunt Pool.
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10 bg-[#0D0B1E]">
              <tr>
                {["Business", "Contact", "City", "Status", "⚛ Score", "Action"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((lead, i) => (
                <tr key={lead.id || i}
                  onClick={() => openModal(lead)}
                  className="hover:bg-white/5 cursor-pointer transition-colors">

                  {/* Business name */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white text-sm">{lead.business_name || lead.name || "Unknown"}</p>
                    {lead.description && <p className="text-white/30 text-xs truncate max-w-[200px]">{lead.description}</p>}
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3 text-sm space-y-0.5">
                    {lead.email && <p className="text-[#00FFD1] truncate max-w-[160px]">{lead.email}</p>}
                    {lead.phone && <p className="text-[#7C5CFC]">{lead.phone}</p>}
                    {!lead.email && !lead.phone && <span className="text-white/20">—</span>}
                  </td>

                  {/* City */}
                  <td className="px-4 py-3 text-sm text-white/50">{lead.city || "—"}</td>

                  {/* Status */}
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>

                  {/* Quantum Score */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={lead.score} badge={lead.badge} />
                      <button
                        onClick={e => { e.stopPropagation(); scoreSingleLead(lead.id); }}
                        disabled={scoringId === lead.id}
                        className="text-white/20 hover:text-[#7C5CFC] transition-colors text-xs disabled:opacity-40"
                        title="Re-score this lead">
                        {scoringId === lead.id ? "⟳" : "↻"}
                      </button>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); openModal(lead); }}
                      className="text-xs font-semibold text-[#7C5CFC] bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 px-3 py-1.5 rounded-lg hover:bg-[#7C5CFC] hover:text-white transition-all">
                      Contact →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal (unchanged structure, score added to header) ─── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0D0B1E] border border-white/10 rounded-2xl shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0D0B1E] z-10 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white pr-4">{selected.business_name || selected.name}</h2>
                <div className="mt-2 flex items-center gap-3">
                  <StatusBadge status={selected.status} />
                  <ScoreBadge score={selected.score} badge={selected.badge} />
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-white/40 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-2xl transition-colors">
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Quantum Score Card */}
              {selected.score !== undefined && selected.score !== null && (
                <div className="bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-xs mb-1 font-semibold uppercase tracking-wider">⚛ Quantum Score</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-white">{selected.score}</span>
                      <span className="text-white/40 text-sm mb-1">/ 100</span>
                    </div>
                    {/* Score bar */}
                    <div className="mt-2 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          selected.score >= 80 ? "bg-red-400" :
                          selected.score >= 50 ? "bg-amber-400" : "bg-blue-400"
                        }`}
                        style={{ width: `${selected.score}%` }}
                      />
                    </div>
                  </div>
                  <ScoreBadge score={selected.score} badge={selected.badge} />
                </div>
              )}

              {/* Contact Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Phone",   value: selected.phone        },
                  { label: "Email",   value: selected.email        },
                  { label: "City",    value: selected.city         },
                  { label: "Address", value: selected.address      },
                  { label: "Website", value: selected.website      },
                  { label: "Contact", value: selected.contact_name },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-xs mb-1">{label}</p>
                    <p className="text-white text-sm break-all">{value || "—"}</p>
                  </div>
                ))}
              </div>

              {selected.description && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-2">About</p>
                  <p className="text-white/80 text-sm leading-relaxed">{selected.description}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">{error}</div>
              )}

              {/* Send section */}
              {(drafts?.email || drafts?.whatsapp) && (
                <div className="space-y-3 pt-4 border-t border-white/10 pb-4">
                  <p className="text-white/60 text-sm text-center font-medium">Ready to send?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {drafts?.email && (
                      <button onClick={sendEmail} disabled={emailSent || sendingEmail}
                        className="py-3 rounded-xl bg-[#7C5CFC] text-white font-bold text-sm hover:bg-[#6B4EE8] disabled:opacity-50 transition-all flex justify-center items-center">
                        {sendingEmail ? "..." : emailSent ? "✅ Email Sent!" : "✉ Send Email"}
                      </button>
                    )}
                    {drafts?.whatsapp && (
                      <button onClick={sendWhatsapp} disabled={whatsappSent || sendingWhatsApp}
                        className="py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-all flex justify-center items-center">
                        {sendingWhatsApp ? "..." : whatsappSent ? "✅ WhatsApp Sent!" : "💬 Send WhatsApp"}
                      </button>
                    )}
                  </div>
                  {drafts?.email && drafts?.whatsapp && !emailSent && !whatsappSent && (
                    <button onClick={sendBoth} disabled={sendingEmail || sendingWhatsApp}
                      className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-[#7C5CFC] to-green-600 text-white hover:opacity-90 disabled:opacity-50 text-center">
                      {(sendingEmail || sendingWhatsApp) ? "Sending..." : "🚀 Send Both"}
                    </button>
                  )}
                </div>
              )}

              {/* Generate buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => handleGenerate("email")} disabled={generating !== null}
                  className="py-3 rounded-xl bg-[#7C5CFC] text-white font-bold text-sm hover:bg-[#6B4EE8] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {generating === "email" ? <><span className="animate-spin">⟳</span> Writing...</> : "✉ Write Email"}
                </button>
                <button onClick={() => handleGenerate("whatsapp")} disabled={generating !== null}
                  className="py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {generating === "whatsapp" ? <><span className="animate-spin">⟳</span> Writing...</> : "💬 Write WhatsApp"}
                </button>
              </div>

              {/* Email Draft */}
              {drafts?.email && (
                <div className="bg-white/5 border border-[#7C5CFC]/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C5CFC] font-bold text-sm">✉ Email Draft</span>
                    <button onClick={() => {
                      const text = `Subject: ${drafts.email.subject}\n\n${drafts.email.body}`;
                      navigator.clipboard.writeText(text).catch(() => {
                        const el = document.createElement("textarea");
                        el.value = text;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand("copy");
                        document.body.removeChild(el);
                      });
                    }} className="text-xs text-[#00FFD1] bg-[#00FFD1]/10 border border-[#00FFD1]/20 px-3 py-1 rounded-lg hover:bg-[#00FFD1]/20 transition-all">
                      Copy
                    </button>
                  </div>
                  <p className="text-white/50 text-xs">Subject: <span className="text-white/90">{drafts.email.subject}</span></p>
                  <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg">{drafts.email.body}</p>
                </div>
              )}

              {/* WhatsApp Draft */}
              {drafts?.whatsapp && (
                <div className="bg-white/5 border border-green-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold text-sm">💬 WhatsApp Draft</span>
                    <button onClick={() => navigator.clipboard.writeText(
                      typeof drafts.whatsapp === "string" ? drafts.whatsapp : drafts.whatsapp?.body || ""
                    )} className="text-xs text-[#7C5CFC] bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 px-3 py-1 rounded-lg">
                      Copy
                    </button>
                  </div>
                  <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg">
                    {typeof drafts.whatsapp === "string" ? drafts.whatsapp : drafts.whatsapp?.body || ""}
                  </p>
                </div>
              )}

              {drafts && (
                <button onClick={() => { setDrafts(null); handleGenerate("email"); }} disabled={generating !== null}
                  className="w-full py-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-sm transition-all">
                  ↺ Regenerate Both
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
