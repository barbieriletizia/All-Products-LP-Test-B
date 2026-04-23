#!/usr/bin/env python3
"""Transform catalog cards to Figma 8021:117393 text-first layout (rerunnable)."""
import re
from pathlib import Path

from bs4 import BeautifulSoup

JOINER_LAST = frozenset(
    {"with", "and", "for", "including", "plus", "like", "such", "from", "to", "of", "in", "on"}
)

ICON_SVG = (
    '<span class="card-placeholder__feature-icon" aria-hidden="true">'
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">'
    '<circle cx="8" cy="8" r="8" fill="#E8E9FF"/>'
    '<path d="M4.5 8.2 6.8 10.5 11.5 5.8" stroke="#533AFD" stroke-width="1.5" '
    'stroke-linecap="round" stroke-linejoin="round"/>'
    "</svg></span>"
)


def _period(s: str) -> str:
    s = s.strip()
    return s if s.endswith(".") else s + "."


def reconstruct_dup(lead: str, bullet: str) -> str:
    """Rebuild a single-line product blurb when two bullets collapsed to the same text."""
    lead = lead.strip().rstrip(",")
    tail = bullet.strip()
    parts = lead.split()
    last = parts[-1].lower().rstrip(",") if parts else ""
    if last in JOINER_LAST:
        return f"{lead} {tail}"
    return f"{lead}, {tail}"


def split_copy(desc: str) -> tuple[str, list[str]]:
    text = " ".join(desc.split())
    if not text:
        return "Learn more.", ["Product details.", "Explore capabilities."]

    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z(0-9\"(])", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    if len(sentences) >= 3:
        return sentences[0], [_period(sentences[1]), _period(sentences[2])]

    if len(sentences) == 2:
        s1, s2 = sentences
        words = s2.split()
        if len(words) >= 6:
            mid = len(words) // 2
            return s1, [_period(" ".join(words[:mid])), _period(" ".join(words[mid:]))]
        return s1, [_period(s2), _period(s2)]

    s = sentences[0] if sentences else text

    if "," in s:
        raw_parts = [p.strip() for p in s.split(",") if p.strip()]
        if len(raw_parts) >= 3:
            lead = raw_parts[0] + ","
            return lead, [_period(raw_parts[1]), _period(raw_parts[2])]
        if len(raw_parts) == 2:
            lead = raw_parts[0] + ","
            tail = raw_parts[1]
            tail_words = tail.split()
            if " and " in tail:
                a, b = tail.split(" and ", 1)
                return lead, [_period(a.strip()), _period("and " + b.strip())]
            if len(tail_words) >= 8:
                mid = len(tail_words) // 2
                return lead, [
                    _period(" ".join(tail_words[:mid])),
                    _period(" ".join(tail_words[mid:])),
                ]
            if len(tail_words) >= 4:
                mid = max(2, len(tail_words) // 2)
                return lead, [
                    _period(" ".join(tail_words[:mid])),
                    _period(" ".join(tail_words[mid:])),
                ]
            return lead, [_period(tail), _period(tail)]

    words = s.split()
    if len(words) >= 8:
        mid = max(4, len(words) // 2)
        return " ".join(words[:mid]), [
            _period(" ".join(words[mid : mid + len(words) // 4])),
            _period(" ".join(words[mid + len(words) // 4 :])),
        ]
    if len(words) >= 4:
        mid = max(2, len(words) // 2)
        return " ".join(words[:mid]), [_period(" ".join(words[mid:])), _period(" ".join(words[mid:]))]
    return text, [_period(text), _period(text)]


def feature_li(text: str) -> str:
    t = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        f'<li class="card-placeholder__feature">{ICON_SVG}'
        f'<span class="card-placeholder__feature-text">{t}</span></li>'
    )


def build_stack_html(label_el: BeautifulSoup, lead: str, bullets: list[str]) -> BeautifulSoup:
    b1, b2 = bullets[0], bullets[1]
    label_html = str(label_el)
    lead_esc = lead.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    stack_inner = f"""<div class="card-placeholder__text-stack">
      <div class="card-placeholder__intro">
        {label_html}
        <p class="card-placeholder__lead">{lead_esc}</p>
      </div>
      <ul class="card-placeholder__features" aria-label="Highlights">
        {feature_li(b1)}
        {feature_li(b2)}
      </ul>
    </div>"""
    return BeautifulSoup(stack_inner, "html.parser")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    path = root / "all-products.html"
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    grid = soup.find(id="full-catalog-grid")
    if not grid:
        raise SystemExit("full-catalog-grid not found")

    for art in grid.find_all("article", class_=lambda c: c and "card-placeholder" in c):
        media = art.find(class_="card-placeholder__media")
        if media:
            media.decompose()

        body = art.find(class_="card-placeholder__body")
        if not body:
            continue

        label_el = body.find(class_="card-placeholder__label")
        desc_el = body.find(class_="card-placeholder__desc")
        lead_el = body.find(class_="card-placeholder__lead")
        feat_els = body.select(".card-placeholder__feature-text")

        if not label_el:
            continue

        desc: str | None = None
        if desc_el:
            desc = desc_el.get_text(strip=True)
        elif lead_el and len(feat_els) >= 2:
            t1, t2 = feat_els[0].get_text(strip=True), feat_els[1].get_text(strip=True)
            if t1.lower() == t2.lower():
                desc = reconstruct_dup(lead_el.get_text(strip=True), t1)
            else:
                continue
        else:
            continue

        lead, bullets = split_copy(desc)
        if len(bullets) < 2:
            bullets = bullets + [bullets[0]]
        if bullets[0].strip().lower() == bullets[1].strip().lower():
            lead, bullets = split_copy(reconstruct_dup(lead, bullets[0]))

        body.clear()
        body.append(build_stack_html(label_el, lead, bullets))

    path.write_text(str(soup), encoding="utf-8")
    print("Updated", path)


if __name__ == "__main__":
    main()
