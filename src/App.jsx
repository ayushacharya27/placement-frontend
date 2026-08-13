import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import {
  RefreshCw, Archive, ArchiveRestore, X, ChevronRight, 
  LogOut, Briefcase, Mail, CheckCircle, Clock, AlertCircle,
  MapPin, CalendarDays, FileText, Presentation, Trophy, FolderOpen
} from 'lucide-react';

//const API_BASE = "http://localhost:8000";
const API_BASE = "https://placement-backend-2m5h.onrender.com";

function relativeTime(iso) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ==========================================
// COMPANY LOGOS & DOMAIN MAPPING
// ==========================================
const COMPANY_DOMAINS = {
  'jpmorganchase': 'jpmorganchase.com',
  'jp morgan chase': 'jpmorganchase.com',
  'jpmorgan': 'jpmorganchase.com',
  'jp morgan': 'jpmorganchase.com',
  'bosch global software': 'bosch.com',
  'bosch': 'bosch.com',
  'aveva': 'aveva.com',
  'bnp paribas': 'group.bnpparibas',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'apple': 'apple.com',
  'meta': 'meta.com',
  'nvidia': 'nvidia.com',
  'oracle': 'oracle.com',
  'adobe': 'adobe.com',
  'ibm': 'ibm.com',
  'intel': 'intel.com',
  'netflix': 'netflix.com',
  'samsung': 'samsung.com',
  'accenture': 'accenture.com',
  'deloitte': 'deloitte.com',
  'infosys': 'infosys.com',
  'tcs': 'tcs.com',
  'tata consultancy services': 'tcs.com',
  'wipro': 'wipro.com',
  'cognizant': 'cognizant.com',
  'zoho': 'zoho.com',
  'paypal': 'paypal.com',
  'visa': 'visa.com',
  'mastercard': 'mastercard.com',
  'uber': 'uber.com',
  'flipkart': 'flipkart.com',
  'walmart': 'walmart.com',
  'goldman sachs': 'goldmansachs.com',
  'morgan stanley': 'morganstanley.com',
  'ey': 'ey.com',
  'pwc': 'pwc.com',
};

function normalizeCompany(company) {
  return (company || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function getCompanyDomain(company) {
  const normalized = normalizeCompany(company);

  if (COMPANY_DOMAINS[normalized]) {
    return COMPANY_DOMAINS[normalized];
  }

  const match = Object.keys(COMPANY_DOMAINS).find(key =>
    normalized.includes(key) || key.includes(normalized)
  );

  if (match) {
    return COMPANY_DOMAINS[match];
  }

  const guessed = normalized
    .replace(/\b(inc|ltd|llc|pvt|private|limited|technologies|technology|corp|corporation|solutions|systems|software|india)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

  return guessed ? `${guessed}.com` : null;
}

// Slightly muted/desaturated gradients so logo tiles sit naturally on a dark surface
const LOGO_GRADIENTS = [
  'linear-gradient(135deg,#3b82f6,#4f46e5)',
  'linear-gradient(135deg,#059669,#10b981)',
  'linear-gradient(135deg,#db2777,#e11d48)',
  'linear-gradient(135deg,#ea580c,#f59e0b)',
  'linear-gradient(135deg,#7c3aed,#4f46e5)',
  'linear-gradient(135deg,#0284c7,#06b6d4)',
];

function companyInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function getGradient(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOGO_GRADIENTS[Math.abs(hash) % LOGO_GRADIENTS.length];
}

// If a fetched favicon fails to load (bad/missing image), we simply fall back
// to the initials tile below instead of showing a broken image.
function CompanyLogo({ company, size = 64 }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const domain = getCompanyDomain(company);
  const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

  if (!logoUrl || logoFailed) {
    return (
      <div
        className="flex items-center justify-center text-white font-bold shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(14, size * 0.25),
          background: getGradient(company),
          fontSize: size * 0.32,
          boxShadow: '0 8px 20px rgba(0,0,0,0.45)'
        }}
      >
        {companyInitials(company)}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center shrink-0 bg-[#1A1C23] border border-white/10 shadow-sm overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(14, size * 0.25)
      }}
    >
      <img
        src={logoUrl}
        alt={`${company} logo`}
        className="w-[65%] h-[65%] object-contain"
        onError={() => setLogoFailed(true)}
      />
    </div>
  );
}

// ==========================================
// DATE FORMATTER
// ==========================================
function formatEventDate(value) {
  if (!value) return 'Date TBD';
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }
  return raw;
}

// ==========================================
// STATUS HELPERS (dark-mode palette: translucent fills + light text)
// ==========================================
function getStatus(ev) {
  if (ev.action_required) {
    return { label: 'Action Required', dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
  }
  if (ev.is_user_shortlisted) {
    return { label: 'Shortlisted', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  }
  return { label: 'In Review', dot: 'bg-amber-400', bg: 'bg-amber-400/10', text: 'text-amber-300', border: 'border-amber-400/20' };
}

// ==========================================
// CATEGORY DEFINITIONS
// ==========================================
const EVENT_CATEGORIES = [
  { id: 'assessments', title: 'Assessments & Interviews', icon: FileText, types: ['Online Test', 'Interview', 'Hackathon'] },
  { id: 'ppts', title: 'Pre-Placement Talks', icon: Presentation, types: ['PPT'] },
  { id: 'results', title: 'Results & Shortlists', icon: Trophy, types: ['Result'] },
  { id: 'others', title: 'General & Registrations', icon: FolderOpen, types: ['Other', 'Registration'] },
];

// ==========================================
// APP COMPONENT
// ==========================================
export default function App() {
  const [userConfig, setUserConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const result = localStorage.getItem('user-config');
      if (result) setUserConfig(JSON.parse(result));
    } catch (e) {}
    setLoading(false);
  }, []);

  const handleLogin = (config) => {
    setUserConfig(config);
    try { localStorage.setItem('user-config', JSON.stringify(config)); }
    catch (e) {}
  };

  const handleLogout = () => {
    setUserConfig(null);
    try { localStorage.removeItem('user-config'); }
    catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 font-medium text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading workspace...
        </div>
      </div>
    );
  }

  if (!userConfig) return <SetupScreen onComplete={handleLogin} />;
  return <Board config={userConfig} onLogout={handleLogout} />;
}

// ==========================================
// SIGN IN
// ==========================================
function SetupScreen({ onComplete }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: async (codeResponse) => {
      setIsAuthenticating(true);
      try {
        const res = await axios.post(`${API_BASE}/auth/google`, { code: codeResponse.code });
        onComplete(res.data.user);
      } catch (error) {
        console.error("Login failed:", error);
        alert("Authentication failed. Please check your credentials.");
        setIsAuthenticating(false);
      }
    },
    onError: (error) => console.log('Login Failed:', error)
  });

  return (
    <div className="min-h-screen bg-[#0A0B0F] font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#14161C] rounded-3xl shadow-xl shadow-black/40 border border-white/10 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Mail className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-100 text-center mb-2 tracking-tight">Placement OS</h1>
        <p className="text-sm text-gray-400 text-center mb-8">
          Sync your inbox to automatically track your upcoming tests and interviews.
        </p>

        <button
          onClick={() => login()}
          disabled={isAuthenticating}
          className="w-full bg-[#1B1E26] hover:bg-[#22252E] text-gray-100 border border-white/10 font-semibold text-sm py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isAuthenticating ? "Authenticating..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// BOARD
// ==========================================
function Board({ config, onLogout }) {
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [openEvent, setOpenEvent] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date().toISOString());
  const [archivedIds, setArchivedIds] = useState([]);
  const archiveLoaded = useRef(false);

  useEffect(() => {
    try {
      const result = localStorage.getItem('archived-ids');
      if (result) setArchivedIds(JSON.parse(result));
    } catch (e) {}
    archiveLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!archiveLoaded.current) return;
    try { localStorage.setItem('archived-ids', JSON.stringify(archivedIds)); }
    catch (e) {}
  }, [archivedIds]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events/?user_id=${config.id}`);
      setEvents(res.data.events || []);
    } catch (error) {}
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.post(`${API_BASE}/events/sync?user_id=${config.id}`);
      await fetchEvents();
      setLastSyncedAt(new Date().toISOString());
    } catch (e) {}
    setSyncing(false);
  };

  useEffect(() => {
    fetchEvents();
    const syncInterval = setInterval(handleSync, 30 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, []);

  const activeEvents = events.filter(e => !archivedIds.includes(e.id));
  const archivedEvents = events.filter(e => archivedIds.includes(e.id));

  let baseList = activeNav === 'archived' ? archivedEvents : activeEvents;
  if (activeNav === 'pending') baseList = baseList.filter(e => !e.is_user_shortlisted);
  if (activeNav === 'shortlisted') baseList = baseList.filter(e => e.is_user_shortlisted);

  const navTabs = [
    { key: 'overview', label: 'All Roles' },
    { key: 'pending', label: 'In Review' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0B0F] font-sans text-gray-100 pb-20">
      <header className="pt-8 pb-6">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#14161C] rounded-xl shadow-sm border border-white/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-gray-100" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-100">Placement OS</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-xs text-gray-500 font-medium">
              Synced {relativeTime(lastSyncedAt)}
            </span>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-[#14161C] shadow-sm border border-white/10 hover:bg-[#1B1E26] text-gray-200 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-transform active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={onLogout}
              className="w-10 h-10 bg-[#14161C] rounded-full shadow-sm border border-white/10 flex items-center justify-center hover:bg-[#1B1E26] transition-transform active:scale-95"
            >
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex items-center gap-2 mb-10 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-2">
          {navTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveNav(t.key)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-colors flex-shrink-0 ${
                activeNav === t.key
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'bg-[#14161C] text-gray-400 hover:text-gray-100 shadow-sm border border-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {baseList.length > 0 ? (
          <div className="space-y-12">
            {EVENT_CATEGORIES.map(category => {
              
              // Filter the active list down to just this category's items
              const categoryEvents = baseList.filter(ev => {
                const type = ev.event_type || 'Other';
                
                // If checking the "others" catch-all group, include anything not explicitly caught by the other groups
                if (category.id === 'others') {
                  const isCaughtElsewhere = EVENT_CATEGORIES.some(c => c.id !== 'others' && c.types.includes(type));
                  return !isCaughtElsewhere;
                }
                return category.types.includes(type);
              });

              if (categoryEvents.length === 0) return null;

              const Icon = category.icon;

              return (
                <section key={category.id}>
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-10 h-10 rounded-xl bg-[#14161C] border border-white/10 shadow-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100 tracking-tight">{category.title}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[11px] font-bold">
                      {categoryEvents.length}
                    </span>
                  </div>
                  
                  {/* Category Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categoryEvents.map((ev) => (
                      <EventCard key={ev.id} ev={ev} onOpen={() => setOpenEvent(ev)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-[#14161C] rounded-3xl shadow-sm border border-white/10">
            <Mail className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-base font-bold text-gray-100">No events found</h3>
            <p className="mt-1 text-sm text-gray-400">Sync your inbox or adjust your filters.</p>
          </div>
        )}
      </main>

      <DetailPanel
        ev={openEvent}
        isArchived={openEvent ? archivedIds.includes(openEvent.id) : false}
        onClose={() => setOpenEvent(null)}
        onArchive={() => {
          setArchivedIds(prev => prev.includes(openEvent.id) ? prev.filter(x => x !== openEvent.id) : [...prev, openEvent.id]);
          setOpenEvent(null);
        }}
      />
    </div>
  );
}

// ==========================================
// EVENT CARD
// ==========================================
function EventCard({ ev, onOpen }) {
  const status = getStatus(ev);

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer bg-[#14161C] border border-white/10 rounded-[24px] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
    >
      {/* CARD HEADER */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <CompanyLogo company={ev.company_name} size={64} />

          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${status.bg} ${status.text} ${status.border} border`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* COMPANY */}
        <div className="mt-5">
          <h3 className="text-[21px] font-bold text-gray-100 tracking-tight leading-[1.2] break-words line-clamp-1">
            {ev.company_name || 'Unknown Company'}
          </h3>
          <p className="mt-1.5 text-sm font-medium text-gray-500">
            {ev.event_type || 'Placement Update'}
          </p>
        </div>
      </div>

      {/* EVENT INFORMATION */}
      <div className="mx-5 mb-5 rounded-2xl bg-[#1A1C23] border border-white/5">
        {/* DATE + TIME */}
        <div className="grid grid-cols-2 divide-x divide-white/10">
          <div className="px-4 py-4 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Date
              </span>
            </div>
            {/* NO truncate */}
            <p className="text-sm font-semibold text-gray-100 whitespace-nowrap">
              {formatEventDate(ev.date)}
            </p>
          </div>

          <div className="px-4 py-4 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Time
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-100 whitespace-nowrap">
              {ev.time || 'Time TBD'}
            </p>
          </div>
        </div>

        {/* VENUE */}
        <div className="px-4 py-3.5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#14161C] border border-white/10 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Venue
            </p>
            <p className="text-xs font-semibold text-gray-300 mt-0.5 truncate">
              {ev.venue || 'Venue TBD'}
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-5 pb-5">
        <div className="h-11 rounded-xl bg-[#1A1C23] group-hover:bg-white flex items-center justify-center gap-2 text-sm font-semibold text-gray-300 group-hover:text-gray-900 transition-all">
          View details
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DETAIL PANEL
// ==========================================
function DetailPanel({ ev, onClose, onArchive, isArchived }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (ev) {
      const t = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [ev]);

  if (!ev) return null;

  let points = [];
  try { points = JSON.parse(ev.email_summary_points || '[]'); } catch (e) {}

  const status = getStatus(ev);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      <div className="absolute inset-y-0 right-0 max-w-[480px] w-full flex sm:p-4">
        <div className={`h-full w-full bg-[#0F1116] sm:rounded-3xl shadow-2xl shadow-black/60 border border-white/10 flex flex-col transform transition-transform duration-300 ease-in-out ${show ? 'translate-x-0' : 'translate-x-[120%]'}`}>
          
          <div className="relative pt-8 px-8 pb-6 flex-shrink-0 border-b border-white/10">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <CompanyLogo company={ev.company_name} size={64} className="mb-5 shadow-md" />
            
            <div className="flex items-center gap-2 mb-3">
               <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                {status.label}
              </span>
              <span className="text-sm font-semibold text-gray-600">|</span>
              <span className="text-sm font-semibold text-gray-400">{ev.event_type || 'Update'}</span>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-100 leading-tight">
              {ev.company_name || 'Unknown'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-6">
            <div className="grid grid-cols-2 gap-y-8 gap-x-4 mb-10 bg-[#14161C] rounded-2xl p-6 border border-white/10">
              <div>
                <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5"/> Date</dt>
                <dd className="text-[15px] font-bold text-gray-100">{formatEventDate(ev.date)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Time</dt>
                <dd className="text-[15px] font-bold text-gray-100">{ev.time || 'TBD'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Venue</dt>
                <dd className="text-[15px] font-bold text-gray-100">{ev.venue || 'TBD'}</dd>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-[13px] font-bold text-gray-100 mb-4">Extracted Notes</h4>
              {points.length > 0 ? (
                <ul className="space-y-4">
                  {points.map((p, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-gray-300 leading-relaxed bg-[#14161C] border border-white/10 shadow-sm rounded-xl p-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-2"></span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No specific action items found.</p>
              )}
            </div>
            
            <div className={`${status.bg} border ${status.border} rounded-xl p-4 flex gap-3`}>
               <AlertCircle className={`w-5 h-5 flex-shrink-0 ${status.text}`} />
               <p className={`text-sm font-semibold ${status.text}`}>{ev.shortlist_status_reason || 'Pending update'}</p>
            </div>
          </div>

          <div className="p-6 border-t border-white/10">
            <button
              onClick={onArchive}
              className={`w-full flex justify-center items-center gap-2 py-4 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                isArchived
                  ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                  : 'bg-white text-gray-900 hover:bg-gray-200 shadow-[0_4px_14px_0_rgba(255,255,255,0.08)]'
              }`}
            >
              {isArchived ? (
                <><ArchiveRestore className="w-4 h-4" /> Restore to board</>
              ) : (
                <><Archive className="w-4 h-4" /> Move to Archive</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}