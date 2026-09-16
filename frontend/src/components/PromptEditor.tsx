import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface PromptEditorProps {
  onPromptChange: (prompt: string) => void;
  disabled?: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ onPromptChange, disabled }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [customPrompts, setCustomPrompts] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [newPromptName, setNewPromptName] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const data = await api.getPrompts();
      setTemplates(data.templates || []);
      setCustomPrompts(data.custom || []);
      if (data.templates?.length > 0) {
        const firstTemplate = data.templates[0];
        setSelectedPrompt(firstTemplate.id);
        setCustomPrompt(firstTemplate.prompt);
        onPromptChange(firstTemplate.prompt);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const handleTemplateSelect = (promptId: string) => {
    setSelectedPrompt(promptId);
    const prompt = [...templates, ...customPrompts].find(p => p.id === promptId);
    if (prompt) {
      setCustomPrompt(prompt.prompt);
      onPromptChange(prompt.prompt);
    }
  };

  const handleCustomPromptChange = (text: string) => {
    setCustomPrompt(text);
    setSelectedPrompt('');
    onPromptChange(text);
  };

  const handleSavePrompt = async () => {
    if (!newPromptName.trim() || !customPrompt.trim()) return;
    try {
      const saved = await api.savePrompt(newPromptName, customPrompt);
      setCustomPrompts([...customPrompts, saved]);
      setNewPromptName('');
      setShowSavePrompt(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const allPrompts = [...templates, ...customPrompts];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📋 Extraction Prompt
        </label>
        <div className="flex gap-2 mb-2">
          <select
            value={selectedPrompt}
            onChange={e => handleTemplateSelect(e.target.value)}
            disabled={disabled}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Choose a template...</option>
            {allPrompts.map(prompt => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name} {prompt.isTemplate ? '(template)' : '(custom)'}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={customPrompt}
          onChange={e => handleCustomPromptChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter or edit the extraction prompt..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 h-24 font-mono text-sm"
        />

        <button
          onClick={() => setShowSavePrompt(!showSavePrompt)}
          disabled={disabled}
          className="mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm disabled:opacity-50"
        >
          💾 Save Custom Prompt
        </button>
      </div>

      {showSavePrompt && (
        <div className="bg-gray-100 p-3 rounded-lg space-y-2">
          <input
            type="text"
            value={newPromptName}
            onChange={e => setNewPromptName(e.target.value)}
            placeholder="Prompt name..."
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSavePrompt}
              className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
            >
              Save
            </button>
            <button
              onClick={() => setShowSavePrompt(false)}
              className="flex-1 px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700 font-semibold mb-2">💡 Suggestions:</p>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>• Be specific: "Extract invoice number and total amount"</li>
          <li>• Request format: "Extract as JSON with fields..."</li>
          <li>• Include context: "From this receipt, extract..."</li>
        </ul>
      </div>
    </div>
  );
};
