import React, { useState, useEffect } from 'react';
import { P2PMessage, ModelConfig } from '../types';
import { p2p } from '../services/p2pService';
import { Loader2, Server, Database, Upload, Play, CheckCircle2, FileUp, ArrowLeft } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ClientView: React.FC<Props> = ({ onBack }) => {
  const [sessionCode, setSessionCode] = useState('');
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'READY_TO_TRAIN' | 'TRAINING' | 'UPLOADING'>('DISCONNECTED');
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  
  // Data State
  const [file, setFile] = useState<File | null>(null);
  const [dataInfo, setDataInfo] = useState<{name: string, size: string} | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-15), msg]);

  useEffect(() => {
    return () => p2p.close();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const f = e.target.files[0];
          setFile(f);
          // Simple formatting
          const sizeStr = f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : `${(f.size / 1024).toFixed(2)} KB`;
          setDataInfo({ name: f.name, size: sizeStr });
      }
  };

  const handleJoin = () => {
    if (!sessionCode || !file) return;
    setStatus('CONNECTING');
    addLog(`Connecting to session ${sessionCode}...`);
    
    p2p.connect(sessionCode, (msg: P2PMessage) => {
      if (msg.type === 'JOIN_ACCEPT') {
        setStatus('CONNECTED');
        setConfig(msg.payload.config);
        addLog('Connected to Host. Awaiting Round Start.');
      } else if (msg.type === 'START_ROUND') {
        setStatus('READY_TO_TRAIN');
        addLog(`Round ${msg.payload.round} Started by Host.`);
      } else if (msg.type === 'SESSION_CLOSED') {
        setStatus('DISCONNECTED');
        addLog('Host closed the session.');
      }
    });

    // Send Join Request with Data Metadata
    setTimeout(() => {
        p2p.send('JOIN_REQUEST', {
            datasetName: dataInfo?.name,
            datasetSize: file.size,
            datasetSizeStr: dataInfo?.size
        });
    }, 500);
  };

  const executeTraining = () => {
    if (status !== 'READY_TO_TRAIN') return;
    
    setStatus('TRAINING');
    addLog(`Reading local dataset ${dataInfo?.name}...`);
    setProgress(0);

    // Simulate training delay based on file size (capped)
    const mockDuration = 3000; 
    
    let startTime = Date.now();
    addLog("Initializing training...");
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / mockDuration) * 100, 100);
      setProgress(p);

      if (p >= 100) {
        clearInterval(interval);
        setStatus('UPLOADING');
        addLog(`Training finished on local data. Uploading gradients...`);
        
        setTimeout(() => {
           p2p.send('CLIENT_UPDATE', { loss: Math.random() * 0.5 });
           addLog(`Gradients transmitted securely.`);
           setStatus('CONNECTED'); // Back to idle state
           setProgress(0);
        }, 1000);
      }
    }, 100);
  };

  if (status === 'DISCONNECTED' || status === 'CONNECTING') {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface p-8 rounded-xl border border-slate-700 shadow-2xl relative">
          <button 
            onClick={onBack}
            className="absolute top-4 left-4 p-2 text-slate-500 hover:text-white transition-all rounded-full hover:bg-slate-800"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex justify-center mb-6 mt-4">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700">
                <Database className="w-8 h-8 text-cyan-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">Node Configuration</h2>
          <p className="text-center text-slate-400 mb-8 text-sm">Load your private dataset and connect to the federation.</p>
          
          <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. Local Dataset</label>
                <div className="relative">
                    <input 
                        type="file" 
                        onChange={handleFileChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 focus:border-cyan-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-900/30 file:text-cyan-400 hover:file:bg-cyan-900/50"
                    />
                </div>
                {dataInfo && <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle2 size={12}/> {dataInfo.name} loaded ({dataInfo.size})</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">2. Session Code</label>
              <input 
                type="text" 
                placeholder="Ex: X9Y2Z"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono tracking-widest uppercase"
              />
            </div>
            
            <button 
              onClick={handleJoin}
              disabled={status === 'CONNECTING' || !sessionCode || !file}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {status === 'CONNECTING' ? <Loader2 className="animate-spin" /> : 'Join Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="bg-surface rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
               <button 
                 onClick={onBack}
                 className="p-2 text-slate-500 hover:text-white transition-all rounded-full hover:bg-slate-800"
                 title="Disconnect"
               >
                 <ArrowLeft size={20} />
               </button>
               <div>
                 <h1 className="text-xl font-bold text-white flex items-center gap-2">
                   <Server className="text-green-500" /> {config?.modelName}
                 </h1>
                 <p className="text-sm text-slate-400 font-mono mt-1">Session: {sessionCode} • Status: {status}</p>
               </div>
            </div>
            
            {status === 'READY_TO_TRAIN' ? (
                <button 
                    onClick={executeTraining}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-900/50 flex items-center gap-2 animate-bounce"
                >
                    <Play size={18} /> Start Training
                </button>
            ) : (
                <div className="px-4 py-2 bg-slate-800 rounded-lg text-slate-400 text-sm font-medium border border-slate-700">
                    {status === 'TRAINING' ? 'Computing...' : 'Waiting for Host'}
                </div>
            )}
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 mb-6 flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-full">
                  <FileUp className="text-cyan-400" size={24} />
              </div>
              <div>
                  <h4 className="text-sm font-bold text-slate-300">Active Dataset</h4>
                  <p className="text-xs text-slate-500">{dataInfo?.name} • {dataInfo?.size}</p>
              </div>
          </div>

          <div className="relative pt-6 pb-2">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Computation Progress</span>
                <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-300 relative overflow-hidden ${status === 'TRAINING' ? 'bg-green-500' : 'bg-slate-600'}`}
                style={{ width: `${progress}%` }}
              >
                {status === 'TRAINING' && (
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] skew-x-12"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-black/40 rounded-xl border border-slate-800 p-4 font-mono text-sm h-64 overflow-hidden flex flex-col">
           <div className="text-slate-500 text-xs mb-2 uppercase tracking-wider">Node Operations Log</div>
           <div className="flex-1 overflow-y-auto space-y-2">
              {logs.map((l, i) => (
                  <div key={i} className="text-slate-300 border-l-2 border-slate-700 pl-2">
                      <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                      {l}
                  </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};