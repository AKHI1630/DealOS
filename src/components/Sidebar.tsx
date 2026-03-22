import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Users, Settings as SettingsIcon, Inbox, Bot, Zap, Plus, Lock, Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAppContext } from '../contexts/AppContext';
import React, { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',     href: '/dashboard', requiresConfig: true  },
  { icon: Inbox,           label: 'Inbox',         href: '/inbox',     requiresConfig: true  },
  { icon: Users,           label: 'Leads',         href: '/leads',     requiresConfig: true  },
  { icon: SettingsIcon,    label: 'Configuration', href: '/config',    requiresConfig: false },
  { icon: SettingsIcon,    label: 'Settings',      href: '/settings',  requiresConfig: false },
];

// ── localStorage helpers ──────────────────────────────────
function saveCurrentCampaignLeads() {
  const id = localStorage.getItem("dealos_campaign_id");
  if (!id || id === "default") return;
  const pool = JSON.parse(localStorage.getItem("dealos_hunt_pool") || "[]");
  const my   = JSON.parse(localStorage.getItem("dealos_my_leads")  || "[]");
  localStorage.setItem(`dealos_hunt_pool_${id}`, JSON.stringify(pool));
  localStorage.setItem(`dealos_my_leads_${id}`,  JSON.stringify(my));
}

function restoreCampaignLeads(id: string) {
  const pool = JSON.parse(localStorage.getItem(`dealos_hunt_pool_${id}`) || "[]");
  const my   = JSON.parse(localStorage.getItem(`dealos_my_leads_${id}`)  || "[]");
  localStorage.setItem("dealos_hunt_pool",    JSON.stringify(pool));
  localStorage.setItem("dealos_my_leads",     JSON.stringify(my));
  localStorage.setItem("dealos_campaign_id",  id);
  localStorage.setItem("campaign_id",         id);
}

export default function Sidebar({
  isDemoMode,
  setIsDemoMode,
}: {
  isDemoMode: boolean;
  setIsDemoMode: (v: boolean) => void;
}) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const {
    isConfigComplete,
    campaigns, currentCampaignId, setCurrentCampaignId,
    theme, setTheme,
    settings,
  } = useAppContext();

  const [showLockModal,        setShowLockModal]        = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);

  // ── switch to existing campaign ───────────────────────
  const handleCampaignSwitch = (campId: string) => {
    if (campId === currentCampaignId) return;
    saveCurrentCampaignLeads();       // archive current
    restoreCampaignLeads(campId);     // load selected
    setCurrentCampaignId(campId);
    navigate('/dashboard');           // refresh view
  };

  // ── new campaign button (+) ───────────────────────────
  const handleNewCampaign = () => setShowNewCampaignModal(true);

  const confirmNewCampaign = () => {
    setShowNewCampaignModal(false);
    saveCurrentCampaignLeads();
    const newId = crypto.randomUUID();
    localStorage.setItem("dealos_campaign_id", newId);
    localStorage.setItem("campaign_id",        newId);
    localStorage.setItem("dealos_hunt_pool",   JSON.stringify([]));
    localStorage.setItem("dealos_my_leads",    JSON.stringify([]));

    // Navigate away first to force remount
    navigate('/dashboard', { replace: true });
    setTimeout(() => navigate('/config', { state: { reset: true } }), 50);
  };

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.requiresConfig && !isConfigComplete) {
      e.preventDefault();
      setShowLockModal(true);
    }
  };

  return (
    <>
      <div className="w-64 border-r border-app-border bg-app-card flex flex-col h-full shrink-0">

        {/* Logo */}
        <div className="p-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Bot className="w-6 h-6 text-app-accent" />
            <span>Deal<span className="text-app-accent">OS</span></span>
          </Link>
          <button
            onClick={handleNewCampaign}
            className="p-1.5 text-app-muted hover:text-app-text hover:bg-app-bg rounded-md transition-colors"
            title="New Campaign"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Campaigns list */}
        <div className="px-4 mb-2">
          <div className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-2 mt-2">
            Campaigns
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {campaigns.length === 0 ? (
              <div className="text-xs text-app-muted py-3 px-2 text-center border border-dashed border-app-border rounded-lg">
                No campaigns yet. Click + to start.
              </div>
            ) : (
              campaigns.map(camp => (
                <button
                  key={camp.id}
                  onClick={() => handleCampaignSwitch(camp.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left group",
                    currentCampaignId === camp.id
                      ? "bg-app-bg text-app-text font-medium"
                      : "text-app-muted hover:bg-app-bg hover:text-app-text"
                  )}
                >
                  <span className="truncate pr-2">{camp.name}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {camp.lead_count !== undefined && (
                      <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800
                                       text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
                        {camp.lead_count}
                      </span>
                    )}
                    {camp.status === 'active'   && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    {camp.status === 'complete' && <span className="w-2 h-2 rounded-full bg-gray-500"    />}
                    {camp.status === 'paused'   && <span className="w-2 h-2 rounded-full bg-amber-500"   />}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Nav */}
        <div className="px-4 mb-2 mt-4">
          <div className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-2">Menu</div>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const isLocked = item.requiresConfig && !isConfigComplete;
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                  isActive ? "text-app-accent" : "text-app-muted hover:bg-app-bg hover:text-app-text",
                  isLocked && "opacity-70"
                )}
              >
                <div className="flex items-center gap-3">
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-app-accent/10 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {isLocked && <Lock className="w-3.5 h-3.5" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-app-border space-y-2">
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
              isDemoMode
                ? "bg-app-accent/10 border-app-accent/30 text-app-accent"
                : "bg-transparent border-app-border text-app-muted hover:bg-app-bg hover:text-app-text"
            )}
          >
            <span className="flex items-center gap-2">
              <Zap className={cn("w-4 h-4", isDemoMode && "text-app-accent fill-app-accent")} />
              Demo Mode
            </span>
            <div className={cn("w-8 h-4 rounded-full p-0.5 transition-colors", isDemoMode ? "bg-app-accent" : "bg-zinc-300 dark:bg-zinc-700")}>
              <motion.div className="w-3 h-3 bg-white rounded-full shadow-sm" animate={{ x: isDemoMode ? 16 : 0 }} />
            </div>
          </button>

          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-app-accent/20 flex items-center justify-center text-app-accent text-xs font-bold">
                {settings.profile.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-app-text truncate max-w-[100px]">
                {settings.profile.name}
              </span>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 text-app-muted hover:text-app-text hover:bg-app-bg rounded-md transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Lock modal */}
      <AnimatePresence>
        {showLockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-app-card border border-app-border rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-app-text mb-2">Configuration Required</h3>
              <p className="text-app-muted text-sm mb-6">Complete your business configuration first to unlock this feature.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowLockModal(false)} className="px-4 py-2 text-sm font-medium text-app-muted hover:text-app-text transition-colors">Cancel</button>
                <button onClick={() => { setShowLockModal(false); navigate('/config'); }}
                  className="px-4 py-2 bg-app-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  Go to Config →
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* New campaign modal */}
        {showNewCampaignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-app-card border border-app-border rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-lg font-semibold text-app-text mb-2">Start a new campaign?</h3>
              <p className="text-app-muted text-sm mb-6">
                Your current campaign leads will be saved automatically.
                You can switch back anytime from the sidebar.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowNewCampaignModal(false)} className="px-4 py-2 text-sm font-medium text-app-muted hover:text-app-text transition-colors">Cancel</button>
                <button onClick={confirmNewCampaign}
                  className="px-4 py-2 bg-app-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  Save & Start New
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}