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