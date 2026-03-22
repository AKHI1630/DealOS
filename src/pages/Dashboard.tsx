import React, { useState, useEffect } from "react";

const Dashboard = () => {
  const [huntPool, setHuntPool]       = useState<any[]>([]);
  const [myLeads, setMyLeads]         = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selectedLead, setSelected]   = useState<any>(null);
  const [toast, setToast]             = useState("");

  useEffect(() => {
    const pool = JSON.parse(localStorage.getItem("dealos_hunt_pool") || "[]");
    const my   = JSON.parse(localStorage.getItem("dealos_my_leads")  || "[]");
    setHuntPool(pool);
    setMyLeads(my);
    const logInterval = setInterval(fetchActivityLog, 2000);
    return () => clearInterval(logInterval);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const savePool = (pool: any[]) => {
    setHuntPool(pool);
    localStorage.setItem("dealos_hunt_pool", JSON.stringify(pool));
  };

  const saveMy = (my: any[]) => {
    setMyLeads(my);
    localStorage.setItem("dealos_my_leads", JSON.stringify(my));
  };

  const fetchActivityLog = async () => {
    try {
      const res  = await fetch("http://127.0.0.1:8000/api/activity-log");
      const data = await res.json();
      const logs: string[] = Array.isArray(data) ? data : data.logs || data.activity_log || [];
      setActivityLog([...logs].reverse());
    } catch (e) {}
  };

  const findNewLeads = async () => {
    setLoading(true);
    try {
      const config      = JSON.parse(localStorage.getItem("dealos_config") || "{}");
      const campaign_id = localStorage.getItem("dealos_campaign_id") || localStorage.getItem("campaign_id") || crypto.randomUUID();
      const industry    = config.industry || config.product || "business";
      const city        = config.city || config.target_city || "Visakhapatnam";

      const res  = await fetch("http://127.0.0.1:8000/api/hunt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ industry, city, campaign_id }),
      });
      const data = await res.json();

      if (data.campaign_id) {
        localStorage.setItem("dealos_campaign_id", data.campaign_id);
        localStorage.setItem("campaign_id",        data.campaign_id);
      }

      const incoming: any[] = Array.isArray(data) ? data : Array.isArray(data.leads) ? data.leads : [];
      const knownIds = new Set([...huntPool.map((l: any) => l.id), ...myLeads.map((l: any) => l.id)]);
      const newLeads = incoming.filter((l: any) => !knownIds.has(l.id));

      if (newLeads.length === 0) {
        showToast("No new leads found in this area.");
      } else {
        savePool([...huntPool, ...newLeads]);
        showToast(`✅ ${newLeads.length} new leads added to hunt pool!`);
      }
    } catch (e: any) {
      showToast("Hunt failed — is backend running?");
    } finally {
      setLoading(false);
    }
  };

  const addToCampaign = (lead: any) => {
    const currentPool = JSON.parse(localStorage.getItem("dealos_hunt_pool") || "[]");
    const currentMy   = JSON.parse(localStorage.getItem("dealos_my_leads")  || "[]");

    if (currentMy.some((l: any) => l.id === lead.id)) { showToast("Already in campaign."); return; }

    const newPool = currentPool.filter((l: any) => l.id !== lead.id);
    const newMy   = [...currentMy, lead];

    savePool(newPool);
    saveMy(newMy);
    showToast(`✅ ${lead.business_name || lead.name} added to campaign!`);
    setSelected(null);
  };

  const removeFromPool = (leadId: string) => {
    const currentPool = JSON.parse(localStorage.getItem("dealos_hunt_pool") || "[]");
    savePool(currentPool.filter((l: any) => l.id !== leadId));
    setSelected(null);
  };

  const inCampaign = (id: string) => myLeads.some((l: any) => l.id === id);

  return (
    <div className="flex h-screen bg-[#05030F]">
      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="p-6 bg-[#0D0B1E] border-b border-white/10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Hunt Pool</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {huntPool.length} leads found · {myLeads.length} added to campaign
            </p>
          </div>
          <button onClick={findNewLeads} disabled={loading}
            className="bg-[#7C5CFC] text-white px-6 py-2.5 rounded-xl font-semibold
                       flex items-center gap-2 hover:bg-[#6B4EE8] disabled:opacity-50 transition-all">
            {loading ? "⟳ Hunting..." : "⚡ Find New Leads"}
          </button>
        </div>

        {toast && (
          <div className="mx-6 mt-4 bg-[#00FFD1]/10 border border-[#00FFD1]/30
                          text-[#00FFD1] px-4 py-3 rounded-xl text-sm font-medium">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 p-6">
          {[
            { label: "In Hunt Pool",      value: huntPool.length,                       color: "text-white"     },
            { label: "In Campaign",       value: myLeads.length,                        color: "text-[#00FFD1]" },
            { label: "With Email",        value: huntPool.filter(l => l.email).length,  color: "text-[#FFB347]" },
            { label: "With Phone",        value: huntPool.filter(l => l.phone).length,  color: "text-[#7C5CFC]" },
          ].map((card) => (
            <div key={card.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-sm text-white/40">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-1 gap-4 px-6 pb-6 overflow-hidden">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 sticky top-0 bg-[#0D0B1E]">
                <tr>
                  {["Business Name", "Email", "Phone", "City", "Action"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {huntPool.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-20 text-white/30">
                    {loading ? "⟳ Hunting for leads..." : "No leads yet. Click Find New Leads."}
                  </td></tr>
                ) : huntPool.map((lead, i) => (
                  <tr key={lead.id || i} onClick={() => setSelected(lead)}
                    className="hover:bg-white/5 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-white text-sm">
                      {lead.business_name || lead.name || "Unknown"}
                      {lead.description && <p className="text-white/30 text-xs truncate max-w-[220px]">{lead.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.email ? <span className="text-[#00FFD1]">{lead.email}</span> : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.phone ? <span className="text-[#7C5CFC]">{lead.phone}</span> : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">{lead.city || "—"}</td>
                    <td className="px-4 py-3">
                      {inCampaign(lead.id) ? (
                        <span className="text-green-400 text-xs font-bold bg-green-500/10 px-3 py-1 rounded-full">✓ Added</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); addToCampaign(lead); }}
                          className="bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30
                                     px-3 py-1 rounded-lg text-xs font-semibold
                                     hover:bg-[#7C5CFC] hover:text-white transition-all">
                          + Add to Campaign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedLead && (
            <div className="w-80 bg-white/5 border border-white/10 rounded-2xl p-5 overflow-auto flex-shrink-0 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-white text-lg leading-tight">
                  {selectedLead.business_name || selectedLead.name}
                </h3>
                <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white text-xl">×</button>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Phone",   value: selectedLead.phone   },
                  { label: "Email",   value: selectedLead.email   },
                  { label: "City",    value: selectedLead.city    },
                  { label: "Address", value: selectedLead.address },
                  { label: "Website", value: selectedLead.website },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-xs mb-1">{label}</p>
                    <p className="text-white text-sm break-all">{value}</p>
                  </div>
                ) : null)}
                {selectedLead.description && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-xs mb-1">About</p>
                    <p className="text-white/80 text-xs leading-relaxed">{selectedLead.description}</p>
                  </div>
                )}
              </div>
              {inCampaign(selectedLead.id) ? (
                <div className="py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold text-center">
                  ✓ Already in Campaign
                </div>
              ) : (
                <button onClick={() => addToCampaign(selectedLead)}
                  className="w-full py-3 rounded-xl bg-[#7C5CFC] text-white font-bold hover:bg-[#6B4EE8] transition-all">
                  + Add to Campaign
                </button>
              )}
              <button onClick={() => removeFromPool(selectedLead.id)}
                className="w-full py-2 rounded-xl border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 text-sm transition-all">
                Remove from Pool
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-72 bg-[#0D0B1E] border-l border-white/10 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-sm font-semibold">Live Agent Activity</span>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-1">
          {activityLog.length === 0 ? (
            <p className="text-white/30 text-xs text-center mt-8">Waiting for agents...</p>
          ) : activityLog.map((log, i) => (
            <div key={i} className={`text-xs py-1.5 border-b border-white/5 leading-relaxed
              ${log.includes("✓") || log.includes("Saved") ? "text-green-400"
              : log.includes("Error") || log.includes("❌") ? "text-red-400"
              : log.includes("Maps") || log.includes("Step") ? "text-purple-400"
              : "text-white/50"}`}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
