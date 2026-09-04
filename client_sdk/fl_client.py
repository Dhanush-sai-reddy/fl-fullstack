"""
FL Platform Client SDK

Easy-to-use Python client for connecting to the FL Platform from Colab, PyCharm, or any Python environment.

Example usage:
    ```python
    from fl_client import FLClient
    
    # Initialize client with your API token
    client = FLClient(
        api_base_url="http://localhost:8000",
        api_token="your-api-token-here"
    )
    
    # Get current round for a project
    round_info = client.get_current_round(project_id="your-project-id")
    
    # Submit your model update
    client.submit_update(
        project_id="your-project-id",
        round_id=round_info["id"],
        num_examples=1000,
        avg_loss=0.5,
        weights_delta={"layer1": [0.1, 0.2, ...], "layer2": [...]}
    )
    ```
"""

import json
from typing import Dict, List, Optional, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class FLClientError(Exception):
    """Base exception for FL Client errors."""
    pass


class FLClient:
    """Client for interacting with the FL Platform API."""
    
    def __init__(
        self,
        api_base_url: str = "http://localhost:8000",
        api_token: Optional[str] = None,
        timeout: int = 30,
    ):
        """
        Initialize FL Client.
        
        Args:
            api_base_url: Base URL of the FL Platform API
            api_token: API token for authentication (get from platform UI)
            timeout: Request timeout in seconds
        """
        self.api_base_url = api_base_url.rstrip("/")
        self.api_token = api_token
        self.timeout = timeout
        
        # Setup session with retries
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def _headers(self) -> Dict[str, str]:
        """Get request headers with authentication."""
        headers = {"Content-Type": "application/json"}
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Make an API request."""
        url = f"{self.api_base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=self._headers(),
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_detail = "Unknown error"
            try:
                error_detail = e.response.json().get("detail", str(e))
            except:
                error_detail = str(e)
            raise FLClientError(f"API request failed: {error_detail}")
        except requests.exceptions.RequestException as e:
            raise FLClientError(f"Request failed: {str(e)}")
    
    def get_project(self, project_id: str) -> Dict[str, Any]:
        """Get project details."""
        return self._request("GET", f"/api/projects/{project_id}")
    
    def get_current_round(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get the current active training round for a project."""
        return self._request("GET", f"/api/projects/{project_id}/rounds/current")
    
    def list_rounds(self, project_id: str) -> List[Dict[str, Any]]:
        """List all training rounds for a project."""
        return self._request("GET", f"/api/projects/{project_id}/rounds")
    
    def submit_update(
        self,
        project_id: str,
        round_id: str,
        num_examples: int,
        weights_delta: Dict[str, List[float]],
        avg_loss: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Submit a client update (model weights delta) for a training round.
        
        Args:
            project_id: Project UUID
            round_id: Round UUID
            num_examples: Number of training examples used
            weights_delta: Dictionary mapping parameter names to weight deltas
            avg_loss: Average training loss (optional)
        
        Returns:
            Response dict with status and aggregation info
        """
        payload = {
            "num_examples": num_examples,
            "weights_delta": weights_delta,
        }
        if avg_loss is not None:
            payload["avg_loss"] = avg_loss
        
        return self._request(
            "POST",
            f"/api/projects/{project_id}/rounds/{round_id}/updates",
            data=payload,
        )
    
    def get_model_config(self, project_id: str) -> Dict[str, Any]:
        """Get model configuration for a project."""
        project = self.get_project(project_id)
        return project.get("model", {})
    
    def health_check(self) -> Dict[str, Any]:
        """Check if the API is healthy."""
        return self._request("GET", "/health/ready")


def extract_weights_from_model(model, param_names: Optional[List[str]] = None) -> Dict[str, List[float]]:
    """
    Extract weights from a PyTorch model as a flat dictionary.
    
    Args:
        model: PyTorch model
        param_names: Optional list of parameter names to extract (default: all)
    
    Returns:
        Dictionary mapping parameter names to flattened weight arrays
    """
    try:
        import torch
    except ImportError:
        raise FLClientError("PyTorch is required. Install with: pip install torch")
    
    weights = {}
    for name, param in model.named_parameters():
        if param_names is None or name in param_names:
            weights[name] = param.data.cpu().detach().flatten().tolist()
    return weights


def compute_weight_delta(
    model_before: Any,
    model_after: Any,
    param_names: Optional[List[str]] = None,
) -> Dict[str, List[float]]:
    """
    Compute weight delta between two PyTorch models.
    
    Args:
        model_before: Model before training
        model_after: Model after training
        param_names: Optional list of parameter names to compute delta for
    
    Returns:
        Dictionary mapping parameter names to weight deltas
    """
    try:
        import torch
    except ImportError:
        raise FLClientError("PyTorch is required. Install with: pip install torch")
    
    delta = {}
    for name, param_after in model_after.named_parameters():
        if param_names is not None and name not in param_names:
            continue
        
        param_before = dict(model_before.named_parameters())[name]
        diff = (param_after.data - param_before.data).cpu().detach().flatten().tolist()
        delta[name] = diff
    
    return delta

