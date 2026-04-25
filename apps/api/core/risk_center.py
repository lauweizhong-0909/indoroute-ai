import json
import re
from datetime import datetime, timezone
from typing import Any

from db import models


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _safe_iso(value: Any, fallback: datetime | None = None) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str) and value.strip():
        return value.strip()
    if fallback is not None:
        return fallback.isoformat()
    return datetime.now(timezone.utc).isoformat()


def parse_stored_alert(record: models.CustomsAlert) -> dict[str, Any]:
    raw_text = record.news_text or ""
    try:
        payload = json.loads(raw_text)
        if isinstance(payload, dict):
            return {
                "title": _normalize_space(str(payload.get("title") or "Customs update")),
                "body": _normalize_space(str(payload.get("body") or payload.get("body_preview") or raw_text)),
                "date": _safe_iso(payload.get("published_at") or payload.get("date"), record.created_at),
                "source": _normalize_space(str(payload.get("source") or "manual")),
                "source_url": _normalize_space(str(payload.get("source_url") or "")),
            }
    except Exception:
        pass

    title = raw_text.split(".")[0] if "." in raw_text else raw_text[:120]
    return {
        "title": _normalize_space(title or "Customs update"),
        "body": _normalize_space(raw_text or "Customs update received from backend."),
        "date": _safe_iso(record.created_at),
        "source": "manual",
        "source_url": "",
    }


def _risk_type_for(text: str) -> str:
    lowered = text.lower()
    if any(keyword in lowered for keyword in ["inspection", "lampu merah", "red light", "manual check", "clearance"]):
        return "customs_delay"
    if any(keyword in lowered for keyword in ["duty", "tariff", "ppn", "pph", "tax"]):
        return "tariff_change"
    if any(keyword in lowered for keyword in ["bpom", "certification", "claim", "label", "cosmetic regulation"]):
        return "compliance_crackdown"
    return "general_customs"


def _severity_for(text: str) -> str:
    lowered = text.lower()
    if any(keyword in lowered for keyword in ["urgent", "critical", "100% physical inspection", "red light", "lampu merah"]):
        return "URGENT"
    if any(keyword in lowered for keyword in ["inspection", "delay", "hold", "manual check"]):
        return "HIGH"
    if any(keyword in lowered for keyword in ["duty", "tariff", "tax", "review"]):
        return "MEDIUM"
    return "LOW"


def _is_active(text: str, published_at: str) -> bool:
    lowered = text.lower()
    if any(keyword in lowered for keyword in ["urgent", "critical", "inspection", "delay", "red light", "lampu merah"]):
        return True
    try:
        published = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if published.tzinfo is None:
            published = published.replace(tzinfo=timezone.utc)
        return (now - published).days < 7
    except Exception:
        return True


def _affected_targets(text: str, risk_type: str, skus: list[models.SKU]) -> tuple[list[str], list[str]]:
    lowered = text.lower()
    targets: list[str] = []
    sku_ids: list[str] = []

    category_keywords = {
        "cosmetic": "Cosmetic SKUs",
        "serum": "Serum category",
        "skin care": "Skin-care SKUs",
        "lip": "Lip make-up SKUs",
        "eye": "Eye make-up SKUs",
    }
    for keyword, label in category_keywords.items():
        if keyword in lowered and label not in targets:
            targets.append(label)

    if any(keyword in lowered for keyword in ["direct", "parcel", "clearance", "inspection", "red light", "lampu merah"]):
        targets.append("Direct shipping route")

    if risk_type == "tariff_change":
        targets.append("Landed cost assumptions")
    if risk_type == "compliance_crackdown":
        targets.append("Compliance-sensitive catalogue")

    matched_categories = []
    for sku in skus:
        category = (sku.category or "").lower()
        name = (sku.name or "").lower()
        desc = (sku.description or "").lower()
        text_blob = f"{category} {name} {desc}"
        if "cosmetic" in lowered and any(word in text_blob for word in ["cosmetic", "skin", "lip", "eye", "face"]):
            matched_categories.append(sku.sku_id)
        elif "serum" in lowered and "serum" in text_blob:
            matched_categories.append(sku.sku_id)
        elif any(word in lowered for word in ["bpom", "claim", "regulation"]) and any(word in text_blob for word in ["medical", "whitening", "treatment", "serum", "cosmetic"]):
            matched_categories.append(sku.sku_id)

    sku_ids = sorted(list(dict.fromkeys(matched_categories)))[:8]

    return sorted(list(dict.fromkeys(targets))), sku_ids


def _impact_summary(risk_type: str, severity: str) -> str:
    if risk_type == "customs_delay":
        return "Direct parcels are likely to see manual checks, slower clearance, and more unpredictable transit times."
    if risk_type == "tariff_change":
        return "Landed costs may increase on the affected catalogue, which can tighten already thin margins."
    if risk_type == "compliance_crackdown":
        return "Affected SKUs may face stronger customs or BPOM scrutiny, especially if claims or certification are weak."
    if severity in {"HIGH", "URGENT"}:
        return "This customs update could materially disrupt normal fulfilment if the affected route or catalogue stays unchanged."
    return "This update may change cross-border operations and should be reviewed before the next shipment batch."


def _triggered_modules(risk_type: str) -> list[str]:
    if risk_type == "customs_delay":
        return ["Policy Sentinel", "Smart Router"]
    if risk_type == "tariff_change":
        return ["Policy Sentinel", "Profit Shield"]
    if risk_type == "compliance_crackdown":
        return ["Policy Sentinel", "Compliance Radar"]
    return ["Policy Sentinel"]


def _next_action(risk_type: str) -> str:
    if risk_type == "customs_delay":
        return "Review Smart Router before sending the next direct-shipping batch."
    if risk_type == "tariff_change":
        return "Recalculate impacted SKU margins in Profit Shield before confirming the next shipment batch."
    if risk_type == "compliance_crackdown":
        return "Review the affected catalogue in Compliance Radar and pause risky SKUs until they are fixed."
    return "Review the affected module before dispatching the next shipment batch."


def analyze_alert_record(record: models.CustomsAlert, skus: list[models.SKU]) -> dict[str, Any]:
    parsed = parse_stored_alert(record)
    text = f"{parsed['title']} {parsed['body']}"
    risk_type = _risk_type_for(text)
    severity = _severity_for(text)
    is_active = _is_active(text, parsed["date"])
    affected_targets, affected_skus = _affected_targets(text, risk_type, skus)
    triggered_modules = _triggered_modules(risk_type)
    next_action = _next_action(risk_type)

    return {
        "id": str(record.id),
        "title": parsed["title"],
        "body": parsed["body"],
        "date": parsed["date"],
        "is_active": is_active,
        "severity": severity,
        "risk_type": risk_type,
        "impact_summary": _impact_summary(risk_type, severity),
        "affected_targets": affected_targets,
        "affected_skus": affected_skus,
        "next_action": next_action,
        "triggered_modules": triggered_modules,
        "source": parsed["source"],
        "source_url": parsed["source_url"],
    }
