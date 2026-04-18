import json
import os
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db import models

def seed_db():
    db: Session = SessionLocal()
    
    try:
        # 1. Seed SKUs (The most important for Task 4)
        if os.path.exists("inventory.json"):
            with open("inventory.json", "r") as f:
                inventory = json.load(f)
                for item in inventory:
                    # Check if SKU already exists to avoid duplicates
                    exists = db.query(models.SKU).filter(models.SKU.sku_id == item["sku_id"]).first()
                    if not exists:
                        new_sku = models.SKU(**item)
                        db.add(new_sku)
            print("✅ Inventory seeded.")

        # 2. Seed Tax Rules
        if os.path.exists("tax_master.json"):
            with open("tax_master.json", "r") as f:
                taxes = json.load(f)
                for tax in taxes:
                    new_tax = models.TaxRule(**tax)
                    db.add(new_tax)
            print("✅ Tax rules seeded.")

        db.commit()
        print("🚀 Database seeding completed successfully!")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()