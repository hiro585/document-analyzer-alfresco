import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const ResultsDisplay = ({ data, loading }) => {
    if (loading) {
        return (_jsxs("div", { className: "flex items-center justify-center p-6", children: [_jsx("div", { className: "animate-spin text-2xl", children: "\u23F3" }), _jsx("p", { className: "ml-2 text-gray-600", children: "Analyzing document..." })] }));
    }
    if (!data)
        return null;
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-gray-800 mb-4", children: "\uD83D\uDCCA Extracted Data" }), _jsx("div", { className: "space-y-2", children: Object.entries(data).map(([key, value]) => (_jsxs("div", { className: "flex gap-2 pb-2 border-b border-gray-100 last:border-0", children: [_jsxs("span", { className: "font-mono text-sm text-gray-600 w-32 truncate", children: [key, ":"] }), _jsx("span", { className: "text-sm text-gray-800 break-all", children: typeof value === 'string' ? value : JSON.stringify(value, null, 2) })] }, key))) })] }));
};
//# sourceMappingURL=ResultsDisplay.js.map