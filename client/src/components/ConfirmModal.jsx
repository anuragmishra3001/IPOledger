import { useEffect } from "react";

export default function ConfirmModal({ open, title, description, confirmText = "Delete", cancelText = "Cancel", danger = true, onConfirm, onCancel, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full sm:max-w-md card animate-slide-up rounded-b-none sm:rounded-b-2xl p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {danger && (
              <span className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              </span>
            )}
            {title}
          </h3>
          {description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>}
        </div>
        {children}
        <div className="mt-6 flex sm:flex-row flex-col-reverse gap-2 sm:justify-end">
          <button onClick={onCancel} className="btn-outline flex-1 sm:flex-none">{cancelText}</button>
          <button
            onClick={onConfirm}
            className={danger ? "btn-danger flex-1 sm:flex-none" : "btn-primary flex-1 sm:flex-none"}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
