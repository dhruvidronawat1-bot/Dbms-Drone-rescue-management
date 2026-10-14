import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { createVictim, getVictims } from '../utils/api';

const priorityTone = { Critical: 'red', High: 'amber', Medium: 'cyan', Low: 'gray' };
const statusTone = { Missing: 'red', Rescued: 'green', 'In Camp': 'blue', Hospitalized: 'amber', Discharged: 'gray' };

export default function Victims({ onSaved }) {
  const [victims, setVictims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    age: '28',
    gender: 'M',
    priority: 'High',
    details: '',
  });

  const loadData = useCallback(async () => {
    setError('');
    try {
      const rows = await getVictims();
      setVictims(rows);
    } catch (err) {
      setError(err.message || 'Could not load victim records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createVictim({
        name: form.name,
        Age: form.age,
        gender: form.gender,
        Priority: form.priority,
        details: form.details,
      });
      setAdding(false);
      setForm({ name: '', age: '28', gender: 'M', priority: 'High', details: '' });
      await loadData();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not register victim.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/50';

  return (
    <section className="space-y-4 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">SOS RESCUE & VICTIM REGISTRY</h2>
          <p className="text-xs text-white/70">
            Civilian distress beacons, medical triage priorities, and camp allocation tracking.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition"
        >
          + Log SOS Victim
        </button>
      </div>

      <SqlBar sql="SELECT victimid, victimname, dateofbirth, medicalpriority, currentstatus, campid, disasterid FROM VICTIM ORDER BY victimid DESC;" />

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <strong>Notice:</strong> {error}
        </div>
      )}

      <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl overflow-x-auto shadow-xl">
        <table className="w-full text-xs">
          <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70 tracking-wider">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Full Name</th>
              <th className="p-3">Age</th>
              <th className="p-3">Medical Triage</th>
              <th className="p-3">Status</th>
              <th className="p-3">Assigned Camp</th>
              <th className="p-3">Disaster Zone</th>
              <th className="p-3">Distress Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-white/60">
                  Loading registry records…
                </td>
              </tr>
            ) : (
              victims.map((v) => (
                <tr key={v.victimId} className="border-t border-white/10 hover:bg-white/5 transition">
                  <td className="p-3 font-mono text-cyan-300 font-semibold">V{String(v.victimId).padStart(3, '0')}</td>
                  <td className="p-3 font-semibold text-white">{v.name}</td>
                  <td className="p-3 font-mono">{v.age ?? '—'}</td>
                  <td className="p-3">
                    <Badge tone={priorityTone[v.priority] || 'gray'}>{v.priority}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge tone={statusTone[v.status] || 'gray'}>{v.status}</Badge>
                  </td>
                  <td className="p-3 text-cyan-200">{v.camp || 'Unassigned'}</td>
                  <td className="p-3 text-white/80">{v.disaster || 'Disaster Zone'}</td>
                  <td className="p-3 text-white/60 max-w-xs truncate">{v.details || '—'}</td>
                </tr>
              ))
            )}
            {!loading && victims.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-white/60">
                  No victims logged in the registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-[#140c0b] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-red-400">Log Victim Distress Beacon</h3>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Full Name</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Estimated Age</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="120"
                  className={inputClass}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Gender</label>
                <select
                  className={inputClass}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="M" className="bg-neutral-900 text-white">Male (M)</option>
                  <option value="F" className="bg-neutral-900 text-white">Female (F)</option>
                  <option value="O" className="bg-neutral-900 text-white">Other (O)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Medical Triage Priority</label>
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
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Distress Details / Condition</label>
              <textarea
                className={`${inputClass} h-20 resize-none`}
                placeholder="Injury, stranded location, or medical condition..."
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {saving ? 'Registering…' : 'Register SOS'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
