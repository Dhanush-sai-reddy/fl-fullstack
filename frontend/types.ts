export enum AppMode {
  LANDING = 'LANDING',
  HOST_SETUP = 'HOST_SETUP',
  HOST_DASHBOARD = 'HOST_DASHBOARD',
  CLIENT = 'CLIENT',
  BROWSER_TRAINING = 'BROWSER_TRAINING',
}

export interface ModelConfig {
  category: string;
  task: string;
  modelName: string;
  usePeft: boolean;
  peftType?: 'LORA' | 'PREFIX_TUNING' | 'P_TUNING' | 'ADAPTIVE';
  loraRank?: number;
  loraAlpha?: number;
  learningRate: number;
  rounds: number;
  paramMin: string;
  paramMax: string;
}

export interface ClientNode {
  id: string;
  name: string;
  status: 'IDLE' | 'READY' | 'TRAINING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentLoss: number;
  dataPoints: number;
  datasetName?: string;
  datasetSize?: string;
}

export interface TrainingMetric {
  round: number;
  accuracy: number;
  loss: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'HOST' | 'CLIENT' | 'SYSTEM';
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

export type P2PMessageType =
  | 'JOIN_REQUEST'
  | 'JOIN_ACCEPT'
  | 'START_ROUND'
  | 'CLIENT_UPDATE'
  | 'ROUND_COMPLETE'
  | 'SESSION_CLOSED';

export interface P2PMessage {
  type: P2PMessageType;
  payload: any;
  senderId: string;
}

export const TASK_HIERARCHY: Record<string, string[]> = {
  "Multimodal": [
    "Audio-Text-to-Text", "Image-Text-to-Text", "Image-Text-to-Image", "Image-Text-to-Video",
    "Visual Question Answering", "Document Question Answering", "Video-Text-to-Text",
    "Visual Document Retrieval"
  ],
  "Natural Language Processing": [
    "Text Classification", "Question Answering", "Zero-Shot Classification", "Translation", "Summarization",
    "Text Generation", "Sentence Similarity"
  ],
  "Computer Vision": [
    "Depth Estimation", "Image Classification", "Object Detection", "Image Segmentation",
    "Text-to-Image", "Image-to-Text"
  ],
  "Audio": [
    "Text-to-Speech", "Automatic Speech Recognition", "Audio Classification"
  ]
};