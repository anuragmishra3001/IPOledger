import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../hooks/useToast.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import StatCard from "../components/StatCard.jsx";

function CategoryIcon({ cat }) {
  if (cat === "friend") {
    return (
      <span className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        Friends
      </span>
    );
  }
  return (
    <span className="chip bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>
      Family
    </span>
  );
}

function EntryRow({ entry, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false);
  return (
    <li className="group animate-fade-in py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{entry.amount_inr}</div>
        {entry.note && (
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 italic truncate">{entry.note}</div>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setMenu((m) => !m)}
          className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition flex items-center justify-center"
          aria-label="Entry options"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-20 card py-1 min-w-[140px] animate-fade-in overflow-hidden">
              <button
                onClick={() => { setMenu(false); onEdit(entry); }}
                className="w-full text-left px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Edit
              </button>
              <button
                onClick={() => { setMenu(false); onDelete(entry); }}
                className="w-full text-left px-3.5 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function PersonCard({ person, cat, onEditEntry, onDeleteEntry, highlight }) {
  const Gradient = cat === "friend"
    ? "from-emerald-500 to-teal-500"
    : "from-amber-500 to-orange-500";
  const Ring = cat === "friend"
    ? "ring-emerald-500/20"
    : "ring-amber-500/20";
  return (
    <div className={`rounded-2xl border p-4 bg-white/60 dark:bg-slate-900/50 ${highlight ? "ring-4 " + Ring : ""} transition`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${Gradient} text-white font-bold flex items-center justify-center shadow-md`}>
            {person.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{person.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{person.entries.length} {person.entries.length === 1 ? "entry" : "entries"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-black text-lg tabular-nums ${cat === "friend" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {person.total_inr}
          </div>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {person.entries.map((e) => (
          <EntryRow
            key={e.id}
            entry={e}
            onEdit={onEditEntry}
            onDelete={onDeleteEntry}
          />
        ))}
      </ul>
    </div>
  );
}

export default function IPOPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [ipo, setIpo] = useState(null);
  const [cols, setCols] = useState({ friend: { people: [], total: 0, total_inr: "₹0" }, family: { people: [], total: 0, total_inr: "₹0" } });
  const [grand, setGrand] = useState(0);
  const [grandInr, setGrandInr] = useState("₹0");

  const [person, setPerson] = useState("");
  const [amounts, setAmounts] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("friend");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState(q);

  const [confirmEntry, setConfirmEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [confirmIPO, setConfirmIPO] = useState(false);
  const [deletingIPO, setDeletingIPO] = useState(false);

  const [editOpen, setEditOpen] = useState(null);
  const [editValues, setEditValues] = useState({ person: "", category: "friend", amount: "", note: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/ipos/${id}` + (q ? `?q=${encodeURIComponent(q)}` : ""));
      setIpo(data.ipo);
      setCols(data.cols);
      setGrand(data.grand);
      setGrandInr(data.grand_inr);
    } catch (err) {
      toast.error(err.message || "Failed to load IPO.");
      if (err.status === 404) nav("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, q, nav, toast]);

  useEffect(() => { load(); }, [load]);

  const runSearch = (e) => {
    e?.preventDefault();
    setParams(search ? { q: search } : {});
  };

  const addEntry = async (e) => {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    try {
      const r = await api.post(`/api/ipos/${id}/entries`, { person, amounts, note, category });
      toast.success(`Added ${r.added} amount${r.added === 1 ? "" : "s"} for "${person.trim()}".`);
      setAmounts(""); setNote(""); setPerson("");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to add entry.");
    } finally {
      setAdding(false);
    }
  };

  const deleteEntry = async () => {
    if (!confirmEntry) return;
    setDeletingEntry(true);
    try {
      await api.delete(`/api/entries/${confirmEntry.id}`);
      toast.success("Entry deleted.");
      setConfirmEntry(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete entry.");
    } finally {
      setDeletingEntry(false);
    }
  };

  const deleteIPO = async () => {
    setDeletingIPO(true);
    try {
      await api.delete(`/api/ipos/${id}`);
      toast.success(`Deleted IPO.`);
      nav("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Failed to delete IPO.");
    } finally {
      setDeletingIPO(false);
    }
  };

  const openEdit = (entry) => {
    setEditOpen(entry);
    setEditValues({
      person: entry._person || (cols.friend.people.concat(cols.family.people).flatMap((p) => p.entries).find((e) => e.id === entry.id) ? (
        [...cols.friend.people, ...cols.family.people].find((p) => p.entries.some((e) => e.id === entry.id))?.name || ""
      ) : ""),
      category: entry._category || "friend",
      amount: (entry.amount / 100).toFixed(2).replace(/\.?0+$/, ""),
      note: entry.note || "",
    });
    const personEntry = [...cols.friend.people, ...cols.family.people].find((p) => p.entries.some((e) => e.id === entry.id));
    const rawEntry = personEntry?.entries.find((e) => e.id === entry.id);
    if (rawEntry && personEntry) {
      const cat = cols.friend.people.includes(personEntry) ? "friend" : "family";
      setEditValues({ person: personEntry.name, category: cat, amount: (rawEntry.amount / 100).toFixed(2).replace(/\.?0+$/, ""), note: rawEntry.note || "" });
    }
  };

  const saveEdit = async () => {
    if (!editOpen || saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/entries/${editOpen.id}`, {
        person: editValues.person,
        category: editValues.category,
        amount: editValues.amount,
        note: editValues.note,
      });
      toast.success("Entry updated.");
      setEditOpen(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to update entry.");
    } finally {
      setSaving(false);
    }
  };

  const peopleCount = useMemo(
    () => cols.friend.people.length + cols.family.people.length,
    [cols]
  );
  const entriesCount = useMemo(
    () => cols.friend.people.reduce((s, p) => s + p.entries.length, 0) + cols.family.people.reduce((s, p) => s + p.entries.length, 0),
    [cols]
  );

  if (loading && !ipo) {
    return (
      <div className="py-20 text-center text-slate-500 dark:text-slate-400 font-medium animate-fade-in">
        Loading IPO…
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to="/" className="btn-ghost self-start -ml-2 px-2.5 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          All IPOs
        </Link>
        <div className="flex items-center gap-2 sm:justify-end">
          <button
            onClick={() => api.download(`/api/ipos/${id}/export`)}
            className="btn-outline text-sm px-3 py-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button onClick={() => setConfirmIPO(true)} className="btn-danger text-sm px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Delete IPO
          </button>
        </div>
      </div>

      <section className="card p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-brand-500/20 to-accent-500/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-500 to-accent-500 text-white font-black text-2xl flex items-center justify-center shadow-glow shrink-0">
                {ipo?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">{ipo?.name}</h1>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Created {ipo?.created_at ? new Date(ipo.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""} · {entriesCount} {entriesCount === 1 ? "entry" : "entries"} · {peopleCount} {peopleCount === 1 ? "person" : "people"}
                </div>
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Total with this IPO</div>
            <div className="text-3xl sm:text-4xl font-black tabular-nums gradient-text">{grandInr}</div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Friends Total" value={cols.friend.total_inr} sub={`${cols.friend.people.length} people`} gradient="from-emerald-500 to-teal-500" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} />
          <StatCard label="Family Total" value={cols.family.total_inr} sub={`${cols.family.people.length} people`} gradient="from-amber-500 to-orange-500" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>} />
          <StatCard label="People" value={peopleCount} sub={cols.friend.people.length + "F · " + cols.family.people.length + "Fa"} gradient="from-brand-500 to-cyan-500" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
          <StatCard label="Entries" value={entriesCount} sub="All amounts logged" gradient="from-fuchsia-500 to-purple-600" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center shadow-md shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">Add entries</h2>
        </div>
        <form onSubmit={addEntry} className="grid md:grid-cols-12 gap-3 md:gap-4">
          <div className="md:col-span-3">
            <label className="label">Name</label>
            <input
              className="input"
              required
              maxLength={80}
              placeholder="e.g. Aarav Sharma"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="label">Amounts</label>
            <input
              className="input"
              required
              placeholder="14852, 853, 1000"
              title="Separate multiples with commas or spaces. Use decimals for paise."
              value={amounts}
              onChange={(e) => setAmounts(e.target.value)}
            />
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Comma or space separated — each becomes its own entry.</div>
          </div>
          <div className="md:col-span-3">
            <label className="label">Note (optional)</label>
            <input
              className="input"
              maxLength={200}
              placeholder="Cheque, UPI, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex flex-col gap-3">
            <div>
              <div className="label">Category</div>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {["friend", "family"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={[
                      "py-2 px-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1.5",
                      category === c
                        ? c === "friend"
                          ? "bg-white dark:bg-slate-900 shadow text-emerald-700 dark:text-emerald-400"
                          : "bg-white dark:bg-slate-900 shadow text-amber-700 dark:text-amber-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                    ].join(" ")}
                  >
                    {c === "friend" ? "Friends" : "Family"}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={adding} className="btn-primary py-2.5 w-full mt-auto">
              {adding ? "Adding…" : "Add entries"}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-5 sm:p-6">
        <form className="sm:max-w-md flex gap-2" onSubmit={runSearch}>
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              className="input pl-11"
              placeholder="Search a person in this IPO"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-outline px-4">Search</button>
          {q && (
            <button type="button" onClick={() => { setSearch(""); setParams({}); }} className="btn-outline px-4">Clear</button>
          )}
        </form>
      </section>

      <section className="grid lg:grid-cols-2 gap-5 sm:gap-6">
        {(["friend", "family"]).map((cat) => {
          const col = cols[cat];
          const label = cat === "friend" ? "Friends" : "Family";
          const Gradient = cat === "friend"
            ? "from-emerald-500 via-emerald-500 to-teal-500"
            : "from-amber-500 via-orange-500 to-orange-600";
          const headerAccent = cat === "friend"
            ? "from-emerald-500/15 to-teal-500/10 border-emerald-500/20"
            : "from-amber-500/15 to-orange-500/10 border-amber-500/20";
          return (
            <div key={cat} className="card overflow-hidden">
              <div className={`flex items-center justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 bg-gradient-to-br ${headerAccent} border-b`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${Gradient} text-white flex items-center justify-center shadow-md`}>
                    {cat === "friend" ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-800 dark:text-slate-100 text-lg tracking-tight">{label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {col.people.length} {col.people.length === 1 ? "person" : "people"}
                    </div>
                  </div>
                </div>
                <div className={`text-2xl sm:text-3xl font-black tabular-nums ${cat === "friend" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                  {col.total_inr}
                </div>
              </div>
              <div className="p-4 sm:p-5 space-y-3 max-h-[65vh] overflow-auto scrollbar-thin">
                {col.people.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    {q ? "No match." : "Nobody added yet."}
                  </div>
                ) : (
                  col.people.map((p, i) => (
                    <div key={p.name + i} style={{ animation: `slideUp .35s ${i * 0.04}s backwards` }}>
                      <PersonCard
                        person={p}
                        cat={cat}
                        onEditEntry={openEdit}
                        onDeleteEntry={(e) => setConfirmEntry({ ...e, _person: p.name, _category: cat })}
                        highlight={!!q && p.name.toLowerCase().includes(q.toLowerCase())}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>

      <ConfirmModal
        open={!!confirmEntry}
        onCancel={() => !deletingEntry && setConfirmEntry(null)}
        onConfirm={deleteEntry}
        title="Delete entry?"
        description={`Remove ${confirmEntry?.amount_inr} for ${confirmEntry?._person || "this person"}. This cannot be undone.`}
        confirmText={deletingEntry ? "Deleting…" : "Delete entry"}
      />

      <ConfirmModal
        open={confirmIPO}
        onCancel={() => !deletingIPO && setConfirmIPO(false)}
        onConfirm={deleteIPO}
        title={`Delete "${ipo?.name || ""}"?`}
        description="Every amount inside this IPO will be removed and this cannot be undone."
        confirmText={deletingIPO ? "Deleting…" : "Delete IPO"}
      />

      <ConfirmModal
        open={!!editOpen}
        onCancel={() => !saving && setEditOpen(null)}
        onConfirm={saveEdit}
        danger={false}
        title="Edit entry"
        confirmText={saving ? "Saving…" : "Save changes"}
      >
        <div className="space-y-3 mt-2">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              maxLength={80}
              value={editValues.person}
              onChange={(e) => setEditValues((v) => ({ ...v, person: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {["friend", "family"].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setEditValues((v) => ({ ...v, category: c }))}
                    className={[
                      "py-2 rounded-lg text-sm font-bold transition",
                      editValues.category === c
                        ? c === "friend"
                          ? "bg-white dark:bg-slate-900 shadow text-emerald-700 dark:text-emerald-400"
                          : "bg-white dark:bg-slate-900 shadow text-amber-700 dark:text-amber-400"
                        : "text-slate-500 dark:text-slate-400",
                    ].join(" ")}
                  >
                    {c === "friend" ? "Friends" : "Family"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Amount (INR)</label>
              <input
                className="input"
                value={editValues.amount}
                onChange={(e) => setEditValues((v) => ({ ...v, amount: e.target.value }))}
                placeholder="14852.50"
              />
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <input
              className="input"
              maxLength={200}
              value={editValues.note}
              onChange={(e) => setEditValues((v) => ({ ...v, note: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
