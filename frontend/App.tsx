import React, { useState } from 'react';
import { AppMode, ModelConfig } from './types';
import { SetupWizard } from './components/SetupWizard';
import { HostDashboard } from './components/HostDashboard';
import { ClientView } from './components/ClientView';
import { FLDashboard } from './components/FLDashboard';
import { FLProvider } from './context/FLContext';
import { WebMCPBridge } from './components/WebMCPBridge';
import { Network, MonitorSmartphone, ShieldCheck, Cpu } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [hostConfig, setHostConfig] = useState<ModelConfig | null>(null);
  const [sessionCode, setSessionCode] = useState<string>('');

  const handleHostComplete = (config: ModelConfig) => {
    setHostConfig(config);
    setSessionCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    setMode(AppMode.HOST_DASHBOARD);
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.LANDING:
        return (
          <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="text-center max-w-2xl mx-auto z-10">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
                  <ShieldCheck className="w-12 h-12 text-cyan-400" />
                </div>
              </div>
              <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
                FedLearn <span className="text-cyan-400">Nexus</span>
              </h1>
              <p className="text-lg text-slate-400 mb-12 leading-relaxed">
                Deploy secure, decentralized training sessions instantly.
                Configure Hugging Face models with PEFT/LoRA and orchestrate federated learning across any device with a browser.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mx-auto">
                <button
                  onClick={() => setMode(AppMode.HOST_SETUP)}
                  className="group relative p-6 bg-surface hover:bg-slate-800 border border-slate-700 rounded-xl transition-all hover:scale-105 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-900/20 text-left"
                >
                  <div className="absolute top-4 right-4 text-slate-600 group-hover:text-cyan-400 transition-colors">
                    <Network size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Host Session</h3>
                  <p className="text-sm text-slate-400">Initialize a FL server, configure model parameters, and invite peers.</p>
                </button>

                <button
                  onClick={() => setMode(AppMode.CLIENT)}
                  className="group relative p-6 bg-surface hover:bg-slate-800 border border-slate-700 rounded-xl transition-all hover:scale-105 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-900/20 text-left"
                >
                  <div className="absolute top-4 right-4 text-slate-600 group-hover:text-emerald-400 transition-colors">
                    <MonitorSmartphone size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Join Node</h3>
                  <p className="text-sm text-slate-400">Connect your device to an existing session and contribute compute.</p>
                </button>

                <button
                  onClick={() => setMode(AppMode.BROWSER_TRAINING)}
                  className="group relative p-6 bg-surface hover:bg-slate-800 border border-slate-700 rounded-xl transition-all hover:scale-105 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-900/20 text-left"
                >
                  <div className="absolute top-4 right-4 text-slate-600 group-hover:text-purple-400 transition-colors">
                    <Cpu size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Browser Training</h3>
                  <p className="text-sm text-slate-400">Train models directly in your browser using WebGPU acceleration.</p>
                </button>
              </div>
            </div>

            <div className="absolute bottom-8 text-slate-600 text-sm">
              Powered by Gemini API & Hugging Face • Local Simulation Mode
            </div>
          </div>
        );

      case AppMode.HOST_SETUP:
        return (
          <div className="min-h-screen bg-dark">
            <SetupWizard
              onComplete={handleHostComplete}
              onCancel={() => setMode(AppMode.LANDING)}
            />
          </div>
        );

      case AppMode.HOST_DASHBOARD:
        return hostConfig ? (
          <HostDashboard
            config={hostConfig}
            sessionCode={sessionCode}
            onBack={() => setMode(AppMode.LANDING)}
          />
        ) : null;

      case AppMode.CLIENT:
        return <ClientView onBack={() => setMode(AppMode.LANDING)} />;

      case AppMode.BROWSER_TRAINING:
        return (
          <div className="min-h-screen bg-dark p-8">
            <button
              onClick={() => setMode(AppMode.LANDING)}
              className="mb-6 text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
            <FLProvider serverUrl="http://localhost:8000">
              <WebMCPBridge />
              <FLDashboard serverUrl="http://localhost:8000" />
            </FLProvider>
          </div>
        );

      default:
        return <div>Error</div>;
    }
  };

  return (
    <>
      {renderContent()}
    </>
  );
};

export default App;