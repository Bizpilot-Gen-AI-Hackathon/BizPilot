import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_hits: dict[str, deque] = defaultdict(deque)


def hit(key: str, max_calls: int, window: int) -> None:
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= max_calls:
        retry = int(window - (now - q[0])) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {-(-retry // 60)} minute(s).",
            headers={"Retry-After": str(retry)},
        )
    q.append(now)


def clear(key: str) -> None:
    _hits.pop(key, None)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def limit(name: str, max_calls: int, window: int):
    """FastAPI dependency: max_calls per window seconds, per client IP."""
    def dep(request: Request):
        hit(f"{name}:{client_ip(request)}", max_calls, window)
    return dep