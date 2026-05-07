"""
to_astro.py
-----------
Convertit le clone HTML statique (clone_c_chez_toit/) en projet Astro
fidele 1:1 :
- public/assets/ <- assets/
- src/components/Header.astro et Footer.astro (extraits depuis index.html)
- src/layouts/Layout.astro (html/head/body commun)
- src/pages/<route>.astro pour chaque page clonee

Usage : python to_astro.py
"""

from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parent.parent
SRC_CLONE = ROOT / "clone_c_chez_toit"
DST = ROOT / "astro-c-chez-toit"

# Mapping : fichier HTML clone -> route Astro (sans extension)
PAGE_MAP = {
    "index.html": "index",
    "pages/a-propos-de-c-chez-toit/index.html": "a-propos-de-c-chez-toit",
    "pages/services/index.html": "services",
    "pages/projets/index.html": "projets",
    "pages/contact/index.html": "contact",
    "pages/mentions-legales.html": "mentions-legales",
    "pages/politique-de-confidentialite.html": "politique-de-confidentialite",
}

# Pages sur lesquelles on injecte la section <ZoneIntervention /> juste avant
# la fin du <main>. Cle = route, valeur = props (variant).
INJECT_ZONES = {
    "index": {"variant": "soft"},
    "services": {"variant": "light"},
    "contact": {"variant": "light"},
    "a-propos-de-c-chez-toit": {"variant": "soft"},
}


def rewrite_paths(html: str, depth: int) -> str:
    """Reecrit les chemins relatifs vers /assets/.

    depth = nombre de '../' a remplacer en plus du prefixe direct.
    On normalise simplement toute occurrence de 'assets/' precedee de 0..N '../'
    en '/assets/'.
    """
    # remplace href="../assets/.." ou src="assets/.." etc.
    html = re.sub(r'(["\'(=\s])(?:\.\./)*assets/', r'\1/assets/', html)
    return html


def add_lazy_loading(html: str) -> str:
    """Ajoute loading='lazy' aux images qui ne l'ont pas deja.
    Exclut les images dans le header (logos) et les images decoratives.
    """
    soup = BeautifulSoup(html, 'html.parser')
    for img in soup.find_all('img'):
        # Skip si loading deja present
        if img.get('loading'):
            continue
        # Skip les images dans le header (logos, navigation)
        if img.find_parent(['header', 'nav']):
            continue
        # Skip les images tres petites (icones, decorative)
        width = img.get('width')
        height = img.get('height')
        if width and int(width) < 50:
            continue
        if height and int(height) < 50:
            continue
        # Skip les images with data-lazy-src (deja gere par un plugin)
        if img.get('data-lazy-src'):
            continue
        # Ajouter loading lazy
        img['loading'] = 'lazy'
        # Ajouter decoding async pour meilleure performance
        img['decoding'] = 'async'
    return str(soup)


def js_template_escape(s: str) -> str:
    s = s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    # Empeche l'analyse statique d'Astro/Vite de detecter les <script>/<style>
    # dans le source. Les morceaux `${""}` sont evalues a runtime et produisent
    # le tag original lors de l'injection set:html.
    s = s.replace("<script", "<scr${\"\"}ipt").replace("</script", "</scr${\"\"}ipt")
    s = s.replace("<style", "<sty${\"\"}le").replace("</style", "</sty${\"\"}le")
    return s


def extract_parts(html_path: Path):
    raw = html_path.read_bytes().decode("utf-8", errors="ignore")
    soup = BeautifulSoup(raw, "html.parser")

    html_tag = soup.find("html")
    body_tag = soup.find("body")
    head_tag = soup.find("head")

    html_lang = html_tag.get("lang", "fr-FR") if html_tag else "fr-FR"
    body_class = " ".join(body_tag.get("class", [])) if body_tag else ""
    body_attrs = {}
    if body_tag:
        for k, v in body_tag.attrs.items():
            if k == "class":
                continue
            if isinstance(v, list):
                v = " ".join(v)
            body_attrs[k] = v

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Extraction des meta SEO Yoast (deplaces vers props du Layout)
    description = ""
    og_image = ""
    og_type = ""
    canonical = ""
    if head_tag:
        # description Yoast peut etre absent ; fallback sur og:description
        for m in head_tag.find_all("meta"):
            prop = (m.get("property") or "").lower()
            n = (m.get("name") or "").lower()
            content = m.get("content") or ""
            if not description and (n == "description" or prop == "og:description"):
                description = content.strip()
            if not og_image and prop == "og:image":
                og_image = content.strip()
            if not og_type and prop == "og:type":
                og_type = content.strip()
        link_canon = head_tag.find("link", rel="canonical")
        if link_canon and link_canon.get("href"):
            canonical = link_canon["href"].strip()

    # head : on retire uniquement les doublons stricts avec ce que Layout regenere
    # On PRESERVE tout le reste (stylesheets, scripts, Yoast JSON-LD, etc.)
    head_inner_parts = []
    if head_tag:
        for child in head_tag.children:
            if isinstance(child, Comment):
                head_inner_parts.append(f"<!--{child}-->")
                continue
            name = getattr(child, "name", None)
            if name == "title":
                continue
            if name == "meta":
                charset = child.get("charset")
                http_equiv = (child.get("http-equiv") or "").lower()
                meta_name = (child.get("name") or "").lower()
                # On retire uniquement charset, viewport, description (que Layout regenere)
                if charset or http_equiv == "content-type" or meta_name == "viewport" or meta_name == "description":
                    continue
            if name == "link":
                rel_val = child.get("rel")
                rel_str = " ".join(rel_val).lower() if isinstance(rel_val, list) else (rel_val or "").lower()
                # On retire uniquement canonical (que Layout regenere)
                if rel_str == "canonical":
                    continue
            head_inner_parts.append(str(child))
    head_inner = "".join(head_inner_parts)

    # header / footer / main : on remplace les elements par des marqueurs
    # pour gerer le cas ou ils sont imbriques dans des wrappers (#page.hfeed.site)
    header_el = soup.find("header", id="masthead")
    footer_el = soup.find("footer", id="colophon")

    HDR = "@@CCT_HEADER_MARKER@@"
    FTR = "@@CCT_FOOTER_MARKER@@"
    pre_html = main_html = post_html = ""
    if body_tag:
        if header_el is not None:
            header_el.replace_with(BeautifulSoup(HDR, "html.parser"))
        if footer_el is not None:
            footer_el.replace_with(BeautifulSoup(FTR, "html.parser"))
        body_inner = body_tag.decode_contents()
        # Split sur HEADER puis FOOTER
        if HDR in body_inner:
            pre_html, _, after = body_inner.partition(HDR)
        else:
            pre_html, after = "", body_inner
        if FTR in after:
            main_html, _, post_html = after.partition(FTR)
        else:
            main_html, post_html = after, ""

    pre_parts = [pre_html]
    main_parts = [main_html]
    post_parts = [post_html]

    return {
        "html_lang": html_lang,
        "body_class": body_class,
        "body_attrs": body_attrs,
        "title": title,
        "description": description,
        "og_image": og_image,
        "og_type": og_type,
        "canonical": canonical,
        "head_inner": head_inner,
        "header_html": str(header_el) if header_el else "",
        "footer_html": str(footer_el) if footer_el else "",
        "pre_html": "".join(pre_parts),
        "main_html": "".join(main_parts),
        "post_html": "".join(post_parts),
    }


def write_astro_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> None:
    if not SRC_CLONE.exists():
        print(f"Clone introuvable: {SRC_CLONE}", file=sys.stderr)
        sys.exit(1)

    DST.mkdir(parents=True, exist_ok=True)

    # 1. Copie des assets (seulement si manquant : les assets ne changent pas)
    src_assets = SRC_CLONE / "assets"
    dst_public_assets = DST / "public" / "assets"
    if not dst_public_assets.exists():
        print(f"[copy] {src_assets} -> {dst_public_assets}")
        shutil.copytree(src_assets, dst_public_assets)
    else:
        print(f"[skip] assets deja copies ({dst_public_assets})")

    # 2. Extrait header/footer depuis index.html (reference)
    home = extract_parts(SRC_CLONE / "index.html")
    header_html = rewrite_paths(home["header_html"], 0)
    footer_html = rewrite_paths(home["footer_html"], 0)

    # 3. package.json + astro.config + tsconfig
    write_astro_file(DST / "package.json", """{
  "name": "astro-c-chez-toit",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.16.18"
  }
}
""")
    write_astro_file(DST / "astro.config.mjs", """import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://c-chez-toit.local',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
""")
    write_astro_file(DST / "tsconfig.json", """{
  "extends": "astro/tsconfigs/base"
}
""")
    write_astro_file(DST / ".gitignore", "node_modules\ndist\n.astro\n")
    write_astro_file(DST / "README.md", """# astro-c-chez-toit

Conversion 1:1 du clone HTML/CSS/JS de https://c-chez-toit.com/ vers Astro.

## Demarrer

```bash
npm install
npm run dev
```

Ouvre http://localhost:4321

## Structure

- `public/assets/` : tous les assets statiques (CSS/JS/images/fonts) issus du site original
- `src/layouts/Layout.astro` : shell html/head/body commun
- `src/components/Header.astro` / `Footer.astro` : header/footer factorises
- `src/pages/*.astro` : une page Astro par page clonee
""")

    # 4. Header / Footer components
    write_astro_file(DST / "src" / "components" / "Header.astro", f"---\n---\n{header_html}\n")
    write_astro_file(DST / "src" / "components" / "Footer.astro", f"---\n---\n{footer_html}\n")

    # 5. Layout (ne PAS ecraser si deja present : peut avoir ete personnalise)
    layout_path = DST / "src" / "layouts" / "Layout.astro"
    if not layout_path.exists():
        layout = """---
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import BaseHead from '../components/BaseHead.astro';

interface Props {
  title?: string;
  htmlLang?: string;
  bodyClass?: string;
  bodyAttrs?: Record<string, string>;
  headHtml?: string;
  preHtml?: string;
  postHtml?: string;
  useBaseHead?: boolean;
}

const {
  title = '',
  htmlLang = 'fr-FR',
  bodyClass = '',
  bodyAttrs = {},
  headHtml = '',
  preHtml = '',
  postHtml = '',
  useBaseHead = false,
} = Astro.props;
---
<!doctype html>
<html lang={htmlLang}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {useBaseHead && <BaseHead />}
    <Fragment set:html={headHtml} />
  </head>
  <body class={bodyClass} {...bodyAttrs}>
    <Fragment set:html={preHtml} />
    <Header />
    <slot />
    <Footer />
    <Fragment set:html={postHtml} />
  </body>
</html>
"""
        write_astro_file(layout_path, layout)

    # 6. Pages
    for src_rel, route in PAGE_MAP.items():
        src_file = SRC_CLONE / src_rel
        if not src_file.exists():
            print(f"  [!] manque: {src_file}")
            continue
        parts = extract_parts(src_file)
        # Reecrit chemins
        for k in ("head_inner", "main_html", "pre_html", "post_html"):
            parts[k] = rewrite_paths(parts[k], 0)
        # Ajoute lazy loading aux images
        parts["main_html"] = add_lazy_loading(parts["main_html"])

        title_js = js_template_escape(parts["title"])
        head_js = js_template_escape(parts["head_inner"])
        main_js = js_template_escape(parts["main_html"])
        pre_js = js_template_escape(parts["pre_html"])
        post_js = js_template_escape(parts["post_html"])
        body_class = parts["body_class"].replace('"', '\\"')

        # SEO props (extraits du Yoast clone)
        desc_js = js_template_escape(parts.get("description", ""))
        og_image = parts.get("og_image", "") or ""
        og_type_js = parts.get("og_type", "") or "website"
        # Canonical : on retire le domaine d'origine pour pointer en relatif
        canonical_raw = parts.get("canonical", "") or ""
        canonical_js = re.sub(r'^https?://[^/]+', '', canonical_raw) if canonical_raw else ""

        # body_attrs serialise en objet JS
        attrs_pairs = []
        for k, v in parts["body_attrs"].items():
            kk = k.replace('"', '\\"')
            vv = v.replace('"', '\\"') if isinstance(v, str) else str(v)
            attrs_pairs.append(f'  "{kk}": "{vv}"')
        body_attrs_js = "{\n" + ",\n".join(attrs_pairs) + "\n}" if attrs_pairs else "{}"

        inject = INJECT_ZONES.get(route)
        extra_import = ""
        extra_render = ""
        if inject:
            extra_import = "import ZoneIntervention from '../components/ZoneIntervention.astro';\n"
            variant = inject.get("variant", "light")
            extra_render = f'  <ZoneIntervention variant="{variant}" />\n'

        canonical_attr = f'\n  canonical="{canonical_js}"' if canonical_js else ""
        og_image_attr = f'\n  ogImage="{og_image}"' if og_image else ""
        og_type_attr = f'\n  ogType="{og_type_js}"' if og_type_js and og_type_js != "website" else ""

        astro = f"""---
import Layout from '../layouts/Layout.astro';
{extra_import}
const title = `{title_js}`;
const description = `{desc_js}`;
const bodyClass = "{body_class}";
const bodyAttrs = {body_attrs_js};
const headHtml = `{head_js}`;
const preHtml = `{pre_js}`;
const postHtml = `{post_js}`;
const mainHtml = `{main_js}`;
---
<Layout
  title={{title}}
  description={{description}}
  htmlLang="{parts['html_lang']}"
  bodyClass={{bodyClass}}
  bodyAttrs={{bodyAttrs}}
  headHtml={{headHtml}}
  preHtml={{preHtml}}
  postHtml={{postHtml}}{canonical_attr}{og_image_attr}{og_type_attr}
>
  <Fragment set:html={{mainHtml}} />
{extra_render}</Layout>
"""
        write_astro_file(DST / "src" / "pages" / f"{route}.astro", astro)
        print(f"[page] {src_rel} -> src/pages/{route}.astro")

    # 7. Reecrit aussi les liens internes dans Header/Footer/pages
    # Les <a href="pages/foo/index.html"> ou "pages/foo.html" doivent pointer vers /foo
    def rewrite_internal_links(text: str) -> str:
        # pages/<slug>/index.html -> /<slug>
        text = re.sub(r'(["\'])(?:\.\./)*pages/([a-z0-9\-]+)/index\.html\1',
                      lambda m: f'{m.group(1)}/{m.group(2)}{m.group(1)}', text)
        # pages/<slug>.html -> /<slug>
        text = re.sub(r'(["\'])(?:\.\./)*pages/([a-z0-9\-]+)\.html\1',
                      lambda m: f'{m.group(1)}/{m.group(2)}{m.group(1)}', text)
        # index.html racine -> /
        text = re.sub(r'(["\'])(?:\.\./)*index\.html\1',
                      lambda m: f'{m.group(1)}/{m.group(1)}', text)
        # cleanup : /index ou /index/ residuel -> /
        text = re.sub(r'(["\'])/index/?\1', r'\1/\1', text)
        # cleanup : trailing slash sur les slugs (eviter /services/ vs /services)
        # WP utilise des slashes finaux ; Astro accepte les deux mais normalise
        return text

    # Reapplique sur les fichiers Astro generes
    for f in (DST / "src").rglob("*.astro"):
        original = f.read_text(encoding="utf-8")
        updated = rewrite_internal_links(original)
        if updated != original:
            f.write_text(updated, encoding="utf-8")

    print(f"\nProjet Astro pret : {DST}")
    print("Etapes : cd astro-c-chez-toit && npm install && npm run dev")


if __name__ == "__main__":
    main()
