"""Formatting helpers for derived signals."""


def summarize_signals(signals: dict) -> str:
    """Human-friendly summary of key derived signals for LLM context."""
    parts = []

    astro_meta = (signals.get("astro") or {}).get("meta") or {}
    if astro_meta:
        parts.append("[Astro signal highlights]")
        dom = astro_meta.get("dominant_element")
        weak = astro_meta.get("weakest_element")
        if dom:
            parts.append(f"  - Dominant element: {dom}")
        if weak:
            parts.append(f"  - Weakest element: {weak}")
        ang = astro_meta.get("angular_planets") or []
        if ang:
            ang_str = ", ".join(f"{p}@H{h}" for p, h in ang[:4])
            parts.append(f"  - Angular planets: {ang_str}")
        if "benefics_on_angles" in astro_meta or "malefics_on_angles" in astro_meta:
            parts.append(
                f"  - Benefics@angles: {astro_meta.get('benefics_on_angles', 0)}, "
                f"Malefics@angles: {astro_meta.get('malefics_on_angles', 0)}"
            )
        el_counts = astro_meta.get("element_counts") or {}
        if el_counts:
            parts.append(
                "  - Element counts: "
                + ", ".join(f"{k}:{v}" for k, v in sorted(el_counts.items()))
            )

    saju_meta = (signals.get("saju") or {}).get("meta") or {}
    if saju_meta:
        parts.append("[Saju signal highlights]")
        if saju_meta.get("dominant_element"):
            parts.append(f"  - Dominant element: {saju_meta['dominant_element']}")
        if saju_meta.get("lucky_element"):
            parts.append(f"  - Balancing element: {saju_meta['lucky_element']}")
        fe_counts = saju_meta.get("five_element_counts") or {}
        if fe_counts:
            parts.append(
                "  - Five-element counts: "
                + ", ".join(f"{k}:{v}" for k, v in sorted(fe_counts.items()))
            )

    return "\n".join(parts)


def summarize_cross_signals(signals: dict) -> str:
    """Cross-highlight between saju and astrology to surface overlaps and gaps."""
    astro_meta = (signals.get("astro") or {}).get("meta") or {}
    saju_meta = (signals.get("saju") or {}).get("meta") or {}

    parts = []

    # Element themes
    saju_dom = saju_meta.get("dominant_element")
    astro_dom = astro_meta.get("dominant_element")
    saju_lucky = saju_meta.get("lucky_element")
    astro_weak = astro_meta.get("weakest_element")
    day_master = saju_meta.get("day_master")

    if day_master:
        parts.append(f"- Day Master: {day_master}")
    if saju_dom:
        parts.append(f"- Saju dominant element: {saju_dom}")
    if saju_lucky:
        parts.append(f"- Saju balancing element: {saju_lucky}")
    if astro_dom:
        parts.append(f"- Astro dominant element: {astro_dom}")
    if astro_weak:
        parts.append(f"- Astro weakest element: {astro_weak}")

    # Cross-element interactions
    if saju_dom and astro_dom and saju_dom == astro_dom:
        parts.append("- Both systems emphasize the same element (reinforced theme).")
    if saju_lucky and astro_dom and saju_lucky == astro_dom:
        parts.append("- Astro dominance already supplies the Saju balancing element.")
    if saju_lucky and astro_weak and saju_lucky == astro_weak:
        parts.append("- Astro lacks the Saju balancing element; prioritize remedies.")

    # Counts / angular planets for quick scanning
    fe_counts = saju_meta.get("five_element_counts") or {}
    if fe_counts:
        parts.append(
            "- Saju five-element counts: "
            + ", ".join(f"{k}:{v}" for k, v in sorted(fe_counts.items()))
        )
    el_counts = astro_meta.get("element_counts") or {}
    if el_counts:
        parts.append(
            "- Astro element counts: "
            + ", ".join(f"{k}:{v}" for k, v in sorted(el_counts.items()))
        )
    angular = astro_meta.get("angular_planets") or []
    if angular:
        ang_str = ", ".join(f"{p}@H{h}" for p, h in angular[:4])
        parts.append(f"- Angular planets (visibility/leverage): {ang_str}")

    return "\n".join(parts)
