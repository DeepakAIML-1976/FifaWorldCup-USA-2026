import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Trophy } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/fixtures");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0A0A0A] text-white">
      <div className="hidden md:block w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1599158150601-1417ebbaafdd?auto=format&fit=crop&w=1600)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <Trophy className="h-10 w-10 text-[#007AFF] mb-6" />
          <h1 className="font-heading text-5xl leading-none">WELCOME BACK,<br />CHAMPION.</h1>
          <p className="text-white/60 mt-4">Predict the World Cup. Beat your friends.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-6" data-testid="login-form">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Account</div>
            <h2 className="mt-2 font-heading text-4xl">LOG IN</h2>
          </div>

          {error && (
            <div data-testid="login-error" className="border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm text-[#FF3B30]">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Email</label>
            <input
              type="email"
              data-testid="login-email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/20 px-4 py-3 text-white focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Password</label>
            <input
              type="password"
              data-testid="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/20 px-4 py-3 text-white focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-[#007AFF] hover:bg-[#3395FF] disabled:opacity-50 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors"
          >
            {loading ? "Signing in…" : "Log In"}
          </button>

          <div className="flex items-center justify-between text-sm text-white/50">
            <span>
              New here?{" "}
              <Link to="/register" className="text-[#007AFF] hover:text-[#3395FF]" data-testid="login-register-link">
                Create an account
              </Link>
            </span>
            <Link to="/forgot-password" className="text-white/60 hover:text-white" data-testid="login-forgot-link">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
