"""
Render fixed 10-page saju x astro life report PDFs.
"""

from __future__ import annotations

import textwrap
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple


try:
    import matplotlib.pyplot as plt
except Exception as exc:  # pragma: no cover - runtime dependency check
    raise RuntimeError("matplotlib is required for life report generation") from exc

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
except Exception as exc:  # pragma: no cover - runtime dependency check
    raise RuntimeError("reportlab is required for life report generation") from exc


@dataclass
class RenderAssets:
    cover: Path
    themes: Path
    cross: Path
    timeline: Path
    matrix_layers: Path


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def _draw_header_footer(c: canvas.Canvas, title: str, page: int) -> None:
    width, height = A4
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, height - 28, title)
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 40, 24, f"Page {page}/10")
    c.line(36, height - 34, width - 36, height - 34)
    c.line(36, 30, width - 36, 30)


def _draw_wrapped(c: canvas.Canvas, text: str, x: int, y: int, width_chars: int = 80, leading: int = 16) -> int:
    pos_y = y
    for para in text.splitlines():
        wrapped = textwrap.wrap(para, width=width_chars) if para.strip() else [""]
        for line in wrapped:
            c.drawString(x, pos_y, line)
            pos_y -= leading
    return pos_y


def _render_cover_image(path: Path, title: str) -> None:
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=180)
    ax.axis("off")
    grad = [[i / 100 for i in range(100)] for _ in range(100)]
    ax.imshow(grad, cmap="Blues", extent=(0, 1, 0, 1), aspect="auto")
    ax.text(0.5, 0.62, "Saju x Astro", ha="center", va="center", fontsize=26, color="white", weight="bold")
    ax.text(0.5, 0.46, "Life Report", ha="center", va="center", fontsize=22, color="white")
    ax.text(0.5, 0.28, title, ha="center", va="center", fontsize=12, color="white")
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def _render_theme_bar(path: Path, theme_scores: Dict[str, float]) -> None:
    items = sorted(theme_scores.items(), key=lambda x: x[1], reverse=True)[:6]
    if not items:
        items = [("general", 1.0)]
    labels = [k for k, _ in items]
    values = [v for _, v in items]
    fig, ax = plt.subplots(figsize=(7.8, 4.2), dpi=180)
    bars = ax.bar(labels, values, color="#4C78A8")
    ax.set_title("Top Themes")
    ax.set_ylabel("score")
    ax.set_ylim(0, max(values) * 1.2 if values else 1.0)
    ax.bar_label(bars, fmt="%.2f", padding=3)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def _render_cross_cards(path: Path, cross_cards: List[Dict]) -> None:
    cards = cross_cards[:3] if cross_cards else [{"theme": "general", "summary": "No cross insight", "saju": [], "astro": []}]
    fig, ax = plt.subplots(figsize=(7.8, 4.8), dpi=180)
    ax.axis("off")
    for i, card in enumerate(cards):
        y = 0.92 - (i * 0.31)
        rect = plt.Rectangle((0.04, y - 0.22), 0.92, 0.24, fill=False, linewidth=1.4, edgecolor="#4C78A8")
        ax.add_patch(rect)
        theme = _safe_text(card.get("theme")) or "general"
        summary = textwrap.shorten(_safe_text(card.get("summary")), width=110, placeholder="...")
        saju = ", ".join(card.get("saju", [])[:2]) or "none"
        astro = ", ".join(card.get("astro", [])[:2]) or "none"
        ax.text(0.06, y, f"[{i + 1}] {theme}", fontsize=10, weight="bold")
        ax.text(0.06, y - 0.07, summary, fontsize=9)
        ax.text(0.06, y - 0.14, f"Saju: {saju}", fontsize=8)
        ax.text(0.06, y - 0.20, f"Astro: {astro}", fontsize=8)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def _render_timeline(path: Path, timeline: List[Dict]) -> None:
    months = [str(item.get("month", idx + 1)) for idx, item in enumerate(timeline[:12])]
    scores = [float(item.get("score", 0.5)) for item in timeline[:12]]
    if not months:
        months = [str(i) for i in range(1, 13)]
        scores = [0.5] * 12
    fig, ax = plt.subplots(figsize=(7.8, 3.8), dpi=180)
    ax.plot(months, scores, marker="o", color="#F58518", linewidth=2)
    ax.fill_between(months, scores, alpha=0.2, color="#F58518")
    ax.set_ylim(0, max(scores) * 1.2 if scores else 1.0)
    ax.set_title("12-Month Timeline")
    ax.set_ylabel("intensity")
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def _render_matrix_layer_bar(path: Path, matrix_summary: Dict) -> None:
    top_layers = matrix_summary.get("top_layers", []) if isinstance(matrix_summary, dict) else []
    if not top_layers:
        top_layers = [{"layer": 1, "score": 0.0}]
    labels = [f"L{int(item.get('layer', 0))}" for item in top_layers[:3]]
    scores = [float(item.get("score", 0.0)) for item in top_layers[:3]]

    fig, ax = plt.subplots(figsize=(7.8, 3.4), dpi=180)
    bars = ax.bar(labels, scores, color=["#4C78A8", "#72B7B2", "#F58518"][: len(labels)])
    ax.set_title("Matrix Top Layers")
    ax.set_ylabel("score")
    ax.set_ylim(0, max(scores) * 1.2 if scores and max(scores) > 0 else 1.0)
    ax.bar_label(bars, fmt="%.2f", padding=3)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def create_assets(payload: Dict, assets_dir: Path) -> RenderAssets:
    assets_dir.mkdir(parents=True, exist_ok=True)
    cover = assets_dir / "cover.png"
    themes = assets_dir / "themes_bar.png"
    cross = assets_dir / "cross_cards.png"
    timeline = assets_dir / "timeline.png"
    matrix_layers = assets_dir / "matrix_layers.png"
    _render_cover_image(cover, _safe_text(payload.get("tagline")))
    _render_theme_bar(themes, payload.get("theme_scores", {}))
    _render_cross_cards(cross, payload.get("cross_cards", []))
    _render_timeline(timeline, payload.get("timeline", []))
    _render_matrix_layer_bar(matrix_layers, payload.get("destiny_matrix_summary", {}))
    return RenderAssets(cover=cover, themes=themes, cross=cross, timeline=timeline, matrix_layers=matrix_layers)


def _page_title(payload: Dict) -> str:
    name = _safe_text(payload.get("user_name")) or "Client"
    return f"{name} - Saju x Astro Life Report"


def render_life_report_pdf(payload: Dict, out_pdf: Path, assets: RenderAssets) -> None:
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(out_pdf), pagesize=A4)
    width, height = A4
    title = _page_title(payload)
    today = _safe_text(payload.get("generated_at")) or datetime.now().strftime("%Y-%m-%d")

    # Page 1 Cover
    _draw_header_footer(c, title, 1)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(40, height - 90, "10-Page Life Consultation Report")
    c.setFont("Helvetica", 13)
    c.drawString(40, height - 120, f"Name: {_safe_text(payload.get('user_name')) or 'Unknown'}")
    c.drawString(40, height - 142, f"Date: {today}")
    c.drawString(40, height - 164, f"Tagline: {_safe_text(payload.get('tagline'))}")
    c.drawImage(ImageReader(str(assets.cover)), 40, 120, width=width - 80, height=280, preserveAspectRatio=True, mask="auto")
    c.showPage()

    # Page 2 Executive Summary
    _draw_header_footer(c, title, 2)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Executive Summary")
    c.setFont("Helvetica", 11)
    summary = _safe_text(payload.get("executive_summary"))
    y = _draw_wrapped(c, summary, 40, height - 110, width_chars=92, leading=15)
    c.drawImage(ImageReader(str(assets.themes)), 40, 110, width=width - 80, height=220, preserveAspectRatio=True, mask="auto")
    c.showPage()

    # Page 3 Identity/Temperament
    _draw_header_footer(c, title, 3)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Identity / Temperament")
    matrix_summary = payload.get("destiny_matrix_summary", {}) if isinstance(payload.get("destiny_matrix_summary"), dict) else {}
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, height - 106, "Matrix snapshot")
    c.setFont("Helvetica", 10.5)
    total_score = float(matrix_summary.get("total_score", 0.0) or 0.0)
    c.drawString(40, height - 124, f"- Total score: {total_score:.2f}")

    top_layers = matrix_summary.get("top_layers", []) if isinstance(matrix_summary.get("top_layers"), list) else []
    if top_layers:
        layer_line = ", ".join(
            [f"L{int(item.get('layer', 0))}:{float(item.get('score', 0.0)):.2f}" for item in top_layers[:3] if isinstance(item, dict)]
        )
        c.drawString(40, height - 140, f"- Top layers: {layer_line}")
    else:
        c.drawString(40, height - 140, "- Top layers: none")

    highlights = matrix_summary.get("top_highlights", []) if isinstance(matrix_summary.get("top_highlights"), list) else []
    highlight_line = ", ".join(
        [
            f"{_safe_text(item.get('keyword'))}({float(item.get('score', 0.0)):.1f})"
            for item in highlights[:5]
            if isinstance(item, dict)
        ]
    ) or "none"
    c.drawString(40, height - 156, f"- Highlights: {highlight_line[:105]}")

    synergies = matrix_summary.get("top_synergies", []) if isinstance(matrix_summary.get("top_synergies"), list) else []
    synergy_line = "; ".join(
        [_safe_text(item.get("description")) for item in synergies[:3] if isinstance(item, dict)]
    ) or "none"
    c.drawString(40, height - 172, f"- Synergies: {synergy_line[:105]}")

    c.drawImage(ImageReader(str(assets.matrix_layers)), 40, 330, width=width - 80, height=150, preserveAspectRatio=True, mask="auto")
    c.setFont("Helvetica", 11)
    _draw_wrapped(c, _safe_text(payload.get("identity_section")), 40, 310, width_chars=92, leading=15)
    c.showPage()

    # Page 4 Love
    _draw_header_footer(c, title, 4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Love / Relationships")
    c.setFont("Helvetica", 11)
    _draw_wrapped(c, _safe_text(payload.get("love_section")), 40, height - 110, width_chars=92, leading=15)
    c.showPage()

    # Page 5 Career
    _draw_header_footer(c, title, 5)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Career / Work")
    c.setFont("Helvetica", 11)
    _draw_wrapped(c, _safe_text(payload.get("career_section")), 40, height - 110, width_chars=92, leading=15)
    c.drawImage(ImageReader(str(assets.cross)), 40, 90, width=width - 80, height=210, preserveAspectRatio=True, mask="auto")
    c.showPage()

    # Page 6 Money
    _draw_header_footer(c, title, 6)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Money / Resources")
    c.setFont("Helvetica", 11)
    _draw_wrapped(c, _safe_text(payload.get("money_section")), 40, height - 110, width_chars=92, leading=15)
    c.showPage()

    # Page 7 Stress/Health (non-medical)
    _draw_header_footer(c, title, 7)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Stress / Health")
    c.setFont("Helvetica", 11)
    y2 = _draw_wrapped(c, _safe_text(payload.get("health_section")), 40, height - 110, width_chars=92, leading=15)
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(40, max(80, y2 - 16), "Notice: This section is non-medical guidance only and not a diagnosis.")
    c.showPage()

    # Page 8 Growth Tasks
    _draw_header_footer(c, title, 8)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Growth Tasks")
    c.setFont("Helvetica", 11)
    _draw_wrapped(c, _safe_text(payload.get("growth_section")), 40, height - 110, width_chars=92, leading=15)
    c.showPage()

    # Page 9 Timeline
    _draw_header_footer(c, title, 9)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "12-Month Timeline")
    c.setFont("Helvetica", 11)
    _draw_wrapped(c, _safe_text(payload.get("timeline_section")), 40, height - 110, width_chars=92, leading=15)
    c.drawImage(ImageReader(str(assets.timeline)), 40, 85, width=width - 80, height=220, preserveAspectRatio=True, mask="auto")
    c.showPage()

    # Page 10 Action plan
    _draw_header_footer(c, title, 10)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 80, "Action Plan Checklist")
    c.setFont("Helvetica", 11)
    _draw_wrapped(c, _safe_text(payload.get("action_plan_section")), 40, height - 110, width_chars=92, leading=15)

    checklist = payload.get("action_items", [])[:10]
    y3 = 260
    c.setFont("Helvetica", 10.5)
    for item in checklist:
        c.drawString(40, y3, f"[ ] {_safe_text(item)}")
        y3 -= 20
    c.save()


def count_pdf_pages(pdf_path: Path) -> int:
    try:
        from pypdf import PdfReader  # type: ignore

        return len(PdfReader(str(pdf_path)).pages)
    except Exception:
        try:
            from PyPDF2 import PdfReader  # type: ignore

            return len(PdfReader(str(pdf_path)).pages)
        except Exception:
            return -1
