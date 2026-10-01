import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function NavBar() {
  const { user, logout, initialized } = useAuth();
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const loc = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => { setMenu(false); }, [loc.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-strong">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 via-brand-500 to-accent-500 text-white font-black text-xl flex items-center justify-center shadow-glow group-hover:scale-105 transition">
            ₹
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">IPO Ledger</div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Modern money tracker</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={({isActive}) => [
            "px-3.5 py-2 rounded-xl font-semibold text-sm transition",
            isActive ? "bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
          ].join(" ")}>
            Dashboard
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {dark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-brand-500 text-white font-bold flex items-center justify-center">
              {user?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <button
              onClick={logout}
              className="btn-ghost text-sm px-3 py-1.5"
              disabled={!initialized}
            >
              Logout
            </button>
          </div>

          <button
            onClick={() => setMenu((m) => !m)}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menu
                ? <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>
                : <><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>}
            </svg>
          </button>
        </div>
      </div>

      {menu && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 animate-fade-in">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-brand-500 text-white font-bold flex items-center justify-center">
              {user?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.username}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Signed in</div>
            </div>
            <button onClick={logout} className="ml-auto btn-outline text-sm px-3 py-1.5">Logout</button>
          </div>
          <nav className="px-2 py-2 flex flex-col">
            <NavLink to="/" end className={({isActive}) => [
              "px-3 py-2.5 rounded-xl font-semibold text-sm transition",
              isActive ? "bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
            ].join(" ")}>
              Dashboard
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  );
}
