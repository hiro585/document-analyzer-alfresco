import React, { useCallback, useEffect, useState } from 'react';
import { api, LlmStatus } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

// Check rarely while all is well; often while there's a problem, so the bar
// goes away soon after it's fixed.
const POLL_OK_MS = 60_000;
const POLL_PROBLEM_MS = 10_000;

type Status = LlmStatus | 'server_unreachable';

const Command: React.FC<{ children: string }> = ({ children }) => (
  <code className="bg-amber-100 px-1 rounded font-mono">{children}</code>
);

// Shown only when uploads and chat can't work: the backend or Ollama is down,
// or no usable model is installed.
export const OllamaStatusBanner: React.FC = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  // Bumped after every check, so the next poll is scheduled even when the
  // status is unchanged (e.g. 'server_unreachable' twice in a row).
  const [checkCount, setCheckCount] = useState(0);

  const check = useCallback(async () => {
    try {
      setStatus(await api.getLlmStatus());
    } catch {
      setStatus('server_unreachable');
    } finally {
      setCheckCount(n => n + 1);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const problem =
    status === null ? null : status === 'server_unreachable' ? 'server' : status.available ? null : status.reason;

  useEffect(() => {
    if (status === null) return;
    const timer = setTimeout(check, problem ? POLL_PROBLEM_MS : POLL_OK_MS);
    return () => clearTimeout(timer);
  }, [status, checkCount, problem, check]);

  // Dismissing hides this problem only: a different one shows again, and so
  // does the same one if it comes back after being fixed.
  useEffect(() => {
    if (!problem) setDismissed(null);
  }, [problem]);

  if (!problem || problem === dismissed) return null;

  const details = status !== 'server_unreachable' && status && !status.available ? status : undefined;
  const model = details?.model;
  const installed = details?.installed?.join(', ');

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
      <div className="max-w-[1920px] mx-auto px-4 py-1.5 flex items-start gap-3">
        <p className="flex-1">
          ⚠️ {problem === 'server' && t('status.server_unreachable')}
          {problem === 'unreachable' && t('status.ollama_unreachable')}
          {problem === 'no_models' && (
            <>
              {t('status.no_models')} <Command>ollama pull gemma3:4b</Command> {t('status.or')}{' '}
              <Command>ollama pull qwen3-vl:4b-instruct</Command>
              {t('status.sentence_end')} {t('status.choose_model')}
            </>
          )}
          {problem === 'model_not_set' && (
            <>
              {t('status.model_not_set')}
              {installed && ` ${t('status.installed').replace('{models}', installed)}`}
            </>
          )}
          {problem === 'model_missing' && model && (
            <>
              {t('status.model_missing').replace('{model}', model)} <Command>{`ollama pull ${model}`}</Command>{' '}
              {t('status.or_change_model')}
              {installed && ` ${t('status.installed').replace('{models}', installed)}`}
            </>
          )}
        </p>
        <button onClick={check} className="text-amber-800 underline hover:no-underline whitespace-nowrap">
          {t('status.check_again')}
        </button>
        <button
          onClick={() => setDismissed(problem)}
          title={t('status.dismiss')}
          className="text-amber-700 hover:text-amber-900 text-base leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};
