import os
import httpx
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class IlmuAIClient:
    def __init__(self):
        self.api_key = os.getenv("ILMU_API_KEY")
        if not self.api_key:
            raise ValueError("⚠️ ILMU_API_KEY not found! Please check your .env file.")
        self.base_url = "https://api.ilmu.ai/v1/chat/completions"

    async def generate_response(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "ilmu-glm-5.1",
            "messages": [{"role": "user", "content": prompt}], 
            "temperature": 0.7
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url, 
                    headers=headers, 
                    json=payload, 
                    timeout=60.0  # Increased to 60 seconds to prevent ReadTimeout
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"HTTP request exception: {e}")
                raise

    async def call(self, system_prompt, context_data, user_query):
        import json
        prompt = f"{system_prompt}\nContext: {json.dumps(context_data)}\nUser: {user_query}"
        return await self.generate_response(prompt)