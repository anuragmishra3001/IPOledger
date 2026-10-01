import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import IPOPage from "./pages/IPOPage.jsx";
import NavBar from "./components/NavBar.jsx";

function Protected({ children }) {
  const { status, user } = useAuth();
  if (status === "loading") return <AppLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { status, user, initialized } = useAuth();
  if (status === "loading") return <AppLoading />;
  if (!initialized) return children;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-3xl font-black shadow-glow">
          ₹
        </div>
        <div className="text-slate-500 dark:text-slate-400 font-medium">Loading IPO Ledger…</div>
      </div>
    </div>
  );
}

function Shell() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Routes>
          <Route index element={<Protected><Dashboard /></Protected>} />
          <Route path="/ipo/:id" element={<Protected><IPOPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route path="/*" element={<Shell />} />
    </Routes>
  );
}
