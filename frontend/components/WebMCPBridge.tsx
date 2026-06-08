import React, { useEffect, useState } from 'react';
import { useFL } from '../context/FLContext';

const MCP_BASE_URL = 'https://huggingface.co/spaces/Dhanushsaireddy144/multi-task-codefetch-mcp';

export const WebMCPBridge: React.FC = () => {
    const { setMcpStatus } = useFL();
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const checkMCPConnection = async () => {
            try {
                setMcpStatus('connecting');

                // Ping the MCP server to verify it's alive
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(MCP_BASE_URL, {
                    method: 'GET',
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                if (!cancelled) {
                    if (response.ok || response.status === 200 || response.status === 302) {
                        setMcpStatus('connected');
                        console.log('[MCP] Connected to HuggingFace Space');
                    } else {
                        console.warn('[MCP] Server returned status:', response.status);
                        setMcpStatus('offline');
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn('[MCP] Connection check failed:', err);
                    setMcpStatus('offline');
                }
            }
        };

        checkMCPConnection();

        // Retry connection every 30 seconds if offline
        const interval = setInterval(() => {
            setRetryCount(c => c + 1);
        }, 30000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [retryCount, setMcpStatus]);

    // This component doesn't render anything visible
    return null;
};
