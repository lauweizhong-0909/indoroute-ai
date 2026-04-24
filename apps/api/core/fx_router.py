from datetime import datetime, timezone
import json
from urllib.request import urlopen

from fastapi import APIRouter

router = APIRouter(prefix="/fx", tags=["FX"])

DEFAULT_FX_RATE = 3350.0
FX_SOURCE_URL = "https://open.er-api.com/v6/latest/MYR"


@router.get("/rate")
def get_myr_idr_rate():
    """Return live MYR->IDR exchange rate with fallback for resilience."""
    try:
        with urlopen(FX_SOURCE_URL, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))

        idr_rate = float(payload["rates"]["IDR"])
        updated_unix = payload.get("time_last_update_unix")
        updated_at = (
            datetime.fromtimestamp(updated_unix, tz=timezone.utc).isoformat()
            if isinstance(updated_unix, (int, float))
            else datetime.now(timezone.utc).isoformat()
        )

        return {
            "base": "MYR",
            "target": "IDR",
            "rate": idr_rate,
            "source": "live",
            "updated_at": updated_at,
        }
    except Exception:
        return {
            "base": "MYR",
            "target": "IDR",
            "rate": DEFAULT_FX_RATE,
            "source": "fallback",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }