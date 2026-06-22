import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, Trash2, CheckCircle2, 
  AlertCircle, RefreshCw, Eye, ShieldCheck 
} from 'lucide-react';

interface DocumentManagementProps {
  token: string;
  backendUrl: string;
  changePage: (page: string) => void;
  setSelectedDocForAudit: (docId: number) => void;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({ 
  token, backendUrl, changePage, setSelectedDocForAudit 
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'txt' && ext !== 'docx' && ext !== 'doc' && ext !== 'md') {
        setUploadError('Unsupported file format. Please upload PDF, TXT, or DOCX files.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${backendUrl}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed.');
      }

      setUploadSuccess(`Successfully queued "${selectedFile.name}" for ingestion processing!`);
      setSelectedFile(null);
      
      // Reset file input element
      const fileInput = document.getElementById('document-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document from the operational brain? All vector indexes will be removed.")) {
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== docId));
      } else {
        alert("Failed to delete document.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting document.");
    }
  };

  const handleAudit = (docId: number) => {
    setSelectedDocForAudit(docId);
    changePage('compliance');
  };

  useEffect(() => {
    fetchDocuments();
    // Poll for processing status updates every 4 seconds
    const interval = setInterval(() => {
      fetchDocuments();
    }, 4000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Universal Ingestion Portal</h1>
          <p className="text-industrial-600 text-sm">Upload SOPs, maintenance manuals, safety guidelines, and code regulations.</p>
        </div>
        <button 
          onClick={fetchDocuments}
          disabled={loading}
          className="p-2 rounded bg-industrial-900 border border-industrial-700 hover:border-industrial-accent-orange text-white"
        >
          <RefreshCw size={14} className={loading && !uploading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Upload Box and Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="glass-panel border-industrial-700 p-5 rounded-lg shadow-glass lg:col-span-2 space-y-4">
          <h3 className="text-md font-semibold text-white">Ingest Operational Document</h3>
          
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-industrial-700 hover:border-industrial-accent-orange rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors relative bg-industrial-950/20">
              <input 
                id="document-file-input"
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Upload size={32} className="text-industrial-600 mb-3" />
              {selectedFile ? (
                <div className="text-center font-mono">
                  <span className="text-white text-sm block truncate max-w-xs">{selectedFile.name}</span>
                  <span className="text-[10px] text-industrial-accent-orange mt-1 block">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <div className="text-center text-sm text-industrial-600 font-mono">
                  <span>DRAG & DROP OR CLICK TO BROWSE</span>
                  <span className="text-[10px] block mt-1">SUPPORTED FORMATS: PDF, TXT, DOCX</span>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-industrial-accent-red/10 border border-industrial-accent-red/30 rounded text-industrial-accent-red text-xs font-mono flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-industrial-accent-green/10 border border-industrial-accent-green/30 rounded text-industrial-accent-green text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {selectedFile && (
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-industrial-accent-orange hover:bg-industrial-accent-orange/90 text-white font-medium py-2 rounded transition-colors text-xs uppercase tracking-wider font-mono cursor-pointer"
              >
                {uploading ? 'Processing File...' : 'Start Ingestion Pipeline'}
              </button>
            )}
          </form>
        </div>

        {/* Statistics Telemetry Panel */}
        <div className="glass-panel border-industrial-700 p-5 rounded-lg shadow-glass space-y-4">
          <h3 className="text-md font-semibold text-white">Pipeline Telemetry</h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700">
              <span className="text-industrial-600 block mb-1">TOTAL DOCUMENTS INGESTED</span>
              <span className="text-2xl font-bold text-white">{documents.length}</span>
            </div>
            <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700">
              <span className="text-industrial-600 block mb-1">TOTAL VECTOR CHUNKS</span>
              <span className="text-2xl font-bold text-industrial-accent-blue">
                {documents.reduce((acc, doc) => acc + doc.chunk_count, 0)}
              </span>
            </div>
            <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700 flex justify-between items-center">
              <span className="text-industrial-600">PROCESSING QUEUE:</span>
              <span className="text-industrial-accent-amber font-bold animate-pulse">
                {documents.filter(d => d.status === 'Processing').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ingested Documents List */}
      <div className="glass-panel border-industrial-700 rounded-lg p-5 shadow-glass space-y-4">
        <h3 className="text-md font-semibold text-white">Ingestion Database Catalog</h3>

        {documents.length === 0 ? (
          <div className="py-12 text-center text-industrial-600 font-mono text-sm">
            NO DOCUMENTS CURRENTLY MAPPED IN PLATFORM.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-industrial-600 border-collapse">
              <thead>
                <tr className="border-b border-industrial-700 text-industrial-600 uppercase">
                  <th className="py-3 px-2">ID</th>
                  <th className="py-3 px-2">Filename</th>
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Chunks</th>
                  <th className="py-3 px-2">Ingestion Status</th>
                  <th className="py-3 px-2">Uploaded At</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-industrial-700/50 hover:bg-industrial-900/30 text-white">
                    <td className="py-3 px-2 font-semibold text-industrial-accent-orange">{doc.id}</td>
                    <td className="py-3 px-2 font-medium truncate max-w-xs" title={doc.filename}>{doc.filename}</td>
                    <td className="py-3 px-2 text-industrial-600">{doc.file_type}</td>
                    <td className="py-3 px-2 text-industrial-accent-blue font-bold">{doc.chunk_count}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        doc.status === 'Completed' ? 'bg-industrial-accent-green/10 text-industrial-accent-green border border-industrial-accent-green/20' :
                        doc.status === 'Processing' ? 'bg-industrial-accent-blue/10 text-industrial-accent-blue border border-industrial-accent-blue/20 animate-pulse' :
                        'bg-industrial-accent-red/10 text-industrial-accent-red border border-industrial-accent-red/20'
                      }`}>
                        {doc.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-industrial-600">
                      {new Date(doc.upload_date).toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right space-x-2">
                      {doc.status === 'Completed' && (
                        <button
                          onClick={() => handleAudit(doc.id)}
                          title="Evaluate Compliance"
                          className="p-1 rounded bg-industrial-accent-orange/10 hover:bg-industrial-accent-orange/20 border border-industrial-accent-orange/30 text-industrial-accent-orange cursor-pointer"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Remove Document"
                        className="p-1 rounded bg-industrial-accent-red/10 hover:bg-industrial-accent-red/20 border border-industrial-accent-red/30 text-industrial-accent-red cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
