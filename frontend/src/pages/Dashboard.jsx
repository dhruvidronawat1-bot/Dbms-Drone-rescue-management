import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { getMissions } from '../utils/api';

const count = (value) => value ?? '—';
const idLabel = (id) => `M${String(id).padStart(3, '0')}`;
const typeTone = { RESCUE: 'red', SURVEY: 'amber', RELIEF: 'blue', MEDICAL: 'cyan' };
const priorityTone = { CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'cyan', LOW: 'gray' };

export default function Dashboard({ onNavigate, stats }) {
  const [missions, setMissions] = useState([]);
  const [missionError, setMissionError] = useState('');

  useEffect(() => {
    let active = true;
    getMissions()
      .then((rows) => { if (active) setMissions(rows); })
      .catch((error) => { if (active) setMissionError(error.message || 'Could not load missions.'); });
    return () => { active = false; };
  }, []);

  const activeMissions = missions.filter((mission) => mission.status === 'ACTIVE');
  const cards = [
    { label: 'Drones', value: count(stats?.drones), sub: `${stats?.inFlight ?? 0} In Flight`, tag: 'COUNT(*)', view: 'drones', subColor: 'text-amber-300' },
    { label: 'Missions', value: count(stats?.missions), sub: `${stats?.activeMissions ?? 0} Active Right Now`, tag: 'ACTIVE', view: 'missions', subColor: 'text-amber-300' },
    { label: 'Victims', value: count(stats?.victims), sub: `${stats?.rescued ?? 0} Rescued`, tag: 'REGISTRY', view: 'victims', subColor: 'text-emerald-300' },
    { label: 'Camps', value: count(stats?.camps), sub: 'Relief Shelters', tag: 'CAMP', view: 'camps', subColor: 'text-cyan-300' },
    { label: 'Supplies', value: count(stats?.supplies), sub: 'Catalog Stock', tag: 'SUPPLY', view: 'supplies', subColor: 'text-cyan-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Good morning, Admin</h2>
          <p className="text-xs text-white/70">Disaster Response Operations Command • Live database summary</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('victims')} className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-[11px] font-semibold">Open SOS</button>
          <button onClick={() => onNavigate('missions')} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-[11px] font-semibold">+ Deploy Mission</button>
        </div>
      </div>

      <SqlBar sql="SELECT COUNT(*) FROM DRONE; SELECT COUNT(*) FROM MISSION WHERE MissionStatus = 'In Progress'; SELECT COUNT(*) FROM VICTIM; SELECT COUNT(*) FROM RELIEF_CAMP;" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <button key={card.label} onClick={() => onNavigate(card.view)} className="text-left p-5 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl hover:bg-white/10 transition">
            <div className="text-[10px] font-bold tracking-widest text-white/70">{card.label.toUpperCase()}</div>
            <div className="text-5xl font-light my-2">{card.value}</div>
            <div className="flex items-center justify-between text-[10px]">
              <span className={`font-bold ${card.subColor}`}>{card.sub}</span>
              <span className="font-mono text-white/50">{card.tag}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black tracking-wider">ACTIVE OPERATIONS & MISSIONS</h3>
            <button onClick={() => onNavigate('missions')} className="text-xs text-amber-300">View All ↗</button>
          </div>
          {missionError && <p role="alert" className="mb-3 text-xs text-red-300">Could not load mission records: {missionError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-white/60 uppercase text-[10px]">
                <tr><th className="p-2">Mission ID</th><th className="p-2">Type</th><th className="p-2">Disaster Zone</th><th className="p-2">Drone</th><th className="p-2">Priority</th><th className="p-2">Status</th></tr>
              </thead>
              <tbody>
                {activeMissions.slice(0, 5).map((mission) => (
                  <tr key={mission.missionId} className="border-t border-white/10">
                    <td className="p-2 font-mono">{idLabel(mission.missionId)}</td>
                    <td className="p-2"><Badge tone={typeTone[mission.type]}>{mission.type}</Badge></td>
                    <td className="p-2">{mission.disaster}</td>
                    <td className="p-2 font-mono text-cyan-300">{mission.drone}</td>
                    <td className="p-2"><Badge tone={priorityTone[mission.priority]}>{mission.priority}</Badge></td>
                    <td className="p-2"><Badge tone="green">{mission.status}</Badge></td>
                  </tr>
                ))}
                {!missionError && activeMissions.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-white/60">No active missions in the database.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5 space-y-2">
            <h3 className="text-sm font-black tracking-wider mb-2">DRONE FLEET READINESS</h3>
            {[
              [`Ready for Flight (${stats?.readyDrones ?? 0})`, 'bg-cyan-400'],
              [`Active Airborne (${stats?.inFlight ?? 0})`, 'bg-amber-400'],
              [`Charging Bay (${stats?.chargingDrones ?? 0})`, 'bg-blue-400'],
            ].map(([label, dot]) => (
              <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <span className={`w-2 h-2 rounded-full ${dot}`} /> {label}
              </div>
            ))}
          </div>
          <div className="rounded-3xl bg-red-500/10 border border-red-500/30 p-4 text-xs">
            <div className="font-bold text-red-300 mb-1">LIVE OPERATIONS</div>
            <div className="font-semibold">{activeMissions.length} active mission{activeMissions.length === 1 ? '' : 's'}</div>
            <p className="text-white/70 mt-1">{stats?.inFlight ?? 0} drone{stats?.inFlight === 1 ? '' : 's'} currently marked On Mission in the database.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

