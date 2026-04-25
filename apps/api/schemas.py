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
    id: str
    title: str
    body: str
    date: str
    is_active: bool
    severity: str
    risk_type: str
    impact_summary: str
    affected_targets: list[str] = []
    affected_skus: list[str] = []
    next_action: str
    triggered_modules: list[str] = []
    source: str = "manual"
    source_url: str = ""


class AlertRefreshResponse(BaseModel):
    imported_count: int
    skipped_count: int
    source: str


class ProfitAdviceOption(BaseModel):
    option_id: str
    title: str
    detail: str
    button_label: str
    href: str


class ProfitAdviceResponse(BaseModel):
    sku_id: str
    best_option_id: str
    headline: str
    rationale: str
    source: str
    options: list[ProfitAdviceOption]


class ComplianceAdviceResponse(BaseModel):
    sku_id: str
    source: str
    summary: str
    action_plan: list[str]
    rewrite_examples: list[str] = []
