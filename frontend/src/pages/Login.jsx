import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Key, Lock, User, AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      const response = await fetch(`${apiBaseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("aelyx_session_token", data.token);
        navigate("/");
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Cannot reach auth server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#0B0D14] text-white/80 font-sans overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-500/5 blur-[120px] animate-blob [animation-delay:4s]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 animate-reveal">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)] animate-pulse-soft">
            <Database className="text-white w-6 h-6 drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest mt-4">
            AELYX <span className="text-indigo-400">OS</span>
          </h1>
          <p className="text-xs text-white/40 tracking-wider uppercase mt-1">
            Data Scraping Engine Portal
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-500">
          <h2 className="text-xl font-bold text-white text-left mb-2">Access Control</h2>
          <p className="text-xs text-white/50 text-left mb-6">Enter operator credentials to establish interface link.</p>

          {error && (
            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl mb-6 animate-pulse-soft">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator..."
                  className="w-full bg-[#12141D] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#12141D] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-all duration-300 shadow-[0_10px_30px_rgba(99,102,241,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-[1.01] active:scale-[0.99] font-bold text-white tracking-widest uppercase text-xs mt-4"
            >
              <div className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <Key size={16} className="text-white group-hover:rotate-12 transition-transform" />
                )}
                <span>{loading ? "ESTABLISHING LINK..." : "SECURE LOGIN"}</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
