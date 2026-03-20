import { motion, AnimatePresence } from 'motion/react';
import { Activity, Terminal, CheckCircle2, Search, Mail, BrainCircuit, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const getDemoLogs = (campaignName: string) => [
  { icon: Search, text: `Lead Hunter searching for '${campaignName}' targets...`, color: "text-blue-400" },
  { icon: CheckCircle2, text: "Found 45 potential leads.", color: "text-emerald-400" },
  { icon: BrainCircuit, text: "Research Agent analyzing tech stacks...", color: "text-purple-400" },
  { icon: Mail, text: "Email Writer generating personalized copy for Acme Corp...", color: "text-amber-400" },
  { icon: CheckCircle2, text: "Drafted 45 emails. Ready for review.", color: "text-emerald-400" },
  { icon: MessageSquare, text: "Sentiment Agent analyzing reply from TechFlow...", color: "text-indigo-400" },
  { icon: CheckCircle2, text: "Classified as 'Interested'. Drafting response...", color: "text-emerald-400" },
];

export default function AgentActivityPanel({ isDemoMode, campaignName }: { isDemoMode: boolean, campaignName: string }) {
  const [logs, setLogs] = useState<{id: number, log: ReturnType<typeof getDemoLogs>[0]}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDemoMode) return;
    
    const demoLogs = getDemoLogs(campaignName);
    let i = 0;
    const interval = setInterval(() => {
      setLogs(prev => [...prev, { id: Date.now(), log: demoLogs[i % demoLogs.length] }]);
      i++;
    }, 2500);

    return () => clearInterval(interval);
  }, [isDemoMode, campaignName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-zinc-200 dark:border-white/10 flex items-center gap-2">
        <Activity className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold">Live Agent Activity</h3>
        {isDemoMode && (
          <span className="ml-auto flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        <AnimatePresence initial={false}>
          {logs.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex gap-3 items-start"
            >
              <item.log.icon className={`w-4 h-4 shrink-0 mt-0.5 ${item.log.color}`} />
              <span className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {item.log.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {!isDemoMode && logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 opacity-50">
            <Terminal className="w-8 h-8" />
            <p>Agents idle.</p>
            <p className="text-center px-4">Enable Demo Mode to simulate activity.</p>
          </div>
        )}
      </div>
    </div>
  );
}
