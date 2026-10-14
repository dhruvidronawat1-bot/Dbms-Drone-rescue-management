import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { getOrganizations } from '../utils/api';

const orgTone = { Government: 'blue', NGO: 'green', Private: 'amber' };

export default function Organizations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    try {
      const data = await getOrganizations();
      setRows(data);
    } catch (err) {
      setError(err.message || 'Could not load organizations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-4 text-white">
      <div>
        <h2 className="text-3xl font-black tracking-tight">RESPONSE ORGANIZATIONS</h2>
        <p className="text-xs text-white/70">
          Partner agencies, NDRF strike teams, humanitarian NGOs, and command contacts.
        </p>
      </div>

      <SqlBar sql="SELECT orgid, orgname, orgtype, headoffice, contactemail, contactphone FROM ORGANIZATION ORDER BY orgid ASC;" />

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <strong>Notice:</strong> {error}
        </div>
      )}

      <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl overflow-x-auto shadow-xl">
        <table className="w-full text-xs">
          <thead className="bg-white/10 text-left text-[10px] uppercase text-white/70 tracking-wider">
            <tr>
              <th className="p-3">Org ID</th>
              <th className="p-3">Agency / Entity Name</th>
              <th className="p-3">Classification</th>
              <th className="p-3">Head Office</th>
              <th className="p-3">Emergency Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-white/60">
                  Loading agency directory…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5 transition">
                  <td className="p-3 font-mono text-cyan-300 font-semibold">ORG{String(r.id).padStart(3, '0')}</td>
                  <td className="p-3 font-semibold text-white">{r.name}</td>
                  <td className="p-3">
                    <Badge tone={orgTone[r.type] || 'gray'}>{r.type}</Badge>
                  </td>
                  <td className="p-3 text-white/80">{r.headOffice || 'Regional HQ'}</td>
                  <td className="p-3 font-mono text-white/70">
                    <div>{r.phone}</div>
                    <div className="text-[10px] text-white/50">{r.email}</div>
                  </td>
                </tr>
              ))
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-white/60">
                  No participating organizations recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}