#!/usr/bin/env python3
"""
Backfill missing (card_id, orientation, domain) tarot facets from coverage report.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple

from tarot_pipeline_utils import DEFAULT_CORPUS_PATH, load_jsonl_records, make_doc_id


DOMAIN_CONTEXT = {
    "love": {
        "focus": "관계의 감정 흐름과 상호 신뢰",
        "action": "감정을 단정하지 말고 대화를 한 번 더 열어보세요",
        "caution": "서두른 해석은 오해를 키울 수 있으니 신호를 확인하세요",
    },
    "career": {
        "focus": "업무 우선순위와 실무 실행력",
        "action": "할 일을 작은 단위로 쪼개고 마감 기준을 분명히 하세요",
        "caution": "성과를 급하게 증명하려다 핵심 품질을 놓치지 않도록 주의하세요",
    },
    "money": {
        "focus": "현금흐름 안정과 리스크 관리",
        "action": "지출 항목을 분류해 고정비부터 조정하고 결정은 단계적으로 진행하세요",
        "caution": "단기 수익 기대에 흔들리면 손실 변동성이 커질 수 있습니다",
    },
    "general": {
        "focus": "일상 리듬과 심리적 균형",
        "action": "이번 주 핵심 목표 하나를 정하고 반복 패턴을 관찰해 조정하세요",
        "caution": "과잉해석보다 사실 확인을 먼저 해야 흐름을 안정시킬 수 있습니다",
    },
}

ORIENTATION_TONE = {
    "upright": {
        "state": "에너지가 비교적 정돈되어 방향이 보이는 상태",
        "core": "강점을 실행으로 연결하면 결과가 빠르게 가시화될 가능성이 큽니다",
    },
    "reversed": {
        "state": "에너지가 뒤엉켜 우선순위가 흐려진 상태",
        "core": "속도를 낮추고 막힌 지점을 정리하면 손실을 줄이며 방향을 회복할 수 있습니다",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill missing tarot facets from coverage report")
    parser.add_argument("--corpus-path", default=str(DEFAULT_CORPUS_PATH))
    parser.add_argument("--coverage-report-path", default="artifacts/coverage_report.json")
    parser.add_argument("--output-path", default="backend_ai/data/tarot_corpus/tarot_corpus_v1_1.jsonl")
    parser.add_argument(
        "--complete-interpretations-path",
        default="backend_ai/data/graph/rules/tarot/complete_interpretations.json",
    )
    parser.add_argument("--version", default="v1.1")
    return parser.parse_args()


def _load_missing(path: Path) -> List[Dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [m for m in data.get("missing_combos", []) if isinstance(m, dict)]


def _extract_keywords(text: str) -> str:
    marker = "Keywords:"
    if marker in text:
        tail = text.split(marker, 1)[1].strip()
        return tail[:120]
    return ""


def _build_card_index(records: List[Dict]) -> Dict[str, Dict]:
    idx: Dict[str, Dict] = {}
    for row in records:
        if str(row.get("doc_type") or "") != "card":
            continue
        cid = str(row.get("card_id") or "").strip()
        if not cid or cid.startswith("combo:"):
            continue
        if cid in idx:
            continue
        idx[cid] = {
            "card_name": str(row.get("card_name") or cid).strip(),
            "keywords": _extract_keywords(str(row.get("text") or "")),
        }
    return idx


def _load_complete_interpretations(path: Path) -> Dict[str, Dict]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    cards: Dict[str, Dict] = {}
    for section in ("major_arcana", "minor_arcana"):
        for row in data.get(section, []):
            cid = str(row.get("id") or "").strip()
            if cid:
                cards[cid] = row
    return cards


def _build_text(
    card_id: str,
    card_name: str,
    orientation: str,
    domain: str,
    keywords: str,
    base_meaning: str,
    base_advice: str,
) -> str:
    d = DOMAIN_CONTEXT[domain]
    o = ORIENTATION_TONE[orientation]
    meaning = (base_meaning or "").strip()
    advice = (base_advice or "").strip()
    # 7-sentence template: summary + core(3) + advice(2) + caution(1)
    # Keep concise (<300 chars) to avoid synthetic long-text duplication in audit.
    text = (
        f"Card: {card_name} ({card_id}) | Orientation: {orientation} | Domain: {domain} | "
        f"Summary: {d['focus']} 축에서 {o['state']}로 읽힙니다. "
        f"Core: {meaning if meaning else o['core']}. "
        f"Core: {o['core']}. "
        f"Core: {('키워드 ' + keywords + '를 기준으로') if keywords else '카드 상징을 기준으로'} 우선순위를 재정렬하세요. "
        f"Advice: {advice if advice else d['action']}. "
        f"Advice: {d['action']}. "
        f"Advice: 실행 후 하루 단위로 변화를 점검하세요. "
        f"Caution: {d['caution']}."
    )
    if len(text) > 285:
        text = text[:282].rstrip() + "..."
    return text


def main() -> int:
    args = parse_args()
    corpus_path = Path(args.corpus_path)
    coverage_path = Path(args.coverage_report_path)
    output_path = Path(args.output_path)
    ci_path = Path(args.complete_interpretations_path)

    records = load_jsonl_records(corpus_path)
    missing = _load_missing(coverage_path)
    card_idx = _build_card_index(records)
    ci_cards = _load_complete_interpretations(ci_path) if ci_path.exists() else {}

    existing_keys: Set[Tuple[str, str, str]] = set()
    existing_doc_ids: Set[str] = set()
    for row in records:
        if str(row.get("doc_type") or "") != "card":
            continue
        cid = str(row.get("card_id") or "").strip()
        ori = str(row.get("orientation") or "").strip().lower()
        dom = str(row.get("domain") or "").strip().lower()
        if cid and ori and dom:
            existing_keys.add((cid, ori, dom))
        did = str(row.get("doc_id") or "").strip()
        if did:
            existing_doc_ids.add(did)

    backfilled: List[Dict] = []
    for miss in missing:
        card_id = str(miss.get("card_id") or "").strip()
        orientation = str(miss.get("orientation") or "").strip().lower()
        domain = str(miss.get("domain") or "").strip().lower()
        key = (card_id, orientation, domain)
        if not card_id or orientation not in ORIENTATION_TONE or domain not in DOMAIN_CONTEXT:
            continue
        if key in existing_keys:
            continue

        info = card_idx.get(card_id, {"card_name": card_id, "keywords": ""})
        ci = ci_cards.get(card_id, {})
        ori_key = "upright" if orientation == "upright" else "reversed"
        ori_block = ci.get(ori_key, {}) if isinstance(ci.get(ori_key, {}), dict) else {}
        base_meaning = str(ori_block.get(domain) or ori_block.get("general") or "").strip()
        base_advice = str(ori_block.get("advice") or "").strip()
        if not info.get("keywords"):
            kw = ci.get("keywords")
            if isinstance(kw, list):
                info["keywords"] = ", ".join(str(x) for x in kw[:5] if str(x).strip())
        if info.get("card_name") == card_id and ci.get("name"):
            info["card_name"] = str(ci.get("name"))

        doc_id = make_doc_id(card_id, orientation, domain, "", args.version)
        if doc_id in existing_doc_ids:
            continue

        row = {
            "doc_id": doc_id,
            "doc_type": "card",
            "card_id": card_id,
            "card_name": info["card_name"],
            "orientation": orientation,
            "domain": domain,
            "position": "",
            "source": "auto_backfill_from_coverage",
            "version": args.version,
            "auto_generated": True,
            "text": _build_text(
                card_id=card_id,
                card_name=info["card_name"],
                orientation=orientation,
                domain=domain,
                keywords=info.get("keywords", ""),
                base_meaning=base_meaning,
                base_advice=base_advice,
            ),
            "tags": [domain, orientation, "auto_generated"],
        }
        backfilled.append(row)
        existing_doc_ids.add(doc_id)
        existing_keys.add(key)

    merged = list(records) + backfilled
    merged.sort(key=lambda r: str(r.get("doc_id") or ""))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="\n") as f:
        for row in merged:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"[backfill] input_records={len(records)}")
    print(f"[backfill] missing_requested={len(missing)}")
    print(f"[backfill] backfilled={len(backfilled)}")
    print(f"[backfill] output_records={len(merged)}")
    print(f"[backfill] wrote: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
