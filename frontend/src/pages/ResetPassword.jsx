import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Trophy } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = params.get("token");
    if (t) setToken(t);
  }, [params]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setOk(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white p-8">
      <div className="w-full max-w-md">
        <Trophy className="h-10 w-10 text-[#007AFF] mb-6" />
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Recovery</div>
        <h1 className="font-heading text-5xl mt-2">NEW PASSWORD</h1>

        <form onSubmit={onSubmit} className="mt-8 space-y-5" data-testid="reset-form">
          <div>
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Token</label>
            <input required value={token} onChange={(e) => setToken(e.target.value)} data-testid="reset-token"
              className="w-full mt-2 bg-[#0A0A0A] border border-white/20 px-4 py-3 font-mono text-xs focus:border-[#007AFF] focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">New password (min 6 chars)</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="reset-password"
              className="w-full mt-2 bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Confirm password</label>
            <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="reset-confirm"
              className="w-full mt-2 bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none" />
          </div>

          {error && <div className="border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm text-[#FF3B30]" data-testid="reset-error">{error}</div>}
          {ok && <div className="border border-[#34C759]/40 bg-[#34C759]/10 px-4 py-3 text-sm text-[#34C759]" data-testid="reset-success">Password updated! Redirecting…</div>}

          <button type="submit" disabled={loading} data-testid="reset-submit"
            className="w-full bg-[#007AFF] hover:bg-[#3395FF] disabled:opacity-50 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="mt-6 text-sm text-white/50">
          <Link to="/login" className="text-[#007AFF] hover:text-[#3395FF]" data-testid="reset-back-login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
