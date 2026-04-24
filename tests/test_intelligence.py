import pytest
import sys
import os
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from apps.api.intelligence.policy_sentinel import PolicySentinel
from apps.api.intelligence.compliance_scanner import ComplianceScanner
from apps.api.intelligence.profit_shield import ProfitShield
from apps.api.intelligence.smart_router import SmartRouter

@pytest.mark.asyncio
async def test_compliance_clean_sku():
    scanner = ComplianceScanner()
    clean_sku = [{"sku_id": "SKU-01", "name": "Basic", "description": "Safe", "bpom_id": "NA123"}]
    result = await scanner.scan_inventory(clean_sku)
    assert isinstance(result, list)

@pytest.mark.asyncio
@patch("apps.api.intelligence.compliance_scanner.IlmuAIClient.call", new_callable=AsyncMock)
async def test_compliance_fallback(mock_call):
    mock_call.side_effect = Exception("Timeout")
    scanner = ComplianceScanner()
    result = await scanner.scan_inventory([{"sku_id": "SKU-01"}])
    assert result == []

@pytest.mark.asyncio
@patch("apps.api.intelligence.policy_sentinel.IlmuAIClient.call", new_callable=AsyncMock)
async def test_policy_sentinel_mocked(mock_call):
    mock_call.return_value = '{"triggered": true, "affected_skus": ["S1"], "risk_level": "H", "action": "A", "explanation": "E"}'
    sentinel = PolicySentinel()
    result = await sentinel.analyse_alert("News", [{"sku_id": "S1"}])
    assert result["triggered"] is True

@pytest.mark.asyncio
async def test_profit_calculation_math():
    shield = ProfitShield()
    sku = {"sku_id": "T", "selling_price_idr": 100000, "cost_myr": 10.00, "weight_g": 500}
    calc = shield.calculate_numbers(sku, 0.00028, 0.10)
    assert calc["net_profit_myr"] == 10.20

@pytest.mark.asyncio
@patch("apps.api.intelligence.smart_router.IlmuAIClient.call", new_callable=AsyncMock)
async def test_smart_router_fallback(mock_call):
    mock_call.side_effect = Exception("Down")
    router = SmartRouter()
    result = await router.generate_decision({"ctx": "test"})
    assert result["action"] == "Manual Review Required"