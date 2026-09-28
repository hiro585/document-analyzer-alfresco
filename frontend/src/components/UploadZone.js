import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const UploadZone = ({ onFilesSelected, disabled }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled)
            setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (disabled)
            return;
        const files = Array.from(e.dataTransfer.files).filter(file => ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'].includes(file.type) ||
            file.name.endsWith('.txt'));
        if (files.length > 0)
            onFilesSelected(files);
    };
    const handleChange = (e) => {
        if (e.target.files) {
            onFilesSelected(Array.from(e.target.files));
        }
    };
    return (_jsxs("div", { onDragEnter: handleDrag, onDragLeave: handleDrag, onDragOver: handleDrag, onDrop: handleDrop, className: `
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}
      `, children: [_jsx("input", { type: "file", multiple: true, accept: ".pdf,.jpg,.jpeg,.png,.txt", onChange: handleChange, disabled: disabled, className: "hidden", id: "file-input" }), _jsxs("label", { htmlFor: "file-input", className: "block cursor-pointer", children: [_jsx("div", { className: "text-4xl mb-2", children: "\uD83D\uDCC4" }), _jsx("p", { className: "text-lg font-semibold text-gray-700 mb-1", children: isDragActive ? 'Drop files here' : 'Drag & drop your files here' }), _jsx("p", { className: "text-sm text-gray-500", children: "or click to select (PDF, JPG, PNG, TXT)" })] })] }));
};
//# sourceMappingURL=UploadZone.js.map