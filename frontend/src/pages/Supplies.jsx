import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { createSupply, deleteSupply, getSupplies } from '../utils/api';

const LOW_STOCK_THRESHOLD = 100;

export default function Supplies({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    item: '',
    qty: '150',
    unit: 'kits',
  });

  const loadData = useCallback(async () => {
    setError('');
    try {
      const data = await getSupplies();
      setRows(data);
    } catch (err) {
      setError(err.message || 'Could not load supply inventory.');
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
      await createSupply({
        item: form.item,
        qty: parseInt(form.qty, 10) || 100,
        unit: form.unit,
      });
      setAdding(false);
      setForm({ item: '', qty: '150', unit: 'kits' });
      await loadData();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save supply item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supply record?')) return;
    try {
      await deleteSupply(id);
      await loadData();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not delete item.');
    }
  };

  const inputClass = 'w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/50';

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">RELIEF SUPPLY INVENTORY</h2>
          <p className="text-xs text-white/70">
            Emergency drinking water, medical kits, high-calorie meal rations, and shelter payloads.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition"
        >
          + Add Supply Stock
        </button>
      </div>

      <SqlBar sql="SELECT s.*, c.campname FROM SUPPLY s LEFT JOIN RELIEF_CAMP c ON s.campid = c.campid ORDER BY s.quantityavailable ASC;" />

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <strong>Notice:</strong> {error}
        </div>
      )}

      <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl overflow-x-auto shadow-xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-xs font-black tracking-wider text-amber-300">LIVE WAREHOUSE CATALOG</h3>
          <span className="text-[10px] text-white/60">{rows.length} cataloged stock lines</span>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70 tracking-wider">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Supply Item</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Stocked Camp / Depot</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last Audited</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-white/60">
                  Loading supply inventory from database…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5 transition">
                  <td className="p-3 font-mono text-cyan-300 font-semibold">S{String(r.id).padStart(3, '0')}</td>
                  <td className="p-3 font-semibold text-white">{r.item}</td>
                  <td className="p-3 font-bold text-amber-300 font-mono text-sm">{r.qty}</td>
                  <td className="p-3 text-cyan-200 font-medium">{r.camp}</td>
                  <td className="p-3 text-white/70">{r.unit}</td>
                  <td className="p-3">
                    {r.qty < LOW_STOCK_THRESHOLD ? (
                      <Badge tone="red">⚠ Low Stock</Badge>
                    ) : (
                      <Badge tone="green">✓ In Stock</Badge>
                    )}
                  </td>
                  <td className="p-3 font-mono text-white/60">{r.updated}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-white/60">
                  No supplies logged in the warehouse database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-[#140c0b] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-amber-300">Add Supply Stock</h3>
            <div>
              <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Item Description</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Glucose Packets, Blood Plasma, Thermal Blankets"
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Quantity</label>
                <input
                  required
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/60 font-semibold mb-1 block">Packaging Unit</label>
                <select
                  className={inputClass}
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option value="kits" className="bg-neutral-900 text-white">kits</option>
                  <option value="units" className="bg-neutral-900 text-white">units</option>
                  <option value="liters" className="bg-neutral-900 text-white">liters</option>
                  <option value="cartons" className="bg-neutral-900 text-white">cartons</option>
                  <option value="kilograms" className="bg-neutral-900 text-white">kilograms</option>
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
                {saving ? 'Adding…' : 'Stock In'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}