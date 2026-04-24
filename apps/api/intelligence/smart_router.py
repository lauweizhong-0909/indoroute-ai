import json
from .ilmu_client import IlmuAIClient

class SmartRouter:
    def __init__(self):
        self.client = IlmuAIClient()
        self.system_prompt = """You are the Smart Router. 
        Evaluate the context and provide a routing decision in JSON format."""

    async def generate_decision(self, aggregated_context: dict) -> dict:
        print("🧠 Smart brain is analyzing the decision...")
        user_query = "Provide the strategic routing decision in JSON format."
        
        try:
            result_text = await self.client.call(self.system_prompt, aggregated_context, user_query)
            clean_text = result_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception as e:
            print(f"⚠️ Routing decision error: {e}")
            return {
                "action": "Manual Review Required",
                "rationale": "AI engine offline.",
                "priority": "URGENT"
            }