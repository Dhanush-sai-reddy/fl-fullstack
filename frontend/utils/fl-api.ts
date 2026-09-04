/**
 * FL Weight Update API
 * 
 * Handles uploading weight deltas to the FL server for aggregation.
 */

export interface WeightUpdate {
    deviceId: string;
    modelId: string;
    roundId?: string;
    timestamp: number;
    numExamples: number;
    weights: {
        deltaA: number[];
        deltaB: number[];
    };
    metrics?: {
        finalLoss: number;
        avgSpeed: number;
        totalEpochs: number;
    };
}

export interface UploadResponse {
    success: boolean;
    roundId?: string;
    message?: string;
    aggregationStatus?: 'pending' | 'completed';
}

/**
 * Upload weight deltas to the FL server
 */
export async function uploadWeights(
    serverUrl: string,
    update: WeightUpdate
): Promise<UploadResponse> {
    try {
        const response = await fetch(`${serverUrl}/api/fl/updates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(update),
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[FL] Weight upload failed:', error);
        return {
            success: false,
            message: `Upload failed: ${error}`,
        };
    }
}

/**
 * Upload weights as binary for more efficient transfer
 */
export async function uploadWeightsBinary(
    serverUrl: string,
    deviceId: string,
    modelId: string,
    deltaA: Float32Array,
    deltaB: Float32Array,
    metadata: {
        numExamples: number;
        finalLoss: number;
        avgSpeed: number;
        totalEpochs: number;
    }
): Promise<UploadResponse> {
    try {
        // Create binary payload
        // Format: [header (JSON length 4 bytes)] [header JSON] [deltaA] [deltaB]
        const header = JSON.stringify({
            deviceId,
            modelId,
            timestamp: Date.now(),
            numExamples: metadata.numExamples,
            metrics: {
                finalLoss: metadata.finalLoss,
                avgSpeed: metadata.avgSpeed,
                totalEpochs: metadata.totalEpochs,
            },
            deltaALength: deltaA.length,
            deltaBLength: deltaB.length,
        });

        const headerBytes = new TextEncoder().encode(header);
        const headerLength = new Uint32Array([headerBytes.byteLength]);

        // Total size: 4 (header length) + header + deltaA + deltaB
        const totalSize = 4 + headerBytes.byteLength + deltaA.byteLength + deltaB.byteLength;
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        // Write header length
        view.setUint32(0, headerBytes.byteLength, true);

        // Write header
        new Uint8Array(buffer, 4, headerBytes.byteLength).set(headerBytes);

        // Write weights
        const weightsOffset = 4 + headerBytes.byteLength;
        new Float32Array(buffer, weightsOffset, deltaA.length).set(deltaA);
        new Float32Array(buffer, weightsOffset + deltaA.byteLength, deltaB.length).set(deltaB);

        const response = await fetch(`${serverUrl}/api/fl/updates/binary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: buffer,
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[FL] Binary weight upload failed:', error);
        return {
            success: false,
            message: `Upload failed: ${error}`,
        };
    }
}

/**
 * Fetch latest global weights from server
 */
export async function fetchGlobalWeights(
    serverUrl: string,
    modelId: string
): Promise<{ A: Float32Array; B: Float32Array } | null> {
    try {
        const response = await fetch(`${serverUrl}/api/fl/models/${encodeURIComponent(modelId)}/weights`);

        if (!response.ok) {
            if (response.status === 404) {
                // No global weights yet (first round)
                return null;
            }
            throw new Error(`Server responded with ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);

        // Parse header length
        const headerLength = view.getUint32(0, true);
        const headerBytes = new Uint8Array(buffer, 4, headerLength);
        const header = JSON.parse(new TextDecoder().decode(headerBytes));

        // Parse weights
        const weightsOffset = 4 + headerLength;
        const A = new Float32Array(buffer, weightsOffset, header.deltaALength);
        const B = new Float32Array(buffer, weightsOffset + A.byteLength, header.deltaBLength);

        return { A: new Float32Array(A), B: new Float32Array(B) };
    } catch (error) {
        console.error('[FL] Failed to fetch global weights:', error);
        return null;
    }
}
