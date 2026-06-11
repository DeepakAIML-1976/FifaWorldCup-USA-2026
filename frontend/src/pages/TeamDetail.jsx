import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";

export default function TeamDetail() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/teams/${encodeURIComponent(name)}`).then((r) => { setData(r.data); setLoading(false); });
  }, [name]);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] text-white/50 p-12">Loading…</div>;
  if (!data) return <div className="min-h-screen bg-[#0A0A0A] text-white/50 p-12">Team not found</div>;

  const { team, fixtures } = data;
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex items-center gap-6 flex-wrap">
          <img src={team.flag} alt="" className="h-24 w-36 object-cover border border-white/10" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Group {team.group} · FIFA #{team.fifa_rank || "—"}</div>
            <h1 className="font-heading text-6xl mt-2">{team.name}</h1>
            <div className="text-sm text-white/60 mt-2">Coach: {team.coach}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">Fixtures</h2>
        <div className="border border-white/10 bg-[#141414] divide-y divide-white/10">
          {fixtures.map((m) => (
            <Link key={m.match_no} to="/fixtures" className="block px-6 py-4 hover:bg-[#1C1C1C] transition-colors">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white/40 text-xs uppercase tracking-[0.2em]">M#{m.match_no} · {m.stage}</span>
                <span className="text-white">{m.home} vs {m.away}</span>
                <span className="text-white/50 text-xs">{m.stadium}, {m.city}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
