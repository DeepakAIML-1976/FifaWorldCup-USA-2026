import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ShareButtons from "@/components/ShareButtons";

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [scope, setScope] = useState("global");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/leaderboard", { params: { scope } }).then((r) => {
      setRows(r.data);
      setLoading(false);
    });
  }, [scope]);

  const myIdx = user ? rows.findIndex((r) => r.id === user.id) : -1;
  const myRank = myIdx >= 0 ? myIdx + 1 : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Standings</div>
        <h1 className="font-heading text-5xl mt-2">GLOBAL LEADERBOARD</h1>

        {user && myRank && (
          <div className="mt-6 border border-[#007AFF]/40 bg-[#007AFF]/10 px-5 py-4 flex flex-wrap items-center justify-between gap-3" data-testid="my-rank-banner">
            <div className="text-sm">
              You are ranked <span className="font-heading text-2xl text-[#007AFF]">#{myRank}</span> globally with{" "}
              <span className="font-mono text-[#34C759] font-bold">{rows[myIdx]?.total_points || 0} pts</span>
            </div>
            <ShareButtons
              testIdPrefix="share-leaderboard"
              text={`I'm ranked #${myRank} on the WC 2026 Predictor leaderboard with ${rows[myIdx]?.total_points || 0} points 🏆⚽`}
            />
          </div>
        )}

        <div className="flex gap-2 mt-6 mb-6">
          {["global", "country", "weekly"].map((s) => (
            <button key={s} onClick={() => setScope(s)} data-testid={`lb-scope-${s}`}
              className={`px-4 py-2 text-xs uppercase tracking-[0.2em] border transition-colors ${
                scope === s ? "border-[#007AFF] text-white bg-[#007AFF]/10" : "border-white/20 text-white/60 hover:border-white/50"
              }`}>
              {s}
            </button>
          ))}
        </div>

        <div className="border border-white/10 bg-[#141414]" data-testid="leaderboard-table">
          <div className="grid grid-cols-[60px_1fr_120px_120px_100px] gap-4 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-white/40 border-b border-white/10">
            <div>Rank</div>
            <div>Player</div>
            <div className="hidden sm:block">Country</div>
            <div className="text-right">Predictions</div>
            <div className="text-right">Points</div>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-white/50">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-8 text-white/50">No data yet. Be the first to predict!</div>
          ) : (
            rows.map((r, i) => (
              <div key={r.id} data-testid={`lb-row-${i+1}`}
                className="grid grid-cols-[60px_1fr_120px_120px_100px] gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-[#1C1C1C] transition-colors">
                <div className={`font-heading text-2xl ${i===0?"text-[#FF9500]":i===1?"text-[#A3A3A3]":i===2?"text-[#CD7F32]":"text-white/40"}`}>
                  #{i + 1}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 bg-[#007AFF]/20 border border-[#007AFF]/40 flex items-center justify-center text-xs font-bold uppercase">
                    {r.name?.[0] || "?"}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-white/40">{r.accuracy}% accuracy</div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-white/70">
                  {r.country_code && (
                    <img
                      src={`https://flagcdn.com/w40/${r.country_code.toLowerCase()}.png`}
                      alt=""
                      className="h-4 w-6 object-cover border border-white/10"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <span className="truncate">{r.country}</span>
                </div>
                <div className="text-right text-sm text-white/60">{r.predictions_made || 0}</div>
                <div className="text-right font-mono text-[#34C759] font-bold">{r.total_points || 0}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
