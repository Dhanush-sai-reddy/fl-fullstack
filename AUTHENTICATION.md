# Authentication

How to connect external clients (Colab, PyCharm, etc.) to the platform.

## Two Ways to Auth

1. **API Tokens** (use this for external clients)
   - Project-scoped or user-scoped
   - Rate limited per token
   - Works great from Colab/PyCharm

2. **Email Header** (legacy, still works)
   - Just send `x-user-email` header
   - Backward compatible

## API Tokens

### Generate One

Hit the API endpoint:

```bash
POST /api/auth/tokens
Authorization: Bearer <your-jwt-token>  # or x-user-email header

{
  "name": "My Colab Token",
  "project_id": "project-uuid",  # optional - makes it project-scoped
  "expires_in_days": 30,  # optional
  "requests_per_minute": 60  # optional, default 60
}
```

You'll get back the token - save it, you won't see it again. Web UI coming soon.

### Use It

Just stick it in the Authorization header:

```bash
Authorization: Bearer <your-api-token>
```

### Token Types

- `project_client` - Only works for one project (more secure)
- `user_api` - Works for all your projects

### Rate Limits

Default is 60 requests/minute. Hit it? You'll get a 429. The client SDK retries automatically, but if you need more, bump `requests_per_minute` when creating the token.

## Client SDK

We've got a Python client in `client_sdk/fl_client.py` that makes this easy:

```python
from fl_client import FLClient

client = FLClient(api_base_url="http://localhost:8000", api_token="your-token")
round_info = client.get_current_round(project_id="project-id")
client.submit_update(project_id="project-id", round_id=round_info["id"], ...)
```

Check `client_sdk/README.md` and `client_sdk/example_colab.py` for more.

## Security

- Don't commit tokens to git
- Use env vars: `FLClient(api_token=os.getenv("FL_API_TOKEN"))`
- Rotate them every now and then
- Project-scoped tokens are safer
- Set expirations
- Revoke unused ones

## Managing Tokens

List them: `GET /api/auth/tokens`  
Revoke: `DELETE /api/auth/tokens/{token_id}`

## Migrating

Old code using `x-user-email` still works, but tokens are better:

1. Generate token via `/api/auth/tokens`
2. Swap `x-user-email` for `Authorization: Bearer <token>`
3. Done

New code? Just use the `FLClient` SDK.

## Troubleshooting

**401 Unauthorized** - Token wrong/expired, or wrong header format

**403 Forbidden** - Project-scoped token on wrong project, or token revoked

**429 Too Many Requests** - Hit rate limit, wait a minute or get a new token with higher limit

**Lost token** - Revoke the old one and make a new one

## Config

Set these env vars:

- `DEFAULT_RATE_LIMIT_PER_MINUTE` (default: 60)
- `RATE_LIMIT_ENABLED` (default: true)
- `SECRET_KEY` (change this in production!)

See `backend/app/core/config.py` for all options.

