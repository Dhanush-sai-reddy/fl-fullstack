/**
 * OPFS (Origin Private File System) Utilities
 * 
 * Provides helper functions for:
 * - Storing and retrieving model weights
 * - Managing training checkpoints
 * - Caching downloaded models from Hugging Face
 */

export interface ModelMetadata {
    modelId: string;
    downloadedAt: number;
    size: number;
    task: string;
}

/**
 * Get the OPFS root directory
 */
export async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
    return await navigator.storage.getDirectory();
}

/**
 * Get or create a subdirectory in OPFS
 */
export async function getDirectory(
    parent: FileSystemDirectoryHandle,
    name: string
): Promise<FileSystemDirectoryHandle> {
    return await parent.getDirectoryHandle(name, { create: true });
}

/**
 * Write binary data to OPFS
 */
export async function writeFile(
    directory: FileSystemDirectoryHandle,
    filename: string,
    data: ArrayBuffer | Uint8Array
): Promise<void> {
    const fileHandle = await directory.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    // Convert Uint8Array to ArrayBuffer for compatibility
    const buffer = data instanceof Uint8Array
        ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
        : data;
    await writable.write(buffer);
    await writable.close();
}

/**
 * Read binary data from OPFS
 */
export async function readFile(
    directory: FileSystemDirectoryHandle,
    filename: string
): Promise<ArrayBuffer | null> {
    try {
        const fileHandle = await directory.getFileHandle(filename);
        const file = await fileHandle.getFile();
        return await file.arrayBuffer();
    } catch {
        return null;
    }
}

/**
 * Check if a file exists in OPFS
 */
export async function fileExists(
    directory: FileSystemDirectoryHandle,
    filename: string
): Promise<boolean> {
    try {
        await directory.getFileHandle(filename);
        return true;
    } catch {
        return false;
    }
}

/**
 * List all files in a directory
 */
export async function listFiles(
    directory: FileSystemDirectoryHandle
): Promise<string[]> {
    const files: string[] = [];
    for await (const [name, handle] of directory.entries()) {
        if (handle.kind === 'file') {
            files.push(name);
        }
    }
    return files;
}

/**
 * Delete a file from OPFS
 */
export async function deleteFile(
    directory: FileSystemDirectoryHandle,
    filename: string
): Promise<void> {
    await directory.removeEntry(filename);
}

/**
 * Clear all files in a directory
 */
export async function clearDirectory(
    directory: FileSystemDirectoryHandle
): Promise<void> {
    for await (const [name] of directory.entries()) {
        await directory.removeEntry(name, { recursive: true });
    }
}

/**
 * Get total storage usage
 */
export async function getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
}> {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0
    };
}

/**
 * Download model weights from Hugging Face and cache in OPFS
 */
export async function cacheModelFromHF(
    modelId: string,
    task: string
): Promise<boolean> {
    try {
        const root = await getOPFSRoot();
        const modelsDir = await getDirectory(root, 'fl-models');

        // Check if already cached
        const metadataFile = `${modelId.replace('/', '_')}_metadata.json`;
        if (await fileExists(modelsDir, metadataFile)) {
            console.log(`[OPFS] Model ${modelId} already cached`);
            return true;
        }

        // For now, we create a placeholder since actual HF download requires
        // specific model files and CORS handling
        // In production: fetch from HF Hub API
        const metadata: ModelMetadata = {
            modelId,
            downloadedAt: Date.now(),
            size: 0,
            task
        };

        await writeFile(
            modelsDir,
            metadataFile,
            new TextEncoder().encode(JSON.stringify(metadata))
        );

        console.log(`[OPFS] Model ${modelId} metadata cached`);
        return true;
    } catch (error) {
        console.error('[OPFS] Cache model failed:', error);
        return false;
    }
}

/**
 * Get cached model metadata
 */
export async function getCachedModelMetadata(
    modelId: string
): Promise<ModelMetadata | null> {
    try {
        const root = await getOPFSRoot();
        const modelsDir = await getDirectory(root, 'fl-models');
        const metadataFile = `${modelId.replace('/', '_')}_metadata.json`;

        const data = await readFile(modelsDir, metadataFile);
        if (!data) return null;

        return JSON.parse(new TextDecoder().decode(data));
    } catch {
        return null;
    }
}
