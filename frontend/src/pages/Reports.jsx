import { useState, useEffect } from 'react';
import SqlBar from '../components/SqlBar';
import { executeSql } from '../utils/api';
import { Terminal, BarChart2, ShieldCheck, Activity } from 'lucide-react';

export default function Reports({ onOpenSqlConsole }) {
  const [fleetReport, setFleetReport] = useState([]);
  const [campReport, setCampReport] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      executeSql("SELECT status, COUNT(*) AS count, ROUND(AVG(batterylevel), 1) AS avg_battery, ROUND(AVG(payloadcapacity), 1) AS avg_payload FROM drone GROUP BY status;"),
      executeSql("SELECT c.campname, c.capacity, COUNT(v.victimid) AS occupied_beds, ROUND((COUNT(v.victimid)::decimal / c.capacity) * 100, 1) AS occupancy_pct FROM relief_camp c LEFT JOIN victim v ON c.campid = v.campid GROUP BY c.campid, c.campname, c.capacity;"),
    ])
      .then(([fRes, cRes]) => {
        if (active) {
          if (fRes.rows) setFleetReport(fRes.rows);
          if (cRes.rows) setCampReport(cRes.rows);
        }
      })
      .catch((e) => console.warn('Reports analytical query note:', e))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">OPERATIONAL AUDIT & REPORTS</h2>
          <p className="text-xs text-white/70">
            Database aggregation metrics, cross-table analytical views, and SQL ad-hoc queries.
          </p>
        </div>
        <button
          onClick={onOpenSqlConsole}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg transition"
        >
          <Terminal className="w-4 h-4" />
          <span>Launch SQL Console</span>
        </button>
      </div>

      <SqlBar sql="SELECT status, COUNT(*) AS count, AVG(batterylevel) FROM DRONE GROUP BY status; SELECT c.campname, (COUNT(v.victimid)::decimal / c.capacity)*100 AS pct FROM RELIEF_CAMP c LEFT JOIN VICTIM v ON c.campid = v.campid GROUP BY c.campid, c.campname, c.capacity;" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Aggregation Report */}
        <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black tracking-wider text-amber-300 uppercase">
              Fleet Status Distribution (GROUP BY status)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Units</th>
                  <th className="p-2.5">Avg. Battery</th>
                  <th className="p-2.5">Avg. Payload</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="p-6 text-center text-white/60">Computing aggregates…</td></tr>
                ) : fleetReport.map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="p-2.5 font-semibold text-white">{r.status}</td>
                    <td className="p-2.5 font-mono font-bold text-amber-300">{r.count}</td>
                    <td className="p-2.5 font-mono">{r.avg_battery}%</td>
                    <td className="p-2.5 font-mono">{r.avg_payload} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Camp Occupancy Report */}
        <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black tracking-wider text-cyan-300 uppercase">
              Camp Occupancy Load (JOIN + Aggregation)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70">
                <tr>
                  <th className="p-2.5">Camp Shelter</th>
                  <th className="p-2.5">Capacity</th>
                  <th className="p-2.5">Occupied</th>
                  <th className="p-2.5">Occupancy %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="p-6 text-center text-white/60">Computing aggregates…</td></tr>
                ) : campReport.map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="p-2.5 font-semibold text-white">{r.campname}</td>
                    <td className="p-2.5 font-mono">{r.capacity}</td>
                    <td className="p-2.5 font-mono font-bold text-cyan-300">{r.occupied_beds}</td>
                    <td className="p-2.5 font-mono">{r.occupancy_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SQL Playground Callout */}
      <div className="rounded-3xl bg-white/5 border border-white/15 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Ad-Hoc Relational DBMS Evaluation</span>
          </div>
          <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
            Execute arbitrary SQL statements (joins, subqueries, group by clauses, views, and update statements) in real time to verify database constraints, triggers, and relational integrity.
          </p>
        </div>
        <button
          onClick={onOpenSqlConsole}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition whitespace-nowrap"
        >
          Open SQL Console
        </button>
      </div>
    </div>
  );
}
