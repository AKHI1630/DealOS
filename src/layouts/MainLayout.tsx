import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AgentActivityPanel from '../components/AgentActivityPanel';
import { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

export default function MainLayout() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [campaignName, setCampaignName] = useState('DealOS');
  const [campaignStatus, setCampaignStatus] = useState('Draft');
  const { isConfigComplete } = useAppContext();
  const location = useLocation();

  // Redirect to config if trying to access gated features without completing config
  const gatedRoutes = ['/dashboard', '/inbox', '/leads'];
  if (!isConfigComplete && gatedRoutes.includes(location.pathname)) {
    return <Navigate to="/config" replace />;
  }

  return (
    <div className="flex h-screen bg-app-bg text-app-text font-sans overflow-hidden">
      <Sidebar 
        isDemoMode={isDemoMode} 
        setIsDemoMode={setIsDemoMode} 
      />
      <main className="flex-1 overflow-y-auto relative">
        <Outlet context={{ isDemoMode, campaignName, setCampaignName, campaignStatus, setCampaignStatus }} />
      </main>
      <AgentActivityPanel isDemoMode={isDemoMode} campaignName={campaignName} />
    </div>
  );
}
