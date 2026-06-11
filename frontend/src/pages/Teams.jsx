import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/teams").then((r) => { setTeams(r.data); setLoading(false); });
  }, []);

  const byGroup = useMemo(() => {
    const filtered = teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
    const groups = {};
    filtered.forEach((t) => {
      const g = t.group || "?";
      (groups[g] = groups[g] || []).push(t);
    });
    return groups;
  }, [teams, q]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Nations</div>
        <h1 className="font-heading text-5xl mt-2">48 TEAMS</h1>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search teams…"
          data-testid="teams-search"
          className="mt-8 w-full md:w-80 bg-[#0A0A0A] border border-white/20 px-4 py-3 focus:border-[#007AFF] focus:outline-none"
        />

        {loading ? <div className="text-white/50 mt-8">Loading…</div> : (
          <div className="mt-8 space-y-10">
            {Object.keys(byGroup).sort().map((g) => (
              <div key={g}>
                <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">Group {g}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {byGroup[g].map((t) => (
                    <Link key={t.name} to={`/teams/${encodeURIComponent(t.name)}`}
                      data-testid={`team-card-${t.name}`}
                      className="border border-white/10 bg-[#141414] hover:bg-[#1C1C1C] p-4 transition-colors">
                      <img src={t.flag} alt={t.name} className="h-12 w-full object-cover border border-white/10" onError={(e) => e.currentTarget.style.display = "none"} />
                      <div className="mt-3 text-sm font-medium truncate">{t.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1">FIFA #{t.fifa_rank || "—"}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
