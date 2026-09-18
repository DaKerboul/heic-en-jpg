// Worker d'encodage : boucle de compression JPEG/PNG + assemblage ZIP
// hors du thread principal. Zéro DOM (OffscreenCanvas uniquement).
// Toute erreur => le client rebascule sur le chemin main-thread.
import JSZip from 'jszip';

type EncodeReq = {
  id: number;
  op: 'encode';
  bitmap: ImageBitmap;
  mime: 'image/jpeg' | 'image/png';
  maxBytes: number;
  maxEdge: number;
  qualityCap: number;
  cropRatio: number;
};

type ZipReq = { id: number; op: 'zip'; files: { name: string; blob: Blob }[] };

function offscreen(w: number, h: number): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Contexte 2D indisponible dans le worker');
  return [canvas, ctx as OffscreenCanvasRenderingContext2D];
}

async function raster(bitmap: ImageBitmap, w: number, h: number, mime: string, quality?: number): Promise<Blob> {
  const [canvas, ctx] = offscreen(w, h);
  (ctx as unknown as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: mime, quality });
  if (!blob) throw new Error('Encodage worker impossible');
  return blob;
}

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

async function handleEncode(req: EncodeReq) {
  let src = req.bitmap;
  if (req.cropRatio > 0) {
    src = await centerCrop(req.bitmap, req.cropRatio);
    req.bitmap.close();
  }
  const edges = [req.maxEdge > 0 ? Math.min(req.maxEdge, Math.max(src.width, src.height)) : Math.max(src.width, src.height), 1920, 1280, 960]
    .filter((e, i, a) => e > 0 && a.indexOf(e) === i)
    .sort((a, b) => b - a);
  const qualities = [req.qualityCap, 0.85, 0.78, 0.7, 0.62, 0.55].filter((q, i, a) => q <= req.qualityCap + 1e-9 && a.indexOf(q) === i);

  const finish = (blob: Blob, quality: number, width: number, height: number, capped: boolean) => {
    src.close();
    return { blob, quality, width, height, capped };
  };

  if (!Number.isFinite(req.maxBytes)) {
    const scale = edges[0] / Math.max(src.width, src.height);
    const w = Math.round(src.width * scale);
    const h = Math.round(src.height * scale);
    const blob = await raster(src, w, h, req.mime, req.mime === 'image/png' ? undefined : req.qualityCap);
    return finish(blob, req.qualityCap, w, h, false);
  }

  for (const edge of edges) {
    if (edge > Math.max(src.width, src.height)) continue;
    const scale = Math.min(1, edge / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    for (const q of qualities) {
      const blob = await raster(src, w, h, req.mime, q);
      if (blob.size <= req.maxBytes) return finish(blob, q, w, h, false);
    }
  }
  const w = 960;
  const h = Math.max(1, Math.round((960 * src.height) / src.width));
  const blob = await raster(src, w, h, req.mime, 0.5);
  return finish(blob, 0.5, w, h, blob.size > req.maxBytes);
}

async function handleZip(req: ZipReq): Promise<Blob> {
  const zip = new JSZip();
  for (const f of req.files) zip.file(f.name, f.blob);
  return await zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

self.onmessage = async (e: MessageEvent<EncodeReq | ZipReq>) => {
  const req = e.data;
  try {
    if (typeof OffscreenCanvas === 'undefined') throw new Error('OffscreenCanvas indisponible');
    if (req.op === 'encode') {
      const r = await handleEncode(req);
      (self as unknown as Worker).postMessage({ id: req.id, ok: true, ...r });
    } else {
      const blob = await handleZip(req);
      (self as unknown as Worker).postMessage({ id: req.id, ok: true, blob });
    }
  } catch (err) {
    try {
      (req as EncodeReq).bitmap?.close?.();
    } catch { /* ignore */ }
    (self as unknown as Worker).postMessage({ id: req.id, ok: false, error: err instanceof Error ? err.message : 'Erreur worker' });
  }
};
