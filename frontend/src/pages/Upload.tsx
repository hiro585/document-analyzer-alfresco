import React, { useState } from 'react';
import { api } from '../api/client';
import { UploadZone } from '../components/UploadZone';
import { PromptEditor } from '../components/PromptEditor';
import { ResultsDisplay } from '../components/ResultsDisplay';

interface UploadPageProps {
  onDocumentUploaded?: () => void;
}

export const Upload: React.FC<UploadPageProps> = ({ onDocumentUploaded }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
      setExtractedData(null);
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
  };

  const handleUpload = async () => {
    if (!selectedFile || !prompt.trim()) {
      setError('Please select a file and enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.uploadFile(selectedFile, prompt);
      setExtractedData(result.document.extractedData);
      setUploadedDoc(result.document);
      setSelectedFile(null);
      onDocumentUploaded?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed. Is Ollama running?';
      setError(errorMsg);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📤 Upload & Analyze</h2>

        <UploadZone onFilesSelected={handleFilesSelected} disabled={loading} />

        {selectedFile && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ✓ Selected: <strong>{selectedFile.name}</strong>
            </p>
          </div>
        )}

        <div className="mt-6">
          <PromptEditor onPromptChange={handlePromptChange} disabled={loading} />
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || !prompt.trim() || loading}
          className="mt-6 w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg disabled:bg-gray-400 transition-colors"
        >
          {loading ? '⏳ Analyzing...' : '🚀 Upload & Analyze'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">❌ {error}</p>
          </div>
        )}
      </div>

      {extractedData && (
        <div>
          <ResultsDisplay data={extractedData} />
          {uploadedDoc && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ Document uploaded successfully! ID: {uploadedDoc.id}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
