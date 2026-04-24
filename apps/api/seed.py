import json
import os
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db import models

def seed_from_file(db: Session, filename: str, model):
    script_dir = os.path.dirname(__file__)
    # Path logic (adjust as needed based on your previous fix)
    filepath = os.path.join(script_dir, "..", "..", "data", filename)
    
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            data = json.load(f)
            # Get a list of actual column names in your database model
            valid_columns = {c.key for c in model.__table__.columns}
            
            for item in data:
                # 1. Map name
                if model == models.SKU and "product_name" in item:
                    item["name"] = item.pop("product_name")
                
                # 2. Filter: Only keep keys that exist as columns in the DB
                filtered_item = {k: v for k, v in item.items() if k in valid_columns}
                
                # 3. Check for duplicates and add
                if model == models.SKU:
                    exists = db.query(models.SKU).filter(models.SKU.sku_id == filtered_item["sku_id"]).first()
                else:
                    exists = None
                
                if not exists:
                    db.add(model(**filtered_item))
        print(f"✅ Seeded {filename}")
    else:
        print(f"⚠️ Skipping {filename} (not found)")

def seed_db():
    db = SessionLocal()
    try:
        # Seed all files
        seed_from_file(db, "inventory.json", models.SKU)
        seed_from_file(db, "villain_skus.json", models.SKU)
        seed_from_file(db, "borderline_sku.json", models.SKU)
        seed_from_file(db, "tax_master.json", models.TaxRule)
        
        db.commit()
        print("🚀 All data pushed to Neon successfully!")
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()