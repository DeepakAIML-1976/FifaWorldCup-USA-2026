import { Link } from "react-router-dom";
import { Trophy, ArrowRight, Target, Users, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const HERO_IMG = "https://images.unsplash.com/photo-1599158150601-1417ebbaafdd?auto=format&fit=crop&w=2400&q=85";

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="bg-[#0A0A0A] text-white">
      {/* HERO */}
      <section className="relative min-h-[85vh] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]/20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 pt-32 w-full">
          <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] mb-4 font-bold">
            FIFA World Cup 2026 · USA · Canada · Mexico
          </div>
          <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight">
            PREDICT EVERY KICK.<br />
            <span className="text-[#007AFF]">CONQUER THE WORLD.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-white/70 leading-relaxed">
            Forecast scores, call the Man of the Match, and crown the Golden Boot winner.
            Compete against fans worldwide on a stadium-grade leaderboard. 104 matches. One trophy. Infinite glory.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {user ? (
              <Link
                to="/fixtures"
                data-testid="hero-cta-fixtures"
                className="inline-flex items-center gap-2 bg-[#007AFF] hover:bg-[#3395FF] px-7 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors"
              >
                Start Predicting <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/register"
                data-testid="hero-cta-register"
                className="inline-flex items-center gap-2 bg-[#007AFF] hover:bg-[#3395FF] px-7 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors"
              >
                Join the contest <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              to="/leaderboard"
              data-testid="hero-cta-leaderboard"
              className="inline-flex items-center gap-2 border border-white/30 hover:border-white px-7 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-white/10 bg-[#0A0A0A]">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {[
            { v: "48", l: "Nations" },
            { v: "104", l: "Matches" },
            { v: "16", l: "Stadiums" },
            { v: "4", l: "Awards" },
          ].map((s) => (
            <div key={s.l} className="px-6 py-8 text-center">
              <div className="font-heading text-5xl md:text-6xl text-white">{s.v}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/40">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">How it works</div>
        <h2 className="mt-2 font-heading text-4xl md:text-5xl">THREE STEPS TO GLORY</h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, t: "Predict", d: "Submit scores, winners and the Man of the Match for every game. Predictions lock at kickoff — no excuses." },
            { icon: Award, t: "Award call", d: "Lock in your Golden Boot, Golden Glove, Player of the Tournament and Fair Play picks before kick-off of match #1." },
            { icon: Trophy, t: "Climb ranks", d: "Earn points by accuracy. Climb global, country and weekly leaderboards. Win bragging rights forever." },
          ].map((s) => (
            <div key={s.t} className="border border-white/10 bg-[#141414] p-8 hover:bg-[#1C1C1C] transition-colors">
              <s.icon className="h-8 w-8 text-[#007AFF]" />
              <h3 className="mt-6 font-heading text-2xl tracking-wide">{s.t}</h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SCORING */}
      <section className="border-t border-white/10 bg-[#0A0A0A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-[#FF9500] font-bold">Scoring</div>
              <h2 className="mt-2 font-heading text-4xl md:text-5xl">EVERY POINT COUNTS</h2>
              <p className="mt-6 text-white/60 leading-relaxed">
                A transparent scoring system. Get the winner right, score bonus for the exact result,
                and pick up extras for the Man of the Match and award winners.
              </p>
            </div>
            <div className="border border-white/10 bg-[#141414] divide-y divide-white/10">
              {[
                { l: "Correct match winner", p: "+3" },
                { l: "Exact score bonus", p: "+2" },
                { l: "Correct Man of the Match", p: "+1" },
                { l: "Correct Golden Boot", p: "+2" },
                { l: "Correct Golden Glove", p: "+2" },
                { l: "Correct Player of the Tournament", p: "+2" },
                { l: "Correct Fair Play Award", p: "+2" },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-white/80">{r.l}</span>
                  <span className="font-mono text-[#34C759] font-bold">{r.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-xs uppercase tracking-[0.3em] text-white/30">
        WC Predictor · Built for the beautiful game
      </footer>
    </div>
  );
}
