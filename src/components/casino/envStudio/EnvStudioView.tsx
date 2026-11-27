// src/components/casino/envStudio/EnvStudioView.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SPResourceConfig, fetchSPConfig } from '../../../services/clusterService';
import {
  EnvBlueprint,
  EnvComponentSpec,
  EnvObjectType,
  ModeEnvPoolEntry,
  OrbitingChildSpec,
  computeEnvBoundingRadius,
  createBlankBlueprint,
  deleteEnvBlueprint,
  fetchEnvBlueprints,
  fetchModeEnvPools,
  saveEnvBlueprint,
  saveModeEnvPool,
} from '../../../services/envService';
import { EnvCanvasEditor } from './EnvCanvasEditor';
import { EnvInspectorPanel } from './EnvInspectorPanel';
import { EnvLibrarySidebar } from './EnvLibrarySidebar';

export interface EnvStudioViewProps {
  onBack: () => void;
}

function defaultPoolForBlueprint(
  bp: EnvBlueprint,
  rulesetId: number
): Omit<ModeEnvPoolEntry, 'poolId'> {
  const isGiant = bp.objectType === 'gas_giant' || bp.objectType === 'major_world';
  return {
    gameMode: 'space_pirates',
    rulesetId,
    blueprintId: bp.blueprintId,
    spawnWeight: isGiant ? 6 : 15,
    maxConcurrent: isGiant ? 1 : 2,
    scaleOverride: bp.objectType === 'gas_giant' ? 0.65 : bp.objectType === 'major_world' ? 0.6 : null,
    isEnabled: !isGiant,
  };
}

export const EnvStudioView: React.FC<EnvStudioViewProps> = ({ onBack }) => {
  const [blueprints, setBlueprints] = useState<EnvBlueprint[]>([]);
  const [pools, setPools] = useState<ModeEnvPoolEntry[]>([]);
  const [resources, setResources] = useState<Record<string, SPResourceConfig>>({});
  const [rulesetId, setRulesetId] = useState<number>(1);

  const [draft, setDraft] = useState<EnvBlueprint>(() => createBlankBlueprint('asteroid_cluster'));
  const [poolDraft, setPoolDraft] = useState<Omit<ModeEnvPoolEntry, 'poolId'>>(() =>
    defaultPoolForBlueprint(createBlankBlueprint('asteroid_cluster'), 1)
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const poolsByBlueprint = useMemo(() => {
    const map: Record<number, ModeEnvPoolEntry> = {};
    for (const p of pools) map[p.blueprintId] = p;
    return map;
  }, [pools]);

  const loadAll = useCallback(async (selectId?: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [spCfg, bpList, poolList] = await Promise.all([
        fetchSPConfig(),
        fetchEnvBlueprints(),
        fetchModeEnvPools('space_pirates'),
      ]);
      const rsId = spCfg.ruleset?.rulesetId || 1;
      setRulesetId(rsId);
      setResources(spCfg.resources || {});
      setBlueprints(bpList);
      setPools(poolList);

      const poolMap: Record<number, ModeEnvPoolEntry> = {};
      for (const p of poolList) poolMap[p.blueprintId] = p;

      if (bpList.length > 0) {
        const chosen =
          selectId !== undefined
            ? bpList.find((b) => b.blueprintId === selectId) || bpList[0]
            : bpList[0];
        setDraft({
          ...chosen,
          components: chosen.components.map((c) => ({ ...c })),
          orbitingChildren: chosen.orbitingChildren.map((ch) => ({ ...ch })),
          physicsProfile: {
            ...chosen.physicsProfile,
            immune_unit_classes: [...(chosen.physicsProfile.immune_unit_classes || [])],
          },
          motionProfile: { ...chosen.motionProfile },
        });
        const existingPool = poolMap[chosen.blueprintId];
        setPoolDraft(
          existingPool
            ? {
                gameMode: existingPool.gameMode,
                rulesetId: existingPool.rulesetId,
                blueprintId: existingPool.blueprintId,
                spawnWeight: existingPool.spawnWeight,
                maxConcurrent: existingPool.maxConcurrent,
                scaleOverride: existingPool.scaleOverride,
                isEnabled: existingPool.isEnabled,
              }
            : defaultPoolForBlueprint(chosen, rsId)
        );
        setSelectedIndex(chosen.components.length > 0 ? 0 : null);
        setDirty(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load Environment Studio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSelect = (bp: EnvBlueprint) => {
    setDraft({
      ...bp,
      components: bp.components.map((c) => ({ ...c })),
      orbitingChildren: bp.orbitingChildren.map((ch) => ({ ...ch })),
      physicsProfile: {
        ...bp.physicsProfile,
        immune_unit_classes: [...(bp.physicsProfile.immune_unit_classes || [])],
      },
      motionProfile: { ...bp.motionProfile },
    });
    const existingPool = poolsByBlueprint[bp.blueprintId];
    setPoolDraft(
      existingPool
        ? {
            gameMode: existingPool.gameMode,
            rulesetId: existingPool.rulesetId,
            blueprintId: existingPool.blueprintId,
            spawnWeight: existingPool.spawnWeight,
            maxConcurrent: existingPool.maxConcurrent,
            scaleOverride: existingPool.scaleOverride,
            isEnabled: existingPool.isEnabled,
          }
        : defaultPoolForBlueprint(bp, rulesetId)
    );
    setSelectedIndex(bp.components.length > 0 ? 0 : null);
    setDirty(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleCreateNew = (objectType: EnvObjectType) => {
    const fresh = createBlankBlueprint(objectType);
    setDraft(fresh);
    setPoolDraft(defaultPoolForBlueprint(fresh, rulesetId));
    setSelectedIndex(0);
    setDirty(true);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleDuplicate = (bp: EnvBlueprint) => {
    const copy: EnvBlueprint = {
      ...bp,
      blueprintId: 0,
      name: `${bp.name} Copy`,
      components: bp.components.map((c) => ({ ...c })),
      orbitingChildren: bp.orbitingChildren.map((ch) => ({ ...ch })),
      physicsProfile: {
        ...bp.physicsProfile,
        immune_unit_classes: [...(bp.physicsProfile.immune_unit_classes || [])],
      },
      motionProfile: { ...bp.motionProfile },
    };
    setDraft(copy);
    setPoolDraft({ ...defaultPoolForBlueprint(copy, rulesetId), blueprintId: 0 });
    setSelectedIndex(copy.components.length > 0 ? 0 : null);
    setDirty(true);
    setStatusMessage('Duplicated into unsaved draft.');
    setErrorMessage(null);
  };

  const handleChangeBlueprint = (patch: Partial<EnvBlueprint>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      next.boundingRadius = computeEnvBoundingRadius(next, blueprints);
      return next;
    });
    setDirty(true);
    setStatusMessage(null);
  };

  const handleChangeComponents = (components: EnvComponentSpec[]) =>
    handleChangeBlueprint({ components });

  const handleChangeOrbitingChildren = (orbitingChildren: OrbitingChildSpec[]) =>
    handleChangeBlueprint({ orbitingChildren });

  const handleChangePool = (patch: Partial<Omit<ModeEnvPoolEntry, 'poolId'>>) => {
    setPoolDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setStatusMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const bpRes = await saveEnvBlueprint({
        ...draft,
        name: draft.name.trim(),
        boundingRadius: computeEnvBoundingRadius(draft, blueprints),
      });
      await saveModeEnvPool({
        ...poolDraft,
        gameMode: 'space_pirates',
        rulesetId,
        blueprintId: bpRes.blueprintId,
      });
      setStatusMessage(
        `Saved blueprint #${bpRes.blueprintId} (Wrap R: ${bpRes.boundingRadius}px) & synced Space Pirates pool.`
      );
      await loadAll(bpRes.blueprintId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save blueprint');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (target: EnvBlueprint) => {
    if (target.blueprintId <= 0) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await deleteEnvBlueprint(target.blueprintId);
      setStatusMessage(`Deleted "${target.name}" and refreshed EnvCache.`);
      await loadAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete blueprint');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (target: EnvBlueprint) => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await saveEnvBlueprint({ ...target, isEnabled: !target.isEnabled });
      await loadAll(draft.blueprintId > 0 ? draft.blueprintId : target.blueprintId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to toggle blueprint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex bg-[#060a12] overflow-hidden">
      <EnvLibrarySidebar
        blueprints={blueprints}
        poolsByBlueprint={poolsByBlueprint}
        activeBlueprintId={draft.blueprintId}
        loading={loading}
        onSelect={handleSelect}
        onCreateNew={handleCreateNew}
        onDuplicate={handleDuplicate}
        onToggleEnabled={handleToggleEnabled}
        onDelete={handleDelete}
        onBack={onBack}
      />

      <EnvCanvasEditor
        blueprint={draft}
        allBlueprints={blueprints}
        resources={resources}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        onChangeComponents={handleChangeComponents}
        onChangeOrbitingChildren={handleChangeOrbitingChildren}
      />

      <EnvInspectorPanel
        blueprint={draft}
        allBlueprints={blueprints}
        poolDraft={poolDraft}
        saving={saving}
        dirty={dirty}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        onChangeBlueprint={handleChangeBlueprint}
        onChangePool={handleChangePool}
        onSave={handleSave}
        onDelete={() => handleDelete(draft)}
      />
    </div>
  );
};
