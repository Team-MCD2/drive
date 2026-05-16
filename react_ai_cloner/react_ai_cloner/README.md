# React AI Cloner

## Installation

```bash
npm install
```

## Modifier la cible

Dans :

```bash
server/crawl-site.js
```

Change :

```js
const TARGET = "https://example.com";
```

Par le site que tu veux analyser.

---

## Lancer le cloneur

```bash
npm run crawl
```

---

## Résultat

Les pages React générées seront dans :

```bash
generated/src/pages
```

---

## Fonctionnalités

- Crawl automatique
- Détection framework
- Conversion HTML → JSX
- Génération pages React
- Analyse React / Shopify / WordPress / Vue
- Support sites dynamiques avec Puppeteer
