import { GoogleGenAI, Type } from "@google/genai";
import { ModelConfig } from "../types";
import { WebMCPClient } from "../utils/mcpClient";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MCP_SYSTEM_INSTRUCTION = `You are a specialized Hugging Face Model Context Protocol (MCP) Orchestrator. 
Your goal is to bridge client-side federated learning environments with high-performance Hugging Face models. 
You provide structured model resource discovery and executable training nodes following the MCP standard (v1.0.4).
You also have access to filesystem tools via MCP to examine and understand the local workspace/codebase.`;

export interface MCPResource {
  id: string;
  uri: string;
  capabilities: string[];
  params: string;
}

export const getModelRecommendations = async (category: string, task: string, minScale: string, maxScale: string): Promise<MCPResource[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `MCP Resource Discovery for "${category}" -> "${task}". 
      Parameter range: "${minScale}" to "${maxScale}". 
      Return JSON array: [{"id": "HF_ID", "uri": "mcp://...", "capabilities": ["..."], "params": "size"}].`,
      config: {
        systemInstruction: MCP_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              uri: { type: Type.STRING },
              capabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              params: { type: Type.STRING }
            },
            required: ["id", "uri", "capabilities", "params"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini MCP Discovery Error:", error);
    return [];
  }
};

export const explainPeftConfig = async (config: ModelConfig): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Explain MCP optimization using ${config.peftType} for ${config.modelName}. Under 30 words.`,
      config: { systemInstruction: MCP_SYSTEM_INSTRUCTION }
    });
    return response.text || "Optimization ready.";
  } catch (e) { return "PEFT enabled."; }
};

export const generateSimulationLog = async (round: number, accuracy: number, task: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Generate MCP telemetry for round ${round}. Acc: ${accuracy.toFixed(3)}. One sentence.`,
      config: { systemInstruction: MCP_SYSTEM_INSTRUCTION }
    });
    return response.text || `Round ${round} complete.`;
  } catch (e) { return `Round ${round} results aggregated.`; }
};

export const generateTrainingScript = async (config: ModelConfig): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Raw Python Flower/PEFT MCP client script for ${config.modelName} (${config.task}). No markdown.`,
      config: { systemInstruction: MCP_SYSTEM_INSTRUCTION }
    });
    return response.text || "# Error";
  } catch (error) { return "# Error"; }
};

export const queryGeminiWithMCP = async (
  prompt: string,
  mcpClient: WebMCPClient,
  onLog?: (log: string) => void
): Promise<string> => {
  try {
    const ai = getAI();
    const tools = [{
      functionDeclarations: [
        {
          name: 'read_file',
          description: 'Read the contents of a file from the workspace filesystem.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING, description: 'The absolute path to the file to read.' }
            },
            required: ['path']
          }
        },
        {
          name: 'list_directory',
          description: 'List all files and folders in a workspace directory.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING, description: 'The absolute path to the directory.' }
            },
            required: ['path']
          }
        },
        {
          name: 'write_file',
          description: 'Write content to a file on the workspace filesystem.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING, description: 'The absolute path of the file to write.' },
              content: { type: Type.STRING, description: 'The content to write.' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'text_generation',
          description: 'Generate text using a Hugging Face model.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              prompt: { type: Type.STRING, description: 'The text prompt to generate from.' },
              model: { type: Type.STRING, description: 'Optional Hugging Face model ID.' }
            },
            required: ['prompt']
          }
        },
        {
          name: 'summarization',
          description: 'Summarize text using a Hugging Face model.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'The text to summarize.' },
              model: { type: Type.STRING, description: 'Optional Hugging Face model ID.' }
            },
            required: ['text']
          }
        }
      ]
    }];

    if (onLog) onLog(`Sending query to Gemini...`);
    let response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful coding and FL assistant. You can use your MCP tools to inspect the filesystem and run Hugging Face models.",
        tools
      }
    });

    let chatHistory: any[] = [{ role: 'user', parts: [{ text: prompt }] }];

    // Handle tool calling loop
    while (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const { name, args } = call;

      const logMsg = `Model requested tool: ${name}(${JSON.stringify(args)})`;
      console.log(`[Gemini MCP] ${logMsg}`);
      if (onLog) onLog(logMsg);

      let result;
      try {
        result = await mcpClient.callTool(name, args);
      } catch (err) {
        result = { error: String(err) };
      }

      console.log(`[Gemini MCP] Tool result:`, result);
      if (onLog) onLog(`Tool returned: ${typeof result === 'object' ? JSON.stringify(result).substring(0, 100) : String(result).substring(0, 100)}...`);

      // Add model turn and function response turn to history
      chatHistory.push({
        role: 'model',
        parts: response.candidates?.[0]?.content?.parts || []
      });

      chatHistory.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name,
            response: typeof result === 'object' ? result : { content: String(result) }
          }
        }]
      });

      // Query Gemini again with tool output
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: chatHistory,
        config: {
          systemInstruction: "You are a helpful coding and FL assistant. You can use your MCP tools to inspect the filesystem and run Hugging Face models.",
          tools
        }
      });
    }

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini query with MCP Error:", error);
    return `Error: ${error}`;
  }
};