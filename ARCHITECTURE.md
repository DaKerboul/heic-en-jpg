# ARCHITECTURE

## Stack

Astro 7 statique + Preact (îlot `ConverterIsland`, `client:visible`) + Tailwind v4.
`dist/` = HTML/CSS/JS + chunks lazy. Mini-backend : `functions/api/feedback.ts` (edge).

## Pipeline de conversion (`src/components/converter/useConverter.ts`)

```
dépôt (DnD / input / Ctrl+V)
  → validation (25 Mo, extensions, magic bytes HEIC)
  → miniature 640 px (si affichable)
  → [JPG/PNG] décodage → ImageBitmap (correction EXIF via exifr)
      → compressSmart : worker si dispo, sinon main-thread
      → boucle qualité (cap → 0.55) + downscale (1920 → 960) jusqu'au seuil
      → [option] recadrage 35/45 centré (identité, cap 531 px)
  → [PDF] normalisation HEIC→JPEG, embed direct si JPEG/PNG déjà conforme,
      sinon Canvas → pdf-lib (A4/Lettre/Auto, marges, ordre = liste)
  → téléchargement unitaire ou ZIP (worker si dispo)
```

- **Séquentiel** (`for…await`, jamais `Promise.all`) : un HEIC 48 MP = ~190 Mo
  décompressés ; le parallélisme tuerait l'onglet mobile.
- **Annulation** : flag entre fichiers + `worker.terminate()` (recréé paresseusement).
- **Erreurs typées** (`lib/errors.ts`) : `TROP_LOURD`, `HEIC_NON_SUPPORTE` (+ conseil
  iPhone), `LECTURE_IMPOSSIBLE`, `ENCODAGE_IMPOSSIBLE`, `ANNULE`.

## Worker (`src/workers/encode.worker.ts` + `src/lib/encodeClient.ts`)

- Off-thread : boucle JPEG multi-essais (le vrai jank : jusqu'à 24 encodages) + ZIP.
- Main-thread conservé : décodage HEIC (`heic-to`, DOM), EXIF, PDF (progressif).
- Repli automatique : copie du bitmap transférée (original gardé), timeout 60-90 s,
  `OffscreenCanvas`/`Worker` détectés. Safari < 16.4 → main-thread direct.
- Piste future : décodage HEIC en worker via l'entrée `heic-to/next`.

## Code-splitting (vérifié au build)

| Chunk | Taille | Chargement |
|---|---|---|
| `ConverterIsland` | ~43 Ko | à l'apparition |
| `heic-to` (libheif WASM) | ~2,9 Mo | 1er HEIC + préchargement idle |
| `pdf` (pdf-lib) | ~412 Ko | 1er PDF |
| `zip` (JSZip) | ~94 Ko | 1er ZIP |
| `encode.worker` | ~98 Ko | 1re compression |

## Fichiers clés

- `lib/heic.ts` — détection magic bytes `ftyp`, lazy-load décodeur.
- `lib/image.ts` — `fileToBitmap` (EXIF), `blobToThumbUrl` (aperçus légers),
  `renameWithExt`, `batchName` (lot `préfixe-01…`).
- `lib/compress.ts` — seuils + `centerCrop` + `gainPct`.
- `lib/pdf.ts` — embed direct JPEG/PNG, progression par page, `slugFilename`.
- `lib/i18n.ts` — strings FR de l'UI dynamique (base d'une future EN).
- `components/converter/` — `model` (types + prefs `localStorage`),
  `useConverter` (état + pipeline), `Dropzone`, `FileList` (liste/grille + DnD),
  `SettingsPanel`, `CompareModal` (clip-path), `Toasts`, `icons`.

## Limites honnêtes

- HEIC portrait/profondeur, rafales, non-Apple : échec possible → erreur par fichier,
  lot non bloqué, formulaire de signalement (texte uniquement).
- PNG = sans perte : souvent plus lourd que l'original (normal).
- `Details` natifs pour la FAQ (zéro JS, SEO-friendly).

## Dette / next

- Extraire les strings statiques JSX vers `i18n.ts` pour la version EN.
- `heic-to/next` en worker pour le décodage aussi.
- Lighthouse CI + budget de chunk initial.
