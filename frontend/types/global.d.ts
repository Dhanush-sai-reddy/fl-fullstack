// Type declarations for modules without types

declare module '@fingerprintjs/fingerprintjs' {
    interface GetResult {
        visitorId: string;
        components: Record<string, unknown>;
    }

    interface Agent {
        get(): Promise<GetResult>;
    }

    interface FingerprintJS {
        load(): Promise<Agent>;
    }

    const FingerprintJS: FingerprintJS;
    export default FingerprintJS;
}

// Extend FileSystemDirectoryHandle with entries() method
interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

// WebGPU Types (for environments without @webgpu/types)
interface Navigator {
    gpu: GPU;
}

interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
    powerPreference?: 'low-power' | 'high-performance';
}

interface GPUAdapter {
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
    readonly limits: GPUSupportedLimits;
}

interface GPUSupportedLimits {
    maxBufferSize: number;
    maxStorageBufferBindingSize: number;
}

interface GPUDeviceDescriptor {
    requiredFeatures?: GPUFeatureName[];
    requiredLimits?: Partial<GPUSupportedLimits>;
}

type GPUFeatureName = string;

interface GPUDevice {
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
    createCommandEncoder(): GPUCommandEncoder;
    readonly queue: GPUQueue;
    readonly lost: Promise<GPUDeviceLostInfo>;
    destroy(): void;
}

interface GPUDeviceLostInfo {
    message: string;
    reason: string;
}

interface GPUBufferDescriptor {
    label?: string;
    size: number;
    usage: GPUBufferUsageFlags;
    mappedAtCreation?: boolean;
}

type GPUBufferUsageFlags = number;

declare const GPUBufferUsage: {
    MAP_READ: number;
    MAP_WRITE: number;
    COPY_SRC: number;
    COPY_DST: number;
    INDEX: number;
    VERTEX: number;
    UNIFORM: number;
    STORAGE: number;
    INDIRECT: number;
    QUERY_RESOLVE: number;
};

declare const GPUMapMode: {
    READ: number;
    WRITE: number;
};

interface GPUBuffer {
    getMappedRange(offset?: number, size?: number): ArrayBuffer;
    unmap(): void;
    mapAsync(mode: number): Promise<void>;
    readonly size: number;
    destroy(): void;
}

interface GPUShaderModuleDescriptor {
    label?: string;
    code: string;
}

interface GPUShaderModule { }

interface GPUComputePipelineDescriptor {
    label?: string;
    layout: 'auto' | unknown;
    compute: {
        module: GPUShaderModule;
        entryPoint: string;
    };
}

interface GPUComputePipeline { }

interface GPUCommandEncoder {
    copyBufferToBuffer(source: GPUBuffer, sourceOffset: number, destination: GPUBuffer, destinationOffset: number, size: number): void;
    finish(): GPUCommandBuffer;
}

interface GPUCommandBuffer { }

interface GPUQueue {
    submit(commandBuffers: GPUCommandBuffer[]): void;
}
