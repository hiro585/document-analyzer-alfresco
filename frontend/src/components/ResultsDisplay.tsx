import React from 'react';

interface ResultsDisplayProps {
  data: Record<string, any> | null;
  loading?: boolean;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin text-2xl">⏳</div>
        <p className="ml-2 text-gray-600">Analyzing document...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-4">📊 Extracted Data</h3>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-2 pb-2 border-b border-gray-100 last:border-0">
            <span className="font-mono text-sm text-gray-600 w-32 truncate">{key}:</span>
            <span className="text-sm text-gray-800 break-all">
              {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
