import json
import asyncio
from .ilmu_client import IlmuAIClient  # When running FastAPI, you may need to change to: from .ilmu_client import IlmuAIClient

class PolicySentinel:
    def __init__(self):
        self.client = IlmuAIClient()
        # Core: system prompt for information extraction and evaluation
        self.system_prompt = """You are an expert Indonesian Customs (Beacukai) Policy Analyst.
Read the provided Customs News Alert and the list of our current product SKUs.
Your task is to determine if the news directly affects any of our SKUs (e.g., changes in import duties, new restrictions on specific categories).

Return a JSON object with the exact following schema:
{
  "triggered": boolean, // true if any SKU is affected, false otherwise
  "affected_skus": ["SKU_ID_1", ...], // List of affected sku_ids. Empty list [] if none.
  "risk_level": "HIGH" | "MEDIUM" | "LOW" | "NONE",
  "action": "Short action command", // e.g., "Review pricing", "Halt shipping", "None"
  "explanation": "Brief explanation of WHY these SKUs are affected based on the news."
}

Respond ONLY in valid JSON. No preamble, no markdown tags."""

    async def analyse_alert(self, news_text: str, skus: list) -> dict:
        """Receives customs news and product list, returns policy impact analysis"""
        context_data = {
            "news_alert": news_text,
            "our_skus": skus
        }
        user_query = "Analyze this customs alert against our SKUs and return the JSON assessment."

        print("🦅 Policy sentinel deployed, analyzing Indonesian customs news...")
        result_text = await self.client.call(self.system_prompt, context_data, user_query)
        
        try:
            clean_text = result_text.replace("```json", "").replace("```", "").strip()
            parsed_result = json.loads(clean_text)
            return parsed_result
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing failed:\n{result_text}")
            # Fallback handling to ensure system stability
            return {
                "triggered": False, 
                "affected_skus": [], 
                "risk_level": "NONE", 
                "action": "None", 
                "explanation": "GLM parsing error."
            }

# ----------------- Local test code -----------------
async def run_test():
    # Simulated customs news prepared by P2 (tariff increase for beauty category)
    mock_news = "PENGUMUMAN BEACUKAI: Mulai 1 Mei 2026, tarif bea masuk untuk produk kosmetik dan perawatan kulit (Skincare) akan dinaikkan menjadi 15% untuk melindungi industri lokal."
    
    # Simulated product SKUs
    test_skus = [
        {"sku_id": "SKU-BEAUTY-01", "name": "Nature Aloe Vera Lotion", "category": "Cosmetics"},
        {"sku_id": "SKU-TECH-02", "name": "Mechanical Keyboard", "category": "Electronics"}
    ]
    
    sentinel = PolicySentinel()
    try:
        report = await sentinel.analyse_alert(mock_news, test_skus)
        print("\n📜 Customs news analysis report:")
        print(json.dumps(report, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Runtime error: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())