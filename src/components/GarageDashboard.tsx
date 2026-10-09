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
  { id: 'viper_interceptor', name: 'Viper Interceptor', shortName: 'Viper', weight: 1, classType: 'LIGHT', role: 'Air Superiority', speed: 'FAST (0.40)', shields: '0.50', hull: '1.00', cooldown: '8 Ticks', aggroRange: '600px', aiState: 'SEEK', doctrine: 'SEEK AI: Auto-detects hostiles within 600px. Closes distance at 0.40 speed to deliver kinetic auto-cannon bursts. Front shield drops to 0% for 8 ticks during weapon discharge.' },
  { id: 'recon_probe', name: 'Recon Probe', shortName: 'Recon', weight: 1, classType: 'LIGHT', role: 'Radar Expansion', speed: 'VERY FAST (0.45)', shields: '0.20', hull: '0.20', cooldown: '10 Ticks', aggroRange: '1200px', aiState: 'SEEK', doctrine: 'SEEK AI: Unarmed scout. Maintains maximum sensor range (1200px) from hostiles to paint targets through Fog of War while executing evasive vector maneuvers.' },
  { id: 'phantom_transport', name: 'Phantom Transport', shortName: 'Phantom', weight: 1, classType: 'LIGHT', role: 'Covert Drop', speed: 'FAST (0.40)', shields: '0.00', hull: '0.40', cooldown: '60 Ticks', aggroRange: '200px', aiState: 'GUARD', doctrine: 'GUARD AI: Remains unshielded (0.0 Shields) with heavy sensor cloaking. Stays within 100px of Flagship until ordered to execute boarding actions.' },
  { id: 'ion_interceptor', name: 'Ion Disabler', shortName: 'Ion Dis', weight: 1, classType: 'LIGHT', role: 'EMP Striker', speed: 'VERY FAST (0.45)', shields: '0.50', hull: '0.30', cooldown: '20 Ticks', aggroRange: '700px', aiState: 'SEEK', doctrine: 'SEEK AI: Fast flanker. Fires targeted ion pulses that strip 1.0 enemy shield per hit and lock down target engine RCS thrusters for 3 seconds.' },
  
  { id: 'mining_barge', name: 'Mining Barge', shortName: 'Miner', weight: 2, classType: 'INDUSTRIAL', role: 'Resource Drill', speed: 'SLOW (0.10)', shields: '0.00', hull: '3.00', cooldown: '40 Ticks', aggroRange: '300px', aiState: 'GUARD', doctrine: 'GUARD AI: Zero Shields | 3.0 Heavy Armor. Holds formation 150px off Flagship stern. Auto-deploys mining lasers when within 300px of Ferrite/Thorium celestial bodies.' },
  { id: 'supply_tender', name: 'Supply Tender', shortName: 'Tender', weight: 2, classType: 'INDUSTRIAL', role: 'Ammo Logistics', speed: 'MEDIUM (0.20)', shields: '0.80', hull: '1.50', cooldown: '60 Ticks', aggroRange: '300px', aiState: 'GUARD', doctrine: 'GUARD AI: Tethered logistics node. Automatically resupplies torpedoes and ballistic rounds to friendly units within a 200px radius every 60 ticks.' },
  { id: 'plasma_skimmer', name: 'Plasma Skimmer', shortName: 'Skimmer', weight: 2, classType: 'INDUSTRIAL', role: 'Energy Harvest', speed: 'FAST (0.35)', shields: '2.00', hull: '0.50', cooldown: '30 Ticks', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Equipped with 2.0 Front Shields. Skims volatile nebula clouds to synthesize energy cells for flagship heavy weapons.' },
  { id: 'grav_extractor', name: 'Grav-Extractor', shortName: 'Grav Ext', weight: 2, classType: 'INDUSTRIAL', role: 'Gravity Harvest', speed: 'MEDIUM (0.20)', shields: '1.50', hull: '1.50', cooldown: '45 Ticks', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Emits micro-gravity pulses to attract loose asteroid mineral nodes directly into the path of active Mining Barges.' },

  { id: 'assault_gunship', name: 'Assault Gunship', shortName: 'Gunship', weight: 3, classType: 'MEDIUM', role: 'Strafing Runs', speed: 'MEDIUM (0.30)', shields: '1.00', hull: '2.00', cooldown: '5 Ticks', aggroRange: '500px', aiState: 'SEEK', doctrine: 'SEEK AI: Heavy frontline brawler. Performs 500px strafing passes while discharging a high-rate-of-fire auto-cannon (5 tick cooldown).' },
  { id: 'aegis_repair', name: 'Aegis Repair', shortName: 'Aegis Rep', weight: 3, classType: 'MEDIUM', role: 'Field Maintenance', speed: 'MEDIUM (0.20)', shields: '1.50', hull: '0.50', cooldown: '20 Ticks', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Mobile repair station. Locks onto damaged friendly hulls within 400px, restoring 0.10 hull quadrant plating per pulse cycle.' },
  { id: 'vortex_minelayer', name: 'Vortex Minelayer', shortName: 'Minelayer', weight: 3, classType: 'MEDIUM', role: 'Spatial Traps', speed: 'FAST (0.35)', shields: '0.80', hull: '0.80', cooldown: '100 Ticks', aggroRange: '300px', aiState: 'GUARD', doctrine: 'GUARD AI: Patrols flagship perimeter and drops explosive vortex mines every 100 ticks to disrupt pursuing enemy light swarms.' },

  { id: 'lancer_corvette', name: 'Lancer Corvette', shortName: 'Lancer', weight: 4, classType: 'HEAVY', role: 'Anti-Armor Sniper', speed: 'SLOW (0.15)', shields: '0.50', hull: '1.50', cooldown: '60 Ticks', aggroRange: '1000px', aiState: 'SEEK', doctrine: 'SEEK AI: Stand-off sniper. Maintains 800px-1000px distance from targets to fire hyper-velocity railgun rounds (0.25 damage) every 60 ticks.' },
  { id: 'cryo_flak', name: 'Cryo-Flak Frigate', shortName: 'Cryo-Flak', weight: 4, classType: 'HEAVY', role: 'Swarm Disruption', speed: 'MEDIUM (0.20)', shields: '1.50', hull: '1.50', cooldown: '15 Ticks', aggroRange: '500px', aiState: 'GUARD', doctrine: 'GUARD AI: Fleet screen frigate. Fires AOE cryo-flak shells that deal area damage and freeze enemy engine RCS thrusters in a 150px burst radius.' },
  { id: 'specter_jammer', name: 'Specter Jammer', shortName: 'Jammer', weight: 4, classType: 'HEAVY', role: 'Electronic Warfare', speed: 'FAST (0.35)', shields: '1.00', hull: '0.80', cooldown: '45 Ticks', aggroRange: '800px', aiState: 'SEEK', doctrine: 'SEEK AI: EW Specialist. Generates active radar noise that breaks enemy auto-targeting lock-ons for all allied ships within its 800px aura.' },

  { id: 'aegis_wall', name: 'Aegis Wall', shortName: 'Aegis Wall', weight: 5, classType: 'CAPITAL', role: 'Directional Shield', speed: 'SLOW (0.15)', shields: '4.00', hull: '1.00', cooldown: 'Instant', aggroRange: '400px', aiState: 'GUARD', doctrine: 'GUARD AI: Heavy barrier ship. Matches flagship vector orientation, projecting a 4.0 front shield quadrant barrier to tank incoming capital fire.' },
  { id: 'torpedo_bomber', name: 'Torpedo Bomber', shortName: 'T. Bomber', weight: 5, classType: 'CAPITAL', role: 'Capital Siege', speed: 'SLOW (0.10)', shields: '2.00', hull: '2.50', cooldown: '90 Ticks', aggroRange: '700px', aiState: 'SEEK', doctrine: 'SEEK AI: Anti-flagship siege platform. Fires heavy plasma torpedoes designed to bypass enemy escort screens and strike capital rear thrusters.' },
  { id: 'warp_frigate', name: 'Warp Frigate', shortName: 'Warp Frig', weight: 5, classType: 'CAPITAL', role: 'Teleport Anchor', speed: 'VERY SLOW (0.05)', shields: '3.00', hull: '1.50', cooldown: '120 Ticks', aggroRange: '0px', aiState: 'GUARD', doctrine: 'GUARD AI: Spatial relay anchor. Opens a temporary micro-wormhole allowing reserve fleet units to bypass flight travel time and warp directly into battle.' },
  { id: 'gun_emplacement', name: 'Gun Emplacement', shortName: 'Turret', weight: 5, classType: 'CAPITAL', role: 'Static Defense', speed: 'STATIC (0.00)', shields: '2.00', hull: '4.00', cooldown: '30 Ticks', aggroRange: '800px', aiState: 'GUARD', doctrine: 'GUARD AI: Stationary defense platform (0.00 Speed | 4.0 Hull). Locks down high-value resource deposits with heavy twin-cannon battery fire.' }
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
}

interface GarageProps {
  player: { id: number; username: string };
  onLaunchPractice: (activeLoadout: LoadoutData) => void;
  onLogout: () => void;
  onNavigateHome: () => void; // Added callback prop definition
}

const ASSET_FILENAME_MAP: { [unitId: string]: string } = {
  viper_interceptor: 'viper.png', recon_probe: 'recon.png', phantom_transport: 'phantom.png', ion_interceptor: 'ion.png',
  mining_barge: 'mining.png', supply_tender: 'supply.png', plasma_skimmer: 'plasma.png', grav_extractor: 'grav.png',
  assault_gunship: 'assault.png', aegis_repair: 'aegis.png', vortex_minelayer: 'vortex.png', lancer_corvette: 'lancer.png',
  cryo_flak: 'cryo.png', specter_jammer: 'specter.png', aegis_wall: 'wall.png', torpedo_bomber: 'torpedo.png',
  warp_frigate: 'warp.png', gun_emplacement: 'turret.png'
};

const PREVIEW_ROTATION_CSS: { [unitId: string]: string } = {
  flagship: 'rotate(90deg)', aegis_repair: 'rotate(90deg)', assault_gunship: 'rotate(90deg)', 
  grav_extractor: 'rotate(90deg)', mining_barge: 'rotate(90deg)', plasma_skimmer: 'rotate(90deg)', 
  specter_jammer: 'rotate(90deg)', supply_tender: 'rotate(90deg)', torpedo_bomber: 'rotate(90deg)', 
  vortex_minelayer: 'rotate(90deg)',
  lancer_corvette: 'rotate(-90deg)', viper_interceptor: 'rotate(-90deg)',
  cryo_flak: 'rotate(0deg)', ion_interceptor: 'rotate(0deg)', phantom_transport: 'rotate(0deg)', 
  recon_probe: 'rotate(0deg)', gun_emplacement: 'rotate(0deg)', aegis_wall: 'rotate(0deg)', 
  warp_frigate: 'rotate(0deg)'
};

export const GarageDashboard: React.FC<GarageProps> = ({ player, onLaunchPractice, onLogout, onNavigateHome }) => {
  const [loadouts, setLoadouts] = useState<LoadoutData[]>([]);
  const [activeSlot, setActiveSlot] = useState<number>(1);
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
        fleetComposition: {}, squad1: [], squad2: [], squad3: [], squad4: []
      });
    }
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
    setActiveLoadout({ ...activeLoadout, [squadKey]: arr });
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
        squad4: activeLoadout.squad4
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

  const renderClassIcon = (classType: string, color = '#00f3ff') => {
    switch (classType) {
      case 'LIGHT':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill={color} style={{ minWidth: '14px' }}><polygon points="12,2 22,22 12,17 2,22" /></svg>;
      case 'INDUSTRIAL':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill={color} style={{ minWidth: '14px' }}><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" /></svg>;
      case 'MEDIUM':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill={color} style={{ minWidth: '14px' }}><path d="M12 2L2 12h4v8h12v-8h4L12 2z" /></svg>;
      case 'HEAVY':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill={color} style={{ minWidth: '14px' }}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
      case 'CAPITAL':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill={color} style={{ minWidth: '14px' }}><polygon points="12,1 24,12 12,23 0,12" /></svg>;
      default:
        return <circle cx="7" cy="7" r="5" fill={color} />;
    }
  };

  if (!activeLoadout) return <div style={{ color: '#00f3ff', background: '#050811', height: '100vh', padding: '20px', fontFamily: 'monospace' }}>INITIALIZING HANGAR BAY...</div>;

  const totalWeight = calculateTotalWeight();
  const isOverCapacity = totalWeight > 100;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', maxWidth: '100%', maxHeight: '100%', overflow: 'hidden', overscrollBehavior: 'none', background: '#050811', color: '#00f3ff', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '8px', boxSizing: 'border-box' }}>
      
      {/* TOP BAR: LOGO, LOADOUT SLOT TABS & RETURN CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #1e293b', padding: '6px 12px', marginBottom: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, color: '#00f3ff', fontSize: '1.1rem', letterSpacing: '1px' }}>HANGAR BAY COMMAND</h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b', borderLeft: '1px solid #334155', paddingLeft: '12px' }}>PILOT: {player.username.toUpperCase()}</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map(idx => (
            <button
              key={idx}
              onClick={() => handleSelectSlot(idx)}
              style={{
                padding: '4px 10px',
                background: activeSlot === idx ? '#00f3ff' : '#0f172a',
                color: activeSlot === idx ? '#050811' : '#94a3b8',
                border: `1px solid ${activeSlot === idx ? '#00f3ff' : '#334155'}`,
                fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem'
              }}
            >
              SLOT {idx}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={onNavigateHome} // Uses the clean callback prop instead of a window event
            style={{ padding: '4px 10px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #00f3ff', color: '#00f3ff', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' }}
          >
            &larr; MAIN MENU
          </button>
          <button onClick={onLogout} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #ff2a6d', color: '#ff2a6d', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* CAPACITY LOADOUT NAME BAR */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', background: 'rgba(15, 23, 42, 0.4)', padding: '6px 10px', border: '1px solid #1e293b', flexShrink: 0 }}>
        <input 
          type="text" 
          value={activeLoadout.name} 
          onChange={(e) => setActiveLoadout({ ...activeLoadout, name: e.target.value })}
          style={{ background: '#051120', border: '1px solid #00f3ff', color: '#00f3ff', padding: '4px 8px', fontFamily: 'monospace', fontSize: '0.85rem', width: '160px' }}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '2px', color: isOverCapacity ? '#ff2a6d' : '#e2e8f0' }}>
            <span>FLEET REQUISITION ALLOCATION</span>
            <span>{totalWeight} / 100 SLOTS</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${isOverCapacity ? '#ff2a6d' : '#00f3ff'}` }}>
            <div style={{ height: '100%', width: `${Math.min((totalWeight / 100) * 100, 100)}%`, background: isOverCapacity ? '#ff2a6d' : '#00f3ff', transition: 'width 0.2s' }} />
          </div>
        </div>

        <button onClick={saveCurrentLoadout} disabled={saving} style={{ padding: '5px 12px', background: '#f59e0b', color: '#050811', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {saving ? 'SAVING...' : 'SAVE LOADOUT'}
        </button>
      </div>

      {/* THREE FIXED COLUMNS */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 235px', gap: '6px', flex: 1, minHeight: 0, minWidth: 0 }}>
        
        {/* COLUMN 1: REQUISITION CATALOG */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.8rem', color: '#00f3ff', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #1e293b', paddingBottom: '4px', flexShrink: 0 }}>
            1. REQUISITION CATALOG
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '4px' }}>
            {UNIT_DB.map(unit => {
              const count = activeLoadout.fleetComposition[unit.id] || 0;
              const assigned = getAssignedCount(unit.id);
              const isSelected = inspectedUnit.id === unit.id;

              return (
                <div 
                  key={unit.id}
                  onClick={() => setInspectedUnit(unit)}
                  style={{
                    background: isSelected ? 'rgba(0, 243, 255, 0.1)' : '#090d1a',
                    border: `1px solid ${isSelected ? '#00f3ff' : '#1e293b'}`,
                    padding: '5px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {renderClassIcon(unit.classType, isSelected ? '#00f3ff' : '#64748b')}
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 'bold' }}>[{unit.weight}W] {unit.name}</div>
                      <div style={{ fontSize: '0.62rem', color: assigned < count ? '#00f3ff' : '#64748b' }}>
                        Stock: {count} | Assigned: {assigned}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => updateFleetQuantity(unit.id, -1)} style={{ width: '18px', height: '18px', background: '#1e293b', border: '1px solid #334155', color: '#ff2a6d', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}>-</button>
                    <span style={{ fontSize: '0.75rem', width: '16px', textAlign: 'center', color: '#e2e8f0' }}>{count}</span>
                    <button onClick={() => updateFleetQuantity(unit.id, 1)} style={{ width: '18px', height: '18px', background: '#1e293b', border: '1px solid #334155', color: '#00f3ff', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: HOTKEY DEPLOYMENT SQUADS */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0, minWidth: 0, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', borderBottom: '1px solid #1e293b', paddingBottom: '4px', flexShrink: 0 }}>
            2. HOTKEY DEPLOYMENT SQUADS (5 SLOTS MAX)
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0 }}>
            {(['squad1', 'squad2', 'squad3', 'squad4'] as const).map((sqKey, sqIdx) => {
              const sqList = activeLoadout[sqKey];
              return (
                <div key={sqKey} style={{ background: '#090d1a', border: '1px solid #1e293b', padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>
                    HOTKEY [{sqIdx + 1}] FORMATION ({sqList.length}/5 SLOTS)
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '4px' }}>
                    {[0, 1, 2, 3, 4].map(slotIdx => {
                      const unitId = sqList[slotIdx];
                      const unitObj = unitId ? UNIT_DB.find(u => u.id === unitId) : null;

                      if (unitObj) {
                        return (
                          <div 
                            key={slotIdx}
                            onClick={() => setInspectedUnit(unitObj)}
                            style={{
                              background: 'rgba(0, 243, 255, 0.1)', border: '1px solid #00f3ff', padding: '4px 6px',
                              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '42px', cursor: 'pointer', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                              {renderClassIcon(unitObj.classType, '#00f3ff')}
                              <span style={{ fontSize: '0.62rem', color: '#00f3ff', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                                {unitObj.shortName}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>[{unitObj.weight}W]</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeUnitFromSlot(sqKey, slotIdx); }}
                                style={{ background: 'transparent', border: 'none', color: '#ff2a6d', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 'bold' }}
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
                          style={{
                            background: '#050811', border: '1px dashed #334155', padding: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '0.62rem', color: '#475569' }}>+ EMPTY</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {statusMsg && <div style={{ color: '#00f3ff', fontSize: '0.7rem', textAlign: 'center' }}>{statusMsg}</div>}

          <button
            disabled={isOverCapacity || totalWeight === 0}
            onClick={() => onLaunchPractice(activeLoadout)}
            style={{
              padding: '8px', flexShrink: 0,
              background: isOverCapacity || totalWeight === 0 ? '#1e293b' : '#00f3ff',
              color: isOverCapacity || totalWeight === 0 ? '#64748b' : '#050811',
              border: 'none', fontWeight: 'bold', fontSize: '0.9rem',
              cursor: isOverCapacity || totalWeight === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace', letterSpacing: '1px'
            }}
          >
            {isOverCapacity ? 'OVER CAPACITY' : totalWeight === 0 ? 'REQUISITION FLEET FIRST' : 'INITIALIZE PRACTICE MATCH'}
          </button>
        </div>

        {/* COLUMN 3: TELEMETRY & SPECIFICATIONS */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.8rem', color: '#00f3ff', fontWeight: 'bold', borderBottom: '1px solid #1e293b', paddingBottom: '4px', marginBottom: '6px', flexShrink: 0 }}>
            3. TELEMETRY & SPECIFICATIONS
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
            <div style={{ height: '110px', background: '#050811', border: '1px solid #00f3ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '100%', boxSizing: 'border-box', padding: '6px', position: 'relative' }}>
              <img 
                src={new URL(`../assets/${ASSET_FILENAME_MAP[inspectedUnit.id] || 'viper.png'}`, import.meta.url).href} 
                alt={inspectedUnit.name}
                style={{ maxHeight: '60px', maxWidth: '80px', objectFit: 'contain', transform: PREVIEW_ROTATION_CSS[inspectedUnit.id] || 'rotate(0deg)', filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.4))' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                {renderClassIcon(inspectedUnit.classType, '#00f3ff')}
                <span style={{ color: '#00f3ff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {inspectedUnit.name.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', flexShrink: 0 }}>
              <div style={{ background: '#090d1a', border: '1px solid #1e293b', padding: '4px' }}>
                <div style={{ fontSize: '0.55rem', color: '#64748b' }}>WEIGHT</div>
                <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 'bold' }}>{inspectedUnit.weight} SLOTS</div>
              </div>
              <div style={{ background: '#090d1a', border: '1px solid #1e293b', padding: '4px' }}>
                <div style={{ fontSize: '0.55rem', color: '#64748b' }}>SPEED</div>
                <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 'bold' }}>{inspectedUnit.speed}</div>
              </div>
              <div style={{ background: '#090d1a', border: '1px solid #1e293b', padding: '4px' }}>
                <div style={{ fontSize: '0.55rem', color: '#64748b' }}>QUAD SHIELDS</div>
                <div style={{ fontSize: '0.75rem', color: '#00f3ff', fontWeight: 'bold' }}>{inspectedUnit.shields} / QUAD</div>
              </div>
              <div style={{ background: '#090d1a', border: '1px solid #1e293b', padding: '4px' }}>
                <div style={{ fontSize: '0.55rem', color: '#64748b' }}>HULL PLATING</div>
                <div style={{ fontSize: '0.75rem', color: '#ff2a6d', fontWeight: 'bold' }}>{inspectedUnit.hull} / QUAD</div>
              </div>
            </div>

            <div style={{ background: '#090d1a', border: '1px solid #1e293b', padding: '6px', flex: 1 }}>
              <div style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '3px' }}>TACTICAL AI DOCTRINE</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: '1.3' }}>{inspectedUnit.doctrine}</div>
            </div>
          </div>
        </div>

      </div>

      {pickerState && (
        <div 
          onClick={() => setPickerState(null)}
          style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(5, 8, 17, 0.85)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ width: '380px', maxHeight: '70vh', background: '#090d1a', border: '1px solid #00f3ff', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 0 20px rgba(0,243,255,0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#00f3ff', fontWeight: 'bold' }}>
                ASSIGN TO HOTKEY [{pickerState.squadKey.replace('squad', '')}]
              </span>
              <button onClick={() => setPickerState(null)} style={{ background: 'transparent', border: 'none', color: '#ff2a6d', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(activeLoadout.fleetComposition).map(([uId, reqCount]) => {
                const assigned = getAssignedCount(uId);
                const unassignedStock = reqCount - assigned;
                if (unassignedStock <= 0) return null;

                const u = UNIT_DB.find(x => x.id === uId)!;
                return (
                  <button
                    key={uId}
                    onClick={() => assignUnitToSlot(pickerState.squadKey, pickerState.slotIdx, uId)}
                    style={{
                      background: '#0f172a', border: '1px solid #00f3ff', color: '#e2e8f0',
                      padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontFamily: 'monospace', cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderClassIcon(u.classType, '#00f3ff')}
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{u.name}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#00f3ff' }}>Available: {unassignedStock}</span>
                  </button>
                );
              })}

              {Object.entries(activeLoadout.fleetComposition).every(([uId, reqCount]) => (reqCount - getAssignedCount(uId)) <= 0) && (
                <div style={{ color: '#ff2a6d', fontSize: '0.75rem', textAlign: 'center', padding: '10px' }}>
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
