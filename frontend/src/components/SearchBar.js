import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const SearchBar = ({ onSearch, disabled, placeholder }) => {
    const [query, setQuery] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "flex gap-2", children: [_jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), disabled: disabled, placeholder: placeholder || 'Search documents...', className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100" }), _jsx("button", { type: "submit", disabled: disabled || !query.trim(), className: "px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-400", children: "\uD83D\uDD0D" })] }));
};
//# sourceMappingURL=SearchBar.js.map