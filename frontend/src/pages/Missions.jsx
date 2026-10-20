import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { completeMission, createMission, getDrones, getMissions } from '../utils/api';

const typeTone = { RESCUE: 'red', SURVEY: 'amber', RELIEF: 'blue', MEDICAL: 'cyan' };
const priorityTone = { CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'cyan', LOW: 'gray' };
const idLabel = (id) => `M${String(id).padStart(3, '0')}`;

export default function Missions({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [drones, setDrones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    type: 'Rescue',
    priority: 'High',
    droneId: '',
    location: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [mList, dList] = await Promise.all([getMissions(), getDrones()]);
      setRows(mList);
      setDrones(dList);
      setSelectedId((current) =>
        mList.some((row) => row.missionId === current) ? current : (mList[0]?.missionId ?? null)
      );
    } catch (err) {
      setError(err.message || 'Could not load missions or fleet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selected = rows.find((row) => row.missionId === selectedId);

  const complete = async () => {
    if (!selected || selected.status === 'COMPLETED') return;
    setSaving(true);
    setError('');
    try {
      await completeMission(selected.missionId);
      await loadData();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not update the mission.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createMission({
        type: form.type,
        priority: form.priority,
        droneId: form.droneId || null,
        location: form.location,
        notes: form.notes,
      });
      setDeploying(false);
      setForm({ type: 'Rescue', priority: 'High', droneId: '', location: '', notes: '' });
      await loadData();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not deploy mission.');
    } finally {
      setSaving(false);
    }
  };

  const availableDrones = drones.filter((d) => d.status === 'READY');

  const detail = (label, value) => (
    <div className="flex items-center justify-between py-2 border-b border-white/10 text-xs">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );

  const inputClass = 'w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/50';

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">MISSION OPERATIONS CONTROL</h2>
          <p className="text-xs text-white/70">
            Real-time disaster sorties, drone flight telemetry, and emergency response sorties.
          </p>
        </div>
        <button
          onClick={() => setDeploying(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition"
        >
          + Deploy New Mission
        </button>
      </div>

      <SqlBar sql="SELECT m.*, dis.disastername, dr.model AS dronemodel FROM MISSION m LEFT JOIN DISASTER dis ON m.disasterid = dis.disasterid LEFT JOIN DRONE dr ON m.droneid = dr.droneid ORDER BY m.missiondate DESC;" />
      
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <strong>Notice:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Selected mission details */}
        <div className="lg:col-span-2 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-black tracking-wider text-amber-300">MISSION TELEMETRY</h3>
          {selected ? (
            <>
              {detail('Mission ID', <span className="font-mono text-cyan-300">{idLabel(selected.missionId)}</span>)}
              {detail('Type', <Badge tone={typeTone[selected.type] || 'gray'}>{selected.type}</Badge>)}
              {detail('Disaster Zone', <span className="text-amber-200">{selected.disaster}</span>)}
              {detail('Drone Deployed', <span className="text-cyan-300 font-mono">{selected.drone}</span>)}
              {detail('Commanding Operator', selected.operator)}
              {detail('Sector Location', selected.location || 'Operational Grid')}
              {detail('Mission Date', selected.date)}
              {detail('Priority', <Badge tone={priorityTone[selected.priority] || 'gray'}>{selected.priority}</Badge>)}
              {detail('Status', <Badge tone={selected.status === 'ACTIVE' ? 'green' : 'gray'}>{selected.status}</Badge>)}

              {selected.notes && (
                <div className="pt-2 text-xs">
                  <div className="text-white/60 mb-1">Operational Brief:</div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/90 leading-relaxed font-sans">
                    {selected.notes}
                  </div>
                </div>
              )}

              <button
                onClick={complete}
                disabled={saving || selected.status === 'COMPLETED'}
                className="mt-4 w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-40 disabled:hover:bg-emerald-600 shadow-lg"
              >
                {saving ? 'Updating Database…' : selected.status === 'COMPLETED' ? '✓ Mission Completed' : '✓ Mark Mission Completed'}
              </button>
            </>
          ) : (
            <p className="py-6 text-sm text-white/60 text-center">
              {loading ? 'Loading mission records…' : 'No mission records found.'}
            </p>
          )}
        </div>

        {/* Mission list table */}
        <div className="lg:col-span-3 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black tracking-wider">ALL OPERATIONS IN DATABASE</h3>
            <span className="text-[10px] text-white/60">Click row to inspect</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-white/60 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2">Drone</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-white/60">
                      Loading missions from database…
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.missionId}
                      onClick={() => setSelectedId(row.missionId)}
                      className={`border-t border-white/10 cursor-pointer transition hover:bg-white/10 ${
                        selectedId === row.missionId ? 'bg-white/15' : ''
                      }`}
                    >
                      <td className="p-2 font-mono text-cyan-300 font-semibold">{idLabel(row.missionId)}</td>
                      <td className="p-2">
                        <Badge tone={typeTone[row.type] || 'gray'}>{row.type}</Badge>
                      </td>
                      <td className="p-2">
                        <Badge tone={priorityTone[row.priority] || 'gray'}>{row.priority}</Badge>
                      </td>
                      <td className="p-2 font-mono text-white/80">{row.drone.split(' ')[0]}</td>
                      <td className="p-2">
                        <Badge tone={row.status === 'ACTIVE' ? 'green' : 'gray'}>{row.status}</Badge>
                      </td>
                      <td className="p-2 font-mono text-white/70">{row.date}</td>
                    </tr>
                  ))
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-white/60">
                      No missions recorded yet. Click "+ Deploy New Mission" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DEPLOY MISSION MODAL */}
      {deploying && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleDeploy} className="bg-[#140c0b] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-amber-300">Deploy New Mission</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Mission Type</label>
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="Rescue" className="bg-neutral-900 text-white">Rescue</option>
                  <option value="Surveillance" className="bg-neutral-900 text-white">Surveillance</option>
                  <option value="Supply Drop" className="bg-neutral-900 text-white">Supply Drop</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Priority</label>
                <select
                  className={inputClass}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="Critical" className="bg-neutral-900 text-white">Critical</option>
                  <option value="High" className="bg-neutral-900 text-white">High</option>
                  <option value="Medium" className="bg-neutral-900 text-white">Medium</option>
                  <option value="Low" className="bg-neutral-900 text-white">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">
                Assign Drone ({availableDrones.length} Available)
              </label>
              <select
                required
                className={inputClass}
                value={form.droneId}
                onChange={(e) => setForm({ ...form, droneId: e.target.value })}
              >
                <option value="" className="bg-neutral-900 text-white">-- Select Available Drone --</option>
                {availableDrones.map((d) => (
                  <option key={d.droneId} value={d.droneId} className="bg-neutral-900 text-white">
                    D{String(d.droneId).padStart(3, '0')} - {d.model} ({d.battery}%)
                  </option>
                ))}
              </select>
              {availableDrones.length === 0 && (
                <p className="mt-2 text-xs text-amber-300">No drones are available. Complete an active mission or add a drone before dispatching another sortie.</p>
              )}
            </div>

            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Location / Target Grid</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Velachery Sector 4 Rooftops"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Operation Brief / Notes</label>
              <textarea
                className={`${inputClass} h-20 resize-none`}
                placeholder="Details of survivors, air drop requirements, or coordinates..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeploying(false)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || availableDrones.length === 0}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50"
              >
                {saving ? 'Deploying…' : availableDrones.length === 0 ? 'No Drone Available' : 'Launch Sortie'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
