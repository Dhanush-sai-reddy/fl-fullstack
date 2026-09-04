import React, { useState, useEffect } from 'react';
import { ModelConfig, TASK_HIERARCHY } from '../types';
import { getModelRecommendations, explainPeftConfig, MCPResource } from '../services/geminiService';
import { Server, Zap, ArrowRight, Loader2, BrainCircuit, Box, Layers, Settings2, Database, MoveHorizontal, Link2, Cpu } from 'lucide-react';

interface Props {
  onComplete: (config: ModelConfig) => void;
  onCancel: () => void;
}

const PARAM_SCALES = ["<1B", "1B-3B", "7B", "13B", "30B", "70B", "175B+"];

export const SetupWizard: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loadingModels, setLoadingModels] = useState(false);
  const [suggestedModels, setSuggestedModels] = useState<MCPResource[]>([]);
  const [peftExplanation, setPeftExplanation] = useState('');
  
  const [config, setConfig] = useState<ModelConfig>({
    category: Object.keys(TASK_HIERARCHY)[0],
    task: TASK_HIERARCHY[Object.keys(TASK_HIERARCHY)[0]][0],
    modelName: '',
    usePeft: true,
    peftType: 'LORA',
    loraRank: 8,
    loraAlpha: 16,
    learningRate: 0.001,
    rounds: 5,
    paramMin: '1B-3B',
    paramMax: '13B'
  });

  useEffect(() => {
    setLoadingModels(true);
    getModelRecommendations(config.category, config.task, config.paramMin, config.paramMax).then(models => {
      setSuggestedModels(models);
      if (models.length > 0) {
        setConfig(c => ({ ...c, modelName: models[0].id }));
      }
      setLoadingModels(false);
    });
  }, [config.category, config.task, config.paramMin, config.paramMax]);

  useEffect(() => {
    if (config.usePeft) {
      explainPeftConfig(config).then(setPeftExplanation);
    }
  }, [config.usePeft, config.peftType, config.loraRank, config.modelName, config.task, config.paramMin, config.paramMax]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else onComplete(config);
  };

  const selectedModelData = suggestedModels.find(m => m.id === config.modelName);

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Box className="w-8 h-8 text-cyan-400" /> Hugging Face <span className="text-cyan-400">MCP</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Model Context Protocol Orchestrator</p>
        </div>
        <div className="flex gap-4">
           {[1, 2, 3].map(i => (
             <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-300 ${step >= i ? 'bg-cyan-500' : 'bg-slate-800'}`} />
           ))}
        </div>
      </div>

      <div className="bg-surface/50 backdrop-blur-md rounded-2xl p-10 border border-slate-700/50 shadow-2xl min-h-[550px] flex flex-col">
        {step === 1 && (
          <div className="space-y-8 flex-1">
            <div className="flex items-center gap-3 text-white">
              <Layers className="text-cyan-400" />
              <h3 className="text-xl font-bold">Orchestration Layer: MCP Context Discovery</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category Domain</label>
                <select 
                  value={config.category} 
                  onChange={(e) => {
                    const cat = e.target.value;
                    setConfig({ ...config, category: cat, task: TASK_HIERARCHY[cat][0] });
                  }}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none"
                >
                  {Object.keys(TASK_HIERARCHY).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specific Task Class</label>
                <select 
                  value={config.task} 
                  onChange={(e) => setConfig({ ...config, task: e.target.value })}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none"
                >
                  {TASK_HIERARCHY[config.category].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 space-y-8 bg-slate-900/40 p-8 rounded-2xl border border-slate-800/50">
                <div className="flex justify-between items-center mb-4">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                     <Database size={14} className="text-cyan-400" /> Resource Scale Envelope (Range)
                   </label>
                   <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl">
                      <span className="text-cyan-400 font-mono font-bold text-sm">{config.paramMin}</span>
                      <MoveHorizontal size={14} className="text-cyan-600" />
                      <span className="text-cyan-400 font-mono font-bold text-sm">{config.paramMax}</span>
                   </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-slate-500 font-bold uppercase">Min Bound</span>
                       <span className="text-[10px] text-cyan-400 font-black">{config.paramMin}</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max={PARAM_SCALES.length - 1}
                      value={PARAM_SCALES.indexOf(config.paramMin)}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        const maxIdx = PARAM_SCALES.indexOf(config.paramMax);
                        const newMin = PARAM_SCALES[idx];
                        setConfig({
                          ...config,
                          paramMin: newMin,
                          paramMax: idx > maxIdx ? newMin : config.paramMax
                        });
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-slate-500 font-bold uppercase">Max Bound</span>
                       <span className="text-[10px] text-cyan-400 font-black">{config.paramMax}</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max={PARAM_SCALES.length - 1}
                      value={PARAM_SCALES.indexOf(config.paramMax)}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        const minIdx = PARAM_SCALES.indexOf(config.paramMin);
                        const newMax = PARAM_SCALES[idx];
                        setConfig({
                          ...config,
                          paramMax: newMax,
                          paramMin: idx < minIdx ? newMax : config.paramMin
                        });
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">MCP Registry Match (ResourceDiscovery)</label>
                {loadingModels ? (
                  <div className="flex items-center gap-3 text-cyan-400 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Loader2 className="animate-spin w-5 h-5" />
                    <span className="text-sm font-medium italic">Gemini is querying Hugging Face via MCP...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <select 
                        value={config.modelName} 
                        onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                        {suggestedModels.map(m => <option key={m.id} value={m.id}>{m.id} ({m.params})</option>)}
                    </select>
                    
                    {selectedModelData && (
                      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <Link2 size={12} className="text-cyan-500" /> {selectedModelData.uri}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedModelData.capabilities.map(cap => (
                            <span key={cap} className="px-2 py-1 bg-cyan-900/20 text-cyan-400 text-[10px] font-black uppercase rounded border border-cyan-500/20 flex items-center gap-1">
                              <Cpu size={10} /> {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 flex-1">
            <div className="flex items-center gap-3 text-white">
              <Zap className="text-yellow-400" />
              <h3 className="text-xl font-bold">Optimization Layer: Parameter Efficiency</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 flex items-center gap-4 p-6 bg-indigo-900/10 rounded-2xl border border-indigo-500/20">
                <input 
                  type="checkbox" 
                  id="usePeft"
                  checked={config.usePeft}
                  onChange={(e) => setConfig({ ...config, usePeft: e.target.checked })}
                  className="w-6 h-6 accent-cyan-500"
                />
                <label htmlFor="usePeft" className="flex-1 cursor-pointer">
                  <span className="block font-bold text-white text-lg">Enable PEFT Node Protocols</span>
                  <span className="block text-sm text-indigo-300/70">Inject Low-Rank Adaptation (LoRA) context into the federated pipeline</span>
                </label>
              </div>

              {config.usePeft && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Method</label>
                    <select 
                      value={config.peftType}
                      onChange={(e) => setConfig({...config, peftType: e.target.value as any})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-medium"
                    >
                      <option value="LORA">LoRA (Adaptive Rank)</option>
                      <option value="PREFIX_TUNING">Prefix Tuning</option>
                      <option value="P_TUNING">P-Tuning</option>
                      <option value="ADAPTIVE">Adaptive Aggregation</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adapter Rank (r)</label>
                    <input 
                      type="number" 
                      value={config.loraRank}
                      onChange={(e) => setConfig({...config, loraRank: parseInt(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 p-5 bg-slate-900/50 rounded-xl border border-slate-800 flex items-start gap-4">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <BrainCircuit className="w-5 h-5 text-cyan-400 shrink-0" />
                    </div>
                    <p className="text-sm text-slate-300 italic leading-relaxed">{peftExplanation || "Gemini is optimizing adapter placement..."}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 flex-1">
            <div className="flex items-center gap-3 text-white">
              <Settings2 className="text-emerald-400" />
              <h3 className="text-xl font-bold">Execution Layer: MCP Hyper-Orchestration</h3>
            </div>
            
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Protocol Synchronization Rounds</label>
                  <span className="text-cyan-400 font-mono text-lg">{config.rounds}</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="20" 
                  value={config.rounds}
                  onChange={(e) => setConfig({...config, rounds: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div className="p-6 rounded-2xl bg-emerald-900/10 border border-emerald-500/20 flex gap-6 shadow-xl shadow-emerald-950/20">
                 <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Server className="w-7 h-7 text-emerald-500" />
                 </div>
                 <div className="space-y-1">
                    <h4 className="font-bold text-emerald-400 text-lg">MCP Session Ready</h4>
                    <p className="text-sm text-emerald-100/60 leading-relaxed">
                        The Control Plane will manage {config.task} gradients. 
                        Targeting the resource envelope: <strong>{config.paramMin} to {config.paramMax}</strong>.
                        Model identified: <span className="text-emerald-300 underline underline-offset-4 decoration-emerald-500/30">{config.modelName}</span>.
                    </p>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={step > 1 ? () => setStep(step - 1) : onCancel} className="px-8 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-bold tracking-widest text-xs">
          {step > 1 ? 'PREVIOUS' : 'CANCEL'}
        </button>
        <button onClick={handleNext} className="px-10 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow-2xl shadow-cyan-900/30 flex items-center gap-3 transition-all transform active:scale-95">
          {step === 3 ? 'INITIALIZE MCP' : 'CONTINUE'} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};