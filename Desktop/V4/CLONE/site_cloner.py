"""
site_cloner.py
---------------
Analyse un site web et tente de le reproduire localement :
- Telecharge le HTML de chaque page (en suivant les liens internes).
- Recupere les ressources (CSS, JS, images, fonts, videos).
- Reecrit les URLs pour que la copie fonctionne hors ligne.
- Produit un petit rapport d'analyse (structure, technos detectees,
  palette de couleurs approximative, polices, meta).

Usage :
    python site_cloner.py https://exemple.com --out ./clone_exemple --max-pages 30

Dependances :
    pip install requests beautifulsoup4 tinycss2

Note legale : n'utilise ce script que sur des sites que tu as le droit
d'analyser/copier (tes propres sites, sites clients avec accord, etc.).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from collections import Counter, deque
from urllib.parse import urljoin, urlparse, urldefrag, urlunparse

import requests
from bs4 import BeautifulSoup

try:
    import tinycss2  # pour extraire les url(...) dans le CSS
except ImportError:
    tinycss2 = None


# ---------- Utils ----------

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; SiteClonerBot/1.0; +https://example.local)"
    )
}

ASSET_ATTRS = {
    "img": ["src", "data-src", "srcset"],
    "script": ["src"],
    "link": ["href"],
    "source": ["src", "srcset"],
    "video": ["src", "poster"],
    "audio": ["src"],
    "iframe": ["src"],
    "use": ["href", "xlink:href"],
}


def same_site(url: str, root_netloc: str) -> bool:
    try:
        return urlparse(url).netloc in ("", root_netloc)
    except Exception:
        return False


def sanitize_path(url: str) -> str:
    """Transforme une URL en chemin local sûr."""
    p = urlparse(url)
    path = p.path
    if not path or path.endswith("/"):
        path = path + "index.html"
    # Ajoute la query dans le nom de fichier pour éviter les collisions
    if p.query:
        base, dot, ext = path.rpartition(".")
        q = re.sub(r"[^A-Za-z0-9_-]+", "_", p.query)[:60]
        if dot:
            path = f"{base}__{q}.{ext}"
        else:
            path = f"{path}__{q}"
    # Nettoie
    parts = []
    for seg in path.split("/"):
        seg = re.sub(r"[^A-Za-z0-9._-]+", "_", seg)
        if seg:
            parts.append(seg)
    return "/".join(parts) or "index.html"


def ensure_parent(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)


def rel_link(from_file: str, to_file: str) -> str:
    rel = os.path.relpath(to_file, os.path.dirname(from_file))
    return rel.replace(os.sep, "/")


# ---------- Cloner ----------

class SiteCloner:
    def __init__(self, start_url: str, out_dir: str, max_pages: int = 50,
                 delay: float = 0.2, timeout: int = 20):
        self.start_url, _ = urldefrag(start_url)
        self.root_netloc = urlparse(self.start_url).netloc
        self.out_dir = os.path.abspath(out_dir)
        self.max_pages = max_pages
        self.delay = delay
        self.timeout = timeout

        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        # url -> chemin local relatif (depuis out_dir)
        self.url_to_local: dict[str, str] = {}
        self.visited_pages: set[str] = set()
        self.queue: deque[str] = deque([self.start_url])

        # Analyse
        self.analysis = {
            "start_url": self.start_url,
            "pages": [],
            "assets": {"css": 0, "js": 0, "img": 0, "font": 0, "other": 0},
            "technos": set(),
            "fonts": Counter(),
            "colors": Counter(),
            "meta": {},
        }

    # ----- Téléchargement -----

    def _download(self, url: str) -> tuple[bytes, str] | None:
        try:
            r = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            r.raise_for_status()
            return r.content, r.headers.get("Content-Type", "")
        except Exception as e:
            print(f"  [!] erreur {url}: {e}", file=sys.stderr)
            return None

    def _local_path_for(self, url: str, is_page: bool = False) -> str:
        if url in self.url_to_local:
            return self.url_to_local[url]
        sub = sanitize_path(url)
        if is_page and not sub.endswith(".html"):
            sub += ".html"
        if not is_page:
            # ressources dans assets/
            sub = f"assets/{sub}"
        else:
            sub = f"pages/{sub}"
        if url == self.start_url:
            sub = "index.html"
        local = os.path.join(self.out_dir, sub)
        self.url_to_local[url] = local
        return local

    # ----- Traitement HTML -----

    def _process_page(self, url: str) -> None:
        if url in self.visited_pages or len(self.visited_pages) >= self.max_pages:
            return
        print(f"[page] {url}")
        self.visited_pages.add(url)
        res = self._download(url)
        if not res:
            return
        html, _ = res
        try:
            soup = BeautifulSoup(html, "html.parser")
        except Exception as e:
            print(f"  [!] parse: {e}", file=sys.stderr)
            return

        page_local = self._local_path_for(url, is_page=True)
        ensure_parent(page_local)

        # Analyse de la page
        self._analyze_page(url, soup)

        # Ressources
        for tag, attrs in ASSET_ATTRS.items():
            for el in soup.find_all(tag):
                for attr in attrs:
                    if not el.has_attr(attr):
                        continue
                    if attr == "srcset":
                        new_parts = []
                        for part in el[attr].split(","):
                            bits = part.strip().split()
                            if not bits:
                                continue
                            asset_url = urljoin(url, bits[0])
                            local = self._fetch_asset(asset_url)
                            if local:
                                bits[0] = rel_link(page_local, local)
                            new_parts.append(" ".join(bits))
                        el[attr] = ", ".join(new_parts)
                    else:
                        raw = el[attr].strip()
                        if not raw or raw.startswith(("data:", "javascript:", "mailto:", "tel:", "#")):
                            continue
                        asset_url = urljoin(url, raw)
                        local = self._fetch_asset(asset_url)
                        if local:
                            el[attr] = rel_link(page_local, local)

        # Liens internes -> enfile + reecrit
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
                continue
            target, _ = urldefrag(urljoin(url, href))
            if same_site(target, self.root_netloc):
                if target not in self.visited_pages and target not in self.queue:
                    self.queue.append(target)
                target_local = self._local_path_for(target, is_page=True)
                a["href"] = rel_link(page_local, target_local)

        # CSS inline <style>
        for style in soup.find_all("style"):
            if style.string:
                style.string.replace_with(
                    self._rewrite_css(style.string, base_url=url, css_local=page_local)
                )

        with open(page_local, "wb") as f:
            f.write(soup.encode("utf-8"))

    # ----- Ressources -----

    def _fetch_asset(self, url: str) -> str | None:
        url, _ = urldefrag(url)
        if not url.startswith(("http://", "https://")):
            return None
        if url in self.url_to_local and os.path.exists(self.url_to_local[url]):
            return self.url_to_local[url]

        local = self._local_path_for(url, is_page=False)
        ensure_parent(local)
        res = self._download(url)
        if not res:
            return None
        data, ctype = res

        kind = self._classify(url, ctype)
        self.analysis["assets"][kind] = self.analysis["assets"].get(kind, 0) + 1

        if kind == "css":
            try:
                text = data.decode("utf-8", errors="ignore")
                text = self._rewrite_css(text, base_url=url, css_local=local)
                data = text.encode("utf-8")
            except Exception:
                pass

        with open(local, "wb") as f:
            f.write(data)
        time.sleep(self.delay)
        return local

    @staticmethod
    def _classify(url: str, ctype: str) -> str:
        u = url.lower()
        if "css" in ctype or u.endswith(".css"):
            return "css"
        if "javascript" in ctype or u.endswith(".js") or u.endswith(".mjs"):
            return "js"
        if any(u.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".gif",
                                           ".webp", ".svg", ".ico", ".avif")):
            return "img"
        if any(u.endswith(ext) for ext in (".woff", ".woff2", ".ttf", ".otf", ".eot")):
            return "font"
        if ctype.startswith("image/"):
            return "img"
        if ctype.startswith("font/"):
            return "font"
        return "other"

    # ----- CSS -----

    URL_RE = re.compile(r"url\(\s*(['\"]?)([^'\")]+)\1\s*\)")
    IMPORT_RE = re.compile(r"@import\s+(?:url\()?\s*(['\"])([^'\"]+)\1\s*\)?\s*;?")

    def _rewrite_css(self, text: str, base_url: str, css_local: str) -> str:
        def repl_url(m: re.Match) -> str:
            quote, target = m.group(1), m.group(2)
            if target.startswith(("data:", "#")):
                return m.group(0)
            abs_url = urljoin(base_url, target)
            local = self._fetch_asset(abs_url)
            if local:
                return f"url({quote}{rel_link(css_local, local)}{quote})"
            return m.group(0)

        def repl_import(m: re.Match) -> str:
            quote, target = m.group(1), m.group(2)
            abs_url = urljoin(base_url, target)
            local = self._fetch_asset(abs_url)
            if local:
                return f'@import {quote}{rel_link(css_local, local)}{quote};'
            return m.group(0)

        text = self.IMPORT_RE.sub(repl_import, text)
        text = self.URL_RE.sub(repl_url, text)

        # Analyse : couleurs, fonts
        for c in re.findall(r"#([0-9a-fA-F]{3,8})\b", text):
            self.analysis["colors"]["#" + c.lower()] += 1
        for f in re.findall(r"font-family\s*:\s*([^;}{]+)", text, re.I):
            for token in f.split(","):
                name = token.strip().strip("'\"")
                if name:
                    self.analysis["fonts"][name] += 1
        return text

    # ----- Analyse -----

    def _analyze_page(self, url: str, soup: BeautifulSoup) -> None:
        title = (soup.title.string.strip() if soup.title and soup.title.string else "")
        meta = {}
        for m in soup.find_all("meta"):
            name = m.get("name") or m.get("property")
            content = m.get("content")
            if name and content:
                meta[name] = content
        self.analysis["pages"].append({
            "url": url,
            "title": title,
            "h1": [h.get_text(strip=True) for h in soup.find_all("h1")],
            "meta": meta,
            "nb_links": len(soup.find_all("a")),
            "nb_images": len(soup.find_all("img")),
        })
        # Techno fingerprinting basique
        html_str = str(soup).lower()
        hints = {
            "WordPress": "wp-content",
            "Shopify": "cdn.shopify.com",
            "Wix": "wix.com",
            "Squarespace": "squarespace",
            "Next.js": "/_next/",
            "Nuxt": "/_nuxt/",
            "React": "react",
            "Vue": "vue",
            "Bootstrap": "bootstrap",
            "TailwindCSS": "tailwind",
            "jQuery": "jquery",
            "Google Analytics": "google-analytics",
            "GTM": "googletagmanager",
        }
        for name, needle in hints.items():
            if needle in html_str:
                self.analysis["technos"].add(name)

    # ----- Run -----

    def run(self) -> None:
        os.makedirs(self.out_dir, exist_ok=True)
        while self.queue and len(self.visited_pages) < self.max_pages:
            url = self.queue.popleft()
            if not same_site(url, self.root_netloc):
                continue
            self._process_page(url)
            time.sleep(self.delay)

        # Rapport
        report = dict(self.analysis)
        report["technos"] = sorted(report["technos"])
        report["fonts"] = self.analysis["fonts"].most_common(15)
        report["colors"] = self.analysis["colors"].most_common(20)
        report["nb_pages"] = len(self.visited_pages)
        report["nb_assets"] = sum(self.analysis["assets"].values())

        report_path = os.path.join(self.out_dir, "analysis.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # Resume lisible
        summary = [
            f"# Analyse de {self.start_url}",
            "",
            f"- Pages telechargees : {report['nb_pages']}",
            f"- Ressources : {report['nb_assets']} "
            f"(css={self.analysis['assets'].get('css',0)}, "
            f"js={self.analysis['assets'].get('js',0)}, "
            f"img={self.analysis['assets'].get('img',0)}, "
            f"font={self.analysis['assets'].get('font',0)})",
            f"- Technos detectees : {', '.join(report['technos']) or 'aucune'}",
            "",
            "## Polices principales",
            *[f"- {name} ({n})" for name, n in report["fonts"]],
            "",
            "## Couleurs les plus frequentes",
            *[f"- {c} ({n})" for c, n in report["colors"]],
            "",
            "## Pages",
            *[f"- [{p['title'] or p['url']}]({p['url']})" for p in report["pages"]],
        ]
        with open(os.path.join(self.out_dir, "REPORT.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(summary))

        print(f"\nOK. Clone dans : {self.out_dir}")
        print(f"Rapport : {report_path}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Analyse et clone un site web.")
    ap.add_argument("url", help="URL de depart (ex: https://exemple.com)")
    ap.add_argument("--out", default="./clone", help="Dossier de sortie")
    ap.add_argument("--max-pages", type=int, default=30, help="Nombre max de pages")
    ap.add_argument("--delay", type=float, default=0.2, help="Pause entre requetes (s)")
    args = ap.parse_args()

    SiteCloner(args.url, args.out, max_pages=args.max_pages, delay=args.delay).run()


if __name__ == "__main__":
    main()
