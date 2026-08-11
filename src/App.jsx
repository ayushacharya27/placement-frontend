import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plane, RefreshCw, AlertTriangle, Archive, ArchiveRestore,
  X, ChevronRight, Ticket, LogOut
} from 'lucide-react';

const API_BASE = "https://placement-backend-2m5h.onrender.com";
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// ==========================================
// GLOBAL BOARD STYLES
// ==========================================
function BoardStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
      .font-flap { font-family: 'Space Mono', monospace; }
      .font-body { font-family: 'Inter', sans-serif; }
      @keyframes stampIn {
        0% { transform: scale(2.4) rotate(-9deg); opacity: 0; }
        55% { transform: scale(0.92) rotate(-9deg); opacity: 1; }
        100% { transform: scale(1) rotate(-9deg); opacity: 1; }
      }
      .stamp { animation: stampIn 0.35s ease-out; }
      @media (prefers-reduced-motion: reduce) {
        .stamp { animation: none; }
      }
      .ticket-perf {
        background-image: radial-gradient(circle, #0A0908 3px, transparent 3px);
        background-size: 14px 14px;
        background-position: center;
      }
      .barcode {
        background-image: repeating-linear-gradient(90deg, #EDE7DA 0px, #EDE7DA 2px, transparent 2px, transparent 4px, #EDE7DA 4px, #EDE7DA 5px, transparent 5px, transparent 9px, #EDE7DA 9px, #EDE7DA 10px, transparent 10px, transparent 13px);
      }
    `}</style>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function scramble(str) {
  return str.split('').map(c => (c === ' ' ? ' ' : CHARSET[Math.floor(Math.random() * CHARSET.length)])).join('');
}

function Flap({ text, flipKey, delay = 0, className = '' }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    if (reduced) { setDisplay(text); return; }
    let frame = 0;
    const frames = 5;
    let interval;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        frame++;
        if (frame >= frames) {
          setDisplay(text);
          clearInterval(interval);
        } else {
          setDisplay(scramble(text));
        }
      }, 55);
    }, delay);
    return () => { clearTimeout(start); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipKey, text]);
  return <span className={className}>{display}</span>;
}

export default function App() {
  const [userConfig, setUserConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // FIXED: Using standard browser localStorage
  useEffect(() => {
    try {
      const result = localStorage.getItem('user-config');
      if (result) setUserConfig(JSON.parse(result));
    } catch (e) { /* no saved passenger yet */ }
    setLoading(false);
  }, []);

  const handleLogin = (config) => {
    setUserConfig(config);
    try { localStorage.setItem('user-config', JSON.stringify(config)); }
    catch (e) { console.error('Could not save passenger details', e); }
  };

  const handleLogout = () => {
    setUserConfig(null);
    try { localStorage.removeItem('user-config'); }
    catch (e) { /* nothing to clear */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center">
        <BoardStyles />
        <span className="font-flap text-[11px] tracking-[0.3em] text-[#8A8478] uppercase animate-pulse">Loading board…</span>
      </div>
    );
  }

  if (!userConfig) return <SetupScreen onComplete={handleLogin} />;
  return <Board config={userConfig} onLogout={handleLogout} />;
}

// ==========================================
// CHECK-IN (login)
// ==========================================
function SetupScreen({ onComplete }) {
  const [formData, setFormData] = useState({ name: "Ayush Acharya", regNumber: "23BPS1078" });

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="min-h-screen bg-[#0A0908] font-body flex items-center justify-center p-6">
      <BoardStyles />
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <Ticket className="w-4 h-4 text-[#FFB627]" />
          <span className="font-flap text-[10px] tracking-[0.3em] text-[#8A8478] uppercase">Placement Board · Check-in</span>
        </div>
        <div className="relative bg-[#14120F] border border-[#2B2620] rounded-sm p-8">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#FFB627]"></div>
          <h1 className="font-flap text-2xl text-[#EDE7DA] tracking-wide mb-1">BOARDING PASS</h1>
          <p className="text-xs text-[#8A8478] mb-8 font-body">Enter your details to open the board.</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-flap text-[10px] text-[#8A8478] uppercase tracking-[0.2em] mb-2">Passenger</label>
              <input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-transparent border-b border-[#2B2620] pb-2 text-[#EDE7DA] text-sm font-body outline-none focus-visible:border-[#FFB627] transition-colors"
              />
            </div>
            <div>
              <label className="block font-flap text-[10px] text-[#8A8478] uppercase tracking-[0.2em] mb-2">Reg. Number</label>
              <input
                required
                value={formData.regNumber}
                onChange={e => setFormData({ ...formData, regNumber: e.target.value })}
                className="w-full bg-transparent border-b border-[#2B2620] pb-2 text-[#EDE7DA] text-sm font-flap tracking-wider outline-none focus-visible:border-[#FFB627] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-4 bg-[#FFB627] hover:bg-[#FFC658] text-[#0A0908] font-flap font-bold text-sm py-3 rounded-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#FFB627] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908]"
            >
              Open board <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STATUS HELPERS
// ==========================================
function statusOf(ev) {
  if (ev.action_required) return { label: 'DELAYED', color: '#FF5C5C' };
  if (ev.is_user_shortlisted) return { label: 'ON BOARD', color: '#4ADE80' };
  return { label: 'BOARDING', color: '#FFB627' };
}

// ==========================================
// THE BOARD (dashboard)
// ==========================================
function Board({ config, onLogout }) {
  const clock = useClock();
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [openEvent, setOpenEvent] = useState(null);
  const [lastSyncedTime, setLastSyncedTime] = useState(clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [flipKey, setFlipKey] = useState(0);

  const [archivedIds, setArchivedIds] = useState([]);
  const archiveLoaded = useRef(false);

  // FIXED: Using standard browser localStorage
  useEffect(() => {
    try {
      const result = localStorage.getItem('archived-ids');
      if (result) setArchivedIds(JSON.parse(result));
    } catch (e) { /* nothing archived yet */ }
    archiveLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!archiveLoaded.current) return;
    try {
      localStorage.setItem('archived-ids', JSON.stringify(archivedIds));
    } catch (e) {
      console.error('Could not save archive state', e);
    }
  }, [archivedIds]);

  const toggleArchive = (id) => {
    setArchivedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setOpenEvent(null);
  };

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events/`);
      setEvents(res.data.events || []);
      setFlipKey(k => k + 1);
    } catch (error) { console.error("Board fetch failed"); }
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

  useEffect(() => {
    fetchEvents();
    const syncInterval = setInterval(handleSync, 30 * 60 * 1000);
    return () => clearInterval(syncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeEvents = events.filter(e => !archivedIds.includes(e.id));
  const archivedEvents = events.filter(e => archivedIds.includes(e.id));

  const totalExtracted = events.length;
  const shortlistedCount = activeEvents.filter(e => e.is_user_shortlisted).length;
  const pendingCount = activeEvents.filter(e => !e.is_user_shortlisted).length;
  const actionCount = activeEvents.filter(e => e.action_required).length;

  const uniqueCompanies = ['All', ...new Set(events.map(ev => ev.company_name).filter(Boolean))];

  let baseList = activeNav === 'archived' ? archivedEvents : activeEvents;
  if (activeNav === 'pending') baseList = baseList.filter(e => !e.is_user_shortlisted);
  if (activeNav === 'shortlisted') baseList = baseList.filter(e => e.is_user_shortlisted);

  const filteredEvents = baseList.filter(ev => selectedCompany === 'All' || ev.company_name === selectedCompany);

  const navTabs = [
    { key: 'overview', label: 'ALL FLIGHTS' },
    { key: 'pending', label: `PENDING (${pendingCount})` },
    { key: 'shortlisted', label: `ON BOARD (${shortlistedCount})` },
    { key: 'archived', label: `ARCHIVE (${archivedEvents.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#0A0908] font-body selection:bg-[#FFB627]/30">
      <BoardStyles />

      {/* TOP BAR */}
      <header className="border-b border-[#2B2620] px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="w-4 h-4 text-[#FFB627] -rotate-45" />
          <div>
            <h1 className="font-flap text-sm text-[#EDE7DA] tracking-[0.15em]">PLACEMENT BOARD</h1>
            <p className="text-[10px] font-flap text-[#8A8478] tracking-[0.2em] uppercase mt-0.5">VIT Chennai · Terminal 1</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="hidden sm:flex items-center gap-2 text-[11px] font-flap text-[#8A8478] hover:text-[#EDE7DA] uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FFB627] px-2 py-1"
        >
          {config.name} <LogOut className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* SYNC BAR */}
      <div className="px-6 md:px-10 py-4 flex items-center justify-between border-b border-[#2B2620] flex-wrap gap-3">
        <div className="font-flap text-2xl text-[#FFB627] tracking-widest tabular-nums">
          {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-flap text-[#8A8478] uppercase tracking-widest">Last sync {lastSyncedTime}</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 border border-[#FFB627] text-[#FFB627] hover:bg-[#FFB627] hover:text-[#0A0908] px-4 py-2 rounded-sm text-[11px] font-flap font-bold uppercase tracking-widest disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-[#FFB627] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing' : 'Sync inbox'}
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-8">

        {/* STAT READOUTS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#2B2620] border border-[#2B2620] mb-8">
          <StatBlock label="Total" value={totalExtracted} flipKey={flipKey} />
          <StatBlock label="On board" value={shortlistedCount} flipKey={flipKey} color="#4ADE80" />
          <StatBlock label="Boarding" value={pendingCount} flipKey={flipKey} color="#FFB627" />
          <StatBlock label="Delayed" value={actionCount} flipKey={flipKey} color="#FF5C5C" />
        </div>

        {/* NAV TABS */}
        <div className="flex items-center gap-6 border-b border-[#2B2620] mb-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {navTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveNav(t.key)}
              className={`font-flap text-[11px] tracking-widest uppercase pb-3 whitespace-nowrap border-b-2 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FFB627] ${
                activeNav === t.key ? 'text-[#FFB627] border-[#FFB627]' : 'text-[#8A8478] border-transparent hover:text-[#EDE7DA]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* COMPANY FILTER */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 [&::-webkit-scrollbar]:hidden">
          {uniqueCompanies.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCompany(c)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-flap font-bold uppercase tracking-wider whitespace-nowrap border transition-colors flex-shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FFB627] ${
                selectedCompany === c
                  ? 'border-[#FFB627] text-[#FFB627] bg-[#FFB627]/10'
                  : 'border-[#2B2620] text-[#8A8478] hover:text-[#EDE7DA] hover:border-[#4A443A]'
              }`}
            >
              {c === 'All' ? 'All companies' : c}
            </button>
          ))}
        </div>

        {/* BOARD HEADER (desktop) */}
        {filteredEvents.length > 0 && (
          <div className="hidden md:grid grid-cols-[2fr_130px_100px_90px_1.4fr_24px] gap-4 px-4 pb-2 border-b border-[#2B2620] font-flap text-[10px] text-[#8A8478] uppercase tracking-widest">
            <span>Company</span>
            <span>Status</span>
            <span>Date</span>
            <span>Time</span>
            <span>Venue</span>
            <span></span>
          </div>
        )}

        {/* ROWS */}
        <div>
          {filteredEvents.map((ev, idx) => (
            <EventRow key={ev.id} ev={ev} idx={idx} flipKey={flipKey} onOpen={() => setOpenEvent(ev)} />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-[#2B2620] rounded-sm">
            <Ticket className="w-6 h-6 text-[#2B2620] mb-3" />
            <p className="text-[#EDE7DA] font-flap text-sm uppercase tracking-widest">No flights on board</p>
            <p className="text-[#8A8478] text-[10px] font-flap mt-1 uppercase tracking-widest">Queue empty</p>
          </div>
        )}
      </div>

      <BoardingPassDrawer
        ev={openEvent}
        isArchived={openEvent ? archivedIds.includes(openEvent.id) : false}
        onClose={() => setOpenEvent(null)}
        onArchive={() => toggleArchive(openEvent.id)}
      />
    </div>
  );
}

// ==========================================
// STAT BLOCK — digital readout tile
// ==========================================
function StatBlock({ label, value, flipKey, color = '#EDE7DA' }) {
  return (
    <div className="bg-[#0A0908] px-4 py-4">
      <div className="font-flap text-3xl tabular-nums" style={{ color }}>
        <Flap text={String(value).padStart(2, '0')} flipKey={flipKey} />
      </div>
      <div className="text-[10px] font-flap text-[#8A8478] uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

// ==========================================
// EVENT ROW — desktop grid row / mobile stacked card
// ==========================================
function EventRow({ ev, idx, flipKey, onOpen }) {
  const status = statusOf(ev);
  const delay = Math.min(idx * 50, 400);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left border-b border-[#1B1815] hover:bg-[#14120F] transition-colors focus-visible:bg-[#14120F] focus-visible:outline-none group"
    >
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[2fr_130px_100px_90px_1.4fr_24px] gap-4 px-4 py-3.5 items-center">
        <span className="font-flap font-bold text-[#EDE7DA] text-sm truncate">
          <Flap text={(ev.company_name || 'UNKNOWN').toUpperCase()} flipKey={flipKey} delay={delay} />
        </span>
        <span className="font-flap text-[10px] font-bold uppercase tracking-widest" style={{ color: status.color }}>
          {status.label}
        </span>
        <span className="font-flap text-xs text-[#8A8478]">{ev.date || 'TBD'}</span>
        <span className="font-flap text-xs text-[#8A8478]">{ev.time || 'TBD'}</span>
        <span className="text-xs text-[#8A8478] truncate font-body">{ev.venue || 'TBD'}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#4A443A] group-hover:text-[#FFB627] transition-colors" />
      </div>

      {/* Mobile card */}
      <div className="md:hidden px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-flap font-bold text-[#EDE7DA] text-sm truncate">
            <Flap text={(ev.company_name || 'UNKNOWN').toUpperCase()} flipKey={flipKey} delay={delay} />
          </div>
          <div className="text-[11px] text-[#8A8478] font-body mt-0.5">{ev.date || 'TBD'} · {ev.venue || 'TBD'}</div>
        </div>
        <span className="font-flap text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: status.color }}>
          {status.label}
        </span>
      </div>
    </button>
  );
}

// ==========================================
// BOARDING PASS DRAWER — the detail view
// ==========================================
function BoardingPassDrawer({ ev, onClose, onArchive, isArchived }) {
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
  try { points = JSON.parse(ev.email_summary_points || '[]'); } catch (e) { /* noop */ }

  const status = statusOf(ev);

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-body">
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      ></div>

      <div className={`relative w-full max-w-sm h-full bg-[#14120F] border-l border-[#2B2620] flex flex-col transition-transform duration-300 ease-out ${show ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Stub header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <span className="font-flap text-[10px] text-[#8A8478] uppercase tracking-[0.25em]">Boarding pass</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#8A8478] hover:text-[#EDE7DA] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FFB627]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 relative">
          <div className="relative">
            {ev.action_required && (
              <div key={ev.id} className="stamp absolute -top-1 right-0 border-2 border-[#FF5C5C] text-[#FF5C5C] font-flap text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm rotate-[-9deg]">
                Delayed
              </div>
            )}
            <h2 className="font-flap text-3xl text-[#EDE7DA] tracking-wide mb-1 pr-20 break-words">{ev.company_name || 'Unknown'}</h2>
            <p className="text-xs font-flap uppercase tracking-widest mb-6" style={{ color: status.color }}>{status.label} · {ev.event_type || 'Other'}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <PassField label="Date" value={ev.date || 'TBD'} />
            <PassField label="Time" value={ev.time || 'TBD'} />
            <PassField label="Venue" value={ev.venue || 'TBD'} />
          </div>

          {/* Perforation */}
          <div className="h-4 -mx-6 ticket-perf mb-6"></div>

          <h4 className="font-flap text-[10px] font-bold text-[#8A8478] uppercase tracking-[0.2em] mb-3">Flight notes</h4>
          {points.length > 0 ? (
            <ul className="space-y-3 mb-6">
              {points.map((p, i) => (
                <li key={i} className="text-[13px] text-[#D9D3C6] flex items-start gap-3 leading-relaxed">
                  <span className="text-[#FFB627] mt-0.5 flex-shrink-0 font-flap text-[10px]">{String(i + 1).padStart(2, '0')}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[#8A8478] italic border border-dashed border-[#2B2620] rounded-sm p-4 mb-6">No notes parsed from this email.</p>
          )}

          <div className="flex items-center gap-3 border border-[#2B2620] rounded-sm px-4 py-3 mb-6">
            <span className="font-flap text-[9px] font-bold text-[#8A8478] uppercase tracking-wider">Status</span>
            <span className="w-[1px] h-3 bg-[#2B2620]"></span>
            <span className="text-[12px] text-[#D9D3C6]">{ev.shortlist_status_reason || 'Awaiting update'}</span>
          </div>
        </div>

        <div className="p-6 pt-4">
          <div className="barcode h-6 mb-4 opacity-60"></div>
          <button
            onClick={onArchive}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-sm text-sm font-flap font-bold uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-[#FFB627] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14120F] ${
              isArchived
                ? 'border border-[#2B2620] text-[#EDE7DA] hover:border-[#4A443A]'
                : 'bg-[#FFB627] text-[#0A0908] hover:bg-[#FFC658]'
            }`}
          >
            {isArchived ? <><ArchiveRestore className="w-4 h-4" /> Restore to board</> : <><Archive className="w-4 h-4" /> File to archive</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PassField({ label, value }) {
  return (
    <div>
      <p className="font-flap text-[9px] font-bold text-[#8A8478] uppercase tracking-widest mb-1">{label}</p>
      <p className="font-flap text-sm text-[#EDE7DA] truncate">{value}</p>
    </div>
  );
}