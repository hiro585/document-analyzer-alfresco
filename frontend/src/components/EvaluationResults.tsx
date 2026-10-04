import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { AgentEvaluation as Evaluation } from '../types';
import { AVAILABLE_AGENTS } from './AgentSelector';

interface EvaluationResultsProps {
  evaluations: Evaluation[];
  showHeading?: boolean;
}

const STATUS_STYLES: Record<Evaluation['status'], string> = {
  pass: 'bg-green-50 border-green-200 text-green-800',
  issues_found: 'bg-orange-50 border-orange-200 text-orange-800',
  error: 'bg-gray-50 border-gray-200 text-gray-600',
};

const STATUS_ICON: Record<Evaluation['status'], string> = {
  pass: '✅',
  issues_found: '⚠️',
  error: '❓',
};

// The agent name is saved in English with each result, so translate it by id;
// results from agents that no longer exist keep their saved name.
const AGENT_NAME_KEYS = new Map(AVAILABLE_AGENTS.map(agent => [agent.id, agent.name]));

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({ evaluations, showHeading = true }) => {
  const { t } = useLanguage();

  if (!evaluations || evaluations.length === 0) return null;

  const agentName = (evaluation: Evaluation) => {
    const key = AGENT_NAME_KEYS.get(evaluation.agentId);
    return key ? t(key) : evaluation.agentName;
  };

  return (
    <div>
      {showHeading && <h4 className="text-sm font-semibold text-gray-800 mb-1">{t('agents.results.heading')}</h4>}
      <div className="space-y-1.5">
        {evaluations.map(evaluation => (
          <div key={evaluation.agentId} className={`border rounded-lg px-3 py-2 ${STATUS_STYLES[evaluation.status]}`}>
            <p className="text-sm font-semibold">
              {STATUS_ICON[evaluation.status]} {agentName(evaluation)}
              <span className="ml-1.5 font-normal text-xs">— {t(`agents.results.status.${evaluation.status}`)}</span>
            </p>
            <p className="text-sm mt-1">
              {evaluation.summary || <span className="italic opacity-75">{t('agents.results.no_explanation')}</span>}
            </p>
            {evaluation.findings.length > 0 && (
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-sm">
                {evaluation.findings.map((finding, i) => (
                  <li key={i}>{finding}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
