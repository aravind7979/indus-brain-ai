import React, { useState, useEffect, useRef } from 'react';
import { GitMerge, Database, Link, RefreshCw, Layers, ShieldAlert, Cpu } from 'lucide-react';

interface Node {
  id: string;
  name: string;
  type: string;
  description?: string;
  metadata_json?: string;
}

interface Edge {
  id: number;
  source: string;
  target: string;
  type: string;
  description?: string;
}

interface Coords {
  [id: string]: { x: number; y: number };
}

interface KnowledgeGraphProps {
  token: string;
  backendUrl: string;
}

export const KnowledgeGraphPage: React.FC<KnowledgeGraphProps> = ({ token, backendUrl }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [coords, setCoords] = useState<Coords>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Dragging state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/graph`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNodes(data.nodes);
        setEdges(data.edges);
        initializeCoordinates(data.nodes);
      }
    } catch (err) {
      console.error("Failed to load knowledge graph", err);
    } finally {
      setLoading(false);
    }
  };

  const initializeCoordinates = (nodeList: Node[]) => {
    const width = 850;
    const height = 500;
    
    // Group nodes by type to arrange in vertical columns
    const columns: { [type: string]: Node[] } = {
      'Document': [],
      'Procedure': [],
      'Equipment': [],
      'Incident': [],
      'Maintenance Record': []
    };
    
    const fallbackNodes: Node[] = [];
    
    nodeList.forEach(node => {
      const type = node.type;
      if (columns[type]) {
        columns[type].push(node);
      } else {
        fallbackNodes.push(node);
      }
    });

    // Merge Incident and Maintenance Record columns to keep 4 clean layout columns
    const columnsToRender = [
      { name: 'Documents', nodes: columns['Document'] },
      { name: 'Procedures', nodes: columns['Procedure'] },
      { name: 'Equipment', nodes: columns['Equipment'] },
      { name: 'Logs / Events', nodes: [...columns['Incident'], ...columns['Maintenance Record'], ...fallbackNodes] }
    ];

    const initialCoords: Coords = {};
    const colWidth = width / columnsToRender.length;

    columnsToRender.forEach((col, colIdx) => {
      const x = colWidth * colIdx + colWidth / 2;
      const count = col.nodes.length;
      col.nodes.forEach((node, nodeIdx) => {
        // Space out nodes vertically
        const y = (nodeIdx + 1) * (height / (count + 1));
        initialCoords[node.id] = { x, y };
      });
    });

    setCoords(initialCoords);
  };

  useEffect(() => {
    fetchGraphData();
  }, [token]);

  // Handle Dragging Events
  const handleMouseDown = (nodeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !svgRef.current) return;
    
    // Get mouse position relative to SVG bounding client rect
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constraint coordinates to canvas limits
    const clampedX = Math.max(20, Math.min(rect.width - 20, x));
    const clampedY = Math.max(20, Math.min(rect.height - 20, y));

    setCoords(prev => ({
      ...prev,
      [draggedNodeId]: { x: clampedX, y: clampedY }
    }));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'Document':
        return { fill: '#1e3a8a', stroke: '#3b82f6', text: 'DOC' };
      case 'Procedure':
        return { fill: '#064e3b', stroke: '#10b981', text: 'PROC' };
      case 'Equipment':
        return { fill: '#7c2d12', stroke: '#f97316', text: 'ASSET' };
      case 'Incident':
        return { fill: '#7f1d1d', stroke: '#ef4444', text: 'WARN' };
      case 'Maintenance Record':
        return { fill: '#4c1d95', stroke: '#8b5cf6', text: 'MAINT' };
      default:
        return { fill: '#374151', stroke: '#9ca3af', text: 'NODE' };
    }
  };

  const getEdgeStyles = (type: string) => {
    switch (type) {
      case 'references':
        return { stroke: '#3b82f6', dash: '5,5', label: 'references' };
      case 'affects':
        return { stroke: '#f59e0b', dash: 'none', label: 'affects' };
      case 'caused_by':
        return { stroke: '#ef4444', dash: 'none', label: 'caused_by' };
      case 'related_to':
        return { stroke: '#10b981', dash: '3,3', label: 'related_to' };
      default:
        return { stroke: '#6b7280', dash: 'none', label: 'connects' };
    }
  };

  // Find connections for the selected node
  const getSelectedNodeConnections = () => {
    if (!selectedNode) return [];
    
    const connections: any[] = [];
    edges.forEach(edge => {
      if (edge.source === selectedNode.id) {
        const targetNode = nodes.find(n => n.id === edge.target);
        connections.push({
          relation: edge.type,
          direction: 'out',
          nodeName: targetNode ? targetNode.name : edge.target,
          nodeId: edge.target
        });
      } else if (edge.target === selectedNode.id) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        connections.push({
          relation: edge.type,
          direction: 'in',
          nodeName: sourceNode ? sourceNode.name : edge.source,
          nodeId: edge.source
        });
      }
    });
    return connections;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Industrial Knowledge Graph</h1>
          <p className="text-industrial-600 text-sm">Visual mapping of equipment relationships, startup procedures, incident causes, and LOTO compliance manuals.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchGraphData}
            disabled={loading}
            className="flex items-center gap-2 bg-industrial-900 border border-industrial-700 hover:border-industrial-accent-orange text-white px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>RELINK MAP</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-3 glass-panel border-industrial-700 rounded-lg p-4 shadow-glass relative bg-industrial-950/20 overflow-hidden select-none">
          {/* Legend Overlay */}
          <div className="absolute top-4 left-4 bg-industrial-950/80 border border-industrial-700/50 p-3 rounded font-mono text-[10px] space-y-1.5 z-10">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-[#3b82f6] block"></span><span className="text-white">Document</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-[#10b981] block"></span><span className="text-white">Procedure</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-[#f97316] block"></span><span className="text-white">Equipment</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-[#ef4444] block"></span><span className="text-white">Incident/Warning</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-[#8b5cf6] block"></span><span className="text-white">Maintenance Log</span></div>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-industrial-950/80 flex flex-col items-center justify-center gap-2 z-20">
              <Loader className="animate-spin text-industrial-accent-orange" />
              <span className="font-mono text-xs text-industrial-600">MAPPING NETWORK SYSTEM...</span>
            </div>
          )}

          {nodes.length === 0 ? (
            <div className="h-[500px] flex flex-col items-center justify-center text-center text-industrial-600 font-mono text-xs space-y-3">
              <Layers size={32} className="opacity-25" />
              <div>
                <p>KNOWLEDGE GRAPH IS EMPTY.</p>
                <p className="mt-1 opacity-50">Upload documents or seed the graph in System Settings.</p>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height="500"
              viewBox="0 0 850 500"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-[500px] cursor-grab active:cursor-grabbing"
            >
              {/* Draw Edges */}
              {edges.map((edge) => {
                const srcCoord = coords[edge.source];
                const tgtCoord = coords[edge.target];
                
                if (!srcCoord || !tgtCoord) return null;
                
                const style = getEdgeStyles(edge.type);
                
                // Draw a smooth bezier curve instead of straight lines
                const midX = (srcCoord.x + tgtCoord.x) / 2;
                const pathD = `M ${srcCoord.x} ${srcCoord.y} C ${midX} ${srcCoord.y}, ${midX} ${tgtCoord.y}, ${tgtCoord.x} ${tgtCoord.y}`;
                
                return (
                  <g key={edge.id} className="group">
                    {/* Hover highlights path */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth="1.5"
                      strokeDasharray={style.dash}
                      className="opacity-40 group-hover:opacity-100 transition-opacity"
                    />
                    
                    {/* Animated signal dots */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth="2.5"
                      className="opacity-70"
                      style={{
                        strokeDasharray: '6, 20',
                        animation: 'dash 15s linear infinite'
                      }}
                    />
                    
                    {/* Invisible thick path for easier hovering */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="10"
                      className="cursor-pointer"
                    >
                      <title>{edge.type}: {edge.description}</title>
                    </path>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {nodes.map((node) => {
                const coord = coords[node.id];
                if (!coord) return null;
                
                const style = getNodeColor(node.type);
                const isSelected = selectedNode?.id === node.id;
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${coord.x}, ${coord.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedNode(node)}
                    onMouseDown={handleMouseDown(node.id)}
                  >
                    {/* Ring highlight if selected */}
                    <circle
                      r="22"
                      fill="none"
                      stroke={isSelected ? '#f97316' : 'transparent'}
                      strokeWidth="2"
                      className="transition-all animate-pulse"
                    />
                    
                    {/* Main Node Circle */}
                    <circle
                      r="16"
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth="1.5"
                      className="transition-transform group-hover:scale-110"
                    />
                    
                    {/* Node Initials */}
                    <text
                      textAnchor="middle"
                      dy=".3em"
                      fill="#ffffff"
                      fontSize="8px"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {style.text}
                    </text>
                    
                    {/* Node Text Label (placed below circle) */}
                    <text
                      textAnchor="middle"
                      y="26"
                      fill="#e5e7eb"
                      fontSize="9px"
                      fontFamily="sans-serif"
                      className="pointer-events-none bg-industrial-950 font-medium select-none px-1"
                    >
                      {node.name.length > 18 ? `${node.name.substring(0, 15)}...` : node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Embedded style keyframe for path dash-array animation */}
          <style>{`
            @keyframes dash {
              to {
                stroke-dashoffset: -1000;
              }
            }
          `}</style>
        </div>

        {/* Selected Node Details side panel */}
        <div className="glass-panel border-industrial-700 rounded-lg p-5 shadow-glass space-y-4">
          <h3 className="text-md font-semibold text-white flex items-center gap-2 border-b border-industrial-700 pb-3 font-mono text-sm uppercase">
            <Cpu size={16} className="text-industrial-accent-orange" />
            <span>Telemetry Details</span>
          </h3>

          {!selectedNode ? (
            <div className="py-24 text-center text-industrial-600 font-mono text-xs">
              SELECT A NODE IN THE DIAGRAM TO VERIFY OPERATIONAL PATHWAYS.
            </div>
          ) : (
            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-industrial-600 uppercase block text-[10px]">Node ID:</span>
                <span className="text-white font-semibold text-sm break-all">{selectedNode.id}</span>
              </div>

              <div className="space-y-1">
                <span className="text-industrial-600 uppercase block text-[10px]">Entity Name:</span>
                <span className="text-industrial-accent-orange font-semibold text-sm">{selectedNode.name}</span>
              </div>

              <div className="space-y-1">
                <span className="text-industrial-600 uppercase block text-[10px]">Node Classification:</span>
                <span className="text-white px-2 py-0.5 rounded border border-industrial-700 bg-industrial-900 font-bold uppercase text-[9px]">
                  {selectedNode.type}
                </span>
              </div>

              {selectedNode.description && (
                <div className="space-y-1">
                  <span className="text-industrial-600 uppercase block text-[10px]">Logical Context:</span>
                  <p className="text-gray-300 leading-normal font-sans border-l border-industrial-700 pl-2">
                    {selectedNode.description}
                  </p>
                </div>
              )}

              <div className="space-y-2 border-t border-industrial-700/50 pt-3 mt-3">
                <span className="text-industrial-600 uppercase block text-[10px] font-bold flex items-center gap-1">
                  <Link size={10} /> Relational Connections:
                </span>
                
                {getSelectedNodeConnections().length === 0 ? (
                  <span className="text-industrial-600 italic block">No active connections.</span>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {getSelectedNodeConnections().map((conn, idx) => (
                      <div key={idx} className="p-2 bg-industrial-950 rounded border border-industrial-700 text-[10px] leading-tight">
                        <div className="flex justify-between items-center text-industrial-600 font-bold">
                          <span>{conn.direction === 'out' ? 'OUTGOING' : 'INCOMING'}</span>
                          <span className="text-industrial-accent-blue">{conn.relation.toUpperCase()}</span>
                        </div>
                        <div className="text-white font-semibold mt-1 truncate">{conn.nodeName}</div>
                        <div className="text-industrial-600 text-[9px] mt-0.5 truncate">{conn.nodeId}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
