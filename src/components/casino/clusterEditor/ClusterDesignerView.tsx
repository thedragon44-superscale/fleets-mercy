// src/components/casino/clusterEditor/ClusterDesignerView.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ClusterNodeSpec,
  SPClusterVariant,
  SPResourceConfig,
  computeClusterBoundingRadius,
  deleteClusterVariant,
  fetchClusterVariants,
  fetchSPConfig,
  saveClusterVariant,
} from '../../../services/clusterService';
import { ClusterEditorViewport } from './ClusterEditorViewport';
import { ClusterInspectorPanel } from './ClusterInspectorPanel';
import { ClusterLibrarySidebar } from './ClusterLibrarySidebar';

export interface ClusterDesignerViewProps {
  onBack: () => void;
}

function makeBlankVariant(): SPClusterVariant {
  const starterNodes: ClusterNodeSpec[] = [
    { dx: 0, dy: 0, radius: 36, is_node: true, slot_tier: 'common', pinned_resource: null },
    { dx: -75, dy: 30, radius: 32, is_node: false, slot_tier: null, pinned_resource: null },
  ];
  return {
    variantId: 0,
    name: 'New Asteroid Cluster',
    nodesLayout: starterNodes,
    boundingRadius: computeClusterBoundingRadius(starterNodes),
    scaleMin: 0.85,
    scaleMax: 1.2,
    speedMin: 0.25,
    speedMax: 0.55,
    spinRate: 0.002,
    minWraps: 2,
    maxWraps: 3,
    spawnWeight: 15,
    maxConcurrent: 2,
    isEnabled: true,
  };
}

export const ClusterDesignerView: React.FC<ClusterDesignerViewProps> = ({ onBack }) => {
  const [variants, setVariants] = useState<SPClusterVariant[]>([]);
  const [resources, setResources] = useState<Record<string, SPResourceConfig>>({});
  const [draft, setDraft] = useState<SPClusterVariant>(() => makeBlankVariant());
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAll = useCallback(async (selectVariantId?: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [cfg, list] = await Promise.all([fetchSPConfig(), fetchClusterVariants()]);
      setResources(cfg.resources || {});
      setVariants(list);

      if (list.length > 0) {
        const match =
          selectVariantId !== undefined
            ? list.find((v) => v.variantId === selectVariantId) || list[0]
            : list[0];
        setDraft({
          ...match,
          nodesLayout: match.nodesLayout.map((n) => ({ ...n })),
        });
        setSelectedNodeIndex(match.nodesLayout.length > 0 ? 0 : null);
        setDirty(false);
      } else {
        setDraft(makeBlankVariant());
        setSelectedNodeIndex(0);
        setDirty(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load cluster data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSelectVariant = (v: SPClusterVariant) => {
    setDraft({
      ...v,
      nodesLayout: v.nodesLayout.map((n) => ({ ...n })),
    });
    setSelectedNodeIndex(v.nodesLayout.length > 0 ? 0 : null);
    setDirty(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleCreateNew = () => {
    setDraft(makeBlankVariant());
    setSelectedNodeIndex(0);
    setDirty(true);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleDuplicate = (v: SPClusterVariant) => {
    setDraft({
      ...v,
      variantId: 0,
      name: `${v.name} Copy`,
      nodesLayout: v.nodesLayout.map((n) => ({ ...n })),
    });
    setSelectedNodeIndex(v.nodesLayout.length > 0 ? 0 : null);
    setDirty(true);
    setStatusMessage('Duplicated into unsaved draft — click Save to persist.');
    setErrorMessage(null);
  };

  const handleChangeDraft = (patch: Partial<SPClusterVariant>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      next.boundingRadius = computeClusterBoundingRadius(next.nodesLayout);
      return next;
    });
    setDirty(true);
    setStatusMessage(null);
  };

  const handleChangeNodes = (nodes: ClusterNodeSpec[]) => {
    handleChangeDraft({ nodesLayout: nodes });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await saveClusterVariant({
        ...draft,
        name: draft.name.trim(),
        boundingRadius: computeClusterBoundingRadius(draft.nodesLayout),
      });
      setStatusMessage(`Saved variant #${res.variantId} (Wrap R: ${res.boundingRadius}px). Live cache refreshed.`);
      await loadAll(res.variantId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save variant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (target: SPClusterVariant) => {
    if (target.variantId <= 0) return;
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteClusterVariant(target.variantId);
      setStatusMessage(`Deleted "${target.name}" and refreshed live cache.`);
      await loadAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete variant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (target: SPClusterVariant) => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await saveClusterVariant({ ...target, isEnabled: !target.isEnabled });
      await loadAll(draft.variantId > 0 ? draft.variantId : target.variantId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update enabled state');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex bg-[#070b14] overflow-hidden">
      <ClusterLibrarySidebar
        variants={variants}
        activeVariantId={draft.variantId}
        loading={loading}
        onSelect={handleSelectVariant}
        onCreateNew={handleCreateNew}
        onDuplicate={handleDuplicate}
        onToggleEnabled={handleToggleEnabled}
        onDelete={handleDelete}
        onBack={onBack}
      />

      <ClusterEditorViewport
        variant={draft}
        resources={resources}
        selectedNodeIndex={selectedNodeIndex}
        onSelectNode={setSelectedNodeIndex}
        onChangeNodes={handleChangeNodes}
      />

      <ClusterInspectorPanel
        variant={draft}
        saving={saving}
        dirty={dirty}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        onChange={handleChangeDraft}
        onSave={handleSave}
        onDelete={() => handleDelete(draft)}
      />
    </div>
  );
};
