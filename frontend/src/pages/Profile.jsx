import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [preds, setPreds] = useState([]);
  const [matches, setMatches] = useState({});
  const [awards, setAwards] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, m, a] = await Promise.all([
        api.get("/predictions/me"),
        api.get("/matches"),
        api.get("/awards/me"),
      ]);
      setPreds(p.data);
      const mm = {}; m.data.forEach((x) => (mm[x.match_no] = x));
      setMatches(mm);
      setAwards(a.data);
      setLoading(false);
    })();
  }, []);

  if (!user) return null;
  const totalPreds = preds.length;
  const scored = preds.filter((p) => p.scored).length;
  const correct = preds.filter((p) => p.scored && p.points > 0).length;
  const accuracy = scored ? Math.round((correct / scored) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="h-20 w-20 bg-[#007AFF]/20 border border-[#007AFF]/40 flex items-center justify-center font-heading text-4xl">
            {user.name?.[0] || "?"}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Player profile</div>
            <h1 className="font-heading text-5xl mt-2">{user.name}</h1>
            <div className="text-sm text-white/50">{user.country} · {user.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10">
          {[
            { l: "Total points", v: user.total_points || 0, c: "#34C759" },
            { l: "Predictions", v: totalPreds, c: "#007AFF" },
            { l: "Scored", v: scored, c: "#FF9500" },
            { l: "Accuracy", v: `${accuracy}%`, c: "#FFFFFF" },
          ].map((s) => (
            <div key={s.l} className="border border-white/10 bg-[#141414] p-5">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{s.l}</div>
              <div className="font-heading text-4xl mt-2" style={{ color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">My award picks</h2>
          <div className="border border-white/10 bg-[#141414] divide-y divide-white/10">
            {["golden_boot","golden_glove","player_of_tournament","fair_play"].map((k) => (
              <div key={k} className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-white/70 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="text-sm">{awards?.[k] || <span className="text-white/30">Not picked</span>}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">My match predictions ({totalPreds})</h2>
          {loading ? <div className="text-white/50">Loading…</div> : (
            <div className="border border-white/10 bg-[#141414] divide-y divide-white/10">
              {preds.length === 0 && <div className="px-6 py-6 text-white/50">No predictions yet.</div>}
              {preds.map((p) => {
                const m = matches[p.match_no];
                return (
                  <div key={p.match_no} className="px-6 py-3 flex items-center justify-between text-sm">
                    <span className="text-white/40 text-xs uppercase tracking-[0.2em]">M#{p.match_no}</span>
                    <span>{m ? `${m.home} vs ${m.away}` : ""}</span>
                    <span className="font-mono">{p.home_score}–{p.away_score}</span>
                    <span className={`font-mono text-xs ${p.points>0?"text-[#34C759]":"text-white/40"}`}>
                      {p.scored ? `${p.points} pts` : "pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
