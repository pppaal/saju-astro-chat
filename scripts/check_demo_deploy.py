#!/usr/bin/env python3
"""
Evidence-based production deploy checker for demo routes.

Exit codes:
  0 = DEPLOYED
  1 = NOT_DEPLOYED
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple

import requests


DEFAULT_BASE_URL = "https://destinypal.com"
DEFAULT_EXPECTED_COMMIT = "185f208c4"


@dataclass
class EvidenceRow:
    check: str
    url: str
    method: str
    status: Optional[int]
    content_type: str
    x_matched_path: str
    not_found_hint: bool
    key_fields_present: str
    detected_release: str
    x_vercel_id: str
    pass_fail: str
    note: str


def _mask_token(token: str) -> str:
    if not token:
        return "<missing>"
    if len(token) <= 8:
        return "***"
    return f"{token[:3]}***{token[-3:]}"


def _extract_release_from_headers(headers: Dict[str, str]) -> Optional[str]:
    # Some deployments include sentry release hints inside baggage.
    baggage = headers.get("baggage", "")
    if baggage:
        # Examples:
        # sentry-release=abc
        # sentry-release%3Dabc
        m = re.search(r"sentry-release=([^,;]+)", baggage)
        if m:
            return m.group(1).strip()
        m = re.search(r"sentry-release%3D([^,;]+)", baggage)
        if m:
            return m.group(1).strip()

    # Custom header variants (if present)
    for k in ("sentry-release", "x-sentry-release"):
        if headers.get(k):
            return headers[k].strip()
    return None


def _extract_release_from_html(html: str) -> Optional[str]:
    # Very defensive, only best-effort.
    patterns = [
        r"sentry-release[\"'=:\s]+([A-Za-z0-9._\-+/]+)",
        r"release[\"'=:\s]+([a-f0-9]{7,40})",
    ]
    for pat in patterns:
        m = re.search(pat, html, flags=re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _has_not_found_signal(
    status: Optional[int], headers: Dict[str, str], body_text: str
) -> bool:
    matched = headers.get("x-matched-path", "")
    if matched == "/_not-found":
        return True
    if status == 404:
        return True
    lowered = body_text.lower()
    if "page not found" in lowered or "not found" in lowered:
        return True
    return False


def _ct(headers: Dict[str, str]) -> str:
    return headers.get("content-type", "")


def _bool_str(v: bool) -> str:
    return "yes" if v else "no"


def _print_table(rows: List[EvidenceRow]) -> None:
    headers = [
        "check",
        "method",
        "status",
        "content_type",
        "x_matched_path",
        "key_fields_present",
        "detected_release",
        "pass_fail",
    ]
    data = []
    for r in rows:
        data.append(
            [
                r.check,
                r.method,
                str(r.status) if r.status is not None else "ERR",
                r.content_type or "-",
                r.x_matched_path or "-",
                r.key_fields_present or "-",
                r.detected_release or "-",
                r.pass_fail,
            ]
        )

    widths = [len(h) for h in headers]
    for row in data:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len(val))

    def fmt(vals: List[str]) -> str:
        return " | ".join(v.ljust(widths[i]) for i, v in enumerate(vals))

    sep = "-+-".join("-" * w for w in widths)
    print(fmt(headers))
    print(sep)
    for row in data:
        print(fmt(row))


def _request_json(
    session: requests.Session, url: str, token: str
) -> Tuple[Optional[requests.Response], Optional[dict], str]:
    try:
        res = session.get(url, headers={"x-demo-token": token}, timeout=20)
        payload = None
        note = ""
        if "application/json" in _ct(res.headers):
            try:
                payload = res.json()
            except Exception:
                note = "json_parse_failed"
        return res, payload, note
    except Exception as exc:
        return None, None, f"request_error:{exc.__class__.__name__}"


def _request_text(
    session: requests.Session, url: str, token: str
) -> Tuple[Optional[requests.Response], str, str]:
    try:
        res = session.get(url, headers={"x-demo-token": token}, timeout=20)
        text = res.text[:200000]
        return res, text, ""
    except Exception as exc:
        return None, "", f"request_error:{exc.__class__.__name__}"


def _request_pdf_head_or_get(
    session: requests.Session, url: str, token: str
) -> Tuple[str, Optional[requests.Response], str]:
    try:
        res = session.head(url, headers={"x-demo-token": token}, timeout=20, allow_redirects=True)
        if res.status_code == 405:
            # Some infra blocks HEAD. Fallback to lightweight GET.
            res = session.get(
                url,
                headers={"x-demo-token": token, "Range": "bytes=0-1024"},
                timeout=20,
                stream=True,
                allow_redirects=True,
            )
            return "GET(range)", res, "head_405_fallback_get"
        return "HEAD", res, ""
    except Exception as exc:
        return "HEAD", None, f"request_error:{exc.__class__.__name__}"


def main() -> int:
    base_url = os.environ.get("PROD_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    token = os.environ.get("DEMO_TOKEN", "").strip()
    expected_commit = os.environ.get("EXPECTED_COMMIT", DEFAULT_EXPECTED_COMMIT).strip()
    expected_sentry_release = os.environ.get("EXPECTED_SENTRY_RELEASE", "").strip()

    ts = str(int(time.time() * 1000))
    masked = _mask_token(token)

    print(f"PROD_BASE_URL={base_url}")
    print(f"EXPECTED_COMMIT={expected_commit}")
    if expected_sentry_release:
        print("EXPECTED_SENTRY_RELEASE=set")
    else:
        print("EXPECTED_SENTRY_RELEASE=not_set")
    print(f"DEMO_TOKEN(masked)={masked}")

    if not token:
        print("Conclusion: NOT_DEPLOYED")
        print("Reason: DEMO_TOKEN env is missing in checker runtime.")
        return 1

    session = requests.Session()
    rows: List[EvidenceRow] = []
    all_releases: List[str] = []

    # 1) Health check
    health_url = f"{base_url}/api/demo/_health?token={token}&t={ts}"
    r, payload, note = _request_json(session, health_url, token)
    if r is None:
        rows.append(
            EvidenceRow(
                check="health_api",
                url=f"{base_url}/api/demo/_health?...",
                method="GET",
                status=None,
                content_type="",
                x_matched_path="",
                not_found_hint=True,
                key_fields_present="no",
                detected_release="",
                x_vercel_id="",
                pass_fail="FAIL",
                note=note,
            )
        )
    else:
        headers = {k.lower(): v for k, v in r.headers.items()}
        rel = _extract_release_from_headers(headers)
        if rel:
            all_releases.append(rel)
        fields_ok = isinstance(payload, dict) and all(
            k in payload for k in ("demoTokenPresent", "runtime", "now")
        )
        nf = _has_not_found_signal(r.status_code, headers, r.text)
        ok = (
            r.status_code == 200
            and "application/json" in _ct(headers)
            and fields_ok
            and not nf
        )
        rows.append(
            EvidenceRow(
                check="health_api",
                url=f"{base_url}/api/demo/_health?...",
                method="GET",
                status=r.status_code,
                content_type=_ct(headers),
                x_matched_path=headers.get("x-matched-path", ""),
                not_found_hint=nf,
                key_fields_present=_bool_str(fields_ok),
                detected_release=rel or "",
                x_vercel_id=headers.get("x-vercel-id", ""),
                pass_fail="PASS" if ok else "FAIL",
                note=note,
            )
        )

    # 2) Demo page check
    page_url = f"{base_url}/demo/icp?token={token}&t={ts}"
    r, text, note = _request_text(session, page_url, token)
    if r is None:
        rows.append(
            EvidenceRow(
                check="demo_icp_page",
                url=f"{base_url}/demo/icp?...",
                method="GET",
                status=None,
                content_type="",
                x_matched_path="",
                not_found_hint=True,
                key_fields_present="no",
                detected_release="",
                x_vercel_id="",
                pass_fail="FAIL",
                note=note,
            )
        )
    else:
        headers = {k.lower(): v for k, v in r.headers.items()}
        rel = _extract_release_from_headers(headers) or _extract_release_from_html(text)
        if rel:
            all_releases.append(rel)
        marker_ok = any(m in text for m in ("ICP Demo Review", "User: Paul", "Reviewer mode"))
        nf = _has_not_found_signal(r.status_code, headers, text)
        ok = r.status_code == 200 and "text/html" in _ct(headers) and marker_ok and not nf
        rows.append(
            EvidenceRow(
                check="demo_icp_page",
                url=f"{base_url}/demo/icp?...",
                method="GET",
                status=r.status_code,
                content_type=_ct(headers),
                x_matched_path=headers.get("x-matched-path", ""),
                not_found_hint=nf,
                key_fields_present=_bool_str(marker_ok),
                detected_release=rel or "",
                x_vercel_id=headers.get("x-vercel-id", ""),
                pass_fail="PASS" if ok else "FAIL",
                note=note,
            )
        )

    # 3) PDF endpoint check
    pdf_url = f"{base_url}/demo/combined.pdf?token={token}&t={ts}"
    method_used, r, note = _request_pdf_head_or_get(session, pdf_url, token)
    if r is None:
        rows.append(
            EvidenceRow(
                check="demo_combined_pdf",
                url=f"{base_url}/demo/combined.pdf?...",
                method=method_used,
                status=None,
                content_type="",
                x_matched_path="",
                not_found_hint=True,
                key_fields_present="no",
                detected_release="",
                x_vercel_id="",
                pass_fail="FAIL",
                note=note,
            )
        )
    else:
        headers = {k.lower(): v for k, v in r.headers.items()}
        rel = _extract_release_from_headers(headers)
        if rel:
            all_releases.append(rel)
        content_type = _ct(headers)
        cd = headers.get("content-disposition", "")
        pdf_like = ("application/pdf" in content_type) or (
            "application/octet-stream" in content_type and "pdf" in cd.lower()
        )
        body_hint = ""
        try:
            if not pdf_like and method_used != "HEAD":
                body_hint = (r.text or "")[:1000]
        except Exception:
            body_hint = ""
        nf = _has_not_found_signal(r.status_code, headers, body_hint)
        ok = r.status_code == 200 and pdf_like and not nf
        rows.append(
            EvidenceRow(
                check="demo_combined_pdf",
                url=f"{base_url}/demo/combined.pdf?...",
                method=method_used,
                status=r.status_code,
                content_type=content_type,
                x_matched_path=headers.get("x-matched-path", ""),
                not_found_hint=nf,
                key_fields_present=_bool_str(pdf_like),
                detected_release=rel or "",
                x_vercel_id=headers.get("x-vercel-id", ""),
                pass_fail="PASS" if ok else "FAIL",
                note=note,
            )
        )

    # 4) commit/release evidence
    detected_release = ""
    if all_releases:
        # Keep first non-empty, deterministic enough for report
        detected_release = next((r for r in all_releases if r), "")

    commit_judgement = "unknown"
    if detected_release:
        if expected_sentry_release:
            commit_judgement = (
                "match" if detected_release == expected_sentry_release else "mismatch"
            )
        else:
            # Best effort: direct hash fragment comparison
            commit_judgement = (
                "match"
                if expected_commit and expected_commit in detected_release
                else "mismatch_or_not_exposed"
            )

    all_pass = all(r.pass_fail == "PASS" for r in rows)
    conclusion = "DEPLOYED" if all_pass else "NOT_DEPLOYED"

    print("\nEvidence:")
    _print_table(rows)

    print("\nRelease Evidence:")
    print(json.dumps(
        {
            "detected_release": detected_release or None,
            "expected_commit": expected_commit,
            "expected_sentry_release_set": bool(expected_sentry_release),
            "commit_judgement": commit_judgement,
        },
        ensure_ascii=False,
        indent=2,
    ))

    print(f"\nConclusion: {conclusion}")
    return 0 if conclusion == "DEPLOYED" else 1


if __name__ == "__main__":
    sys.exit(main())
