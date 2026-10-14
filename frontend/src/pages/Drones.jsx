import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { createDrone, deleteDrone, getDrones, updateDrone } from '../utils/api';

const tone = { READY: 'green', ACTIVE: 'amber', CHARGING: 'blue', MAINTENANCE: 'red' };
const filters = ['ALL', 'READY', 'ACTIVE', 'CHARGING', 'MAINTENANCE'];
const emptyForm = { model: '', maker: '', payload: '15', battery: '100', flight: '45', status: 'READY' };
const displayId = (id) => `D${String(id).padStart(3, '0')}`;

export default function Drones({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [adding, setAdding] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRows = useCallback(async () => {
    setError('');
    try {
      const data = await getDrones();
      setRows(data);
    } catch (err) {
      setError(err.message || 'Could not load drones from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const shown = rows.filter(
    (r) => (filter === 'ALL' || r.status === filter) &&
      `${displayId(r.droneId)} ${r.model} ${r.maker}`.toLowerCase().includes(q.toLowerCase())
  );

  const remove = async (row) => {
    if (!window.confirm(`Delete drone ${displayId(row.droneId)} (${row.model}) from the database?`)) return;
    try {
      await deleteDrone(row.droneId);
      await loadRows();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not delete this drone.');
    }
  };

  const handleEditOpen = (row) => {
    setEditingRow(row);
    setForm({
      model: row.model,
      maker: row.maker,
      payload: String(row.payload),
      battery: String(row.battery),
      flight: String(row.flight),
      status: row.status,
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingRow) return;
    setSaving(true);
    setError('');
    try {
      await updateDrone(editingRow.droneId, {
        model: form.model,
        maker: form.maker,
        payload: Number(form.payload || 15),
        battery: Number(form.battery || 100),
        flight: Number(form.flight || 45),
        status: form.status,
      });
      setEditingRow(null);
      setForm(emptyForm);
      await loadRows();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not update this drone.');
    } finally {
      setSaving(false);
    }
  };

  const add = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createDrone({
        model: form.model,
        maker: form.maker || 'AeroRescue',
        payload: Number(form.payload || 15),
        battery: Number(form.battery || 100),
        flight: Number(form.flight || 45),
        status: form.status,
      });
      setForm(emptyForm);
      setAdding(false);
      await loadRows();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save this drone.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/50';

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">DRONE FLEET MANAGEMENT</h2>
          <p className="text-xs text-white/70">
            Real-time telemetry, payload capacity, and hardware readiness records from PostgreSQL.
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setAdding(true); }}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition"
        >
          + Add Drone
        </button>
      </div>

      <SqlBar sql="SELECT droneid, model, manufacturer, payloadcapacity, batterylevel, maxflighttime, status FROM DRONE ORDER BY droneid ASC;" />
      
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <strong>Database Notice:</strong> {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-black/40 border border-white/15">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Drone ID, Model, Manufacturer..."
          className="flex-1 min-w-[220px] bg-white/10 rounded-xl px-4 py-2 text-xs placeholder:text-white/60 focus:outline-none"
        />
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition ${
                filter === f
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl overflow-x-auto shadow-xl">
        <table className="w-full text-xs">
          <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70 tracking-wider">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Model</th>
              <th className="p-3">Manufacturer</th>
              <th className="p-3">Payload</th>
              <th className="p-3">Battery</th>
              <th className="p-3">Flight Time</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-white/60">
                  <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-amber-400 rounded-full mb-2" />
                  <div>Loading live fleet records from database…</div>
                </td>
              </tr>
            ) : shown.map((r) => (
              <tr key={r.droneId} className="border-t border-white/10 hover:bg-white/5 transition">
                <td className="p-3 font-mono text-cyan-300 font-semibold">{displayId(r.droneId)}</td>
                <td className="p-3 font-semibold text-white">{r.model}</td>
                <td className="p-3 text-white/80">{r.maker}</td>
                <td className="p-3 font-mono">{r.payload} kg</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          r.battery < 25 ? 'bg-red-400' : r.battery < 60 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, r.battery))}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-white/80">{r.battery}%</span>
                  </div>
                </td>
                <td className="p-3 font-mono">{r.flight} min</td>
                <td className="p-3">
                  <Badge tone={tone[r.status] || 'gray'}>{r.status}</Badge>
                </td>
                <td className="p-3 text-right space-x-1.5">
                  <button
                    onClick={() => handleEditOpen(r)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                    title="Edit Drone"
                  >
                    ✎ Edit
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 transition"
                    title="Delete Drone"
                  >
                    🗑 Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-white/60">
                  No drones match the filter or search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD DRONE MODAL */}
      {adding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={add} className="bg-[#140c0b] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-amber-300">Add New Rescue Drone</h3>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Drone Model</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. DJI Matrice 350 RTK"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Manufacturer</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. DJI, AeroTech, SkyWorks"
                value={form.maker}
                onChange={(e) => setForm({ ...form, maker: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Payload (kg)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.payload}
                  onChange={(e) => setForm({ ...form, payload: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Max Flight Time (min)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="5"
                  max="180"
                  value={form.flight}
                  onChange={(e) => setForm({ ...form, flight: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Battery (%)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="100"
                  value={form.battery}
                  onChange={(e) => setForm({ ...form, battery: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Initial Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {filters.slice(1).map((s) => (
                    <option key={s} value={s} className="bg-neutral-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
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
                {saving ? 'Saving to Database…' : 'Save Drone'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT DRONE MODAL */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={saveEdit} className="bg-[#140c0b] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-cyan-300">
              Edit Drone {displayId(editingRow.droneId)}
            </h3>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Model</label>
              <input
                required
                className={inputClass}
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Manufacturer</label>
              <input
                required
                className={inputClass}
                value={form.maker}
                onChange={(e) => setForm({ ...form, maker: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Payload (kg)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.payload}
                  onChange={(e) => setForm({ ...form, payload: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Flight Time (min)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="5"
                  value={form.flight}
                  onChange={(e) => setForm({ ...form, flight: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Battery (%)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="100"
                  value={form.battery}
                  onChange={(e) => setForm({ ...form, battery: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {filters.slice(1).map((s) => (
                    <option key={s} value={s} className="bg-neutral-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-1/2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold disabled:opacity-50"
              >
                {saving ? 'Updating…' : 'Update Drone'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
