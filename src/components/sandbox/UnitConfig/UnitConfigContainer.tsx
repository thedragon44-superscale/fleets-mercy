// src/components/sandbox/UnitConfig/UnitConfigContainer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { UnitConfigHeader } from './UnitConfigHeader';
import { UnitConfigTabs } from './UnitConfigTabs';
import { MovementTab } from './tabs/MovementTab';
import { VitalsTab } from './tabs/VitalsTab';
import { CombatTab } from './tabs/CombatTab';
import { AiSensorTab } from './tabs/AiSensorTab';
import { LogisticsTab } from './tabs/LogisticsTab';
import { ConfigTabType, UnitConfigConfigPayload } from './types';
import { VariableDoc } from '../../../constants/variableDocs';
import { VariableInfoModal } from '../../common/VariableInfoModal';
import { useUnitTemplates } from '../../../hooks/useUnitTemplates';

interface UnitConfigContainerProps {
  isOpen: boolean;
  initialUnitId?: string;
  onClose: () => void;
  sendTemplateOverride?: (unitType: string, override: any) => void;
  embedded?: boolean;
}

export const UnitConfigContainer: React.FC<UnitConfigContainerProps> = ({
  isOpen,
  initialUnitId = 'flagship',
  onClose,
  sendTemplateOverride,
  embedded = false,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);
  const [activeTab, setActiveTab] = useState<ConfigTabType>('movement');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeDoc, setActiveDoc] = useState<VariableDoc | null>(null);

  const {
    templates,
    originalTemplates,
    updateLiveTemplate,
    revertUnitTemplate,
    saveUnitTemplateToDB,
    getModifiedFields,
  } = useUnitTemplates();

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  const modifiedFieldSet = useMemo(
    () => getModifiedFields(selectedUnitId),
    [templates, originalTemplates, selectedUnitId, getModifiedFields]
  );

  const modifiedFieldsList = useMemo(
    () => Array.from(modifiedFieldSet),
    [modifiedFieldSet]
  );

  const hasUnsavedChanges = modifiedFieldsList.length > 0;

  if (!isOpen) return null;

  const currentConfig: UnitConfigConfigPayload = templates[selectedUnitId] || {};

  const showTransientStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleConfigChange = (field: keyof UnitConfigConfigPayload, value: any) => {
    const updatedConfig = updateLiveTemplate(selectedUnitId, field, value);

    // Stream live adjustments over binary WebSocket
    if (sendTemplateOverride) {
      sendTemplateOverride(selectedUnitId, updatedConfig);
    }
  };

  const handleResetToDatabase = () => {
    const resetConfig = revertUnitTemplate(selectedUnitId);
    if (!resetConfig) return;

    if (sendTemplateOverride) {
      sendTemplateOverride(selectedUnitId, resetConfig);
    }

    showTransientStatus(`Reverted ${selectedUnitId} to DB baseline.`);
  };

  const saveConfigurationToDB = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const ok = await saveUnitTemplateToDB(selectedUnitId);
    setIsSaving(false);

    if (ok) {
      showTransientStatus(`Saved ${selectedUnitId} configuration to DB.`);
    } else {
      showTransientStatus('Failed to save configuration.');
    }
  };

  const bodyContent = (
    <>
      <UnitConfigTabs
        activeTab={activeTab}
        modifiedFields={modifiedFieldSet}
        onSelectTab={setActiveTab}
      />

      {hasUnsavedChanges && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-300 shrink-0">
          <span className="font-black uppercase tracking-wider shrink-0">
            ● {modifiedFieldsList.length} Unsaved {modifiedFieldsList.length === 1 ? 'Edit' : 'Edits'}
          </span>
          <span className="truncate text-amber-200/80">
            {modifiedFieldsList.slice(0, 4).join(', ')}
            {modifiedFieldsList.length > 4 ? ` +${modifiedFieldsList.length - 4} more` : ''}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 mb-2">
        {activeTab === 'movement' && (
          <MovementTab
            config={currentConfig}
            modifiedFields={modifiedFieldSet}
            onChange={handleConfigChange}
            onOpenDoc={setActiveDoc}
          />
        )}
        {activeTab === 'vitals' && (
          <VitalsTab
            config={currentConfig}
            modifiedFields={modifiedFieldSet}
            onChange={handleConfigChange}
            onOpenDoc={setActiveDoc}
          />
        )}
        {activeTab === 'combat' && (
          <CombatTab
            config={currentConfig}
            modifiedFields={modifiedFieldSet}
            onChange={handleConfigChange}
            onOpenDoc={setActiveDoc}
          />
        )}
        {activeTab === 'ai' && (
          <AiSensorTab
            config={currentConfig}
            modifiedFields={modifiedFieldSet}
            onChange={handleConfigChange}
            onOpenDoc={setActiveDoc}
          />
        )}
        {activeTab === 'logistics' && (
          <LogisticsTab
            config={currentConfig}
            modifiedFields={modifiedFieldSet}
            onChange={handleConfigChange}
            onOpenDoc={setActiveDoc}
          />
        )}
      </div>

      {statusMsg && (
        <div className="text-cyan-400 text-[10px] font-bold text-center py-1 bg-cyan-950/40 border border-cyan-500/30 rounded mb-2 shrink-0">
          {statusMsg}
        </div>
      )}

      <div className="flex flex-col gap-1.5 shrink-0 pt-2 border-t border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={handleResetToDatabase}
            disabled={!hasUnsavedChanges}
            className={`flex-1 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all border ${
              hasUnsavedChanges
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-600'
                : 'bg-slate-900/60 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
            title="Revert tweaks back to last database save or initial load"
          >
            🔄 Revert to DB / Last Save
          </button>
          <button
            onClick={saveConfigurationToDB}
            disabled={isSaving}
            className={`flex-1 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-md ${
              hasUnsavedChanges
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            {isSaving ? 'Saving...' : '💾 Save Spec Sheet'}
          </button>
        </div>
      </div>

      <VariableInfoModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
    </>
  );

  if (embedded) {
    return (
      <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden font-mono select-none">
        {bodyContent}
      </div>
    );
  }

  return (
    <div
      className="ui-interactive absolute top-4 left-[340px] w-[520px] max-h-[calc(100vh-90px)] bg-[#0f1115]/95 border border-cyan-500/40 rounded-xl p-4 z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <UnitConfigHeader
        selectedUnitId={selectedUnitId}
        onSelectUnit={setSelectedUnitId}
        onClose={onClose}
      />
      {bodyContent}
    </div>
  );
};
