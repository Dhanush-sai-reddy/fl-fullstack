"""
Example: Using FL Client in Colab

Drop this into a Colab notebook and fill in your token/project ID.
"""

# !pip install requests  # Run this first in Colab

from fl_client import FLClient, compute_weight_delta
import torch
import torch.nn as nn

# Fill these in
API_TOKEN = "your-api-token-here"
PROJECT_ID = "your-project-id"
API_BASE_URL = "http://your-platform-url:8000"

# Connect
client = FLClient(api_base_url=API_BASE_URL, api_token=API_TOKEN)
print(f"Connected: {client.health_check()}")

# Get project info
project = client.get_project(PROJECT_ID)
print(f"Project: {project['name']}, Task: {project['task_type']}")

# Check for active round
round_info = client.get_current_round(PROJECT_ID)
if not round_info:
    print("No active round yet - host needs to start one")
else:
    print(f"Round {round_info['round_number']}: {round_info['status']}")

# Training example
class SimpleModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(10, 5)
        self.fc2 = nn.Linear(5, 1)
    
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        return self.fc2(x)

# Load/setup your model (in real usage, load the global model)
model = SimpleModel()
model_before = type(model)()
model_before.load_state_dict(model.state_dict())

# Train on your local data
# optimizer = torch.optim.Adam(model.parameters())
# ... your training loop ...

# Compute delta and submit
if round_info:
    weights_delta = compute_weight_delta(model_before, model)
    
    result = client.submit_update(
        project_id=PROJECT_ID,
        round_id=round_info["id"],
        num_examples=1000,  # size of your local dataset
        weights_delta=weights_delta,
        avg_loss=0.5,
    )
    
    print(f"Submitted: {result['status']}")
    if result.get("aggregated"):
        print(f"Round done! Model version {result['created_snapshot_version']}")

