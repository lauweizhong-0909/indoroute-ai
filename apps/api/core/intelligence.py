import os
import httpx
import json
from sqlalchemy.orm import Session
from db import models

# Environment variables
API_KEY = os.getenv("ILMU_API_KEY") 
BASE_URL = os.getenv("ZAI_GLM_BASE_URL", "https://api.ilmu.ai/v1/chat/completions")

async def analyze_product_risk(sku_id: str, db: Session):
    # 1. Fetch the actual SKU record (The "Source of Truth" for the Frontend)
    sku = db.query(models.SKU).filter(models.SKU.sku_id == sku_id).first()
    if not sku:
        return {"status": "error", "reason": "Product not found in skus table"}

    # 2. Build the AI Expert Prompt
    prompt = f"""
    You are an Indonesian Customs Compliance Expert.
    Analyze this product for import into Indonesia:
    - Name: {sku.name}
    - Category: {sku.category}
    - BPOM Certified: {sku.bpom_certified}
    
    Task: Identify if this is 'High-Risk' or 'Safe'.
    Output JSON format only: {{"status": "High-Risk" or "Safe", "reason": "..."}}
    """

    # 3. Call Ilmu AI API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                BASE_URL, 
                headers={"Authorization": f"Bearer {API_KEY}"},
                json={
                    "model": "ilmu-glm-5.1",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": { "type": "json_object" }
                },
                timeout=30.0
            )
            
            ai_data = response.json()

            if "choices" not in ai_data:
                error_msg = ai_data.get("error", {}).get("message", "API Error")
                return {"status": "error", "reason": error_msg}
            
            content_str = ai_data['choices'][0]['message']['content']
            
            # Parse AI JSON response
            try:
                content = json.loads(content_str)
            except:
                content = {"status": "Safe", "reason": content_str}

            # --- STEP 4: PERSISTENCE FIX ---
            
            # Update the status field on the SKU table directly.
            # This ensures that when the frontend calls GET /api/skus/, it sees the change.
            sku.compliance_status = content.get("status", "Safe")
            
            # Also save the detailed log to your compliance_checks table (for history)
            new_check = models.ComplianceCheck(
                sku_id=sku.sku_id,
                status="Analysis Complete",
                details=json.dumps(content) # Store the full AI JSON as a string
            )
            
            db.add(new_check)
            
            # COMMIT saves both the new record in 'compliance_checks' 
            # and the update to the 'skus' table.
            db.commit() 
            db.refresh(sku)

            return content

        except Exception as e:
            db.rollback()
            return {"status": "error", "reason": f"System Exception: {str(e)}"}
