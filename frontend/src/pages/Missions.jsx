import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { completeMission, getMissions } from '../utils/api';

const typeTone = { RESCUE: 'red', SURVEY: 'amber', RELIEF: 'blue', MEDICAL: 'cyan' };
const priorityTone = { CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'cyan', LOW: 'gray' };
const idLabel = (id) => `M${String(id).padStart(3, '0')}`;

export default function Missions({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selected = rows.find((row) => row.missionId === selectedId);

  const loadRows = useCallback(async () => {
    setError('');
    try {
      const data = await getMissions();
      setRows(data);
      setSelectedId((current) => data.some((row) => row.missionId === current) ? current : (data[0]?.missionId ?? null));
    } catch (err) {
      setError(err.message || 'Could not load missions from the database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  const complete = async () => {
    if (!selected || selected.status === 'COMPLETED') return;
    setSaving(true);
    setError('');
    try {
      await completeMission(selected.missionId);
      await loadRows();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not update the mission.');
    } finally {
      setSaving(false);
    }
  };

  const detail = (label, value) => (
    <div className="flex items-center justify-between py-1.5 border-b border-white/10 text-xs">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4 text-white">
      <div>
        <h2 className="text-3xl font-black tracking-tight">MISSION CONTROL</h2>
        <p className="text-xs text-white/70">Mission records loaded from the connected database.</p>
      </div>

      <SqlBar sql="SELECT * FROM MISSION ORDER BY MissionDate DESC;" />
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5">
          <h3 className="text-sm font-black tracking-wider mb-3">MISSION DETAILS</h3>
          {selected ? <>
            {detail('Mission ID', <span className="font-mono">{idLabel(selected.missionId)}</span>)}
            {detail('Type', <Badge tone={typeTone[selected.type]}>{selected.type}</Badge>)}
            {detail('Disaster', <span className="text-amber-300">{selected.disaster}</span>)}
            {detail('Drone Assigned', <span className="text-cyan-300">{selected.drone}</span>)}
            {detail('Operator', selected.operator)}
            {detail('Date', selected.date)}
            {detail('Priority', <Badge tone={priorityTone[selected.priority]}>{selected.priority}</Badge>)}
            {detail('Status', <Badge tone={selected.status === 'ACTIVE' ? 'green' : 'gray'}>{selected.status}</Badge>)}
            <button onClick={complete} disabled={saving || selected.status === 'COMPLETED'} className="mt-4 w-full py-3 rounded-2xl bg-[#262626] hover:bg-black border border-white/25 text-xs font-bold disabled:opacity-40">
              {saving ? 'Saving…' : '✓ Mark Mission Completed'}
            </button>
          </> : <p className="py-6 text-sm text-white/60">{loading ? 'Loading missions…' : 'No mission records found.'}</p>}
        </div>

        <div className="lg:col-span-3 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black tracking-wider">MISSIONS IN DATABASE</h3>
            <span className="text-[10px] text-white/60">Click row to inspect</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-white/60 uppercase text-[10px]">
                <tr><th className="p-2">ID</th><th className="p-2">Type</th><th className="p-2">Priority</th><th className="p-2">Status</th><th className="p-2">Date</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="5" className="p-6 text-center text-white/60">Loading missions…</td></tr>
                  : rows.map((row) => <tr key={row.missionId} onClick={() => setSelectedId(row.missionId)} className={`border-t border-white/10 cursor-pointer hover:bg-white/10 ${selectedId === row.missionId ? 'bg-white/15' : ''}`}>
                      <td className="p-2 font-mono">{idLabel(row.missionId)}</td>
                      <td className="p-2"><Badge tone={typeTone[row.type]}>{row.type}</Badge></td>
                      <td className="p-2"><Badge tone={priorityTone[row.priority]}>{row.priority}</Badge></td>
                      <td className="p-2"><Badge tone={row.status === 'ACTIVE' ? 'green' : 'gray'}>{row.status}</Badge></td>
                      <td className="p-2 font-mono text-white/70">{row.date}</td>
                    </tr>)}
                {!loading && rows.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-white/60">No mission records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

