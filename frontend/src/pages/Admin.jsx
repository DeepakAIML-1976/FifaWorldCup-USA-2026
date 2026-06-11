import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Check, Zap } from "lucide-react";

const STAGES = ["All", "Group Stage", "Round of 32", "Round of 16", "Quarter Final", "Semi Final", "Third Place", "Final"];

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [stage, setStage] = useState("All");
  const [editing, setEditing] = useState({}); // match_no -> {home, away, motm, saving, savedAt}
  const [awards, setAwards] = useState({ golden_boot: "", golden_glove: "", player_of_tournament: "", fair_play: "" });
  const [awardsMsg, setAwardsMsg] = useState("");

  async function loadAll() {
    const [s, m, w] = await Promise.all([api.get("/admin/stats"), api.get("/matches"), api.get("/awards/winners")]);
    setStats(s.data);
    setMatches(m.data);
    // hydrate editing buffer with existing results
    const buf = {};
    m.data.forEach((mm) => {
      buf[mm.match_no] = {
        home: mm.result?.home_score ?? "",
        away: mm.result?.away_score ?? "",
        motm: mm.result?.motm ?? "",
      };
    });
    setEditing(buf);
    setAwards({
      golden_boot: w.data?.golden_boot || "",
      golden_glove: w.data?.golden_glove || "",
      player_of_tournament: w.data?.player_of_tournament || "",
      fair_play: w.data?.fair_play || "",
    });
  }
  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => stage === "All" ? matches : matches.filter((m) => m.stage === stage), [matches, stage]);

  function update(mn, field, value) {
    setEditing((s) => ({ ...s, [mn]: { ...s[mn], [field]: value } }));
  }

  async function saveResult(mn) {
    const row = editing[mn] || {};
    if (row.home === "" || row.away === "") return;
    setEditing((s) => ({ ...s, [mn]: { ...s[mn], saving: true } }));
    try {
      const r = await api.post(`/admin/matches/${mn}/result`, {
        home_score: +row.home, away_score: +row.away, motm: (row.motm || "").trim(),
      });
      setEditing((s) => ({ ...s, [mn]: { ...s[mn], saving: false, savedAt: Date.now(), scored: r.data?.scored_predictions ?? 0 } }));
      // refresh stats + match list
      const [s2, m2] = await Promise.all([api.get("/admin/stats"), api.get("/matches")]);
      setStats(s2.data);
      setMatches(m2.data);
      // clear savedAt after 2s
      setTimeout(() => setEditing((s) => ({ ...s, [mn]: { ...s[mn], savedAt: null } })), 2000);
    } catch (e) {
      setEditing((s) => ({ ...s, [mn]: { ...s[mn], saving: false, error: e.response?.data?.detail || "Failed" } }));
      setTimeout(() => setEditing((s) => ({ ...s, [mn]: { ...s[mn], error: null } })), 2200);
    }
  }

  async function saveAwards(e) {
    e.preventDefault();
    setAwardsMsg("");
    try {
      const r = await api.post("/admin/awards/winners", awards);
      setAwardsMsg(`Saved & scored ${r.data?.scored ?? 0} award picks.`);
      setTimeout(() => setAwardsMsg(""), 2500);
    } catch (e2) { setAwardsMsg(e2.response?.data?.detail || "Failed"); }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#FF9500] font-bold">Admin Console</div>
        <h1 className="font-heading text-5xl mt-2">CONTROL ROOM</h1>
        <p className="text-white/50 mt-3 max-w-2xl text-sm">
          Enter the final score and Man of the Match → click <span className="text-[#FF9500]">SCORE NOW</span>.
          All user predictions are scored instantly and the leaderboard updates in real time.
        </p>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8" data-testid="admin-stats">
            {[
              { l: "Users", v: stats.users },
              { l: "Predictions", v: stats.predictions },
              { l: "Award picks", v: stats.award_predictions },
              { l: "Matches done", v: `${stats.matches_finished}/${stats.matches_total}` },
              { l: "Progress", v: `${Math.round((stats.matches_finished/stats.matches_total)*100)}%` },
            ].map((s) => (
              <div key={s.l} className="border border-white/10 bg-[#141414] p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{s.l}</div>
                <div className="font-heading text-3xl mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap mt-10 mb-6">
          {STAGES.map((s) => (
            <button key={s} onClick={() => setStage(s)} data-testid={`admin-stage-${s.replace(/\s+/g,"-").toLowerCase()}`}
              className={`px-4 py-2 text-xs uppercase tracking-[0.15em] border transition-colors ${
                stage === s ? "border-[#FF9500] bg-[#FF9500]/10 text-white" : "border-white/20 text-white/60 hover:border-white/50"
              }`}>
              {s}
            </button>
          ))}
        </div>

        <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">One-click results · {filtered.length} matches</h2>

        <div className="border border-white/10 bg-[#141414] divide-y divide-white/10" data-testid="admin-results-table">
          {filtered.map((m) => {
            const buf = editing[m.match_no] || {};
            const finished = m.status === "finished";
            return (
              <div key={m.match_no} className={`grid grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-[#1C1C1C] transition-colors ${finished ? "bg-[#34C759]/5" : ""}`}>
                <div className="col-span-2 md:col-span-1 text-xs">
                  <div className="font-mono text-white/40">#{m.match_no}</div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mt-0.5">{m.stage.split(" ")[0]}</div>
                </div>
                <div className="col-span-10 md:col-span-4 text-sm truncate">
                  <span className="font-medium">{m.home}</span>
                  <span className="text-white/30 mx-1.5">vs</span>
                  <span className="font-medium">{m.away}</span>
                </div>
                <input
                  type="number" min={0} max={20} placeholder="—"
                  value={buf.home ?? ""}
                  onChange={(e) => update(m.match_no, "home", e.target.value)}
                  data-testid={`admin-home-${m.match_no}`}
                  className="col-span-2 md:col-span-1 bg-[#0A0A0A] border border-white/20 px-2 py-2 text-center font-mono focus:border-[#FF9500] focus:outline-none"
                />
                <input
                  type="number" min={0} max={20} placeholder="—"
                  value={buf.away ?? ""}
                  onChange={(e) => update(m.match_no, "away", e.target.value)}
                  data-testid={`admin-away-${m.match_no}`}
                  className="col-span-2 md:col-span-1 bg-[#0A0A0A] border border-white/20 px-2 py-2 text-center font-mono focus:border-[#FF9500] focus:outline-none"
                />
                <input
                  type="text" placeholder="MOTM"
                  value={buf.motm ?? ""}
                  onChange={(e) => update(m.match_no, "motm", e.target.value)}
                  data-testid={`admin-motm-${m.match_no}`}
                  className="col-span-6 md:col-span-3 bg-[#0A0A0A] border border-white/20 px-3 py-2 text-sm focus:border-[#FF9500] focus:outline-none"
                />
                <button
                  onClick={() => saveResult(m.match_no)}
                  disabled={buf.saving || buf.home === "" || buf.away === ""}
                  data-testid={`admin-score-${m.match_no}`}
                  className={`col-span-6 md:col-span-2 inline-flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
                    buf.savedAt
                      ? "bg-[#34C759] text-[#0A0A0A]"
                      : finished
                      ? "bg-white/10 hover:bg-[#FF9500] hover:text-[#0A0A0A] text-white/70"
                      : "bg-[#FF9500] hover:bg-[#FFAA33] text-[#0A0A0A] disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  {buf.saving ? "Scoring…" : buf.savedAt ? (<><Check className="h-3 w-3" /> Scored {buf.scored ?? 0}</>) : finished ? "Re-score" : (<><Zap className="h-3 w-3" /> Score Now</>)}
                </button>
                {buf.error && <div className="col-span-12 text-xs text-[#FF3B30]">{buf.error}</div>}
              </div>
            );
          })}
        </div>

        <div className="mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">Tournament awards · one click to score all picks</h2>
          {awardsMsg && (
            <div className="mb-4 border border-[#34C759]/40 bg-[#34C759]/10 px-4 py-2 text-sm text-[#34C759]" data-testid="awards-saved-msg">{awardsMsg}</div>
          )}
          <form onSubmit={saveAwards} className="border border-white/10 bg-[#141414] p-5 space-y-3" data-testid="award-winners-form">
            <div className="grid md:grid-cols-2 gap-3">
              {Object.keys(awards).map((k) => (
                <div key={k}>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 capitalize">{k.replace(/_/g, " ")}</label>
                  <input
                    value={awards[k]}
                    onChange={(e) => setAwards((a) => ({ ...a, [k]: e.target.value }))}
                    data-testid={`winner-${k}`}
                    className="w-full mt-1 bg-[#0A0A0A] border border-white/20 px-3 py-2 focus:border-[#FF9500] focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <button type="submit" data-testid="award-winners-submit"
              className="inline-flex items-center gap-2 bg-[#FF9500] hover:bg-[#FFAA33] text-[#0A0A0A] px-5 py-2 text-xs font-bold uppercase tracking-[0.2em]">
              <Zap className="h-3.5 w-3.5" /> Save & score award picks
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
