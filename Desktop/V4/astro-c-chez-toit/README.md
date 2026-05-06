# astro-c-chez-toit

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
