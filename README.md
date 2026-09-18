# Convertisseur Local — HEIC & WebP → JPG / PDF

Convertisseur d'images **100 % local** (navigateur) : HEIC, WebP, PNG, JPG, AVIF, GIF, BMP
vers **JPG**, **PNG** ou **PDF multipage**, avec réduction automatique sous 2 Mo
(presets ANTS / CAF / Ameli). Aucun compte, aucun envoi serveur.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # vitest (11 tests)
npm run build    # site statique dans dist/
npm run preview  # prévisualiser le build
```

## Déployer

Sortie 100 % statique (`dist/`) : Cloudflare Pages, Vercel, Netlify…

1. Remplace `https://convertisseur-local.fr` par ton domaine dans :
   - `src/lib/site.ts` (`SITE_URL`)
   - `public/sitemap.xml` et `public/robots.txt`
2. `npm run build` → publie `dist/`.
3. Les en-têtes de `public/_headers` sont repris par Cloudflare Pages / Netlify.
   Sur Vercel, reporte-les dans `vercel.json` (même CSP avec `'wasm-unsafe-eval'`).

## Confidentialité (promesse produit)

- Pipeline : `File → WebAssembly/Canvas → Blob → téléchargement`. Zéro endpoint d'upload.
- Seul appel réseau : `POST /api/feedback` (texte anonyme, 2000 car. max, rate-limit 5/min).
- Pas de cookie traceur, pas de compte. Les préférences UI sont en `localStorage`
  (`conv-prefs-v1`, `conv-theme`) — jamais les fichiers.
- Preuve : onglet réseau à 0 requête pendant la conversion, ou Wi-Fi coupé après chargement.

Voir `ARCHITECTURE.md` pour le pipeline, le worker et les limites connues.
