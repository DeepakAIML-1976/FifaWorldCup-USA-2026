import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ViewSquadLink } from "@/components/ViewSquadLink";

const AWARDS = [
  { key: "golden_boot", label: "Golden Boot", desc: "Top goal scorer of the tournament" },
  { key: "golden_glove", label: "Golden Glove", desc: "Best goalkeeper" },
  { key: "player_of_tournament", label: "Player of the Tournament", desc: "Most outstanding player" },
  { key: "fair_play", label: "Fair Play Award", desc: "Team with best disciplinary record" },
];

export default function Awards() {
  const [form, setForm] = useState({ golden_boot: "", golden_glove: "", player_of_tournament: "", fair_play: "" });
  const [winners, setWinners] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const [me, w] = await Promise.all([api.get("/awards/me"), api.get("/awards/winners")]);
      if (me.data && me.data.user_id) {
        setForm({
          golden_boot: me.data.golden_boot || "",
          golden_glove: me.data.golden_glove || "",
          player_of_tournament: me.data.player_of_tournament || "",
          fair_play: me.data.fair_play || "",
        });
      }
      setWinners(w.data || {});
      setLoading(false);
    })();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr(""); setMsg("");
    try {
      await api.post("/awards/me", form);
      setMsg("Saved your award picks!");
      setTimeout(() => setMsg(""), 2000);
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-[#FF9500] font-bold">Tournament Awards</div>
            <h1 className="font-heading text-5xl mt-2">CALL THE WINNERS</h1>
            <p className="text-white/50 mt-2 max-w-2xl">Type the name of the player or team you think will win each award. Locks before the first match begins. Each correct prediction = +2 points.</p>
          </div>
          <ViewSquadLink testId="awards-view-squad" />
        </div>

        {loading ? (
          <div className="text-white/50 mt-8">Loading…</div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="awards-form">
            {AWARDS.map((a) => (
              <div key={a.key} className="border border-white/10 bg-[#141414] p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-heading text-2xl tracking-wide">{a.label}</h3>
                    <p className="text-sm text-white/50 mt-1">{a.desc}</p>
                  </div>
                  {winners[a.key] && (
                    <div className="text-xs text-[#34C759] uppercase tracking-[0.2em]">
                      Winner: {winners[a.key]}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={form[a.key]}
                  onChange={(e) => setForm((f) => ({ ...f, [a.key]: e.target.value }))}
                  placeholder="Type player/team name…"
                  data-testid={`award-input-${a.key}`}
                  className="w-full mt-4 bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#FF9500] focus:outline-none"
                />
              </div>
            ))}

            {err && <div className="border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm text-[#FF3B30]">{err}</div>}
            {msg && <div className="border border-[#34C759]/40 bg-[#34C759]/10 px-4 py-3 text-sm text-[#34C759]" data-testid="awards-saved">{msg}</div>}

            <button type="submit" disabled={saving} data-testid="awards-submit"
              className="w-full md:w-auto bg-[#FF9500] hover:bg-[#FFAA33] text-[#0A0A0A] disabled:opacity-50 px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] transition-colors">
              {saving ? "Saving…" : "Lock In Picks"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
