import React, { useState, useEffect } from 'react';
import { 
  Wrench, Activity, User, Calendar, 
  AlertTriangle, Cpu, Loader, CheckCircle, RefreshCw 
} from 'lucide-react';

interface MaintenanceProps {
  token: string;
  backendUrl: string;
}

export const Maintenance: React.FC<MaintenanceProps> = ({ token, backendUrl }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [equipmentId, setEquipmentId] = useState('PUMP-P101');
  const [findings, setFindings] = useState('');
  const [reporter, setReporter] = useState('Operator 101');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${backendUrl}/maintenance/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setReports(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !findings) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisResult(null);

    try {
      const response = await fetch(`${backendUrl}/maintenance/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          equipment_id: equipmentId,
          findings,
          reporter
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to submit maintenance log.');
      }

      setAnalysisResult(data);
      setTitle('');
      setFindings('');
      
      // Refresh historical logs
      fetchReports();
    } catch (err: any) {
      setError(err.message || 'Error processing maintenance report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Maintenance & Reliability Console</h1>
        <p className="text-industrial-600 text-sm">Log equipment anomalies, analyze structural failures, and fetch RAG-driven root cause remediations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Form Panel */}
        <div className="glass-panel border-industrial-700 p-5 rounded-lg shadow-glass lg:col-span-1 space-y-4 h-fit">
          <h3 className="text-md font-semibold text-white flex items-center gap-2 border-b border-industrial-700 pb-3 font-mono text-sm uppercase">
            <Wrench size={16} className="text-industrial-accent-orange" />
            <span>Record Defect Log</span>
          </h3>

          {error && (
            <div className="p-3 bg-industrial-accent-red/10 border border-industrial-accent-red/30 rounded text-industrial-accent-red text-xs font-mono">
              Error: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-industrial-600 mb-1.5 uppercase">Anomalous Event Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="High vibration in pump shaft"
                className="w-full bg-industrial-950 border border-industrial-700 rounded-md py-2.5 px-3 text-white focus:outline-none focus:border-industrial-accent-orange"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-industrial-600 mb-1.5 uppercase">Affected Equipment Asset ID</label>
              <select
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className="w-full bg-industrial-950 border border-industrial-700 rounded-md py-2.5 px-3 text-white focus:outline-none focus:border-industrial-accent-orange"
                disabled={loading}
              >
                <option value="PUMP-P101">PUMP-P101 (Centrifugal Water Pump)</option>
                <option value="COMPRESSOR-C202">COMPRESSOR-C202 (Gas Compressor)</option>
                <option value="BOILER-B303">BOILER-B303 (Manifold Boiler)</option>
              </select>
            </div>

            <div>
              <label className="block text-industrial-600 mb-1.5 uppercase">Operator Defect Findings</label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={4}
                placeholder="Bearing temperatures climbing steadily. Slight whining noise heard on start. Visual checking shows small water droplets in lubrication sightglass..."
                className="w-full bg-industrial-950 border border-industrial-700 rounded-md py-2.5 px-3 text-white focus:outline-none focus:border-industrial-accent-orange"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-industrial-600 mb-1.5 uppercase">Logging Inspector</label>
              <input
                type="text"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder="Operator Name"
                className="w-full bg-industrial-950 border border-industrial-700 rounded-md py-2.5 px-3 text-white focus:outline-none focus:border-industrial-accent-orange"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-industrial-accent-orange hover:bg-industrial-accent-orange/95 text-white py-2.5 rounded-md transition-colors text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-glass-glow"
            >
              {loading ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Cpu size={14} />
              )}
              <span>Analyze failure mode</span>
            </button>
          </form>
        </div>

        {/* Diagnosis & Recommendations Results */}
        <div className="glass-panel border-industrial-700 p-5 rounded-lg shadow-glass lg:col-span-2 space-y-4">
          <h3 className="text-md font-semibold text-white flex items-center justify-between border-b border-industrial-700 pb-3 font-mono text-sm uppercase">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-industrial-accent-green" />
              <span>Reliability Diagnosis Report</span>
            </div>
            {analysisResult && (
              <span className="text-[10px] bg-industrial-accent-green/10 border border-industrial-accent-green/20 text-industrial-accent-green px-2 py-0.5 rounded">
                DIAGNOSIS GENERATED
              </span>
            )}
          </h3>

          {loading && (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-industrial-600 font-mono text-xs">
              <Loader size={36} className="animate-spin text-industrial-accent-orange" />
              <span>RUNNING GEMINI RELIABILITY ALGORITHMS...</span>
            </div>
          )}

          {!analysisResult && !loading && (
            <div className="py-24 text-center text-industrial-600 font-mono text-xs max-w-sm mx-auto flex flex-col items-center gap-3">
              <Wrench size={32} className="opacity-20" />
              <span>Submit a defect report on the left panel to execute root cause analysis and recommendations.</span>
            </div>
          )}

          {analysisResult && !loading && (
            <div className="space-y-5 text-sm">
              <div>
                <h4 className="text-[10px] font-mono text-industrial-600 uppercase font-bold">Diagnosed Asset</h4>
                <div className="font-mono text-white text-md font-semibold">{analysisResult.equipment_id} // {analysisResult.title}</div>
              </div>

              <div className="p-4 bg-industrial-accent-red/5 border border-industrial-accent-red/20 rounded space-y-2">
                <h4 className="text-[10px] font-mono text-industrial-accent-red uppercase font-bold flex items-center gap-1">
                  <AlertTriangle size={12} /> Root Cause Analysis
                </h4>
                <p className="text-xs text-gray-200 leading-relaxed font-sans">{analysisResult.root_cause}</p>
              </div>

              <div className="p-4 bg-industrial-accent-green/5 border border-industrial-accent-green/20 rounded space-y-2">
                <h4 className="text-[10px] font-mono text-industrial-accent-green uppercase font-bold flex items-center gap-1">
                  <CheckCircle size={12} /> Actionable Preventive Recommendations
                </h4>
                <div className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-line">{analysisResult.recommendations}</div>
              </div>

              {analysisResult.similar_failures && analysisResult.similar_failures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-industrial-600 uppercase font-bold">Similar Historical Asset Failures</h4>
                  <div className="space-y-2">
                    {analysisResult.similar_failures.map((f: any, idx: number) => (
                      <div key={idx} className="p-3 bg-industrial-950/40 rounded border border-industrial-700/50 flex justify-between items-center text-xs font-mono">
                        <div>
                          <div className="text-white font-semibold">{f.title}</div>
                          <div className="text-[10px] text-industrial-600 mt-0.5">Cause: {f.root_cause.substring(0, 80)}...</div>
                        </div>
                        <div className="text-[10px] text-industrial-600">
                          {new Date(f.date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historical Maintenance Table */}
      <div className="glass-panel border-industrial-700 rounded-lg p-5 shadow-glass space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-md font-semibold text-white">Historical Failure & Repair Logs</h3>
          <button 
            onClick={fetchReports} 
            disabled={historyLoading}
            className="p-1.5 rounded bg-industrial-900 border border-industrial-700 hover:border-industrial-accent-orange text-white"
          >
            <RefreshCw size={12} className={historyLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="py-8 text-center text-industrial-600 font-mono text-xs">
            NO MAINTENANCE RECORDS IN LOG ARCHIVES.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-industrial-600 border-collapse">
              <thead>
                <tr className="border-b border-industrial-700 text-industrial-600 uppercase">
                  <th className="py-2.5 px-2">ID</th>
                  <th className="py-2.5 px-2">Asset ID</th>
                  <th className="py-2.5 px-2">Defect Event</th>
                  <th className="py-2.5 px-2">Root Cause</th>
                  <th className="py-2.5 px-2">Remediation</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.report_id} className="border-b border-industrial-700/40 hover:bg-industrial-900/20 text-white">
                    <td className="py-3 px-2 font-bold text-industrial-accent-orange">{r.report_id}</td>
                    <td className="py-3 px-2 text-industrial-accent-blue font-semibold">{r.equipment_id}</td>
                    <td className="py-3 px-2 font-medium">{r.title}</td>
                    <td className="py-3 px-2 text-gray-300 max-w-xs truncate" title={r.root_cause}>{r.root_cause}</td>
                    <td className="py-3 px-2 text-gray-400 max-w-xs truncate" title={r.recommendations}>{r.recommendations}</td>
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
