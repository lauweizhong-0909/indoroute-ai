from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from .database import Base

# Existing SKU and CustomsAlert models...

class TaxRule(Base):
    __tablename__ = "tax_rules"
    id = Column(Integer, primary_key=True, index=True)
    hs_code = Column(String, index=True)
    bm_rate = Column(Float)
    ppn_rate = Column(Float)
    pph_rate = Column(Float)

class LogisticsRoute(Base):
    __tablename__ = "logistics_routes"
    id = Column(Integer, primary_key=True, index=True)
    route_name = Column(String)
    base_fee_myr = Column(Float)
    risk_level = Column(String)

class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"
    id = Column(Integer, primary_key=True, index=True)
    sku_id = Column(String, ForeignKey("skus.sku_id"))
    status = Column(String)
    details = Column(Text)

class ProfitCalculation(Base):
    __tablename__ = "profit_calculations"
    id = Column(Integer, primary_key=True, index=True)
    sku_id = Column(String, ForeignKey("skus.sku_id"))
    margin_pct = Column(Float)

class RouterDecision(Base):
    __tablename__ = "router_decisions"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    priority = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SKU(Base):
    __tablename__ = "skus"
    id = Column(Integer, primary_key=True, index=True)
    sku_id = Column(String, unique=True, index=True)