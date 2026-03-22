import { motion, AnimatePresence } from 'motion/react';
import { Activity, Terminal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getActivityLog } from '../api';

export default function AgentActivityPanel() {
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getActivityLog();
        if (data.logs && Array.isArray(data.logs)) {
          setAgentLogs(data.logs);
        }
      } catch (err) {
        // Silently fail if backend offline
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [agentLogs]);

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-zinc-200 dark:border-white/10 flex items-center gap-2">
        <Activity className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold">Live Agent Activity</h3>
        <span className="ml-auto flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        <AnimatePresence initial={false}>
          {agentLogs.map((text, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex gap-3 items-start"
            >
              <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
              <span className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-words whitespace-pre-wrap">
                {text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {agentLogs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 opacity-50">
            <Terminal className="w-8 h-8" />
            <p>Agents idle.</p>
            <p className="text-center px-4">Click "Find New Leads" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}
