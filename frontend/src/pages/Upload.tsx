import React, { useState } from 'react';
import { api } from '../api/client';
import { UploadZone } from '../components/UploadZone';
import { PromptEditor } from '../components/PromptEditor';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { AgentSelector, AVAILABLE_AGENTS } from '../components/AgentSelector';
import { EvaluationResults } from '../components/EvaluationResults';
import { OcrTextViewer } from '../components/OcrTextViewer';
import { useLanguage } from '../contexts/LanguageContext';
import type { Document } from '../types';

interface UploadPageProps {
  onDocumentUploaded?: () => void;
}

export const Upload: React.FC<UploadPageProps> = ({ onDocumentUploaded }) => {
  const { t, language } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<Document | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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

  const requiresReferenceFile = selectedAgents.some(
    id => AVAILABLE_AGENTS.find(a => a.id === id)?.requiresReferenceFile,
  );

  const handleUpload = async () => {
    if (!selectedFile || !prompt.trim()) {
      setError(t('upload.error.no_file_prompt'));
      return;
    }
    if (requiresReferenceFile && !referenceFile) {
      setError(t('agents.reference_file.required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.uploadFile(selectedFile, prompt, language, selectedAgents, referenceFile);
      setExtractedData(result.document.extractedData);
      setUploadedDoc(result.document);
      setSelectedFile(null);
      setReferenceFile(null);
      setExportSuccess(false);
      onDocumentUploaded?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed. Is Ollama running?';
      setError(errorMsg);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToAlfresco = async () => {
    if (!uploadedDoc) return;

    setExporting(true);
    try {
      const result = await api.exportDocumentToAlfresco(uploadedDoc.id);
      if (result.success) {
        setExportSuccess(true);
        // Update uploadedDoc with Alfresco info
        setUploadedDoc({
          ...uploadedDoc,
          alfrescoNodeId: result.data.nodeId,
          alfrescoExportedAt: new Date().toISOString(),
        });
      } else {
        setError(`Failed to export: ${result.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('upload.heading')}</h2>

        <UploadZone onFilesSelected={handleFilesSelected} disabled={loading} />

        {selectedFile && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {t('upload.selected')} <strong>{selectedFile.name}</strong>
            </p>
          </div>
        )}

        <div className="mt-6">
          <PromptEditor onPromptChange={handlePromptChange} disabled={loading} />
        </div>

        <div className="mt-6">
          <AgentSelector
            selected={selectedAgents}
            onChange={setSelectedAgents}
            referenceFile={referenceFile}
            onReferenceFileChange={setReferenceFile}
            disabled={loading}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || !prompt.trim() || loading || (requiresReferenceFile && !referenceFile)}
          className="mt-6 w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg disabled:bg-gray-400 transition-colors"
        >
          {loading ? t('upload.loading') : t('upload.button')}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {t('upload.error.prefix')} {error}
            </p>
          </div>
        )}
      </div>

      {extractedData && (
        <div className="space-y-4">
          <ResultsDisplay data={extractedData} />
          {uploadedDoc?.evaluations && uploadedDoc.evaluations.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <EvaluationResults evaluations={uploadedDoc.evaluations} />
            </div>
          )}
          {uploadedDoc?.extractedText && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <OcrTextViewer text={uploadedDoc.extractedText} ocrUsed={uploadedDoc.ocrUsed} />
            </div>
          )}
          {uploadedDoc && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  {t('upload.success')} {uploadedDoc.id}
                </p>
              </div>

              {uploadedDoc.alfrescoNodeId ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">{t('upload.export.success')}</p>
                  <p className="text-sm text-blue-700">
                    {t('upload.export.node_id')} {uploadedDoc.alfrescoNodeId}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleExportToAlfresco}
                  disabled={exporting}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {exporting ? t('upload.export.loading') : t('upload.export.alfresco')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
