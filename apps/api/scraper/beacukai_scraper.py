import argparse
import json
import re
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List

import httpx

try:
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover
    BeautifulSoup = None

BEACUKAI_NEWS_URL = "https://www.beacukai.go.id/berita"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
}
GOOGLE_NEWS_QUERY = "site:beacukai.go.id/berita bea cukai"


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _strip_html(value: str) -> str:
    return _normalize_space(re.sub(r"<[^>]+>", " ", value or ""))


def _extract_article_links(html: str, limit: int) -> List[str]:
    urls: List[str] = []

    if BeautifulSoup is not None:
        soup = BeautifulSoup(html, "html.parser")
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

    # Lightweight fallback when bs4 is unavailable.
    for href in re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.IGNORECASE):
        href = href.strip()
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
    if BeautifulSoup is not None:
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
    else:
        title_match = re.search(r"<h1[^>]*>(.*?)</h1>|<h2[^>]*>(.*?)</h2>", html, flags=re.IGNORECASE | re.DOTALL)
        title = _normalize_space(next((group for group in title_match.groups() if group), "Untitled")) if title_match else "Untitled"
        time_match = re.search(r"<time[^>]*>(.*?)</time>", html, flags=re.IGNORECASE | re.DOTALL)
        date_text = _normalize_space(time_match.group(1)) if time_match else "Unknown"
        paragraphs = [
            _normalize_space(re.sub(r"<[^>]+>", " ", match))
            for match in re.findall(r"<p[^>]*>(.*?)</p>", html, flags=re.IGNORECASE | re.DOTALL)
            if _normalize_space(re.sub(r"<[^>]+>", " ", match))
        ]
        body = " ".join(paragraphs)
        body_preview = body[:500] if body else ""

    return {
        "title": title,
        "date": date_text,
        "body_preview": body_preview,
        "source_url": url,
    }


def fetch_google_news_official(limit: int = 3, timeout_s: float = 12.0) -> List[Dict[str, Any]]:
    rss_url = (
        "https://news.google.com/rss/search?"
        + urllib.parse.urlencode(
            {
                "q": GOOGLE_NEWS_QUERY,
                "hl": "id",
                "gl": "ID",
                "ceid": "ID:id",
            }
        )
    )

    with httpx.Client(timeout=timeout_s, follow_redirects=True, trust_env=False, headers=DEFAULT_HEADERS) as client:
        response = client.get(rss_url)
        response.raise_for_status()

    root = ET.fromstring(response.text)
    channel = root.find("channel")
    if channel is None:
        return []

    items: List[Dict[str, Any]] = []
    for item in channel.findall("item")[:limit]:
        title = _normalize_space(item.findtext("title") or "Untitled")
        description = _strip_html(item.findtext("description") or "")
        source_url = _normalize_space(item.findtext("link") or "https://news.google.com")
        pub_date = _normalize_space(item.findtext("pubDate") or "")

        if title:
            items.append(
                {
                    "title": title,
                    "date": pub_date,
                    "body_preview": description or title,
                    "source_url": source_url,
                }
            )

    return items


def fetch_beacukai_news(limit: int = 3, timeout_s: float = 12.0) -> List[Dict[str, Any]]:
    with httpx.Client(timeout=timeout_s, follow_redirects=True, trust_env=False, headers=DEFAULT_HEADERS) as client:
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

    if not results:
        return fetch_google_news_official(limit=limit, timeout_s=timeout_s)

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
