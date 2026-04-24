import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List


def load_route_metadata(config_path: Path) -> Dict[str, dict]:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    route_map: Dict[str, dict] = {}
    for item in config:
        route_key = item["route"]
        route_map[route_key] = {
            "name": route_key,
            "currency": "MYR",
            "description": f"Generated from logistics table for {route_key}",
            "risk_level": item.get("risk_level", "Unknown"),
            "eta_days": item.get("normal_days", "Unknown"),
            "tiers": [],
        }
    return route_map


def parse_tiers(csv_path: Path) -> Dict[str, List[dict]]:
    tiers_by_route: Dict[str, List[dict]] = {}
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"route", "max_weight_g", "fee"}
        missing = required.difference(set(reader.fieldnames or []))
        if missing:
            raise ValueError(f"Missing CSV columns: {sorted(missing)}")

        for row in reader:
            route = row["route"].strip()
            tier = {
                "max_weight_g": int(row["max_weight_g"]),
                "fee": float(row["fee"]),
            }
            tiers_by_route.setdefault(route, []).append(tier)

    for route, tiers in tiers_by_route.items():
        tiers.sort(key=lambda x: x["max_weight_g"])

    return tiers_by_route


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert pasted logistics rate table CSV into data/logistics_rates.json"
    )
    parser.add_argument("--input", required=True, help="Input CSV path with route,max_weight_g,fee")
    parser.add_argument(
        "--config",
        default="data/logistics_config.json",
        help="Route metadata source JSON",
    )
    parser.add_argument(
        "--output",
        default="data/logistics_rates.json",
        help="Output logistics rates JSON path",
    )
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    config_path = Path(args.config).resolve()
    output_path = Path(args.output).resolve()

    route_map = load_route_metadata(config_path)
    tiers_by_route = parse_tiers(input_path)

    for route, tiers in tiers_by_route.items():
        if route not in route_map:
            route_map[route] = {
                "name": route,
                "currency": "MYR",
                "description": f"Generated from logistics table for {route}",
                "risk_level": "Unknown",
                "eta_days": "Unknown",
                "tiers": [],
            }
        route_map[route]["tiers"] = tiers

    output_payload = {"routes": route_map}
    output_path.write_text(json.dumps(output_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
