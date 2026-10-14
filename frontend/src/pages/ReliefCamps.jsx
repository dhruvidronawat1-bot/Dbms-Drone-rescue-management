import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { createCamp, getCamps } from '../utils/api';

export default function ReliefCamps({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    capacity: '200',
    location: '',
    contactPhone: '',
  });

  const loadData = useCallback(async () => {
    setError('');
    try {
      const data = await getCamps();
      setRows(data);
    } catch (err) {
      setError(err.message || 'Could not load relief camps.');
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
      await createCamp({
        name: form.name,
        capacity: parseInt(form.capacity, 10) || 100,
        location: form.location,
        contactPhone: form.contactPhone,
      });
      setAdding(false);
      setForm({ name: '', capacity: '200', location: '', contactPhone: '' });
      await loadData();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not register relief camp.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/50';

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">RELIEF CAMPS & SHELTERS</h2>
          <p className="text-xs text-white/70">
            Emergency evacuee shelter management, occupancy ratios, and food distribution hubs.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition"
        >
          + Add Camp Shelter
        </button>
      </div>

      <SqlBar sql="SELECT campid, campname, capacity, location, currentoccupancy, vacantspace FROM CAMP_OCCUPANCY_VIEW ORDER BY campid ASC;" />

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <strong>Notice:</strong> {error}
        </div>
      )}

      <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl overflow-x-auto shadow-xl">
        <table className="w-full text-xs">
          <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70 tracking-wider">
            <tr>
              <th className="p-3">Camp ID</th>
              <th className="p-3">Shelter Name</th>
              <th className="p-3">Location Grid</th>
              <th className="p-3">Max Capacity</th>
              <th className="p-3">Occupancy</th>
              <th className="p-3">Vacant Beds</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-white/60">
                  Loading camp records from database…
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const ratio = Math.round(((r.occupied || 0) / (r.capacity || 1)) * 100);
                return (
                  <tr key={r.campId} className="border-t border-white/10 hover:bg-white/5 transition">
                    <td className="p-3 font-mono text-cyan-300 font-semibold">C{String(r.campId).padStart(3, '0')}</td>
                    <td className="p-3 font-semibold text-white">{r.name}</td>
                    <td className="p-3 text-white/80">{r.location || 'Central Sector'}</td>
                    <td className="p-3 font-mono">{r.capacity}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-white/15 overflow-hidden">
                          <div
                            className={`h-full ${ratio > 90 ? 'bg-red-400' : ratio > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(100, ratio)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-white/80">
                          {r.occupied} ({ratio}%)
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-semibold text-emerald-300">{r.vacant}</td>
                    <td className="p-3">
                      <Badge tone={ratio >= 100 ? 'red' : ratio > 75 ? 'amber' : 'green'}>
                        {ratio >= 100 ? 'FULL' : ratio > 75 ? 'NEAR CAPACITY' : 'ACCEPTING'}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-white/60">
                  No relief camps configured. Add one using the button above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-[#140c0b] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-amber-300">Open Relief Camp Shelter</h3>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Camp Name</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Marina Beach Community Relief Hall"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Shelter Location</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Sector 9 Stadium, Velachery"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Max Bed Capacity</label>
                <input
                  required
                  type="number"
                  min="10"
                  className={inputClass}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Contact Hotline</label>
                <input
                  className={inputClass}
                  placeholder="e.g. +91 44 2836 0000"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
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
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50"
              >
                {saving ? 'Opening Shelter…' : 'Establish Camp'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
