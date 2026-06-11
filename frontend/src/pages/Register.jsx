import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Trophy } from "lucide-react";

const COUNTRIES = [
  ["AR","Argentina"],["AU","Australia"],["AT","Austria"],["BE","Belgium"],["BR","Brazil"],
  ["CA","Canada"],["CO","Colombia"],["HR","Croatia"],["EG","Egypt"],["GB-ENG","England"],
  ["FR","France"],["DE","Germany"],["GH","Ghana"],["IN","India"],["IR","Iran"],["IT","Italy"],
  ["JP","Japan"],["KR","Korea Republic"],["MX","Mexico"],["MA","Morocco"],["NL","Netherlands"],
  ["NG","Nigeria"],["NO","Norway"],["PT","Portugal"],["QA","Qatar"],["SA","Saudi Arabia"],
  ["GB-SCT","Scotland"],["SN","Senegal"],["ZA","South Africa"],["ES","Spain"],["SE","Sweden"],
  ["CH","Switzerland"],["TR","Türkiye"],["US","USA"],["UY","Uruguay"],["AE","UAE"],["XX","Other"],
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", country_code: "US" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const country = COUNTRIES.find((c) => c[0] === form.country_code)?.[1] || "Other";
      await register({ ...form, country });
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
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <Trophy className="h-10 w-10 text-[#007AFF] mb-6" />
          <h1 className="font-heading text-5xl leading-none">JOIN<br />THE TOURNAMENT.</h1>
          <p className="text-white/60 mt-4">It's free. It's fierce. It's football.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-5" data-testid="register-form">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">New Account</div>
            <h2 className="mt-2 font-heading text-4xl">SIGN UP</h2>
          </div>
          {error && (
            <div data-testid="register-error" className="border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm text-[#FF3B30]">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Display name</label>
            <input required value={form.name} onChange={update("name")} data-testid="register-name"
              className="w-full bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Email</label>
            <input type="email" required value={form.email} onChange={update("email")} data-testid="register-email"
              className="w-full bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Password (min 6 chars)</label>
            <input type="password" required minLength={6} value={form.password} onChange={update("password")} data-testid="register-password"
              className="w-full bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/50">Country</label>
            <div className="flex gap-3 items-center">
              <img
                src={`https://flagcdn.com/w80/${form.country_code.toLowerCase()}.png`}
                alt=""
                className="h-8 w-12 object-cover border border-white/10"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <select
                value={form.country_code}
                onChange={update("country_code")}
                data-testid="register-country"
                className="flex-1 bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none"
              >
                {COUNTRIES.map(([c, n]) => (
                  <option key={c} value={c}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} data-testid="register-submit"
            className="w-full bg-[#007AFF] hover:bg-[#3395FF] disabled:opacity-50 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors">
            {loading ? "Creating…" : "Create account"}
          </button>
          <div className="text-sm text-white/50">
            Already have an account?{" "}
            <Link to="/login" className="text-[#007AFF]" data-testid="register-login-link">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
