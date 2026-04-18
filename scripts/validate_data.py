import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REQUIRED_FILES = [
    "data/inventory.json",
    "data/tax_master.json",
    "data/logistics_config.json",
    "data/logistics_rates.json",
    "data/villain_skus.json",
    "data/borderline_sku.json",
    "data/customs_news_mock.txt",
]

INVENTORY_REQUIRED_FIELDS = {
    "sku_id": str,
    "product_name": str,
    "category": str,
    "hs_code": int,
    "cost_myr": (int, float),
    "selling_price_idr": (int, float),
    "weight_g": int,
    "bpom_certified": str,
    "description": str,
    "balanced_qty": int,
    "qty_sold": int,
}

TAX_REQUIRED_FIELDS = {
    "hs_code": int,
    "bm_rate": (int, float),
    "ppn_rate": (int, float),
    "pph_rate": (int, float),
    "mandatory_docs": str,
    "restricted_keywords": str,
}


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_record_fields(
    record: Dict[str, Any],
    required_fields: Dict[str, Any],
    record_name: str,
    index: int,
    errors: List[str],
) -> None:
    for field, expected_type in required_fields.items():
        if field not in record:
            errors.append(f"{record_name}[{index}] missing field: {field}")
            continue
        value = record[field]
        if value is None:
            errors.append(f"{record_name}[{index}] field is null: {field}")
            continue
        if not isinstance(value, expected_type):
            errors.append(
                f"{record_name}[{index}] invalid type for {field}: "
                f"expected {expected_type}, got {type(value)}"
            )


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    errors: List[str] = []

    for rel in REQUIRED_FILES:
        path = root / rel
        if not path.exists():
            errors.append(f"Missing required file: {rel}")

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    inventory = _load_json(root / "data/inventory.json")
    if not isinstance(inventory, list):
        errors.append("data/inventory.json must be a JSON array")
    else:
        for i, record in enumerate(inventory):
            if not isinstance(record, dict):
                errors.append(f"inventory[{i}] is not a JSON object")
                continue
            _validate_record_fields(record, INVENTORY_REQUIRED_FIELDS, "inventory", i, errors)

    tax_master = _load_json(root / "data/tax_master.json")
    if not isinstance(tax_master, list):
        errors.append("data/tax_master.json must be a JSON array")
    else:
        for i, record in enumerate(tax_master):
            if not isinstance(record, dict):
                errors.append(f"tax_master[{i}] is not a JSON object")
                continue
            _validate_record_fields(record, TAX_REQUIRED_FIELDS, "tax_master", i, errors)

    logistics_config = _load_json(root / "data/logistics_config.json")
    if not isinstance(logistics_config, list) or len(logistics_config) == 0:
        errors.append("data/logistics_config.json must be a non-empty JSON array")

    logistics_rates = _load_json(root / "data/logistics_rates.json")
    if not isinstance(logistics_rates, dict) or "routes" not in logistics_rates:
        errors.append("data/logistics_rates.json must contain top-level 'routes' object")

    villain = _load_json(root / "data/villain_skus.json")
    if not isinstance(villain, list) or len(villain) < 2:
        errors.append("data/villain_skus.json must contain at least 2 records")

    borderline = _load_json(root / "data/borderline_sku.json")
    if not isinstance(borderline, list) or len(borderline) != 1:
        errors.append("data/borderline_sku.json must contain exactly 1 record")

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    print("Data validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
