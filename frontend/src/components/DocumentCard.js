import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const DocumentCard = ({ document, onDelete, onClick }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };
    const getFileIcon = (fileType) => {
        if (fileType === 'pdf')
            return '📄';
        if (fileType === 'text')
            return '📝';
        return '🖼️';
    };
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer", onClick: () => onClick?.(document), children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("div", { className: "flex-1", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: getFileIcon(document.fileType) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-semibold text-gray-800 truncate", children: document.filename }), _jsx("p", { className: "text-xs text-gray-500", children: formatDate(document.uploadedAt) })] })] }) }), onDelete && (_jsx("button", { onClick: e => {
                            e.stopPropagation();
                            onDelete(document.id);
                        }, className: "ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm", children: "\uD83D\uDDD1\uFE0F" }))] }), _jsx("div", { className: "space-y-1", children: _jsxs("p", { className: "text-xs text-gray-600 line-clamp-2", children: [_jsx("span", { className: "font-semibold", children: "Prompt:" }), " ", document.originalPrompt] }) }), _jsxs("div", { className: "mt-3 pt-3 border-t border-gray-100", children: [_jsx("h4", { className: "text-xs font-semibold text-gray-700 mb-2", children: "Extracted:" }), _jsxs("div", { className: "space-y-1", children: [Object.entries(document.extractedData).slice(0, 3).map(([key, value]) => (_jsxs("div", { className: "text-xs", children: [_jsxs("span", { className: "text-gray-600", children: [key, ":"] }), ' ', _jsx("span", { className: "text-gray-800 truncate block", children: typeof value === 'string' ? value : JSON.stringify(value) })] }, key))), Object.keys(document.extractedData).length > 3 && (_jsxs("p", { className: "text-xs text-gray-500", children: ["+", Object.keys(document.extractedData).length - 3, " more fields"] }))] })] }), document.alfrescoNodeId && (_jsxs("div", { className: "mt-3 p-2 bg-green-50 border border-green-200 rounded", children: [_jsxs("p", { className: "text-xs text-green-700", children: ["\u2705 ", _jsx("strong", { children: "In Alfresco" })] }), _jsxs("p", { className: "text-xs text-green-600", children: ["Exported: ", formatDate(document.alfrescoExportedAt)] })] }))] }));
};
//# sourceMappingURL=DocumentCard.js.map