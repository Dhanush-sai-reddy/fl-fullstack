# FL Platform - Decentralized AI Orchestration

A hybrid federated learning system that bridges the gap between local browser-based simulation and real-world distributed training. Orchestrated by **Google Gemini**, visualized with **React 19**, and powered by **FastAPI**.

🚀 **Live MCP Server**: [Hugging Face Space](https://huggingface.co/spaces/Dhanushsaireddy144/multi-task-codefetch-mcp)

## Key Features

### 🌐 Browser-Based Training (WebGPU)
- **Zero-Install Client**: Train models directly in the browser using WebGPU compute shaders.
- **LoRA Support**: Efficient fine-tuning of Large Language Models (LLMs) using Low-Rank Adaptation (LoRA).
- **Privacy-First**: Raw data never leaves the user's device; only weight deltas are shared.
- **OPFS Checkpointing**: Persistent storage of model weights and training progress using the Origin Private File System.
- **Sybil Resistance**: Device fingerprinting prevents malicious actors from flooding the network with fake clients.

### 🤖 Gemini AI Orchestrator
- **Autonomous Script Generation**: Gemini 1.5 Pro dynamically writes PyTorch/Flower training clients based on project requirements.
- **Model Discovery**: Automatically finds optimal models on Hugging Face based on task description.
- **Automated Telemetry**: AI-generated logs and training summaries for human-readable insight into convergence status.

### 🔗 Model Context Protocol (MCP)
- **Standardized Handshake**: Custom protocol for negotiating training capabilities between Host and Edge nodes.
- **Remote Validation**: Validates task compatibility against a deployed MCP server on Hugging Face Spaces.
- **Resource Discovery**: Exposes available models and datasets via a uniform interface.

### 📊 Performance & Visualization
- **Glassmorphism UI**: Futuristic admin dashboard built with Tailwind CSS and Framer Motion.
- **Real-time Analytics**: `Recharts` implementation for tracking loss curves, accuracy, and memory usage across rounds.
- **Efficient Aggregation**: **Weighted FedAvg** algorithm with in-place tensor operations to minimize memory overhead.

## Architecture

1. **Frontend (React + Vite)**:
   - `fl.worker.ts`: Web Worker for background training.
   - `webgpu-engine.ts`: Custom WGSL compute shaders for matrix multiplication and gradient descent.
   - `FLContext.tsx`: State management for training lifecycle.

2. **Backend (FastAPI)**:
   - `/api/fl/updates`: Receives weight deltas from browser clients.
   - `/api/fl/models`: Broadcasts global model weights.
   - `fedavg_weighted`: Aggregates updates securely.

3. **MCP Server (Python)**:
   - Hosted on Hugging Face Spaces.
   - Provides task validation and inference capabilities.

## Tech Stack

- **Frontend**: React 19, TypeScript, **WebGPU**, Vite, Tailwind CSS, Recharts
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy
- **AI/ML**: Google Gemini API (Orchestration), Hugging Face Transformers, PEFT/LoRA
- **DevOps**: Docker Compose, Nginx

## Setup & Running

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev)
- Google Gemini API Key

### Quick Start (Docker)

1. Clone the repository:
   ```bash
   git clone https://github.com/Dhanush-sai-reddy/fl-fullstack.git
   cd fl-fullstack
   ```

2. Create a `.env` file in `frontend/`:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. Start the stack:
   ```bash
   docker-compose up --build
   ```

4. Open `http://localhost:5173` and select **"Browser Training"**.

## License
MIT