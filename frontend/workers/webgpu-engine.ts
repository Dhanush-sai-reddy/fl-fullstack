/**
 * WebGPU Compute Engine for LoRA Training
 * 
 * This module provides:
 * - GPU buffer management for base weights and adapters
 * - WGSL compute shaders for forward/backward pass
 * - LoRA-specific matrix operations (W_base + A * B)
 */

// LoRA configuration
export interface LoRAConfig {
    rank: number;        // LoRA rank (e.g., 8)
    alpha: number;       // Scaling factor (typically rank * 2)
    targetLayers: string[]; // Which layers to adapt
}

// Buffer descriptors for GPU memory
export interface GPUBufferDescriptor {
    name: string;
    size: number;
    usage: GPUBufferUsageFlags;
    data?: Float32Array;
}

/**
 * WebGPU Compute Engine
 */
export class WebGPUEngine {
    private device: GPUDevice | null = null;
    private commandEncoder: GPUCommandEncoder | null = null;

    // Buffers
    private baseWeightsBuffer: GPUBuffer | null = null;
    private loraABuffer: GPUBuffer | null = null;
    private loraBBuffer: GPUBuffer | null = null;
    private gradientsBuffer: GPUBuffer | null = null;
    private outputBuffer: GPUBuffer | null = null;

    // Pipelines
    private forwardPipeline: GPUComputePipeline | null = null;
    private backwardPipeline: GPUComputePipeline | null = null;

    // Config
    private loraConfig: LoRAConfig = { rank: 8, alpha: 16, targetLayers: [] };
    private hiddenSize: number = 768; // e.g., BERT base

    /**
     * Initialize WebGPU device and create pipelines
     */
    async initialize(device: GPUDevice, config: LoRAConfig): Promise<boolean> {
        this.device = device;
        this.loraConfig = config;

        try {
            // Create compute pipelines
            await this.createPipelines();
            return true;
        } catch (error) {
            console.error('[WebGPU] Initialization failed:', error);
            return false;
        }
    }

    /**
     * Create compute shader pipelines
     */
    private async createPipelines(): Promise<void> {
        if (!this.device) throw new Error('Device not initialized');

        // Forward pass shader: Compute output = input * (W_base + scale * A * B)
        const forwardShaderCode = /* wgsl */`
      struct Params {
        inputSize: u32,
        outputSize: u32,
        loraRank: u32,
        scale: f32,
      }

      @group(0) @binding(0) var<uniform> params: Params;
      @group(0) @binding(1) var<storage, read> input: array<f32>;
      @group(0) @binding(2) var<storage, read> baseWeights: array<f32>;
      @group(0) @binding(3) var<storage, read> loraA: array<f32>;
      @group(0) @binding(4) var<storage, read> loraB: array<f32>;
      @group(0) @binding(5) var<storage, read_write> output: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let idx = gid.x;
        if (idx >= params.outputSize) { return; }

        var sum: f32 = 0.0;
        
        // Base weight contribution: W_base * input
        for (var i: u32 = 0u; i < params.inputSize; i = i + 1u) {
          let baseIdx = idx * params.inputSize + i;
          sum = sum + baseWeights[baseIdx] * input[i];
        }

        // LoRA contribution: scale * (A * B) * input
        // First compute B * input (reduces to loraRank)
        var loraIntermediate: f32 = 0.0;
        for (var r: u32 = 0u; r < params.loraRank; r = r + 1u) {
          var bContrib: f32 = 0.0;
          for (var i: u32 = 0u; i < params.inputSize; i = i + 1u) {
            let bIdx = r * params.inputSize + i;
            bContrib = bContrib + loraB[bIdx] * input[i];
          }
          // Then multiply by A[idx, r]
          let aIdx = idx * params.loraRank + r;
          loraIntermediate = loraIntermediate + loraA[aIdx] * bContrib;
        }

        output[idx] = sum + params.scale * loraIntermediate;
      }
    `;

        // Backward pass shader: Compute gradients for LoRA A and B
        const backwardShaderCode = /* wgsl */`
      struct Params {
        inputSize: u32,
        outputSize: u32,
        loraRank: u32,
        learningRate: f32,
      }

      @group(0) @binding(0) var<uniform> params: Params;
      @group(0) @binding(1) var<storage, read> input: array<f32>;
      @group(0) @binding(2) var<storage, read> gradOutput: array<f32>;
      @group(0) @binding(3) var<storage, read> loraA: array<f32>;
      @group(0) @binding(4) var<storage, read> loraB: array<f32>;
      @group(0) @binding(5) var<storage, read_write> gradA: array<f32>;
      @group(0) @binding(6) var<storage, read_write> gradB: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let idx = gid.x;
        
        // Update LoRA A gradients
        if (idx < params.outputSize * params.loraRank) {
          let outIdx = idx / params.loraRank;
          let rankIdx = idx % params.loraRank;
          
          var grad: f32 = 0.0;
          for (var i: u32 = 0u; i < params.inputSize; i = i + 1u) {
            let bIdx = rankIdx * params.inputSize + i;
            grad = grad + gradOutput[outIdx] * loraB[bIdx] * input[i];
          }
          gradA[idx] = grad * params.learningRate;
        }

        // Update LoRA B gradients
        if (idx < params.loraRank * params.inputSize) {
          let rankIdx = idx / params.inputSize;
          let inIdx = idx % params.inputSize;
          
          var grad: f32 = 0.0;
          for (var o: u32 = 0u; o < params.outputSize; o = o + 1u) {
            let aIdx = o * params.loraRank + rankIdx;
            grad = grad + gradOutput[o] * loraA[aIdx] * input[inIdx];
          }
          gradB[idx] = grad * params.learningRate;
        }
      }
    `;

        // Create shader modules
        const forwardModule = this.device.createShaderModule({
            label: 'LoRA Forward Shader',
            code: forwardShaderCode
        });

        const backwardModule = this.device.createShaderModule({
            label: 'LoRA Backward Shader',
            code: backwardShaderCode
        });

        // Create compute pipelines
        this.forwardPipeline = this.device.createComputePipeline({
            label: 'LoRA Forward Pipeline',
            layout: 'auto',
            compute: {
                module: forwardModule,
                entryPoint: 'main'
            }
        });

        this.backwardPipeline = this.device.createComputePipeline({
            label: 'LoRA Backward Pipeline',
            layout: 'auto',
            compute: {
                module: backwardModule,
                entryPoint: 'main'
            }
        });

        console.log('[WebGPU] Compute pipelines created');
    }

    /**
     * Initialize LoRA buffers with random small values
     */
    initializeLoRABuffers(inputSize: number, outputSize: number): void {
        if (!this.device) throw new Error('Device not initialized');

        const rank = this.loraConfig.rank;

        // LoRA A: outputSize x rank
        const loraASize = outputSize * rank;
        const loraAData = new Float32Array(loraASize);
        for (let i = 0; i < loraASize; i++) {
            loraAData[i] = (Math.random() - 0.5) * 0.02;
        }

        // LoRA B: rank x inputSize (initialized to zero for stability)
        const loraBSize = rank * inputSize;
        const loraBData = new Float32Array(loraBSize);
        // B starts at zero so initial LoRA contribution is zero

        this.loraABuffer = this.device.createBuffer({
            label: 'LoRA A Buffer',
            size: loraAData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.loraABuffer.getMappedRange()).set(loraAData);
        this.loraABuffer.unmap();

        this.loraBBuffer = this.device.createBuffer({
            label: 'LoRA B Buffer',
            size: loraBData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.loraBBuffer.getMappedRange()).set(loraBData);
        this.loraBBuffer.unmap();

        // Gradient buffers
        this.gradientsBuffer = this.device.createBuffer({
            label: 'Gradients Buffer',
            size: Math.max(loraASize, loraBSize) * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        console.log(`[WebGPU] LoRA buffers initialized: A(${outputSize}x${rank}), B(${rank}x${inputSize})`);
    }

    /**
     * Extract current LoRA weights from GPU
     */
    async extractLoRAWeights(): Promise<{ A: Float32Array; B: Float32Array }> {
        if (!this.device || !this.loraABuffer || !this.loraBBuffer) {
            throw new Error('Buffers not initialized');
        }

        // Create staging buffers for readback
        const stagingA = this.device.createBuffer({
            size: this.loraABuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const stagingB = this.device.createBuffer({
            size: this.loraBBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        // Copy from GPU buffers to staging
        const encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.loraABuffer, 0, stagingA, 0, stagingA.size);
        encoder.copyBufferToBuffer(this.loraBBuffer, 0, stagingB, 0, stagingB.size);
        this.device.queue.submit([encoder.finish()]);

        // Read back
        await stagingA.mapAsync(GPUMapMode.READ);
        await stagingB.mapAsync(GPUMapMode.READ);

        const A = new Float32Array(stagingA.getMappedRange().slice(0));
        const B = new Float32Array(stagingB.getMappedRange().slice(0));

        stagingA.unmap();
        stagingB.unmap();
        stagingA.destroy();
        stagingB.destroy();

        return { A, B };
    }

    /**
     * Compute weight delta (difference from initial weights)
     */
    computeWeightDelta(
        currentA: Float32Array,
        currentB: Float32Array,
        initialA: Float32Array,
        initialB: Float32Array
    ): { deltaA: Float32Array; deltaB: Float32Array } {
        const deltaA = new Float32Array(currentA.length);
        const deltaB = new Float32Array(currentB.length);

        for (let i = 0; i < currentA.length; i++) {
            deltaA[i] = currentA[i] - initialA[i];
        }
        for (let i = 0; i < currentB.length; i++) {
            deltaB[i] = currentB[i] - initialB[i];
        }

        return { deltaA, deltaB };
    }

    /**
     * Serialize weights for transmission
     */
    serializeWeights(weights: { A: Float32Array; B: Float32Array }): ArrayBuffer {
        const header = new Uint32Array([weights.A.length, weights.B.length]);
        const totalSize = header.byteLength + weights.A.byteLength + weights.B.byteLength;

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        // Write header
        view.setUint32(0, weights.A.length, true);
        view.setUint32(4, weights.B.length, true);

        // Write weights
        new Float32Array(buffer, 8, weights.A.length).set(weights.A);
        new Float32Array(buffer, 8 + weights.A.byteLength, weights.B.length).set(weights.B);

        return buffer;
    }

    /**
     * Deserialize weights received from server
     */
    deserializeWeights(buffer: ArrayBuffer): { A: Float32Array; B: Float32Array } {
        const view = new DataView(buffer);
        const aLength = view.getUint32(0, true);
        const bLength = view.getUint32(4, true);

        const A = new Float32Array(buffer, 8, aLength);
        const B = new Float32Array(buffer, 8 + aLength * 4, bLength);

        return { A: new Float32Array(A), B: new Float32Array(B) };
    }

    /**
     * Clean up GPU resources
     */
    destroy(): void {
        this.baseWeightsBuffer?.destroy();
        this.loraABuffer?.destroy();
        this.loraBBuffer?.destroy();
        this.gradientsBuffer?.destroy();
        this.outputBuffer?.destroy();

        this.baseWeightsBuffer = null;
        this.loraABuffer = null;
        this.loraBBuffer = null;
        this.gradientsBuffer = null;
        this.outputBuffer = null;

        console.log('[WebGPU] Resources cleaned up');
    }
}

/**
 * Helper: Check if WebGPU is available
 */
export function isWebGPUAvailable(): boolean {
    return 'gpu' in navigator;
}

/**
 * Helper: Request high-performance GPU device
 */
export async function requestGPUDevice(): Promise<GPUDevice | null> {
    if (!isWebGPUAvailable()) return null;

    try {
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });
        if (!adapter) return null;

        return await adapter.requestDevice({
            requiredFeatures: [],
            requiredLimits: {
                maxBufferSize: adapter.limits.maxBufferSize,
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
            }
        });
    } catch {
        return null;
    }
}
