import json
from typing import Any
from urllib.parse import urlencode

from sqlalchemy.orm import Session

from db import models
from intelligence.ilmu_client import IlmuAIClient
from .fx_router import get_myr_idr_rate, DEFAULT_FX_RATE

TARGET_MARGIN_PCT = 0.08


def _has_delay_risk(alerts: list[models.CustomsAlert]) -> bool:
    for alert in alerts:
        lowered = str(alert.news_text or "").lower()
        if "inspection" in lowered or "delay" in lowered or "lampu merah" in lowered or "red light" in lowered:
            return True
    return False


def _shipping_cost_for(weight_g: int, has_delay_risk: bool) -> float:
    base = 4 + weight_g * 0.08
    return round(base + 2.5, 2) if has_delay_risk else round(base, 2)


def _duty_cost_for(revenue_myr: float) -> float:
    return round(revenue_myr * 0.1, 2)


def _build_intake_href(sku: models.SKU, *, selling_price_idr: float | None = None, cost_myr: float | None = None) -> str:
    query = {
        "sku_id": sku.sku_id,
        "product_name": sku.name or "",
        "category": sku.category or "",
        "hs_code": sku.hs_code or "",
        "cost_myr": str(cost_myr if cost_myr is not None else sku.cost_myr),
        "selling_price_idr": str(selling_price_idr if selling_price_idr is not None else sku.selling_price_idr),
        "weight_g": str(sku.weight_g),
        "bpom_certified": str(sku.bpom_certified or ""),
        "description": sku.description or "",
        "balanced_qty": str(sku.balanced_qty or ""),
        "qty_sold": str(sku.qty_sold or ""),
    }
    return f"/intake?{urlencode(query)}"


def _choose_best_option_fallback(options: list[dict[str, Any]]) -> str:
    ranked = sorted(
        options,
        key=lambda option: (
            0 if option.get("resolves_alert") else 1,
            option.get("relative_change", 999999),
            option.get("effort_rank", 999999),
        ),
    )
    return ranked[0]["option_id"]


async def get_profit_advice_for_sku(sku_id: str, db: Session) -> dict[str, Any]:
    sku = db.query(models.SKU).filter(models.SKU.sku_id == sku_id).first()
    if not sku:
        return {"status": "error", "reason": "Product not found in skus table"}

    alerts = db.query(models.CustomsAlert).order_by(models.CustomsAlert.id.desc()).limit(10).all()
    delay_risk = _has_delay_risk(alerts)

    fx_payload = get_myr_idr_rate()
    fx_rate = float(fx_payload.get("rate") or DEFAULT_FX_RATE)

    revenue_myr = round(float(sku.selling_price_idr) / fx_rate, 2) if fx_rate > 0 else 0.0
    duty_myr = _duty_cost_for(revenue_myr)
    shipping_myr = _shipping_cost_for(int(sku.weight_g or 0), delay_risk)
    net_profit_myr = round(revenue_myr - float(sku.cost_myr or 0) - duty_myr - shipping_myr, 2)
    margin_pct = round(net_profit_myr / revenue_myr, 4) if revenue_myr > 0 else 0.0

    fixed_cost = round(float(sku.cost_myr or 0) + shipping_myr, 2)
    revenue_needed_for_healthy_myr = round(fixed_cost / (0.9 - TARGET_MARGIN_PCT), 2) if revenue_myr > 0 else 0.0
    target_price_idr = int(revenue_needed_for_healthy_myr * fx_rate) + 1 if revenue_needed_for_healthy_myr > 0 else int(sku.selling_price_idr or 0)
    price_lift_idr = max(0, int(target_price_idr - float(sku.selling_price_idr or 0)))

    max_healthy_cost_myr = round(((0.9 - TARGET_MARGIN_PCT) * revenue_myr) - shipping_myr, 2)
    cost_reduction_myr = max(0.0, round(float(sku.cost_myr or 0) - max_healthy_cost_myr, 2))

    route_shipping_myr = _shipping_cost_for(int(sku.weight_g or 0), False)
    route_net_profit_myr = round(revenue_myr - float(sku.cost_myr or 0) - duty_myr - route_shipping_myr, 2)
    route_margin_pct = round(route_net_profit_myr / revenue_myr, 4) if revenue_myr > 0 else 0.0

    current_price = float(sku.selling_price_idr or 0)
    current_cost = float(sku.cost_myr or 0)
    current_weight = max(1, int(sku.weight_g or 1))

    options = [
        {
            "option_id": "route",
            "title": "Switch this SKU to Jakarta Warehouse",
            "detail": (
                f"Best when customs delay risk is the driver. Route change cuts shipping from RM {shipping_myr:.2f} to about "
                f"RM {route_shipping_myr:.2f} and would move margin to {route_margin_pct * 100:.1f}%."
                if delay_risk
                else f"Use Smart Router to review a lower-friction route. Estimated shipping would move from RM {shipping_myr:.2f} to RM {route_shipping_myr:.2f}."
            ),
            "button_label": "Open Smart Router",
            "href": "/router",
            "resolves_alert": route_net_profit_myr >= 0 and route_margin_pct >= TARGET_MARGIN_PCT,
            "relative_change": round(abs(shipping_myr - route_shipping_myr) / max(shipping_myr, 1), 4),
            "effort_rank": 1 if delay_risk else 3,
        },
        {
            "option_id": "price",
            "title": "Raise selling price to clear the alert",
            "detail": (
                f"Increase selling price by about IDR {price_lift_idr:,.0f} so this SKU reaches at least 8.0% margin. "
                f"Target price: IDR {target_price_idr:,.0f}."
                if price_lift_idr > 0
                else "Current price already clears the healthy threshold, so price is not the blocker."
            ),
            "button_label": "Edit price in Data Intake",
            "href": _build_intake_href(sku, selling_price_idr=max(current_price, float(target_price_idr))),
            "resolves_alert": price_lift_idr > 0,
            "relative_change": round(price_lift_idr / max(current_price, 1), 4),
            "effort_rank": 2,
        },
        {
            "option_id": "cost",
            "title": "Lower product cost",
            "detail": (
                f"Bring unit cost down by about RM {cost_reduction_myr:.2f} or more. Healthy target cost: RM {max_healthy_cost_myr:.2f}."
                if cost_reduction_myr > 0
                else "Product cost is already low enough that cost reduction is not the main lever."
            ),
            "button_label": "Edit cost in Data Intake",
            "href": _build_intake_href(sku, cost_myr=max(0.0, max_healthy_cost_myr)),
            "resolves_alert": cost_reduction_myr > 0,
            "relative_change": round(cost_reduction_myr / max(current_cost, 1), 4),
            "effort_rank": 4,
        },
    ]

    fallback_option_id = _choose_best_option_fallback(options)
    best_option_id = fallback_option_id
    source = "fallback"
    headline = "Recommended fix selected from the current SKU economics."
    rationale = "This option resolves the margin issue with the smallest practical change under the current live FX, duty, and shipping assumptions."

    try:
        client = IlmuAIClient()
        prompt = f"""
You are a cross-border operations advisor for a Malaysian seller shipping into Indonesia.
Choose exactly one best solution for this SKU from the provided options.
Do not recalculate numbers. Use the supplied figures only.
Prefer the option that most cleanly resolves the alert with the lowest operational downside.
Return JSON only in this shape:
{{
  "best_option_id": "route|price|cost",
  "headline": "short headline",
  "rationale": "2 short sentences maximum"
}}
Context:
{json.dumps({
    "sku_id": sku.sku_id,
    "financials": {
        "revenue_myr": revenue_myr,
        "duty_myr": duty_myr,
        "shipping_myr": shipping_myr,
        "net_profit_myr": net_profit_myr,
        "margin_pct": margin_pct,
    },
    "delay_risk": delay_risk,
    "options": [
        {
            "option_id": option["option_id"],
            "title": option["title"],
            "detail": option["detail"],
            "resolves_alert": option["resolves_alert"],
            "relative_change": option["relative_change"],
        }
        for option in options
    ],
})}
"""
        raw_response = await client.generate_response(prompt)
        cleaned = raw_response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)
        ai_option_id = parsed.get("best_option_id")
        if ai_option_id in {option["option_id"] for option in options}:
            best_option_id = ai_option_id
            source = "ai"
            headline = str(parsed.get("headline") or headline)
            rationale = str(parsed.get("rationale") or rationale)
    except Exception:
        pass

    return {
        "sku_id": sku.sku_id,
        "best_option_id": best_option_id,
        "headline": headline,
        "rationale": rationale,
        "source": source,
        "options": [
            {
                "option_id": option["option_id"],
                "title": option["title"],
                "detail": option["detail"],
                "button_label": option["button_label"],
                "href": option["href"],
            }
            for option in options
        ],
    }
