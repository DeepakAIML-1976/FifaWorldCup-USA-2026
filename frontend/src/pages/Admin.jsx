import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ home_score: 0, away_score: 0, motm: "" });
  const [awards, setAwards] = useState({ golden_boot: "", golden_glove: "", player_of_tournament: "", fair_play: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    const [s, m, w] = await Promise.all([api.get("/admin/stats"), api.get("/matches"), api.get("/awards/winners")]);
    setStats(s.data);
    setMatches(m.data);
    setAwards({
      golden_boot: w.data?.golden_boot || "",
      golden_glove: w.data?.golden_glove || "",
      player_of_tournament: w.data?.player_of_tournament || "",
      fair_play: w.data?.fair_play || "",
    });
  }
  useEffect(() => { load(); }, []);

  async function saveResult(e) {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.post(`/admin/matches/${selected.match_no}/result`, {
        home_score: +form.home_score, away_score: +form.away_score, motm: form.motm,
      });
      setMsg(`Result saved for match #${selected.match_no}.`);
      setSelected(null);
      await load();
      setTimeout(() => setMsg(""), 2500);
    } catch (e2) { setMsg(e2.response?.data?.detail || "Failed"); }
  }

  async function saveAwards(e) {
    e.preventDefault();
    try {
      await api.post("/admin/awards/winners", awards);
      setMsg("Award winners saved & scored.");
      setTimeout(() => setMsg(""), 2500);
    } catch (e2) { setMsg(e2.response?.data?.detail || "Failed"); }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#FF9500] font-bold">Admin Console</div>
        <h1 className="font-heading text-5xl mt-2">CONTROL ROOM</h1>

        {msg && <div className="mt-4 border border-[#34C759]/40 bg-[#34C759]/10 px-4 py-2 text-sm text-[#34C759]" data-testid="admin-msg">{msg}</div>}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
            {[
              { l: "Users", v: stats.users },
              { l: "Predictions", v: stats.predictions },
              { l: "Award picks", v: stats.award_predictions },
              { l: "Matches done", v: `${stats.matches_finished}/${stats.matches_total}` },
              { l: "Total matches", v: stats.matches_total },
            ].map((s) => (
              <div key={s.l} className="border border-white/10 bg-[#141414] p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{s.l}</div>
                <div className="font-heading text-3xl mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mt-10">
          <div>
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">Enter match result</h2>
            <div className="border border-white/10 bg-[#141414] max-h-[420px] overflow-y-auto divide-y divide-white/10">
              {matches.map((m) => (
                <button key={m.match_no} onClick={() => {
                  setSelected(m);
                  setForm({
                    home_score: m.result?.home_score ?? 0,
                    away_score: m.result?.away_score ?? 0,
                    motm: m.result?.motm ?? "",
                  });
                }}
                data-testid={`admin-pick-${m.match_no}`}
                className={`w-full px-5 py-3 text-left text-sm flex items-center justify-between hover:bg-[#1C1C1C] transition-colors ${selected?.match_no===m.match_no?"bg-[#1C1C1C]":""}`}>
                  <span className="text-white/40 text-xs uppercase tracking-[0.15em]">#{m.match_no} {m.stage}</span>
                  <span>{m.home} vs {m.away}</span>
                  <span className="text-xs">{m.result ? `${m.result.home_score}-${m.result.away_score}` : "—"}</span>
                </button>
              ))}
            </div>
            {selected && (
              <form onSubmit={saveResult} className="mt-4 border border-white/10 bg-[#141414] p-5 space-y-3" data-testid="result-form">
                <div className="text-sm text-white/60">Match #{selected.match_no}: {selected.home} vs {selected.away}</div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min={0} value={form.home_score} onChange={(e)=>setForm(f=>({...f,home_score:e.target.value}))}
                    data-testid="result-home" className="bg-[#0A0A0A] border border-white/20 px-3 py-2" />
                  <input type="number" min={0} value={form.away_score} onChange={(e)=>setForm(f=>({...f,away_score:e.target.value}))}
                    data-testid="result-away" className="bg-[#0A0A0A] border border-white/20 px-3 py-2" />
                </div>
                <input value={form.motm} onChange={(e)=>setForm(f=>({...f,motm:e.target.value}))} placeholder="Man of the Match"
                  data-testid="result-motm" className="w-full bg-[#0A0A0A] border border-white/20 px-3 py-2" />
                <button type="submit" data-testid="result-submit" className="bg-[#007AFF] hover:bg-[#3395FF] px-5 py-2 text-xs font-bold uppercase tracking-[0.2em]">Save & score</button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">Tournament awards</h2>
            <form onSubmit={saveAwards} className="border border-white/10 bg-[#141414] p-5 space-y-3" data-testid="award-winners-form">
              {Object.keys(awards).map((k) => (
                <div key={k}>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 capitalize">{k.replace(/_/g," ")}</label>
                  <input value={awards[k]} onChange={(e)=>setAwards(a=>({...a,[k]:e.target.value}))}
                    data-testid={`winner-${k}`}
                    className="w-full mt-1 bg-[#0A0A0A] border border-white/20 px-3 py-2" />
                </div>
              ))}
              <button type="submit" data-testid="award-winners-submit" className="bg-[#FF9500] hover:bg-[#FFAA33] text-[#0A0A0A] px-5 py-2 text-xs font-bold uppercase tracking-[0.2em]">Save winners</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
