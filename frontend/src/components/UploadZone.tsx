import React, { useState } from 'react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, disabled }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter(file =>
      ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'].includes(file.type) ||
      file.name.endsWith('.txt')
    );
    if (files.length > 0) onFilesSelected(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}
      `}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.txt"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        id="file-input"
      />
      <label htmlFor="file-input" className="block cursor-pointer">
        <div className="text-4xl mb-2">📄</div>
        <p className="text-lg font-semibold text-gray-700 mb-1">
          {isDragActive ? 'Drop files here' : 'Drag & drop your files here'}
        </p>
        <p className="text-sm text-gray-500">or click to select (PDF, JPG, PNG, TXT)</p>
      </label>
    </div>
  );
};
