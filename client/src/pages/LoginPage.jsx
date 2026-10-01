import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import { useToast } from "../hooks/useToast.jsx";

export default function LoginPage() {
  const { initialized, setup, login } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState(initialized ? "login" : "setup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialized ? "login" : "setup");
  }, [initialized]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "setup") await setup(username, password);
      else await login(username, password);
      toast.success(mode === "setup" ? "Welcome! Your account is ready." : "Signed in successfully.");
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 text-white">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-accent-400/30 blur-3xl" />
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.5) 1px, transparent 0)", backgroundSize: "24px 24px"}} />
        <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center text-3xl font-black">₹</div>
            <div>
              <div className="text-xl font-extrabold tracking-tight">IPO Ledger</div>
              <div className="text-sm text-white/70">Private money tracker</div>
            </div>
          </div>

          <div>
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Beautifully simple.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-pink-200">
                Totally private.
              </span>
            </h2>
            <p className="mt-5 text-white/80 text-lg max-w-md leading-relaxed">
              Track IPO collections with friends and family. Colorful totals, instant search, CSV exports — all secured with password login.
            </p>
            <ul className="mt-8 grid gap-3 max-w-md">
              {[
                ["Split", "Friend & Family columns with per-person totals"],
                ["Search", "Find any name or IPO in milliseconds"],
                ["Secure", "Hashed passwords, auto-logout, SQL safe"],
                ["Export", "Download any IPO as CSV anytime"],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-3 p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">{t[0]}</div>
                  <div>
                    <div className="font-bold">{t}</div>
                    <div className="text-sm text-white/75">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm text-white/60">
            Built with Express · React · TiDB · Vercel
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-2xl font-black text-white shadow-glow">₹</div>
            <div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">IPO Ledger</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Modern money tracker</div>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {mode === "setup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              {mode === "setup"
                ? "First run — this account protects all your data. Password at least 10 characters."
                : "Sign in to manage your IPO ledger."}
            </p>
          </div>

          <div className="card p-5 sm:p-7">
            {!initialized && (
              <div className="mb-5 flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
                <button
                  onClick={() => setMode("setup")}
                  className={[
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition",
                    mode === "setup" ? "bg-white dark:bg-slate-900 shadow text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400",
                  ].join(" ")}
                >
                  Setup
                </button>
                <button
                  onClick={() => setMode("login")}
                  className={[
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition",
                    mode === "login" ? "bg-white dark:bg-slate-900 shadow text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400",
                  ].join(" ")}
                >
                  Login
                </button>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label" htmlFor="username">Username</label>
                <input
                  id="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="jane_doe"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={mode === "setup" ? 10 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••••••"
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                />
                {mode === "setup" && (
                  <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Minimum 10 characters — long and strong keeps your data private.
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading
                  ? (mode === "setup" ? "Creating account…" : "Signing in…")
                  : (mode === "setup" ? "Create account" : "Sign in")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
