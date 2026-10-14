import { useState } from 'react';
import { executeSql } from '../utils/api';
import { Play, X, Terminal, Database, CheckCircle, AlertTriangle } from 'lucide-react';

const PRESET_QUERIES = [
  {
    label: 'Fleet Readiness',
    sql: 'SELECT droneid, model, manufacturer, batterylevel, status FROM drone ORDER BY droneid ASC;',
  },
  {
    label: 'Active Sorties',
    sql: 'SELECT m.missionid, m.missiontype, m.priority, d.model AS drone, dis.disastername FROM mission m LEFT JOIN drone d ON m.droneid = d.droneid LEFT JOIN disaster dis ON m.disasterid = dis.disasterid WHERE m.missionstatus = \'In Progress\';',
  },
  {
    label: 'Camp Capacities',
    sql: 'SELECT campname, capacity, currentoccupancy, vacantspace FROM camp_occupancy_view;',
  },
  {
    label: 'Low Supply Stock',
    sql: 'SELECT supplytype, quantityavailable, unit FROM supply WHERE quantityavailable < 200 ORDER BY quantityavailable ASC;',
  },
];

export default function SqlPlaygroundModal({ isOpen, onClose, onQueryExecuted }) {
  const [query, setQuery] = useState(PRESET_QUERIES[0].sql);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRun = async () => {
    if (!query.trim()) return;
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const res = await executeSql(query);
      setResult(res);
      await onQueryExecuted?.();
    } catch (err) {
      setError(err.message || 'SQL execution failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#120807] border border-white/25 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Interactive SQL Console</h3>
              <p className="text-xs text-white/60">Execute live SQL queries directly against the PostgreSQL database.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset query shortcuts */}
        <div className="py-3 flex flex-wrap gap-2 items-center text-xs">
          <span className="text-white/50 text-[11px] font-semibold flex items-center gap-1">
            <Database className="w-3.5 h-3.5" /> Sample Queries:
          </span>
          {PRESET_QUERIES.map((p) => (
            <button
              key={p.label}
              onClick={() => { setQuery(p.sql); setResult(null); setError(''); }}
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-[11px] text-white/80 transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Query Input Area */}
        <div className="space-y-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="w-full bg-black/60 border border-white/20 rounded-2xl p-3.5 font-mono text-xs text-amber-200 placeholder:text-white/30 focus:outline-none focus:border-amber-400/80 resize-none"
            placeholder="SELECT * FROM drone WHERE status = 'Available';"
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/50 font-mono">
              PostgreSQL • Read/Write queries supported
            </span>
            <button
              onClick={handleRun}
              disabled={running || !query.trim()}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shadow-lg"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              {running ? 'Executing…' : 'Execute Query'}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        {/* Results View */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-white/15 bg-black/40 p-3 min-h-[160px]">
          {result?.message && (
            <div className="p-3 text-xs text-emerald-300 font-mono flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {result.message}
            </div>
          )}

          {result?.rows && result.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead className="bg-white/10 text-left text-[10px] uppercase text-amber-300">
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col} className="p-2.5 border-b border-white/15">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, idx) => (
                    <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                      {result.columns.map((col) => (
                        <td key={col} className="p-2.5 text-white/80 whitespace-nowrap">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-white/30 italic">NULL</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : result && !result.message ? (
            <div className="p-6 text-center text-xs text-white/50 font-mono">
              Query completed with 0 rows returned.
            </div>
          ) : !result && !error ? (
            <div className="p-8 text-center text-xs text-white/40">
              Type a SQL command and click <strong className="text-white/70">Execute Query</strong> or pick a sample query above.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}