from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db import models
from .intelligence import analyze_product_risk
from .compliance_advice import get_compliance_advice_for_sku
from .profit_advice import get_profit_advice_for_sku
from schemas import SKUImportRequest, SKUImportResponse, ProfitAdviceResponse, ComplianceAdviceResponse

router = APIRouter(prefix="/skus", tags=["SKUs"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_skus(db: Session = Depends(get_db)):
    """The Frontend calls this when you enter the menu"""
    return db.query(models.SKU).all()

@router.post("/import", response_model=SKUImportResponse)
def import_skus(payload: SKUImportRequest, db: Session = Depends(get_db)):
    if not payload.rows:
        raise HTTPException(status_code=400, detail="No rows provided for import")

    created_count = 0
    updated_count = 0

    for row in payload.rows:
        existing = db.query(models.SKU).filter(models.SKU.sku_id == row.sku_id).first()

        if existing:
            existing.name = row.product_name
            existing.category = row.category
            existing.hs_code = row.hs_code or None
            existing.cost_myr = row.cost_myr
            existing.selling_price_idr = row.selling_price_idr
            existing.weight_g = row.weight_g
            existing.bpom_certified = row.bpom_certified
            existing.description = row.description
            existing.balanced_qty = row.balanced_qty
            existing.qty_sold = row.qty_sold
            updated_count += 1
            continue

        sku = models.SKU(
            sku_id=row.sku_id,
            name=row.product_name,
            category=row.category,
            hs_code=row.hs_code or None,
            cost_myr=row.cost_myr,
            selling_price_idr=row.selling_price_idr,
            weight_g=row.weight_g,
            bpom_certified=row.bpom_certified,
            description=row.description,
            balanced_qty=row.balanced_qty,
            qty_sold=row.qty_sold,
        )
        db.add(sku)
        created_count += 1

    db.commit()

    return SKUImportResponse(
        imported_count=created_count + updated_count,
        created_count=created_count,
        updated_count=updated_count,
        skipped_count=0,
    )

@router.post("/{sku_id}/analyze")
async def trigger_analysis(sku_id: str, db: Session = Depends(get_db)):
    """Triggers AI and updates the database record permanently"""
    result = await analyze_product_risk(sku_id, db)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("reason"))
        
    return result


@router.get("/{sku_id}/profit-advice", response_model=ProfitAdviceResponse)
async def get_profit_advice(sku_id: str, db: Session = Depends(get_db)):
    result = await get_profit_advice_for_sku(sku_id, db)

    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("reason"))

    return result


@router.get("/{sku_id}/compliance-advice", response_model=ComplianceAdviceResponse)
async def get_compliance_advice(sku_id: str, db: Session = Depends(get_db)):
    result = await get_compliance_advice_for_sku(sku_id, db)

    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("reason"))

    return result
