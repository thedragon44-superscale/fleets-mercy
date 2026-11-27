// src/components/casino/envStudio/EnvStudioView.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { SPResourceConfig, fetchSPConfig } from '../../../services/clusterService';
import {
  EnvBlueprint,
  EnvComponentSpec,
  EnvObjectType,
  OrbitingChildSpec,
  computeEnvBoundingRadius,
  createBlankBlueprint,
  deleteEnvBlueprint,
  fetchEnvBlueprints,
  saveEnvBlueprint,
} from '../../../services/envService';
import { EnvCanvasEditor } from './EnvCanvasEditor';
import { EnvInspectorPanel } from './EnvInspectorPanel';
import { EnvLibrarySidebar } from './EnvLibrarySidebar';

export interface EnvStudioViewProps {
  onBack?: () => void;
  embedded?: boolean;
  onBlueprintsChanged?: () => void;
}

export const EnvStudioView: React.FC<EnvStudioViewProps> = ({
  onBack,
  embedded = false,
  onBlueprintsChanged,
}) => {
  const [blueprints, setBlueprints] = useState<EnvBlueprint[]>([]);
  const [resources, setResources] = useState<Record<string, SPResourceConfig>>({});

  const [draft, setDraft] = useState<EnvBlueprint>(() => createBlankBlueprint('asteroid_cluster'));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAll = useCallback(async (selectId?: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [spCfg, bpList] = await Promise.all([
        fetchSPConfig().catch(() => null),
        fetchEnvBlueprints(),
      ]);
      if (spCfg?.resources) {
        setResources(spCfg.resources);
      }
      setBlueprints(bpList);

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
    setSelectedIndex(bp.components.length > 0 ? 0 : null);
    setDirty(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleCreateNew = (objectType: EnvObjectType) => {
    const fresh = createBlankBlueprint(objectType);
    setDraft(fresh);
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
      setStatusMessage(
        `Saved blueprint #${bpRes.blueprintId} (Wrap R: ${bpRes.boundingRadius}px) to PostgreSQL.`
      );
      await loadAll(bpRes.blueprintId);
      onBlueprintsChanged?.();
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
      onBlueprintsChanged?.();
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
      onBlueprintsChanged?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to toggle blueprint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={
        embedded
          ? 'flex-1 min-h-0 w-full flex bg-[#060a12] overflow-hidden'
          : 'fixed inset-0 w-screen h-screen flex bg-[#060a12] overflow-hidden'
      }
    >
      <EnvLibrarySidebar
        blueprints={blueprints}
        activeBlueprintId={draft.blueprintId}
        loading={loading}
        embedded={embedded}
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
        saving={saving}
        dirty={dirty}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        onChangeBlueprint={handleChangeBlueprint}
        onSave={handleSave}
        onDelete={() => handleDelete(draft)}
      />
    </div>
  );
};
