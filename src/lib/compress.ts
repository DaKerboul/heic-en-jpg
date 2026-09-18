// Compression sous un seuil d'octets : dichotomie qualité + downscale progressif.
// 100% local (Canvas), sans backend.
//
// maxEdge : borne supérieure du plus grand côté (0 = origine).
// qualityCap : qualité JPEG max de départ (curseur utilisateur).
// cropRatio : recadrage centré préalable (ex : 35/45 pour photo d'identité).
export async function compressBitmapUnder(
  bitmap: ImageBitmap,
  mime: 'image/jpeg' | 'image/png',
  maxBytes: number,
  opts: { maxEdge?: number; qualityCap?: number; cropRatio?: number } = {},
): Promise<{ blob: Blob; quality: number; width: number; height: number; capped: boolean }> {
  const { maxEdge = 0, qualityCap = 0.92, cropRatio = 0 } = opts;
  const src = cropRatio > 0 ? await centerCrop(bitmap, cropRatio) : bitmap;
  if (src !== bitmap) bitmap.close?.();
  const startEdge = maxEdge > 0 ? Math.min(maxEdge, Math.max(src.width, src.height)) : Math.max(src.width, src.height);

  if (!Number.isFinite(maxBytes)) {
    const scale = startEdge / Math.max(src.width, src.height);
    const w = Math.round(src.width * scale);
    const h = Math.round(src.height * scale);
    const blob = await raster(src, w, h, mime, mime === 'image/png' ? undefined : qualityCap);
    return { blob, quality: qualityCap, width: w, height: h, capped: false };
  }

  const edges = [startEdge, 1920, 1280, 960].filter((e, i, a) => e > 0 && a.indexOf(e) === i).sort((a, b) => b - a);
  const qualities = [qualityCap, 0.85, 0.78, 0.7, 0.62, 0.55].filter((q, i, a) => q <= qualityCap + 1e-9 && a.indexOf(q) === i);

  for (const edge of edges) {
    if (edge > Math.max(src.width, src.height)) continue;
    const scale = Math.min(1, edge / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    for (const q of qualities) {
      const blob = await raster(src, w, h, mime, q);
      if (blob.size <= maxBytes) return { blob, quality: q, width: w, height: h, capped: false };
    }
  }
  // Dernier recours : plus petite taille acceptée même si > seuil (signalé capped dans l'UI)
  const w = 960;
  const h = Math.max(1, Math.round((960 * src.height) / src.width));
  const blob = await raster(src, w, h, mime, 0.5);
  return { blob, quality: 0.5, width: w, height: h, capped: blob.size > maxBytes };
}

// Recadrage centré au ratio w/h demandé (ex : 35/45 photo d'identité).
async function centerCrop(bitmap: ImageBitmap, ratio: number): Promise<ImageBitmap> {
  const current = bitmap.width / bitmap.height;
  let cw = bitmap.width;
  let ch = bitmap.height;
  if (current > ratio) cw = Math.round(bitmap.height * ratio);
  else ch = Math.round(bitmap.width / ratio);
  const sx = Math.round((bitmap.width - cw) / 2);
  const sy = Math.round((bitmap.height - ch) / 2);
  return await createImageBitmap(bitmap, sx, sy, cw, ch);
}

function raster(bitmap: ImageBitmap, w: number, h: number, mime: string, quality?: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression impossible'))), mime, quality);
  });
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

export function gainPct(before: number, after: number): string {
  if (!before) return '—';
  const g = Math.round((1 - after / before) * 100);
  return g >= 0 ? `−${g} %` : `+${Math.abs(g)} %`;
}
