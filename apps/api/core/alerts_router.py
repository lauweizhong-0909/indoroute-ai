import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import SessionLocal
from db import models
import schemas
from scraper.beacukai_scraper import fetch_beacukai_news, load_mock_alerts
from .risk_center import analyze_alert_record

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


@router.post("/refresh", response_model=schemas.AlertRefreshResponse)
def refresh_alerts(db: Session = Depends(get_db)):
    repo_root = Path(__file__).resolve().parents[3]
    fallback_file = repo_root / "data" / "customs_news_mock.txt"

    try:
        items = fetch_beacukai_news(limit=5)
        source = "live"
        if not items:
            raise RuntimeError("No live alerts returned")
    except Exception:
        items = load_mock_alerts(fallback_file, limit=5)
        source = "mock"

    existing_payloads = db.query(models.CustomsAlert.news_text).all()
    existing_titles = set()
    for (payload,) in existing_payloads:
        try:
            existing_titles.add(str(json.loads(payload).get("title", "")).strip().lower())
        except Exception:
            existing_titles.add(str(payload).split(".")[0].strip().lower())

    imported_count = 0
    skipped_count = 0

    if source == "live":
        for record in db.query(models.CustomsAlert).all():
            try:
                payload = json.loads(record.news_text)
                if str(payload.get("source", "")).strip().lower() == "mock":
                    db.delete(record)
            except Exception:
                continue

    for item in items:
        title = str(item.get("title", "")).strip().lower()
        if title and title in existing_titles:
            skipped_count += 1
            continue

        stored_payload = {
            "title": item.get("title", "Customs update"),
            "body": item.get("body") or item.get("body_preview") or "",
            "published_at": item.get("published_at") or item.get("date"),
            "source": source,
            "source_url": item.get("source_url", ""),
        }
        db.add(models.CustomsAlert(news_text=json.dumps(stored_payload, ensure_ascii=False)))
        if title:
            existing_titles.add(title)
        imported_count += 1

    db.commit()

    return {
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "source": source,
    }


@router.get("/", response_model=List[schemas.AlertResponse])
def get_alerts(db: Session = Depends(get_db)):
    records = db.query(models.CustomsAlert).order_by(desc(models.CustomsAlert.id)).limit(10).all()
    skus = db.query(models.SKU).all()
    return [analyze_alert_record(record, skus) for record in records]
