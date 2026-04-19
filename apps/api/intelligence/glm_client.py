import os
import json
import httpx
from dotenv import load_dotenv

# 加载项目根目录的 .env 文件
load_dotenv()

class GLMParseError(Exception):
    """当 GLM 没有返回合法 JSON 时抛出此异常"""
    pass

class ZAIClient:
    def __init__(self):
        self.api_key = os.getenv("ZAI_GLM_API_KEY")
        self.base_url = os.getenv("ZAI_GLM_BASE_URL", "https://api.z.ai/v1/chat/completions") 
        
        if not self.api_key:
            raise ValueError("API Key is missing! Check your .env file.")

    def build_prompt(self, system_prompt: str, context_data: dict, user_query: str) -> list:
        """组装带有 JSON 强制输出约束的 Prompt"""
        full_system = f"{system_prompt}\n\nContext Data: {json.dumps(context_data, ensure_ascii=False)}\n\nRespond ONLY in valid JSON format. Do not include markdown code blocks or any preamble."
        
        return [
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_query}
        ]

    def call(self, system_prompt: str, context_data: dict, user_query: str) -> dict:
        """发送请求并解析 JSON"""
        messages = self.build_prompt(system_prompt, context_data, user_query)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "glm-4", # 请根据 Z.AI 实际文档替换为你需要的模型名
            "messages": messages,
            "temperature": 0.1 # 调低温度以保证 JSON 输出的稳定性
        }

        try:
            with httpx.Client() as client:
                response = client.post(self.base_url, json=payload, headers=headers, timeout=15.0)
                response.raise_for_status()
                
            result_text = response.json()["choices"][0]["message"]["content"]
            
            # 清洗大模型有时会带上的 markdown 格式 (```json ... ```)
            cleaned_text = result_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
                
            return json.loads(cleaned_text.strip())
            
        except json.JSONDecodeError as e:
            raise GLMParseError(f"GLM 返回的数据无法解析为 JSON: {str(e)}\n原始返回: {result_text}")
        except Exception as e:
            raise Exception(f"GLM API 调用失败: {str(e)}")