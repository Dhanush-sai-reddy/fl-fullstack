import { GoogleGenAI, Type } from "@google/genai";
import { ModelConfig } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MCP_SYSTEM_INSTRUCTION = `You are a specialized Hugging Face Model Context Protocol (MCP) Orchestrator. 
Your goal is to bridge client-side federated learning environments with high-performance Hugging Face models. 
You provide structured model resource discovery and executable training nodes following the MCP standard (v1.0.4).`;

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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-pro-preview',
      contents: `Raw Python Flower/PEFT MCP client script for ${config.modelName} (${config.task}). No markdown.`,
      config: { systemInstruction: MCP_SYSTEM_INSTRUCTION }
    });
    return response.text || "# Error";
  } catch (error) { return "# Error"; }
};