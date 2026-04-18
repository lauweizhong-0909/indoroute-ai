from fastapi import APIRouter

# This variable name MUST match what you call in main.py
router = APIRouter(tags=["SKUs"])

@router.get("/")
def get_skus():
    return [{"sku_id": "test-001", "name": "Sample SKU"}]