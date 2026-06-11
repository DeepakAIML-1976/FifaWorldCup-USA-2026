import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Trophy, Calendar, Users, MapPin, Award, ChartBar, LogOut, ShieldCheck } from "lucide-react";

const navItems = [
  { to: "/fixtures", label: "Fixtures", icon: Calendar },
  { to: "/awards", label: "Awards", icon: Award },
  { to: "/leaderboard", label: "Leaderboard", icon: ChartBar },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/stadiums", label: "Stadiums", icon: MapPin },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <Trophy className="h-6 w-6 text-[#007AFF]" />
          <span className="font-heading text-xl tracking-wide text-white">WC PREDICTOR</span>
          <span className="hidden md:inline text-[10px] uppercase tracking-[0.3em] text-white/40 ml-2">2026</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={`nav-${it.label.toLowerCase()}`}
              className={({ isActive }) =>
                `px-3 py-2 text-sm tracking-wide transition-colors ${
                  isActive ? "text-white" : "text-white/60 hover:text-white"
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user && user.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              data-testid="nav-admin"
              className="hidden md:inline-flex items-center gap-1 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#FF9500] hover:text-white transition-colors"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </button>
          )}
          {user ? (
            <>
              <Link
                to="/profile"
                data-testid="nav-profile"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white"
              >
                <span className="font-mono text-[#34C759]">{user.total_points || 0} pts</span>
                <span className="text-white/40">·</span>
                <span>{user.name}</span>
              </Link>
              <button
                onClick={() => { logout(); navigate("/"); }}
                data-testid="nav-logout"
                className="p-2 text-white/60 hover:text-white transition-colors"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-login"
                className="px-4 py-2 text-sm text-white/70 hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/register"
                data-testid="nav-register"
                className="px-4 py-2 text-sm bg-[#007AFF] text-white hover:bg-[#3395FF] transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      {/* mobile nav */}
      <nav className="md:hidden flex overflow-x-auto border-t border-white/10">
        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `px-4 py-2 text-xs uppercase tracking-wider whitespace-nowrap ${
                isActive ? "text-white border-b border-[#007AFF]" : "text-white/50"
              }`
            }
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
