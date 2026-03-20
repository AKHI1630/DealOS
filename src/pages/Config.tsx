import { motion } from 'motion/react';
import { CheckCircle2, Rocket } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const steps = [
  { id: 'step-1', title: 'Business' },
  { id: 'step-2', title: 'Product' },
  { id: 'step-3', title: 'Audience' },
  { id: 'step-4', title: 'Outreach' },
  { id: 'step-5', title: 'Contact' }
];

export default function Config() {
  const { setCampaignName, setCampaignStatus } = useOutletContext<{ 
    setCampaignName: (name: string) => void, 
    setCampaignStatus: (status: string) => void 
  }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [isSaved, setIsSaved] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [activeStep, setActiveStep] = useState('step-1');

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [usp, setUsp] = useState('');
  
  const [targetCity, setTargetCity] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [leadSources, setLeadSources] = useState({
    googleMaps: true,
    googleSearch: true,
    manual: false,
    csv: false
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [outreachChannel, setOutreachChannel] = useState('both');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [approvalPref, setApprovalPref] = useState('manual');

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [introMessage, setIntroMessage] = useState('');

  useEffect(() => {
    if (location.state?.reset) {
      setBusinessName('');
      setIndustry('');
      setCustomIndustry('');
      setDescription('');
      setStartingPrice('');
      setUsp('');
      setTargetCity('');
      setTargetCustomer('');
      setLeadSources({
        googleMaps: true,
        googleSearch: true,
        manual: false,
        csv: false
      });
      setCsvFile(null);
      setOutreachChannel('both');
      setSenderEmail('');
      setSenderPhone('');
      setApprovalPref('manual');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setIntroMessage('');
      
      setCampaignName('Draft Campaign');
      setCampaignStatus('Draft');
      setResetKey(prev => prev + 1);
      
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, setCampaignName, setCampaignStatus]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveStep(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    steps.forEach((step) => {
      const el = document.getElementById(step.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [resetKey]);

  const { setIsConfigComplete } = useAppContext();

  const isFormValid = 
    businessName.trim() !== '' &&
    industry.trim() !== '' &&
    (industry !== 'Other' || customIndustry.trim() !== '') &&
    description.trim() !== '';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setIsSaved(true);
    setIsConfigComplete(true);
    setCampaignName(businessName || 'DealOS');
    setCampaignStatus('Active');
    setTimeout(() => {
      setIsSaved(false);
      navigate('/dashboard');
    }, 1500);
  };

  const toggleLeadSource = (source: keyof typeof leadSources) => {
    setLeadSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  const labelClass = "block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1.5 opacity-100";
  const cardClass = "bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 scroll-mt-32";
  const inputClass = "w-full px-[14px] py-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors";

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Campaign Configuration</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Set up your business context, target audience, and outreach preferences to launch your AI sales agents.</p>
      </div>

      {/* Progress Indicator */}
      <div className="sticky top-0 z-20 bg-app-bg/90 backdrop-blur-md py-4 mb-8 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center justify-between max-w-3xl mx-auto relative">
          {/* Connecting lines */}
          <div className="absolute top-4 left-8 right-8 h-[2px] bg-zinc-200 dark:bg-white/10 -z-10">
            <div 
              className="h-full bg-purple-600 transition-all duration-300" 
              style={{ width: `${(steps.findIndex(s => s.id === activeStep) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          
          {steps.map((step, index) => {
            const isActive = activeStep === step.id;
            const isPast = steps.findIndex(s => s.id === activeStep) > index;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 
                  isPast ? 'bg-emerald-500 text-white' : 
                  'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {isPast ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">* Required fields</p>

      <motion.form 
        key={resetKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave}
        className="space-y-8"
      >
        {/* Section 1: Basic Information */}
        <div id="step-1" className={cardClass}>
          <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Business Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tell the AI about your company.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Business Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. TechLap Solutions"
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Industry <span className="text-red-500">*</span></label>
              <select 
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className={inputClass}
              >
                <option value="">Select an industry...</option>
                <option value="Laptops">Laptops</option>
                <option value="Cosmetics">Cosmetics</option>
                <option value="Pharma">Pharma</option>
                <option value="Web Dev">Web Dev</option>
                <option value="Clothing">Clothing</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Catering">Catering</option>
                <option value="Restaurants">Restaurants</option>
                <option value="Gyms">Gyms</option>
                <option value="Coaching">Coaching</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Other">Other</option>
              </select>
              {industry === 'Other' && (
                <div className="mt-4">
                  <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Custom Industry <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="Specify your industry..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className={inputClass} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Product Details */}
        <div id="step-2" className={cardClass}>
          <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Product Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">What are you selling?</p>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Product / Service Description <span className="text-red-500">*</span></label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you sell, key features, and what problems it solves for customers..." 
              className={`${inputClass} min-h-[100px] resize-y`} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Starting Price</label>
              <input 
                type="text" 
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                placeholder="e.g. ₹18,000 or ₹499/month" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>USP — What makes you special?</label>
              <input 
                type="text" 
                value={usp}
                onChange={(e) => setUsp(e.target.value)}
                placeholder="e.g. Free delivery + warranty" 
                className={inputClass} 
              />
            </div>
          </div>
        </div>

        {/* Section 3: Target Audience */}
        <div id="step-3" className={cardClass}>
          <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Target Audience & Lead Sources</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Who are we looking for and where should we find them?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Target City/Location</label>
              <input 
                type="text" 
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                placeholder="Hyderabad, Bangalore, Mumbai..." 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Target Customer Type</label>
              <select 
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                className={inputClass}
              >
                <option value="">Select customer type...</option>
                <option>Small shops</option>
                <option>Startups</option>
                <option>Corporates</option>
                <option>Freelancers</option>
                <option>Homeowners</option>
                <option>Students</option>
                <option>Medical professionals</option>
                <option>Restaurant owners</option>
                <option>Any business</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>How to find leads</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="checkbox" checked={leadSources.googleMaps} onChange={() => toggleLeadSource('googleMaps')} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Google Maps <span className="text-xs text-emerald-500 ml-1">(Recommended)</span></span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="checkbox" checked={leadSources.googleSearch} onChange={() => toggleLeadSource('googleSearch')} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Google Search (SerpAPI)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="checkbox" checked={leadSources.manual} onChange={() => toggleLeadSource('manual')} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Manual entry</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="checkbox" checked={leadSources.csv} onChange={() => toggleLeadSource('csv')} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Upload CSV file</span>
              </label>
            </div>
          </div>

          {leadSources.manual && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Paste contact details here</label>
              <textarea rows={4} placeholder="John Doe, john@example.com, +1234567890&#10;Jane Smith, jane@example.com, +0987654321" className={`${inputClass} resize-y`} />
            </motion.div>
          )}

          {leadSources.csv && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Upload CSV file</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    {csvFile ? (
                      <p className="mb-2 text-sm text-purple-600 dark:text-purple-400 font-medium">{csvFile.name}</p>
                    ) : (
                      <>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">CSV files only</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </motion.div>
          )}
        </div>

        {/* Section 4: Outreach Settings */}
        <div id="step-4" className={cardClass}>
          <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Outreach Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">How should the AI reach out to your leads?</p>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Preferred outreach channel</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="radio" name="outreach" value="email" checked={outreachChannel === 'email'} onChange={(e) => setOutreachChannel(e.target.value)} className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Email only</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="radio" name="outreach" value="whatsapp" checked={outreachChannel === 'whatsapp'} onChange={(e) => setOutreachChannel(e.target.value)} className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">WhatsApp only</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-purple-200 dark:border-purple-500/30 rounded-lg cursor-pointer bg-purple-50 dark:bg-purple-500/10 transition-colors">
                <input type="radio" name="outreach" value="both" checked={outreachChannel === 'both'} onChange={(e) => setOutreachChannel(e.target.value)} className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Both Email + WhatsApp <span className="text-xs text-emerald-500 ml-1">(Recommended)</span></span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Your email (to send from)</label>
              <input 
                type="email" 
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="you@company.com" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Your WhatsApp number</label>
              <input 
                type="tel" 
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="+1 (555) 000-0000" 
                className={inputClass} 
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Approval preference</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="radio" name="approval" value="manual" checked={approvalPref === 'manual'} onChange={(e) => setApprovalPref(e.target.value)} className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">I will approve every message manually</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input type="radio" name="approval" value="auto" checked={approvalPref === 'auto'} onChange={(e) => setApprovalPref(e.target.value)} className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-approve after 2 hours</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Contact Details */}
        <div id="step-5" className={cardClass}>
          <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Contact Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Shown to the lead when the deal is ready to close.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Your full name</label>
              <input 
                type="text" 
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Doe" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Your phone number</label>
              <input 
                type="tel" 
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 000-0000" 
                className={inputClass} 
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Your email</label>
            <input 
              type="email" 
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="john@company.com" 
              className={inputClass} 
            />
          </div>

          <div>
            <label className={labelClass} style={{ color: 'inherit', opacity: 1 }}>Brief intro message when deal closes</label>
            <textarea 
              rows={3} 
              value={introMessage}
              onChange={(e) => setIntroMessage(e.target.value)}
              placeholder="Hi there! I'm taking over from the AI. Let's get on a quick call to finalize the details." 
              className={`${inputClass} resize-y`} 
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-4 z-30">
          {isSaved && (
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-emerald-500 text-sm flex items-center gap-1 font-medium"
            >
              <CheckCircle2 className="w-4 h-4" /> ✓ DealOS configured! Your agents are ready.
            </motion.span>
          )}
          <button 
            type="submit" 
            disabled={!isFormValid}
            className={`px-8 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-300 ${
              isFormValid 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] hover:scale-[1.02]' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 opacity-50 cursor-not-allowed'
            }`}
          >
            Launch DealOS Agents <Rocket className="w-4 h-4" />
          </button>
        </div>
      </motion.form>
    </div>
  );
}
