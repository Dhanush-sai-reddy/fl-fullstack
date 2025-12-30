import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ProjectWizard({ onClose, onSuccess }) {
  const { getAuthHeaders } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [recommendedModel, setRecommendedModel] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    task_type: "text_classification",
    use_recommended: true,
    base_model_id: null,
    tuning_strategy: "lora",
    precision: "fp16",
    max_seq_len: 512,
    learning_rate: 5e-5,
    num_train_epochs: 3,
    batch_size: 8,
    image_size: null,
    resize_strategy: null,
    normalize: true,
  });

  useEffect(() => {
    if (step === 2) {
      loadModels();
    }
  }, [step, formData.task_type]);

  const loadModels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/models/recommended?task_type=${formData.task_type}`);
      const data = await res.json();
      setModels(data.models || []);
      setRecommendedModel(data.recommended);
      if (data.recommended && formData.use_recommended) {
        setFormData({ ...formData, base_model_id: data.recommended.id });
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        task_type: formData.task_type,
        model_config: formData.use_recommended ? null : {
          base_model_id: formData.base_model_id,
          tuning_strategy: formData.tuning_strategy,
          precision: formData.precision,
          max_seq_len: formData.max_seq_len,
          learning_rate: formData.learning_rate,
          num_train_epochs: formData.num_train_epochs,
          batch_size: formData.batch_size,
          image_size: formData.image_size || null,
          resize_strategy: formData.resize_strategy || null,
          normalize: formData.normalize,
        },
      };

      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const project = await res.json();
        onSuccess(project);
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail || "Failed to create project"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const taskOptions = [
    { value: "text_classification", label: "Text Classification" },
    { value: "summarization", label: "Summarization" },
    { value: "qa", label: "Question Answering" },
    { value: "generation", label: "Text Generation" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: "700px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between" style={{ marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Server Configuration</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: step >= s ? "var(--accent)" : "var(--border)",
                  }}
                />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: "8px 16px" }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: "24px", fontSize: "1.25rem" }}>Step 1: Project Details</h3>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="My FL Project"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-textarea"
                  placeholder="Describe your federated learning project..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Downstream Task</label>
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                  className="form-select"
                >
                  {taskOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-center gap-sm" style={{ marginTop: "32px", justifyContent: "flex-end" }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={() => setStep(2)} className="btn btn-primary">
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: "24px", fontSize: "1.25rem" }}>Step 2: Select Task & Model</h3>
              
              <div className="form-group">
                <label className="form-label">Downstream Task</label>
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                  className="form-select"
                >
                  {taskOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Model Selection</label>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      checked={formData.use_recommended}
                      onChange={() => setFormData({ ...formData, use_recommended: true, base_model_id: recommendedModel?.id })}
                    />
                    <span>Use Recommended Model</span>
                    {recommendedModel && (
                      <span className="badge badge-info" style={{ marginLeft: "8px" }}>
                        {recommendedModel.name}
                      </span>
                    )}
                  </label>
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      checked={!formData.use_recommended}
                      onChange={() => setFormData({ ...formData, use_recommended: false })}
                    />
                    <span>Select Custom Model</span>
                  </label>
                </div>
              </div>

              {!formData.use_recommended && (
                <div className="form-group">
                  <label className="form-label">Base Model (Hugging Face)</label>
                  <select
                    value={formData.base_model_id || ""}
                    onChange={(e) => setFormData({ ...formData, base_model_id: e.target.value })}
                    className="form-select"
                    required={!formData.use_recommended}
                  >
                    <option value="">Select a model...</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.recommended && "⭐"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex-center gap-sm" style={{ marginTop: "32px", justifyContent: "space-between" }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="btn btn-primary">
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ marginBottom: "24px", fontSize: "1.25rem" }}>Step 3: Optimization & Data Preprocessing</h3>
              
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                  />
                  <span>Enable PEFT</span>
                  <span className="badge badge-info" style={{ marginLeft: "8px" }}>
                    Parameter-Efficient Fine-Tuning (Recommended for FL)
                  </span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Method</label>
                <select
                  value={formData.tuning_strategy}
                  onChange={(e) => setFormData({ ...formData, tuning_strategy: e.target.value })}
                  className="form-select"
                >
                  <option value="lora">LoRA (Low-Rank Adaptation)</option>
                  <option value="qlora">QLoRA</option>
                  <option value="full_finetune">Full Fine-Tuning</option>
                </select>
              </div>

              {formData.tuning_strategy === "lora" && (
                <div className="form-group">
                  <label className="form-label">LoRA Rank (r)</label>
                  <input
                    type="number"
                    value="8"
                    readOnly
                    className="form-input"
                    style={{ opacity: 0.7 }}
                  />
                  <span className="text-muted" style={{ fontSize: "0.875rem", marginTop: "4px", display: "block" }}>
                    Default: 8 (can be configured later)
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Precision</label>
                <select
                  value={formData.precision}
                  onChange={(e) => setFormData({ ...formData, precision: e.target.value })}
                  className="form-select"
                >
                  <option value="fp32">FP32 (Full Precision)</option>
                  <option value="fp16">FP16 (Half Precision) - Recommended</option>
                  <option value="int8">INT8 (Quantized)</option>
                  <option value="nf4">NF4 (4-bit)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Max Sequence Length</label>
                <input
                  type="number"
                  value={formData.max_seq_len}
                  onChange={(e) => setFormData({ ...formData, max_seq_len: parseInt(e.target.value) })}
                  className="form-input"
                  min="128"
                  max="4096"
                  step="128"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Batch Size</label>
                <input
                  type="number"
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) })}
                  className="form-input"
                  min="1"
                  max="64"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Learning Rate</label>
                <input
                  type="number"
                  value={formData.learning_rate}
                  onChange={(e) => setFormData({ ...formData, learning_rate: parseFloat(e.target.value) })}
                  className="form-input"
                  min="1e-6"
                  max="1e-2"
                  step="1e-6"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Training Epochs</label>
                <input
                  type="number"
                  value={formData.num_train_epochs}
                  onChange={(e) => setFormData({ ...formData, num_train_epochs: parseInt(e.target.value) })}
                  className="form-input"
                  min="1"
                  max="10"
                />
              </div>

              <div
                className="card"
                style={{
                  marginTop: "24px",
                  background: "rgba(16, 185, 129, 0.1)",
                  borderColor: "var(--success)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.5rem" }}>✓</span>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--success)", marginBottom: "4px" }}>
                      Ready to Host
                    </div>
                    <div className="text-secondary" style={{ fontSize: "0.875rem" }}>
                      Session will be broadcasted locally. Invite clients using the generated session code.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-center gap-sm" style={{ marginTop: "32px", justifyContent: "space-between" }}>
                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
                  ← Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Launch Server →"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

