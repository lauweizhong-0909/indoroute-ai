import json
from .ilmu_client import IlmuAIClient 

class ComplianceScanner:
    def __init__(self):
        self.client = IlmuAIClient()
        self.system_prompt = """You are a strict BPOM Compliance Inspector. 
        Return ONLY a JSON list of non-compliant sku_ids. 
        If all are compliant, return []. 
        Format: [{"sku_id": "...", "reason": "..."}]"""

    async def scan_inventory(self, inventory_list: list) -> list:
        context_data = {"inventory": inventory_list}
        user_query = "Please scan this inventory and return ONLY the non-compliant items in valid JSON format."
        print(f"🕵️‍♂️ Scanning {len(inventory_list)} products...")
        
        try:
            result_text = await self.client.call(self.system_prompt, context_data, user_query)
            # The replace here is to remove possible Markdown formatting returned by the model
            clean_text = result_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception as e:
            print(f"⚠️ Compliance scanning error: {e}")
            return [] # Return an empty list when an error occurs to ensure the flow continues