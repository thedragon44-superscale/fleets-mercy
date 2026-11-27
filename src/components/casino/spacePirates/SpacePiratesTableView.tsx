// src/components/casino/spacePirates/SpacePiratesTableView.tsx
import React, { useEffect, useState } from 'react';
import { useSpacePiratesSocket } from '../../../hooks/useSpacePiratesSocket';
import { SPConfigResponse, fetchSPConfig } from '../../../services/clusterService';
import { PlayerSession } from '../../../services/walletService';
import { DeployControlDeck } from './DeployControlDeck';
import { SpacePiratesViewport } from './SpacePiratesViewport';
import { TableSeatsHUD } from './TableSeatsHUD';

export interface SpacePiratesTableViewProps {
  tableId: string;
  player: PlayerSession;
  onBalanceSync: (balanceCents: number) => void;
  onExitToLobby: () => void;
}

export const SpacePiratesTableView: React.FC<SpacePiratesTableViewProps> = ({
  tableId,
  player,
  onBalanceSync,
  onExitToLobby,
}) => {
  const [config, setConfig] = useState<SPConfigResponse | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const {
    status,
    latestStateRef,
    hud,
    mySeat,
    joinSeat,
    leaveSeat,
    setMultiplier,
    deployUnit,
  } = useSpacePiratesSocket(tableId, player.id);

  // Load live PostgreSQL Space Pirates config once on table mount
  useEffect(() => {
    let active = true;
    fetchSPConfig()
      .then((cfg) => {
        if (active) setConfig(cfg);
      })
      .catch((err) => {
        if (active) {
          setConfigError(err instanceof Error ? err.message : 'Failed to load Space Pirates config');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Propagate live server-synced balance back up to App session state
  useEffect(() => {
    if (mySeat && mySeat.balanceCents !== player.balanceCents) {
      onBalanceSync(mySeat.balanceCents);
    }
  }, [mySeat, player.balanceCents, onBalanceSync]);

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col bg-[#03060c] overflow-hidden">
      {configError && (
        <div className="px-4 py-1.5 bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-xs font-mono text-center">
          {configError}
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex">
        <SpacePiratesViewport
          latestStateRef={latestStateRef}
          resources={config?.resources || {}}
        />

        <TableSeatsHUD
          seats={hud.seats}
          myPlayerId={player.id}
          isSeated={!!mySeat}
          onJoinSeat={(seatIndex) => joinSeat(player.id, seatIndex)}
        />
      </div>

      <DeployControlDeck
        status={status}
        hud={hud}
        mySeat={mySeat}
        fallbackBalanceCents={player.balanceCents}
        config={config}
        onJoinAnySeat={() => joinSeat(player.id, -1)}
        onLeaveSeat={leaveSeat}
        onExitToLobby={onExitToLobby}
        onSelectMultiplier={setMultiplier}
        onDeployUnit={deployUnit}
      />
    </div>
  );
};
