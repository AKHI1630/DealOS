import React, { useState, useEffect } from "react";

export default function Leads() {
  const [myLeads, setMyLeads]   = useState<any[]>([]);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [generating, setGenerating] = useState<"email"|"whatsapp"|null>(null);
  const [drafts, setDrafts]     = useState<any>(null);
  const [error, setError]       = useState("");
  const [sendingEmail, setSendingEmail]       = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [emailSent, setEmailSent]             = useState(false);
  const [whatsappSent, setWhatsappSent]       = useState(false);

  useEffect(() => {
    // Load from localStorage
    const my = JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
    setMyLeads(my);

    // Poll backend every 5 seconds to sync status
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
          if (fresh && fresh.status !== l.status) {
            changed = true;
            return { ...l, status: fresh.status };
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
    } finally {
      setGenerating(null);
    }
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
      await fetch(`http://127.0.0.1:8000/api/send-email/${selected.id}`, { method: 'POST' });
      setEmailSent(true);
      updateLeadStatus(selected.id, "sent");
    } catch(e: any) { setError(e.message); } finally { setSendingEmail(false); }
  };

  const sendWhatsapp = async () => {
    setSendingWhatsApp(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/send-whatsapp/${selected.id}`, { method: 'POST' });
      setWhatsappSent(true);
      updateLeadStatus(selected.id, "sent");
    } catch(e: any) { setError(e.message); } finally { setSendingWhatsApp(false); }
  };

  const sendBoth = async () => {
    setSendingEmail(true); setSendingWhatsApp(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/send/${selected.id}`, { method: 'POST' });
      setEmailSent(true); setWhatsappSent(true);
      updateLeadStatus(selected.id, "sent");
    } catch(e: any) { setError(e.message); } finally { setSendingEmail(false); setSendingWhatsApp(false); }
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

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      new:       "bg-white/10 text-white/50",
      generated: "bg-[#7C5CFC]/20 text-[#7C5CFC]",
      sent:      "bg-[#00FFD1]/20 text-[#00FFD1]",
      replied:   "bg-[#FFB347]/20 text-[#FFB347]",
      closed:    "bg-green-500/20 text-green-300",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[status] || map.new}`}>
        {status || "new"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#05030F] p-6 space-y-6">

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "In Campaign",  value: myLeads.length,                                                           color: "text-white"     },
          { label: "Contacted",    value: myLeads.filter(l => ["sent","replied","closed"].includes(l.status)).length, color: "text-[#00FFD1]" },
          { label: "With Email",   value: myLeads.filter(l => l.email).length,                                      color: "text-[#FFB347]" },
          { label: "With Phone",   value: myLeads.filter(l => l.phone).length,                                      color: "text-[#7C5CFC]" },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          My Leads <span className="text-white/30 text-lg font-normal ml-2">Campaign</span>
        </h2>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, email, city..."
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white
                     placeholder-white/30 text-sm focus:outline-none focus:border-[#7C5CFC] w-72 transition-colors" />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-white/30">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-lg font-semibold text-white/40">No leads in campaign</p>
            <p className="text-sm mt-2">Go to Dashboard → Find New Leads → Add to Campaign</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                {["Business Name", "Phone", "Email", "City", "Status", "Action", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((lead) => (
                <tr key={lead.id} onClick={() => openModal(lead)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-white font-semibold text-sm group-hover:text-[#7C5CFC] transition-colors">
                      {lead.business_name || lead.name}
                    </p>
                    {lead.address && <p className="text-white/30 text-xs truncate max-w-[200px]">{lead.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lead.phone ? <span className="text-[#7C5CFC] font-mono">{lead.phone}</span> : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lead.email ? <span className="text-[#00FFD1] truncate block max-w-[160px]">{lead.email}</span> : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-sm">{lead.city}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); openModal(lead); }}
                      className="px-3 py-1.5 rounded-lg border border-[#7C5CFC]/30 text-[#7C5CFC]
                                 text-xs font-bold hover:bg-[#7C5CFC] hover:text-white transition-all">
                      Contact →
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); handleRemove(lead); }}
                      className="text-white/20 hover:text-red-400 w-7 h-7 rounded-full hover:bg-red-500/10 flex items-center justify-center transition-all text-lg font-bold"
                      title="Remove">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0D0B1E] border border-white/10 rounded-2xl shadow-2xl">

            <div className="flex items-start justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0D0B1E] z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.business_name || selected.name}</h2>
                <div className="mt-1"><StatusBadge status={selected.status} /></div>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Phone",   value: selected.phone   },
                  { label: "Email",   value: selected.email   },
                  { label: "City",    value: selected.city    },
                  { label: "Address", value: selected.address },
                  { label: "Website", value: selected.website },
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

              {/* Send section - shown after generation */}
              {(drafts?.email || drafts?.whatsapp) && (
                <div className="space-y-3 pt-4 border-t border-white/10 pb-4">
                  <p className="text-white/60 text-sm text-center font-medium">Ready to send?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {drafts?.email && (
                      <button onClick={sendEmail} disabled={emailSent || sendingEmail}
                        className="py-3 rounded-xl bg-[#7C5CFC] text-white font-bold text-sm
                                   hover:bg-[#6B4EE8] disabled:opacity-50 transition-all flex justify-center items-center">
                        {sendingEmail ? "..." : (emailSent ? "✅ Email Sent!" : "✉ Send Email")}
                      </button>
                    )}
                    {drafts?.whatsapp && (
                      <button onClick={sendWhatsapp} disabled={whatsappSent || sendingWhatsApp}
                        className="py-3 rounded-xl bg-green-600 text-white font-bold text-sm
                                   hover:bg-green-700 disabled:opacity-50 transition-all flex justify-center items-center">
                        {sendingWhatsApp ? "..." : (whatsappSent ? "✅ WhatsApp Sent!" : "💬 Send WhatsApp")}
                      </button>
                    )}
                  </div>
                  {drafts?.email && drafts?.whatsapp && !emailSent && !whatsappSent && (
                    <button onClick={sendBoth} disabled={sendingEmail || sendingWhatsApp}
                      className="w-full py-3 rounded-xl font-bold text-sm transition-all
                                 bg-gradient-to-r from-[#7C5CFC] to-green-600 text-white
                                 hover:opacity-90 disabled:opacity-50 text-center">
                      {(sendingEmail || sendingWhatsApp) ? "Sending..." : "🚀 Send Both"}
                    </button>
                  )}
                </div>
              )}

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

              {drafts?.email && (
                <div className="bg-white/5 border border-[#7C5CFC]/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C5CFC] font-bold text-sm">✉ Email Draft</span>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`Subject: ${drafts.email.subject}\n\n${drafts.email.body}`)
                        .then(() => alert('Copied!'))
                        .catch(() => {
                          // Fallback
                          const el = document.createElement('textarea');
                          el.value = `Subject: ${drafts.email.subject}\n\n${drafts.email.body}`;
                          document.body.appendChild(el);
                          el.select();
                          document.execCommand('copy');
                          document.body.removeChild(el);
                          alert('Copied!');
                        });
                    }}
                      className="text-xs text-[#00FFD1] bg-[#00FFD1]/10 border border-[#00FFD1]/20 px-3 py-1 rounded-lg hover:bg-[#00FFD1]/20 transition-all">
                      Copy
                    </button>
                  </div>
                  <p className="text-white/50 text-xs">Subject: <span className="text-white/90">{drafts.email.subject}</span></p>
                  <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg">{drafts.email.body}</p>
                </div>
              )}

              {drafts?.whatsapp && (
                <div className="bg-white/5 border border-green-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold text-sm">💬 WhatsApp Draft</span>
                    <button onClick={() => navigator.clipboard.writeText(typeof drafts.whatsapp === "string" ? drafts.whatsapp : drafts.whatsapp?.body || "")}
                      className="text-xs text-[#7C5CFC] bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 px-3 py-1 rounded-lg">
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
