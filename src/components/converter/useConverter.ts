import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { MAX_FILES, MAX_INPUT_BYTES, PRESETS } from '../../lib/constants';
import { ACCEPT_EXTENSIONS } from '../../lib/site';
import { fr } from '../../lib/i18n';
import { ConversionError, errorMessage } from '../../lib/errors';
import { decodeHeicToBlob, isHeicFile } from '../../lib/heic';
import { batchName, blobToThumbUrl, fileToBitmap, renameWithExt } from '../../lib/image';
import { formatBytes, gainPct } from '../../lib/compress';
import { cancelWorker, compressSmart, zipSmart } from '../../lib/encodeClient';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Item, type Prefs, type Toast } from './model';

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? `.${m[1]}` : '';
}

let toastSeq = 0;
let itemSeq = 0;

export function useConverter() {
  const [prefs, setPrefsState] = useState<Prefs>(() => (typeof localStorage !== 'undefined' ? loadPrefs() : DEFAULT_PREFS));
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [globalPct, setGlobalPct] = useState(0);
  const [statusLine, setStatusLine] = useState('');
  const [pdfInfo, setPdfInfo] = useState<{ size: number } | null>(null);
  const [decoderLoading, setDecoderLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const cancelRef = useRef(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const pushToast = useCallback((kind: Toast['kind'], msg: string) => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // Statut réseau + SW (badge "prêt hors-ligne").
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((r) => setOfflineReady(!!r?.active));
      navigator.serviceWorker.ready.then(() => setOfflineReady(true)).catch(() => undefined);
    }
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Préchargement du décodeur HEIC quand le navigateur est inactif :
  // la 1re conversion HEIC devient instantanée.
  useEffect(() => {
    const warm = () => import('heic-to').catch(() => undefined);
    if ('requestIdleCallback' in window) {
      const h = (window as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(warm, { timeout: 8000 });
      return () => (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback?.(h);
    }
    const t = setTimeout(warm, 5000);
    return () => clearTimeout(t);
  }, []);

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  // Miniatures d'entrée (displayables uniquement) générées après ajout.
  const thumbInput = useCallback(
    (id: string, file: File) => {
      if (!file.type.startsWith('image/') || /heic|heif/.test(file.type)) return;
      blobToThumbUrl(file, 640)
        .then(({ url, width, height }) => patch(id, { origPreview: url, origW: width, origH: height }))
        .catch(() => undefined);
    },
    [patch],
  );

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list);
      const good: File[] = [];
      const bad: string[] = [];
      for (const f of incoming) {
        if (f.size > MAX_INPUT_BYTES) {
          bad.push(`${f.name} — ${fr.tooHeavy(formatBytes(f.size))}`);
          continue;
        }
        const ext = extOf(f.name);
        const typeOk = f.type.startsWith('image/') || f.type === '' || /heic|heif/.test(f.type);
        if (ext && !ACCEPT_EXTENSIONS.includes(ext as never) && !typeOk) {
          bad.push(`${f.name} — ${fr.unsupported}`);
          continue;
        }
        good.push(f);
      }
      if (bad.length) {
        setRejected((r) => [...bad, ...r].slice(0, 5));
        pushToast('erreur', `${bad.length} fichier${bad.length > 1 ? 's' : ''} refusé${bad.length > 1 ? 's' : ''} — détail sous la zone de dépôt.`);
      }
      if (!good.length) return;
      const room = Math.max(0, MAX_FILES - items.length);
      if (good.length > room) pushToast('info', fr.limitReached(MAX_FILES, room));
      const fresh: Item[] = good.slice(0, room).map((file) => ({
        id: `${Date.now()}-${itemSeq++}-${file.name}`,
        file,
        status: 'attente' as const,
        pct: 0,
        detail: `${fr.status.attente} · ${formatBytes(file.size)}`,
      }));
      setItems((prev) => [...prev, ...fresh]);
      setPdfInfo(null);
      fresh.forEach((it) => thumbInput(it.id, it.file));
    },
    [items.length, pushToast, thumbInput],
  );

  // Coller depuis le presse-papiers (idéal captures d'écran).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const removeOne = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      if (it?.origPreview) URL.revokeObjectURL(it.origPreview);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => {
        if (it.preview) URL.revokeObjectURL(it.preview);
        if (it.origPreview) URL.revokeObjectURL(it.origPreview);
      });
      return [];
    });
    setRejected([]);
    setStatusLine('');
    setGlobalPct(0);
    setPdfInfo(null);
    setCompareId(null);
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  }, []);

  const reorder = useCallback((dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [m] = copy.splice(from, 1);
      copy.splice(to, 0, m);
      return copy;
    });
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    cancelWorker();
  }, []);

  const downloadBlob = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, []);

  const outNameFor = useCallback((fileName: string, index: number, total: number, ext: string, prefix: string) => {
    return prefix.trim() ? batchName(prefix, index, total, ext) : renameWithExt(fileName, ext);
  }, []);

  const convertAll = useCallback(async () => {
    const p = prefsRef.current;
    if (busy) return;
    // Snapshot d'état local (évite les lectures périmées pendant la boucle).
    let snapshot: Item[] = [];
    setItems((prev) => {
      snapshot = [...prev];
      return prev;
    });
    if (!snapshot.length) return;
    cancelRef.current = false;
    setBusy(true);
    setPdfInfo(null);
    const preset = PRESETS[p.presetId];
    const total = snapshot.length;
    let done = 0;
    const tick = () => setGlobalPct(Math.round((done / total) * 100));
    const cancelled = () => cancelRef.current;

    const setSnap = (id: string, u: Partial<Item>) => {
      snapshot = snapshot.map((it) => (it.id === id ? { ...it, ...u } : it));
      patch(id, u);
    };
    const paint = () => new Promise((r) => setTimeout(r, 0));

    try {
      if (p.format === 'pdf') {
        setStatusLine(fr.preparing);
        const normalized: File[] = [];
        const order: string[] = [];
        for (const it of snapshot) {
          if (cancelled()) throw new ConversionError('ANNULE', fr.cancelled);
          setSnap(it.id, { status: 'conversion', pct: 10, detail: fr.detail.reading });
          await paint();
          try {
            if (await isHeicFile(it.file)) {
              setDecoderLoading(true);
              const jpg = await decodeHeicToBlob(it.file, 'image/jpeg', 0.9);
              normalized.push(new File([jpg], renameWithExt(it.file.name, 'jpg'), { type: 'image/jpeg' }));
            } else {
              normalized.push(it.file);
            }
            setSnap(it.id, { pct: 60, detail: fr.detail.pdfReady });
          } catch (e) {
            setSnap(it.id, { status: 'erreur', pct: 0, detail: errorMessage(e).message });
            continue;
          }
          order.push(it.id);
          done++;
          tick();
          await paint();
        }
        const validInputs: File[] = [];
        const successIds: string[] = [];
        for (const id of order) {
          const nIdx = order.indexOf(id);
          if (normalized[nIdx]) {
            validInputs.push(normalized[nIdx]);
            successIds.push(id);
          }
        }
        if (cancelled()) throw new ConversionError('ANNULE', fr.cancelled);
        if (!validInputs.length) throw new ConversionError('LECTURE_IMPOSSIBLE', fr.emptyPdf);
        setStatusLine(fr.generatingPdf);
        const { imagesToPdf, downloadBytes, slugFilename } = await import('../../lib/pdf');
        const name = `${slugFilename(p.pdfName)}.pdf`;
        let quality = p.pdfQuality;
        const onProgress = (d: number, t: number) => {
          setGlobalPct(Math.round(((done + d / Math.max(1, t)) / (total + 1)) * 100));
          setStatusLine(`Page ${d}/${t}…`);
        };
        let bytes = await imagesToPdf(validInputs, { pageSize: p.pdfPage, orientation: p.pdfOrientation, quality, onProgress });
        if (Number.isFinite(preset.maxBytes)) {
          for (const q of [0.7, 0.55]) {
            if (cancelled() || bytes.length <= preset.maxBytes) break;
            quality = q;
            bytes = await imagesToPdf(validInputs, { pageSize: p.pdfPage, orientation: p.pdfOrientation, quality, onProgress });
          }
        }
        if (cancelled()) throw new ConversionError('ANNULE', fr.cancelled);
        setPdfInfo({ size: bytes.length });
        downloadBytes(bytes, name, 'application/pdf');
        for (const id of successIds) setSnap(id, { status: 'ok', pct: 100, detail: fr.detail.inPdf });
        setGlobalPct(100);
        if (bytes.length <= preset.maxBytes || !Number.isFinite(preset.maxBytes)) {
          setStatusLine(`PDF généré : ${formatBytes(bytes.length)} · ${validInputs.length} page${validInputs.length > 1 ? 's' : ''} · téléchargement lancé.`);
          pushToast('ok', `PDF ${name} téléchargé (${formatBytes(bytes.length)}).`);
        } else {
          setStatusLine(`PDF ${formatBytes(bytes.length)} > ${formatBytes(preset.maxBytes)} : retirez des images ou baissez la qualité.`);
          pushToast('erreur', 'PDF au-dessus de la limite : réduisez le nombre d’images.');
        }
      } else {
        const mime = p.format === 'png' ? 'image/png' : 'image/jpeg';
        const ext = p.format === 'png' ? 'png' : 'jpg';
        const cropRatio = p.cropIdentite && p.format === 'jpeg' ? 35 / 45 : 0;
        const edge = p.cropIdentite ? (p.maxEdge > 0 ? Math.min(p.maxEdge, 531) : 531) : p.maxEdge;
        for (let i = 0; i < snapshot.length; i++) {
          const it = snapshot[i];
          if (cancelled()) throw new ConversionError('ANNULE', fr.cancelled);
          const cur = snapshot.find((x) => x.id === it.id);
          if (cur?.status === 'ok' && cur.outBlob) {
            done++;
            tick();
            continue;
          }
          setSnap(it.id, { status: 'conversion', pct: 8, detail: fr.detail.reading });
          setStatusLine(`Conversion ${done + 1}/${total} : ${it.file.name}`);
          await paint();
          try {
            let bitmap: ImageBitmap;
            if (await isHeicFile(it.file)) {
              if (cancelled()) throw new ConversionError('ANNULE', fr.cancelled);
              setDecoderLoading(true);
              setSnap(it.id, { pct: 25, detail: fr.detail.heicDecoding });
              const decoded = await decodeHeicToBlob(it.file, mime, 0.9);
              if (cancelled()) {
                throw new ConversionError('ANNULE', fr.cancelled);
              }
              // Aperçu de l'original décodé (sert au comparateur avant/après).
              blobToThumbUrl(decoded, 640)
                .then(({ url, width, height }) => setSnap(it.id, { origPreview: url, origW: width, origH: height }))
                .catch(() => undefined);
              setSnap(it.id, { pct: 55, detail: fr.detail.rendering });
              await paint();
              bitmap = await fileToBitmap(decoded);
            } else {
              setSnap(it.id, { pct: 35, detail: fr.detail.decoding });
              bitmap = await fileToBitmap(it.file);
            }
            if (cancelled()) {
              bitmap.close?.();
              throw new ConversionError('ANNULE', fr.cancelled);
            }
            setSnap(it.id, { pct: 70, detail: p.format === 'png' ? fr.detail.pngEncoding : fr.detail.jpegEncoding(p.jpegQuality) });
            await paint();
            // Encodage via worker si possible (repli main-thread automatique).
            const r = await compressSmart(bitmap, mime, p.format === 'png' ? Infinity : preset.maxBytes, {
              maxEdge: edge,
              qualityCap: p.jpegQuality,
              cropRatio,
            });
            bitmap.close?.();
            if (cancelled()) throw new ConversionError('ANNULE', fr.cancelled);
            const outName = outNameFor(it.file.name, i, total, ext, p.prefix);
            const { url } = await blobToThumbUrl(r.blob, 640).catch(() => ({ url: '', width: 0, height: 0 }));
            setSnap(it.id, {
              status: 'ok',
              pct: 100,
              outBlob: r.blob,
              outBytes: r.blob.size,
              outName,
              outW: r.width,
              outH: r.height,
              preview: url || undefined,
              detail: `${formatBytes(it.file.size)} → ${formatBytes(r.blob.size)}${r.viaWorker ? '' : ''}`,
              gain: gainPct(it.file.size, r.blob.size),
            });
            if (p.format === 'jpeg' && Number.isFinite(preset.maxBytes) && r.capped) {
              pushToast('erreur', `${it.file.name} reste à ${formatBytes(r.blob.size)} (> ${formatBytes(preset.maxBytes)}).`);
            }
          } catch (e) {
            if (e instanceof ConversionError && e.code === 'ANNULE') throw e;
            setSnap(it.id, { status: 'erreur', pct: 0, detail: errorMessage(e).message });
          }
          done++;
          tick();
        }
        setStatusLine(fr.done);
        pushToast('ok', 'Conversion terminée.');
      }
    } catch (e) {
      if (e instanceof ConversionError && e.code === 'ANNULE') {
        setStatusLine(fr.cancelled);
        setItems((prev) => prev.map((it) => (it.status === 'conversion' ? { ...it, status: 'attente', pct: 0, detail: `${fr.status.attente} · ${formatBytes(it.file.size)}` } : it)));
      } else {
        const msg = errorMessage(e).message;
        setStatusLine(msg);
        pushToast('erreur', msg);
      }
    } finally {
      cancelRef.current = false;
      setBusy(false);
      setDecoderLoading(false);
    }
  }, [busy, outNameFor, patch, pushToast]);

  const downloadZip = useCallback(async () => {
    const p = prefsRef.current;
    const ok = items.filter((it) => it.outBlob && it.outName);
    if (!ok.length || busy) return;
    setStatusLine(fr.zipping);
    const { blob } = await zipSmart(ok.map((it) => ({ name: it.outName!, blob: it.outBlob! })));
    const clean = p.zipName.trim().replace(/[^\w\-]+/gi, '-').replace(/-+/g, '-') || 'images-converties';
    downloadBlob(blob, `${clean}.zip`);
    setStatusLine(`ZIP téléchargé : ${ok.length} fichier${ok.length > 1 ? 's' : ''}.`);
    pushToast('ok', 'ZIP téléchargé.');
  }, [busy, downloadBlob, items, pushToast]);

  const retryErrors = useCallback(() => {
    setItems((prev) => prev.map((it) => (it.status === 'erreur' ? { ...it, status: 'attente', pct: 0, detail: `${fr.status.attente} · ${formatBytes(it.file.size)}` } : it)));
    setTimeout(() => void convertAll(), 50);
  }, [convertAll]);

  const stats = useMemo(() => {
    const inBytes = items.reduce((s, i) => s + i.file.size, 0);
    const outBytes = items.reduce((s, i) => s + (i.outBytes ?? 0), 0);
    return { total: items.length, ok: items.filter((i) => i.status === 'ok').length, err: items.filter((i) => i.status === 'erreur').length, inBytes, outBytes };
  }, [items]);

  const compareItem = compareId ? items.find((i) => i.id === compareId) ?? null : null;

  return {
    prefs, setPrefs, items, rejected, busy, globalPct, statusLine, pdfInfo,
    decoderLoading, toasts, compareId, setCompareId, compareItem,
    online, offlineReady, stats,
    addFiles, removeOne, clear, move, reorder, cancel, convertAll,
    downloadBlob, downloadZip, retryErrors, pushToast,
  };
}

export type Converter = ReturnType<typeof useConverter>;
