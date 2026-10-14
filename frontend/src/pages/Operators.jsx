import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { createOperator, getOperators } from '../utils/api';

export default function Operators({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    license: '',
    phone: '',
  });

  const loadData = useCallback(async () => {
    setError('');
    try {
      const data = await getOperators();
      setRows(data);
    } catch (err) {
      setError(err.message || 'Could not load operators from database.');
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
      await createOperator(form);
      setAdding(false);
      setForm({ firstName: '', lastName: '', license: '', phone: '' });
      await loadData();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not register operator.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/50';

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">CERTIFIED DRONE OPERATORS</h2>
          <p className="text-xs text-white/70">
            Aviation license verification, flight sortie assignments, and radio callsigns.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition"
        >
          + Register Operator
        </button>
      </div>

      <SqlBar sql="SELECT operatorid, firstname, lastname, licenseno, contactphone, status FROM OPERATOR ORDER BY operatorid ASC;" />

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <strong>Notice:</strong> {error}
        </div>
      )}

      <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl overflow-x-auto shadow-xl">
        <table className="w-full text-xs">
          <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70 tracking-wider">
            <tr>
              <th className="p-3">Operator ID</th>
              <th className="p-3">Pilot Name</th>
              <th className="p-3">DGCA License No.</th>
              <th className="p-3">Direct Phone</th>
              <th className="p-3">Current Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-white/60">
                  Loading operator rosters…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5 transition">
                  <td className="p-3 font-mono text-cyan-300 font-semibold">OP{String(r.id).padStart(3, '0')}</td>
                  <td className="p-3 font-semibold text-white">{r.name}</td>
                  <td className="p-3 font-mono text-white/80">{r.license}</td>
                  <td className="p-3 font-mono text-white/70">{r.phone}</td>
                  <td className="p-3">
                    <Badge tone={r.status === 'ACTIVE' ? 'amber' : 'green'}>{r.status}</Badge>
                  </td>
                </tr>
              ))
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-white/60">
                  No operators found. Register an operator using the button above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-[#140c0b] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-amber-300">Register Drone Pilot</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">First Name</label>
                <input
                  required
                  className={inputClass}
                  placeholder="e.g. Vikram"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Last Name</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Sethi"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Pilot License No.</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. LIC-IND-2024-99"
                value={form.license}
                onChange={(e) => setForm({ ...form, license: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Emergency Contact Phone</label>
              <input
                className={inputClass}
                placeholder="e.g. +91 98765 00000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50"
              >
                {saving ? 'Registering…' : 'Add Pilot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}