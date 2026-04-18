# DATA_DICTIONARY

This document defines data files maintained by P2 (Data Engineer) in the root `data/` folder.

## data/inventory.json

List of SKU records.

### Fields
- `sku_id` (string): Unique identifier for product SKU.
- `product_name` (string): Display name of the product.
- `category` (string): Product category label.
- `hs_code` (integer): Harmonized System code for customs/tax logic.
- `cost_myr` (number): Unit cost in MYR.
- `selling_price_idr` (number): Unit selling price in IDR.
- `weight_g` (integer): Item weight in grams.
- `bpom_certified` (string): `Yes` or `No` marker for BPOM status.
- `description` (string): Product description text used for policy/compliance scanning.
- `balanced_qty` (integer): Current stock balance.
- `qty_sold` (integer): Historical sold quantity.

## data/tax_master.json

List of HS-code tax and policy records.

### Fields
- `hs_code` (integer): HS code key.
- `bm_rate` (number): Import duty rate as decimal.
- `ppn_rate` (number): VAT rate as decimal.
- `pph_rate` (number): Income tax rate as decimal.
- `mandatory_docs` (string): Required customs/licensing documentation.
- `restricted_keywords` (string): Comma-separated risky terms used in compliance checks.

## data/logistics_config.json

Simple per-route fee/risk configuration.

### Fields
- `route` (string): Route id (for example `SLS_Direct`, `Jakarta_WH`).
- `base_weight_g` (integer): Base weight threshold in grams.
- `base_fee_myr` (number): Base shipping fee in MYR.
- `extra_weight_g` (integer): Extra weight increment in grams.
- `extra_fee_myr` (number): Added fee per extra increment in MYR.
- `normal_days` (string): Typical delivery window.
- `risk_level` (string): Operational/customs risk classification.

## data/logistics_rates.json

Tiered route shipping rates for lookup logic.

### Top-level structure
- `routes` (object): Map of route id to route detail.

### Route fields
- `name` (string): Human-readable route name.
- `currency` (string): Currency code (`MYR`).
- `description` (string): Operational notes.
- `risk_level` (string): Risk class.
- `eta_days` (string): Estimated delivery range.
- `tiers` (array): Ascending max-weight tiers with fee.
- `extra_weight_per_500g` or `extra_weight_per_1000g` (number): Extra fee rule above highest tier.

## data/villain_skus.json

Two intentionally risky SKUs for demo/testing.

### Purpose
- Trigger compliance alerts.
- Trigger negative-margin or low-margin scenarios.

## data/borderline_sku.json

Single SKU near Profit Shield threshold (~5% margin) to validate sensitivity behavior.

## data/customs_news_mock.txt

Three Bahasa Indonesia mock alerts used when live scraping fails.

### Purpose
- Demonstrate Policy Sentinel and Smart Router behavior.
- Provide deterministic fallback for demos.
