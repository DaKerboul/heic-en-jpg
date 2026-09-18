import { PDFDocument } from 'pdf-lib';
import { fileToBitmap } from './image';
import type { PdfOrientation, PdfPageSize } from './constants';

export type PdfOptions = {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  quality: number;
  margin?: number;
  onProgress?: (done: number, total: number) => void;
};

const SIZES: Record<Exclude<PdfPageSize, 'auto'>, { w: number; h: number }> = {
  a4: { w: 595, h: 842 },
  letter: { w: 612, h: 792 },
};

// 1 image = 1 page, image fit + centrée. WebP/AVIF/GIF/HEIC-décodé normalisés en JPEG via Canvas
// car pdf-lib n'embed nativement que JPG/PNG.
export async function imagesToPdf(files: (File | Blob)[], opts: PdfOptions): Promise<Uint8Array> {
  const { pageSize, orientation, quality, margin = 30, onProgress } = opts;
  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Chemin rapide : JPEG/PNG déjà conformes embarqués tels quels
    // (pas de recompression Canvas = plus vite, zéro perte).
    let embedded;
    try {
      if (file instanceof File && file.type === 'image/jpeg') {
        embedded = await pdfDoc.embedJpg(new Uint8Array(await file.arrayBuffer()));
      } else if (file instanceof File && file.type === 'image/png') {
        embedded = await pdfDoc.embedPng(new Uint8Array(await file.arrayBuffer()));
      }
    } catch {
      embedded = undefined; // repli : normalisation Canvas ci-dessous
    }
    if (!embedded) {
      const bitmap = await fileToBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      const jpgBytes = new Uint8Array(
        await new Promise<ArrayBuffer>((resolve, reject) => {
          canvas.toBlob(async (b) => {
            if (!b) return reject(new Error('Encodage PDF impossible'));
            resolve(await b.arrayBuffer());
          }, 'image/jpeg', quality);
        }),
      );
      embedded = await pdfDoc.embedJpg(jpgBytes);
      bitmap.close?.();
    }

    let pageW: number;
    let pageH: number;
    if (pageSize === 'auto') {
      // 96 DPI : 1 px ≈ 0.75 pt
      pageW = embedded.width * 0.75 + margin * 2;
      pageH = embedded.height * 0.75 + margin * 2;
    } else {
      const base = SIZES[pageSize];
      const landscape = orientation === 'paysage' || (orientation === 'auto' && embedded.width > embedded.height);
      // En mode auto on garde le portrait sauf image très panoramique en paysage explicite
      pageW = orientation === 'paysage' ? Math.max(base.w, base.h) : orientation === 'portrait' ? Math.min(base.w, base.h) : landscape ? Math.max(base.w, base.h) : base.w;
      pageH = orientation === 'paysage' ? Math.min(base.w, base.h) : orientation === 'portrait' ? Math.max(base.w, base.h) : landscape ? Math.min(base.w, base.h) : base.h;
      // Si auto + paysage détecté, on inverse réellement
      if (orientation === 'auto' && embedded.width > embedded.height) {
        pageW = Math.max(pageW, pageH);
        pageH = Math.min(pageW, pageH);
        if (pageW < pageH) [pageW, pageH] = [pageH, pageW];
      }
    }

    const page = pdfDoc.addPage([pageW, pageH]);
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    page.drawImage(embedded, { x: margin + (maxW - w) / 2, y: margin + (maxH - h) / 2, width: w, height: h });
    onProgress?.(i + 1, files.length);
  }
  return await pdfDoc.save();
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugFilename(name: string, fallback = 'documents'): string {
  const clean = name.trim().replace(/\.[a-z0-9]+$/i, '').replace(/[^\w\-àâäéèêëîïôöùûüçñ]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return clean || fallback;
}
