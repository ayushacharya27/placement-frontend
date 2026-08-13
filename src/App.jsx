import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Archive, ArchiveRestore, X, ChevronRight, 
  LogOut, Briefcase, Mail, Clock, AlertCircle,
  MapPin, CalendarDays, FileText, Presentation, Trophy, FolderOpen, Terminal,
  CheckSquare, Square, Plus, Trash2, Sparkles, Send
} from 'lucide-react';

//const API_BASE = "http://localhost:8000";
const API_BASE = "https://placement-backend-2m5h.onrender.com";

// ==========================================
// UTILS & HELPERS
// ==========================================
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

function formatEventDate(value) {
  if (!value) return 'TBD';
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
  return raw;
}

function getStatus(ev) {
  if (ev.event_type === 'Result' && !ev.is_user_shortlisted) {
    return { label: 'NOT SELECTED', dot: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/20' };
  }
  if (ev.action_required) return { label: 'ACTION REQ', dot: 'bg-[#ff2d55]', text: 'text-[#ff2d55]', border: 'border-[#ff2d55]/40' };
  if (ev.is_user_shortlisted) return { label: 'SHORTLISTED', dot: 'bg-[#2dd4ff]', text: 'text-[#2dd4ff]', border: 'border-[#2dd4ff]/40' };
  return { label: 'IN REVIEW', dot: 'bg-[#f59e0b]', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/40' };
}

const EVENT_CATEGORIES = [
  { id: 'assessments', title: 'Assessments & Interviews', icon: FileText, types: ['Online Test', 'Interview', 'Hackathon'] },
  { id: 'ppts', title: 'Pre-Placement Talks', icon: Presentation, types: ['PPT'] },
  { id: 'results', title: 'Results & Shortlists', icon: Trophy, types: ['Result'] },
  { id: 'others', title: 'General & Registrations', icon: FolderOpen, types: ['Other', 'Registration'] },
];

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
    .cy-display { font-family: 'Chakra Petch', sans-serif; }
    .cy-body { font-family: 'Manrope', sans-serif; }
    .cy-mono { font-family: 'JetBrains Mono', monospace; }
    .cy-cursor { display: inline-block; color: #2dd4ff; animation: cyBlink 1.1s steps(1) infinite; }
    @keyframes cyBlink { 50% { opacity: 0; } }
    .scanline {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
      background-size: 100% 4px; pointer-events: none; z-index: 50; opacity: 0.3;
    }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
  `}</style>
);

// ==========================================
// APP COMPONENT
// ==========================================
export default function App() {
  const [userConfig, setUserConfig] = useState(null);
  const [uiMode, setUiMode] = useState('shell'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const result = localStorage.getItem('user-config');
      if (result) setUserConfig(JSON.parse(result));
      const savedMode = localStorage.getItem('ui-mode');
      if (savedMode) setUiMode(savedMode);
    } catch (e) {}
    setLoading(false);
  }, []);

  const handleLogin = (config) => {
    setUserConfig(config);
    try { localStorage.setItem('user-config', JSON.stringify(config)); } catch (e) {}
  };

  const handleLogout = () => {
    setUserConfig(null);
    try { localStorage.removeItem('user-config'); } catch (e) {}
  };

  const toggleMode = (mode) => {
    setUiMode(mode);
    localStorage.setItem('ui-mode', mode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#041126] flex items-center justify-center cy-mono text-[#2dd4ff]">
        <GlobalStyles />
        INITIALIZING_SYSTEM...
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      {!userConfig ? (
        <HybridSetup onComplete={handleLogin} />
      ) : uiMode === 'shell' ? (
        <TerminalBoard config={userConfig} onLogout={handleLogout} onToggleMode={() => toggleMode('gui')} />
      ) : (
        <GuiBoard config={userConfig} onLogout={handleLogout} onToggleMode={() => toggleMode('shell')} />
      )}
    </>
  );
}

// ==========================================
// HYBRID LOGIN (Desktop = Terminal, Mobile = Form)
// ==========================================
function HybridSetup({ onComplete }) {
  const [regNo, setRegNo] = useState('');
  const [neoId, setNeoId] = useState('');
  const [step, setStep] = useState(0);
  const [lines, setLines] = useState([]);
  const inputRef = useRef(null);

  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: async (codeResponse) => {
      setLines(prev => [...prev, { text: 'EXCHANGING OAUTH TOKENS...', color: 'text-amber-400' }]);
      try {
        const res = await axios.post(`${API_BASE}/auth/google`, { 
          code: codeResponse.code, 
          registration_number: regNo.trim().toUpperCase(), 
          neo_id: neoId.trim() 
        });
        setLines(prev => [...prev, { text: `ACCESS GRANTED. WELCOME ${res.data.user.name.toUpperCase()}.`, color: 'text-emerald-400' }]);
        setTimeout(() => onComplete(res.data.user), 1000);
      } catch (error) {
        alert("Authentication failed.");
        setLines(prev => [...prev, { text: 'AUTH FAILED. ACCESS DENIED.', color: 'text-red-500' }]);
        setTimeout(() => { setStep(1); setLines([]); setRegNo(''); setNeoId(''); }, 2000);
      }
    },
    onError: () => setLines(prev => [...prev, { text: 'AUTH CANCELLED.', color: 'text-red-500' }])
  });

  useEffect(() => {
    setLines([]); 
    const bootSequence = [
      "PLACEMENT OS v3.1.4 [SECURE TERMINAL]",
      "ESTABLISHING SECURE CONNECTION...",
      "CONNECTION ESTABLISHED."
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < bootSequence.length) {
        setLines(prev => [...prev, { text: bootSequence[i], color: 'text-[#2dd4ff]' }]);
        i++;
      } else {
        clearInterval(interval);
        setStep(1);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step >= 1) setTimeout(() => inputRef.current?.focus(), 50);
  }, [step]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (step === 1 && regNo.trim()) {
        setLines(prev => [...prev, { text: `> ${regNo.toUpperCase()}`, color: 'text-white' }]);
        setStep(2);
      } else if (step === 2 && neoId.trim()) {
        setLines(prev => [...prev, { text: `> ${neoId}`, color: 'text-white' }, { text: 'READY FOR OAUTH HANDSHAKE. PRESS ENTER TO EXECUTE.', color: 'text-amber-400' }]);
        setStep(3);
      } else if (step === 3) {
        login();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#041126] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="scanline" />
      
      <div className="hidden md:flex flex-col justify-end min-h-[90vh] w-full max-w-3xl cy-mono text-sm cursor-text" onClick={() => inputRef.current?.focus()}>
        {lines.map((line, i) => (
          <div key={i} className={`mb-2 ${line.color}`}>{line.text}</div>
        ))}
        {step === 1 && (
          <div className="flex items-center text-[#2dd4ff] mt-2">
            <span>ENTER REGISTRATION NUMBER: </span>
            <input ref={inputRef} type="text" value={regNo} onChange={e => setRegNo(e.target.value)} onKeyDown={handleKeyDown} className="bg-transparent outline-none text-white ml-2 uppercase flex-1" spellCheck="false" autoFocus />
          </div>
        )}
        {step === 2 && (
          <div className="flex items-center text-[#2dd4ff] mt-2">
            <span>ENTER NEO ID: </span>
            <input ref={inputRef} type="text" value={neoId} onChange={e => setNeoId(e.target.value)} onKeyDown={handleKeyDown} className="bg-transparent outline-none text-white ml-2 flex-1 uppercase" spellCheck="false" autoFocus />
          </div>
        )}
        {step === 3 && (
          <div className="flex items-center text-[#2dd4ff] mt-2 relative">
            <span className="animate-pulse">_</span>
            <input ref={inputRef} type="text" onKeyDown={handleKeyDown} className="absolute opacity-0 w-1 h-1" autoFocus />
          </div>
        )}
      </div>

      <div className="md:hidden w-full max-w-md bg-[#0a0d12]/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-8 relative z-10">
        <h1 className="text-2xl font-bold text-[#eef3f8] cy-display text-center mb-2 tracking-wide">
          Placement <span className="text-[#2dd4ff]">OS</span><span className="cy-cursor">_</span>
        </h1>
        <p className="text-sm text-[#8a99a8] cy-body text-center mb-8">System Authentication Required.</p>

        <div className="mb-4">
          <label className="block text-[11px] font-bold text-[#5b6b7d] cy-mono uppercase tracking-widest mb-1.5">Registration Number</label>
          <input type="text" placeholder="e.g. 23BPS1078" value={regNo} onChange={(e) => setRegNo(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-white/10 bg-[#041126] text-sm text-[#cdd9e3] cy-mono focus:outline-none focus:border-[#2dd4ff]/50 focus:ring-1 focus:ring-[#2dd4ff]/50 uppercase placeholder:normal-case placeholder:text-[#4d5b6b]" />
        </div>

        <div className="mb-8">
          <label className="block text-[11px] font-bold text-[#5b6b7d] cy-mono uppercase tracking-widest mb-1.5">Neo ID</label>
          <input type="text" placeholder="e.g. NEO123456" value={neoId} onChange={(e) => setNeoId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-white/10 bg-[#041126] text-sm text-[#cdd9e3] cy-mono focus:outline-none focus:border-[#2dd4ff]/50 focus:ring-1 focus:ring-[#2dd4ff]/50 uppercase placeholder:normal-case placeholder:text-[#4d5b6b]" />
        </div>

        <button onClick={() => { if (!regNo.trim() || !neoId.trim()) return alert("Missing identifiers."); login(); }} className="w-full bg-[#041126] hover:bg-[#0a1835] text-[#2dd4ff] border border-[#2dd4ff]/30 font-bold cy-display tracking-widest uppercase text-sm py-3.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center shadow-[0_0_20px_rgba(45,212,255,0.1)]">
          AUTHENTICATE_
        </button>
      </div>
    </div>
  );
}

// ==========================================
// INTERACTIVE SHELL BOARD (TERMINAL MODE)
// ==========================================
function TerminalBoard({ config, onLogout, onToggleMode }) {
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([
    { type: 'text', text: `Welcome to PLACEMENT OS, ${config.name}.` },
    { type: 'text', text: "Type 'help' to see available commands." }
  ]);
  const [input, setInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [openEvent, setOpenEvent] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events/?user_id=${config.id}`);
      setEvents(res.data.events || []);
    } catch (error) {
      appendHistory([{ type: 'error', text: 'ERR: Could not connect to database.' }]);
    }
  };

  useEffect(() => { fetchEvents(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const appendHistory = (entries) => setHistory(prev => [...prev, ...entries]);

  const handleCommand = async (e) => {
    if (e.key !== 'Enter') return;
    const cmd = input.trim();
    setInput('');
    if (!cmd) return appendHistory([{ type: 'input', text: `guest@pos:~$ ` }]);

    appendHistory([{ type: 'input', text: `guest@pos:~$ ${cmd}` }]);
    const args = cmd.toLowerCase().split(' ');
    const command = args[0];

    switch(command) {
      case 'help':
        appendHistory([{ type: 'text', text: `
AVAILABLE COMMANDS:
  ls      - List all tracked placement events
  sync    - Force synchronize inbox (AI Extraction)
  view <id> - View detailed record (e.g. 'view 1')
  gui     - Switch to Premium Visual Interface
  clear   - Clear terminal output
  logout  - Terminate session
        `.trim()}]);
        break;
      case 'ls':
        if (events.length === 0) {
          appendHistory([{ type: 'text', text: 'No records found. Run "sync" to extract emails.' }]);
        } else {
          let table = `ID  | COMPANY                  | DATE        | STATUS\n`;
          table += `-----------------------------------------------------------\n`;
          events.forEach((ev, idx) => {
            const idStr = String(idx).padEnd(3, ' ');
            const cName = (ev.company_name || 'Unknown').substring(0, 22).padEnd(24, ' ');
            const dateStr = formatEventDate(ev.date).padEnd(11, ' ');
            const stat = getStatus(ev).label;
            table += `${idStr} | ${cName} | ${dateStr} | ${stat}\n`;
          });
          appendHistory([{ type: 'text', text: table }]);
        }
        break;
      case 'view':
        const targetIdx = parseInt(args[1]);
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= events.length) {
          appendHistory([{ type: 'error', text: `ERR: Invalid ID. Run 'ls' to see IDs.` }]);
        } else {
          setOpenEvent(events[targetIdx]);
          appendHistory([{ type: 'text', text: `> Launching visual record viewer for ID ${targetIdx}...` }]);
        }
        break;
      case 'gui':
        onToggleMode();
        break;
      case 'clear':
        setHistory([]);
        break;
      case 'logout':
        onLogout();
        break;
      case 'sync':
        if (syncing) return appendHistory([{ type: 'error', text: 'ERR: Sync already in progress.' }]);
        setSyncing(true);
        appendHistory([{ type: 'text', text: 'INITIATING AI GHOST SCANNER...' }]);
        try {
          await axios.post(`${API_BASE}/events/sync?user_id=${config.id}`);
          await fetchEvents();
          appendHistory([{ type: 'success', text: 'SYNC COMPLETE. Database updated. Run "ls" to view.' }]);
        } catch (err) {
          appendHistory([{ type: 'error', text: 'ERR: Sync failed. Check logs.' }]);
        }
        setSyncing(false);
        break;
      default:
        appendHistory([{ type: 'error', text: `Command not found: ${command}` }]);
    }
  };

  return (
    <div className="min-h-screen bg-[#040812] font-mono text-sm p-6 overflow-hidden relative" onClick={() => inputRef.current?.focus()}>
      <div className="scanline" />
      <div className="text-[#2dd4ff] whitespace-pre font-bold mb-6 hidden md:block">
        {`
██████╗ ██████╗ ███████╗
██╔══██╗██╔═══██╗██╔════╝
██████╔╝██║   ██║███████╗
██╔═══╝ ██║   ██║╚════██║
██║     ╚██████╔╝███████║
╚═╝      ╚═════╝ ╚══════╝  v3.1.4
        `}
      </div>
      <div className="max-w-5xl pb-24 relative z-10">
        {history.map((h, i) => {
          if (h.type === 'input') return <div key={i} className="text-[#eef3f8] mt-4 mb-2">{h.text}</div>;
          if (h.type === 'error') return <div key={i} className="text-[#ff2d55] whitespace-pre-wrap">{h.text}</div>;
          if (h.type === 'success') return <div key={i} className="text-[#2DD4A7] whitespace-pre-wrap">{h.text}</div>;
          return <div key={i} className="text-[#8a99a8] whitespace-pre-wrap">{h.text}</div>;
        })}
        <div className="flex items-center text-[#eef3f8] mt-4">
          <span className="text-[#2dd4ff] mr-2">guest@pos:~$</span>
          <input 
            ref={inputRef} type="text" value={input} 
            onChange={e => setInput(e.target.value)} onKeyDown={handleCommand}
            className="bg-transparent outline-none flex-1" spellCheck="false" autoFocus
          />
        </div>
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {openEvent && <CyberDetailPanel ev={openEvent} onClose={() => setOpenEvent(null)} onArchive={() => setOpenEvent(null)} isArchived={false} />}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// MAIN GUI BOARD
// ==========================================
function GuiBoard({ config, onLogout, onToggleMode }) {
  const [view, setView] = useState('placements'); // 'placements' | 'todos'
  
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [openEvent, setOpenEvent] = useState(null);
  const [archivedIds, setArchivedIds] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE}/events/?user_id=${config.id}`).then(res => setEvents(res.data.events || []));
    try {
      const result = localStorage.getItem('archived-ids');
      if (result) setArchivedIds(JSON.parse(result));
    } catch (e) {}
  }, [config.id]);

  useEffect(() => {
    try { localStorage.setItem('archived-ids', JSON.stringify(archivedIds)); } catch (e) {}
  }, [archivedIds]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await axios.post(`${API_BASE}/events/sync?user_id=${config.id}`);
    const res = await axios.get(`${API_BASE}/events/?user_id=${config.id}`);
    setEvents(res.data.events || []);
    setSyncing(false);
  };

  const activeEvents = events.filter(e => !archivedIds.includes(e.id));
  const archivedEvents = events.filter(e => archivedIds.includes(e.id));

  let baseList = activeNav === 'archived' ? archivedEvents : activeEvents;
  const pendingCount = activeEvents.filter(e => !e.is_user_shortlisted).length;
  const shortlistedCount = activeEvents.filter(e => e.is_user_shortlisted).length;

  if (activeNav === 'pending') baseList = baseList.filter(e => !e.is_user_shortlisted);
  if (activeNav === 'shortlisted') baseList = baseList.filter(e => e.is_user_shortlisted);

  const navTabs = [
    { key: 'overview', label: 'ALL ROLES' },
    { key: 'pending', label: 'IN REVIEW' },
    { key: 'shortlisted', label: 'SHORTLISTED' },
    { key: 'archived', label: 'ARCHIVED' },
  ];

  return (
    <div className="min-h-screen bg-[#041126] font-sans pb-24 relative overflow-hidden">
      
      {/* Background Grid & Blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] z-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '46px 46px' }} />
      <div className="pointer-events-none fixed -top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#2dd4ff]/10 blur-[130px] z-0" />
      <div className="pointer-events-none fixed bottom-0 left-0 w-[24rem] h-[24rem] rounded-full bg-[#a78bfa]/[0.08] blur-[130px] z-0" />

      {/* HEADER NAV */}
      <header className="relative z-20 pt-8 pb-6 border-b border-white/5 bg-[#0a0d12]/50 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="cy-display text-2xl font-bold text-[#2dd4ff] leading-none tracking-wide">
              {config.name}
            </h1>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setView('placements')} 
              className={`cy-body font-medium transition-colors whitespace-nowrap ${view === 'placements' ? 'text-[#2dd4ff]' : 'text-[#8a99a8] hover:text-white'}`}
            >
              Placements
            </button>
            <button 
              onClick={() => setView('todos')} 
              className={`cy-body font-medium transition-colors whitespace-nowrap ${view === 'todos' ? 'text-[#2dd4ff]' : 'text-[#8a99a8] hover:text-white'}`}
            >
              Action Center
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-2 hidden md:block" />
            <button onClick={onToggleMode} className="hidden sm:block cy-body text-[#8a99a8] hover:text-[#2dd4ff] transition-colors font-medium">Terminal</button>
            <button onClick={handleSync} disabled={syncing} className="hidden sm:block cy-body text-[#8a99a8] hover:text-[#2dd4ff] transition-colors font-medium">{syncing ? 'Syncing...' : 'Sync'}</button>
            <button onClick={onLogout} className="cy-body text-[#8a99a8] hover:text-[#ff2d55] transition-colors"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="relative z-20 max-w-[1400px] mx-auto px-6 lg:px-12 pt-16">
        
        {view === 'placements' ? (
          <>
            {/* HERO SECTION */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14 max-w-3xl">
              <div className="cy-mono text-[10.5px] uppercase tracking-[0.25em] text-[#4d5b6b] mb-4 flex items-center gap-2">
                <span className="text-[#2dd4ff]">●</span> ROOT@SYSTEMS:~$ LS ./PLACEMENTS
              </div>
              <h2 className="cy-display text-5xl md:text-7xl font-bold tracking-tight text-[#eef3f8] mb-4">
                My <span className="text-[#2dd4ff]">Placements</span>
              </h2>
              <p className="cy-body text-[#8a99a8]">A collection of upcoming assessments, interviews, and shortlists.</p>
            </motion.div>

            {/* TABS (Filters) */}
            <div className="flex items-center gap-8 mb-10 overflow-x-auto scrollbar-hide pb-2 border-b border-white/5">
              {navTabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveNav(t.key)}
                  className={`pb-4 flex items-center gap-2 cy-mono text-[11px] uppercase tracking-widest transition-colors whitespace-nowrap relative ${
                    activeNav === t.key ? 'text-[#eef3f8]' : 'text-[#5b6b7d] hover:text-[#8a99a8]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeNav === t.key ? 'bg-[#2dd4ff]' : 'bg-[#4d5b6b]'}`} />
                  {t.label}
                  {activeNav === t.key && <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-[#2dd4ff] shadow-[0_0_10px_#2dd4ff]" />}
                </button>
              ))}
            </div>

            {/* CARDS GRID */}
            {baseList.length > 0 ? (
              <div className="space-y-16">
                {EVENT_CATEGORIES.map((category) => {
                  const categoryEvents = baseList.filter(ev => {
                    const type = ev.event_type || 'Other';
                    if (category.id === 'others') {
                      const isCaughtElsewhere = EVENT_CATEGORIES.some(c => c.id !== 'others' && c.types.includes(type));
                      return !isCaughtElsewhere;
                    }
                    return category.types.includes(type);
                  });

                  if (categoryEvents.length === 0) return null;
                  const Icon = category.icon;

                  return (
                    <motion.section 
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <div className="mb-6 flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2dd4ff]/20 bg-[#041126] text-[#2dd4ff]">
                          <Icon size={16} strokeWidth={1.8} />
                        </div>
                        <div>
                          <div className="cy-mono text-[10px] uppercase tracking-[0.2em] text-[#4d5b6b] mb-1">
                            // cat_{category.id}
                          </div>
                          <h2 className="cy-display text-2xl font-bold tracking-tight text-[#eef3f8]">
                            {category.title}
                          </h2>
                        </div>
                      </div>
                      
                      <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                      >
                        {categoryEvents.map((ev, index) => (
                          <CyberCard key={ev.id} ev={ev} index={index} onOpen={() => setOpenEvent(ev)} />
                        ))}
                      </motion.div>
                    </motion.section>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 px-4 bg-[#0a0d12]/80 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg">
                <Mail className="mx-auto h-10 w-10 text-[#4d5b6b] mb-4" strokeWidth={1.5} />
                <h3 className="cy-display text-lg font-bold text-[#eef3f8]">NO_DATA_FOUND</h3>
                <p className="mt-2 text-sm text-[#8a99a8] cy-mono">Await sync or adjust query parameters.</p>
              </div>
            )}
          </>
        ) : (
          <ToDoPage userConfig={config} />
        )}
      </main>

      <AnimatePresence>
        {openEvent && <CyberDetailPanel ev={openEvent} isArchived={archivedIds.includes(openEvent.id)} onClose={() => setOpenEvent(null)} onArchive={() => { setArchivedIds(prev => prev.includes(openEvent.id) ? prev.filter(x => x !== openEvent.id) : [...prev, openEvent.id]); setOpenEvent(null); }} />}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// TO-DO PAGE (Action Center)
// ==========================================
function ToDoPage({ userConfig }) {
  const [todos, setTodos] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user-todos');
      if (saved) setTodos(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const saveTodos = (updated) => {
    setTodos(updated);
    localStorage.setItem('user-todos', JSON.stringify(updated));
  };

  const addTask = (title, category = 'General') => {
    if (!title.trim()) return;
    const newTodo = { id: Date.now(), title, category, completed: false };
    saveTodos([newTodo, ...todos]);
    setTaskInput('');
  };

  const toggleTask = (id) => {
    saveTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    saveTodos(todos.filter(t => t.id !== id));
  };

  const handleAiCopilot = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await axios.post(`${API_BASE}/ai/todo-copilot`, {
        user_id: userConfig.id,
        prompt: aiPrompt
      });
      setAiResponse(res.data);
    } catch (e) {
      alert("AI Assistant failed to generate tasks. Please check your Gemini API key on the backend.");
    }
    setAiLoading(false);
  };

  const importSuggestedTasks = (suggested) => {
    const newTasks = suggested.map(s => ({
      id: Date.now() + Math.random(),
      title: s.title,
      category: s.category || 'AI Prep',
      completed: false
    }));
    saveTodos([...newTasks, ...todos]);
    setAiResponse(null);
    setAiPrompt('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
      <div className="mb-12">
        <div className="cy-mono text-[10.5px] uppercase tracking-[0.25em] text-[#4d5b6b] mb-4 flex items-center gap-2">
          <span className="text-[#2dd4ff]">●</span> ROOT@SYSTEMS:~$ LS ./ACTION_CENTER
        </div>
        <h2 className="cy-display text-5xl md:text-7xl font-bold tracking-tight text-[#eef3f8] mb-4">
          Action <span className="text-[#2dd4ff]">Center</span>
        </h2>
        <p className="cy-body text-[#8a99a8]">Manage your placement preparation and generate AI study plans.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: MANUAL TO-DO LIST */}
        <div className="lg:col-span-6 bg-[#0a0d12]/80 border border-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="cy-display text-2xl font-bold text-[#eef3f8]">To-Do Checklist</h2>
              <span className="cy-mono text-xs px-3 py-1 bg-[#041126] border border-[#2dd4ff]/30 text-[#2dd4ff] rounded-full">
                {todos.filter(t => !t.completed).length} PENDING
              </span>
            </div>

            {/* Quick Add Input */}
            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                placeholder="Add a new placement task..."
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask(taskInput)}
                className="flex-1 bg-[#041126] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#2dd4ff]/50 cy-body placeholder:text-[#4d5b6b]"
              />
              <button
                onClick={() => addTask(taskInput)}
                className="bg-[#2dd4ff] text-[#041126] p-3 rounded-xl font-bold hover:bg-[#2dd4ff]/80 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Task List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-hide pr-1">
              {todos.length > 0 ? todos.map(todo => (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    todo.completed ? 'bg-[#041126]/40 border-white/5 opacity-50' : 'bg-[#041126] border-white/10 hover:border-[#2dd4ff]/30'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-2 cursor-pointer" onClick={() => toggleTask(todo.id)}>
                    {todo.completed ? <CheckSquare size={18} className="text-[#2dd4ff] shrink-0" /> : <Square size={18} className="text-[#5b6b7d] shrink-0" />}
                    <span className={`text-sm cy-body text-[#cdd9e3] truncate ${todo.completed ? 'line-through text-[#5b6b7d]' : ''}`}>
                      {todo.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="cy-mono text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#8a99a8] uppercase">{todo.category}</span>
                    <button onClick={() => deleteTask(todo.id)} className="text-[#5b6b7d] hover:text-[#ff2d55] transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-[#5b6b7d] cy-mono text-xs border border-dashed border-white/10 rounded-xl">
                  No tasks added yet. Type above or use Gemini AI Copilot.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI COPILOT */}
        <div className="lg:col-span-6 bg-[#0a0d12]/80 border border-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2dd4ff]/60 to-transparent" />
          
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-[#2dd4ff] w-5 h-5 animate-pulse" />
            <span className="cy-mono text-[10px] text-[#2dd4ff] uppercase tracking-widest font-bold">GEMINI 2.5 FLASH COPILOT</span>
          </div>
          <h2 className="cy-display text-2xl font-bold text-[#eef3f8] mb-2">AI Prep Task Generator</h2>
          <p className="cy-body text-sm text-[#8a99a8] mb-6">
            Ask Gemini to create a study plan or break down a topic (e.g. <i>"Prepare for Honeywell online assessment"</i> or <i>"A* algorithm revision roadmap"</i>).
          </p>

          <form onSubmit={handleAiCopilot} className="mb-6">
            <div className="relative">
              <textarea
                rows={3}
                placeholder="Ask Gemini AI to create prep tasks..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="w-full bg-[#041126] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#2dd4ff]/50 cy-body placeholder:text-[#4d5b6b] resize-none"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="absolute bottom-3 right-3 bg-[#2dd4ff] text-[#041126] px-4 py-2 rounded-lg cy-mono text-xs font-bold flex items-center gap-2 hover:bg-[#2dd4ff]/80 transition-all disabled:opacity-50"
              >
                {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send size={14} />}
                {aiLoading ? "GENERATING..." : "GENERATE_TASKS"}
              </button>
            </div>
          </form>

          {/* AI Response Card */}
          {aiResponse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#041126] border border-[#2dd4ff]/30 rounded-xl p-5 mt-auto">
              <p className="cy-body text-sm text-[#cdd9e3] mb-4 border-b border-white/5 pb-3 leading-relaxed">
                🤖 <b>AI Strategy:</b> {aiResponse.ai_response}
              </p>

              <div className="space-y-2 mb-4">
                {aiResponse.suggested_tasks?.map((task, i) => (
                  <div key={i} className="flex items-center justify-between text-xs cy-mono text-[#8a99a8] bg-white/5 p-2.5 rounded-lg border border-white/5">
                    <span className="truncate mr-3">• {task.title}</span>
                    <span className="text-[9px] text-[#2dd4ff] shrink-0">{task.category}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => importSuggestedTasks(aiResponse.suggested_tasks)}
                className="w-full bg-[#2dd4ff]/10 hover:bg-[#2dd4ff]/20 border border-[#2dd4ff]/40 text-[#2dd4ff] py-3 rounded-lg cy-mono text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> IMPORT_ALL_TASKS_TO_CHECKLIST
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// CYBER CARD
// ==========================================
function CyberCard({ ev, index, onOpen }) {
  const status = getStatus(ev);
  const isRejected = ev.event_type === 'Result' && !ev.is_user_shortlisted;
  const opacityClass = isRejected ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0" : "";

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 24, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1 } }}
      onClick={onOpen}
      className={`group relative overflow-hidden bg-[#0a0d12]/80 border border-white/10 backdrop-blur-sm p-6 cursor-pointer transition-all duration-300 hover:border-[#2dd4ff]/30 hover:-translate-y-1 hover:shadow-[0_20px_50px_-25px_rgba(45,212,255,0.15)] flex flex-col min-h-[220px] ${opacityClass}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2dd4ff]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2dd4ff]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Massive Background Number */}
      <div className="absolute -right-2 top-0 select-none text-[110px] font-bold tracking-tighter text-transparent opacity-[0.25] cy-display pointer-events-none transition-transform duration-500 group-hover:scale-105" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.15)' }}>
        {String(index + 1).padStart(2, '0')}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Category Header */}
        <div className="mb-5 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className="cy-mono text-[10px] text-[#2dd4ff] uppercase tracking-widest">{ev.event_type || 'UPDATE'}</span>
        </div>

        {/* Company Title */}
        <h3 className="cy-display text-2xl font-bold text-[#eef3f8] mb-3 pr-4 leading-tight">{ev.company_name || 'Unknown'}</h3>
        
        {/* Description / Status Reason */}
        <p className="cy-body text-sm text-[#8a99a8] mb-6 line-clamp-3 pr-8">
          {ev.shortlist_status_reason || status.label}
        </p>

        {/* Info Chips */}
        <div className="mt-auto flex flex-wrap gap-2.5 border-t border-white/5 pt-5">
          <span className="cy-mono text-[10px] text-[#5b6b7d] uppercase tracking-widest">{formatEventDate(ev.date)}</span>
          <span className="cy-mono text-[10px] text-[#4d5b6b]">•</span>
          <span className="cy-mono text-[10px] text-[#5b6b7d] uppercase tracking-widest">{ev.time || 'TBD'}</span>
          <span className="cy-mono text-[10px] text-[#4d5b6b]">•</span>
          <span className="cy-mono text-[10px] text-[#5b6b7d] uppercase tracking-widest truncate max-w-[120px]">{ev.venue || 'TBD'}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// CYBER DETAIL PANEL
// ==========================================
function CyberDetailPanel({ ev, onClose, onArchive, isArchived }) {
  let points = []; try { points = JSON.parse(ev.email_summary_points || '[]'); } catch (e) {}
  const status = getStatus(ev);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#041126]/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-[480px] h-full bg-[#0a0d12] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col">
        {/* Header */}
        <div className="relative pt-10 px-8 pb-6 border-b border-white/5 bg-[#041126]/50">
          <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#8a99a8] hover:text-white transition-colors"><X size={16} /></button>
          
          <div className="flex items-center gap-3 mb-4">
             <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] cy-mono ${status.bg} ${status.text} ${status.border}`}><span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}</span>
            <span className="cy-mono text-[10px] text-[#4d5b6b] uppercase tracking-widest">{ev.event_type || 'Update'}</span>
          </div>
          
          <h2 className="cy-display text-3xl font-bold text-[#eef3f8] leading-tight mb-2">{ev.company_name || 'Unknown'}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-6 scrollbar-hide">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#041126] rounded-xl p-4 border border-white/5">
              <dt className="cy-mono text-[10px] text-[#5b6b7d] uppercase tracking-widest mb-2 flex items-center gap-1.5"><CalendarDays size={12}/> DATE</dt>
              <dd className="cy-body text-sm font-semibold text-[#cdd9e3]">{formatEventDate(ev.date)}</dd>
            </div>
            <div className="bg-[#041126] rounded-xl p-4 border border-white/5">
              <dt className="cy-mono text-[10px] text-[#5b6b7d] uppercase tracking-widest mb-2 flex items-center gap-1.5"><Clock size={12}/> TIME</dt>
              <dd className="cy-body text-sm font-semibold text-[#cdd9e3]">{ev.time || 'TBD'}</dd>
            </div>
            <div className="col-span-2 bg-[#041126] rounded-xl p-4 border border-white/5">
              <dt className="cy-mono text-[10px] text-[#5b6b7d] uppercase tracking-widest mb-2 flex items-center gap-1.5"><MapPin size={12}/> VENUE</dt>
              <dd className="cy-body text-sm font-semibold text-[#cdd9e3]">{ev.venue || 'TBD'}</dd>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="cy-display text-sm font-bold text-[#8a99a8] uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-[#2dd4ff] rounded-sm" /> EXTRACTION_LOG</h4>
            {points.length > 0 ? (
              <ul className="space-y-3">{points.map((p, i) => <li key={i} className="flex gap-3 text-sm cy-body text-[#cdd9e3] bg-[#041126] border border-white/5 rounded-lg p-4"><span className="cy-mono text-[10px] text-[#2dd4ff] mt-1">[{String(i+1).padStart(2,'0')}]</span><span>{p}</span></li>)}</ul>
            ) : <p className="text-xs text-[#5b6b7d] cy-mono italic border border-dashed border-white/10 rounded-lg p-4 bg-[#041126]/50">Empty response payload.</p>}
          </div>
          
          <div className={`${status.border} border bg-[#041126] rounded-xl p-4 flex gap-3`}>
             <AlertCircle className={`w-5 h-5 flex-shrink-0 ${status.text}`} />
             <div><p className="cy-mono text-[9px] text-[#5b6b7d] uppercase tracking-widest mb-1">STATUS_REASON</p><p className={`text-xs cy-body font-semibold ${status.text}`}>{ev.shortlist_status_reason || 'Pending update'}</p></div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-[#041126]/50">
          <button onClick={onArchive} className={`w-full flex justify-center items-center gap-2 py-3.5 rounded-lg text-xs cy-mono font-bold transition-all ${isArchived ? 'bg-white/5 text-[#8a99a8] hover:bg-white/10 border border-white/10' : 'bg-white/5 text-[#cdd9e3] hover:bg-white/10 border border-white/10 hover:border-[#2dd4ff]/50 hover:text-[#2dd4ff]'}`}>
            {isArchived ? <><ArchiveRestore size={16} /> RESTORE_RECORD()</> : <><Archive size={16} /> ARCHIVE_RECORD()</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}