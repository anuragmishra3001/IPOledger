import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    const t = { id, duration: 3200, type: "info", ...(typeof toast === "string" ? { message: toast } : toast) };
    setToasts((xs) => [...xs, t]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), t.duration);
  }, []);

  return (
    <ToastCtx.Provider value={{ push, success: (m) => push({ message: m, type: "success" }), error: (m) => push({ message: m, type: "error" }), info: (m) => push({ message: m, type: "info" }) }}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-80 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto animate-slide-up rounded-2xl px-4 py-3 shadow-lg border backdrop-blur-strong text-sm font-medium",
              t.type === "success" ? "bg-emerald-500/90 border-emerald-400/40 text-white"
                : t.type === "error" ? "bg-red-500/90 border-red-400/40 text-white"
                : "bg-brand-500/90 border-brand-400/40 text-white",
            ].join(" ")}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast must be inside ToastProvider");
  return c;
}
