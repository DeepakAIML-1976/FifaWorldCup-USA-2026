import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";

export default function StadiumDetail() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/stadiums/${encodeURIComponent(name)}`).then((r) => { setData(r.data); setLoading(false); });
  }, [name]);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] text-white/50 p-12">Loading…</div>;
  if (!data) return <div className="min-h-screen bg-[#0A0A0A] text-white/50 p-12">Stadium not found</div>;
  const { stadium, fixtures } = data;
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="relative h-[50vh] overflow-hidden">
        <img src={stadium.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
          <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">{stadium.city}, {stadium.country}</div>
          <h1 className="font-heading text-6xl mt-2">{stadium.name}</h1>
          <div className="mt-3 flex gap-6 text-sm text-white/60">
            <span>Capacity: {stadium.capacity}</span>
            <span>Opened: {stadium.opened || "—"}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">Matches hosted ({fixtures.length})</h2>
        <div className="border border-white/10 bg-[#141414] divide-y divide-white/10">
          {fixtures.map((m) => (
            <div key={m.match_no} className="px-6 py-3 flex items-center justify-between text-sm">
              <span className="text-white/40 text-xs uppercase tracking-[0.2em]">M#{m.match_no} · {m.stage}</span>
              <span>{m.home} vs {m.away}</span>
              <span className="text-white/50 text-xs">{m.time ? new Date(m.time).toLocaleDateString() : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
