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
            parts.append(f"  • Dominant element: {dom}")
        if weak:
            parts.append(f"  • Weakest element: {weak}")
        ang = astro_meta.get("angular_planets") or []
        if ang:
            ang_str = ", ".join(f"{p}@H{h}" for p, h in ang[:4])
            parts.append(f"  • Angular planets: {ang_str}")
        if "benefics_on_angles" in astro_meta or "malefics_on_angles" in astro_meta:
            parts.append(
                f"  • Benefics@angles: {astro_meta.get('benefics_on_angles', 0)}, "
                f"Malefics@angles: {astro_meta.get('malefics_on_angles', 0)}"
            )
        el_counts = astro_meta.get("element_counts") or {}
        if el_counts:
            parts.append(
                "  • Element counts: "
                + ", ".join(f"{k}:{v}" for k, v in sorted(el_counts.items()))
            )

    saju_meta = (signals.get("saju") or {}).get("meta") or {}
    if saju_meta:
        parts.append("[Saju signal highlights]")
        if saju_meta.get("dominant_element"):
            parts.append(f"  • Dominant element: {saju_meta['dominant_element']}")
        if saju_meta.get("lucky_element"):
            parts.append(f"  • Balancing element: {saju_meta['lucky_element']}")
        fe_counts = saju_meta.get("five_element_counts") or {}
        if fe_counts:
            parts.append(
                "  • Five-element counts: "
                + ", ".join(f"{k}:{v}" for k, v in sorted(fe_counts.items()))
            )

    return "\n".join(parts)
