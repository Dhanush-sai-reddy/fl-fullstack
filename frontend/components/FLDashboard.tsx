import React, { useState } from 'react';
import { useFL, FLConfig } from '../context/FLContext';
import { Play, Square, FolderOpen, Cpu, HardDrive, Wifi, AlertCircle, CheckCircle } from 'lucide-react';

interface FLDashboardProps {
    serverUrl: string;
}

export function FLDashboard({ serverUrl }: FLDashboardProps) {
    const {
        deviceId,
        isInitialized,
        isTraining,
        progress,
        error,
        hasGPU,
        datasetHandle,
        initialize,
        startTraining,
        stopTraining,
        selectDataset
    } = useFL();

    const [config, setConfig] = useState<FLConfig>({
        modelId: 'bert-base-uncased',
        task: 'text-classification',
        capabilities: ['peft', 'lora_rank_8'],
        epochs: 5,
        batchSize: 32,
        learningRate: 0.0001
    });

    const handleInitialize = async () => {
        await initialize(config);
    };

    const progressPercent = progress
        ? ((progress.epoch - 1) * progress.totalBatches + progress.batch) / (progress.totalEpochs * progress.totalBatches) * 100
        : 0;

    return (
        <div className="fl-dashboard">
            <div className="fl-header">
                <h2>Browser Training Client</h2>
                <div className="fl-status-badges">
                    <StatusBadge
                        icon={<Cpu size={14} />}
                        label="GPU"
                        status={hasGPU ? 'success' : 'warning'}
                    />
                    <StatusBadge
                        icon={<HardDrive size={14} />}
                        label="OPFS"
                        status={isInitialized ? 'success' : 'idle'}
                    />
                    <StatusBadge
                        icon={<Wifi size={14} />}
                        label="MCP"
                        status="success"
                    />
                </div>
            </div>

            {error && (
                <div className="fl-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <div className="fl-device-id">
                Device ID: <code>{deviceId || 'Generating...'}</code>
            </div>

            {/* Configuration Section */}
            <div className="fl-config-section">
                <h3>Training Configuration</h3>

                <div className="fl-config-grid">
                    <label>
                        Model ID
                        <input
                            type="text"
                            value={config.modelId}
                            onChange={(e) => setConfig({ ...config, modelId: e.target.value })}
                            disabled={isTraining}
                        />
                    </label>

                    <label>
                        Task
                        <select
                            value={config.task}
                            onChange={(e) => setConfig({ ...config, task: e.target.value })}
                            disabled={isTraining}
                        >
                            <option value="text-classification">Text Classification</option>
                            <option value="text-generation">Text Generation</option>
                            <option value="image-classification">Image Classification</option>
                            <option value="summarization">Summarization</option>
                        </select>
                    </label>

                    <label>
                        Epochs
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={config.epochs}
                            onChange={(e) => setConfig({ ...config, epochs: parseInt(e.target.value) || 1 })}
                            disabled={isTraining}
                        />
                    </label>

                    <label>
                        Batch Size
                        <input
                            type="number"
                            min={1}
                            max={256}
                            value={config.batchSize}
                            onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 1 })}
                            disabled={isTraining}
                        />
                    </label>

                    <label>
                        Learning Rate
                        <input
                            type="number"
                            step={0.0001}
                            min={0.00001}
                            max={0.1}
                            value={config.learningRate}
                            onChange={(e) => setConfig({ ...config, learningRate: parseFloat(e.target.value) || 0.0001 })}
                            disabled={isTraining}
                        />
                    </label>
                </div>
            </div>

            {/* Dataset Section */}
            <div className="fl-dataset-section">
                <h3>Local Dataset</h3>
                <button
                    className="fl-btn fl-btn-secondary"
                    onClick={selectDataset}
                    disabled={isTraining}
                >
                    <FolderOpen size={16} />
                    {datasetHandle ? datasetHandle.name : 'Select Dataset Folder'}
                </button>
                {datasetHandle && (
                    <span className="fl-dataset-selected">
                        <CheckCircle size={14} />
                        Dataset ready
                    </span>
                )}
            </div>

            {/* Controls */}
            <div className="fl-controls">
                {!isInitialized ? (
                    <button
                        className="fl-btn fl-btn-primary"
                        onClick={handleInitialize}
                        disabled={!deviceId}
                    >
                        Initialize Training Environment
                    </button>
                ) : isTraining ? (
                    <button
                        className="fl-btn fl-btn-danger"
                        onClick={stopTraining}
                    >
                        <Square size={16} />
                        Stop Training
                    </button>
                ) : (
                    <button
                        className="fl-btn fl-btn-primary"
                        onClick={startTraining}
                    >
                        <Play size={16} />
                        Start Training
                    </button>
                )}
            </div>

            {/* Progress Section */}
            {progress && (
                <div className="fl-progress-section">
                    <h3>Training Progress</h3>

                    <div className="fl-progress-bar-container">
                        <div
                            className="fl-progress-bar"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className="fl-progress-stats">
                        <div className="fl-stat">
                            <span className="fl-stat-label">Epoch</span>
                            <span className="fl-stat-value">{progress.epoch}/{progress.totalEpochs}</span>
                        </div>
                        <div className="fl-stat">
                            <span className="fl-stat-label">Batch</span>
                            <span className="fl-stat-value">{progress.batch}/{progress.totalBatches}</span>
                        </div>
                        <div className="fl-stat">
                            <span className="fl-stat-label">Loss</span>
                            <span className="fl-stat-value">{progress.loss.toFixed(4)}</span>
                        </div>
                        <div className="fl-stat">
                            <span className="fl-stat-label">Speed</span>
                            <span className="fl-stat-value">{progress.speed.toFixed(0)} tok/s</span>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .fl-dashboard {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 16px;
          padding: 24px;
          color: #e2e8f0;
          font-family: 'Inter', system-ui, sans-serif;
          backdrop-filter: blur(12px);
        }

        .fl-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .fl-header h2 {
          margin: 0;
          font-size: 1.5rem;
          background: linear-gradient(90deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .fl-status-badges {
          display: flex;
          gap: 8px;
        }

        .fl-device-id {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .fl-device-id code {
          background: rgba(99, 102, 241, 0.2);
          padding: 2px 8px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
        }

        .fl-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          color: #fca5a5;
        }

        .fl-config-section, .fl-dataset-section, .fl-progress-section {
          margin-bottom: 24px;
        }

        .fl-config-section h3, .fl-dataset-section h3, .fl-progress-section h3 {
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .fl-config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .fl-config-grid label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .fl-config-grid input, .fl-config-grid select {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 6px;
          padding: 8px 12px;
          color: #e2e8f0;
          font-size: 0.875rem;
        }

        .fl-config-grid input:focus, .fl-config-grid select:focus {
          outline: none;
          border-color: #818cf8;
        }

        .fl-config-grid input:disabled, .fl-config-grid select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .fl-dataset-section {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .fl-dataset-selected {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #4ade80;
          font-size: 0.875rem;
        }

        .fl-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .fl-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .fl-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .fl-btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .fl-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }

        .fl-btn-secondary {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .fl-btn-secondary:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.3);
        }

        .fl-btn-danger {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
        }

        .fl-progress-bar-container {
          height: 8px;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .fl-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #c084fc);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .fl-progress-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .fl-stat {
          text-align: center;
        }

        .fl-stat-label {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 4px;
        }

        .fl-stat-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: #e2e8f0;
        }
      `}</style>
        </div>
    );
}

function StatusBadge({
    icon,
    label,
    status
}: {
    icon: React.ReactNode;
    label: string;
    status: 'success' | 'warning' | 'idle'
}) {
    const colors = {
        success: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.5)', text: '#4ade80' },
        warning: { bg: 'rgba(234, 179, 8, 0.2)', border: 'rgba(234, 179, 8, 0.5)', text: '#fbbf24' },
        idle: { bg: 'rgba(100, 116, 139, 0.2)', border: 'rgba(100, 116, 139, 0.5)', text: '#94a3b8' }
    };

    const { bg, border, text } = colors[status];

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 500,
            background: bg,
            border: `1px solid ${border}`,
            color: text
        }}>
            {icon}
            {label}
        </span>
    );
}
