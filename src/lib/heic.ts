// Détection HEIC robuste : magic bytes ftyp + marque, pas seulement l'extension.
export async function isHeicFile(file: File | Blob): Promise<boolean> {
  const name = (file as File).name?.toLowerCase() ?? '';
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  if (name.endsWith('.heic') || name.endsWith('.heif')) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ascii = String.fromCharCode(...head);
    return ascii.slice(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1/.test(ascii);
  } catch {
    return false;
  }
}

// Lazy-load du décodeur WASM : téléchargé uniquement à la 1re conversion HEIC.
export async function decodeHeicToBlob(blob: Blob, toType: 'image/jpeg' | 'image/png', quality = 0.9): Promise<Blob> {
  const { heicTo } = await import('heic-to');
  const out = await heicTo({ blob, type: toType === 'image/jpeg' ? 'image/jpeg' : 'image/png', quality } as never);
  const first = Array.isArray(out) ? out[0] : out;
  if (first instanceof Blob) return first;
  // certains builds retournent un ImageBitmap : raster via canvas
  const bmp = first as ImageBitmap;
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  const result = await new Promise<Blob | null>((res) => canvas.toBlob(res, toType, quality));
  if (!result) throw new Error('Encodage canvas impossible');
  return result;
}
