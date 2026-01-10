import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModelConfig, ClientNode, TrainingMetric, LogEntry, P2PMessage } from '../types';
import { p2p } from '../services/p2pService';
import { generateSimulationLog, generateTrainingScript } from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Terminal, Play, Loader, ShieldCheck, Share2, Copy, Database, FileCode, X, Globe, Cpu, ArrowLeft, Zap, MoveHorizontal, ListTree } from 'lucide-react';

interface Props {
  config: ModelConfig;
  sessionCode: string;
  onBack: () => void;
}

export const HostDashboard: React.FC<Props> = ({ config, sessionCode, onBack }) => {
  const [clients, setClients] = useState<ClientNode[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetric[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [round, setRound] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [globalAccuracy, setGlobalAccuracy] = useState(0.1);
  
  const [showCode, setShowCode] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'INFO', source: LogEntry['source'] = 'SYSTEM') => {
    setLogs(prev => [...prev.slice(-99), {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type
    }]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const handleMessage = (msg: P2PMessage) => {
      if (msg.type === 'JOIN_REQUEST') {
        const payload = msg.payload || {};
        const newClient: ClientNode = {
          id: msg.senderId,
          name: `EdgeNode-${msg.senderId.substr(0, 4)}`,
          status: 'IDLE',
          progress: 0,
          currentLoss: 0,
          dataPoints: payload.datasetSize || 0,
          datasetName: payload.datasetName || 'Modal Local',
          datasetSize: payload.datasetSizeStr || '0 KB'
        };
        setClients(prev => {
          if (prev.find(c => c.id === newClient.id)) return prev;
          addLog(`Edge registered: ${newClient.name} for ${config.task}`, 'SUCCESS', 'HOST');
          p2p.send('JOIN_ACCEPT', { config });
          return [...prev, newClient];
        });
      } else if (msg.type === 'CLIENT_UPDATE') {
        setClients(prev => prev.map(c => 
          c.id === msg.senderId ? { ...c, status: 'COMPLETED', progress: 100 } : c
        ));
        addLog(`MCP Gradient upload complete from Node-${msg.senderId.substr(0,4)}`, 'INFO', 'CLIENT');
      }
    };
    p2p.connect(sessionCode, handleMessage);
    addLog(`MCP Server online for Session ${sessionCode}.`, 'INFO');
    return () => p2p.close();
  }, [sessionCode, config, addLog]);

  useEffect(() => {
    if (!isTraining) return;
    const active = clients.filter(c => c.status !== 'FAILED');
    if (active.length > 0 && active.every(c => c.status === 'COMPLETED')) finishRound(round);
  }, [clients, isTraining, round]);

  const startRound = () => {
      const currentRound = round + 1;
      if (currentRound > config.rounds) {
          setIsTraining(false);
          addLog("All communication rounds finalized via MCP.", "SUCCESS");
          return;
      }
      setRound(currentRound);
      addLog(`Initiating Global Round ${currentRound}/${config.rounds}`, 'INFO');
      p2p.send('START_ROUND', { round: currentRound });
      setClients(prev => prev.map(c => ({ ...c, status: 'TRAINING', progress: 0 })));
  };

  const finishRound = async (r: number) => {
      const improvement = (Math.random() * 0.04) + 0.02;
      const newAcc = Math.min(globalAccuracy + improvement, 0.985);
      setGlobalAccuracy(newAcc);
      setMetrics(prev => [...prev, { round: r, accuracy: newAcc, loss: 1 - newAcc }]);
      
      const aiLog = await generateSimulationLog(r, newAcc, config.task);
      addLog(aiLog, 'SUCCESS', 'SYSTEM');
      
      setClients(prev => prev.map(c => ({...c, status: 'IDLE', progress: 0})));
      if (r < config.rounds) setTimeout(() => startRound(), 1500); 
      else setIsTraining(false);
  };

  const handleGenerateCode = async () => {
    setShowCode(true);
    if (!generatedCode) {
      setLoadingCode(true);
      setGeneratedCode(await generateTrainingScript(config));
      setLoadingCode(false);
    }
  };

  const handleBack = () => {
    if (confirm("Terminate current MCP session and return to landing page?")) {
      onBack();
    }
  };

  const mcpManifest = {
    protocol_version: "1.0.4-LTS",
    session_id: sessionCode,
    resource: {
      id: config.modelName,
      uri: `mcp://hf.co/${config.modelName}`,
      scale: `${config.paramMin}-${config.paramMax}`
    },
    capabilities: config.usePeft ? ["peft", config.peftType?.toLowerCase(), "lora_rank_8"] : ["full_finetune"],
    handshake: {
        nodes: clients.length,
        task: config.task
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] relative font-sans">
      {/* Code Viewer Modal */}
      {showCode && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><FileCode size={20} /></div>
                <div>
                  <h2 className="text-white font-bold text-lg">MCP Deployment Script</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Protocol v1.0.4-LTS</p>
                </div>
              </div>
              <button onClick={() => setShowCode(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0b0e14] p-8">
              {loadingCode ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-6">
                  <div className="relative">
                    <Loader className="animate-spin w-12 h-12 text-cyan-500" />
                    <div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">Synthesizing MCP Protocol Pipeline</p>
                    <p className="text-sm">Gemini is configuring resource access for {config.modelName}...</p>
                  </div>
                </div>
              ) : (
                <pre className="text-sm font-mono text-cyan-50/80 selection:bg-cyan-500/30"><code>{generatedCode}</code></pre>
              )}
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-4">
               <button onClick={() => { navigator.clipboard.writeText(generatedCode); addLog("MCP Script copied.", "SUCCESS"); }} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-cyan-900/20 transition-all active:scale-95"><Copy size={18} /> COPY CODE</button>
            </div>
          </div>
        </div>
      )}

      {/* Protocol Inspector Modal */}
      {showInspector && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-slate-900 w-full max-w-2xl h-[70vh] rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><ListTree size={20} /></div>
                <h2 className="text-white font-bold text-lg">MCP Manifest Inspector</h2>
              </div>
              <button onClick={() => setShowInspector(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0b0e14] p-8">
                <pre className="text-xs font-mono text-emerald-400/80"><code>{JSON.stringify(mcpManifest, null, 2)}</code></pre>
            </div>
          </div>
        </div>
      )}

      {/* Control Sidebar */}
      <div className="w-96 border-r border-slate-800/50 bg-[#0b0e14]/50 backdrop-blur-3xl p-8 flex flex-col hidden lg:flex">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <Globe className="text-cyan-400" /> HF-MCP <span className="px-2 py-0.5 bg-cyan-500 text-[10px] rounded text-black font-black">ACTIVE</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Range: {config.paramMin}-{config.paramMax}</p>
          </div>
          <button 
            onClick={handleBack}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Terminate Session"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        
        <div className="space-y-8 flex-1 overflow-y-auto no-scrollbar">
            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/50 shadow-inner">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">MCP Context Code</h3>
                <div className="flex items-center justify-between group">
                    <code className="text-3xl text-cyan-400 font-black tracking-tighter group-hover:text-cyan-300 transition-colors">{sessionCode}</code>
                    <button onClick={() => { navigator.clipboard.writeText(sessionCode); addLog("Context code copied.", "INFO"); }} className="p-2 text-slate-600 hover:text-white transition-colors"><Copy size={20} /></button>
                </div>
            </div>

            <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Registry Metadata</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                      <span className="text-xs text-slate-500 font-bold">TASK</span>
                      <span className="text-xs text-white font-black truncate max-w-[150px]">{config.task}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                      <span className="text-xs text-slate-500 font-bold">RESOURCE</span>
                      <span className="text-xs text-cyan-400 font-black truncate max-w-[150px]">{config.modelName}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                      <span className="text-xs text-slate-500 font-bold">ENVELOPE</span>
                      <span className="text-[10px] text-emerald-400 font-black flex items-center gap-1">
                        {config.paramMin} <MoveHorizontal size={10}/> {config.paramMax}
                      </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex justify-between">
                   Handshake ({clients.length})
                   <button onClick={() => setShowInspector(true)} className="text-cyan-500 hover:text-cyan-400 flex items-center gap-1">
                     <ListTree size={12} /> MANIFEST
                   </button>
                 </h3>
                 <div className="space-y-3 overflow-y-auto pr-2">
                    {clients.map(c => (
                        <div key={c.id} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${c.status === 'TRAINING' ? 'bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-emerald-500'}`} />
                                    <span className="text-xs font-black text-slate-200">{c.name}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-800 px-2 py-0.5 rounded uppercase">{c.status}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                <Database size={10} className="text-cyan-500" /> {c.datasetName}
                            </div>
                        </div>
                    ))}
                    {clients.length === 0 && <div className="text-center py-8 text-slate-700 text-xs font-bold italic">Awaiting MCP handshake...</div>}
                 </div>
            </div>
        </div>

        <div className="mt-8 space-y-3">
          <button onClick={handleGenerateCode} className="w-full py-4 rounded-2xl border border-slate-800 hover:border-cyan-500 hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 font-black text-xs uppercase tracking-widest transition-all"><FileCode size={18} className="inline mr-2" /> Export Protocol Script</button>
          <button onClick={() => { if(clients.length > 0) { setIsTraining(true); startRound(); } else addLog("Cluster disconnected.", "WARNING"); }} disabled={isTraining || clients.length === 0} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${isTraining ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}>
            {isTraining ? <Loader className="animate-spin" /> : <Play size={16} />}
            {isTraining ? 'SYNCING MCP...' : 'INIT BROADCAST'}
          </button>
        </div>
      </div>

      {/* Analytics Main View */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-cyan-950/10">
        <div className="flex-1 p-10 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                 <div className="xl:col-span-2 bg-slate-900/30 backdrop-blur-md p-8 rounded-3xl border border-slate-800/50 h-[450px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-sm font-black text-slate-300 flex items-center gap-3 uppercase tracking-widest">
                        <Activity size={18} className="text-cyan-400" /> MCP Resource Convergence
                      </h3>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                          <div className="w-2 h-2 rounded-full bg-cyan-400"></div> Sync Accuracy
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={metrics}>
                            <defs>
                              <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="round" stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 1]} stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="accuracy" stroke="#22d3ee" strokeWidth={4} fillOpacity={1} fill="url(#colorAcc)" />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="flex flex-col gap-8">
                    <div className="bg-slate-900/30 backdrop-blur-md p-8 rounded-3xl border border-slate-800/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 transition-transform group-hover:scale-125 duration-700">
                          <Cpu size={80} />
                        </div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Sync Cycle</h3>
                        <div className="flex items-baseline gap-2 mt-4">
                          <span className="text-7xl font-black text-white tracking-tighter">{round}</span>
                          <span className="text-xl font-bold text-slate-600">/ {config.rounds}</span>
                        </div>
                        <div className="w-full bg-slate-800/50 h-3 mt-8 rounded-full overflow-hidden border border-slate-700/50">
                            <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-700 shadow-[0_0_15px_rgba(34,211,238,0.4)]" style={{ width: `${(round / config.rounds) * 100}%`}} />
                        </div>
                    </div>

                    <div className="bg-slate-900/30 backdrop-blur-md p-8 rounded-3xl border border-slate-800/50">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Protocol Health</h3>
                        <div className="mt-4 flex items-center gap-4">
                          <div className="text-5xl font-black text-emerald-400 tracking-tighter">Verified</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight">MCP Connector<br/>Operational</div>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="bg-[#0b0e14]/80 backdrop-blur-md rounded-3xl border border-slate-800/50 p-6 h-[300px] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
                  <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <Terminal size={16} className="text-cyan-500" /> Orchestration Telemetry
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar px-2">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-4 text-[11px] group">
                        <span className="text-slate-600 font-mono shrink-0">[{log.timestamp}]</span>
                        <span className={`font-black shrink-0 ${log.source === 'HOST' ? 'text-indigo-400' : log.source === 'CLIENT' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          {log.source}::
                        </span>
                        <span className={`leading-relaxed group-hover:text-white transition-colors ${log.type === 'SUCCESS' ? 'text-emerald-400/80' : log.type === 'WARNING' ? 'text-yellow-400/80' : 'text-slate-400'}`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};