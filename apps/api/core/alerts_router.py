from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import SessionLocal
from db import models
import schemas
from typing import List

# Adding the 'tags' parameter makes the UI look professional
router = APIRouter(prefix="/alerts", tags=["Alerts"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/ingest")
def ingest_alert(request: schemas.AlertIngestRequest, db: Session = Depends(get_db)):
    new_alert = models.CustomsAlert(news_text=request.news_text)
    db.add(new_alert)
    db.commit()
    return {"status": "success"}

# THIS IS THE MISSING ENDPOINT
@router.get("/", response_model=List[schemas.AlertResponse])
def get_alerts(db: Session = Depends(get_db)):
    return db.query(models.CustomsAlert).order_by(desc(models.CustomsAlert.id)).limit(10).all()
