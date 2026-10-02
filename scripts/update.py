#!/usr/bin/env python3
"""
IPTV Auto Aggregator - Final Version
Features:
  - Unlimited public M3U / JSON sources
  - Health checking (working streams only)
  - Deduplication
  - Country / Category filters
  - Clean M3U + JSON output
  - Detailed logging
  - GitHub Pages ready
"""

import os
import sys
import re
import json
import time
import logging
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
import yaml
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# -------------------------------------------------
# Paths
# -------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
SOURCES_FILE = BASE_DIR / "sources.yaml"
PLAYLISTS_DIR = BASE_DIR / "playlists"
PLAYLISTS_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------
# Logging
# -------------------------------------------------
def setup_logger(log_file: Path):
    logger = logging.getLogger("iptv-auto")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    fh = logging.FileHandler(log_file, encoding="utf-8", mode="w")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    return logger


# -------------------------------------------------
# HTTP Session
# -------------------------------------------------
def create_session():
    session = requests.Session()
    retry = Retry(total=2, backoff_factor=0.4, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry, pool_connections=60, pool_maxsize=60)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({
        "User-Agent": "IPTV-Auto-Aggregator/2.0",
        "Accept": "*/*",
    })
    return session


SESSION = create_session()


# -------------------------------------------------
# Parse M3U
# -------------------------------------------------
def parse_m3u(content: str, source_name: str):
    channels = []
    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("#EXTINF:"):
            info = line[8:]
            attrs = {}
            name = info
            if "," in info:
                attr_part, name = info.rsplit(",", 1)
                name = name.strip()
                for m in re.finditer(r'([\w-]+)="([^"]*)"', attr_part):
                    attrs[m.group(1).lower()] = m.group(2)

            i += 1
            while i < len(lines) and (not lines[i].strip() or lines[i].strip().startswith("#")):
                i += 1
            if i < len(lines):
                url = lines[i].strip()
                if url and not url.startswith("#"):
                    channels.append({
                        "name": name or "Unknown",
                        "url": url,
                        "logo": attrs.get("tvg-logo") or attrs.get("logo"),
                        "group": attrs.get("group-title") or attrs.get("group") or "Ungrouped",
                        "tvg_id": attrs.get("tvg-id"),
                        "tvg_name": attrs.get("tvg-name"),
                        "country": attrs.get("tvg-country") or attrs.get("country"),
                        "language": attrs.get("tvg-language") or attrs.get("language"),
                        "source": source_name,
                    })
        i += 1
    return channels


# -------------------------------------------------
# Fetch one source
# -------------------------------------------------
def fetch_source(source: dict, logger):
    name = source.get("name", "Unknown")
    url = source.get("url")
    stype = (source.get("type") or "m3u").lower()
    enabled = source.get("enabled", True)

    if not enabled:
        logger.info(f"SKIP  | {name} (disabled)")
        return []
    if not url:
        logger.warning(f"SKIP  | {name} (no url)")
        return []

    logger.info(f"FETCH | {name}")
    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
        content = resp.text

        if stype == "m3u":
            channels = parse_m3u(content, name)
        elif stype == "json":
            data = resp.json()
            items = data if isinstance(data, list) else data.get("channels", data.get("streams", []))
            channels = []
            for item in items:
                u = item.get("url") or item.get("stream_url") or item.get("stream")
                if not u:
                    continue
                channels.append({
                    "name": item.get("name") or item.get("title") or "Unknown",
                    "url": u,
                    "logo": item.get("logo") or item.get("tvg_logo"),
                    "group": item.get("group") or item.get("category") or item.get("group-title") or "Ungrouped",
                    "tvg_id": item.get("tvg_id") or item.get("id"),
                    "country": item.get("country"),
                    "language": item.get("language"),
                    "source": name,
                })
        else:
            logger.warning(f"SKIP  | {name} (unknown type: {stype})")
            return []

        logger.info(f"OK    | {name} → {len(channels)} channels")
        return channels

    except Exception as e:
        logger.error(f"FAIL  | {name} → {e}")
        return []


# -------------------------------------------------
# Health check
# -------------------------------------------------
def check_stream(channel: dict, timeout: int = 6):
    url = channel.get("url")
    if not url:
        return False
    try:
        resp = SESSION.head(url, timeout=timeout, allow_redirects=True)
        if resp.status_code == 405:
            resp = SESSION.get(url, timeout=timeout, stream=True, headers={"Range": "bytes=0-512"})
        return resp.status_code in (200, 206)
    except Exception:
        return False


def health_check(channels: list, workers: int, timeout: int, logger):
    if not channels:
        return []
    logger.info(f"HEALTH| Checking {len(channels)} streams ({workers} workers, {timeout}s timeout)")
    start = time.time()
    results = []
    done = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(check_stream, ch, timeout): ch for ch in channels}
        for future in as_completed(futures):
            ch = futures[future]
            try:
                if future.result():
                    results.append(ch)
            except Exception:
                pass
            done += 1
            if done % 300 == 0 or done == len(channels):
                logger.info(f"HEALTH| Progress {done}/{len(channels)}")

    elapsed = time.time() - start
    logger.info(f"HEALTH| Finished → {len(results)} working / {len(channels)} total ({elapsed:.1f}s)")
    return results


# -------------------------------------------------
# Deduplicate
# -------------------------------------------------
def deduplicate(channels: list, logger):
    seen = set()
    unique = []
    for ch in channels:
        url = (ch.get("url") or "").strip().split("?")[0].rstrip("/")
        if url and url not in seen:
            seen.add(url)
            unique.append(ch)
    logger.info(f"DEDUP | {len(channels)} → {len(unique)} unique")
    return unique


# -------------------------------------------------
# Filters
# -------------------------------------------------
def apply_filters(channels: list, settings: dict, logger):
    countries = [c.upper() for c in (settings.get("preferred_countries") or [])]
    categories = [c.lower() for c in (settings.get("preferred_categories") or [])]
    https_only = settings.get("keep_only_https", False)

    # Bangla / BD / Indian keyword helpers when country tag is missing
    bangla_keywords = [
        "bangla", "bengali", "bangladesh", "bd ", " bd", "dhaka",
        "zee bangla", "star jalsha", "jalsha", "somoy", "independent tv",
        "channel i", "ntv", "rtv", "ekattor", "boishakhi", "mytv",
        "banglavision", "ananda", "colors bangla", "sun bangla",
        "zee sarthak", "star vijay", "indian", "kolkata"
    ]

    if not countries and not categories and not https_only:
        return channels

    filtered = []
    for ch in channels:
        if https_only and not (ch.get("url") or "").startswith("https://"):
            continue

        name = (ch.get("name") or "").lower()
        group = (ch.get("group") or "").lower()
        country = (ch.get("country") or "").upper()
        blob = f"{name} {group}"

        if countries:
            # Keep if country matches OR name/group looks Bangla/Indian
            country_ok = country in countries if country else False
            keyword_ok = any(k in blob for k in bangla_keywords)
            if not (country_ok or keyword_ok):
                # If country is set to something else (US/GB etc.) drop it
                if country and country not in countries:
                    continue
                # If no country and no keyword, drop when strict BD/IN mode
                if not country and not keyword_ok:
                    continue

        if categories:
            if group and not any(cat in group for cat in categories):
                continue

        filtered.append(ch)

    logger.info(f"FILTER| {len(channels)} → {len(filtered)}")
    return filtered


# -------------------------------------------------
# Writers
# -------------------------------------------------
def write_m3u(channels: list, path: Path, logger, title: str = "IPTV Auto"):
    lines = [
        "#EXTM3U",
        f"# Generated by IPTV Auto Aggregator",
        f"# Updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"# Channels: {len(channels)}",
        f"# Title: {title}",
    ]
    for ch in channels:
        attrs = []
        if ch.get("tvg_id"):
            attrs.append(f'tvg-id="{ch["tvg_id"]}"')
        if ch.get("logo"):
            attrs.append(f'tvg-logo="{ch["logo"]}"')
        if ch.get("group"):
            attrs.append(f'group-title="{ch["group"]}"')
        if ch.get("country"):
            attrs.append(f'tvg-country="{ch["country"]}"')
        if ch.get("language"):
            attrs.append(f'tvg-language="{ch["language"]}"')
        attr_str = " ".join(attrs)
        lines.append(f'#EXTINF:-1 {attr_str},{ch["name"]}')
        lines.append(ch["url"])

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    logger.info(f"WRITE | {path.name} → {len(channels)} channels")


def write_json(channels: list, path: Path, logger):
    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(channels),
        "channels": channels,
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"WRITE | {path.name} → {len(channels)} channels")


def write_status(total: int, online: int, sources_ok: int, sources_total: int, path: Path):
    status = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_channels": total,
        "online_channels": online,
        "sources_ok": sources_ok,
        "sources_total": sources_total,
    }
    path.write_text(json.dumps(status, indent=2), encoding="utf-8")


# -------------------------------------------------
# Main
# -------------------------------------------------
def main():
    if not SOURCES_FILE.exists():
        print(f"ERROR: {SOURCES_FILE} not found")
        sys.exit(1)

    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    sources = config.get("sources", [])
    settings = config.get("settings", {})

    log_file = BASE_DIR / settings.get("log_file", "playlists/update.log")
    logger = setup_logger(log_file)

    logger.info("=" * 60)
    logger.info("IPTV Auto Aggregator v2.0")
    logger.info(f"Sources configured: {len(sources)}")
    logger.info("=" * 60)

    # Fetch
    all_channels = []
    sources_ok = 0
    for src in sources:
        chs = fetch_source(src, logger)
        if chs:
            sources_ok += 1
        max_per = settings.get("max_channels_per_source", 3000)
        if len(chs) > max_per:
            logger.info(f"LIMIT | {src.get('name')} → first {max_per}")
            chs = chs[:max_per]
        all_channels.extend(chs)

    logger.info(f"TOTAL | Collected {len(all_channels)} channels from {sources_ok}/{len(sources)} sources")

    # Process
    if settings.get("remove_duplicates", True):
        all_channels = deduplicate(all_channels, logger)

    all_channels = apply_filters(all_channels, settings, logger)

    online_channels = all_channels
    if settings.get("health_check", True):
        online_channels = health_check(
            all_channels,
            workers=settings.get("health_workers", 40),
            timeout=settings.get("health_timeout", 6),
            logger=logger,
        )

    # Sort
    all_channels.sort(key=lambda x: ((x.get("group") or "").lower(), (x.get("name") or "").lower()))
    online_channels.sort(key=lambda x: ((x.get("group") or "").lower(), (x.get("name") or "").lower()))

    # Write
    out_m3u = BASE_DIR / settings.get("output_m3u", "playlists/playlist.m3u")
    out_online = BASE_DIR / settings.get("output_online_m3u", "playlists/online.m3u")
    out_json = BASE_DIR / settings.get("output_json", "playlists/channels.json")
    out_status = PLAYLISTS_DIR / "status.json"

    write_m3u(all_channels, out_m3u, logger, "All Channels")
    write_m3u(online_channels, out_online, logger, "Online Only")
    write_json(all_channels, out_json, logger)
    write_status(len(all_channels), len(online_channels), sources_ok, len(sources), out_status)

    logger.info("=" * 60)
    logger.info(f"DONE  | Total unique : {len(all_channels)}")
    logger.info(f"DONE  | Online       : {len(online_channels)}")
    logger.info(f"DONE  | Sources OK   : {sources_ok}/{len(sources)}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
