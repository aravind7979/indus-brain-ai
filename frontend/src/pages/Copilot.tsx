import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, HelpCircle, Shield, 
  Sparkles, Gauge, ArrowRight, Link as LinkIcon 
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  citations?: any[];
  sources?: string[];
}

interface CopilotProps {
  token: string;
  backendUrl: string;
}

export const Copilot: React.FC<CopilotProps> = ({ token, backendUrl }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am the Indus Brain AI Operations Copilot. Ask me about pump start sequences, LOTO guidelines, emergency compressor trips, or safety protocols. I search across our ingested document repository and synthesize answer citations.",
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "How should Pump P101 be started?",
    "What safety precautions are required before maintenance?",
    "Explain compressor shutdown procedure."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    // Append User Message
    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Format chat history (excluding current user message)
    // We send format [{"role": "user" | "assistant", "content": "..."}]
    const historyPayload = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch(`${backendUrl}/copilot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: textToSend,
          history: historyPayload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to get RAG response.');
      }

      // Append Assistant Message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        confidence: data.confidence_score,
        citations: data.citations,
        sources: data.retrieved_docs
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error linking to Knowledge Engine: ${err.message || 'System mismatch.'}`,
        confidence: 0.0,
        citations: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-industrial-accent-green bg-industrial-accent-green/10 border-industrial-accent-green/20';
    if (score >= 0.5) return 'text-industrial-accent-amber bg-industrial-accent-amber/10 border-industrial-accent-amber/20';
    return 'text-industrial-accent-red bg-industrial-accent-red/10 border-industrial-accent-red/20';
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      {/* Main Chat Terminal */}
      <div className="flex-1 glass-panel border-industrial-700 rounded-lg shadow-glass flex flex-col h-full overflow-hidden">
        {/* Terminal Header */}
        <div className="p-4 bg-industrial-900 border-b border-industrial-700 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-industrial-accent-orange animate-pulse" />
            <span className="text-white font-bold">EXPERT COPAILOT TERMINAL</span>
          </div>
          <span className="text-industrial-600">STATE: COGNITIVE SEARCH ACTIVE</span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                msg.role === 'user' 
                  ? 'bg-industrial-accent-blue/15 border-industrial-accent-blue/30 text-industrial-accent-blue' 
                  : 'bg-industrial-accent-orange/15 border-industrial-accent-orange/30 text-industrial-accent-orange'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              {/* Message bubble */}
              <div className="space-y-3">
                <div className={`p-4 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-industrial-accent-blue/10 border border-industrial-accent-blue/20 text-white rounded-tr-none'
                    : 'bg-industrial-900 border border-industrial-700 text-gray-200 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                </div>

                {/* Additional metadata for assistant responses (citations, confidence, sources) */}
                {msg.role === 'assistant' && (msg.confidence !== undefined || msg.sources || msg.citations) && (
                  <div className="space-y-2 pl-2">
                    {/* Confidence score */}
                    {msg.confidence !== undefined && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono leading-none">
                        <Gauge size={10} />
                        <span>CONFIDENCE SCORE: {(msg.confidence * 100).toFixed(0)}%</span>
                        <div className={`w-2 h-2 rounded-full ml-1 ${
                          msg.confidence >= 0.8 ? 'bg-industrial-accent-green' :
                          msg.confidence >= 0.5 ? 'bg-industrial-accent-amber' :
                          'bg-industrial-accent-red'
                        }`}></div>
                      </div>
                    )}

                    {/* Sources files list */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="text-[10px] text-industrial-600 font-mono flex flex-wrap gap-1 items-center">
                        <span className="uppercase">Retrieved Docs:</span>
                        {msg.sources.map((s, sIdx) => (
                          <span key={sIdx} className="bg-industrial-950 px-2 py-0.5 rounded border border-industrial-700 text-white">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Citations Snippets */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-1.5 border-t border-industrial-700/50 pt-2 mt-2">
                        <div className="text-[10px] font-mono text-industrial-600 uppercase font-bold flex items-center gap-1">
                          <LinkIcon size={10} /> Referenced Chunks:
                        </div>
                        {msg.citations.map((c, cIdx) => (
                          <div key={cIdx} className="p-2 bg-industrial-950/40 rounded border border-industrial-700/50 text-[11px] font-mono">
                            <div className="text-industrial-accent-orange font-bold truncate">
                              [{cIdx + 1}] {c.filename} (Chunk {c.chunk_index})
                            </div>
                            <div className="text-industrial-600 italic mt-0.5 truncate max-w-lg">
                              {c.content_snippet}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex gap-3 max-w-md">
              <div className="w-8 h-8 rounded-full bg-industrial-accent-orange/15 border border-industrial-accent-orange/30 text-industrial-accent-orange flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-industrial-900 border border-industrial-700 p-4 rounded-lg rounded-tl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-industrial-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-industrial-accent-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-industrial-accent-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries box */}
        {messages.length === 1 && (
          <div className="p-4 border-t border-industrial-700/50 bg-industrial-950/20 space-y-2">
            <div className="text-xs font-mono text-industrial-600 flex items-center gap-1">
              <HelpCircle size={12} /> SUGGESTED OPERATIONAL INQUIRIES:
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 hover:border-industrial-accent-orange text-left text-xs text-white p-2.5 rounded transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span>{q}</span>
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 text-industrial-accent-orange transition-opacity ml-2 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="p-4 bg-industrial-900 border-t border-industrial-700 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your industrial query here... (e.g. Pump starting checklist)"
            className="flex-1 bg-industrial-950 border border-industrial-700 rounded-md px-4 py-2.5 text-white text-sm focus:outline-none focus:border-industrial-accent-orange transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-industrial-accent-orange hover:bg-industrial-accent-orange/95 disabled:bg-industrial-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-glass-glow"
          >
            <Send size={14} />
            <span className="hidden sm:inline font-mono text-xs uppercase">Transmit</span>
          </button>
        </form>
      </div>

      {/* Sidebar Panel - Ingestion Schema Info */}
      <div className="w-full lg:w-80 glass-panel border-industrial-700 rounded-lg p-5 shadow-glass space-y-4 flex flex-col justify-start">
        <h3 className="text-md font-semibold text-white flex items-center gap-2 border-b border-industrial-700 pb-3">
          <Shield size={18} className="text-industrial-accent-blue" />
          <span>Operational Rules</span>
        </h3>
        
        <div className="space-y-4 text-xs font-mono text-industrial-600 leading-relaxed">
          <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700">
            <span className="text-white block font-bold uppercase mb-1">RAG Context Engine</span>
            <span>Queries are cross-referenced with your uploaded documents using FAISS search vectors and sent to Gemini 2.5 Flash with strict formatting instructions.</span>
          </div>

          <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700">
            <span className="text-white block font-bold uppercase mb-1">Confidence Guard</span>
            <span>A semantic rating (0-100%) indicating how precisely your uploaded document chunks match and directly answer the query.</span>
          </div>

          <div className="p-3 bg-industrial-950/40 rounded border border-industrial-700 text-[11px]">
            <span className="text-white block font-bold uppercase mb-1">Active Guidelines</span>
            <ul className="list-disc pl-4 space-y-1 mt-1">
              <li>Lockout-Tagout isolation standard</li>
              <li>OISD-115 safety checklist limits</li>
              <li>Factory Act machine shielding rules</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
