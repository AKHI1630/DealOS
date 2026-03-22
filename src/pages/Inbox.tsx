import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const API = "http://127.0.0.1:8000";

interface Lead {
  id: string;
  business_name: string;
  phone: string;
  email: string;
  city: string;
  status: string;
  campaign_id: string;
}

interface ConvMsg {
  type: "sent" | "received";
  text: string;
  channel?: string;
  sentiment?: string;
  interest_score?: number;
  strategy?: string;
  draft_reply?: string;
  seq: number;
}

interface ReplyData {
  reply_text: string;
  sentiment: string;
  interest_score: number;
  confidence: number;
  strategy: string;
  draft_reply: string;
}

const SENTIMENT: Record<string, { label: string; color: string; bg: string; border: string }> = {
  interested:      { label: "😊 Interested",      color: "#10b981", bg: "#d1fae5", border: "#6ee7b7" },
  price_objection: { label: "💰 Price Objection",  color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  busy_not_now:    { label: "⏰ Not Now",           color: "#3b82f6", bg: "#dbeafe", border: "#93c5fd" },
  has_supplier:    { label: "🤝 Has Supplier",      color: "#f97316", bg: "#ffedd5", border: "#fdba74" },
  not_interested:  { label: "❌ Not Interested",    color: "#ef4444", bg: "#fee2e2", border: "#fca5a5" },
  unknown:         { label: "🤔 Unknown",           color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
};

export default function Inbox() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [replyMap, setReplyMap]     = useState<Record<string, ReplyData>>({});
  const [draftMap, setDraftMap]     = useState<Record<string, string>>({});
  const [convMap, setConvMap]       = useState<Record<string, ConvMsg[]>>({});
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [sending, setSending]       = useState<string | null>(null);
  const [sentIds, setSentIds]       = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const expandedRef   = useRef<string | null>(null);
  const pollRef       = useRef<any>(null);
  const convBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { expandedRef.current = expanded; }, [expanded]);

  const fetchLeads = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const stored: Lead[] = JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
      if (!stored.length) { setLeads([]); return; }
      const fresh: Lead[] = await Promise.all(
        stored.map(async (l) => {
          try {
            const r = await fetch(`${API}/api/leads/detail/${l.id}`);
            const d = await r.json();
            return d?.id ? d : l;
          } catch { return l; }
        })
      );
      localStorage.setItem("dealos_my_leads", JSON.stringify(fresh));
      setLeads(fresh.filter(l => ["sent","replied","closed"].includes(l.status)));
    } catch {
      const all: Lead[] = JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
      setLeads(all.filter(l => ["sent","replied","closed"].includes(l.status)));
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  const loadConversation = useCallback(async (leadId: string) => {
    try {
      const r = await fetch(`${API}/api/conversation/${leadId}`);
      const d = await r.json();
      const msgs: ConvMsg[]   = d.conversation || [];
      const latest: ReplyData = d.latest_reply  || null;
      setConvMap(p => ({ ...p, [leadId]: msgs }));
      if (latest) {
        setReplyMap(p => ({ ...p, [leadId]: latest }));
        setDraftMap(p => {
          if (p[leadId]) return p; // keep user edits
          return { ...p, [leadId]: latest.draft_reply || "" };
        });
      }
    } catch {}
  }, []);

  const handleToggle = async (lead: Lead) => {
    if (expanded === lead.id) { setExpanded(null); return; }
    setExpanded(lead.id);
    setLoadingId(lead.id);
    await loadConversation(lead.id);
    setLoadingId(null);
    setTimeout(() => convBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  };

  const handleSend = async (lead: Lead) => {
    const text = draftMap[lead.id]?.trim();
    if (!text) return;
    setSending(lead.id);
    try {
      const r = await fetch(`${API}/api/send-reply/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply_text: text }),
      });
      if (r.ok) {
        setSentIds(p => new Set([...p, lead.id]));
        setDraftMap(p => ({ ...p, [lead.id]: "" }));
        setTimeout(() => setSentIds(p => { const n = new Set(p); n.delete(lead.id); return n; }), 3000);
        await loadConversation(lead.id);
      }
    } catch {}
    setSending(null);
  };

  const handleClose = (leadId: string) => {
    setLeads(p => p.map(l => l.id === leadId ? { ...l, status: "closed" } : l));
    const all: Lead[] = JSON.parse(localStorage.getItem("dealos_my_leads") || "[]");
    localStorage.setItem("dealos_my_leads", JSON.stringify(
      all.map(l => l.id === leadId ? { ...l, status: "closed" } : l)
    ));
  };

  // Polling — uses ref to avoid stale closure
  useEffect(() => {
    fetchLeads();
    pollRef.current = setInterval(async () => {
      await fetchLeads();
      const openId = expandedRef.current;
      if (openId) {
        await loadConversation(openId);
        setTimeout(() => convBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchLeads, loadConversation]);

  const getPreview = (lead: Lead) => {
    const conv = convMap[lead.id];
    const lastRx = conv?.filter(m => m.type === "received").slice(-1)[0];
    if (lastRx) return `"${lastRx.text.slice(0, 55)}..."`;
    if (lead.status === "replied") return "New reply — click to view";
    if (lead.status === "closed")  return "Deal closed";
    return "Awaiting reply...";
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Reply Inbox</h1>
            {leads.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                {leads.length}
              </span>
            )}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">AI-analyzed replies and drafted responses.</p>
        </div>
        <button onClick={() => fetchLeads(true)} disabled={refreshing}
          className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {leads.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-lg font-semibold">No replies yet</p>
          <p className="text-sm mt-2">Send messages to leads — replies appear here automatically.</p>
        </div>
      )}

      <div className="space-y-4">
        {leads.map((lead, i) => {
          const isOpen    = expanded === lead.id;
          const reply     = replyMap[lead.id];
          const draft     = draftMap[lead.id] ?? "";
          const isSent    = sentIds.has(lead.id);
          const isLoading = loadingId === lead.id;
          const conv      = convMap[lead.id] || [];
          const s         = reply ? (SENTIMENT[reply.sentiment] || SENTIMENT.unknown) : null;

          return (
            <motion.div key={lead.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                onClick={() => handleToggle(lead)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                    {(lead.business_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {lead.business_name}
                      <span className="text-zinc-400 font-normal ml-2 text-xs">{lead.phone || lead.email}</span>
                    </p>
                    <p className="text-sm text-zinc-500 truncate max-w-sm">{getPreview(lead)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {s && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{ color: s.color, background: s.bg, borderColor: s.border }}>{s.label}</span>
                  )}
                  {!s && lead.status === "replied" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-teal-300 bg-teal-50 text-teal-600 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />Replied
                    </span>
                  )}
                  {lead.status === "sent" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">Awaiting</span>
                  )}
                  {lead.status === "closed" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-green-300 bg-green-50 text-green-600">✅ Closed</span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-200 dark:border-white/10"
                  >
                    <div className="p-6 space-y-5 bg-zinc-50 dark:bg-zinc-950/50">

                      {isLoading && (
                        <div className="flex items-center gap-2 text-indigo-500 text-sm">
                          <RefreshCw className="w-4 h-4 animate-spin" />Loading conversation...
                        </div>
                      )}

                      {!isLoading && conv.length === 0 && (
                        <div className="flex items-center gap-2 text-amber-500 text-sm">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          Waiting for reply — auto-updates every 4s
                        </div>
                      )}

                      {!isLoading && conv.length > 0 && (
                        <>
                          {/* Conversation thread */}
                          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                            {conv.sort((a, b) => a.seq - b.seq).map((msg, idx) => (
                              <div key={idx} className={`flex w-full ${msg.type === "sent" ? "justify-end" : "justify-start"}`}>
                                {msg.type === "sent" ? (
                                  <div className="max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-sm leading-relaxed shadow-sm">
                                    <p className="text-[10px] text-indigo-300 mb-1 font-semibold uppercase tracking-wide">
                                      You via {msg.channel || "whatsapp"}
                                    </p>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                  </div>
                                ) : (
                                  <div className="max-w-xs lg:max-w-sm space-y-1">
                                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 shadow-sm">
                                      <p className="text-[10px] text-zinc-400 mb-1 font-semibold uppercase tracking-wide">{lead.business_name}</p>
                                      <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                    {msg.sentiment && (() => {
                                      const ss = SENTIMENT[msg.sentiment] || SENTIMENT.unknown;
                                      return (
                                        <div className="flex items-center gap-2 px-1">
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                            style={{ color: ss.color, background: ss.bg, borderColor: ss.border }}>
                                            {ss.label}
                                          </span>
                                          <span className="text-[10px] text-zinc-400">{msg.interest_score}% interest</span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div ref={convBottomRef} />
                          </div>

                          {/* Latest strategy */}
                          {reply && (
                            <div className="border-t border-zinc-200 dark:border-white/10 pt-4">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3 h-3" /> Latest Strategy
                              </h4>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{reply.strategy}</p>
                            </div>
                          )}

                          {/* Draft reply */}
                          {reply && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Drafted Response</h4>
                              <textarea
                                value={draft}
                                onChange={e => setDraftMap(p => ({ ...p, [lead.id]: e.target.value }))}
                                rows={4}
                                className="w-full p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10
                                           rounded-lg text-sm text-zinc-700 dark:text-zinc-300 outline-none resize-none
                                           leading-relaxed focus:ring-1 focus:ring-indigo-400 transition-colors"
                                placeholder="Edit the AI draft reply here..."
                              />
                            </div>
                          )}

                          {/* Actions */}
                          {reply && (
                            <div className="flex items-center justify-between pt-1">
                              <button onClick={() => handleClose(lead.id)}
                                className={`text-xs transition-colors ${lead.status === "closed" ? "text-green-500 font-medium" : "text-zinc-400 hover:text-green-500"}`}>
                                {lead.status === "closed" ? "✅ Deal Closed" : "✅ Mark as Closed Deal"}
                              </button>
                              <div className="flex gap-3">
                                <button onClick={() => setDraftMap(p => ({ ...p, [lead.id]: reply.draft_reply || "" }))}
                                  className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                                  Edit
                                </button>
                                <button onClick={() => handleSend(lead)}
                                  disabled={sending === lead.id || isSent || lead.status === "closed" || !draft.trim()}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm">
                                  <Send className="w-3.5 h-3.5" />
                                  {sending === lead.id ? "Sending..." : isSent ? "✅ Sent!" : "Send Reply"}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
