# FL Platform - Decentralized AI Orchestration

A hybrid federated learning system that bridges the gap between local browser-based simulation and real-world distributed training. Orchestrated by **Google Gemini**, visualized with **React 19**, and powered by **FastAPI**.

## Key Features

### Gemini AI Orchestrator
- **Autonomous Script Generation**: Gemini 1.5 Pro dynamically writes PyTorch/Flower training clients based on project requirements.
- **MCP (Model Context Protocol)**: Custom protocol for standardized resource discovery and capabilities handshake between Host and Edge nodes.
- **Automated Telemetry**: AI-generated logs and training summaries for human-readable insight into convergence status.

### Hybrid Architecture
- **Local Simulation Mode**: Uses `BroadcastChannel` APIs to simulate varying network conditions and federated rounds entirely within the browser.
- **Remote Execution**: Production-ready Python Client SDK (`fl_client`) for connecting Jupyter Notebooks, Colab instances, or edge devices.

### Performance & Visualization
- **Glassmorphism UI**: Futuristic admin dashboard built with Tailwind CSS and Framer Motion.
- **Real-time Analytics**: `Recharts` implementation for tracking loss curves, accuracy, and memory usage across rounds.
- **Efficient Aggregation**: **Weighted FedAvg** algorithm with in-place tensor operations to minimize memory overhead.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, SlowAPI (Rate Limiting)
- **AI/ML**: Google Gemini API (Orchestration), Hugging Face Transformers, PEFT/LoRA
- **DevOps**: Docker Compose, Nginx

## Architecture Highlights

### Model Context Protocol (MCP)
The system uses a custom JSON-based protocol for negotiating training capabilities:
```json
{
  "protocol": "1.0.4-LTS",
  "capabilities": ["peft", "lora_rank_8"],
  "resource": "mcp://hf.co/bert-base-uncased"
}
```

### Client SDK 
The Python SDK features automatic tensor flattening and efficient serialization for gradient transmission.

```python
# Connect to the orchestration server
client = FLClient(api_base_url="http://localhost:8000", api_token="...")

# Submit weighted updates
client.submit_update(
    project_id="...",
    weights_delta=local_weights,
    num_examples=1024
)
```

## Setup

See `SETUP.md` for detailed installation instructions.

1. **Start Backend**: `docker-compose up -d`
2. **Start Frontend**: `npm run dev` in `frontend/`
3. **Configure AI**: Set `VITE_GEMINI_API_KEY` in `.env`