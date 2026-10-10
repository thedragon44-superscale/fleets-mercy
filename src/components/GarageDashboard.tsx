import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export interface UnitBlueprint {
  id: string;
  name: string;
  shortName: string;
  weight: number;
  classType: 'LIGHT' | 'INDUSTRIAL' | 'MEDIUM' | 'HEAVY' | 'CAPITAL';
  role: string;
  speed: string;
  shields: string;
  hull: string;
  cooldown: string;
  aggroRange: string;
  aiState: string;
  doctrine: string;
}

export const UNIT_DB: UnitBlueprint[] = [
  { id: 'viper_interceptor', name: 'Viper Interceptor', shortName: 'Viper', weight: 1, classType: 'LIGHT', role: 'Air Superiority', speed: 'FAST (0.40)', shields: '0.50', hull: '1.00', cooldown: '8 Ticks', aggroRange: '600px', aiState: 'SEEK', doctrine: 'SEEK AI: Auto-detects hostiles within 600px. Closes distance at 0.40 speed to deliver kinetic auto-cannon bursts.' },
  { id: 'recon_probe', name: 'Recon Probe', shortName: 'Recon', weight: 1, classType: 'LIGHT', role: 'Radar Expansion', speed: 'VERY FAST (0.45)', shields: '0.20', hull: '0.20', cooldown: '10 Ticks', aggroRange: '1200px', aiState: 'SEEK', doctrine: 'SEEK AI: Unarmed scout. Maintains maximum sensor range (1200px) from hostiles to paint targets through Fog of War.' },
  { id: 'phantom_transport', name: 'Phantom Transport', shortName: 'Phantom', weight: 1, classType: 'LIGHT', role: 'Covert Drop', speed: 'FAST (0.40)', shields: '0.00', hull: '0.40', cooldown: '60 Ticks', aggroRange: '200px', aiState: 'GUARD', doctrine: 'GUARD AI: Heavy sensor cloaking. Stays within 100px of Flagship until ordered to execute boarding actions.' },
  { id: 'ion_interceptor', name: 'Ion Disabler', shortName: 'Ion Dis', weight: 1, classType: 'LIGHT', role: 'EMP Striker', speed: 'VERY FAST (0.45)', shields: '0.50', hull: '0.30', cooldown: '20 Ticks', aggroRange: '700px', aiState: 'SEEK', doctrine: 'SEEK AI: Fires ion pulses that strip enemy shields and lock down target RCS thrusters.' },
  { id: 'mining_barge', name: 'Mining Barge', shortName: 'Miner', weight: 2, classType: 'INDUSTRIAL', role: 'Resource Drill', speed: 'SLOW (0.10)', shields: '0.00', hull: '3.00', cooldown: '40 Ticks', aggroRange: '300px', aiState: 'GUARD', doctrine: 'GUARD AI: Holds formation off stern. Deploys mining lasers when near celestial bodies.' },
  { id: 'supply_tender', name: 'Supply Tender', shortName: 'Tender', weight: 2, classType: 'INDUSTRIAL', role: 'Ammo Logistics', speed: 'MEDIUM (0.20)', shields: '0.80', hull: '1.50', cooldown: '60 Ticks', aggroRange: '300px', aiState: 'GUARD', doctrine: 'GUARD AI: Resupplies torpedoes and ballistic rounds to friendly units in radius.' },
  { id: 'plasma_skimmer', name: 'Plasma Skimmer', shortName: 'Skimmer', weight: 2, classType: 'INDUSTRIAL', role: 'Energy Harvest', speed: 'FAST (0.35)', shields: '2.00', hull: '0.50', cooldown: '30 Ticks', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Skims volatile nebula clouds to synthesize energy cells.' },
  { id: 'grav_extractor', name: 'Grav-Extractor', shortName: 'Grav Ext', weight: 2, classType: 'INDUSTRIAL', role: 'Gravity Harvest', speed: 'MEDIUM (0.20)', shields: '1.50', hull: '1.50', cooldown: '45 Ticks', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Attracts loose asteroid mineral nodes toward active Mining Barges.' },
  { id: 'assault_gunship', name: 'Assault Gunship', shortName: 'Gunship', weight: 3, classType: 'MEDIUM', role: 'Strafing Runs', speed: 'MEDIUM (0.30)', shields: '1.00', hull: '2.00', cooldown: '5 Ticks', aggroRange: '500px', aiState: 'SEEK', doctrine: 'SEEK AI: Heavy frontline brawler executing strafing passes.' },
  { id: 'command_escort', name: 'Command Escort', shortName: 'Cmd Esc', weight: 3, classType: 'MEDIUM', role: 'Capital Bodyguard', speed: 'FAST (1.8)', shields: '2000.00', hull: '1500.00', cooldown: '5 Ticks', aggroRange: '600px', aiState: 'BODYGUARD', doctrine: 'BODYGUARD AI: Dedicated bodyguard that tethers to and shields flagship units.' },
  { id: 'aegis_repair', name: 'Aegis Repair', shortName: 'Aegis Rep', weight: 3, classType: 'MEDIUM', role: 'Field Maintenance', speed: 'MEDIUM (0.20)', shields: '1.50', hull: '0.50', cooldown: '20 Ticks', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Locks onto damaged friendly hulls, restoring hull quadrant plating.' },
  { id: 'vortex_minelayer', name: 'Vortex Minelayer', shortName: 'Minelayer', weight: 3, classType: 'MEDIUM', role: 'Spatial Traps', speed: 'FAST (0.35)', shields: '0.80', hull: '0.80', cooldown: '100 Ticks', aggroRange: '300px', aiState: 'GUARD', doctrine: 'GUARD AI: Patrols flagship perimeter and drops explosive vortex mines.' },
  { id: 'lancer_corvette', name: 'Lancer Corvette', shortName: 'Lancer', weight: 4, classType: 'HEAVY', role: 'Anti-Armor Sniper', speed: 'SLOW (0.15)', shields: '0.50', hull: '1.50', cooldown: '60 Ticks', aggroRange: '1000px', aiState: 'SEEK', doctrine: 'SEEK AI: Stand-off sniper that maintains range to fire railgun rounds.' },
  { id: 'cryo_flak', name: 'Cryo-Flak Frigate', shortName: 'Cryo-Flak', weight: 4, classType: 'HEAVY', role: 'Swarm Disruption', speed: 'MEDIUM (0.20)', shields: '1.50', hull: '1.50', cooldown: '15 Ticks', aggroRange: '500px', aiState: 'GUARD', doctrine: 'GUARD AI: Fires AOE cryo-flak shells that freeze enemy thrusters.' },
  { id: 'specter_jammer', name: 'Specter Jammer', shortName: 'Jammer', weight: 4, classType: 'HEAVY', role: 'Electronic Warfare', speed: 'FAST (0.35)', shields: '1.00', hull: '0.80', cooldown: '45 Ticks', aggroRange: '800px', aiState: 'SEEK', doctrine: 'SEEK AI: EW Specialist that breaks enemy auto-targeting lock-ons.' },
  { id: 'battalion_command_ship', name: 'Battalion Command Ship', shortName: 'Batt Cmd', weight: 5, classType: 'CAPITAL', role: 'Fleet Command Hub', speed: 'SLOW (0.9)', shields: '2500.00', hull: '1875.00', cooldown: '30 Ticks', aggroRange: '1200px', aiState: 'COMMAND_RELAY', doctrine: 'COMMAND_RELAY AI: Flagship command node with 4-quadrant shielding.' },
  { id: 'aegis_wall', name: 'Aegis Wall', shortName: 'Aegis Wall', weight: 5, classType: 'CAPITAL', role: 'Directional Shield', speed: 'SLOW (0.15)', shields: '4.00', hull: '1.00', cooldown: 'Instant', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Matches flagship orientation to project front shield barrier.' },
  { id: 'torpedo_bomber', name: 'Torpedo Bomber', shortName: 'T. Bomber', weight: 5, classType: 'CAPITAL', role: 'Capital Siege', speed: 'SLOW (0.10)', shields: '2.00', hull: '2.50', cooldown: '90 Ticks', aggroRange: '700px', aiState: 'SEEK', doctrine: 'SEEK AI: Anti-flagship platform firing heavy plasma torpedoes.' },
  { id: 'warp_frigate', name: 'Warp Frigate', shortName: 'Warp Frig', weight: 5, classType: 'CAPITAL', role: 'Teleport Anchor', speed: 'VERY SLOW (0.05)', shields: '3.00', hull: '1.50', cooldown: '120 Ticks', aggroRange: '0px', aiState: 'GUARD', doctrine: 'GUARD AI: Spatial relay anchor that opens micro-wormholes for reserves.' },
  { id: 'gun_emplacement', name: 'Gun Emplacement', shortName: 'Turret', weight: 5, classType: 'CAPITAL', role: 'Static Defense', speed: 'STATIC (0.00)', shields: '2.00', hull: '4.00', cooldown: '30 Ticks', aggroRange: '800px', aiState: 'GUARD', doctrine: 'GUARD AI: Stationary defense platform locking down deposits.' }
];

export interface LoadoutData {
  id: number;
  playerId: number;
  loadoutIndex: number;
  name: string;
  fleetComposition: { [unitId: string]: number };
  squad1: string[];
  squad2: string[];
  squad3: string[];
  squad4: string[];
  squadLeaders?: { [squadKey: string]: number }; // Stores index of squad leader per squad
}

interface GarageProps {
  player: { id: number; username: string };
  onLaunchPractice: (activeLoadout: LoadoutData) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export type FleetTier = 'FLAGSHIP' | 'BATTALION_1' | 'BATTALION_2';

const ASSET_FILENAME_MAP: { [unitId: string]: string } = {
  viper_interceptor: 'viper.png', recon_probe: 'recon.png', phantom_transport: 'phantom.png', ion_interceptor: 'ion.png',
  mining_barge: 'mining.png', supply_tender: 'supply.png', plasma_skimmer: 'plasma.png', grav_extractor: 'grav.png',
  assault_gunship: 'assault.png', command_escort: 'assault.png', aegis_repair: 'aegis.png', vortex_minelayer: 'vortex.png', 
  lancer_corvette: 'lancer.png', cryo_flak: 'cryo.png', specter_jammer: 'specter.png', aegis_wall: 'wall.png', 
  torpedo_bomber: 'torpedo.png', warp_frigate: 'warp.png', gun_emplacement: 'turret.png', battalion_command_ship: 'flagship.png'
};

const PREVIEW_ROTATION_CSS: { [unitId: string]: string } = {
  flagship: 'rotate(90deg)', battalion_command_ship: 'rotate(90deg)', command_escort: 'rotate(90deg)', 
  aegis_repair: 'rotate(90deg)', assault_gunship: 'rotate(90deg)', grav_extractor: 'rotate(90deg)', 
  mining_barge: 'rotate(90deg)', plasma_skimmer: 'rotate(90deg)', specter_jammer: 'rotate(90deg)', 
  supply_tender: 'rotate(90deg)', torpedo_bomber: 'rotate(90deg)', vortex_minelayer: 'rotate(90deg)', 
  lancer_corvette: 'rotate(-90deg)', viper_interceptor: 'rotate(-90deg)',
  cryo_flak: 'rotate(0deg)', ion_interceptor: 'rotate(0deg)', phantom_transport: 'rotate(0deg)', 
  recon_probe: 'rotate(0deg)', gun_emplacement: 'rotate(0deg)', aegis_wall: 'rotate(0deg)', 
  warp_frigate: 'rotate(0deg)'
};

export const GarageDashboard: React.FC<GarageProps> = ({ player, onLaunchPractice, onLogout, onNavigateHome }) => {
  const [loadouts, setLoadouts] = useState<LoadoutData[]>([]);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [activeTier, setActiveTier] = useState<FleetTier>('FLAGSHIP');
  const [activeLoadout, setActiveLoadout] = useState<LoadoutData | null>(null);
  const [inspectedUnit, setInspectedUnit] = useState<UnitBlueprint>(UNIT_DB[0]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const [pickerState, setPickerState] = useState<{ squadKey: 'squad1' | 'squad2' | 'squad3' | 'squad4'; slotIdx: number } | null>(null);

  useEffect(() => {
    fetchLoadouts();
  }, [player.id]);

  const fetchLoadouts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/loadouts?playerId=${player.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = data.map(l => ({
          ...l,
          fleetComposition: typeof l.fleetComposition === 'string' ? JSON.parse(l.fleetComposition) : (l.fleetComposition || {}),
          squad1: typeof l.squad1 === 'string' ? JSON.parse(l.squad1) : (l.squad1 || []),
          squad2: typeof l.squad2 === 'string' ? JSON.parse(l.squad2) : (l.squad2 || []),
          squad3: typeof l.squad3 === 'string' ? JSON.parse(l.squad3) : (l.squad3 || []),
          squad4: typeof l.squad4 === 'string' ? JSON.parse(l.squad4) : (l.squad4 || []),
          squadLeaders: typeof l.squadLeaders === 'string' ? JSON.parse(l.squadLeaders) : (l.squadLeaders || {})
        }));
        setLoadouts(formatted);
        const current = formatted.find(l => l.loadoutIndex === activeSlot) || formatted[0];
        if (current) setActiveLoadout(JSON.parse(JSON.stringify(current)));
      }
    } catch (err) {
      setStatusMsg('Telemetry connection failed.');
    }
  };

  const handleSelectSlot = (slotIdx: number) => {
    setActiveSlot(slotIdx);
    setPickerState(null);
    const selected = loadouts.find(l => l.loadoutIndex === slotIdx);
    if (selected) {
      setActiveLoadout(JSON.parse(JSON.stringify(selected)));
    } else {
      setActiveLoadout({
        id: 0, playerId: player.id, loadoutIndex: slotIdx, name: `Loadout ${slotIdx}`,
        fleetComposition: {}, squad1: [], squad2: [], squad3: [], squad4: [], squadLeaders: {}
      });
    }
  };

  const handleClearLoadout = () => {
    if (!activeLoadout) return;
    setActiveLoadout({
      ...activeLoadout,
      fleetComposition: {},
      squad1: [],
      squad2: [],
      squad3: [],
      squad4: [],
      squadLeaders: {}
    });
    setPickerState(null);
    setStatusMsg('SLOT CLEARED');
  };

  const updateFleetQuantity = (unitId: string, delta: number) => {
    if (!activeLoadout) return;
    const current = activeLoadout.fleetComposition[unitId] || 0;
    const nextVal = Math.max(0, current + delta);
    
    const newComp = { ...activeLoadout.fleetComposition, [unitId]: nextVal };
    if (nextVal === 0) {
      delete newComp[unitId];
      (['squad1', 'squad2', 'squad3', 'squad4'] as const).forEach(sq => {
        activeLoadout[sq] = activeLoadout[sq].filter(id => id !== unitId);
      });
    }

    setActiveLoadout({ ...activeLoadout, fleetComposition: newComp });
  };

  const calculateTotalWeight = () => {
    if (!activeLoadout) return 0;
    return Object.entries(activeLoadout.fleetComposition).reduce((sum, [uId, count]) => {
      const u = UNIT_DB.find(x => x.id === uId);
      return sum + (u ? u.weight * count : 0);
    }, 0);
  };

  const getAssignedCount = (unitId: string) => {
    if (!activeLoadout) return 0;
    const allSquads = [...activeLoadout.squad1, ...activeLoadout.squad2, ...activeLoadout.squad3, ...activeLoadout.squad4];
    return allSquads.filter(id => id === unitId).length;
  };

  const assignUnitToSlot = (squadKey: 'squad1' | 'squad2' | 'squad3' | 'squad4', slotIdx: number, unitId: string) => {
    if (!activeLoadout) return;
    const arr = [...activeLoadout[squadKey]];
    arr[slotIdx] = unitId;
    setActiveLoadout({ ...activeLoadout, [squadKey]: arr });
    setPickerState(null);
  };

  const removeUnitFromSlot = (squadKey: 'squad1' | 'squad2' | 'squad3' | 'squad4', slotIdx: number) => {
    if (!activeLoadout) return;
    const arr = [...activeLoadout[squadKey]];
    arr.splice(slotIdx, 1);
    
    // Reset Leader designation if the leader slot was removed
    const leaders = { ...(activeLoadout.squadLeaders || {}) };
    if (leaders[squadKey] === slotIdx) {
      delete leaders[squadKey];
    }

    setActiveLoadout({ ...activeLoadout, [squadKey]: arr, squadLeaders: leaders });
  };

  const toggleSquadLeader = (squadKey: string, slotIdx: number) => {
    if (!activeLoadout) return;
    const currentLeaders = { ...(activeLoadout.squadLeaders || {}) };
    
    if (currentLeaders[squadKey] === slotIdx) {
      delete currentLeaders[squadKey]; // Toggle off
    } else {
      currentLeaders[squadKey] = slotIdx; // Set as leader
    }

    setActiveLoadout({ ...activeLoadout, squadLeaders: currentLeaders });
  };

  const saveCurrentLoadout = async () => {
    if (!activeLoadout) return;
    setSaving(true);
    setStatusMsg('');

    try {
      const payload = {
        playerId: player.id,
        loadoutIndex: activeLoadout.loadoutIndex,
        name: activeLoadout.name,
        fleetComposition: activeLoadout.fleetComposition,
        squad1: activeLoadout.squad1,
        squad2: activeLoadout.squad2,
        squad3: activeLoadout.squad3,
        squad4: activeLoadout.squad4,
        squadLeaders: activeLoadout.squadLeaders || {}
      };

      const res = await fetch(`${API_BASE_URL}/api/loadouts/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatusMsg('LOADOUT SAVED TO DATABASE');
        fetchLoadouts();
      } else {
        setStatusMsg('SAVE FAILED');
      }
    } catch (err) {
      setStatusMsg('SERVER ERROR');
    } finally {
      setSaving(false);
    }
  };

  if (!activeLoadout) return <div className="text-cyan-400 bg-[#0b0e14] h-screen p-5 font-mono">INITIALIZING HANGAR BAY...</div>;

  const totalWeight = calculateTotalWeight();
  const isOverCapacity = totalWeight > 100;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col p-2 gap-2 font-mono select-none">
      
      {/* UNIFIED COMPACT COMMAND HEADER */}
      <header className="bg-[#0f1115] border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between shadow-lg shrink-0 gap-4">
        
        {/* Branding & Pilot */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">
            ⚡
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white uppercase leading-tight">Hangar Bay Command</h1>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Pilot: {player.username}</p>
          </div>
        </div>

        {/* Slot Selector & Fleet Tier Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#161922] p-0.5 rounded-lg border border-slate-800 gap-1 shrink-0">
            {[1, 2, 3, 4, 5].map(idx => (
              <button
                key={idx}
                onClick={() => handleSelectSlot(idx)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${activeSlot === idx ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Slot 0{idx}
              </button>
            ))}
          </div>

          <div className="flex bg-[#161922] p-0.5 rounded-lg border border-slate-800 gap-1 shrink-0">
            {(['FLAGSHIP', 'BATTALION_1', 'BATTALION_2'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${activeTier === tier ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {tier.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Loadout Name & Weight Bar */}
        <div className="flex items-center gap-3 bg-[#161922] px-3 py-1 rounded-lg border border-slate-800 flex-1 max-w-xs">
          <input 
            type="text" 
            value={activeLoadout.name} 
            onChange={(e) => setActiveLoadout({ ...activeLoadout, name: e.target.value })}
            className="bg-transparent text-[11px] font-bold text-cyan-400 focus:outline-none w-28 truncate"
          />
          <div className="flex-1">
            <div className={`flex justify-between text-[9px] font-bold uppercase mb-0.5 ${isOverCapacity ? 'text-red-400' : 'text-slate-400'}`}>
              <span>Weight</span>
              <span>{totalWeight}/100</span>
            </div>
            <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${isOverCapacity ? 'bg-red-500' : 'bg-cyan-400'}`} 
                style={{ width: `${Math.min((totalWeight / 100) * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleClearLoadout}
            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-black px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider transition-all"
            title="Wipe current loadout"
          >
            Clear
          </button>
          <button 
            onClick={saveCurrentLoadout} 
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider transition-all"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={onNavigateHome}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all"
          >
            Menu
          </button>
          <button 
            onClick={onLogout}
            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all"
          >
            ✕
          </button>
        </div>

      </header>

      {/* MAIN 3-COLUMN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 flex-1 min-h-0">
        
        {/* COLUMN 1: REQUISITION CATALOG (Scrollable) */}
        <div className="md:col-span-3 bg-[#0f1115] border border-slate-800/80 rounded-xl p-2.5 flex flex-col min-h-0 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2 shrink-0">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Catalog</h2>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Stock / Asgn</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {UNIT_DB.map(unit => {
              const count = activeLoadout.fleetComposition[unit.id] || 0;
              const assigned = getAssignedCount(unit.id);
              const isSelected = inspectedUnit.id === unit.id;

              return (
                <div 
                  key={unit.id}
                  onClick={() => setInspectedUnit(unit)}
                  className={`border rounded-lg p-2 flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'bg-cyan-500/10 border-cyan-400' : 'bg-[#161922] border-slate-800 hover:border-cyan-500/50'}`}
                >
                  <div>
                    <div className="text-[10px] font-bold text-slate-200">[{unit.weight}W] {unit.name}</div>
                    <div className={`text-[9px] font-medium ${assigned < count ? 'text-cyan-400' : 'text-slate-400'}`}>
                      Stock: {count} | Assigned: {assigned}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-[#0f1115] p-0.5 rounded border border-slate-800" onClick={e => e.stopPropagation()}>
                    <button onClick={() => updateFleetQuantity(unit.id, -1)} className="w-4 h-4 bg-slate-800 hover:bg-slate-700 text-red-400 rounded flex items-center justify-center text-[10px] font-bold">-</button>
                    <span className="w-3 text-center text-[10px] font-bold text-white">{count}</span>
                    <button onClick={() => updateFleetQuantity(unit.id, 1)} className="w-4 h-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded flex items-center justify-center text-[10px] font-bold">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: HOTKEY SQUADS (Strict 4 Rows Grid) */}
        <div className="md:col-span-6 bg-[#0f1115] border border-slate-800/80 rounded-xl p-2.5 flex flex-col min-h-0 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2 shrink-0">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Tactical Squads — {activeTier.replace('_', ' ')} (4 Formations x 5 Slots)
            </h2>
          </div>

          <div className="flex-1 grid grid-rows-4 gap-2 min-h-0">
            {(['squad1', 'squad2', 'squad3', 'squad4'] as const).map((sqKey, sqIdx) => {
              const sqList = activeLoadout[sqKey];
              const leaderIdx = activeLoadout.squadLeaders?.[sqKey];

              return (
                <div key={sqKey} className="bg-[#161922] border border-slate-800 rounded-lg p-2 flex flex-col justify-between min-h-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Formation [{sqIdx + 1}]</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{sqList.length} / 5 Slots</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 flex-1 min-h-0">
                    {[0, 1, 2, 3, 4].map(slotIdx => {
                      const unitId = sqList[slotIdx];
                      const unitObj = unitId ? UNIT_DB.find(u => u.id === unitId) : null;
                      const isLeader = leaderIdx === slotIdx;

                      if (unitObj) {
                        return (
                          <div 
                            key={slotIdx}
                            onClick={() => setPickerState({ squadKey: sqKey, slotIdx })} // Swap unit by clicking box
                            className={`border rounded-md p-1.5 flex flex-col justify-between shadow-sm cursor-pointer transition-all ${
                              isLeader ? 'bg-amber-500/10 border-amber-400' : 'bg-cyan-500/10 border-cyan-400/80'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={`text-[9px] font-black truncate ${isLeader ? 'text-amber-400' : 'text-cyan-400'}`}>{unitObj.shortName}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleSquadLeader(sqKey, slotIdx); }}
                                className={`text-[8px] font-bold px-1 rounded transition-all ${
                                  isLeader ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-amber-400'
                                }`}
                                title="Set Squad Leader"
                              >
                                LDR
                              </button>
                            </div>

                            <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold">
                              <span>[{unitObj.weight}W]</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeUnitFromSlot(sqKey, slotIdx); }}
                                className="text-red-400 hover:text-red-300 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={slotIdx}
                          onClick={() => setPickerState({ squadKey: sqKey, slotIdx })}
                          className="bg-[#0f1115] border border-dashed border-slate-800 rounded-md flex items-center justify-center text-[9px] text-slate-500 font-bold hover:border-cyan-500 hover:text-cyan-400 cursor-pointer"
                        >
                          + Empty
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {statusMsg && <div className="text-cyan-400 text-[10px] text-center my-1">{statusMsg}</div>}

          <button
            disabled={isOverCapacity || totalWeight === 0}
            onClick={() => onLaunchPractice(activeLoadout)}
            className={`w-full mt-2 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-lg shrink-0 ${
              isOverCapacity || totalWeight === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
            }`}
          >
            {isOverCapacity ? 'OVER CAPACITY' : totalWeight === 0 ? 'REQUISITION FLEET FIRST' : 'INITIALIZE PRACTICE MATCH'}
          </button>
        </div>

        {/* COLUMN 3: TELEMETRY INSPECTOR (Scrollable with Squared Preview) */}
        <div className="md:col-span-3 bg-[#0f1115] border border-slate-800/80 rounded-xl p-2.5 flex flex-col min-h-0 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2 shrink-0">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Telemetry</h2>
          </div>

          <div className="flex flex-col flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
            
            {/* SQUARED ASSET PREVIEW WINDOW */}
            <div className="bg-[#161922] border border-slate-800 rounded-lg aspect-square w-full flex flex-col items-center justify-center relative shrink-0 p-3 shadow-inner">
              <img 
                src={new URL(`../assets/${ASSET_FILENAME_MAP[inspectedUnit.id] || 'viper.png'}`, import.meta.url).href} 
                alt={inspectedUnit.name}
                className="max-h-[90px] max-w-[110px] object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                style={{ transform: PREVIEW_ROTATION_CSS[inspectedUnit.id] || 'rotate(0deg)' }}
              />
              <span className="text-cyan-400 font-black text-xs tracking-wider uppercase mt-3 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                [{inspectedUnit.name}]
              </span>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-1.5 shrink-0">
              <div className="bg-[#161922] border border-slate-800 rounded-lg p-1.5">
                <div className="text-[8px] font-bold text-slate-500 uppercase">Weight</div>
                <div className="text-[10px] font-black text-white">{inspectedUnit.weight} SLOTS</div>
              </div>
              <div className="bg-[#161922] border border-slate-800 rounded-lg p-1.5">
                <div className="text-[8px] font-bold text-slate-500 uppercase">Speed</div>
                <div className="text-[10px] font-black text-white">{inspectedUnit.speed}</div>
              </div>
              <div className="bg-[#161922] border border-slate-800 rounded-lg p-1.5">
                <div className="text-[8px] font-bold text-slate-500 uppercase">Shields</div>
                <div className="text-[10px] font-black text-cyan-400">{inspectedUnit.shields} / QUAD</div>
              </div>
              <div className="bg-[#161922] border border-slate-800 rounded-lg p-1.5">
                <div className="text-[8px] font-bold text-slate-500 uppercase">Hull</div>
                <div className="text-[10px] font-black text-red-400">{inspectedUnit.hull} / QUAD</div>
              </div>
            </div>

            {/* Doctrine Description */}
            <div className="bg-[#161922] border border-slate-800 rounded-lg p-2 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">Tactical Doctrine</span>
              <p className="text-[9px] text-slate-400 leading-tight font-medium">{inspectedUnit.doctrine}</p>
            </div>

          </div>
        </div>

      </div>

      {/* UNIT SELECTOR MODAL (Swap / Assign) */}
      {pickerState && (
        <div 
          onClick={() => setPickerState(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-[#0f1115] border border-cyan-400 rounded-xl p-4 flex flex-col gap-3 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                Select Unit for Squad [{pickerState.squadKey.replace('squad', '')}]
              </span>
              <button onClick={() => setPickerState(null)} className="text-red-400 font-bold hover:text-red-300">✕</button>
            </div>

            <div className="overflow-y-auto max-h-60 space-y-2 pr-1">
              {Object.entries(activeLoadout.fleetComposition).map(([uId, reqCount]) => {
                const assigned = getAssignedCount(uId);
                const unassignedStock = reqCount - assigned;
                
                // Allow selecting unit if stock is available OR if it's already assigned here (swap logic)
                const isCurrentlyAssignedHere = activeLoadout[pickerState.squadKey][pickerState.slotIdx] === uId;
                if (unassignedStock <= 0 && !isCurrentlyAssignedHere) return null;

                const u = UNIT_DB.find(x => x.id === uId)!;
                return (
                  <button
                    key={uId}
                    onClick={() => assignUnitToSlot(pickerState.squadKey, pickerState.slotIdx, uId)}
                    className="w-full bg-[#161922] border border-slate-800 hover:border-cyan-400 rounded-lg p-2 flex justify-between items-center text-left transition-all"
                  >
                    <span className="text-xs font-bold text-white">{u.name}</span>
                    <span className="text-[10px] text-cyan-400 font-bold">Avail: {unassignedStock + (isCurrentlyAssignedHere ? 1 : 0)}</span>
                  </button>
                );
              })}

              {Object.entries(activeLoadout.fleetComposition).every(([uId, reqCount]) => (reqCount - getAssignedCount(uId)) <= 0) && (
                <div className="text-red-400 text-xs text-center py-4">
                  No unassigned units available in Catalog. Increase stock on the left panel first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
