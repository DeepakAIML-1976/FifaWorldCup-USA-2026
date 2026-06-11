import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { ViewSquadLink } from "@/components/ViewSquadLink";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import ShareButtons from "@/components/ShareButtons";

const STAGES = ["All", "Group Stage", "Round of 32", "Round of 16", "Quarter Final", "Semi Final", "Third Place", "Final"];

function formatDateTime(s) {
  if (!s) return "TBA";
  try {
    const d = new Date(s);
    const ist = d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
    const et = d.toLocaleString("en-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
    return { ist, et };
  } catch { return { ist: s, et: "" }; }
}

function formatLockTime(s) {
  if (!s) return "";
  try {
    const lockMs = new Date(s).getTime() - 60 * 60 * 1000;
    const lock = new Date(lockMs);
    return lock.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

function TeamFlagCDN({ name }) {
  // simple slug->iso lookup not present; we fetch team meta from API once
  return <span className="text-white/80 font-medium">{name}</span>;
}

export default function Fixtures() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [myPreds, setMyPreds] = useState({});
  const [stage, setStage] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, t] = await Promise.all([api.get("/matches"), api.get("/teams")]);
      setMatches(m.data);
      const map = {};
      t.data.forEach((x) => (map[x.name] = x));
      setTeams(map);
      if (user) {
        try {
          const p = await api.get("/predictions/me");
          const pm = {};
          p.data.forEach((x) => (pm[x.match_no] = x));
          setMyPreds(pm);
        } catch {}
      }
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (stage === "All") return matches;
    return matches.filter((m) => m.stage === stage);
  }, [matches, stage]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Fixtures</div>
            <h1 className="font-heading text-5xl mt-2">MATCH SCHEDULE</h1>
            <p className="text-white/50 mt-2">104 matches · 48 teams · 16 venues</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-8" data-testid="stage-filter">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              data-testid={`stage-${s.replace(/\s+/g, "-").toLowerCase()}`}
              className={`px-4 py-2 text-xs uppercase tracking-[0.15em] border transition-colors ${
                stage === s ? "border-[#007AFF] bg-[#007AFF]/10 text-white" : "border-white/20 text-white/60 hover:border-white/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-white/50">Loading…</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="fixtures-grid">
            {filtered.map((m) => <MatchCard key={m.match_no} m={m} teams={teams} pred={myPreds[m.match_no]} authed={!!user} onSaved={(p) => setMyPreds((s) => ({...s, [m.match_no]: p}))} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ m, teams, pred, authed, onSaved }) {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState(pred?.home_score ?? "");
  const [away, setAway] = useState(pred?.away_score ?? "");
  const [motm, setMotm] = useState(pred?.motm ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const kickoff = m.time ? new Date(m.time) : null;
  const lockAt = kickoff ? new Date(kickoff.getTime() - 60 * 60 * 1000) : null;
  const locked = lockAt && lockAt.getTime() <= Date.now();
  const hT = teams[m.home];
  const aT = teams[m.away];

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      await api.post(`/predictions/${m.match_no}`, {
        home_score: parseInt(home, 10),
        away_score: parseInt(away, 10),
        motm: motm.trim(),
      });
      setMsg("Saved!");
      onSaved && onSaved({ home_score: +home, away_score: +away, motm });
      setTimeout(() => setMsg(""), 1500);
    } catch (err) {
      setMsg(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div data-testid={`match-card-${m.match_no}`} className="border border-white/10 bg-[#141414] hover:bg-[#1C1C1C] transition-colors">
      <div className="px-5 py-3 flex items-center justify-between border-b border-white/10 text-[10px] uppercase tracking-[0.25em] text-white/40">
        <span>Match #{m.match_no} · {m.stage}{m.group ? ` · Group ${m.group}` : ""}</span>
        <span className="text-right">
          {(() => {
            const t = formatDateTime(m.time);
            if (typeof t === "string") return t;
            return (
              <span className="flex flex-col items-end leading-tight">
                <span className="text-white/70">{t.ist} IST</span>
                <span className="text-[9px] text-white/30">{t.et} ET</span>
              </span>
            );
          })()}
        </span>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <Link to={hT ? `/teams/${encodeURIComponent(m.home)}` : "#"} className="flex items-center gap-3 flex-1 min-w-0 hover:text-[#007AFF]">
            {hT?.flag && <img src={hT.flag} alt="" className="h-6 w-9 object-cover border border-white/10" />}
            <span className="truncate font-medium">{m.home}</span>
          </Link>
          {m.result ? (
            <div className="font-heading text-3xl text-[#34C759]">{m.result.home_score}–{m.result.away_score}</div>
          ) : (
            <div className="font-heading text-2xl text-white/30">vs</div>
          )}
          <Link to={aT ? `/teams/${encodeURIComponent(m.away)}` : "#"} className="flex items-center gap-3 flex-1 justify-end min-w-0 hover:text-[#007AFF]">
            <span className="truncate font-medium text-right">{m.away}</span>
            {aT?.flag && <img src={aT.flag} alt="" className="h-6 w-9 object-cover border border-white/10" />}
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-white/40">
          <Link to={`/stadiums/${encodeURIComponent(m.stadium)}`} className="hover:text-white">{m.stadium}, {m.city}</Link>
          <ViewSquadLink testId={`view-squad-${m.match_no}`} />
        </div>

        {pred && (
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`pred-saved-${m.match_no}`}>
            <div className="text-xs text-[#007AFF]">
              Your pick: {pred.home_score}–{pred.away_score}{pred.motm ? ` · MOTM: ${pred.motm}` : ""}
            </div>
            <ShareButtons
              testIdPrefix={`share-match-${m.match_no}`}
              text={`My WC 2026 prediction: ${m.home} ${pred.home_score}–${pred.away_score} ${m.away}${pred.motm ? ` · MOTM: ${pred.motm}` : ""}. Beat my call! ⚽`}
            />
          </div>
        )}

        {authed && !locked && (
          <button
            onClick={() => setOpen((v) => !v)}
            data-testid={`predict-toggle-${m.match_no}`}
            className="mt-4 w-full border border-white/20 hover:border-[#007AFF] hover:text-[#007AFF] py-2 text-xs uppercase tracking-[0.2em] transition-colors"
          >
            {pred ? "Edit Prediction" : "Predict"}
          </button>
        )}
        {locked && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/40" data-testid={`locked-${m.match_no}`}>
            <Lock className="h-3 w-3" /> Locked (kickoff &lt; 1h)
          </div>
        )}
        {!locked && lockAt && (
          <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/30" data-testid={`lock-info-${m.match_no}`}>
            Locks {formatLockTime(m.time)} IST
          </div>
        )}

        {open && authed && !locked && (
          <form onSubmit={submit} className="mt-4 border-t border-white/10 pt-4 space-y-3" data-testid={`predict-form-${m.match_no}`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 truncate block">{m.home}</label>
                <input type="number" min={0} max={20} required value={home} onChange={(e)=>setHome(e.target.value)}
                  data-testid={`score-home-${m.match_no}`}
                  className="w-full mt-1 bg-[#0A0A0A] border border-white/20 px-3 py-2 focus:border-[#007AFF] focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 truncate block">{m.away}</label>
                <input type="number" min={0} max={20} required value={away} onChange={(e)=>setAway(e.target.value)}
                  data-testid={`score-away-${m.match_no}`}
                  className="w-full mt-1 bg-[#0A0A0A] border border-white/20 px-3 py-2 focus:border-[#007AFF] focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">Man of the Match (optional)</label>
              <input value={motm} onChange={(e)=>setMotm(e.target.value)} placeholder="e.g. Lionel Messi"
                data-testid={`motm-${m.match_no}`}
                className="w-full mt-1 bg-[#0A0A0A] border border-white/20 px-3 py-2 focus:border-[#007AFF] focus:outline-none" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button type="submit" disabled={saving} data-testid={`save-pred-${m.match_no}`}
                className="bg-[#007AFF] hover:bg-[#3395FF] disabled:opacity-50 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em]">
                {saving ? "Saving…" : "Save"}
              </button>
              {msg && <span className="text-xs text-[#34C759]">{msg}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
