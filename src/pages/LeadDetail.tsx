import { motion } from 'motion/react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building2, Globe, Send, Edit2, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';

export default function LeadDetail() {
  const { id } = useParams();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Lead Detail</h1>
            <p className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Company Info
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">AI Score</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-500">92</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Hot</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Info */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-zinc-500">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>N/A</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-zinc-400" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-zinc-400" />
                <a href="#" className="text-indigo-500 hover:underline">Website</a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-zinc-500">AI Research Context</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <li className="flex gap-2"><span className="text-indigo-500">•</span> Recently raised Series B ($15M).</li>
              <li className="flex gap-2"><span className="text-indigo-500">•</span> Hiring for 5 SDR roles currently.</li>
              <li className="flex gap-2"><span className="text-indigo-500">•</span> Pain point: Scaling outbound without ballooning headcount costs.</li>
            </ul>
          </div>
        </motion.div>

        {/* Right Col: Drafts */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold">AI Generated Email</h3>
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1">
              <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                <p><strong>Subject:</strong> Proposal Draft</p>
                <div className="w-full h-px bg-zinc-200 dark:bg-white/10 my-4" />
                <p>Hi there,</p>
                <p>Noticed your recent rapid expansion and wanted to connect.</p>
                <p>I run DealOS, an autonomous multi-agent system that can handle the prospecting, research, and personalized outreach for your team.</p>
                <p>Would you be open to a quick 10-min demo next Tuesday to see how it works?</p>
                <p>Best,<br/>Alex</p>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50 flex justify-end gap-3">
              <button className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                Regenerate
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
                <Send className="w-4 h-4" /> Send Email
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
