import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

import httpx

try:
    from bs4 import BeautifulSoup
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "beautifulsoup4 is required for scraping. Install with: pip install beautifulsoup4"
    ) from exc

BEACUKAI_NEWS_URL = "https://www.beacukai.go.id/berita.html"


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _extract_article_links(html: str, limit: int) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls: List[str] = []

    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        if not href:
            continue
        if href.startswith("/"):
            href = f"https://www.beacukai.go.id{href}"
        if "beacukai.go.id" not in href:
            continue
        if "/berita/" not in href and "berita" not in href:
            continue
        if href in urls:
            continue
        urls.append(href)
        if len(urls) >= limit:
            break

    return urls


def _extract_article_payload(html: str, url: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.find(["h1", "h2"])
    title = _normalize_space(title_tag.get_text()) if title_tag else "Untitled"

    time_tag = soup.find("time")
    date_text = _normalize_space(time_tag.get_text()) if time_tag else "Unknown"

    paragraphs = [
        _normalize_space(p.get_text())
        for p in soup.find_all("p")
        if _normalize_space(p.get_text())
    ]
    body = " ".join(paragraphs)
    body_preview = body[:500] if body else ""

    return {
        "title": title,
        "date": date_text,
        "body_preview": body_preview,
        "source_url": url,
    }


def fetch_beacukai_news(limit: int = 3, timeout_s: float = 12.0) -> List[Dict[str, Any]]:
    with httpx.Client(timeout=timeout_s, follow_redirects=True) as client:
        listing = client.get(BEACUKAI_NEWS_URL)
        listing.raise_for_status()

        links = _extract_article_links(listing.text, limit=limit)
        results: List[Dict[str, Any]] = []

        for url in links:
            try:
                res = client.get(url)
                res.raise_for_status()
                results.append(_extract_article_payload(res.text, url))
            except Exception:
                continue

    return results


def load_mock_alerts(mock_file: Path, limit: int = 3) -> List[Dict[str, Any]]:
    content = mock_file.read_text(encoding="utf-8")
    blocks = [block.strip() for block in re.split(r"\n\s*\n", content) if block.strip()]

    payload: List[Dict[str, Any]] = []
    for i, block in enumerate(blocks[:limit], start=1):
        payload.append(
            {
                "title": f"Mock Alert {i}",
                "date": "Mock",
                "body_preview": _normalize_space(block)[:500],
                "source_url": str(mock_file),
            }
        )

    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Beacukai news with fallback to mock data")
    parser.add_argument("--limit", type=int, default=3, help="Maximum number of alerts")
    parser.add_argument(
        "--fallback",
        default=None,
        help="Optional path to mock news text file",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[3]
    fallback_file = (
        Path(args.fallback).resolve()
        if args.fallback
        else repo_root / "data" / "customs_news_mock.txt"
    )

    try:
        data = fetch_beacukai_news(limit=args.limit)
        if not data:
            raise RuntimeError("No live articles extracted")
        result = {"source": "live", "count": len(data), "items": data}
    except Exception:
        fallback_items = load_mock_alerts(fallback_file, limit=args.limit)
        result = {"source": "mock", "count": len(fallback_items), "items": fallback_items}

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
