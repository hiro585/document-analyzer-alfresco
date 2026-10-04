import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export interface DetailTab {
  id: string;
  label: string;
  // Number of items, shown after the label
  count?: number;
  // Content still loading: shows "…" in place of the count
  loading?: boolean;
  // No content for this document: grayed out and not clickable
  disabled?: boolean;
  content: React.ReactNode;
}

export const DetailTabs: React.FC<{ tabs: DetailTab[] }> = ({ tabs }) => {
  const { t } = useLanguage();
  const [chosenId, setChosenId] = useState(tabs[0]?.id);

  // The chosen tab is kept while browsing documents; when it has no content for
  // the current one, show the first tab that does without forgetting the choice.
  const active = tabs.find(tab => tab.id === chosenId && !tab.disabled) ?? tabs.find(tab => !tab.disabled) ?? tabs[0];

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-gray-200 mb-2 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = tab.id === active.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => setChosenId(tab.id)}
              title={tab.disabled ? t('documents.tab.empty') : undefined}
              className={`px-2.5 py-1.5 -mb-px border-b-2 text-sm whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : tab.disabled
                    ? 'border-transparent text-gray-300 cursor-not-allowed'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.loading ? (
                <span className="ml-1 text-xs text-gray-400">…</span>
              ) : (
                tab.count !== undefined && (
                  <span className={`ml-1 text-xs ${tab.disabled ? '' : 'text-gray-400'}`}>({tab.count})</span>
                )
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{active.content}</div>
    </div>
  );
};
