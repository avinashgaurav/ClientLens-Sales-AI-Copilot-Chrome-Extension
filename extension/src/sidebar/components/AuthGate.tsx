import React, { useState } from "react";
import { Zap, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAppStore } from "../stores/app-store";
import { signInWithGoogle } from "../../shared/auth/google-sso";
import { ALLOWED_EMAIL_DOMAIN } from "../../shared/auth/team-config";

const IS_PREVIEW = import.meta.env.VITE_MOCK_MODE === "true";

export function AuthGate() {
  const { setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle(true);
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  function handlePreview() {
    setUser({
      id: "preview-user",
      email: "preview@example.com",
      name: "Preview User",
      role: "admin",
    });
  }

  return (
    <div className="flex flex-col h-screen bg-[#0d0d1a] text-slate-200 items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-100">ClientLens</h1>
          <p className="text-xs text-slate-500 mt-1">
            Internal tool — restricted to @{ALLOWED_EMAIL_DOMAIN} accounts
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-300 text-slate-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <GoogleMark />}
          {loading ? "Signing in…" : "Sign in with Google"}
        </button>

        <div className="flex items-start gap-2 text-[11px] text-slate-500">
          <ShieldCheck size={12} className="text-emerald-400 mt-0.5 shrink-0" />
          <p>
            Uses your @{ALLOWED_EMAIL_DOMAIN} Google Workspace account. The extension never sees your password —
            sign-in goes through Google's standard OAuth flow.
          </p>
        </div>

        {IS_PREVIEW && (
          <button
            onClick={handlePreview}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            Preview mode (skip sign-in)
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.61z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.71A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.18 6.65 3.58 9 3.58z" />
    </svg>
  );
}
