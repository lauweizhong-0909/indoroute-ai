import json
from typing import Any

from sqlalchemy.orm import Session

from db import models
from intelligence.ilmu_client import IlmuAIClient

FORBIDDEN_KEYWORDS = [
    "medical grade",
    "fast whiten",
    "instant skin bleaching",
    "scar cure",
    "cure",
    "treatment",
    "antibiotic",
    "steroid",
    "vision improvement",
    "fungus",
    "ingrown nail repair",
    "anti-septic",
    "hormonal",
    "isotretinoin",
    "botox",
    "whitening injection",
    "fat burning",
    "eczema",
    "psoriasis",
    "cellulite cure",
    "skin disease",
    "whitening",
    "brightening",
    "clinical",
]


def _extract_hits(text: str) -> list[str]:
    lowered = text.lower()
    return [keyword for keyword in FORBIDDEN_KEYWORDS if keyword in lowered]


def _fallback_advice(sku: models.SKU) -> dict[str, Any]:
    hits = _extract_hits(f"{sku.name or ''} {sku.description or ''}")
    has_bpom = str(sku.bpom_certified).strip().lower() in {"yes", "true", "1"}

    action_plan: list[str] = []
    rewrite_examples: list[str] = []

    if not has_bpom:
        action_plan.append("Add valid BPOM notification evidence before listing or shipping this SKU to Indonesia.")

    if hits:
        action_plan.append(
            "Rewrite the listing so it stays cosmetic-only and removes risky claims such as "
            + ", ".join(f'"{hit}"' for hit in hits[:4])
            + "."
        )
        rewrite_examples = [
            "Replace treatment-style wording with cosmetic-safe phrases such as 'daily skincare formula' or 'radiance-supporting night cream'.",
            "Keep the copy focused on appearance, comfort, and cosmetic use instead of cure, treatment, or medical outcomes.",
        ]

    action_plan.append("Run Compliance Radar again after updating the BPOM details or listing copy.")

    if not has_bpom and hits:
        summary = "This SKU is blocked because it is missing BPOM evidence and the listing uses medical-style or treatment-style claims."
    elif not has_bpom:
        summary = "This SKU is blocked because BPOM evidence is missing."
    elif hits:
        summary = "This SKU needs listing copy changes because the current wording looks like a treatment or medical claim."
    else:
        summary = "This SKU appears compliant under the current checks."

    return {
        "sku_id": sku.sku_id,
        "source": "rule_fallback",
        "summary": summary,
        "action_plan": action_plan,
        "rewrite_examples": rewrite_examples,
    }


async def get_compliance_advice_for_sku(sku_id: str, db: Session) -> dict[str, Any]:
    sku = db.query(models.SKU).filter(models.SKU.sku_id == sku_id).first()
    if not sku:
        return {"status": "error", "reason": "SKU not found"}

    hits = _extract_hits(f"{sku.name or ''} {sku.description or ''}")
    fallback = _fallback_advice(sku)

    prompt = f"""
You are an Indonesian cosmetics compliance advisor helping a seller fix one SKU listing.

SKU context:
- SKU ID: {sku.sku_id}
- Name: {sku.name}
- Category: {sku.category}
- BPOM certified field: {sku.bpom_certified}
- Description: {sku.description}
- Detected risky phrases: {json.dumps(hits)}

Return JSON only with this shape:
{{
  "summary": "One short paragraph explaining the main compliance issue and priority.",
  "action_plan": ["3 concise action steps max"],
  "rewrite_examples": ["up to 3 safer copy examples for the listing"]
}}

Rules:
- Be practical, specific, and seller-friendly.
- Do not mention legal uncertainty.
- If BPOM is missing, make that the first priority.
- If risky phrases are detected, suggest cosmetic-safe wording.
- Do not invent product claims beyond cosmetic positioning.
""".strip()

    try:
        client = IlmuAIClient()
        result = await client.generate_json_response(prompt, timeout_seconds=45.0)

        summary = str(result.get("summary", "")).strip()
        action_plan = [str(item).strip() for item in result.get("action_plan", []) if str(item).strip()]
        rewrite_examples = [str(item).strip() for item in result.get("rewrite_examples", []) if str(item).strip()]

        if not summary or not action_plan:
            return fallback

        return {
            "sku_id": sku.sku_id,
            "source": "ai",
            "summary": summary,
            "action_plan": action_plan[:3],
            "rewrite_examples": rewrite_examples[:3],
        }
    except Exception:
        return fallback
