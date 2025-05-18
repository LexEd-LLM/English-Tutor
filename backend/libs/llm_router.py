# backend/libs/llm_router.py
import os
import redis
import itertools
from llama_index.llms.gemini import Gemini
from backend.libs.vllm import VllmServer
from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception_type
from google.api_core.exceptions import ResourceExhausted
from requests.exceptions import ConnectionError as RequestsConnectionError

class LLMRouter:
    def __init__(self, model: str, temperature: float = 1.0):
        self.redis = redis.Redis(host='redis-server', port=6379, decode_responses=True)

        self.all_keys = [
            os.environ.get(f"GEMINI_API_KEY_{i}")
            for i in range(1, 10)
            if os.environ.get(f"GEMINI_API_KEY_{i}")
        ]
        main_key = os.environ.get("GEMINI_API_KEY")
        if main_key:
            self.all_keys.append(main_key)

        if not self.all_keys:
            raise ValueError("No Gemini API keys found.")

        self.model = model
        self.temperature = temperature
        self.key_iterator = self._key_cycle()

        self._init_llm()

    def _key_cycle(self):
        while True:
            active_keys = [key for key in self.all_keys if not self.redis.exists(f"cooldown:{key}")]
            if not active_keys:
                yield None  # Tín hiệu hết key → fallback
            else:
                for key in active_keys:
                    yield key


    def _init_llm(self):
        next_key = next(self.key_iterator)
        if next_key is None:
            print("[Fallback] All Gemini keys exhausted. Switching to vLLM backend.")
            try:
                self.llm = VllmServer(
                    api_url="http://localhost:8800/v1/generate",
                    max_new_tokens=4096,
                    temperature=0.6
                )
            except RequestsConnectionError as e:
                raise RuntimeError("All Gemini keys exhausted and vLLM is not reachable.") from e
        else:
            self.current_key = next_key
            os.environ["GEMINI_API_KEY"] = self.current_key
            self.llm = Gemini(model=self.model, temperature=self.temperature)

    def _mark_key_exhausted(self, key, cooldown_seconds=600):
        print(f"[Quota] Putting key on cooldown for {cooldown_seconds}s: {key[:8]}...")
        self.redis.setex(f"cooldown:{key}", cooldown_seconds, "1")

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_random_exponential(min=1, max=5),
        retry=retry_if_exception_type(ResourceExhausted),
        reraise=True
    )
    def complete(self, prompt: str, **kwargs):
        try:
            return self.llm.complete(prompt, **kwargs)
        except Exception as e:
            if isinstance(self.llm, VllmServer):
                raise e  # vLLM không xoay key, ném luôn
            if "RESOURCE_EXHAUSTED" in str(e) or "quota" in str(e).lower():
                self._mark_key_exhausted(self.current_key)
                self._init_llm()
                raise ResourceExhausted("Quota exceeded")
            raise e

    def chat(self, *args, **kwargs):
        try:
            return self.llm.chat(*args, **kwargs)
        except Exception as e:
            if isinstance(self.llm, VllmServer):
                raise e
            if "RESOURCE_EXHAUSTED" in str(e) or "quota" in str(e).lower():
                self._mark_key_exhausted(self.current_key)
                self._init_llm()
                raise ResourceExhausted("Quota exceeded")
            raise e
