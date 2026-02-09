import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Types
export interface FLConfig {
    modelId: string;
    task: string;
    capabilities: string[];
    epochs: number;
    batchSize: number;
    learningRate: number;
}

export interface TrainingProgress {
    epoch: number;
    totalEpochs: number;
    batch: number;
    totalBatches: number;
    loss: number;
    speed: number;
}

export interface FLContextType {
    // State
    deviceId: string | null;
    isInitialized: boolean;
    isTraining: boolean;
    progress: TrainingProgress | null;
    error: string | null;
    hasGPU: boolean;

    // Dataset
    datasetHandle: FileSystemDirectoryHandle | null;

    // Actions
    initialize: (config: FLConfig) => Promise<boolean>;
    startTraining: () => Promise<void>;
    stopTraining: () => void;
    selectDataset: () => Promise<boolean>;
}

const FLContext = createContext<FLContextType | null>(null);

// MCP Server URL
const MCP_URL = 'https://huggingface.co/spaces/Dhanushsaireddy144/multi-task-codefetch-mcp';

export function FLProvider({ children, serverUrl }: { children: React.ReactNode; serverUrl: string }) {
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    const [progress, setProgress] = useState<TrainingProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasGPU, setHasGPU] = useState(false);
    const [datasetHandle, setDatasetHandle] = useState<FileSystemDirectoryHandle | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const configRef = useRef<FLConfig | null>(null);

    // Generate device fingerprint on mount
    useEffect(() => {
        const initFingerprint = async () => {
            try {
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                setDeviceId(result.visitorId);
                console.log('[FL] Device ID:', result.visitorId);
            } catch (err) {
                console.error('[FL] Fingerprint failed:', err);
                // Fallback to random ID
                setDeviceId(`fallback_${Math.random().toString(36).slice(2)}`);
            }
        };
        initFingerprint();
    }, []);

    // Initialize worker and WebGPU
    const initialize = useCallback(async (config: FLConfig): Promise<boolean> => {
        if (!deviceId) {
            setError('Device ID not ready');
            return false;
        }

        try {
            setError(null);
            configRef.current = config;

            // Create worker
            workerRef.current = new Worker(
                new URL('../workers/fl.worker.ts', import.meta.url),
                { type: 'module' }
            );

            // Setup message handler
            workerRef.current.onmessage = (event) => {
                const { type, payload } = event.data;

                switch (type) {
                    case 'INIT':
                        setHasGPU(payload.gpu);
                        setIsInitialized(payload.gpu && payload.opfs);
                        if (!payload.gpu) {
                            setError('WebGPU not available');
                        }
                        break;

                    case 'TRAINING_PROGRESS':
                        setProgress(payload);
                        break;

                    case 'TRAINING_COMPLETE':
                        setIsTraining(false);
                        setProgress(null);
                        if (payload.status === 'completed') {
                            // Send weights to server
                            submitWeights(payload.weightsDelta);
                        }
                        break;

                    case 'ERROR':
                        setError(payload);
                        setIsTraining(false);
                        break;
                }
            };

            workerRef.current.onerror = (err) => {
                setError(`Worker error: ${err.message}`);
                setIsTraining(false);
            };

            // Send init message
            workerRef.current.postMessage({
                type: 'INIT',
                payload: {
                    ...config,
                    deviceId,
                    serverUrl,
                    mcpUrl: MCP_URL
                }
            });

            return true;
        } catch (err) {
            setError(`Init failed: ${err}`);
            return false;
        }
    }, [deviceId, serverUrl]);

    // Start training
    const startTraining = useCallback(async () => {
        if (!workerRef.current || !isInitialized) {
            setError('Not initialized');
            return;
        }

        setIsTraining(true);
        setError(null);
        workerRef.current.postMessage({ type: 'START_TRAINING' });
    }, [isInitialized]);

    // Stop training
    const stopTraining = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'STOP_TRAINING' });
        }
    }, []);

    // Select dataset directory
    const selectDataset = useCallback(async (): Promise<boolean> => {
        try {
            // Request directory access
            const handle = await window.showDirectoryPicker({
                mode: 'read'
            });
            setDatasetHandle(handle);
            console.log('[FL] Dataset selected:', handle.name);
            return true;
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError(`Dataset selection failed: ${err}`);
            }
            return false;
        }
    }, []);

    // Submit trained weights to server
    const submitWeights = async (weightsDelta: number[]) => {
        if (!deviceId || !configRef.current) return;

        try {
            const response = await fetch(`${serverUrl}/api/fl/updates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    num_examples: 1000,
                    avg_loss: 0.5,
                    weights_delta: {
                        lora_a: weightsDelta.slice(0, weightsDelta.length / 2),
                        lora_b: weightsDelta.slice(weightsDelta.length / 2)
                    }
                })
            });
            const result = await response.json();
            console.log('[FL] Weights submitted:', result);
        } catch (err) {
            console.error('[FL] Weight submission failed:', err);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const value: FLContextType = {
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
    };

    return <FLContext.Provider value={value}>{children}</FLContext.Provider>;
}

export function useFL(): FLContextType {
    const context = useContext(FLContext);
    if (!context) {
        throw new Error('useFL must be used within FLProvider');
    }
    return context;
}

// Type declaration for showDirectoryPicker
declare global {
    interface Window {
        showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
    }
}
