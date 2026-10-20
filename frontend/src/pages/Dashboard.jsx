import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import SqlBar from '../components/SqlBar';
import { getMissions } from '../utils/api';

const count = (value) => (value !== undefined && value !== null ? value : '—');
const idLabel = (id) => `M${String(id).padStart(3, '0')}`;
const typeTone = { RESCUE: 'red', SURVEY: 'amber', RELIEF: 'blue', MEDICAL: 'cyan' };
const priorityTone = { CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'cyan', LOW: 'gray' };

export default function Dashboard({ onNavigate, stats }) {
  const [missions, setMissions] = useState([]);
  const [missionError, setMissionError] = useState('');

  useEffect(() => {
    let active = true;
    const refreshMissions = () => {
      getMissions()
        .then((rows) => {
          if (active) {
            setMissions(rows);
            setMissionError('');
          }
        })
        .catch((error) => {
          if (active) setMissionError(error.message || 'Could not load missions.');
        });
    };

    refreshMissions();
    const timer = window.setInterval(refreshMissions, 12000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const activeMissions = missions.filter((m) => m.status === 'ACTIVE');

  const cards = [
    {
      label: 'Drones',
      value: count(stats?.drones),
      sub: `${stats?.inFlight ?? 0} In Flight`,
      tag: 'FLEET',
      view: 'drones',
      subColor: 'text-amber-300',
    },
    {
      label: 'Missions',
      value: count(stats?.missions),
      sub: `${stats?.activeMissions ?? 0} Active Right Now`,
      tag: 'ACTIVE',
      view: 'missions',
      subColor: 'text-amber-300',
    },
    {
      label: 'Victims',
      value: count(stats?.victims),
      sub: `${stats?.rescued ?? 0} Rescued`,
      tag: 'REGISTRY',
      view: 'victims',
      subColor: 'text-emerald-300',
    },
    {
      label: 'Camps',
      value: count(stats?.camps),
      sub: 'Relief Shelters',
      tag: 'CAMP',
      view: 'camps',
      subColor: 'text-cyan-300',
    },
    {
      label: 'Supplies',
      value: count(stats?.supplies),
      sub: `${stats?.totalSupplyUnits ?? 0} Units In Stock`,
      tag: 'SUPPLY',
      view: 'supplies',
      subColor: 'text-cyan-300',
    },
  ];

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Disaster Response Center</h2>
          <p className="text-xs text-white/70">
            AeroRescue Autonomous Fleet Operations Command • Live PostgreSQL Database Summary
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('victims')}
            className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-semibold transition"
          >
            Open SOS Registry
          </button>
          <button
            onClick={() => onNavigate('missions')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg"
          >
            + Deploy Mission
          </button>
        </div>
      </div>

      <SqlBar sql="SELECT (SELECT COUNT(*) FROM DRONE) AS drones, (SELECT COUNT(*) FROM MISSION WHERE missionstatus = 'In Progress') AS active_missions, (SELECT COUNT(*) FROM VICTIM) AS victims, (SELECT COUNT(*) FROM RELIEF_CAMP) AS camps;" />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.view)}
            className="text-left p-5 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl hover:bg-white/10 transition group shadow-xl"
          >
            <div className="text-[10px] font-bold tracking-widest text-white/70">{card.label.toUpperCase()}</div>
            <div className="text-5xl font-light my-2 text-white group-hover:text-amber-300 transition">
              {card.value}
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className={`font-bold ${card.subColor}`}>{card.sub}</span>
              <span className="font-mono text-white/40">{card.tag}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active missions table */}
        <div className="lg:col-span-2 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black tracking-wider text-amber-300">ACTIVE FLIGHT OPERATIONS & MISSIONS</h3>
            <button onClick={() => onNavigate('missions')} className="text-xs text-amber-400 hover:underline">
              View All Missions ↗
            </button>
          </div>
          {missionError && (
            <p role="alert" className="mb-3 text-xs text-red-300">
              Could not load mission records: {missionError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-white/60 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2">Mission ID</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Disaster Zone</th>
                  <th className="p-2">Assigned Drone</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeMissions.slice(0, 5).map((m) => (
                  <tr key={m.missionId} className="border-t border-white/10 hover:bg-white/5 transition">
                    <td className="p-2 font-mono text-cyan-300 font-semibold">{idLabel(m.missionId)}</td>
                    <td className="p-2">
                      <Badge tone={typeTone[m.type] || 'gray'}>{m.type}</Badge>
                    </td>
                    <td className="p-2 text-white/90">{m.disaster}</td>
                    <td className="p-2 font-mono text-cyan-300">{m.drone}</td>
                    <td className="p-2">
                      <Badge tone={priorityTone[m.priority] || 'gray'}>{m.priority}</Badge>
                    </td>
                    <td className="p-2">
                      <Badge tone="green">{m.status}</Badge>
                    </td>
                  </tr>
                ))}
                {!missionError && activeMissions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-white/60">
                      No active missions in progress. Deploy a mission from Mission Control.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fleet readiness & status */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-black/40 border border-white/15 backdrop-blur-xl p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-black tracking-wider text-white">DRONE FLEET READINESS</h3>
            {[
              [`Ready for Flight (${stats?.readyDrones ?? 0})`, 'bg-emerald-400', 'text-emerald-300'],
              [`Active In-Flight (${stats?.inFlight ?? 0})`, 'bg-amber-400', 'text-amber-300'],
              [`Charging Bay (${stats?.chargingDrones ?? 0})`, 'bg-blue-400', 'text-blue-300'],
              [`Maintenance (${stats?.maintenanceDrones ?? 0})`, 'bg-red-400', 'text-red-300'],
            ].map(([label, dot, textCol]) => (
              <div
                key={label}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  <span className="text-white/90">{label}</span>
                </div>
                <span className={`font-mono font-bold ${textCol}`}>
                  {stats ? 'LIVE' : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-amber-500/10 border border-amber-500/30 p-5 text-xs shadow-xl">
            <div className="font-bold text-amber-300 mb-1 tracking-wider uppercase text-[10px]">
              Live Sortie Status
            </div>
            <div className="font-semibold text-white text-base">
              {activeMissions.length} active sortie{activeMissions.length === 1 ? '' : 's'} in progress
            </div>
            <p className="text-white/70 mt-1 leading-relaxed">
              {stats?.inFlight ?? 0} drone{stats?.inFlight === 1 ? '' : 's'} airborne and streaming telemetry back to command.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
