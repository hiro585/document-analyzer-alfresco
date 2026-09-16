import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../api/client';
export const ChatPanel = ({ disabled }) => {
    const [messages, setMessages] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!query.trim() || loading)
            return;
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
        };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setLoading(true);
        try {
            const response = await api.chat(query);
            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.response,
            };
            setMessages(prev => [...prev, assistantMessage]);
        }
        catch (error) {
            const errorMessage = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Make sure Ollama is running.',
            };
            setMessages(prev => [...prev, errorMessage]);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-3", children: [messages.length === 0 && (_jsx("p", { className: "text-center text-gray-500 text-sm py-8", children: "\uD83D\uDCAC Ask questions about your documents" })), messages.map(message => (_jsx("div", { className: `flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsx("div", { className: `max-w-xs px-3 py-2 rounded-lg ${message.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-800'}`, children: _jsx("p", { className: "text-sm whitespace-pre-wrap break-words", children: message.content }) }) }, message.id))), loading && (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "bg-gray-100 text-gray-800 px-3 py-2 rounded-lg", children: _jsx("p", { className: "text-sm", children: "\u23F3 Thinking..." }) }) }))] }), _jsxs("form", { onSubmit: handleSendMessage, className: "border-t border-gray-200 p-4 flex gap-2", children: [_jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), disabled: disabled || loading, placeholder: "Ask about your documents...", className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100" }), _jsx("button", { type: "submit", disabled: disabled || loading || !query.trim(), className: "px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-400", children: "Send" })] })] }));
};
//# sourceMappingURL=ChatPanel.js.map