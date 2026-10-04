import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export interface AgentOption {
  id: string;
  name: string;
  description: string;
  requiresReferenceFile?: boolean;
}

export const AVAILABLE_AGENTS: AgentOption[] = [
  { id: 'fraud-detection', name: 'agent.fraud_detection.name', description: 'agent.fraud_detection.description' },
  { id: 'missing-info', name: 'agent.missing_info.name', description: 'agent.missing_info.description' },
  {
    id: 'record-match',
    name: 'agent.record_match.name',
    description: 'agent.record_match.description',
    requiresReferenceFile: true,
  },
];

interface AgentSelectorProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  referenceFile: File | null;
  onReferenceFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selected,
  onChange,
  referenceFile,
  onReferenceFileChange,
  disabled,
}) => {
  const { t } = useLanguage();

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(a => a !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{t('agents.label')}</label>
      <div className="grid gap-2 sm:grid-cols-2">
        {AVAILABLE_AGENTS.map(agent => (
          <label
            key={agent.id}
            className={`flex items-start gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
              selected.includes(agent.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(agent.id)}
              onChange={() => toggle(agent.id)}
              disabled={disabled}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">🤖 {t(agent.name)}</p>
              <p className="text-xs text-gray-600">{t(agent.description)}</p>

              {agent.requiresReferenceFile && selected.includes(agent.id) && (
                <div className="mt-2" onClick={e => e.stopPropagation()}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('agents.reference_file.label')}
                  </label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    disabled={disabled}
                    onChange={e => onReferenceFileChange(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-500 file:text-white file:text-xs hover:file:bg-blue-600"
                  />
                  {referenceFile ? (
                    <p className="text-xs text-green-700 mt-1">✓ {referenceFile.name}</p>
                  ) : (
                    <p className="text-xs text-red-600 mt-1">{t('agents.reference_file.required')}</p>
                  )}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
