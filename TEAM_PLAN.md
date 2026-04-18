# IndoRoute AI — UMHackathon 2026 Team Plan

## Team of 5 · 8 Days · 30 Tasks · Demo MVP

> **Architecture:** No Docker. FastAPI backend (Railway), Next.js frontend (Vercel), SQLite for local dev / Neon Postgres for prod. Z.AI GLM is the intelligence core — all 4 AI modules route through it. Run locally with `uvicorn` and `pnpm dev`.

> **Hackathon:** UMHackathon 2026 · Domain 2: AI for Economic Empowerment & Decision Intelligence
> **Submission Deadline:** 26 April 2026, 07:59 AM

---

## Team Roles & File Ownership (Merge-Conflict Prevention)

Each person owns **exclusive directories**. No two people edit the same files.

| Role | Code | Owns These Directories | Does NOT Touch |
|---|---|---|---|
| **P1 — Infra Lead** | `P1-INFRA` | `/apps/api/core/`, `/apps/api/db/`, root configs, `docker-compose.yml`, seed scripts, Railway + Vercel deploy | GLM modules, scraper, frontend, docs |
| **P2 — Data Engineer** | `P2-DATA` | `/apps/api/scraper/`, `/apps/api/ingestion/`, `/data/` (all JSON & mock files) | GLM modules, frontend, docs |
| **P3 — GLM/AI Engineer** | `P3-GLM` | `/apps/api/intelligence/` (all 4 AI modules: sentinel, scanner, shield, router) | Scraper, infra, frontend, docs |
| **P4 — Frontend Engineer** | `P4-FRONTEND` | `/apps/web/` (entire frontend) | Any Python backend code |
| **P5 — Docs & QA** | `P5-DOCS` | `/docs/` (PRD, SAD, QATD), `/tests/`, pitch deck, demo video | Backend modules, frontend code |

### Shared contract files (coordinate before editing)
- `/apps/api/main.py` — FastAPI router registration (P1 sets up structure, others add `include_router()` lines in their merge)
- `/apps/api/schemas.py` — Pydantic request/response models (P1 defines base, P3 extends for GLM responses, P4 consumes)
- `/data/inventory.json` — master SKU data (P2 owns write access, P3 reads only)

---

## Timeline Overview

### Phase 1 (Days 1–3 · Apr 18–20): Foundation — Get Everything Running
| Block | P1-INFRA | P2-DATA | P3-GLM | P4-FRONTEND | P5-DOCS |
|---|---|---|---|---|---|
| **Days 1–2** | Monorepo scaffold, Neon DB, FastAPI `/health`, SQLAlchemy models | Create `inventory.json`, `tax_master.json`, `logistics_config.json` with 10 SKUs | Z.AI GLM client setup, test connection, base prompt framework | App shell, layout, sidebar, 5 route placeholders | PRD draft (problem, personas, features, success metrics) |
| **Day 3** | Core API endpoints (SKU CRUD, news ingestion), `.env.example` committed | `customs_news_mock.txt` — 3 realistic Bahasa Indonesia customs alerts | Policy Sentinel first draft: GLM parses mock news → structured JSON output | Dashboard KPI cards + alert banner (wired to mock data) | SAD draft: architecture diagram, GLM dependency diagram, data flow |

### Phase 2 (Days 4–6 · Apr 21–23): Build Core — All 4 AI Modules
| Block | P1-INFRA | P2-DATA | P3-GLM | P4-FRONTEND | P5-DOCS |
|---|---|---|---|---|---|
| **Day 4** | Demo seed script: 10 SKUs including 2 "villain" SKUs (BPOM-uncertified, negative-margin) | Beacukai news scraper (Python `httpx` + `beautifulsoup4`) | Compliance Scanner: GLM cross-references SKU descriptions vs `lartas_rules.json` | Compliance Radar screen + SKU input form | QATD: risk matrix (5×5), test cases for all 4 GLM modules |
| **Day 5** | Deploy to Railway (backend) + Vercel (frontend), set prod env vars | Shopee logistics rates parser: PDF → `logistics_rates.json` | Profit Shield: dynamic formula `(price × rate) − (cost + tariff + shipping)` + GLM explains | Profit Shield screen: per-SKU margin table with red/green indicators | Pitch deck draft: problem slides, demo flow, value proposition |
| **Day 6** | Integration checkpoint: seed prod DB, verify all 4 modules end-to-end | Data validation fixes, edge-case data (conflicting HS codes, zero-margin SKU) | Smart Router: GLM trade-off reasoning — outputs ranked action commands | Smart Router decision screen: "Switch to warehouse" recommendation card | Integration test pass 1: log all bugs in shared sheet |

### Phase 3 (Days 7–8 · Apr 24–25): Polish, Docs & Submit
| Block | P1-INFRA | P2-DATA | P3-GLM | P4-FRONTEND | P5-DOCS |
|---|---|---|---|---|---|
| **Day 7** | Demo walkthrough prep, final prod seed | Refresh prod data, verify villain SKU triggers correctly | GLM fallback handling, response time tuning (<8s per call) | Risk Center screen, UI polish, responsive layout | QATD finalised, SAD architecture section complete |
| **Day 8** | Final deploy check, backup demo video co-record | Stand by for data hotfixes | Final GLM integration test | Screenshot all screens for pitch deck | Record pitch video, assemble submission package |
| **Submit by Apr 26, 07:59 AM** | ✅ Push final code to GitHub | ✅ Confirm all JSON data files committed | ✅ Confirm GLM API key is in Railway env | ✅ Confirm Vercel deployment live | ✅ Upload PRD + SAD + QATD + pitch deck + video |

---

## P1 — INFRA LEAD

### Task 1: Project Setup and Environment Configuration
**Priority:** HIGH · **Dependencies:** None · **Phase 1 · Day 1**

**Measurable deliverables:**
- [ ] Monorepo initialised with `pnpm-workspace.yaml` listing `/apps/web`, `/apps/api`
- [ ] `/apps/api` running FastAPI with `GET /health` returning `200 OK`
- [ ] `/apps/web` running Next.js dev server at `localhost:3000`
- [ ] Neon Postgres provisioned — connection string in `.env`, `SELECT 1` succeeds from FastAPI
- [ ] `.env.example` committed with all required variable names (no secrets): `DATABASE_URL`, `ZAI_GLM_API_KEY`, `ZAI_GLM_BASE_URL`
- [ ] GitHub repository created with branch protection on `main`

**Subtasks:**
1. Initialise monorepo structure (pnpm workspace + Git + `.gitignore`)
2. Set up FastAPI backend (`/apps/api`) with `uvicorn` dev server
3. Set up Next.js frontend (`/apps/web`) with TypeScript + Tailwind CSS
4. Provision Neon Postgres (free tier), test connection from FastAPI
5. Create health check endpoint confirming DB connectivity
6. Commit `.env.example`, share real `.env` values in private team channel

---

### Task 2: Database Schema and SQLAlchemy Models
**Priority:** HIGH · **Dependencies:** Task 1 · **Phase 1 · Day 1–2**

**Measurable deliverables:**
- [ ] SQLAlchemy 2.x models for all MVP entities: `SKU`, `TaxRule`, `LogisticsRoute`, `CustomsAlert`, `ComplianceCheck`, `ProfitCalculation`, `RouterDecision`
- [ ] Alembic initial migration runs cleanly: `alembic upgrade head` succeeds against Neon
- [ ] All foreign key relationships verified with sample INSERT statements
- [ ] Schema documented as comments in model file (field purpose + data type rationale)

**Subtasks:**
1. Configure SQLAlchemy 2.x + Alembic + Neon Postgres connection
2. Core master data models: `SKU`, `TaxRule`, `LogisticsRoute`
3. Operational models: `CustomsAlert`, `ComplianceCheck`, `ProfitCalculation`, `RouterDecision`
4. Generate and apply Alembic migration
5. Share finalized schema with P2 (data) and P3 (GLM) before they start

---

### Task 3: Core FastAPI Router Architecture and API Endpoints
**Priority:** HIGH · **Dependencies:** Task 2 · **Phase 1 · Day 3**

**Measurable deliverables:**
- [ ] `main.py` registers all routers: `/api/skus`, `/api/alerts`, `/api/intelligence/*`
- [ ] `GET /api/skus` returns all SKUs with `sku_id`, `name`, `category`, `cost_myr`, `price_idr`, `weight_g`, `bpom_certified`
- [ ] `POST /api/alerts/ingest` accepts raw news text, stores to `CustomsAlert` table
- [ ] `GET /api/alerts` returns latest 10 alerts ordered by `created_at DESC`
- [ ] All endpoints return valid JSON with correct HTTP status codes
- [ ] Pydantic v2 request/response schemas defined in `/apps/api/schemas.py`

**Subtasks:**
1. Define Pydantic v2 models for all request/response shapes
2. SKU CRUD router (`/apps/api/core/sku_router.py`)
3. Alerts ingestion + retrieval router (`/apps/api/core/alerts_router.py`)
4. Register all routers in `main.py` with `/api` prefix
5. Test all endpoints with HTTPie or Postman, document example responses

---

### Task 4: Demo Data Seed Script
**Priority:** HIGH · **Dependencies:** Tasks 2, P2's JSON files · **Phase 2 · Day 4**

**Measurable deliverables:**
- [ ] Seed script populates exactly 10 SKUs: 7 normal + 2 "villain" SKUs + 1 borderline SKU
- [ ] Villain SKU 1: cosmetics SKU with `bpom_certified = False` and forbidden keyword "medical grade" in description → must trigger Compliance Scanner alert
- [ ] Villain SKU 2: high `cost_myr`, low `price_idr` → must trigger negative margin in Profit Shield
- [ ] All `TaxRule` rows seeded from `tax_master.json` (P2 provides this file)
- [ ] All `LogisticsRoute` rows seeded from `logistics_config.json` (P2 provides this file)
- [ ] Seed script is idempotent: safe to re-run without duplicates

**Subtasks:**
1. Parse P2's JSON files into seed functions
2. Insert SKU master data (normal + villain SKUs)
3. Insert tax rules and logistics routes
4. Add idempotency check (`ON CONFLICT DO NOTHING`)
5. Run seed on prod Neon DB, confirm row counts

---

### Task 5: Production Deployment and CI
**Priority:** HIGH · **Dependencies:** Tasks 1–4 · **Phase 2 · Day 5**

**Measurable deliverables:**
- [ ] FastAPI backend deployed to Render — `GET https://<project>.onrender.com/health` returns `200 OK`
- [ ] Next.js frontend deployed to Vercel — live URL accessible
- [ ] All env vars (`DATABASE_URL`, `ZAI_GLM_API_KEY`) set in Render dashboard
- [ ] GitHub Actions workflow runs on push to `main`: lints Python code, runs `pytest` for P3's tests
- [ ] Deployment takes <10 minutes from push to live
- [ ] **Before demo:** manually ping the Render URL once to wake the free-tier instance

**Subtasks:**
1. Create `render.yaml` for backend deployment config
2. Connect GitHub repo to Render (Web Service → Python → `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`)
3. Connect GitHub repo to Vercel for frontend auto-deploy
4. Set all production environment variables in Render + Vercel dashboards
5. Write GitHub Actions workflow (`.github/workflows/ci.yml`)
6. Perform first end-to-end smoke test on live URLs

---

### Task 6: Demo Script and Final Walkthrough
**Priority:** HIGH · **Dependencies:** All tasks · **Phase 3 · Day 8**

**Measurable deliverables:**
- [ ] Written demo script covering the 4-act narrative: Dashboard calm → News injection → System red alert → Smart Router action command
- [ ] Demo flows end-to-end on **deployed URL** in under 5 minutes without errors
- [ ] Backup local demo ready (in case of internet issues at submission)
- [ ] Pitch framing includes: "Prevents RM10,000+ losses per incident, 30-second decision vs 3-hour manual analysis"

---

## P2 — DATA ENGINEER

### Task 7: Core Structured Data Files
**Priority:** HIGH · **Dependencies:** Task 2 schema · **Phase 1 · Days 1–2**

**Measurable deliverables:**
- [ ] `inventory.json`: 10 SKUs with fields `sku_id`, `product_name`, `category`, `hs_code`, `cost_myr`, `selling_price_idr`, `weight_g`, `bpom_certified`, `description`
- [ ] `tax_master.json`: HS code → `bm_rate` (import duty), `ppn_rate` (VAT), `pph_rate` (income tax), `mandatory_docs`, `restricted_keywords`
- [ ] `logistics_config.json`: 2 routes (`SLS_Direct` and `Jakarta_WH`) with `base_weight_g`, `base_fee_myr`, `extra_weight_g`, `extra_fee_myr`, `normal_days`, `risk_level`
- [ ] All percentages stored as decimals (e.g., 15% → `0.15`)
- [ ] All weights in grams, all MYR prices in MYR, all IDR prices in IDR — no mixed units
- [ ] Files committed to `/data/` directory and shared with P1 and P3

**Subtasks:**
1. Design `inventory.json` schema and populate 10 SKUs (cosmetics + apparel mix)
2. Design `tax_master.json` from INSW reference data
3. Design `logistics_config.json` from Shopee SLS fee table
4. Validate JSON files with Python `json.loads()` — zero parse errors
5. Write short `DATA_DICTIONARY.md` explaining every field

---

### Task 8: Customs News Mock Data File
**Priority:** HIGH · **Dependencies:** None · **Phase 1 · Day 3**

**Measurable deliverables:**
- [ ] `customs_news_mock.txt` contains 3 distinct mock alerts in realistic Bahasa Indonesia prose
- [ ] Alert 1: tariff increase on cosmetics category (triggers Policy Sentinel + Profit Shield)
- [ ] Alert 2: "Lampu Merah" 100% inspection period announcement (triggers Smart Router)
- [ ] Alert 3: BPOM enforcement crackdown on unregistered serums (triggers Compliance Scanner)
- [ ] Each alert is 2–4 sentences, written to look like a real Beacukai press release excerpt
- [ ] File committed to `/data/customs_news_mock.txt`

**Subtasks:**
1. Research real Beacukai announcement structure and terminology
2. Draft Alert 1 (tariff hike), Alert 2 (Lampu Merah), Alert 3 (BPOM crackdown)
3. Review with P3 to confirm each alert reliably triggers its target GLM module
4. Commit final file

---

### Task 9: Beacukai News Scraper
**Priority:** HIGH · **Dependencies:** Task 8 (mock as baseline) · **Phase 2 · Day 4**

**Measurable deliverables:**
- [ ] Python script in `/apps/api/scraper/beacukai_scraper.py` fetches latest news from `https://www.beacukai.go.id/berita.html`
- [ ] Scraper extracts: article title, date, body text (first 500 chars)
- [ ] Output saved as structured dict and can be passed directly to `POST /api/alerts/ingest`
- [ ] Graceful failure: if site unreachable, falls back to `customs_news_mock.txt` automatically
- [ ] Scraper invocable from CLI: `python scraper/beacukai_scraper.py --limit 3`

> **Demo note:** Scraper runs live in demo to show real-time data ingestion. If Beacukai blocks the IP during demo, use mock file fallback — judge won't know the difference.

**Subtasks:**
1. `httpx` + `beautifulsoup4` setup in `/apps/api/scraper/`
2. Parse Beacukai news listing page HTML
3. Extract article content per post
4. CLI entry point with `--limit` flag
5. Fallback-to-mock logic with logging

---

### Task 10: Shopee Logistics Rates Parser
**Priority:** MEDIUM · **Dependencies:** Task 7 · **Phase 2 · Day 5**

**Measurable deliverables:**
- [ ] Script reads Shopee SLS fee table (manual copy-paste acceptable for demo) and outputs `logistics_rates.json`
- [ ] `logistics_rates.json` covers: SLS Direct (high risk, slow) and Jakarta Warehouse (low risk, fast), with full weight tier breakdown
- [ ] P3 can import this file and calculate exact shipping cost for any weight using a simple lookup function
- [ ] File committed to `/data/logistics_rates.json`

---

### Task 11: Data Validation and Edge-Case Dataset
**Priority:** MEDIUM · **Dependencies:** Task 7 · **Phase 2 · Day 6**

**Measurable deliverables:**
- [ ] `villain_skus.json`: 2 deliberately broken SKUs (one uncertified cosmetic, one negative-margin product)
- [ ] `borderline_sku.json`: 1 SKU that sits exactly at the 5% margin threshold to demonstrate Profit Shield sensitivity
- [ ] Validation script confirms no field is null or mistyped across all `/data/` JSON files
- [ ] Validation script exits with `0` on clean data, `1` on errors — integrated into GitHub Actions CI

**Subtasks:**
1. Create villain and borderline SKU files
2. Write `scripts/validate_data.py` checking all JSON files
3. Add validation step to GitHub Actions workflow

---

### Task 12: Production Data Refresh and Demo Readiness
**Priority:** HIGH · **Dependencies:** All P2 tasks · **Phase 3 · Day 7–8**

**Measurable deliverables:**
- [ ] All 3 scenario triggers verified on live prod URL: Compliance alert fires, Profit Shield flags villain SKU, Smart Router recommends warehouse
- [ ] `customs_news_mock.txt` loaded in prod DB — confirmed via `GET /api/alerts`
- [ ] Stand by on Day 8 to hotfix any data issues discovered during demo rehearsal

---

## P3 — GLM/AI ENGINEER

### Task 13: Z.AI GLM Client Setup and Base Prompt Framework
**Priority:** HIGH · **Dependencies:** Task 1 · **Phase 1 · Days 1–2**

**Measurable deliverables:**
- [ ] `ZAIClient` class in `/apps/api/intelligence/glm_client.py` wraps Z.AI GLM API calls
- [ ] Test call to GLM with `"Hello, confirm you are online"` succeeds and returns text response
- [ ] Base prompt builder function: `build_prompt(system_prompt, context_data, user_query) → str`
- [ ] All GLM calls include structured JSON output instruction: `"Respond ONLY in valid JSON. No preamble."`
- [ ] `ZAI_GLM_API_KEY` loaded from environment — never hardcoded
- [ ] Response parser: extracts JSON from GLM output, raises `GLMParseError` on failure

**Subtasks:**
1. Install Z.AI GLM SDK or configure `httpx` client to GLM endpoint
2. `ZAIClient` class with `call(system, user, max_tokens)` method
3. Base prompt builder with context injection pattern
4. JSON extraction + `GLMParseError` exception class
5. Test script: `python -m intelligence.test_glm` — must pass before proceeding

---

### Task 14: Policy Sentinel Module
**Priority:** HIGH · **Dependencies:** Tasks 7, 8, 13 · **Phase 1–2 · Day 3–4**

**Measurable deliverables:**
- [ ] `/apps/api/intelligence/policy_sentinel.py` exposes `analyse_alert(news_text: str, skus: list) → PolicyAlert`
- [ ] `PolicyAlert` schema: `{ "triggered": bool, "affected_skus": [...], "risk_level": "HIGH|MEDIUM|LOW", "action": str, "explanation": str }`
- [ ] GLM correctly identifies affected SKUs when Alert 1 (tariff hike on cosmetics) is processed
- [ ] GLM output is parsed into `PolicyAlert` without errors in 3/3 test runs
- [ ] `POST /api/intelligence/policy-sentinel` endpoint returns `PolicyAlert` JSON in <10 seconds
- [ ] Fallback: if GLM fails, return `{ "triggered": false, "error": "GLM unavailable" }` — never crash

**Subtasks:**
1. Design system prompt: instruct GLM to extract affected HS codes and map to SKU list
2. Context injection: serialize SKU list into prompt as compact JSON
3. `analyse_alert()` core function
4. FastAPI endpoint + Pydantic response model
5. Unit tests: 3 test alerts × confirm correct `affected_skus` output

---

### Task 15: Compliance Scanner Module
**Priority:** HIGH · **Dependencies:** Tasks 7, 13 · **Phase 2 · Day 4**

**Measurable deliverables:**
- [ ] `/apps/api/intelligence/compliance_scanner.py` exposes `scan_sku(sku: dict, rules: dict) → ComplianceReport`
- [ ] `ComplianceReport` schema: `{ "sku_id": str, "compliant": bool, "violations": [...], "recommendation": str }`
- [ ] Villain SKU 1 (uncertified cosmetic + "medical grade" description) correctly flagged as non-compliant
- [ ] Clean SKU returns `"compliant": true` with no violations
- [ ] `POST /api/intelligence/compliance-scanner` endpoint works end-to-end with real `inventory.json` data
- [ ] Keyword detection prompt explicitly lists BPOM forbidden terms: `medical`, `cure`, `fast whiten`, `clinical`

**Subtasks:**
1. Design compliance system prompt with BPOM rules as structured context
2. Keyword + certification cross-reference logic in prompt
3. `scan_sku()` core function + `scan_all_skus()` batch wrapper
4. FastAPI endpoint
5. Unit tests: villain SKU → flagged, clean SKU → compliant

---

### Task 16: Profit Shield Module
**Priority:** HIGH · **Dependencies:** Tasks 7, 13 · **Phase 2 · Day 5**

**Measurable deliverables:**
- [ ] `/apps/api/intelligence/profit_shield.py` exposes `calculate_profit(sku, route, exchange_rate) → ProfitResult`
- [ ] Formula verified: `net_profit_myr = (selling_price_idr × fx_rate) − cost_myr − tariff_myr − shipping_myr`
- [ ] `ProfitResult` schema: `{ "sku_id": str, "net_profit_myr": float, "margin_pct": float, "alert": bool, "explanation": str }`
- [ ] Alert triggered when `margin_pct < 0.05` (5% threshold)
- [ ] Villain SKU 2 (negative-margin) correctly triggers `"alert": true`
- [ ] Exchange rate fetched from free API (e.g., `api.exchangerate-api.com`) — fallback to `0.00028` if unavailable
- [ ] GLM generates human-readable `explanation` field: e.g., "After the 15% import duty and shipping, this SKU loses RM2.40 per unit."

**Subtasks:**
1. Exchange rate fetcher with fallback
2. Core profit calculation formula (deterministic — no GLM for numbers)
3. GLM call for `explanation` field only (GLM explains, does not calculate)
4. `ProfitResult` Pydantic model
5. FastAPI endpoint + unit tests

---

### Task 17: Smart Router Decision Engine
**Priority:** HIGH · **Dependencies:** Tasks 14, 15, 16 · **Phase 2 · Day 5–6**

**Measurable deliverables:**
- [ ] `/apps/api/intelligence/smart_router.py` exposes `generate_decision(context: RouterContext) → RouterDecision`
- [ ] `RouterContext` aggregates inputs: policy alerts, compliance reports, profit results, logistics options
- [ ] `RouterDecision` schema: `{ "action": str, "rationale": str, "priority": "URGENT|HIGH|MEDIUM", "trade_offs": str }`
- [ ] GLM produces context-aware decision: when Alert 2 (Lampu Merah) is active + high-margin SKUs present → "Switch top 3 SKUs to Jakarta warehouse immediately"
- [ ] Decision is **advisory only** — no system state is modified automatically
- [ ] `POST /api/intelligence/smart-router` returns decision in <12 seconds

**Subtasks:**
1. `RouterContext` aggregator: pulls latest alerts + compliance + profit into one dict
2. Multi-step prompt: GLM receives all module outputs and reasons across them
3. Trade-off explanation prompt: GLM explains cost vs risk of each option
4. `generate_decision()` function + FastAPI endpoint
5. Integration test: inject Alert 2 + villain SKU → confirm warehouse recommendation

---

### Task 18: GLM Integration Tests and Fallback Handling
**Priority:** HIGH · **Dependencies:** Tasks 14–17 · **Phase 3 · Day 7**

**Measurable deliverables:**
- [ ] `pytest` test suite in `/tests/test_intelligence.py` with 12+ test cases covering all 4 modules
- [ ] All 4 modules tested with: (a) clean input, (b) villain input, (c) GLM timeout simulation
- [ ] GLM timeout simulation uses `unittest.mock` to patch `ZAIClient.call` — fallback response returned, no crash
- [ ] All tests pass: `pytest tests/ -v` exits with `0`
- [ ] Average GLM response time logged and confirmed <10 seconds per module call

---

## P4 — FRONTEND ENGINEER

### Task 19: App Shell, Layout and Navigation
**Priority:** HIGH · **Dependencies:** None (UI only) · **Phase 1 · Day 1–2**

**Measurable deliverables:**
- [ ] Root `layout.tsx` with sidebar + header + main content area
- [ ] Sidebar navigation with 5 routes: `/dashboard`, `/compliance`, `/profit`, `/router`, `/alerts`
- [ ] Active route highlighted in sidebar
- [ ] Header shows: IndoRoute AI logo, live exchange rate badge (MYR/IDR), "System Status: Online" indicator
- [ ] All 5 routes render placeholder pages — zero 404s
- [ ] Layout responsive: sidebar collapses on mobile (<768px)

**Subtasks:**
1. Next.js App Router root layout with TypeScript
2. Sidebar component (use shadcn/ui `Sheet` for mobile)
3. Header with status badges
4. Route placeholder pages with page titles
5. Tailwind CSS config with brand colours (deep navy + red alert + green safe)

---

### Task 20: Dashboard Screen — KPI Cards and Alert Banner
**Priority:** HIGH · **Dependencies:** Tasks 3, 17, 19 · **Phase 1–2 · Day 3–4**

**Measurable deliverables:**
- [ ] `/dashboard` fetches from `GET /api/intelligence/smart-router` via `fetch()` or TanStack Query
- [ ] 3 KPI summary cards: "SKUs at Risk", "Active Customs Alerts", "Profit Shield Warnings"
- [ ] Red blinking alert banner when any module returns `HIGH` priority decision
- [ ] Latest Smart Router decision displayed as a highlighted action card: action text + rationale + priority badge
- [ ] "Run Full Analysis" button triggers all 4 modules sequentially and refreshes page
- [ ] Loading skeleton shown while data fetches; error state shown if API fails

**Subtasks:**
1. Page route + data fetching hook
2. KPI card components with colour coding (red/orange/green)
3. Alert banner component with pulse animation
4. Smart Router decision card
5. "Run Full Analysis" button with loading state
6. Loading skeleton + error boundary

---

### Task 21: Compliance Radar Screen
**Priority:** HIGH · **Dependencies:** Tasks 15, 19 · **Phase 2 · Day 4–5**

**Measurable deliverables:**
- [ ] `/compliance` shows SKU inventory table: columns = `SKU Name`, `Category`, `BPOM Certified`, `Description`, `Status`
- [ ] `Status` column: "✅ Compliant" or "🚨 Violations Found" badge per SKU
- [ ] Clicking a non-compliant SKU expands a drawer showing `violations` list + `recommendation` from GLM
- [ ] "Scan All SKUs" button calls `POST /api/intelligence/compliance-scanner` in batch
- [ ] Villain SKU (uncertified) visually stands out with red row highlight
- [ ] Empty state shown if no SKUs loaded

**Subtasks:**
1. SKU table with expandable row
2. Compliance status badge component
3. Violation detail drawer
4. "Scan All" button with progress indicator
5. API integration + error handling

---

### Task 22: Profit Shield Screen
**Priority:** HIGH · **Dependencies:** Tasks 16, 19 · **Phase 2 · Day 5–6**

**Measurable deliverables:**
- [ ] `/profit` shows per-SKU profit table: `SKU`, `Selling Price (IDR)`, `Cost (MYR)`, `Net Profit (MYR)`, `Margin %`, `Alert`
- [ ] Margin % column: green (≥15%), yellow (5–15%), red (<5%)
- [ ] "⚠️ Alert" badge shown on rows where `margin_pct < 0.05`
- [ ] Live exchange rate displayed at top of page (MYR/IDR)
- [ ] Clicking a SKU row shows GLM explanation in a side panel
- [ ] "Recalculate" button re-fetches with current exchange rate

---

### Task 23: Smart Router Decision Screen
**Priority:** HIGH · **Dependencies:** Tasks 17, 19 · **Phase 2–3 · Day 6–7**

**Measurable deliverables:**
- [ ] `/router` shows the aggregated decision card: action text, rationale paragraph, priority badge
- [ ] Trade-off section: two columns — "Direct Shipping" vs "Warehouse Route" — with cost, risk, ETA comparison
- [ ] "Accept Recommendation" button (visual only — marks decision as acknowledged, no backend state change)
- [ ] Historical decisions list: last 5 decisions with timestamps
- [ ] Entire screen updates when new customs alert is injected

**Subtasks:**
1. Decision card component with priority colour coding
2. Trade-off comparison table
3. "Accept" button with optimistic UI update
4. Decision history list

---

### Task 24: UI Polish, Responsiveness and Demo Screenshots
**Priority:** HIGH · **Dependencies:** All frontend tasks · **Phase 3 · Day 7–8**

**Measurable deliverables:**
- [ ] Consistent colour palette across all 5 screens (brand colours in `tailwind.config.ts`)
- [ ] All tables have consistent column widths, hover states, alternating row colours
- [ ] Typography hierarchy: H1 = page title, H2 = section title, H3 = card title
- [ ] Responsive: all screens usable at 1024px and 1440px widths
- [ ] Zero console errors or warnings in browser devtools
- [ ] Screenshots of all 5 screens captured at 1440px for pitch deck (share with P5)
- [ ] "Demo mode" banner displayed in corner on prod URL so judges know it's live

---

## P5 — DOCS & QA

### Task 25: Product Requirement Document (PRD)
**Priority:** HIGH · **Dependencies:** Project idea · **Phase 1 · Days 1–3**

**Measurable deliverables:**
- [ ] PRD saved to `/docs/PRD.docx` using UMHackathon 2026 PRD template
- [ ] Sections complete: Project Overview, Background & Business Objective, Product Purpose, System Functionalities (all 4 modules described), User Stories, Scope Definition, Assumptions & Constraints, Risks
- [ ] User stories written for target persona: "As a Malaysian Shopee seller exporting to Indonesia, I want to..."
- [ ] GLM model selection section: explain why Z.AI GLM is chosen and how it enables each feature
- [ ] Prompting strategy documented: few-shot prompting with structured JSON output constraints
- [ ] Fallback behaviour documented: what happens when GLM returns hallucinated or off-topic response

**Subtasks:**
1. Fill in Project Overview and Business Background sections
2. Write 5+ user stories covering all 4 AI modules
3. Document GLM integration strategy (model selection + prompting)
4. Define scope: what is IN and what is explicitly OUT for MVP
5. Document known risks (GLM latency, Beacukai scraping reliability)

---

### Task 26: System Analysis Documentation (SAD)
**Priority:** HIGH · **Dependencies:** Task 3 (architecture finalised) · **Phase 2 · Days 4–5**

**Measurable deliverables:**
- [ ] SAD saved to `/docs/SAD.docx` using UMHackathon 2026 SAD template
- [ ] High-Level Architecture section: client-server architecture, FastAPI backend, Next.js frontend, Neon Postgres
- [ ] GLM Dependency Diagram: shows prompt construction → GLM API call → JSON parsing → API response for each of the 4 modules
- [ ] Sequence Diagram: one complete user flow — "Seller uploads inventory → triggers Compliance Scanner → sees violation alert"
- [ ] Data Flow section: how `inventory.json` → FastAPI → GLM → frontend
- [ ] Technology Stack table: Frontend (Next.js + Tailwind), Backend (FastAPI + SQLAlchemy), DB (Neon Postgres), AI (Z.AI GLM), Deployment (Vercel + Railway)

**Subtasks:**
1. Architecture overview paragraph + stack table
2. Draw GLM dependency diagram (use draw.io or Mermaid)
3. Write sequence diagram for Compliance Scanner flow
4. Data flow description for all 4 modules
5. Export as `.docx` and commit to `/docs/`

---

### Task 27: Quality Assurance Testing Documentation (QATD)
**Priority:** HIGH · **Dependencies:** Tasks 14–17 · **Phase 2 · Days 5–6**

**Measurable deliverables:**
- [ ] QATD saved to `/docs/QATD.docx` using UMHackathon 2026 QATD template
- [ ] Risk Assessment table: 5+ technical risks using 5×5 matrix (Likelihood × Severity)
- [ ] Highest risk identified: "GLM returns hallucinated profit figures" → Risk Score 15 (High) → Mitigation: GLM never calculates numbers, only explains them
- [ ] Test cases for all 4 GLM modules: happy path + villain input + API failure path
- [ ] Unit test coverage summary: link to `/tests/test_intelligence.py`
- [ ] CI/CD gates documented: `pytest` must pass before merge to `main`

**Subtasks:**
1. Populate Document Control table (GitHub repo URL, project board URL, deployment URL)
2. Define in-scope vs out-of-scope features for testing
3. Build 5×5 risk matrix with mitigation strategies
4. Write test case specifications for all 4 modules (12+ total)
5. Document CI/CD pipeline strategy

---

### Task 28: Pitch Deck
**Priority:** HIGH · **Dependencies:** All tasks · **Phase 2–3 · Days 5–7**

**Measurable deliverables:**
- [ ] Pitch deck saved as `/docs/PITCH_DECK.pdf` or `.pptx`
- [ ] Slides: Problem (2), Solution Overview (2), 4 Feature Deep-Dives (4), Demo Flow (2), Architecture (1), Business Impact (1), Team (1) = ~13 slides
- [ ] "The Twist" slide: shows villain SKU triggering red alert dashboard — most impactful visual
- [ ] Business impact numbers: "Prevents RM10K+ loss per incident", "30-second decision vs 3-hour manual review", "100% BPOM compliance before shipment"
- [ ] Screenshots from P4's UI embedded in feature slides
- [ ] Slide deck reviewed by all 5 team members before video recording

**Subtasks:**
1. Draft slide structure and get team approval on narrative
2. Design slides (use Canva or Google Slides for speed)
3. Embed UI screenshots from P4 (request screenshots after Day 7)
4. Add business case numbers and real-world case studies from idea docs
5. Export final PDF

---

### Task 29: Integration Testing
**Priority:** HIGH · **Dependencies:** Phase 2 completion · **Phase 3 · Day 7**

**Measurable deliverables:**
- [ ] Full end-to-end test: inject `customs_news_mock.txt` Alert 2 (Lampu Merah) → confirm Dashboard shows `URGENT` decision
- [ ] Full end-to-end test: submit villain SKU 1 → confirm `/compliance` shows violations
- [ ] Full end-to-end test: submit villain SKU 2 → confirm `/profit` shows red alert
- [ ] All bugs logged in shared bug tracking sheet with: description, steps to reproduce, assigned to, severity
- [ ] All HIGH severity bugs resolved before Day 8 recording

**Subtasks:**
1. Prepare test scripts (manual step-by-step test cases)
2. Execute all 3 end-to-end scenarios on live prod URL
3. Log and triage all bugs found
4. Re-test all bug fixes on Day 8

---

### Task 30: Pitch Video Recording and Submission Package
**Priority:** HIGH · **Dependencies:** All tasks · **Phase 3 · Day 8**

**Measurable deliverables:**
- [ ] Recorded pitch video: 5–8 minutes, covers problem + demo + team
- [ ] Demo in video uses live deployed URL (not localhost)
- [ ] Video clearly shows "The Twist" moment: red alert firing after news injection
- [ ] Submission package includes: GitHub repo link, live demo URL, PRD, SAD, QATD, pitch deck, pitch video
- [ ] All files submitted before **26 April 2026, 07:59 AM**

**Subtasks:**
1. Rehearse demo script with full team (Day 8 morning)
2. Record pitch video using OBS or Loom (P5 leads narration, P4 drives UI)
3. Upload video to Google Drive / YouTube
4. Assemble all submission files into one folder
5. Submit via official UMHackathon form before deadline

---

## Cross-Team Integration Checkpoints

| When | What | Who Syncs |
|---|---|---|
| Day 1, End of Day | P1 shares `.env` values in private channel; GitHub repo set up with all branches | P1 → All |
| Day 2, End of Day | P1 confirms schema migrated; P2 commits all 3 JSON files to `/data/` | P1 + P2 → P3 |
| Day 3, End of Day | P3 confirms GLM client works; P5 shares PRD draft for team review | P3 + P5 → All |
| Day 4, Midday | P3 deploys Policy Sentinel + Compliance Scanner endpoints — P4 can wire up screens | P3 → P4 |
| Day 5, Midday | P3 deploys Profit Shield + Smart Router — P4 completes all 4 screens | P3 → P4 |
| Day 5, End of Day | P1 confirms Render + Vercel deployment live; all team smoke-tests the live URL | P1 → All |
| Day 6, End of Day | **Feature Freeze** — P5 begins integration testing; only bug fixes allowed after this point | All |
| Day 7, Midday | P5 reports all bugs; P1/P2/P3/P4 fix all HIGH severity issues | P5 → Respective owners |
| Day 7, End of Day | P4 sends screenshots of all screens to P5 for pitch deck | P4 → P5 |
| Day 8, Morning | Full team demo rehearsal on live URL; P5 leads recording session | All |
| **Apr 26, 07:00 AM** | P5 submits all materials — **30 minutes before deadline** | P5 → Submit |

---

## Deployment Plan

| Service | Platform | Free Tier | Notes |
|---|---|---|---|
| **PostgreSQL** | Neon | 0.5 GB storage | Branching for dev vs prod |
| **Backend API** | Render | 750 hrs/month free | FastAPI + `uvicorn`, auto-deploys from GitHub |
| **Frontend** | Vercel | Unlimited deploys | Auto-deploys on push to `main` |
| **GLM API** | Z.AI | Hackathon credits | Store key in Render environment variables |
| **File storage** | `/data/` in repo | — | JSON files committed to Git |

> No Docker required. Local dev: `uvicorn apps.api.main:app --reload` (backend) + `pnpm dev` (frontend).
> ⚠️ Render free tier **spins down after 15 min of inactivity** — first request takes ~30 seconds to wake up. Before your demo, open the backend URL once to wake it up.

---

## Summary: Task Assignment Matrix

| Task | Title | Assignee | Priority | Phase |
|---|---|---|---|---|
| 1 | Project Setup & Environment | P1-INFRA | HIGH | Phase 1 |
| 2 | Database Schema & Models | P1-INFRA | HIGH | Phase 1 |
| 3 | FastAPI Router Architecture | P1-INFRA | HIGH | Phase 1 |
| 4 | Demo Data Seed Script | P1-INFRA | HIGH | Phase 2 |
| 5 | Production Deployment & CI | P1-INFRA | HIGH | Phase 2 |
| 6 | Demo Script & Walkthrough | P1-INFRA | HIGH | Phase 3 |
| 7 | Core Structured Data Files | P2-DATA | HIGH | Phase 1 |
| 8 | Customs News Mock Data | P2-DATA | HIGH | Phase 1 |
| 9 | Beacukai News Scraper | P2-DATA | HIGH | Phase 2 |
| 10 | Shopee Logistics Rates Parser | P2-DATA | MEDIUM | Phase 2 |
| 11 | Data Validation & Edge Cases | P2-DATA | MEDIUM | Phase 2 |
| 12 | Production Data Refresh | P2-DATA | HIGH | Phase 3 |
| 13 | Z.AI GLM Client Setup | P3-GLM | HIGH | Phase 1 |
| 14 | Policy Sentinel Module | P3-GLM | HIGH | Phase 1–2 |
| 15 | Compliance Scanner Module | P3-GLM | HIGH | Phase 2 |
| 16 | Profit Shield Module | P3-GLM | HIGH | Phase 2 |
| 17 | Smart Router Decision Engine | P3-GLM | HIGH | Phase 2 |
| 18 | GLM Integration Tests | P3-GLM | HIGH | Phase 3 |
| 19 | App Shell & Navigation | P4-FRONTEND | HIGH | Phase 1 |
| 20 | Dashboard Screen | P4-FRONTEND | HIGH | Phase 1–2 |
| 21 | Compliance Radar Screen | P4-FRONTEND | HIGH | Phase 2 |
| 22 | Profit Shield Screen | P4-FRONTEND | HIGH | Phase 2 |
| 23 | Smart Router Screen | P4-FRONTEND | HIGH | Phase 2–3 |
| 24 | UI Polish & Screenshots | P4-FRONTEND | HIGH | Phase 3 |
| 25 | PRD | P5-DOCS | HIGH | Phase 1 |
| 26 | SAD | P5-DOCS | HIGH | Phase 2 |
| 27 | QATD | P5-DOCS | HIGH | Phase 2 |
| 28 | Pitch Deck | P5-DOCS | HIGH | Phase 2–3 |
| 29 | Integration Testing | P5-DOCS | HIGH | Phase 3 |
| 30 | Pitch Video & Submission | P5-DOCS | HIGH | Phase 3 |

---

## What to Cut if Running Behind

If Day 6 ends and you're behind, drop these in order:

1. **Task 10** — Shopee logistics parser (hardcode 2 routes in `logistics_config.json` manually)
2. **Task 9** — Live Beacukai scraper (use `customs_news_mock.txt` exclusively — demo looks identical)
3. **Task 11** — Data validation script (skip, just validate manually before recording)
4. **Task 23** — Smart Router historical decision list (show only latest decision card)

The **minimum viable demo** needs only: Tasks 1, 2, 3, 4, 5, 7, 8, 13, 14, 15, 16, 17, 19, 20, 21, 22, 25, 26, 27, 28, 30

**Non-negotiable for judging:** All 4 GLM modules must fire live in the demo. The "villain SKU triggers red alert" moment is the centrepiece — do not cut it.

---

## Git Branch Strategy (Merge-Conflict Prevention)

```
main
 ├── feat/p1-infra-setup          (P1 only)
 ├── feat/p1-schema-seeds         (P1 only)
 ├── feat/p2-data-files           (P2 only)
 ├── feat/p2-scraper              (P2 only)
 ├── feat/p3-glm-client           (P3 only)
 ├── feat/p3-intelligence-modules (P3 only)
 ├── feat/p4-layout               (P4 only)
 ├── feat/p4-screens              (P4 only)
 └── feat/p5-docs-tests           (P5 only)
```

**Rules:**
1. Never edit files outside your owned directories — if in doubt, ask first
2. P1 merges first (infrastructure base), then P2 + P3 (backend logic), then P4 (frontend)
3. `main.py` router registration: P1 creates skeleton, others add `include_router()` only during their designated merge window
4. Use `develop` branch for Day 6–7 integration testing before final merge to `main`
5. Feature freeze at end of Day 6: no new features, bug fixes only
