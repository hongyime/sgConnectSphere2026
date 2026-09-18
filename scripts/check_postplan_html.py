#!/usr/bin/env python3
"""Structural check for a postplan HTML file.

Verifies that a postplan HTML file follows the conventions in
docs/contributing/creating-a-postplan.md:

- Three anchor sections must be present with the ids "overview",
  "details", and "next-steps".
- No external runtime dependencies (no <script src>, no <link
  rel=stylesheet>, no runtime fetch/XHR/WebSocket calls, no @import,
  no url(...) references outside data URIs and in-page anchors).
- Every inline <svg> element has both a viewBox attribute and an
  aria-labelledby attribute pointing at existing element ids.
- No Mermaid source containers left unrendered (pre.mermaid).
- No duplicate element ids.
- No absolute file references or non-inline src attributes.

Exits 0 on pass, 1 on any structural failure.

Usage:
    python scripts/check_postplan_html.py artifacts/<slug>.html
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys


class DocumentCheck(HTMLParser):
    """Traverses HTML once and collects structural errors."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.local_links = []
        self.errors = []
        self.svg_count = 0
        self.script_depth = 0
        self.style_depth = 0
        self.scripts = []
        self.styles = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        identity = values.get('id')
        if identity:
            if identity in self.ids:
                self.errors.append(f'Duplicate id: {identity}')
            self.ids.add(identity)
        if tag in {'iframe', 'form', 'object', 'embed', 'base'}:
            self.errors.append(f'Unsupported element: {tag}')
        if tag == 'script':
            self.script_depth += 1
            if 'src' in values:
                self.errors.append('External script dependency')
        if tag == 'style':
            self.style_depth += 1
        if tag == 'link' and values.get('rel', '').lower() in {'stylesheet', 'preload', 'modulepreload'}:
            self.errors.append('External stylesheet/preload dependency')
        for key in ('src', 'srcset', 'poster'):
            if values.get(key) and not values[key].startswith('data:'):
                self.errors.append(f'Non-inline {tag} {key}: {values[key]}')
        if tag in {'image', 'use'}:
            for key in ('href', 'xlink:href'):
                value = values.get(key, '')
                if value and not value.startswith(('#', 'data:')):
                    self.errors.append('External SVG resource')
        if tag == 'a' and values.get('href', '').startswith('#'):
            self.local_links.append(values['href'][1:])
        if tag == 'svg':
            self.svg_count += 1
            if not values.get('viewbox') or not values.get('aria-labelledby'):
                self.errors.append('SVG needs viewBox and aria-labelledby')
            self.local_links.extend(values.get('aria-labelledby', '').split())
        if tag == 'pre' and 'mermaid' in values.get('class', '').split():
            self.errors.append('Unrendered Mermaid container; inline a rendered SVG')
        if values.get('style'):
            self.styles.append(values['style'])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == 'script':
            self.script_depth = max(0, self.script_depth - 1)
        if tag == 'style':
            self.style_depth = max(0, self.style_depth - 1)

    def handle_data(self, data):
        if self.script_depth:
            self.scripts.append(data)
        if self.style_depth:
            self.styles.append(data)


def check(path):
    """Run the check against `path`; print any errors and return exit code."""
    parser = DocumentCheck()
    parser.feed(Path(path).read_text(encoding='utf-8-sig'))
    # Required document sections; a postplan must have all three anchors.
    for identity in ('overview', 'details', 'next-steps'):
        if identity not in parser.ids:
            parser.errors.append(f'Missing document section: {identity}')
    # Every in-page anchor must resolve to an element id in the document.
    for identity in parser.local_links:
        if identity and identity not in parser.ids:
            parser.errors.append(f'Broken in-page reference: {identity}')
    # CSS must not import external stylesheets or fetch external resources.
    css = '\n'.join(parser.styles)
    urls = re.findall(r'url\(([^)]*)\)', css, re.I)
    if re.search(r'@import\b', css, re.I) or any(
        not value.strip().strip('\"\'').startswith(('#', 'data:'))
        for value in urls
    ):
        parser.errors.append('Possible external CSS dependency')
    # JavaScript must not perform network calls at runtime.
    js = '\n'.join(parser.scripts)
    if re.search(
        r'\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b|\bimport\s*(?:\(|["\'{*])',
        js,
    ):
        parser.errors.append('Possible runtime network dependency')
    if parser.errors:
        for error in parser.errors:
            print(f'ERROR: {error}')
        return 1
    print(
        f'HTML structure passed; {parser.svg_count} inline SVG(s). '
        'Visually inspect the final document.'
    )
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python scripts/check_postplan_html.py <document.html>')
    raise SystemExit(check(sys.argv[1]))
