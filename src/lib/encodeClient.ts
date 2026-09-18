// Client du worker d'encodage : tente le off-thread, rebascule
// silencieusement sur le main-thread en cas d'indisponibilité/erreur.
// Annulation = terminaison du worker (recelui-ci est recréé paresseusement).
import { bitmapToBlob, fileToBitmap } from './image';
import { compressBitmapUnder } from './compress';

export type CompressResult = Awaited<ReturnType<typeof compressBitmapUnder>>;

export type WorkerEncodeOpts = {
  mime: 'image/jpeg' | 'image/png';
  maxBytes: number;
  maxEdge?: number;
  qualityCap?: number;
  cropRatio?: number;
};

type Pending = {
  resolve: (v: never) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();
let workerBroken = false;

export function workerAvailable(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

function getWorker(): Worker | null {
  if (workerBroken || !workerAvailable()) return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('../workers/encode.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent) => {
        const { id, ok, error, ...rest } = e.data as { id: number; ok: boolean; error?: string };
        const p = pending.get(id);
        if (!p) return;
        pending.delete(id);
        clearTimeout(p.timer);
        if (ok) p.resolve(rest as never);
        else p.reject(new Error(error || 'Erreur worker'));
      };
      worker.onerror = () => {
        workerBroken = true;
        for (const [, p] of pending) {
          clearTimeout(p.timer);
          p.reject(new Error('Worker terminé anormalement'));
        }
        pending.clear();
        killWorker();
      };
    } catch {
      workerBroken = true;
      return null;
    }
  }
  return worker;
}

export function cancelWorker() {
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.reject(new Error('ANNULE'));
  }
  pending.clear();
  killWorker();
}

function killWorker() {
  try {
    worker?.terminate();
  } catch { /* ignore */ }
  worker = null;
}

function call<T>(msg: Record<string, unknown>, transfer: Transferable[], timeoutMs = 90_000): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error('Worker indisponible'));
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      workerBroken = true;
      killWorker();
      reject(new Error('Worker trop lent, repli main-thread'));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (v: never) => void, reject, timer });
    try {
      w.postMessage({ ...msg, id }, transfer);
    } catch (e) {
      pending.delete(id);
      clearTimeout(timer);
      reject(e instanceof Error ? e : new Error('postMessage impossible'));
    }
  });
}

// Compression via worker si possible, sinon main-thread.
// Le bitmap d'origine est conservé : on transfère une copie.
export async function compressSmart(
  bitmap: ImageBitmap,
  mime: 'image/jpeg' | 'image/png',
  maxBytes: number,
  opts: { maxEdge?: number; qualityCap?: number; cropRatio?: number } = {},
): Promise<CompressResult & { viaWorker: boolean }> {
  const w = getWorker();
  if (w && mime === 'image/jpeg') {
    try {
      const copy = await createImageBitmap(bitmap);
      const r = await call<CompressResult>(
        {
          op: 'encode',
          bitmap: copy,
          mime,
          maxBytes,
          maxEdge: opts.maxEdge ?? 0,
          qualityCap: opts.qualityCap ?? 0.92,
          cropRatio: opts.cropRatio ?? 0,
        },
        [copy],
      );
      return { ...r, viaWorker: true };
    } catch {
      // repli main-thread ci-dessous
    }
  }
  if (mime === 'image/png') {
    const blob = await bitmapToBlob(bitmap, 'image/png');
    return { blob, quality: 1, width: bitmap.width, height: bitmap.height, capped: false, viaWorker: false };
  }
  const r = await compressBitmapUnder(bitmap, 'image/jpeg', maxBytes, opts);
  return { ...r, viaWorker: false };
}

export async function zipSmart(files: { name: string; blob: Blob }[]): Promise<{ blob: Blob; viaWorker: boolean }> {
  const w = getWorker();
  if (w) {
    try {
      const r = await call<{ blob: Blob }>({ op: 'zip', files }, [], 60_000);
      return { blob: r.blob, viaWorker: true };
    } catch {
      // repli main-thread
    }
  }
  const { downloadAsZipBlob } = await import('./zip');
  return { blob: await downloadAsZipBlob(files), viaWorker: false };
}

export { fileToBitmap };
