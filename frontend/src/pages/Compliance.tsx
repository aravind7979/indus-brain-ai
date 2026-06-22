import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, AlertOctagon, CheckCircle2, 
  HelpCircle, ShieldCheck, Play, Loader, FileText 
} from 'lucide-react';

interface ComplianceProps {
  token: string;
  backendUrl: string;
  selectedDocId: number | null;
  resetSelectedDoc: () => void;
}

export const Compliance: React.FC<ComplianceProps> = ({ 
  token, backendUrl, selectedDocId, resetSelectedDoc 
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${backendUrl}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        // Only include completed documents
        setDocuments(data.filter((d: any) => d.status === 'Completed'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runAudit = async (docIdToAudit: number) => {
    setLoading(true);
    setError('');
    setAuditResult(null);

    try {
      const response = await fetch(`${backendUrl}/compliance/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ document_id: docIdToAudit })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Audit evaluation failed.');
      }

      setAuditResult(data);
    } catch (err: any) {
      setError(err.message || 'Error running compliance check.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  useEffect(() => {
    // If redirected from Document Management with a specific document ID
    if (selectedDocId) {
      setSelectedId(selectedDocId.toString());
      runAudit(selectedDocId);
      resetSelectedDoc(); // Clear selection in parent so we don't trigger indefinitely
    }
  }, [selectedDocId]);

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    runAudit(parseInt(selectedId));
  };

  const getOverallStatusStyles = (status: string) => {
    if (status === 'Fully Compliant') {
      return {
        bg: 'bg-industrial-accent-green/10 border-industrial-accent-green/30 text-industrial-accent-green',
        icon: <ShieldCheck size={28} className="text-industrial-accent-green" />
      };
    }
    if (status === 'Action Required') {
      return {
        bg: 'bg-industrial-accent-amber/10 border-industrial-accent-amber/30 text-industrial-accent-amber',
        icon: <HelpCircle size={28} className="text-industrial-accent-amber" />
      };
    }
    return {
      bg: 'bg-industrial-accent-red/10 border-industrial-accent-red/30 text-industrial-accent-red animate-pulse',
      icon: <AlertOctagon size={28} className="text-industrial-accent-red" />
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Compliant':
        return 'bg-industrial-accent-green/10 border border-industrial-accent-green/20 text-industrial-accent-green';
      case 'Observation':
        return 'bg-industrial-accent-amber/10 border border-industrial-accent-amber/20 text-industrial-accent-amber';
      case 'Non-Compliant':
        return 'bg-industrial-accent-red/10 border border-industrial-accent-red/20 text-industrial-accent-red';
      default:
        return 'bg-industrial-700 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Auditor Center</h1>
        <p className="text-industrial-600 text-sm">Audit operational guidelines, SOPs, and work permits against OISD-115 safety codes.</p>
      </div>

      {/* Select document tool */}
      <div className="glass-panel border-industrial-700 p-5 rounded-lg shadow-glass">
        <form onSubmit={handleAuditSubmit} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-mono uppercase text-industrial-600 mb-1.5">
              Select Procedure Document for Review
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-industrial-950 border border-industrial-700 rounded-md py-2.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-industrial-accent-orange"
              disabled={loading || documents.length === 0}
            >
              <option value="">-- SELECT FROM DATABASE CATALOG --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.filename} (Chunks: {d.chunk_count})</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedId}
            className="w-full sm:w-auto bg-industrial-accent-orange hover:bg-industrial-accent-orange/95 disabled:bg-industrial-800 text-white px-5 py-2.5 rounded-md transition-colors text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-glass-glow"
          >
            {loading ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            <span>Execute Audit</span>
          </button>
        </form>

        {documents.length === 0 && (
          <p className="text-[10px] font-mono text-industrial-accent-amber mt-2">
            No processed documents available. Ingest PDF/TXT files first on the Document Management page.
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-industrial-accent-red/10 border border-industrial-accent-red/30 rounded text-industrial-accent-red font-mono text-xs">
          Audit Failure: {error}
        </div>
      )}

      {/* Results View */}
      {auditResult && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`p-6 rounded-lg border flex flex-col sm:flex-row items-center gap-4 ${getOverallStatusStyles(auditResult.overall_status).bg}`}>
            <div>
              {getOverallStatusStyles(auditResult.overall_status).icon}
            </div>
            <div className="text-center sm:text-left space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">Compliance Assessment</div>
              <h2 className="text-xl font-bold uppercase tracking-tight">{auditResult.overall_status}</h2>
              <p className="text-xs font-mono opacity-80">Document: {auditResult.filename} (ID: {auditResult.document_id})</p>
            </div>
          </div>

          {/* Audit findings log */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-white flex items-center gap-2 font-mono text-sm uppercase">
              <ShieldAlert size={16} className="text-industrial-accent-orange" />
              <span>Section Audit Details ({auditResult.findings.length} Items)</span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {auditResult.findings.map((item: any, idx: number) => (
                <div key={idx} className="glass-panel border-industrial-700 rounded-lg p-5 shadow-glass space-y-3 relative overflow-hidden">
                  {/* Visual warning border for non-compliant items */}
                  {item.requirement_status === 'Non-Compliant' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-industrial-accent-red"></div>
                  )}
                  {item.requirement_status === 'Observation' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-industrial-accent-amber"></div>
                  )}

                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-sm font-semibold text-white font-mono">{item.section || 'General Procedures'}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold ${getStatusBadge(item.requirement_status)}`}>
                      {item.requirement_status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{item.findings}</p>

                  {item.violations && (
                    <div className="p-3 bg-industrial-accent-red/5 border border-industrial-accent-red/20 rounded text-xs font-mono space-y-1">
                      <span className="text-industrial-accent-red font-bold uppercase">Code Violation Flagged:</span>
                      <p className="text-gray-300">{item.violations}</p>
                    </div>
                  )}

                  {item.recommendations && (
                    <div className="p-3 bg-industrial-accent-blue/5 border border-industrial-accent-blue/20 rounded text-xs font-mono space-y-1">
                      <span className="text-industrial-accent-blue font-bold uppercase">Remediation Action:</span>
                      <p className="text-gray-300">{item.recommendations}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder info */}
      {!auditResult && !loading && (
        <div className="glass-panel border-industrial-700/50 rounded-lg p-12 text-center text-industrial-600 font-mono text-sm max-w-xl mx-auto flex flex-col items-center gap-4">
          <FileText size={48} className="opacity-30" />
          <div>
            <h3>Audit Engine Ready</h3>
            <p className="text-xs text-industrial-600 mt-2">
              Select an ingested machine procedure or standard operational guide above and select 'Execute Audit' to run a deep compliance check against standard regulations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
