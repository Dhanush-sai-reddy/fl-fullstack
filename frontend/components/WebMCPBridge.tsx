import React, { useEffect } from 'react';
import { useFL } from '../context/FLContext';

declare global {
    interface Navigator {
        modelContext?: {
            registerTool: (tool: any) => void;
            unregisterTool: (name: string) => void;
        };
    }
}

export const WebMCPBridge: React.FC = () => {
    const { startTraining, stopTraining, isTraining, progress, deviceId, error } = useFL();

    useEffect(() => {
        if (!navigator.modelContext) {
            return;
        }

        const tools = [
            {
                name: 'start_training',
                description: 'Starts the federated learning training process.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
                execute: async () => {
                    await startTraining();
                    return { status: 'started' };
                },
            },
            {
                name: 'stop_training',
                description: 'Stops the federated learning training process.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
                execute: async () => {
                    stopTraining();
                    return { status: 'stopped' };
                },
            },
            {
                name: 'get_training_status',
                description: 'Returns the current status of the federated learning training.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
                execute: async () => {
                    return {
                        isTraining,
                        progress,
                        deviceId,
                        error,
                    };
                },
            },
        ];

        tools.forEach((tool) => {
            try {
                navigator.modelContext?.registerTool(tool);
            } catch (err) {
            }
        });

        return () => {
            tools.forEach((tool) => {
                try {
                    navigator.modelContext?.unregisterTool(tool.name);
                } catch (err) {
                }
            });
        };
    }, [startTraining, stopTraining, isTraining, progress, deviceId, error]);

    return null;
};
