import { useEffect, useState } from 'react';
import { getCamps } from '../utils/api';

export default function ReliefCamps() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getCamps()
      .then(setRows)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Relief Camps</h2>
      {error && <p role="alert" className="text-sm text-red-300">Could not load camps: {error}</p>}
      <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-left text-xs uppercase text-white/70">
            <tr>
              <th className="p-3">Camp ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Capacity</th>
              <th className="p-3">Occupied</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="p-3 font-mono">{r.campId}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.capacity}</td>
                <td className="p-3">{r.occupied}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
