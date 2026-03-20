import { motion } from 'motion/react';
import { Search, Filter, MoreHorizontal, ArrowUpRight, Mail, Building2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { Link } from 'react-router-dom';

const mockLeads = [
  { id: 1, name: "Sarah Jenkins", company: "TechFlow Inc", city: "San Francisco", email: "sarah@techflow.io", score: 92, status: "Hot" },
  { id: 2, name: "Marcus Chen", company: "DataSphere", city: "New York", email: "m.chen@datasphere.com", score: 85, status: "Warm" },
  { id: 3, name: "Elena Rodriguez", company: "CloudScale", city: "Austin", email: "elena@cloudscale.net", score: 45, status: "Cold" },
  { id: 4, name: "David Kim", company: "Nexus Systems", city: "Seattle", email: "dkim@nexus.dev", score: 78, status: "Warm" },
  { id: 5, name: "Rachel Green", company: "StyleHub", city: "Los Angeles", email: "rachel@stylehub.co", score: 95, status: "Hot" },
];

export default function Dashboard() {
  const [search, setSearch] = useState("");

  const stats = [
    { label: "Total Leads", value: "1,248", trend: "+12%" },
    { label: "Hot Leads", value: "156", trend: "+24%" },
    { label: "Emails Sent", value: "892", trend: "+8%" },
    { label: "Replies", value: "45", trend: "+18%" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Sales Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Manage your AI-generated leads and campaigns.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Search className="w-4 h-4" /> Find New Leads
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{stat.label}</div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-semibold">{stat.value}</div>
              <div className="text-sm text-emerald-500 flex items-center gap-1 font-medium">
                <ArrowUpRight className="w-4 h-4" /> {stat.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-lg">Recent Leads</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search leads..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              />
            </div>
            <button className="p-1.5 border border-zinc-200 dark:border-white/10 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-3 font-medium">Lead</th>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockLeads.map((lead, i) => (
                <motion.tr 
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium">
                    <Link to={`/lead/${lead.id}`} className="hover:text-indigo-500 transition-colors">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> {lead.company}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                      <Mail className="w-4 h-4" /> {lead.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 max-w-[60px]">
                        <div 
                          className={cn(
                            "h-1.5 rounded-full",
                            lead.score >= 80 ? "bg-emerald-500" : lead.score >= 60 ? "bg-amber-500" : "bg-red-500"
                          )} 
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border",
                      lead.status === 'Hot' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" :
                      lead.status === 'Warm' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" :
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                    )}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
