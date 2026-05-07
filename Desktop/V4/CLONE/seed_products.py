"""
seed_products.py
----------------
Crée automatiquement les 20 produits de `products-seed.csv` dans ta boutique
Shopify via l'Admin API REST.

Utile quand l'import CSV est bloqué (plan gratuit / trial en cours d'activation).

Pré-requis (une seule fois) :
    1. Admin Shopify → Settings → Apps and sales channels → Develop apps
       (active la fonctionnalité si pas déjà fait)
    2. "Create an app" → nom libre (ex: "DecoShop Seeder")
    3. Onglet "Configuration" → "Admin API integration" → "Configure"
       Coche les scopes :
         - write_products
         - write_inventory (optionnel, pour gérer le stock)
       Sauvegarder.
    4. Onglet "API credentials" → "Install app" → "Install"
    5. Copie l'"Admin API access token" (commence par `shpat_`) — visible UNE SEULE FOIS

Utilisation :
    set SHOPIFY_STORE=gn0pjs-gu.myshopify.com
    set SHOPIFY_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    python seed_products.py

    OU en une ligne :
    python seed_products.py --store gn0pjs-gu.myshopify.com --token shpat_xxx

Options :
    --csv products-seed.csv    Fichier source (défaut: products-seed.csv)
    --dry-run                  Ne crée rien, affiche juste ce qui serait créé
    --skip-existing            Ignore les handles déjà présents dans la boutique
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

import requests

API_VERSION = "2025-10"


def die(msg: str, code: int = 1):
    print(f"ERREUR: {msg}", file=sys.stderr)
    sys.exit(code)


def shop_url(store: str, path: str) -> str:
    return f"https://{store}/admin/api/{API_VERSION}{path}"


def list_existing_handles(store: str, token: str) -> set[str]:
    """Récupère les handles des produits déjà présents pour éviter les doublons."""
    handles: set[str] = set()
    url = shop_url(store, "/products.json?limit=250&fields=handle")
    while url:
        r = requests.get(url, headers={"X-Shopify-Access-Token": token}, timeout=30)
        if r.status_code == 401:
            die("Token invalide ou app non installée (401).")
        if r.status_code == 403:
            die("Scope manquant (write_products / read_products).")
        r.raise_for_status()
        for p in r.json().get("products", []):
            handles.add(p["handle"])
        # Pagination via Link header
        link = r.headers.get("Link", "")
        url = None
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split(";")[0].strip().strip("<>")
                    break
    return handles


def row_to_product_payload(row: dict) -> dict:
    """Convertit une ligne CSV en payload JSON Shopify Admin API."""
    price = (row.get("Variant Price") or "0").strip()
    compare_at = (row.get("Variant Compare At Price") or "").strip()
    qty_raw = (row.get("Variant Inventory Qty") or "0").strip()
    try:
        qty = int(qty_raw)
    except ValueError:
        qty = 0

    variant: dict = {
        "price": price,
        "sku": (row.get("Variant SKU") or "").strip(),
        "inventory_management": (row.get("Variant Inventory Tracker") or "shopify").strip() or None,
        "inventory_quantity": qty,
        "inventory_policy": (row.get("Variant Inventory Policy") or "deny").strip(),
        "requires_shipping": (row.get("Variant Requires Shipping") or "TRUE").upper() == "TRUE",
        "taxable": (row.get("Variant Taxable") or "TRUE").upper() == "TRUE",
    }
    if compare_at:
        variant["compare_at_price"] = compare_at

    tags = (row.get("Tags") or "").strip()

    payload: dict = {
        "product": {
            "title": (row.get("Title") or "").strip(),
            "body_html": (row.get("Body (HTML)") or "").strip(),
            "vendor": (row.get("Vendor") or "").strip(),
            "product_type": (row.get("Type") or "").strip(),
            "handle": (row.get("Handle") or "").strip(),
            "tags": tags,
            "status": (row.get("Status") or "active").strip(),
            "published": (row.get("Published") or "TRUE").upper() == "TRUE",
            "variants": [variant],
        }
    }

    img_src = (row.get("Image Src") or "").strip()
    if img_src:
        payload["product"]["images"] = [
            {"src": img_src, "alt": (row.get("Image Alt Text") or "").strip()}
        ]

    return payload


def create_product(store: str, token: str, payload: dict) -> tuple[bool, str]:
    url = shop_url(store, "/products.json")
    r = requests.post(
        url,
        headers={
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        data=json.dumps(payload),
        timeout=30,
    )
    if r.status_code == 201:
        return True, r.json()["product"]["handle"]
    # Shopify renvoie 429 quand on dépasse le rate limit → attendre et retry
    if r.status_code == 429:
        retry_after = float(r.headers.get("Retry-After", "2"))
        time.sleep(retry_after)
        return create_product(store, token, payload)
    try:
        err = r.json()
    except Exception:
        err = r.text
    return False, f"HTTP {r.status_code} — {err}"


def main():
    parser = argparse.ArgumentParser(description="Seed Shopify products from a CSV via Admin API.")
    parser.add_argument("--store", default=os.environ.get("SHOPIFY_STORE"),
                        help="myshopify domain, ex: gn0pjs-gu.myshopify.com")
    parser.add_argument("--token", default=os.environ.get("SHOPIFY_TOKEN"),
                        help="Admin API access token (commence par shpat_)")
    parser.add_argument("--csv", default="products-seed.csv", help="Fichier CSV source")
    parser.add_argument("--dry-run", action="store_true", help="Simule sans créer")
    parser.add_argument("--skip-existing", action="store_true",
                        help="Ignore les handles déjà dans la boutique")
    args = parser.parse_args()

    if not args.store:
        die("--store ou SHOPIFY_STORE manquant")
    if not args.token:
        die("--token ou SHOPIFY_TOKEN manquant")

    csv_path = Path(args.csv)
    if not csv_path.exists():
        die(f"CSV introuvable : {csv_path}")

    existing: set[str] = set()
    if args.skip_existing and not args.dry_run:
        print("→ Récupération des produits existants...")
        existing = list_existing_handles(args.store, args.token)
        print(f"  {len(existing)} produit(s) déjà présent(s).")

    created, skipped, failed = 0, 0, 0
    with csv_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, 1):
            handle = (row.get("Handle") or "").strip()
            title = (row.get("Title") or "").strip()
            if not handle or not title:
                continue

            if args.skip_existing and handle in existing:
                print(f"  [{i:>2}] SKIP  {handle} (déjà existant)")
                skipped += 1
                continue

            payload = row_to_product_payload(row)
            if args.dry_run:
                print(f"  [{i:>2}] DRY   {handle} — {title}")
                created += 1
                continue

            ok, info = create_product(args.store, args.token, payload)
            if ok:
                print(f"  [{i:>2}] OK    {info}")
                created += 1
            else:
                print(f"  [{i:>2}] FAIL  {handle} → {info}")
                failed += 1
            # Rate-limit courtois : 2 req/s (limite gratuite = 2 leak/s sur Shopify REST)
            time.sleep(0.6)

    print()
    print(f"Résumé : créés={created}  ignorés={skipped}  échecs={failed}")


if __name__ == "__main__":
    main()
