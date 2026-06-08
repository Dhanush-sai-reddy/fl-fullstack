export class WebMCPClient {
    private sse: EventSource | null = null;
    private postUrl: string | null = null;
    private messageId = 0;
    private pendingRequests = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();
    private baseUrl: string;
    private onStatusChange: (status: 'connecting' | 'connected' | 'offline') => void;

    constructor(baseUrl: string, onStatusChange: (status: 'connecting' | 'connected' | 'offline') => void) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.onStatusChange = onStatusChange;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.onStatusChange('connecting');
            const sseUrl = `${this.baseUrl}/sse`;
            
            try {
                this.sse = new EventSource(sseUrl);
            } catch (err) {
                this.onStatusChange('offline');
                reject(err);
                return;
            }

            this.sse.addEventListener('open', () => {
                console.log('[MCP Client] SSE connection opened');
            });

            this.sse.addEventListener('error', (err) => {
                console.error('[MCP Client] SSE error:', err);
                this.onStatusChange('offline');
                this.close();
                reject(err);
            });

            this.sse.addEventListener('message', (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleIncomingMessage(message);
                } catch (e) {
                    console.error('[MCP Client] Failed to parse message:', e);
                }
            });

            // FastMCP sends the target POST endpoint as an event with name "endpoint"
            this.sse.addEventListener('endpoint', (event) => {
                try {
                    const relativePath = event.data;
                    const url = new URL(relativePath, this.baseUrl);
                    this.postUrl = url.toString();
                    this.onStatusChange('connected');
                    console.log('[MCP Client] Connection established. POST URL:', this.postUrl);
                    resolve();
                } catch (err) {
                    this.onStatusChange('offline');
                    reject(err);
                }
            });
        });
    }

    private handleIncomingMessage(message: any) {
        if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                this.pendingRequests.delete(message.id);
                if (message.error) {
                    pending.reject(message.error);
                } else {
                    pending.resolve(message.result);
                }
            }
        }
    }

    async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
        if (!this.postUrl) {
            throw new Error('MCP Client not connected');
        }

        const id = ++this.messageId;
        const requestPayload = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name,
                arguments: args
            },
            id
        };

        const responsePromise = new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
        });

        try {
            const response = await fetch(this.postUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
        } catch (err) {
            this.pendingRequests.delete(id);
            throw err;
        }

        return responsePromise;
    }

    async listTools(): Promise<any> {
        if (!this.postUrl) {
            throw new Error('MCP Client not connected');
        }

        const id = ++this.messageId;
        const requestPayload = {
            jsonrpc: '2.0',
            method: 'tools/list',
            params: {},
            id
        };

        const responsePromise = new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
        });

        try {
            const response = await fetch(this.postUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
        } catch (err) {
            this.pendingRequests.delete(id);
            throw err;
        }

        return responsePromise;
    }

    close() {
        if (this.sse) {
            this.sse.close();
            this.sse = null;
        }
        this.postUrl = null;
        this.pendingRequests.clear();
    }
}
