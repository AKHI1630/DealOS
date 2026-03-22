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
  isAgentRunning: boolean;
  setIsAgentRunning: (val: boolean) => void;
  agentLogs: any[];
  setAgentLogs: React.Dispatch<React.SetStateAction<any[]>>;
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
    return saved ? JSON.parse(saved) : [];
  });

  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    return localStorage.getItem('dealos_current_campaign_id') || null;
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('dealos_leads');
    return saved ? JSON.parse(saved) : [];
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

  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);

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
      accentColor, setAccentColor,
      isAgentRunning, setIsAgentRunning,
      agentLogs, setAgentLogs
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
