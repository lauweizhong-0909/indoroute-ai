from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db import models
from .intelligence import analyze_product_risk

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

@router.post("/{sku_id}/analyze")
async def trigger_analysis(sku_id: str, db: Session = Depends(get_db)):
    """Triggers AI and updates the database record permanently"""
    result = await analyze_product_risk(sku_id, db)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("reason"))
        
    return result
