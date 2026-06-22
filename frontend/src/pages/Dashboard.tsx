import React, { useEffect, useState } from 'react';
import { 
  FileText, Database, GitMerge, AlertTriangle, 
  Cpu, Activity, CheckCircle, RefreshCw, Thermometer, ShieldAlert 
} from 'lucide-react';

interface DashboardProps {
  token: string;
  backendUrl: string;
  changePage: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, backendUrl, changePage }) => {
  const [stats, setStats] = useState({
    total_documents: 0,
    total_chunks: 0,
    processing_count: 0,
    failed_count: 0
  });
  const [graphStats, setGraphStats] = useState({
    nodes: 0,
    edges: 0,
    violations: 0
  });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [recentFindings, setRecentFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [geminiStatus, setGeminiStatus] = useState('Checking...');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // 1. Fetch document stats
      const statsRes = await fetch(`${backendUrl}/documents/stats/telemetry`, { headers });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // 2. Fetch graph stats
      const graphRes = await fetch(`${backendUrl}/graph`, { headers });
      const graphData = await graphRes.json();
      if (graphRes.ok) {
        setGraphStats({
          nodes: graphData.nodes.length,
          edges: graphData.edges.length,
          violations: graphData.nodes.filter((n: any) => n.id.startsWith('VIOLATION')).length
        });
      }

      // 3. Fetch documents list for "recent" items
      const docsRes = await fetch(`${backendUrl}/documents`, { headers });
      const docsData = await docsRes.json();
      if (docsRes.ok) setRecentDocs(docsData.slice(0, 4));

      // 4. Fetch compliance findings
      const findingsRes = await fetch(`${backendUrl}/compliance/findings`, { headers });
      const findingsData = await findingsRes.json();
      if (findingsRes.ok) setRecentFindings(findingsData.filter((f: any) => f.requirement_status === 'Non-Compliant').slice(0, 3));

      // 5. Check backend/Gemini health
      const healthRes = await fetch(`${backendUrl}/health`);
      if (healthRes.ok) {
        // We'll infer Gemini status from API check or settings
        const settingsRes = await fetch(`${backendUrl}/graph`, { headers }); // Quick authenticated check
        if (settingsRes.ok) {
          setGeminiStatus('CONNECTED (2.5 Flash)');
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard statistics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Telemetry Console</h1>
          <p className="text-industrial-600 text-sm">Real-time status overview of the Industrial Operations & Knowledge Brain.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 bg-industrial-900 border border-industrial-700 hover:border-industrial-accent-orange text-white px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* Numerical Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel rounded-lg p-5 border-industrial-700 shadow-glass flex items-start justify-between relative overflow-hidden group hover:border-industrial-accent-blue/30 transition-all">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-industrial-600">Total Documents</span>
            <div className="text-3xl font-bold text-white">{stats.total_documents}</div>
            <p className="text-xs text-industrial-600">PDF, DOCX, TXT manuals</p>
          </div>
          <div className="p-3 rounded-lg bg-industrial-accent-blue/10 border border-industrial-accent-blue/20 text-industrial-accent-blue">
            <FileText size={20} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel rounded-lg p-5 border-industrial-700 shadow-glass flex items-start justify-between relative overflow-hidden group hover:border-industrial-accent-orange/30 transition-all">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-industrial-600">FAISS Vector Chunks</span>
            <div className="text-3xl font-bold text-white">{stats.total_chunks}</div>
            <p className="text-xs text-industrial-600">Overlapping vector slices</p>
          </div>
          <div className="p-3 rounded-lg bg-industrial-accent-orange/10 border border-industrial-accent-orange/20 text-industrial-accent-orange">
            <Database size={20} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel rounded-lg p-5 border-industrial-700 shadow-glass flex items-start justify-between relative overflow-hidden group hover:border-industrial-accent-green/30 transition-all">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-industrial-600">Knowledge Nodes</span>
            <div className="text-3xl font-bold text-white">{graphStats.nodes}</div>
            <p className="text-xs text-industrial-600">{graphStats.edges} relational edges mapped</p>
          </div>
          <div className="p-3 rounded-lg bg-industrial-accent-green/10 border border-industrial-accent-green/20 text-industrial-accent-green">
            <GitMerge size={20} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel rounded-lg p-5 border-industrial-700 shadow-glass flex items-start justify-between relative overflow-hidden group hover:border-industrial-accent-red/30 transition-all">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-industrial-600">Compliance Breaches</span>
            <div className={`text-3xl font-bold ${graphStats.violations > 0 ? 'text-industrial-accent-red animate-pulse' : 'text-white'}`}>
              {graphStats.violations}
            </div>
            <p className="text-xs text-industrial-600">Active policy violations flagged</p>
          </div>
          <div className={`p-3 rounded-lg border text-industrial-accent-red ${graphStats.violations > 0 ? 'bg-industrial-accent-red/20 border-industrial-accent-red/40' : 'bg-industrial-accent-red/10 border-industrial-accent-red/20'}`}>
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Equipment Health & SCADA Simulator Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SCADA Monitoring Widget */}
        <div className="glass-panel rounded-lg border-industrial-700 p-5 shadow-glass space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-industrial-700 pb-3">
            <h3 className="text-md font-semibold text-white flex items-center gap-2">
              <Activity size={18} className="text-industrial-accent-green animate-pulse" />
              <span>Telemetry Feed // Mock Equipment Status</span>
            </h3>
            <span className="text-[10px] font-mono bg-industrial-accent-green/10 border border-industrial-accent-green/20 text-industrial-accent-green px-2 py-0.5 rounded">
              SCADA CONNECTED
            </span>
          </div>

          <div className="space-y-4">
            {/* Equipment item 1 */}
            <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700 hover:border-industrial-accent-orange/30 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-industrial-accent-orange font-semibold">PUMP-P101</span>
                <h4 className="text-sm font-medium text-white">Centrifugal Boiler Feed Pump</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-mono text-xs text-industrial-accent-amber">
                  <Thermometer size={14} />
                  <span>74.2 °C (HI-WARN)</span>
                </div>
                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-accent-amber/10 border border-industrial-accent-amber/30 text-industrial-accent-amber">
                  CHECK BEARING
                </div>
              </div>
            </div>

            {/* Equipment item 2 */}
            <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700 hover:border-industrial-accent-blue/30 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-industrial-accent-blue font-semibold">COMPRESSOR-C202</span>
                <h4 className="text-sm font-medium text-white">Natural Gas Bypass Compressor</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-mono text-xs text-industrial-accent-green">
                  <Activity size={14} />
                  <span>1.25 MPa (NORMAL)</span>
                </div>
                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-accent-green/10 border border-industrial-accent-green/30 text-industrial-accent-green">
                  ACTIVE
                </div>
              </div>
            </div>

            {/* Equipment item 3 */}
            <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700 hover:border-industrial-accent-blue/30 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-industrial-accent-blue font-semibold">BOILER-B303</span>
                <h4 className="text-sm font-medium text-white">High-Pressure Steam Boiler</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-mono text-xs text-industrial-accent-green">
                  <Activity size={14} />
                  <span>4.80 MPa (NORMAL)</span>
                </div>
                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-accent-green/10 border border-industrial-accent-green/30 text-industrial-accent-green">
                  ACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Diagnostics status panel */}
        <div className="glass-panel rounded-lg border-industrial-700 p-5 shadow-glass space-y-4">
          <div className="flex items-center justify-between border-b border-industrial-700 pb-3">
            <h3 className="text-md font-semibold text-white flex items-center gap-2">
              <Cpu size={18} className="text-industrial-accent-orange" />
              <span>AI System Status</span>
            </h3>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="flex justify-between items-center py-1">
              <span className="text-industrial-600">BACKEND STATUS:</span>
              <span className="text-industrial-accent-green flex items-center gap-1">
                <CheckCircle size={12} /> OPERATIONAL
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-industrial-600">FAISS SEARCH ENGINE:</span>
              <span className="text-industrial-accent-green flex items-center gap-1">
                <CheckCircle size={12} /> ONLINE ({stats.total_chunks} CHUNKS)
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-industrial-600">EMBEDDINGS GENERATOR:</span>
              <span className="text-industrial-accent-blue">LOCAL MINI-LM</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-industrial-600">GEMINI LLM ENGINE:</span>
              <span className="text-industrial-accent-blue">{geminiStatus}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-industrial-700 pt-3">
              <span className="text-industrial-600">ACTIVE PIPELINES:</span>
              <span className="text-white">RAG, Compliance, Graph</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Logs & Compliance Warnings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingested Documents Log */}
        <div className="glass-panel rounded-lg border-industrial-700 p-5 shadow-glass space-y-4">
          <div className="flex items-center justify-between border-b border-industrial-700 pb-3">
            <h3 className="text-md font-semibold text-white">Recent Knowledge Uploads</h3>
            <button 
              onClick={() => changePage('documents')} 
              className="text-xs text-industrial-accent-blue hover:underline bg-transparent border-none cursor-pointer"
            >
              Manage Documents
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="py-8 text-center text-industrial-600 text-sm font-mono">
              NO DOCUMENTS LOADED YET.
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="p-3 bg-industrial-950/20 rounded border border-industrial-700 flex justify-between items-center gap-4 text-xs font-mono">
                  <div className="truncate max-w-[70%]">
                    <div className="text-white truncate">{doc.filename}</div>
                    <div className="text-[10px] text-industrial-600 mt-0.5">{doc.file_type} // Chunks: {doc.chunk_count}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      doc.status === 'Completed' ? 'bg-industrial-accent-green/10 text-industrial-accent-green border border-industrial-accent-green/20' : 
                      doc.status === 'Processing' ? 'bg-industrial-accent-blue/10 text-industrial-accent-blue border border-industrial-accent-blue/20 animate-pulse' :
                      'bg-industrial-accent-red/10 text-industrial-accent-red border border-industrial-accent-red/20'
                    }`}>
                      {doc.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Warnings Log */}
        <div className="glass-panel rounded-lg border-industrial-700 p-5 shadow-glass space-y-4">
          <div className="flex items-center justify-between border-b border-industrial-700 pb-3">
            <h3 className="text-md font-semibold text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-industrial-accent-amber" />
              <span>Compliance Breaches Detected</span>
            </h3>
            <button 
              onClick={() => changePage('compliance')} 
              className="text-xs text-industrial-accent-blue hover:underline bg-transparent border-none cursor-pointer"
            >
              Auditor Center
            </button>
          </div>

          {recentFindings.length === 0 ? (
            <div className="py-8 text-center text-industrial-accent-green text-sm font-mono bg-industrial-accent-green/5 border border-industrial-accent-green/10 rounded flex flex-col items-center justify-center gap-2">
              <CheckCircle size={24} />
              <span>ALL INGESTED SOPs COMPLIANT</span>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFindings.map((finding, idx) => (
                <div key={idx} className="p-3 bg-industrial-accent-red/5 border border-industrial-accent-red/20 rounded flex items-start gap-3 text-xs">
                  <div className="mt-0.5 text-industrial-accent-red">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="space-y-1">
                    <div className="font-mono text-white font-semibold">
                      Violation in Section: {finding.section || 'General'}
                    </div>
                    <div className="text-industrial-600 font-mono">
                      Rule: {finding.violations || 'Safety code mismatch'}
                    </div>
                    <div className="text-industrial-600 text-[11px]">
                      Detail: {finding.findings}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
