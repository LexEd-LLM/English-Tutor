# backend/libs/api_key_manager.py
import os
from typing import Iterator, Optional
import redis

class APIKeyManager:
    def __init__(self, key_prefix: str = "GEMINI_API_KEY", purpose: str = "default"):
        redis_url = os.environ.get("REDIS_URL", "localhost:6379")
        host, port = redis_url.split(":")
        self.redis = redis.Redis(host=host, port=int(port), decode_responses=True)
        self.key_prefix = key_prefix
        self.purpose = purpose  # "text" hoặc "image"
        self.all_keys = [
            os.environ.get(f"{key_prefix}_{i}")
            for i in range(1, 10)
            if os.environ.get(f"{key_prefix}_{i}")
        ]
        main_key = os.environ.get(key_prefix)
        if main_key:
            self.all_keys.insert(0, main_key)

        if not self.all_keys:
            raise ValueError(f"No API keys found for prefix {key_prefix}")

    def _cooldown_key(self, api_key: str) -> str:
        return f"cooldown:{self.purpose}:{api_key}"

    def _active_keys(self):
        return [key for key in self.all_keys if not self.redis.exists(self._cooldown_key(key))]

    def key_cycle(self) -> Iterator[Optional[str]]:
        while True:
            active = self._active_keys()
            if not active:
                yield None
            else:
                for k in active:
                    yield k

    def mark_key_exhausted(self, key: str, cooldown_seconds: int = 600):
        cooldown_key = self._cooldown_key(key)
        print(f"[Quota-{self.purpose}] Cooling down key {key[:8]} for {cooldown_seconds}s")
        self.redis.setex(cooldown_key, cooldown_seconds, "1")

    def get_redis(self):
        return self.redis
