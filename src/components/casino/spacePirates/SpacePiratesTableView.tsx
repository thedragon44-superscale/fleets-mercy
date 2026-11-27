// src/components/casino/spacePirates/SpacePiratesTableView.tsx
import React, { useEffect, useRef, useState } from 'react';
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
    consumeLatestSnapshot,
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

  // Debounce root App balance sync so combat wallet updates don't re-render the root App tree on every shot/kill
  const latestSeatBalanceRef = useRef<number | null>(null);
  const lastSyncedBalanceRef = useRef<number>(player.balanceCents);
  const onBalanceSyncRef = useRef(onBalanceSync);
  onBalanceSyncRef.current = onBalanceSync;

  useEffect(() => {
    if (!mySeat) return;
    latestSeatBalanceRef.current = mySeat.balanceCents;
    if (mySeat.balanceCents === lastSyncedBalanceRef.current) return;

    const timer = window.setTimeout(() => {
      if (
        latestSeatBalanceRef.current !== null &&
        latestSeatBalanceRef.current !== lastSyncedBalanceRef.current
      ) {
        lastSyncedBalanceRef.current = latestSeatBalanceRef.current;
        onBalanceSyncRef.current(latestSeatBalanceRef.current);
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [mySeat]);

  // Flush final wallet balance up to App immediately when exiting the table
  useEffect(() => {
    return () => {
      if (
        latestSeatBalanceRef.current !== null &&
        latestSeatBalanceRef.current !== lastSyncedBalanceRef.current
      ) {
        lastSyncedBalanceRef.current = latestSeatBalanceRef.current;
        onBalanceSyncRef.current(latestSeatBalanceRef.current);
      }
    };
  }, []);

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
          consumeLatestSnapshot={consumeLatestSnapshot}
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
