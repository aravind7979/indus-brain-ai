import React, { useState, useEffect } from 'react';
import { 
  FileText, Database, GitMerge, ShieldCheck, 
  Wrench, Settings as SettingsIcon, LogOut, Terminal, 
  Cpu, LayoutDashboard, Menu, X, Clock, HelpCircle, Activity
} from 'lucide-react';

// Import Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DocumentManagement } from './pages/DocumentManagement';
import { Copilot } from './pages/Copilot';
import { Compliance } from './pages/Compliance';
import { Maintenance } from './pages/Maintenance';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { Settings } from './pages/Settings';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('indus_token'));
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Shared state to allow document audit redirect
  const [selectedDocForAudit, setSelectedDocForAudit] = useState<number | null>(null);

  // Resolve backend API URL dynamically based on current browser hosting origin
  const backendUrl = import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? "http://localhost:8000/api/v1"
      : window.location.origin + "/api/v1");

  // Check if token exists, and if it's valid
  useEffect(() => {
    if (token) {
      // Test token on loading profile
      fetch(`${backendUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) {
          handleLogout();
        }
      })
      .catch(() => {
        // Offline / Network error - keep token for demo purposes
      });
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('indus_token');
    setToken(null);
  };

  const menuItems = [
    { id: 'dashboard', name: 'Executive Telemetry', icon: <LayoutDashboard size={18} /> },
    { id: 'documents', name: 'Universal Ingestion', icon: <FileText size={18} /> },
    { id: 'copilot', name: 'Expert Copilot', icon: <HelpCircle size={18} /> },
    { id: 'compliance', name: 'Compliance Auditor', icon: <ShieldCheck size={18} /> },
    { id: 'maintenance', name: 'Reliability Agent', icon: <Wrench size={18} /> },
    { id: 'graph', name: 'Knowledge Graph', icon: <GitMerge size={18} /> },
    { id: 'settings', name: 'System Settings', icon: <SettingsIcon size={18} /> }
  ];

  // Router lookup
  const renderPage = () => {
    if (!token) return null;
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard token={token} backendUrl={backendUrl} changePage={setCurrentPage} />;
      case 'documents':
        return (
          <DocumentManagement 
            token={token} 
            backendUrl={backendUrl} 
            changePage={setCurrentPage} 
            setSelectedDocForAudit={setSelectedDocForAudit}
          />
        );
      case 'copilot':
        return <Copilot token={token} backendUrl={backendUrl} />;
      case 'compliance':
        return (
          <Compliance 
            token={token} 
            backendUrl={backendUrl} 
            selectedDocId={selectedDocForAudit}
            resetSelectedDoc={() => setSelectedDocForAudit(null)}
          />
        );
      case 'maintenance':
        return <Maintenance token={token} backendUrl={backendUrl} />;
      case 'graph':
        return <KnowledgeGraphPage token={token} backendUrl={backendUrl} />;
      case 'settings':
        return <Settings token={token} backendUrl={backendUrl} onLogout={handleLogout} />;
      default:
        return <Dashboard token={token} backendUrl={backendUrl} changePage={setCurrentPage} />;
    }
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} backendUrl={backendUrl} />;
  }

  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col relative text-gray-200">
      {/* Background industrial grids */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-30"></div>

      {/* Main Header bar */}
      <header className="h-16 glass-panel border-b border-industrial-700/80 px-6 flex items-center justify-between relative z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded bg-industrial-900 border border-industrial-700 hover:border-industrial-accent-orange text-white cursor-pointer transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          
          <div className="flex items-center gap-2 select-none">
            <Cpu className="text-industrial-accent-orange pulse-orange rounded-full p-0.5" size={20} />
            <span className="font-bold text-white tracking-wider font-mono text-sm sm:text-base">
              INDUS <span className="text-industrial-accent-orange">BRAIN</span> AI
            </span>
          </div>
        </div>

        {/* Global connection details */}
        <div className="flex items-center gap-4 text-xs font-mono text-industrial-600">
          <div className="hidden md:flex items-center gap-1.5">
            <Activity size={14} className="text-industrial-accent-green" />
            <span>BRAIN: OPERATIONAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>SYSTEM TIME: 2026-06-22</span>
          </div>
        </div>
      </header>

      {/* Frame Container */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Navigation Sidebar */}
        <aside className={`glass-panel border-r border-industrial-700/80 shrink-0 transition-all duration-300 flex flex-col justify-between relative z-10 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'
        }`}>
          {/* Main Tabs */}
          <nav className="p-4 space-y-1.5 overflow-y-auto">
            <span className="block text-[10px] font-mono uppercase text-industrial-600 tracking-wider mb-3 px-2">
              Operational Brain Tabs
            </span>
            
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-xs text-left transition-all cursor-pointer ${
                  currentPage === item.id 
                    ? 'glass-panel-active text-industrial-accent-orange font-bold border-l-2 border-l-industrial-accent-orange pl-4' 
                    : 'text-gray-400 hover:text-white hover:bg-industrial-900 border border-transparent'
                }`}
              >
                <span className={currentPage === item.id ? 'text-industrial-accent-orange' : 'text-industrial-600'}>
                  {item.icon}
                </span>
                <span>{item.name.toUpperCase()}</span>
              </button>
            ))}
          </nav>

          {/* Quick stats and user panel */}
          <div className="p-4 border-t border-industrial-700/60 bg-industrial-950/20 text-xs font-mono space-y-3">
            <div className="flex items-center justify-between text-industrial-600">
              <span>OPERATOR:</span>
              <span className="text-white truncate max-w-[120px]">SECURE_ROOT</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border border-industrial-accent-red/20 bg-industrial-accent-red/5 hover:bg-industrial-accent-red/10 text-industrial-accent-red py-2 rounded font-mono text-xs uppercase cursor-pointer transition-all"
            >
              <LogOut size={12} />
              <span>Logoff Operator</span>
            </button>
          </div>
        </aside>

        {/* Viewport Dashboard */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
