import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { api } from '../api/client';
export const PromptEditor = ({ onPromptChange, disabled }) => {
    const [templates, setTemplates] = useState([]);
    const [customPrompts, setCustomPrompts] = useState([]);
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
        }
        catch (error) {
            console.error('Failed to load prompts:', error);
        }
    };
    const handleTemplateSelect = (promptId) => {
        setSelectedPrompt(promptId);
        const prompt = [...templates, ...customPrompts].find(p => p.id === promptId);
        if (prompt) {
            setCustomPrompt(prompt.prompt);
            onPromptChange(prompt.prompt);
        }
    };
    const handleCustomPromptChange = (text) => {
        setCustomPrompt(text);
        setSelectedPrompt('');
        onPromptChange(text);
    };
    const handleSavePrompt = async () => {
        if (!newPromptName.trim() || !customPrompt.trim())
            return;
        try {
            const saved = await api.savePrompt(newPromptName, customPrompt);
            setCustomPrompts([...customPrompts, saved]);
            setNewPromptName('');
            setShowSavePrompt(false);
        }
        catch (error) {
            console.error('Failed to save prompt:', error);
        }
    };
    const allPrompts = [...templates, ...customPrompts];
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-700 mb-2", children: "\uD83D\uDCCB Extraction Prompt" }), _jsx("div", { className: "flex gap-2 mb-2", children: _jsxs("select", { value: selectedPrompt, onChange: e => handleTemplateSelect(e.target.value), disabled: disabled, className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100", children: [_jsx("option", { value: "", children: "Choose a template..." }), allPrompts.map(prompt => (_jsxs("option", { value: prompt.id, children: [prompt.name, " ", prompt.isTemplate ? '(template)' : '(custom)'] }, prompt.id)))] }) }), _jsx("textarea", { value: customPrompt, onChange: e => handleCustomPromptChange(e.target.value), disabled: disabled, placeholder: "Enter or edit the extraction prompt...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 h-24 font-mono text-sm" }), _jsx("button", { onClick: () => setShowSavePrompt(!showSavePrompt), disabled: disabled, className: "mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm disabled:opacity-50", children: "\uD83D\uDCBE Save Custom Prompt" })] }), showSavePrompt && (_jsxs("div", { className: "bg-gray-100 p-3 rounded-lg space-y-2", children: [_jsx("input", { type: "text", value: newPromptName, onChange: e => setNewPromptName(e.target.value), placeholder: "Prompt name...", className: "w-full px-2 py-1 border border-gray-300 rounded text-sm" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSavePrompt, className: "flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm", children: "Save" }), _jsx("button", { onClick: () => setShowSavePrompt(false), className: "flex-1 px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-sm", children: "Cancel" })] })] })), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3", children: [_jsx("p", { className: "text-xs text-blue-700 font-semibold mb-2", children: "\uD83D\uDCA1 Suggestions:" }), _jsxs("ul", { className: "text-xs text-blue-600 space-y-1", children: [_jsx("li", { children: "\u2022 Be specific: \"Extract invoice number and total amount\"" }), _jsx("li", { children: "\u2022 Request format: \"Extract as JSON with fields...\"" }), _jsx("li", { children: "\u2022 Include context: \"From this receipt, extract...\"" })] })] })] }));
};
//# sourceMappingURL=PromptEditor.js.map