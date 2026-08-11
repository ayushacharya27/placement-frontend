import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Home, Clock, Check, RefreshCw, AlertTriangle, 
  ChevronDown, Calendar, CheckSquare, Shield, 
  TerminalSquare, MapPin, CalendarDays, Filter
} from 'lucide-react';

const API_BASE = "https://placement-backend-2m5h.onrender.com";

export default function App() {
  const [userConfig, setUserConfig] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('copilot_user');
    if (saved) setUserConfig(JSON.parse(saved));
  }, []);

  const handleLogin = (config) => {
    localStorage.setItem('copilot_user', JSON.stringify(config));
    setUserConfig(config);
  };

  if (!userConfig) return <SetupScreen onComplete={handleLogin} />;
  return <Dashboard config={userConfig} onLogout={() => setUserConfig(null)} />;
}

// ==========================================
// SCREEN 1: MINIMAL SETUP
// ==========================================
function SetupScreen({ onComplete }) {
  const [formData, setFormData] = useState({ name: "Ayush Acharya", regNumber: "23BPS1078", neopatId: "", neopatPass: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#121419] border border-[#22252A] rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#22252A]">
          <div className="w-12 h-12 bg-[#1A1D24] border border-[#22252A] rounded-xl flex items-center justify-center shadow-inner">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Placement Copilot</h1>
            <p className="text-xs text-[#9CA3AF] font-medium mt-1 uppercase tracking-widest">Campus Intelligence</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Operator Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0B0D10] border border-[#22252A] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Registration Number</label>
              <input type="text" required value={formData.regNumber} onChange={e => setFormData({...formData, regNumber: e.target.value})} className="w-full bg-[#0B0D10] border border-[#22252A] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" />
            </div>
          </div>
          <button type="submit" className="w-full mt-8 bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-lg transition-colors text-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 2: THE CRISP DASHBOARD
// ==========================================
function Dashboard({ config, onLogout }) {
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [activeNav, setActiveNav] = useState('overview'); 
  const [activeFeedTab, setActiveFeedTab] = useState('pending'); 
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events/`);
      setEvents(res.data.events || []);
    } catch (error) { console.error("API Error"); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.post(`${API_BASE}/events/sync`);
      await fetchEvents();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { console.error("Sync failed."); }
    setSyncing(false);
  };

  // --- AUTOMATED 30 MINUTE SYNC ---
  useEffect(() => {
    fetchEvents();
    const syncInterval = setInterval(() => {
      console.log("Triggering 30-minute background sync...");
      handleSync();
    }, 30 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, []);

  const totalExtracted = events.length;
  const shortlistedCount = events.filter(e => e.is_user_shortlisted).length;
  const pendingCount = events.filter(e => !e.is_user_shortlisted).length;
  const actionCount = events.filter(e => e.action_required).length;

  const uniqueCompanies = ['All', ...new Set(events.map(ev => ev.company_name).filter(Boolean))];

  const filteredEvents = events.filter(ev => {
    const tabMatch = activeFeedTab === 'shortlisted' ? ev.is_user_shortlisted : !ev.is_user_shortlisted;
    const companyMatch = selectedCompany === 'All' || ev.company_name === selectedCompany;
    return tabMatch && companyMatch;
  });

  return (
    <div className="min-h-screen bg-[#0B0D10] flex selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <aside className="w-[260px] border-r border-[#22252A] bg-[#0B0D10] flex flex-col flex-shrink-0 z-20">
        <div className="h-[76px] flex items-center px-6">
          <div className="w-9 h-9 rounded-lg bg-[#1A1D24] border border-[#22252A] text-white font-bold flex items-center justify-center text-xs shadow-inner">PC</div>
          <div className="ml-3.5">
            <div className="text-[14px] font-bold tracking-tight text-white leading-tight">Placement<br/>Copilot</div>
            <div className="text-[10px] font-medium text-[#6B7280] mt-0.5">Campus intelligence</div>
          </div>
        </div>
        
        <div className="px-4 pt-8 flex-1">
          <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.15em] px-3 mb-3">Workspace</div>
          <nav className="space-y-1">
            <NavItem icon={<Home className="w-4 h-4" />} label="Overview" active={activeNav === 'overview'} onClick={() => { setActiveNav('overview'); setActiveFeedTab('pending'); }} />
            <NavItem icon={<Clock className="w-4 h-4" />} label="Pending" count={pendingCount} active={activeNav === 'pending'} onClick={() => { setActiveNav('pending'); setActiveFeedTab('pending'); }} />
            <NavItem icon={<Check className="w-4 h-4" />} label="Shortlisted" count={shortlistedCount} active={activeNav === 'shortlisted'} onClick={() => { setActiveNav('shortlisted'); setActiveFeedTab('shortlisted'); }} />
          </nav>
        </div>

        <div className="p-5">
          <div className="bg-[#121419] border border-[#22252A] rounded-xl p-4 cursor-pointer hover:bg-[#1A1D24] transition-all group" onClick={onLogout}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
                </div>
                <span className="text-xs font-semibold text-white">System Live</span>
              </div>
            </div>
            <p className="text-[11px] text-[#6B7280] leading-relaxed group-hover:text-[#9CA3AF] transition-colors">
              Auto-syncs every 30 mins.<br/>Last check: {lastSyncedTime}
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="h-[76px] border-b border-[#22252A] bg-[#0B0D10]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Placement Overview</h1>
              <p className="text-sm font-medium text-[#9CA3AF] mt-0.5">Your placement activity, at a glance</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-[#34D399]/10 border border-[#34D399]/20 px-3 py-1.5 rounded-lg text-[#34D399] text-xs font-bold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span> Live
              </div>
              
              <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync inbox'}
              </button>
            </div>
        </header>

        <div className="p-8 max-w-[1200px] w-full mx-auto">
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Placement activity</h2>
            <p className="text-sm font-medium text-[#9CA3AF] mt-1.5">Track shortlist decisions, upcoming events and anything that needs your attention.</p>
          </div>

          <div className="flex justify-end gap-3 mb-6">
             {/* COMPANY DROPDOWN FILTER */}
             <div className="relative group">
               <select 
                 value={selectedCompany} 
                 onChange={(e) => setSelectedCompany(e.target.value)}
                 className="appearance-none outline-none pl-3.5 pr-9 py-2 rounded-lg border border-[#22252A] text-xs text-white font-semibold bg-[#0B0D10] group-hover:bg-[#121419] transition-colors shadow-sm cursor-pointer"
               >
                 {uniqueCompanies.map(company => (
                   <option key={company} value={company}>
                     {company === 'All' ? 'All Companies' : company}
                   </option>
                 ))}
               </select>
               <Filter className="w-3.5 h-3.5 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-12">
             <StatCard title="Total events" value={totalExtracted} subtitle="Parsed from placement emails" icon={<Calendar className="w-4.5 h-4.5" />} iconColor="text-blue-400" iconBg="bg-blue-400/10 border-blue-400/20" />
             <StatCard title="Shortlisted" value={shortlistedCount} subtitle={<span className="text-[#34D399]">Confirmed opportunities</span>} icon={<CheckSquare className="w-4.5 h-4.5" />} iconColor="text-[#34D399]" iconBg="bg-[#34D399]/10 border-[#34D399]/20" />
             <StatCard title="Pending" value={pendingCount} subtitle="Awaiting your next check" icon={<Clock className="w-4.5 h-4.5" />} iconColor="text-[#FBBF24]" iconBg="bg-[#FBBF24]/10 border-[#FBBF24]/20" />
             <StatCard title="Action required" value={actionCount} subtitle={<span className="text-[#FB7185]">Needs attention</span>} icon={<AlertTriangle className="w-4.5 h-4.5" />} iconColor="text-[#FB7185]" iconBg="bg-[#FB7185]/10 border-[#FB7185]/20" />
          </div>

          {/* FEED HEADER & TABS */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Activity feed</h2>
              <p className="text-sm font-medium text-[#9CA3AF] mt-1.5">
                {selectedCompany !== 'All' ? `Showing events for ${selectedCompany}` : 'Latest placement events identified by Copilot'}
              </p>
            </div>
            
            <div className="flex bg-[#121419] border border-[#22252A] p-1.5 rounded-xl shadow-inner">
              <button onClick={() => setActiveFeedTab('pending')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeFeedTab === 'pending' ? 'bg-[#22252A] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#9CA3AF]'}`}>
                Pending & active
              </button>
              <button onClick={() => setActiveFeedTab('shortlisted')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeFeedTab === 'shortlisted' ? 'bg-[#22252A] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#9CA3AF]'}`}>
                Shortlisted
              </button>
            </div>
          </div>

          {/* EVENTS LIST */}
          <div className="space-y-4">
            {filteredEvents.map(ev => <EventCard key={ev.id} ev={ev} />)}
            {filteredEvents.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center border border-dashed border-[#22252A] rounded-2xl bg-[#121419]/50">
                 <TerminalSquare className="w-8 h-8 text-[#22252A] mb-3" />
                 <p className="text-white font-semibold text-sm">No events found</p>
                 <p className="text-[#6B7280] text-xs mt-1">
                   {selectedCompany !== 'All' ? `No ${activeFeedTab} events for ${selectedCompany}.` : 'This queue is currently empty.'}
                 </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function NavItem({ icon, label, count, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-[#1A1D24] text-white shadow-sm' : 'text-[#9CA3AF] hover:bg-[#121419] hover:text-white'}`}>
      <div className="flex items-center gap-3">
        <span className={active ? "text-white" : "text-[#6B7280]"}>{icon}</span> {label}
      </div>
      {count !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${active ? 'bg-white text-black' : 'bg-[#1A1D24] border border-[#22252A] text-[#9CA3AF]'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({ title, value, subtitle, icon, iconColor, iconBg }) {
  return (
    <div className="bg-[#121419] border border-[#22252A] rounded-2xl p-5 lg:p-6 flex flex-col justify-between h-full min-h-[140px] shadow-sm hover:border-[#374151] transition-colors gap-4">
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-semibold text-[#9CA3AF] tracking-wide leading-tight">{title}</p>
        <div className={`w-9 h-9 rounded-xl border flex-shrink-0 flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-4xl font-bold text-white mb-1.5 tracking-tight">{value}</h3>
        <p className="text-xs font-medium text-[#6B7280] leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// DROPDOWN ACCORDION EVENT CARD
// ----------------------------------------------------
function EventCard({ ev }) {
  const [isExpanded, setIsExpanded] = useState(false);
  let points = [];
  try { points = JSON.parse(ev.email_summary_points || '[]'); } catch(e){}

  return (
    <div className={`bg-[#121419] border ${isExpanded ? 'border-[#374151]' : 'border-[#22252A]'} hover:border-[#374151] transition-colors rounded-2xl shadow-sm overflow-hidden`}>
      
      {/* HEADER ROW (Click to expand) */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-6 focus:outline-none"
      >
        <div className="flex-1 min-w-0">
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="bg-[#1A1D24] border border-[#22252A] text-[#9CA3AF] px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              {ev.event_type || 'OTHER'} <span className="w-1 h-1 rounded-full bg-[#6B7280]"></span>
            </div>
            
            {ev.is_user_shortlisted ? (
              <div className="flex items-center gap-2 bg-[#34D399]/10 border border-[#34D399]/20 text-[#34D399] px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]"></span> Shortlisted
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-[#FBBF24] px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]"></span> Pending
              </div>
            )}

            {ev.action_required && (
              <div className="flex items-center gap-2 bg-[#FB7185]/10 border border-[#FB7185]/20 text-[#FB7185] px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185]"></span> Action Required
              </div>
            )}
          </div>
          
          <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate" title={ev.company_name}>
            {ev.company_name || 'Unknown Event'}
          </h3>
        </div>

        {/* METADATA PREVIEW (Desktop only, slides into dropdown on mobile) */}
        <div className="flex items-center gap-6 md:gap-8 flex-shrink-0">
           <div className="flex flex-col gap-1 hidden md:block w-24">
             <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Date</p>
             <p className="text-[14px] text-white font-semibold truncate">{ev.date || 'TBD'}</p>
           </div>
           <div className="flex flex-col gap-1 hidden md:block w-24">
             <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Time</p>
             <p className="text-[14px] text-white font-semibold truncate">{ev.time || 'TBD'}</p>
           </div>
           <div className="flex flex-col gap-1 hidden md:block w-32">
             <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Venue</p>
             <p className="text-[14px] text-white font-semibold truncate">{ev.venue || 'TBD'}</p>
           </div>
           
           <div className="w-8 h-8 rounded-full bg-[#1A1D24] border border-[#22252A] flex items-center justify-center flex-shrink-0">
             <ChevronDown className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
           </div>
        </div>
      </button>

      {/* DROPDOWN BODY */}
      <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-6 md:px-7 pb-7 pt-4 border-t border-[#22252A] bg-[#0B0D10]/30">
            
            {/* Mobile Metadata Layout */}
            <div className="md:hidden grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-[#22252A]">
               <div>
                 <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Date</p>
                 <p className="text-[13px] text-white font-semibold truncate">{ev.date || 'TBD'}</p>
               </div>
               <div>
                 <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Time</p>
                 <p className="text-[13px] text-white font-semibold truncate">{ev.time || 'TBD'}</p>
               </div>
               <div>
                 <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Venue</p>
                 <p className="text-[13px] text-white font-semibold truncate">{ev.venue || 'TBD'}</p>
               </div>
            </div>

            {/* Extracted Intel */}
            <div className="mb-5 mt-2 md:mt-0">
              <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-4 flex items-center gap-2">
                <TerminalSquare className="w-3.5 h-3.5" /> Intelligence Brief
              </h4>
              {points.length > 0 ? (
                <ul className="space-y-3">
                  {points.map((p, i) => (
                    <li key={i} className="text-[14px] text-[#D1D5DB] flex items-start gap-3 leading-relaxed">
                      <span className="text-[#4B5563] mt-1 flex-shrink-0">✦</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-[#6B7280] italic border border-dashed border-[#22252A] rounded-xl p-4 bg-[#0B0D10]">No action points parsed from the email body.</p>
              )}
            </div>

            {/* AI Reasoning Chip */}
            <div className="inline-flex items-center gap-3 bg-[#0B0D10] border border-[#22252A] rounded-xl px-4 py-2.5">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">AI Status</span>
              <span className="w-[1px] h-3 bg-[#22252A]"></span>
              <span className="text-[13px] font-semibold text-[#E5E7EB]">{ev.shortlist_status_reason || 'Awaiting update'}</span>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}