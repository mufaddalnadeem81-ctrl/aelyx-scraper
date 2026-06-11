/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Users,
  MessageSquare,
  Activity,
  ShieldAlert,
  Settings,
  Bell,
  User,
  Zap,
  MapPin,
  Star,
  ExternalLink,
  Loader2,
  Terminal,
  Database,
  ChevronRight,
  LogOut,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  // ===========================================================================
  // CONFIG
  // ===========================================================================
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const API_URL = `${API_BASE_URL}/api/scrape`;
  const GENERATE_KEY_URL = `${API_BASE_URL}/generate-key`;
  const USAGE_URL = `${API_BASE_URL}/api/usage`;

  // ===========================================================================
  // STATES
  // ===========================================================================
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [limit, setLimit] = useState(20);
  const [apiKey, setApiKey] = useState('');
  const [usage, setUsage] = useState(0);
  const [requestLimit, setRequestLimit] = useState(1000);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const [logs, setLogs] = useState([
    {
      id: 1,
      time: new Date().toLocaleTimeString(),
      text: "Aelyx OS v4.2.0 initialized. Secure API tunnel established."
    }
  ]);

  const logEndRef = useRef(null);

  // ===========================================================================
  // AUTO SCROLL LOGS
  // ===========================================================================
  useEffect(() => {
    logEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [logs]);

  useEffect(() => {
    const token = localStorage.getItem("aelyx_session_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const savedKey = localStorage.getItem("aelyx_api_key");
    if (savedKey) {
      setApiKey(savedKey);
      fetchUsage(savedKey);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("aelyx_session_token");
    navigate("/login");
  };

  // ===========================================================================
  // ADD LOG
  // ===========================================================================
  const addLog = (text) => {
    setLogs(prev => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        text
      },
      ...prev
    ]);
  };

  // ===========================================================================
  // FETCH USAGE
  // ===========================================================================
  const fetchUsage = async (key) => {
    try {
      const response = await fetch(USAGE_URL, {
        headers: {
          "x-api-key": key
        }
      });
      const data = await response.json();
      if (data.success) {
        setUsage(data.requests_used);
        addLog(`API usage updated: ${data.requests_used} requests.`);
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    }
  };

  // ===========================================================================
  // GENERATE API KEY
  // ===========================================================================
  const generateApiKey = async () => {
    try {
      setGeneratingKey(true);
      addLog("Contacting key generation server...");

      const response = await fetch(GENERATE_KEY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (data.success) {
        setApiKey(data.apiKey);
        localStorage.setItem("aelyx_api_key", data.apiKey);
        addLog("New API Key generated successfully.");
        fetchUsage(data.apiKey);
      } else {
        addLog(`API Key generation failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      addLog("API Key generation failed.");
    } finally {
      setGeneratingKey(false);
    }
  };

  // ===========================================================================
  // SCRAPER FUNCTION
  // ===========================================================================
  const handleScrape = async () => {
    if (!apiKey) {
      addLog("Generate an API key first.");
      return;
    }

    if (!query) {
      addLog("Please enter a search query.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setResults([]);

    addLog(`Initiating secure scan for "${query}" in city "${city || 'any'}"`);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          query,
          city,
          limit: Number(limit)
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded");
        }
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.data || []);
        addLog(`Harvest successful. ${data.data.length} nodes collected.`);
        fetchUsage(apiKey);
      } else {
        throw new Error(data.error || "Unknown backend failure");
      }
    } catch (err) {
      console.error(err);
      addLog(`CRITICAL_FAILURE: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0B0D14] text-white/80 font-sans overflow-hidden selection:bg-indigo-500/30 relative">
      {/* Background Glow Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-500/5 blur-[120px] animate-blob [animation-delay:4s]" />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden z-10 relative">
        {/* TOP HEADER */}
        <header className="relative z-50 h-24 px-8 flex items-center justify-between border-b border-white/5 bg-[#12141D]/50 animate-reveal">
          {/* BRAND/LOGO */}
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)] animate-pulse-soft">
              <Database className="text-white w-5 h-5 drop-shadow-lg" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wider">
                AELYX <span className="text-indigo-400">OS</span>
              </h1>
            </div>
          </div>

          {/* SYSTEM STATUS & PROFILE INDICATOR */}
          <div className="flex items-center gap-6 z-50">
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-xs text-white/70">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-soft"></div>
              <span className="font-medium font-mono">System Online</span>
            </div>

            {/* Operator Pill */}
            <div className="relative">
              <button 
                onClick={() => setShowProfilePopup(!showProfilePopup)}
                className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:bg-[#1A1D27] hover:border-indigo-500/30 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <User className="text-white w-4.5 h-4.5" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-none">Local Operator</span>
                  <span className="text-[10px] text-white/40 font-mono mt-0.5">Admin Level</span>
                </div>
              </button>

              {showProfilePopup && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1A1D27] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-reveal z-[100]">
                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-pink-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut size={16} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
          {/* SCRAPER CONTROLS (TOP) */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 bg-[#1A1D27] p-8 rounded-[2rem] border border-white/5 flex flex-col opacity-0 animate-reveal fill-forwards [animation-delay:100ms] group hover:border-indigo-500/30 transition-all duration-300 hover:scale-[1.005]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Scraper Controls</h2>
                  <p className="text-sm text-white/40">Configure extraction parameters</p>
                </div>
                <Zap className="text-indigo-500" size={20} />
              </div>

              <div className="grid grid-cols-4 gap-6 w-full items-end">
                {/* Search Query */}
                <div className="col-span-1 space-y-2">
                  <label className="text-sm font-bold text-white/60">Search Query</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g., Restaurants..."
                      className="w-full bg-[#12141D] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* City Input */}
                <div className="col-span-1 space-y-2">
                  <label className="text-sm font-bold text-white/60">City / Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dubai"
                      className="w-full bg-[#12141D] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Limit Slider */}
                <div className="col-span-1 space-y-4 pb-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-white/60">Extraction Limit</label>
                    <span className="text-sm font-bold text-indigo-400">{limit} Units</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full h-2 bg-[#0B0D14] rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Action Button */}
                <div className="col-span-1">
                  <button
                    onClick={handleScrape}
                    disabled={loading}
                    className="w-full relative overflow-hidden py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-all duration-300 shadow-[0_10px_30px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      {loading ? (
                        <Loader2 size={18} className="animate-spin text-white" />
                      ) : (
                        <Zap size={18} className="text-white group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-sm font-bold tracking-widest uppercase text-white">
                        {loading ? "PROCESSING..." : "ACTIVATE"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT / RESULTS PREVIEW */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 bg-[#1A1D27] p-8 rounded-[2rem] border border-white/5 flex flex-col h-[500px] relative opacity-0 animate-reveal fill-forwards [animation-delay:200ms] group hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.005]">
              {/* Scan Overlay Effect when scraper runs */}
              {loading && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem] z-20">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-40 blur-[2px] animate-scan absolute left-0" />
                  <div className="w-full h-20 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-20 animate-scan absolute left-0 -translate-y-full" />
                </div>
              )}

              <div className="mb-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-lg font-bold text-white">Scraper Results</h2>
                  <p className="text-sm text-white/40">Real-time data stream</p>
                </div>
                {results.length > 0 && (
                  <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-mono font-bold border border-indigo-500/10 animate-pulse-soft">
                    {results.length} Nodes Found
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar pr-2 z-10">
                {results.length === 0 ? (
                  loading ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/40">
                          <th className="pb-3 font-semibold">Name</th>
                          <th className="pb-3 font-semibold">Rating</th>
                          <th className="pb-3 font-semibold">Phone</th>
                          <th className="pb-3 font-semibold">Website</th>
                          <th className="pb-3 font-semibold">Address</th>
                          <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <tr key={idx} className="border-b border-white/5 opacity-60">
                            <td className="py-4 pr-4">
                              <div className="h-3.5 bg-white/5 rounded-full w-4/5 animate-shimmer relative overflow-hidden"></div>
                            </td>
                            <td className="py-4">
                              <div className="h-6 bg-white/5 rounded-lg w-12 animate-pulse-soft"></div>
                            </td>
                            <td className="py-4">
                              <div className="h-6 bg-white/5 rounded-lg w-24 animate-pulse-soft"></div>
                            </td>
                            <td className="py-4">
                              <div className="h-4 bg-white/5 rounded-full w-20 animate-pulse-soft"></div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="h-3.5 bg-white/5 rounded-full w-11/12 animate-shimmer relative overflow-hidden"></div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="h-8 bg-white/5 rounded-lg w-8 inline-block animate-pulse-soft"></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                      <Database size={40} className="mb-4 animate-pulse-soft" />
                      <p className="text-sm font-medium">Awaiting Signal</p>
                    </div>
                  )
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/40">
                        <th className="pb-3 font-semibold">Name</th>
                        <th className="pb-3 font-semibold">Rating</th>
                        <th className="pb-3 font-semibold">Phone</th>
                        <th className="pb-3 font-semibold">Website</th>
                        <th className="pb-3 font-semibold">Address</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {results.map((res, i) => {
                        const cleanRating = res.rating ? res.rating.replace('⭐', '').trim() : 'N/A';
                        return (
                          <tr
                            key={i}
                            className="text-xs hover:bg-white/[0.02] transition-colors opacity-0 animate-reveal fill-forwards group/row"
                            style={{ animationDelay: `${i * 80}ms` }}
                          >
                            <td className="py-3 font-bold text-white max-w-[150px] truncate group-hover/row:text-indigo-400 transition-colors" title={res.name}>
                              {res.name}
                            </td>
                            <td className="py-3">
                              {res.rating && res.rating !== 'N/A' ? (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-md hover:scale-105 transition-transform duration-200">
                                  <Star size={11} className="fill-amber-400 text-amber-400 animate-pulse-soft" />
                                  <span>{cleanRating}</span>
                                </span>
                              ) : (
                                <span className="text-white/30">N/A</span>
                              )}
                            </td>
                            <td className="py-3 font-mono text-white/70">
                              {res.phone && res.phone !== 'No Contact' ? (
                                <span className="whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-md border border-white/5 text-[11px] hover:border-indigo-500/30 transition-all duration-200">
                                  {res.phone}
                                </span>
                              ) : (
                                <span className="text-white/30">No Contact</span>
                              )}
                            </td>
                            <td className="py-3 max-w-[120px]">
                              {res.website && res.website !== 'Not Available' ? (
                                <a href={res.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline text-[11px] font-medium break-all" title={res.website}>
                                  {res.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                </a>
                              ) : (
                                <span className="text-white/30 text-[11px]">Not Available</span>
                              )}
                            </td>
                            <td className="py-3 text-white/50 group-hover/row:text-white/80 transition-colors" title={res.address}>
                              <div className="max-w-[200px] truncate text-[11px] pr-2">
                                {res.address}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              {res.url && (
                                <button
                                  onClick={() => window.open(res.url, '_blank')}
                                  className="inline-flex items-center justify-center w-7 h-7 text-white/20 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all bg-white/5 border border-white/5 rounded-lg active:scale-95 hover:scale-110"
                                  title="Open in Maps"
                                >
                                  <ExternalLink size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM STAT CARDS */}
          <div className="grid grid-cols-5 gap-6 mt-2">
            <div className="bg-[#1A1D27] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 hover:scale-[1.02] opacity-0 animate-reveal fill-forwards [animation-delay:300ms]">
              <div className="absolute top-6 right-6 w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Users size={20} className="text-indigo-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{results.length}</h3>
              <p className="text-sm text-white/50 font-medium">Total Results</p>
              <p className="text-xs text-indigo-400 mt-2">+0% from last scan</p>
            </div>

            <div className="bg-[#1A1D27] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02] opacity-0 animate-reveal fill-forwards [animation-delay:400ms]">
              <div className="absolute top-6 right-6 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <MessageSquare size={20} className="text-purple-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{limit}</h3>
              <p className="text-sm text-white/50 font-medium">Scraper Limit</p>
              <p className="text-xs text-purple-400 mt-2">Adjusted above</p>
            </div>

            <div className="bg-[#1A1D27] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300 hover:scale-[1.02] opacity-0 animate-reveal fill-forwards [animation-delay:500ms]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-white/50">API Key</h3>
                <Key size={18} className="text-emerald-400" />
              </div>
              <p className="text-xs font-mono text-white truncate">{apiKey || "No key generated"}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={generateApiKey}
                  disabled={generatingKey}
                  className="px-3 py-2 bg-emerald-500 rounded-lg text-xs font-bold text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {generatingKey ? "Generating..." : "Generate"}
                </button>
                {apiKey && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-white/10 rounded-lg text-xs text-white hover:bg-white/20 transition-colors"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#1A1D27] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300 hover:scale-[1.02] opacity-0 animate-reveal fill-forwards [animation-delay:600ms]">
              <div className="absolute top-6 right-6 w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                <Zap size={20} className="text-pink-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{loading ? "Active" : "Idle"}</h3>
              <p className="text-sm text-white/50 font-medium">Engine Status</p>
              <p className="text-xs text-pink-400 mt-2">{loading ? "Processing..." : "Ready for input"}</p>
            </div>

            <div className="bg-[#1A1D27] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 hover:scale-[1.02] opacity-0 animate-reveal fill-forwards [animation-delay:700ms]">
              <div className="absolute top-6 right-6 w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Activity size={20} className="text-indigo-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{logs.length}</h3>
              <p className="text-sm text-white/50 font-medium">System Logs</p>
              <p className="text-xs text-indigo-400 mt-2">All systems nominal</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
