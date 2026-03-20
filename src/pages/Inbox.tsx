import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ChevronDown, Sparkles, Send } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

const replies = [
  {
    id: 1,
    name: "Marcus Chen",
    company: "DataSphere",
    preview: "Thanks for reaching out. We are currently looking into AI solutions...",
    full: "Thanks for reaching out. We are currently looking into AI solutions for our sales team, but I'm concerned about the setup time. How long does it typically take to onboard?",
    sentiment: "Interested",
    aiAnalysis: "Lead is interested but has an objection regarding setup time. Strategy: Reassure them with our 10-minute config process.",
    draft: "Hi Marcus,\n\nCompletely understand the concern. The beauty of DealOS is that onboarding takes literally 10 minutes. You just fill out a config form with your product details, and the agents adapt instantly.\n\nHappy to show you live on a quick call tomorrow?"
  },
  {
    id: 2,
    name: "Elena Rodriguez",
    company: "CloudScale",
    preview: "This sounds too expensive for us right now.",
    full: "Hi Alex, this sounds interesting but probably too expensive for us right now. We're a small team.",
    sentiment: "Price Objection",
    aiAnalysis: "Lead assumes high cost. Strategy: Highlight that it's cheaper than a human SDR and offer a starter plan.",
    draft: "Hi Elena,\n\nI hear you. That's exactly why we built this for small teams—it costs less than 10% of a human SDR's salary. We also have a starter plan specifically for teams your size.\n\nWould you be open to seeing if the ROI makes sense for CloudScale?"
  },
  {
    id: 3,
    name: "David Kim",
    company: "Nexus Systems",
    preview: "Please follow up next quarter.",
    full: "Busy right now. Please follow up next quarter.",
    sentiment: "Busy",
    aiAnalysis: "Lead is busy. Strategy: Respect their time, set a reminder, and send a low-friction acknowledgment.",
    draft: "Understood, David. I'll reach back out in Q3. Have a great quarter!"
  }
];

export default function Inbox() {
  const [expandedId, setExpandedId] = useState<number | null>(1);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Reply Inbox</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">AI-analyzed replies and drafted responses.</p>
      </div>

      <div className="space-y-4">
        {replies.map((reply, i) => {
          const isExpanded = expandedId === reply.id;
          return (
            <motion.div 
              key={reply.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm"
            >
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : reply.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold">
                    {reply.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{reply.name} <span className="text-zinc-400 font-normal ml-1">from {reply.company}</span></h3>
                    <p className="text-sm text-zinc-500 truncate max-w-md">{reply.preview}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border",
                    reply.sentiment === 'Interested' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" :
                    reply.sentiment === 'Price Objection' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" :
                    "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                  )}>
                    {reply.sentiment}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-200 dark:border-white/10"
                  >
                    <div className="p-6 space-y-6 bg-zinc-50 dark:bg-zinc-950/50">
                      {/* Original Message */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Their Message</h4>
                        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
                          {reply.full}
                        </div>
                      </div>

                      {/* AI Analysis */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-500 flex items-center gap-1 mb-2">
                          <Sparkles className="w-3 h-3" /> AI Analysis & Strategy
                        </h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {reply.aiAnalysis}
                        </p>
                      </div>

                      {/* Drafted Response */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Drafted Response</h4>
                        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                          {reply.draft}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          Edit
                        </button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
                          <Send className="w-4 h-4" /> Send Reply
                        </button>
                      </div>
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
