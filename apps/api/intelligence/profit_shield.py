import asyncio
from .ilmu_client import IlmuAIClient

class ProfitShield:
    def __init__(self):
        self.client = IlmuAIClient()
        # Core: explicitly tell AI not to do calculations, only provide explanation
        self.system_prompt = """You are an E-commerce Financial Advisor for a Malaysian seller.
Your job is to write a ONE-SENTENCE explanation for a product's profit margin based on the provided financial data.
If the 'alert' flag is true (margin < 5% or negative), sound a warning. If it's healthy, confirm it's good.
Do NOT recalculate the numbers. Just explain the situation concisely.
Example: "Due to the high 15% tariff and shipping costs, this SKU is losing RM 2.40 per unit."
"""

    def calculate_numbers(self, sku: dict, exchange_rate: float, tariff_rate: float) -> dict:
        """Pure Python calculations to ensure 100% accuracy"""
        revenue_myr = sku["selling_price_idr"] * exchange_rate
        tariff_myr = revenue_myr * tariff_rate
        
        # Simplified shipping logic (simulation): base RM 5, add RM 1 for every 100g above 500g
        weight = sku.get("weight_g", 500)
        shipping_myr = 5.0 + max(0, (weight - 500) / 100.0) * 1.0 
        
        net_profit_myr = revenue_myr - sku["cost_myr"] - tariff_myr - shipping_myr
        
        # Avoid division by zero
        margin_pct = net_profit_myr / revenue_myr if revenue_myr > 0 else 0
        
        return {
            "revenue_myr": round(revenue_myr, 2),
            "tariff_myr": round(tariff_myr, 2),
            "shipping_myr": round(shipping_myr, 2),
            "net_profit_myr": round(net_profit_myr, 2),
            "margin_pct": round(margin_pct, 4),
            "alert": margin_pct < 0.05  # Trigger alert if margin is less than 5%
        }

    async def analyze_profit(self, sku: dict, exchange_rate: float = 0.00028, tariff_rate: float = 0.0) -> dict:
        print(f"🛡️ Profit shield activated, calculating financials for [{sku['name']}]...")
        
        # 1. Fully accurate local calculation
        financials = self.calculate_numbers(sku, exchange_rate, tariff_rate)
        
        # 2. Feed calculated results to AI for one-sentence explanation
        context_data = {
            "sku_id": sku["sku_id"],
            "financial_data": financials
        }
        user_query = "Please provide a one-sentence financial summary for this SKU."
        
        explanation = await self.client.call(self.system_prompt, context_data, user_query)
        
        # 3. Assemble final result for frontend (data required for Task 22)
        return {
            "sku_id": sku["sku_id"],
            "net_profit_myr": financials["net_profit_myr"],
            "margin_pct": financials["margin_pct"],
            "alert": financials["alert"],
            "explanation": explanation.strip()
        }

# ----------------- Local test code -----------------
async def run_test():
    # Simulate a loss-making Villain SKU (high cost, low selling price)
    villain_sku = {
        "sku_id": "SKU-VILLAIN-03",
        "name": "Luxury Silk Mask",
        "cost_myr": 25.00,
        "selling_price_idr": 80000, # approx RM 22.40
        "weight_g": 200
    }
    
    # Simulate a profitable SKU
    good_sku = {
        "sku_id": "SKU-GOOD-04",
        "name": "Basic T-Shirt",
        "cost_myr": 10.00,
        "selling_price_idr": 100000, # approx RM 28.00
        "weight_g": 150
    }
    
    shield = ProfitShield()
    
    try:
        # Assume Indonesian customs charges 15% tariff (0.15)
        report1 = await shield.analyze_profit(villain_sku, tariff_rate=0.15)
        print("\n📉 Loss-making product test result:")
        print(report1)
        
        print("\n-------------------\n")
        
        report2 = await shield.analyze_profit(good_sku, tariff_rate=0.10)
        print("📈 Profitable product test result:")
        print(report2)
        
    except Exception as e:
        print(f"Runtime error: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())