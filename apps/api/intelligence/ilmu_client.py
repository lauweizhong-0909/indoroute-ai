import os
import httpx
import json
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())


def _resolve_base_url() -> str:
    """Accept either a full chat-completions URL or a provider base URL."""
    configured = (
        os.getenv("ILMU_BASE_URL")
        or os.getenv("ZAI_GLM_BASE_URL")
        or "https://api.ilmu.ai/v1/chat/completions"
    ).rstrip("/")

    if configured.endswith("/chat/completions"):
        return configured

    return f"{configured}/chat/completions"


def _resolve_model_name(base_url: str) -> str:
    if os.getenv("ILMU_MODEL"):
        return os.getenv("ILMU_MODEL")
    if os.getenv("ZAI_GLM_MODEL"):
        return os.getenv("ZAI_GLM_MODEL")

    # Default model by provider if not explicitly configured.
    if "bigmodel.cn" in base_url:
        return "glm-4-flash"

    return "ilmu-glm-5.1"

class IlmuAIClient:
    def __init__(self):
        self.api_key = os.getenv("ILMU_API_KEY") or os.getenv("ZAI_GLM_API_KEY")
        if not self.api_key:
            raise ValueError("ILMU_API_KEY or ZAI_GLM_API_KEY not found. Please check your .env file.")

        self.base_url = _resolve_base_url()
        self.model = _resolve_model_name(self.base_url)

    async def generate_response(
        self,
        prompt: str,
        *,
        response_format: dict | None = None,
        temperature: float = 0.7,
        timeout_seconds: float = 60.0,
    ) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}], 
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url, 
                    headers=headers, 
                    json=payload, 
                    timeout=timeout_seconds,
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"HTTP request exception: {e}")
                raise

    async def generate_json_response(self, prompt: str, *, timeout_seconds: float = 60.0) -> dict:
        """Get a JSON object using plain generation, then parse locally.

        Some providers are slower or unstable with response_format=json_object.
        """
        raw = await self.generate_response(
            prompt,
            temperature=0.1,
            timeout_seconds=timeout_seconds,
        )

        if isinstance(raw, dict):
            return raw

        cleaned = str(raw).replace("```json", "").replace("```", "").strip()

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed = json.loads(cleaned[start:end + 1])
            if isinstance(parsed, dict):
                return parsed

        raise ValueError("AI response is not valid JSON object")

    async def call(self, system_prompt, context_data, user_query):
        import json
        prompt = f"{system_prompt}\nContext: {json.dumps(context_data)}\nUser: {user_query}"
        return await self.generate_response(prompt)