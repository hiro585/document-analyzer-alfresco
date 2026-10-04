import React from 'react';

export const ExtractedDataList: React.FC<{ data: Record<string, unknown> }> = ({ data }) => (
  <div className="bg-gray-50 p-2 rounded-lg space-y-1">
    {Object.entries(data).map(([key, value]) => (
      <div key={key} className="text-sm">
        <span className="font-mono text-gray-600">{key}:</span>{' '}
        <span className="text-gray-800">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</span>
      </div>
    ))}
  </div>
);
