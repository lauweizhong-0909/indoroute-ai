import asyncio
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
        "source": "rule_engine",
        "summary": summary,
        "action_plan": action_plan,
        "rewrite_examples": rewrite_examples,
    }


async def _generate_ai_summary(client: IlmuAIClient, sku: models.SKU, hits: list[str]) -> str | None:
    bpom_flag = "missing" if str(sku.bpom_certified).strip().lower() not in {"yes", "true", "1"} else "present"
    prompt = (
        "Write one short seller-friendly compliance summary for an Indonesia cosmetics SKU. "
        f"SKU={sku.sku_id}; bpom={bpom_flag}; risky_phrases={json.dumps(hits[:4])}. "
        "Keep it to one sentence. Do not use markdown."
    )
    raw = await client.generate_response(
        prompt,
        temperature=0.1,
        timeout_seconds=8.0,
        max_attempts=1,
    )
    summary = str(raw).replace("```", "").strip()
    return summary or None


async def _generate_ai_rewrites(client: IlmuAIClient, hits: list[str]) -> list[str]:
    prompt = (
        "Return JSON only with key rewrite_examples. "
        "Value must be an array of exactly 2 short cosmetic-safe replacement phrases for a product listing. "
        f"Unsafe phrases: {json.dumps(hits[:4])}."
    )
    result = await client.generate_json_response(prompt, timeout_seconds=8.0, max_attempts=1)
    return [str(item).strip() for item in result.get("rewrite_examples", []) if str(item).strip()][:2]


async def get_compliance_advice_for_sku(sku_id: str, db: Session) -> dict[str, Any]:
    sku = db.query(models.SKU).filter(models.SKU.sku_id == sku_id).first()
    if not sku:
        return {"status": "error", "reason": "SKU not found"}

    hits = _extract_hits(f"{sku.name or ''} {sku.description or ''}")
    fallback = _fallback_advice(sku)

    prompt = (
        "You are an Indonesia cosmetics compliance advisor. "
        f"SKU {sku.sku_id} is named {json.dumps(sku.name or '')}. "
        f"Category: {json.dumps(sku.category or '')}. "
        f"BPOM certified: {json.dumps(str(sku.bpom_certified or ''))}. "
        f"Risky phrases: {json.dumps(hits)}. "
        "Return JSON only with keys summary, action_plan, rewrite_examples. "
        "summary must be 1 short paragraph. action_plan must have at most 3 short steps. "
        "rewrite_examples must have at most 2 short cosmetic-safe replacements. "
        "Prioritize missing BPOM first, then remove treatment or medical claims."
    )

    try:
        client = IlmuAIClient()
        result = await client.generate_json_response(prompt, timeout_seconds=14.0, max_attempts=1)

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
    except Exception as exc:
        print(f"Compliance advice full-AI pass failed for {sku.sku_id}: {type(exc).__name__}: {exc!r}")

    try:
        client = IlmuAIClient()
        summary_result, rewrites_result = await asyncio.gather(
            _generate_ai_summary(client, sku, hits),
            _generate_ai_rewrites(client, hits),
            return_exceptions=True,
        )

        summary = fallback["summary"]
        rewrite_examples = fallback["rewrite_examples"]

        if not isinstance(summary_result, Exception) and summary_result:
            summary = summary_result
        if not isinstance(rewrites_result, Exception) and rewrites_result:
            rewrite_examples = rewrites_result

        if summary != fallback["summary"] or rewrite_examples != fallback["rewrite_examples"]:
            return {
                "sku_id": sku.sku_id,
                "source": "ai_assisted",
                "summary": summary,
                "action_plan": fallback["action_plan"],
                "rewrite_examples": rewrite_examples,
            }

        if isinstance(summary_result, Exception):
            print(
                f"Compliance summary AI assist failed for {sku.sku_id}: "
                f"{type(summary_result).__name__}: {summary_result!r}"
            )
        if isinstance(rewrites_result, Exception):
            print(
                f"Compliance rewrite AI assist failed for {sku.sku_id}: "
                f"{type(rewrites_result).__name__}: {rewrites_result!r}"
            )
    except Exception as exc:
        print(f"Compliance advice fallback for {sku.sku_id}: {type(exc).__name__}: {exc!r}")

    return fallback
