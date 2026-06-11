import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Trophy, Copy, Check } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(""); setToken("");
    try {
      const r = await api.post("/auth/forgot-password", { email });
      if (r.data?.reset_token) {
        setToken(r.data.reset_token);
      } else {
        setToken("ISSUED"); // generic
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white p-8">
      <div className="w-full max-w-md">
        <Trophy className="h-10 w-10 text-[#007AFF] mb-6" />
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Recovery</div>
        <h1 className="font-heading text-5xl mt-2">RESET PASSWORD</h1>
        <p className="text-white/50 mt-3 text-sm">Enter your email; we'll issue a reset token (no email delivery in this build — token is shown below).</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5" data-testid="forgot-form">
          <div>
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email"
              className="w-full mt-2 bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none" />
          </div>

          {error && <div className="border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm text-[#FF3B30]" data-testid="forgot-error">{error}</div>}

          <button type="submit" disabled={loading} data-testid="forgot-submit"
            className="w-full bg-[#007AFF] hover:bg-[#3395FF] disabled:opacity-50 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors">
            {loading ? "Issuing…" : "Issue Reset Token"}
          </button>
        </form>

        {token && token !== "ISSUED" && (
          <div className="mt-6 border border-[#34C759]/40 bg-[#34C759]/10 p-4 space-y-3" data-testid="forgot-token-block">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#34C759]">Your reset token</div>
            <div className="font-mono text-xs break-all bg-[#0A0A0A] border border-white/10 p-3" data-testid="forgot-token-value">{token}</div>
            <div className="flex gap-2">
              <button onClick={copyToken} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] border border-white/20 hover:border-white px-3 py-2" data-testid="forgot-copy">
                {copied ? <Check className="h-3.5 w-3.5 text-[#34C759]" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <Link to={`/reset-password?token=${encodeURIComponent(token)}`} data-testid="forgot-continue"
                className="inline-flex items-center text-xs uppercase tracking-[0.2em] bg-[#007AFF] hover:bg-[#3395FF] px-3 py-2 text-white">
                Continue
              </Link>
            </div>
          </div>
        )}
        {token === "ISSUED" && (
          <div className="mt-6 border border-white/20 bg-[#141414] p-4 text-sm text-white/70" data-testid="forgot-generic-msg">
            If that email exists, a reset token has been issued.
          </div>
        )}

        <div className="mt-6 text-sm text-white/50">
          <Link to="/login" className="text-[#007AFF] hover:text-[#3395FF]" data-testid="forgot-back-login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
