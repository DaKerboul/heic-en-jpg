import type { OutputFormat, PdfOrientation, PdfPageSize, PresetId } from '../../lib/constants';

export type Status = 'attente' | 'conversion' | 'ok' | 'erreur';

export type Item = {
  id: string;
  file: File;
  status: Status;
  pct: number;
  detail?: string;
  outName?: string;
  outBlob?: Blob;
  outBytes?: number;
  /** Miniature du résultat (légère, ~112 px). */
  preview?: string;
  /** Miniature de l'original (si affichable / décodé). Sert au comparateur. */
  origPreview?: string;
  origW?: number;
  origH?: number;
  outW?: number;
  outH?: number;
  gain?: string;
};

export type Toast = { id: number; kind: 'ok' | 'erreur' | 'info'; msg: string };

export type Prefs = {
  format: OutputFormat;
  presetId: PresetId;
  jpegQuality: number;
  maxEdge: number;
  cropIdentite: boolean;
  pdfPage: PdfPageSize;
  pdfOrientation: PdfOrientation;
  pdfQuality: number;
  pdfName: string;
  prefix: string;
  zipName: string;
  view: 'liste' | 'grille';
};

export const DEFAULT_PREFS: Prefs = {
  format: 'jpeg',
  presetId: 'ants',
  jpegQuality: 0.9,
  maxEdge: 0,
  cropIdentite: false,
  pdfPage: 'a4',
  pdfOrientation: 'auto',
  pdfQuality: 0.85,
  pdfName: 'documents',
  prefix: '',
  zipName: 'images-converties',
  view: 'liste',
};

const KEY = 'conv-prefs-v1';

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      ...DEFAULT_PREFS,
      ...p,
      jpegQuality: clampNum(p.jpegQuality, 0.6, 0.95, DEFAULT_PREFS.jpegQuality),
      pdfQuality: [0.92, 0.85, 0.7].includes(Number(p.pdfQuality)) ? Number(p.pdfQuality) : 0.85,
      view: p.view === 'grille' ? 'grille' : 'liste',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
