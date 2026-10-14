import { useEffect, useState } from 'react';
import { getVictims } from '../utils/api';

export default function Victims() {
  const [victims, setVictims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getVictims()
      .then((rows) => { if (active) setVictims(rows); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="space-y-5 text-white">
      <div>
        <h2 className="text-2xl font-bold">Victims</h2>
        <p className="text-sm text-white/60">Records loaded from the connected database.</p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm">Could not load victims: {error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70"><tr>{['Name', 'Age', 'Priority', 'Status', 'Camp', 'Location'].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="px-4 py-6 text-center text-white/60">Loading records…</td></tr>
              : victims.length === 0 ? <tr><td colSpan="6" className="px-4 py-6 text-center text-white/60">No victim records found.</td></tr>
                : victims.map((victim) => <tr key={victim.victimId} className="border-t border-white/10">
                    <td className="px-4 py-3">{victim.name}</td><td className="px-4 py-3">{victim.age ?? '—'}</td>
                    <td className="px-4 py-3">{victim.priority ?? '—'}</td><td className="px-4 py-3">{victim.status ?? '—'}</td>
                    <td className="px-4 py-3">{victim.camp ?? '—'}</td><td className="px-4 py-3">{victim.location ?? '—'}</td>
                  </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
