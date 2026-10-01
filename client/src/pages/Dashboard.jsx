import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../hooks/useToast.jsx";
import StatCard from "../components/StatCard.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const [ipos, setIpos] = useState([]);
  const [grand, setGrand] = useState(0);
  const [grandInr, setGrandInr] = useState("₹0");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/ipos" + (q ? `?q=${encodeURIComponent(q)}` : ""));
      setIpos(data.ipos);
      setGrand(data.grand);
      setGrandInr(data.grand_inr);
    } catch (err) {
      toast.error(err.message || "Failed to load IPOs.");
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => { load(); }, [load]);

  const runSearch = (e) => {
    e?.preventDefault();
    setParams(search ? { q: search } : {});
  };

  const create = async (e) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const r = await api.post("/api/ipos", { name: newName.trim() });
      toast.success(`Created "${r.name}".`);
      setNewName("");
      window.location.assign(`/ipo/${r.id}`);
    } catch (err) {
      toast.error(err.message || "Failed to create IPO.");
    } finally {
      setCreating(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/ipos/${confirmDelete.id}`);
      toast.success(`Deleted "${confirmDelete.name}".`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete IPO.");
    } finally {
      setDeleting(false);
    }
  };

  const totalFriends = ipos.reduce((s, r) => s + r.friend_total, 0);
  const totalFamily = ipos.reduce((s, r) => s + r.family_total, 0);
  const peopleCount = new Set(ipos.flatMap((i) => i.people || [])).size || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="All IPOs Total"
          value={grandInr}
          sub={`${ipos.length} ${ipos.length === 1 ? "IPO" : "IPOs"} tracked`}
          gradient="from-brand-500 to-accent-500"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <StatCard
          label="Friends"
          value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalFriends / 100)}
          sub="Green column total"
          gradient="from-emerald-500 to-teal-500"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Family"
          value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalFamily / 100)}
          sub="Amber column total"
          gradient="from-amber-500 to-orange-500"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>}
        />
        <StatCard
          label="IPOs"
          value={ipos.length}
          sub={q ? `matching "${q}"` : "Total created"}
          gradient="from-fuchsia-500 to-purple-600"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 3v18"/></svg>}
        />
      </section>

      <section className="card p-4 sm:p-5">
        <form className="grid sm:grid-cols-12 gap-3" onSubmit={(e) => { e.preventDefault(); runSearch(e); }}>
          <div className="sm:col-span-7">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
              <input
                className="input pl-11"
                placeholder="Search IPO or person name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-outline w-full">
              Search
            </button>
          </div>
          {q && (
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={() => { setSearch(""); setParams({}); }}
                className="btn-outline w-full"
              >
                Clear
              </button>
            </div>
          )}
        </form>

        <form className="mt-4 grid sm:grid-cols-12 gap-3" onSubmit={create}>
          <div className="sm:col-span-9">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </span>
              <input
                className="input pl-11"
                placeholder="New IPO name (e.g. LIC, Tata Technologies…)"
                maxLength={100}
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary w-full" disabled={creating}>
              {creating ? "Creating…" : "Create IPO"}
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[620px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50/60 to-slate-100/60 dark:from-slate-800/50 dark:to-slate-800/70">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">IPO</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-right text-emerald-700 dark:text-emerald-400">Friends</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-right text-amber-700 dark:text-amber-400">Family</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-right text-slate-800 dark:text-slate-200">Total</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-right text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="px-5 py-16 text-center text-slate-400 dark:text-slate-500">Loading…</td></tr>
              ) : ipos.length === 0 ? (
                <tr><td colSpan="5" className="px-5 py-16 text-center">
                  <div className="text-slate-500 dark:text-slate-400">
                    {q
                      ? <>Nothing matches <span className="font-semibold text-slate-700 dark:text-slate-200">"{q}"</span>. Try part of an IPO or person name.</>
                      : "No IPOs yet — create your first one above."}
                  </div>
                </td></tr>
              ) : (
                ipos.map((ipo, idx) => (
                  <tr
                    key={ipo.id}
                    className="group border-t border-slate-100 dark:border-slate-800/80 hover:bg-brand-500/[.03] transition"
                    style={{ animation: `slideUp .3s ${idx * 0.03}s backwards` }}
                  >
                    <td className="px-5 py-4">
                      <Link to={`/ipo/${ipo.id}`} className="font-bold text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition inline-flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-brand-700 dark:text-brand-300 font-black flex items-center justify-center text-sm shrink-0">
                          {ipo.name[0]?.toUpperCase()}
                        </span>
                        <span className="truncate max-w-[280px]">{ipo.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{ipo.friend_total_inr}</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-amber-600 dark:text-amber-400">{ipo.family_total_inr}</td>
                    <td className="px-5 py-4 text-right font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{ipo.total_inr}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link to={`/ipo/${ipo.id}`} className="btn-ghost text-sm px-3 py-1.5">Open</Link>
                        <button
                          onClick={() => setConfirmDelete(ipo)}
                          className="btn-ghost text-sm px-3 py-1.5 text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          aria-label={`Delete ${ipo.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && ipos.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                  <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">{ipos.length} {ipos.length === 1 ? "IPO" : "IPOs"} shown</td>
                  <td className="px-5 py-4 text-right font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalFriends / 100)}
                  </td>
                  <td className="px-5 py-4 text-right font-extrabold tabular-nums text-amber-700 dark:text-amber-400">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalFamily / 100)}
                  </td>
                  <td className="px-5 py-4 text-right font-black tabular-nums text-lg bg-gradient-to-br from-brand-600 to-accent-500 bg-clip-text text-transparent">
                    {grandInr}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <ConfirmModal
        open={!!confirmDelete}
        onCancel={() => !deleting && setConfirmDelete(null)}
        onConfirm={doDelete}
        title={`Delete "${confirmDelete?.name || ""}"?`}
        description="Every amount inside this IPO will be removed and this cannot be undone."
        confirmText={deleting ? "Deleting…" : "Delete IPO"}
      />
    </div>
  );
}
