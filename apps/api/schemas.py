from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# SKU Schemas
class SKUResponse(BaseModel):
    sku_id: str
    name: str
    category: str
    cost_myr: float
    price_idr: float
    weight_g: int
    bpom_certified: bool

    class Config:
        from_attributes = True

class SKUImportRow(BaseModel):
    sku_id: str
    product_name: str
    category: str
    hs_code: Optional[str] = None
    cost_myr: float
    selling_price_idr: float
    weight_g: int
    bpom_certified: str
    description: str
    balanced_qty: Optional[int] = None
    qty_sold: Optional[int] = None

class SKUImportRequest(BaseModel):
    rows: list[SKUImportRow]

class SKUImportResponse(BaseModel):
    imported_count: int
    created_count: int
    updated_count: int
    skipped_count: int = 0

# Alert Schemas
class AlertIngestRequest(BaseModel):
    news_text: str

# THIS IS THE ONE YOU WERE MISSING
class AlertResponse(BaseModel):
    id: int
    news_text: str
    created_at: datetime

    class Config:
        from_attributes = True
