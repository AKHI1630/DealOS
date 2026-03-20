import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Campaign {
  id: string;
  name: string;
  status: 'Active' | 'Complete' | 'Paused' | 'Draft';
  date: string;
  config: any;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  city: string;
  phone: string;
  email: string;
  score: number;
  status: 'Hot' | 'Warm' | 'Cold' | 'Negotiating' | 'Deal Done';
  lastActivity: string;
  history?: any[];
}

export interface Settings {
  profile: {
    businessName: string;
    name: string;
    email: string;
    phone: string;
  };
  notifications: {
    emailOnReply: boolean;
    whatsappAlert: boolean;
    autoApprove: boolean;
    showAgentActivity: boolean;
  };
  outreach: {
    channel: 'Email' | 'WhatsApp' | 'Both';
    signature: string;
    whatsappStyle: 'Formal' | 'Casual' | 'Hinglish';
    dailyLimit: number;
  };
}

interface AppContextType {
  isConfigComplete: boolean;
  setIsConfigComplete: (val: boolean) => void;
  config: any;
  setConfig: (val: any) => void;
  campaigns: Campaign[];
  setCampaigns: (val: Campaign[]) => void;
  currentCampaignId: string | null;
  setCurrentCampaignId: (val: string | null) => void;
  leads: Lead[];
  setLeads: (val: Lead[]) => void;
  settings: Settings;
  setSettings: (val: Settings) => void;
  theme: 'light' | 'dark';
  setTheme: (val: 'light' | 'dark') => void;
  accentColor: string;
  setAccentColor: (val: string) => void;
}

const defaultSettings: Settings = {
  profile: {
    businessName: 'DealOS',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 000-0000'
  },
  notifications: {
    emailOnReply: true,
    whatsappAlert: true,
    autoApprove: false,
    showAgentActivity: true
  },
  outreach: {
    channel: 'Both',
    signature: 'Best,\nJohn Doe\nDealOS',
    whatsappStyle: 'Formal',
    dailyLimit: 100
  }
};

const defaultCampaigns: Campaign[] = [
  { id: '1', name: 'TechLap Campaign', status: 'Complete', date: 'Oct 2025', config: {} },
  { id: '2', name: 'Cosmetics Hyd', status: 'Active', date: 'Nov 2025', config: {} },
  { id: '3', name: 'WebDev Pune', status: 'Paused', date: 'Nov 2025', config: {} }
];

const defaultLeads: Lead[] = [
  { id: '1', name: "Sarah Jenkins", company: "TechFlow Inc", city: "San Francisco", phone: "+1 234 567 890", email: "sarah@techflow.io", score: 92, status: "Hot", lastActivity: "2 hours ago" },
  { id: '2', name: "Marcus Chen", company: "DataSphere", city: "New York", phone: "+1 987 654 321", email: "m.chen@datasphere.com", score: 85, status: "Warm", lastActivity: "5 hours ago" },
  { id: '3', name: "Elena Rodriguez", company: "CloudScale", city: "Austin", phone: "+1 555 123 456", email: "elena@cloudscale.net", score: 45, status: "Cold", lastActivity: "1 day ago" },
  { id: '4', name: "David Kim", company: "Nexus Systems", city: "Seattle", phone: "+1 444 555 666", email: "dkim@nexus.dev", score: 78, status: "Negotiating", lastActivity: "10 mins ago" },
  { id: '5', name: "Rachel Green", company: "StyleHub", city: "Los Angeles", phone: "+1 777 888 999", email: "rachel@stylehub.co", score: 95, status: "Deal Done", lastActivity: "Just now" },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isConfigComplete, setIsConfigComplete] = useState<boolean>(() => {
    return localStorage.getItem('dealos_config_complete') === 'true';
  });
  
  const [config, setConfig] = useState<any>(() => {
    const saved = localStorage.getItem('dealos_config');
    return saved ? JSON.parse(saved) : {};
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('dealos_campaigns');
    return saved ? JSON.parse(saved) : defaultCampaigns;
  });

  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    return localStorage.getItem('dealos_current_campaign_id') || null;
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('dealos_leads');
    return saved ? JSON.parse(saved) : defaultLeads;
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('dealos_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('dealos_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('dealos_accent_color') || '#4F46E5'; // Default Indigo 600
  });

  useEffect(() => {
    localStorage.setItem('dealos_config_complete', String(isConfigComplete));
  }, [isConfigComplete]);

  useEffect(() => {
    localStorage.setItem('dealos_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('dealos_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    if (currentCampaignId) {
      localStorage.setItem('dealos_current_campaign_id', currentCampaignId);
    } else {
      localStorage.removeItem('dealos_current_campaign_id');
    }
  }, [currentCampaignId]);

  useEffect(() => {
    localStorage.setItem('dealos_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('dealos_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('dealos_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dealos_accent_color', accentColor);
    document.documentElement.style.setProperty('--app-accent', accentColor);
  }, [accentColor]);

  return (
    <AppContext.Provider value={{
      isConfigComplete, setIsConfigComplete,
      config, setConfig,
      campaigns, setCampaigns,
      currentCampaignId, setCurrentCampaignId,
      leads, setLeads,
      settings, setSettings,
      theme, setTheme,
      accentColor, setAccentColor
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
