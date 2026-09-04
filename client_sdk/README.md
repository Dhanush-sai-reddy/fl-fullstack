# FL Client SDK

Python client for connecting to the FL platform from Colab, PyCharm, or wherever you're running your training code.

## Install

```bash
pip install requests
```

Then copy `fl_client.py` into your project, or add this directory to your Python path.

## Quick Start

### Get a Token

Generate one via the API (see `AUTHENTICATION.md`) or the web UI. You'll get it once, so save it somewhere safe.

### Use It

```python
from fl_client import FLClient

client = FLClient(
    api_base_url="http://your-platform-url:8000",
    api_token="your-api-token-here"
)

# Check what round we're on
round_info = client.get_current_round(project_id="your-project-id")

# Send your weights
client.submit_update(
    project_id="your-project-id",
    round_id=round_info["id"],
    num_examples=1000,
    weights_delta={"layer1": [0.1, 0.2, ...], "layer2": [...]},
    avg_loss=0.5
)
```

That's it. The client handles auth, retries, and rate limits automatically.

## API Methods

- `get_project(project_id)` - Get project info
- `get_current_round(project_id)` - Get active round (returns None if no round)
- `list_rounds(project_id)` - List all rounds
- `submit_update(...)` - Send your weight updates
- `get_model_config(project_id)` - Get model config
- `health_check()` - Ping the API

## PyTorch Helpers

- `extract_weights_from_model(model)` - Flatten model weights to dict
- `compute_weight_delta(model_before, model_after)` - Get weight deltas

See `example_colab.py` for a full example.

## Errors

Wrap calls in try/except - the client raises `FLClientError` on API failures:

```python
try:
    result = client.submit_update(...)
except FLClientError as e:
    print(f"Oops: {e}")
```

## Rate Limits

Default is 60 requests/minute per token. Hit the limit? You'll get a 429. The client retries automatically, but if you're hitting limits often, ask for a higher limit when generating your token.

## Security

Don't commit tokens. Use env vars:

```python
import os
client = FLClient(api_token=os.getenv("FL_API_TOKEN"))
```

Project-scoped tokens only work for that project. User tokens work for all your projects.

