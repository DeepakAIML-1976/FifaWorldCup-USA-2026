import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

export default function Stadiums() {
  const [stadiums, setStadiums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/stadiums").then((r) => { setStadiums(r.data); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#007AFF] font-bold">Venues</div>
        <h1 className="font-heading text-5xl mt-2">16 STADIUMS</h1>

        {loading ? <div className="text-white/50 mt-8">Loading…</div> : (
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stadiums.map((s) => (
              <Link key={s.name} to={`/stadiums/${encodeURIComponent(s.name)}`} data-testid={`stadium-${s.name}`}
                className="border border-white/10 bg-[#141414] hover:bg-[#1C1C1C] transition-colors overflow-hidden group">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={s.image} alt={s.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => e.currentTarget.style.display = "none"} />
                </div>
                <div className="p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{s.city}, {s.country}</div>
                  <h3 className="font-heading text-2xl mt-1 tracking-wide">{s.name}</h3>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                    <span>Capacity {s.capacity}</span>
                    <span>{s.opened || ""}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
