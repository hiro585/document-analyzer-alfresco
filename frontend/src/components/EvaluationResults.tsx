import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api/client';
import type { AgentEvaluation as Evaluation } from '../types';

interface EvaluationResultsProps {
  evaluations: Evaluation[];
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

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({ evaluations }) => {
  const { t } = useLanguage();

  if (!evaluations || evaluations.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold text-gray-800 mb-2">{t('agents.results.heading')}</h4>
      <div className="space-y-2">
        {evaluations.map(evaluation => (
          <div key={evaluation.agentId} className={`border rounded-lg p-3 ${STATUS_STYLES[evaluation.status]}`}>
            <p className="text-sm font-semibold">
              {STATUS_ICON[evaluation.status]} {evaluation.agentName}
            </p>
            <p className="text-sm mt-1">{evaluation.summary}</p>
            {evaluation.findings.length > 0 && (
              <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                {evaluation.findings.map((finding, i) => (
                  <li key={i}>{finding}</li>
                ))}
              </ul>
            )}
            {evaluation.relatedDocuments && evaluation.relatedDocuments.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {evaluation.relatedDocuments.map(match => (
                  <li key={match.id}>
                    <a
                      href={api.getDocumentFileUrl(match.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline hover:text-blue-900"
                    >
                      {match.filename}
                    </a>
                    <span className="text-xs opacity-75">
                      {' '}
                      ({Math.round(match.score * 100)}% {t('agents.results.match')})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
