import * as exifr from 'exifr';

// Décode n'importe quel format affichable par le navigateur en ImageBitmap,
// en corrigeant l'orientation EXIF (photos téléphone sinon à l'envers).
export async function fileToBitmap(file: File | Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Lecture image impossible (${(file as File).name ?? 'fichier'})`));
      img.src = url;
    });
    let angle = 0;
    let flipH = false;
    try {
      const o = await exifr.orientation(file as unknown as Blob).catch(() => 1);
      const v = typeof o === 'number' ? o : 1;
      if (v === 3) angle = 180;
      else if (v === 6) angle = 90;
      else if (v === 8) angle = 270;
      else if (v === 2) flipH = true;
    } catch { /* pas d'EXIF : on garde tel quel */ }

    if (!angle && !flipH) return await createImageBitmap(img);

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const swap = angle === 90 || angle === 270;
    const canvas = document.createElement('canvas');
    canvas.width = swap ? h : w;
    canvas.height = swap ? w : h;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (angle) ctx.rotate((angle * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function bitmapToBlob(bitmap: ImageBitmap, type: 'image/jpeg' | 'image/png', quality = 0.92): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export canvas impossible'))), type, quality);
  });
}

export function renameWithExt(name: string, ext: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[^\w\-àâäéèêëîïôöùûüçñ ]+/gi, '-');
  return `${base || 'image-convertie'}.${ext}`;
}

// Miniature légère (~112 px) pour les aperçus : évite de garder
// des object URL pleine résolution (plusieurs Mo) en mémoire.
export async function blobToThumbUrl(blob: Blob, size = 112): Promise<{ url: string; width: number; height: number }> {
  const bitmap = await fileToBitmap(blob).catch(() => null);
  if (!bitmap) throw new Error('Miniature impossible');
  try {
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    const thumb = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.7));
    if (!thumb) throw new Error('Miniature impossible');
    return { url: URL.createObjectURL(thumb), width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close?.();
  }
}

// Renommage par lot : préfixe + numéro (ex : caf-dossier-01.jpg).
export function batchName(prefix: string, index: number, total: number, ext: string): string {
  const clean = prefix.trim().replace(/[^\w\-àâäéèêëîïôöùûüçñ]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const pad = String(total).length;
  const num = String(index + 1).padStart(pad, '0');
  return `${clean || 'image'}-${num}.${ext}`;
}
