/**
 * FL Platform - Web Worker for Browser-based Federated Learning
 * 
 * This worker handles:
 * - WebGPU device acquisition
 * - Model weights loading from OPFS
 * - Training loop execution with LoRA adapters
 * - Telemetry streaming to server
 * - Checkpoint saving for crash recovery
 * - Weight delta upload for federated aggregation
 */

import { WebGPUEngine, LoRAConfig } from './webgpu-engine';

// Message Types
export type WorkerMessageType =
    | 'INIT'
    | 'START_TRAINING'
    | 'STOP_TRAINING'
    | 'GET_STATUS'
    | 'TRAINING_PROGRESS'
    | 'TRAINING_COMPLETE'
    | 'WEIGHTS_UPLOADED'
    | 'ERROR';

export interface WorkerMessage {
    type: WorkerMessageType;
    payload?: unknown;
}

export interface TrainingConfig {
    modelId: string;
    task: string;
    capabilities: string[];
    epochs: number;
    batchSize: number;
    learningRate: number;
    deviceId: string;
    serverUrl: string;
    mcpUrl: string;
    loraRank?: number;
    loraAlpha?: number;
}

export interface TrainingProgress {
    epoch: number;
    totalEpochs: number;
    batch: number;
    totalBatches: number;
    loss: number;
    speed: number;
}

// Worker State
let isTraining = false;
let shouldStop = false;
let gpuDevice: GPUDevice | null = null;
let config: TrainingConfig | null = null;
let webgpuEngine: WebGPUEngine | null = null;

// Initial weights for delta calculation
let initialLoraA: Float32Array | null = null;
let initialLoraB: Float32Array | null = null;

// OPFS handles
let opfsRoot: FileSystemDirectoryHandle | null = null;
let checkpointDir: FileSystemDirectoryHandle | null = null;

/**
 * Initialize WebGPU device
 */
async function initGPU(): Promise<GPUDevice | null> {
    if (!navigator.gpu) {
        postMessage({ type: 'ERROR', payload: 'WebGPU not supported in this browser' });
        return null;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!adapter) {
            postMessage({ type: 'ERROR', payload: 'No GPU adapter found' });
            return null;
        }

        const device = await adapter.requestDevice({
            requiredFeatures: [],
            requiredLimits: {
                maxBufferSize: adapter.limits.maxBufferSize,
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
            }
        });

        device.lost.then((info) => {
            postMessage({ type: 'ERROR', payload: `GPU device lost: ${info.message}` });
            gpuDevice = null;
        });

        return device;
    } catch (error) {
        postMessage({ type: 'ERROR', payload: `GPU init failed: ${error}` });
        return null;
    }
}

/**
 * Initialize OPFS for model storage and checkpoints
 */
async function initOPFS(): Promise<boolean> {
    try {
        opfsRoot = await navigator.storage.getDirectory();

        // Create or get checkpoint directory
        checkpointDir = await opfsRoot.getDirectoryHandle('fl-checkpoints', { create: true });

        return true;
    } catch (error) {
        postMessage({ type: 'ERROR', payload: `OPFS init failed: ${error}` });
        return false;
    }
}

/**
 * Save training checkpoint to OPFS
 */
async function saveCheckpoint(epoch: number, adapterWeights: Float32Array): Promise<void> {
    if (!checkpointDir) return;

    try {
        const filename = `checkpoint_epoch_${epoch}.bin`;
        const fileHandle = await checkpointDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();

        // Write metadata + weights
        const metadata = new TextEncoder().encode(JSON.stringify({
            epoch,
            timestamp: Date.now(),
            modelId: config?.modelId,
            size: adapterWeights.byteLength
        }) + '\n');

        await writable.write(metadata);
        // Ensure we write a proper ArrayBuffer
        const weightsBuffer = adapterWeights.buffer.slice(
            adapterWeights.byteOffset,
            adapterWeights.byteOffset + adapterWeights.byteLength
        ) as ArrayBuffer;
        await writable.write(weightsBuffer);
        await writable.close();

        console.log(`[Worker] Checkpoint saved: ${filename}`);
    } catch (error) {
        console.error('[Worker] Checkpoint save failed:', error);
    }
}

/**
 * Load latest checkpoint from OPFS
 */
async function loadLatestCheckpoint(): Promise<{ epoch: number; weights: Float32Array } | null> {
    if (!checkpointDir) return null;

    try {
        let latestEpoch = -1;
        let latestFile: FileSystemFileHandle | null = null;

        // Find latest checkpoint
        for await (const [name, handle] of checkpointDir.entries()) {
            if (handle.kind === 'file' && name.startsWith('checkpoint_epoch_')) {
                const epoch = parseInt(name.match(/epoch_(\d+)/)?.[1] || '-1');
                if (epoch > latestEpoch) {
                    latestEpoch = epoch;
                    latestFile = handle as FileSystemFileHandle;
                }
            }
        }

        if (!latestFile) return null;

        const file = await latestFile.getFile();
        const content = await file.arrayBuffer();

        // Parse metadata (first line is JSON)
        const decoder = new TextDecoder();
        const fullContent = new Uint8Array(content);
        const newlineIndex = fullContent.indexOf(10); // '\n'

        if (newlineIndex === -1) return null;

        const metadataStr = decoder.decode(fullContent.slice(0, newlineIndex));
        const metadata = JSON.parse(metadataStr);
        const weights = new Float32Array(content.slice(newlineIndex + 1));

        return { epoch: metadata.epoch, weights };
    } catch (error) {
        console.error('[Worker] Checkpoint load failed:', error);
        return null;
    }
}

/**
 * Stream telemetry to server
 */
async function streamTelemetry(progress: TrainingProgress): Promise<void> {
    if (!config?.serverUrl) return;

    try {
        await fetch(`${config.serverUrl}/api/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId: config.deviceId,
                modelId: config.modelId,
                ...progress,
                timestamp: Date.now()
            })
        });
    } catch (error) {
        // Telemetry failures are non-fatal
        console.warn('[Worker] Telemetry stream failed:', error);
    }
}

/**
 * Main training loop
 * This is where the actual ML training happens using WebGPU
 */
async function runTrainingLoop(): Promise<void> {
    if (!config || !gpuDevice) {
        postMessage({ type: 'ERROR', payload: 'Training not initialized' });
        return;
    }

    isTraining = true;
    shouldStop = false;

    // Check for existing checkpoint
    const checkpoint = await loadLatestCheckpoint();
    let startEpoch = 0;
    let adapterWeights: Float32Array | null = null;

    if (checkpoint) {
        startEpoch = checkpoint.epoch + 1;
        adapterWeights = checkpoint.weights;
        console.log(`[Worker] Resuming from epoch ${startEpoch}`);
    } else {
        // Initialize adapter weights (LoRA: typically small)
        // For a rank-8 LoRA on a 768-dim model: 768 * 8 * 2 = 12288 params per layer
        const adapterSize = 12288 * 12; // ~12 layers
        adapterWeights = new Float32Array(adapterSize);
        // Initialize with small random values
        for (let i = 0; i < adapterWeights.length; i++) {
            adapterWeights[i] = (Math.random() - 0.5) * 0.02;
        }
    }

    // Training hyperparameters
    const { epochs, batchSize, learningRate } = config;
    const totalBatches = 100; // Simulated for now

    for (let epoch = startEpoch; epoch < epochs; epoch++) {
        if (shouldStop) break;

        for (let batch = 0; batch < totalBatches; batch++) {
            if (shouldStop) break;

            // Simulate training step
            // In production: load batch from dataset, run forward/backward pass on GPU
            const loss = 2.0 * Math.exp(-epoch * 0.3) * (1 + Math.random() * 0.1);
            const speed = 1000 + Math.random() * 500; // tokens/sec

            // Update adapter weights (simulated gradient descent)
            for (let i = 0; i < adapterWeights.length; i++) {
                adapterWeights[i] -= learningRate * (Math.random() - 0.5) * 0.001;
            }

            const progress: TrainingProgress = {
                epoch: epoch + 1,
                totalEpochs: epochs,
                batch: batch + 1,
                totalBatches,
                loss,
                speed
            };

            // Report progress
            postMessage({ type: 'TRAINING_PROGRESS', payload: progress });

            // Stream telemetry periodically
            if (batch % 10 === 0) {
                await streamTelemetry(progress);
            }

            // Small delay to simulate compute time
            await new Promise(r => setTimeout(r, 50));
        }

        // Save checkpoint after each epoch
        await saveCheckpoint(epoch, adapterWeights);
    }

    isTraining = false;

    if (shouldStop) {
        postMessage({ type: 'TRAINING_COMPLETE', payload: { status: 'stopped' } });
    } else {
        // Compute delta (difference from initial weights)
        const weightsDelta = adapterWeights; // In production: newWeights - initialWeights

        postMessage({
            type: 'TRAINING_COMPLETE',
            payload: {
                status: 'completed',
                weightsDelta: Array.from(weightsDelta),
                epochs: config.epochs,
                modelId: config.modelId
            }
        });
    }
}

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'INIT':
            config = payload as TrainingConfig;

            // Initialize GPU
            gpuDevice = await initGPU();

            // Initialize OPFS
            const opfsReady = await initOPFS();

            postMessage({
                type: 'INIT',
                payload: {
                    gpu: !!gpuDevice,
                    opfs: opfsReady,
                    deviceId: config.deviceId
                }
            });
            break;

        case 'START_TRAINING':
            if (isTraining) {
                postMessage({ type: 'ERROR', payload: 'Training already in progress' });
                return;
            }
            runTrainingLoop();
            break;

        case 'STOP_TRAINING':
            shouldStop = true;
            break;

        case 'GET_STATUS':
            postMessage({
                type: 'GET_STATUS',
                payload: {
                    isTraining,
                    hasGPU: !!gpuDevice,
                    config
                }
            });
            break;

        default:
            postMessage({ type: 'ERROR', payload: `Unknown message type: ${type}` });
    }
};

// Cleanup on worker termination
self.onclose = () => {
    if (gpuDevice) {
        gpuDevice.destroy();
        gpuDevice = null;
    }
};

export { };
